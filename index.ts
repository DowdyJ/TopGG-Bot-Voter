import {
    createCursor,
    GhostCursor,
    installMouseHelper
} from "ghost-cursor"
import ghostcursor from "ghost-cursor"
import puppeteer_e from "puppeteer-extra"
import puppeteer, {
    BoundingBox,
    Browser
} from "puppeteer"
import {
    DEFAULT_INTERCEPT_RESOLUTION_PRIORITY
} from 'puppeteer';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import {
    Vector
} from "ghost-cursor/lib/math";
import fs from "fs";
import {
    SolveRecaptchasResult
} from "puppeteer-extra-plugin-recaptcha/dist/types";
import {
    PuppeteerExtraPluginRecaptcha
} from "puppeteer-extra-plugin-recaptcha";
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha'


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

function logToFile(message: string): void {
    fs.writeFileSync("log.txt", message, {
        flag: "as"
    });
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
    try {
        const wsEndPoint: string = process.argv[4];
        log(`Connecting to endpoint ${wsEndPoint}`);

        let _2captchaAPIKey: string = process.argv[7];

        if (_2captchaAPIKey.length !== 32) {
            log("Assuming not using 2Captcha's Service.", MessageType.INFO);
            _2captchaAPIKey = '';
        } else {
            log("Using 2Captcha.", MessageType.INFO);
        }

        var browser: Browser = await initializeBrower(wsEndPoint, _2captchaAPIKey);

        const wipeLocalStorage: string = process.argv[6];
        if (wipeLocalStorage === "TRUE") {
            log("Wiping stored data (e.g. login data)", MessageType.INFO);
            let page: puppeteer.Page = await browser.newPage();
            await page.goto("https://www.top.gg");
            await page.evaluate(() => {
                window.localStorage.clear()
            });
            await page.deleteCookie(...(await page.cookies()));
            await sleep(40 * 1000);
            await page.close();
        }


        const botID: string = process.argv[5];
        const email: string = process.argv[2];
        const password: string = process.argv[3];

        let votingResult: VoteStatus = await voteOnTopGG(browser, email, password, botID, _2captchaAPIKey);

        if (votingResult === VoteStatus.CLOUDFLARE_FAIL) {
            log("Waiting 5 minutes before trying again...");
            sleep(5 * 60 * 1000);
            votingResult = await voteOnTopGG(browser, email, password, botID, _2captchaAPIKey);

            if (votingResult === VoteStatus.SUCCESS) {
                return;
            } else if (votingResult === VoteStatus.CLOUDFLARE_FAIL) {
                log("CloudFlare rejected the connection again. Try waiting a while before trying again.", MessageType.ERROR);
                return;
            }
        }
        // One more chance for non-critical fails
        if (votingResult === VoteStatus.LOGIN_FAIL || votingResult === VoteStatus.OTHER_RETRY_FAIL) {
            await voteOnTopGG(browser, email, password, botID, _2captchaAPIKey);
            return;
        }
    } catch (err) {
        log(err as string, MessageType.ERROR);
    } finally {
        try {
            await browser!.close();
        } catch (err) {
            log(err as string, MessageType.ERROR);
        }
    }
})();

/**
 * This will attempt to log in through Discord if necessary, then submit a vote on Top.gg for the bot specified by botID.
 * @param browser A browser instance connected to Puppeteer.
 * @param email The user's Discord email address.
 * @param password The user's Discord password
 * @param botID The ID of the bot to vote for.
 * @returns void
 */
