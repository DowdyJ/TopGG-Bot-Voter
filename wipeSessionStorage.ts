import puppeteer_e from "puppeteer-extra"
import puppeteer, {
    executablePath,
    Browser
} from "puppeteer"
import {
    DEFAULT_INTERCEPT_RESOLUTION_PRIORITY
} from 'puppeteer';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';

const BOLD = '\u001b[1m';
const ITALIC = '\u001b[3m';
const UNDERLINE = '\u001b[4m';
const BLUE = '\u001b[34m';
const RED = '\u001b[31m';
const GREEN = '\u001b[32m';
const YELLOW = '\u001b[33m';
const RESET = '\u001b[0m';

enum VoteStatus {
    SUCCESS = 0,
        CLOUDFLARE_FAIL,
        LOGIN_FAIL,
        ALREADY_VOTED_FAIL,
        CAPTCHA_FAIL,
        OTHER_CRIT_FAIL,
        OTHER_RETRY_FAIL
}

enum MessageType {
    INFO,
    SUCCESS,
    WARNING,
    ERROR,
    NONE
}


function logSuccess(message: string): void {
    console.log(`${RESET}${GREEN}${BOLD}[ SUCCESS ]${RESET} ${message}`);
}

function logError(message: string): void {
    console.log(`${RESET}${RED}${BOLD}[  ERROR  ]${RESET} ${message}`);
}

function logWarning(message: string): void {
    console.log(`${RESET}${YELLOW}${BOLD}[ WARNING ]${RESET} ${message}`);
}

function logInfo(message: string): void {
    console.log(`${RESET}${BLUE}${BOLD}[  INFO   ]${RESET} ${message}`);
}

function log(message: string, messageType: MessageType = MessageType.INFO): void {
    switch (messageType) {
        case MessageType.INFO:
            logInfo(message);
            break;
        case MessageType.SUCCESS:
            logSuccess(message);
            break;
        case MessageType.WARNING:
            logWarning(message);
            break;
        case MessageType.ERROR:
            logError(message);
            break;
        case MessageType.NONE:
            console.log(message);
            break;
        default:
            logError("Ran default case in logger.");
            break;
    }
}

(async () => {
    const endpoint = process.argv[2];
    var browser: Browser = await initializeBrowserWithEndpoint(endpoint);
    log("Wiping stored data (e.g. login data)");
    let page: puppeteer.Page = await browser.newPage();
    //await wipeCookiesForURL(page, "https://top.gg");
    //await wipeCookiesForURL(page, "https://discord.com");
    await wipeStorage(page);
    await page.close();
    await browser.close();

    return;
})();

async function sleep(ms: number, log: boolean = true) {
    let totalSecondsToWait: number = ms / 1000;
    let totalSecondsWaited: number = 0;

    let countdownResolution: number = 1000;
    let numberOfIterations: number = ms / countdownResolution;

    for (let i = 0; i < numberOfIterations; i++) {
        if (log)
            process.stdout.write(`Waiting: ${totalSecondsToWait - totalSecondsWaited} / ${totalSecondsToWait}`);

        await new Promise(resolve => setTimeout(resolve, countdownResolution));
        totalSecondsWaited += (countdownResolution / 1000);

        if (log) {
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
        }

    }

    return
};

async function initializeBrowserWithEndpoint(endpoint : string): Promise < Browser > {

    puppeteer_e.use(
        AdblockerPlugin({
            interceptResolutionPriority: DEFAULT_INTERCEPT_RESOLUTION_PRIORITY,
            blockTrackers: true
        })
    );

    return await puppeteer_e.connect({browserWSEndpoint : endpoint});
};

async function wipeCookiesForURL(page : puppeteer.Page, url : string) : Promise < void > {
    log(`Wiping cookies for ${url}...`);
    await page.goto(url);
    try {
        await page.evaluate(() => {
            window.localStorage.clear();
            window.sessionStorage.clear();
        });
    } catch (error) {
        log(`Couldn't find local/session storage. (May already be empty)`, MessageType.WARNING);
    }

    await page.deleteCookie(...(await page.cookies(url)));
    await sleep(5 * 1000);
    return;
};

async function wipeStorage(page : puppeteer.Page) : Promise < void > {
    const client = await page.target().createCDPSession();
    
    await client.send('Network.clearBrowserCookies');
    await client.send('Network.clearBrowserCache');
    return;
}