async function voteOnTopGG(browser: puppeteer.Browser, email: string, password: string, botID: string, _2captchaAPIKey: string): Promise < VoteStatus > {
    const url: string = `https://top.gg/bot/${botID}/vote`;

    log("Recieved the following input:");

    let censoredEmail = email[0] + email[1];
    for (let i = 2; i < email.length; i++) {
        const element = email[i];
        if (element === "@") {
            censoredEmail += email.slice(i);
            break;
        }
        censoredEmail += "*";
    }

    let censoredPassword = password[0] + password[1];
    for (let i = 2; i < password.length; i++) {
        censoredPassword += "*";
    }

    log(`Username: ${censoredEmail}`);
    log(`Password: ${censoredPassword}`);
    log(`Bot ID: ${botID}`);

    const page: puppeteer.Page = await browser.newPage();
    page.setDefaultTimeout(300000);

    const cursor: ghostcursor.GhostCursor = createCursor(page);

    await installMouseHelper(page);

    await page.goto(url);


    if (await _gotCloudFlared(page)) {
        log("Encountered CloudFlare error. This may be caused by too many connections. Details are below.", MessageType.ERROR);
        log(await _getCloudFlareErrInfo(page), MessageType.NONE);
        await sleep(5000);
        return VoteStatus.CLOUDFLARE_FAIL;
    }

    if (await _checkAlreadyVoted(page)) {
        log(`You have already voted for ${await getBotName(page)}. Exiting...`, MessageType.WARNING);
        return VoteStatus.ALREADY_VOTED_FAIL;
    }

    if (await _needsLoggedIn(page)) {
        await _clickLoginButtonOnTopGG(page, cursor);

        if (await _onAuthPage(page)) {
            await _clickAuthButton(page, cursor);
        } else {
            await _loginOntoDiscord(page, cursor, email, password);
            await sleep(5000);

            let captchaResult = await _bypassCaptchas(page, cursor, _2captchaAPIKey);
            if (captchaResult === false) {
                return VoteStatus.CAPTCHA_FAIL;
            } else if (captchaResult === true) {
                await sleep(2000, false);

                if (await _checkDiscordNewLocationError(page, cursor)) {
                    log("Discord flagged new location login. Check your email, authorize and try again.", MessageType.ERROR);
                    return VoteStatus.OTHER_CRIT_FAIL;
                }
                if (await _clickLogInButtonOnDiscordLogInPage(page, cursor)) {
                    log("Clicked the log in button again.")
                }
            }

            await _clickAuthButton(page, cursor);
        }
    }

    await sleep(10 * 1000);
    let voteSuccess: boolean | null = await _handleVotingPostLogin(page, cursor, botID, _2captchaAPIKey);

    if (voteSuccess == null) {
        log("Did not recieve failure nor success repsonse from server. Retrying vote process.", MessageType.WARNING)
        await page.reload();
        await Promise.any([page.waitForNetworkIdle(), sleep(20 * 1000, false)]);
        voteSuccess = await _handleVotingPostLogin(page, cursor, botID, _2captchaAPIKey);
    }

    await page.close();
    if (voteSuccess == null) {
        log("Did not recieve failure nor success repsonse from server again. Aborting.", MessageType.ERROR);
        logToFile(`Noncritical failure to vote for ${botID} at ${new Date()}.`);
        return VoteStatus.OTHER_RETRY_FAIL;
    } else if (voteSuccess === false) {
        return VoteStatus.OTHER_CRIT_FAIL;
    } else {
        return VoteStatus.SUCCESS;
    }
};

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

async function slowType(page: puppeteer.Page, whatToType: string) {
    for (let index = 0; index < whatToType.length; index++) {
        const element = whatToType[index];
        const delayAmount: number = (Math.random() * 600) + 200;
        await page.keyboard.type(element, {
            delay: delayAmount
        });
    }
    return;
};

async function getInnerTextFromElementBySelector(page: puppeteer.Page, selector: string): Promise < string > {
    let element: puppeteer.ElementHandle < Element > | null = await page.$(selector);

    if (element == null) {
        console.log(`Failed to find element to extract innerHTML from with selector: ${selector}`);
        return "ERR";
    }

    return await getInnerTextFromElement(element);
}

async function getInnerTextFromElement(element: puppeteer.ElementHandle < Element > ): Promise < string > {
    return await element.evaluate((e) => e.innerHTML);
}

/**
 * 
 * @param page 
 * @param cursor 
 * @param _2captchaAPIKey 
 * @returns false on failure, true on success. Returns null if no CAPTCHA is found.
 */
async function _bypassCaptchas(page: puppeteer.Page, cursor: GhostCursor, _2captchaAPIKey: string): Promise < boolean | null > {
    log("Searching for CAPTCHAS...");
    if (_2captchaAPIKey !== '') {
        var result: SolveRecaptchasResult = await page.solveRecaptchas();

        if (result.error) {
            log(`2Captcha failure: ${result.error}`, MessageType.ERROR)
            return false;
        }

        if (result.captchas.length !== 0) {
            log(`Successfully bypassed ${result.captchas.length} CAPTCHA(s).`, MessageType.SUCCESS);
            return true;
        }

        return null;
    } else {
        if (await _gotCaptchaed(page)) {
            await _clickCaptchaBox(page, cursor);
            await sleep(5000);
            if (await _gotCaptchaed(page)) {
                log("Failed captcha challenge. Trying again...", MessageType.WARNING);
                await _clickCaptchaBox(page, cursor);
                await sleep(5000);
                if (await _gotCaptchaed(page)) {
                    log("Failed captcha challenge again. Please try logging in manually in the Chromium instance and Authorizing. This should save your login for future attempts.", MessageType.ERROR);
                    return false;
                } else {
                    log("Successfully bypassed captcha challenge!");
                    return true;
                }
            } else {
                log("Successfully bypassed captcha challenge!");
                return true;
            }
        }
        return null;
    }
}

async function _gotCaptchaed(page: puppeteer.Page): Promise < boolean > {
    let captchaBox = await page.$("iframe[src*='hcaptcha']");
    if (captchaBox !== null) {
        log("Encountered hCaptcha challenge.", MessageType.WARNING);
        return true;
    }
    return false;
}

async function _clickCaptchaBox(page: puppeteer.Page, cursor: GhostCursor): Promise < void > {
    log("Clicking captcha box...", MessageType.INFO);
    let captchaBox = await page.$("iframe[src*='hcaptcha']");
    let captchaBoundingBox: BoundingBox | null | undefined = (await captchaBox?.boundingBox());
    if (captchaBoundingBox == null) {
        log("Failed to find captcha bounding box.", MessageType.ERROR);
        return
    }

    let clickVector: Vector = {
        x: (captchaBoundingBox?.x as number + (captchaBoundingBox?.width as number * 0.1)),
        y: (captchaBoundingBox?.y as number + ((captchaBoundingBox?.height as number) / 2))
    }
    await cursor.moveTo(clickVector);
    await sleep(1000, false);
    await cursor.click(undefined, {
        paddingPercentage: 0
    });
}

async function _handleVotingPostLogin(page: puppeteer.Page, cursor: GhostCursor, botID: string, _2captchaAPIKey: string): Promise < boolean | null > {
    let lastVoteSuccess: boolean | null = null;
    let botName: string = await getBotName(page);
    log(`Attempting to vote for ${botName}...`);

    const responseCallback = async (response: puppeteer.HTTPResponse) => {
        if (response.request().method() === 'POST') {
            if (response.url().includes(`${botID}/vote`)) {
                if (response?.ok()) {
                    log(`Successfully voted for ${botName}!`, MessageType.SUCCESS);
                    lastVoteSuccess = true;
                } else {
                    log(`Failed to vote for ${botName}. Response as follows.`, MessageType.WARNING);
                    log(await response?.text());
                    lastVoteSuccess = false;
                }
            } else {
                //console.log(`Other POST request: ${response.url()} with response ${response.status}`);
            }
        }
    }


    page.on('response', responseCallback);

    await clickVoteButtonOnTopGG(page, cursor);

    for (let i = 0; i <= 25 && lastVoteSuccess === null; i++)
        await sleep(1000, false);

    if (lastVoteSuccess === false)
        await sleep(5000);
    
    let captchaResult = await _bypassCaptchas(page, cursor, _2captchaAPIKey);
    if (captchaResult === false) {
        return false;
    } else if (captchaResult === true) {
        lastVoteSuccess = null;

        await sleep(2000, false);

        await clickVoteButtonOnTopGG(page, cursor);
        log("Clicked the vote button again.");
        for (let i = 0; i <= 25 && lastVoteSuccess === null; i++)
            await sleep(1000, false);
    } else {
        log("Did not find a CAPTCHA to solve.");
    }

    page.off('response', responseCallback);

    if (lastVoteSuccess === true) {
        logToFile(`Successfully voted for ${botName} : ID ${botID} at ${new Date()}`);
    } else if (lastVoteSuccess === false) {
        logToFile(`Failed to vote for ${botName} : ID ${botID} at ${new Date()}`);
    }
    return lastVoteSuccess;
}


async function _getCloudFlareErrInfo(page: puppeteer.Page): Promise < string > {
    let errorLabel: string = await getInnerTextFromElementBySelector(page, "span[class='inline-block']");
    let errorNumber: string = await getInnerTextFromElementBySelector(page, "span[class='code-label']");
    return `${errorLabel}: ${errorNumber}`;
}

async function _gotCloudFlared(page: puppeteer.Page): Promise < boolean > {
    //cf-error-details
    if (await page.$("div[class='cf-wrapper']"))
        return true;
    else
        return false;
};

async function getBotName(page: puppeteer.Page): Promise < string > {
    try {
        let voteForString = (await page.$eval("img[alt*='Voting for']", el => el.getAttribute('alt')));

        if (voteForString == null) {
            console.log("Failed to get bot name.");
            return "UNKNOWN BOT";
        }

        return voteForString.substring(11);
    } catch (err) {
        console.log(err);
        return "UNKNOWN BOT (Exception)";
    }
};

async function convertElementToCenteredVector(element: puppeteer.ElementHandle < Node > | puppeteer.ElementHandle < Element > | null): Promise < Vector | null > {
    try {
        let boundingBox: puppeteer.BoundingBox | null = await (element as puppeteer.ElementHandle < Element > ).boundingBox();

        let vector: Vector = {
            x: (boundingBox?.x as number + (boundingBox?.width as number / 2)),
            y: (boundingBox?.y as number + (boundingBox?.height as number / 2))
        };

        return vector;
    } catch (err) {
        console.log(err);
    }

    return null;
};

/**
 * 
 * @param page The page, which should be navigated to the Bot's Top.gg vote page.
 * @returns TRUE if top.gg displays text indicating that the user has already voted for the bot. FALSE otherwise. Note this will sometimes return FALSE even if the user has voted for the bot already due to top.gg not specifying as much.
 */
async function _checkAlreadyVoted(page: puppeteer.Page): Promise < boolean > {
    let element = await page.$x("//p[text()='You have already voted']");

    if (element.length)
        return true;
    else
        return false;
}

/**
 * 
 * @param page 
 * @param cursor 
 * @returns true if error is encountered, false otherwise.
 */
async function _checkDiscordNewLocationError(page: puppeteer.Page, cursor: GhostCursor): Promise < boolean > {
    let errorElement = await page.$x("//span[text()[contains(.,'New login location detected')]]");
    if (errorElement.length === 0)
        return false;

    return true;

}

async function clickElementWithGhostCursor(cursor: ghostcursor.GhostCursor, element: puppeteer.ElementHandle < Node > | puppeteer.ElementHandle < Element > | null, clickOptions: ghostcursor.ClickOptions | undefined = undefined): Promise < void > {
    if (element == null) {
        log("Tried to click null element!", MessageType.WARNING);
    }
    await cursor.click(element as puppeteer.ElementHandle < Element > , clickOptions);
    return;
};

async function clickElementWithGhostCursorBySelector(page: puppeteer.Page, cursor: ghostcursor.GhostCursor, selector: string, xpathOrCSS: string = 'CSS', clickOptions: ghostcursor.ClickOptions | undefined = undefined): Promise < boolean > {
    let element: puppeteer.ElementHandle < Element > | puppeteer.ElementHandle < Node > | null;

    if (xpathOrCSS.toUpperCase() === "XPATH") {
        var elements: puppeteer.ElementHandle < Node > [] = await page.$x(selector);

        if (elements.length === 0) {
            console.log(`Failed to find any elements with XPath selector ${selector}.`);
            return false;
        } else if (elements.length > 1) {
            console.log(`Found more than one element with XPath selector: ${selector}. Found ${elements.length} elements. Clicking first...`);
            element = elements[0];

            await clickElementWithGhostCursor(cursor, element);
            return true;
        } else {
            await clickElementWithGhostCursor(cursor, elements[0]);
            return true;
        }
    } else if (xpathOrCSS.toUpperCase() === "CSS") {
        element = await page.$(selector);

        if (element == null)
            return false;

        clickElementWithGhostCursor(cursor, element);
        return true;
    } else {
        console.log(`Failed to parse selector method: ${xpathOrCSS}`);
        return false;
    }
};


async function initializeBrower(wsEndpoint: string, _2captchaAPIKey: string): Promise < Browser > {

    puppeteer_e.use(
        AdblockerPlugin({
            interceptResolutionPriority: DEFAULT_INTERCEPT_RESOLUTION_PRIORITY,
            blockTrackers: true
        })
    );

    puppeteer_e.use(
        RecaptchaPlugin({
            provider: {
                id: '2captcha',
                token: _2captchaAPIKey
            }
        })
    );

    //const stealthPlugin = require('puppeteer-extra-plugin-stealth')();

    //puppeteer_e.use(stealthPlugin);

    return await puppeteer_e.connect({
        browserWSEndpoint: wsEndpoint
    });
};

async function _needsLoggedIn(page: puppeteer.Page): Promise < boolean > {
    await sleep(5000); //on page load

    var numberOfMatches: number = (await page.$x("//a[text()='Login to vote']")).length;

    if (numberOfMatches) {
        log("User not signed in.")
        return true;
    }


    log("User already signed in.")
    return false;
};

async function _clickLoginButtonOnTopGG(page: puppeteer.Page, cursor: GhostCursor): Promise < void > {
    log("Attempting to click log in button on top.gg...");
    let loginToVoteButton: puppeteer.ElementHandle < Node > | null = await page.waitForXPath('//a[text()="Login to vote"]');

    if (loginToVoteButton == null) {
        log('Failed to click login button on Top.gg', MessageType.ERROR);
        return;
    }

    await clickElementWithGhostCursor(cursor, loginToVoteButton);
    log("Log in button clicked.");
    return;
};

async function _onAuthPage(page: puppeteer.Page): Promise < boolean > {
    await sleep(3000);

    let authorizeButton: puppeteer.ElementHandle < Node > [] = await page.$x("//div[text()='Authorize']");

    if (authorizeButton.length == 0) {
        log("Assuming not on authorization page...");
        return false;
    }
    log("Assuming on authorization page...");
    return true;
}

async function _clickLogInButtonOnDiscordLogInPage(page: puppeteer.Page, cursor: GhostCursor): Promise < boolean > {
    let logInButtonMatches = await page.$x('//div[text()=="Log In"]');
    if (logInButtonMatches.length === 0)
        return false;

    await cursor.click(logInButtonMatches[0] as puppeteer.ElementHandle < Element > );
    return true;
}

async function _loginOntoDiscord(page: puppeteer.Page, cursor: GhostCursor, userName: string, password: string) {
    //Discord login page
    let emailField: puppeteer.ElementHandle < Element > | null = await page.waitForSelector("input[name='email']");
    let passwordField: puppeteer.ElementHandle < Element > | null = await page.waitForSelector("input[name='password']");

    if (emailField == null || passwordField == null) {
        log("Failed to get discord's email and password fields", MessageType.ERROR);
        return;
    }

    await clickElementWithGhostCursor(cursor, emailField);
    await slowType(page, userName);

    await clickElementWithGhostCursor(cursor, passwordField);
    await slowType(page, password);

    await page.keyboard.type(String.fromCharCode(13)); //enter
};

async function _clickAuthButton(page: puppeteer.Page, cursor: GhostCursor): Promise < void > {
    log("Trying to find auth button...");
    let authorizeButton: puppeteer.ElementHandle < Node > | null = null;
    try {
        authorizeButton = await page.waitForXPath("//div[text()='Authorize']", {
            timeout: 60000
        });
    } catch (err) {
        log(err as string, MessageType.ERROR);
    }

    if (authorizeButton == null) {
        log("Failed to get authorize button on discord. Aborting.", MessageType.ERROR);
        return;
    }

    await sleep((Math.random() * 1000) + 200);

    await cursor.move("div[class*='oauth2Wrapper']")
    await cursor.click((authorizeButton as puppeteer.ElementHandle < Element > ));

    log("Auth button clicked.");
};

async function clickVoteButtonOnTopGG(page: puppeteer.Page, cursor: GhostCursor): Promise < void > {
    log("Waiting for Top.gg...", MessageType.NONE);
    await Promise.any([page.waitForNetworkIdle(), sleep(20 * 1000, false)]);
    log("\nFinished waiting for page.", MessageType.NONE);

    await page.evaluate("window.readyToVote();");

    let voteButton: puppeteer.ElementHandle < Node > | null = await page.waitForXPath("//button[text()='Vote']");

    log("Clicking vote button...");

    await clickElementWithGhostCursor(cursor, voteButton);

    log("Vote button clicked.");
    return;
};