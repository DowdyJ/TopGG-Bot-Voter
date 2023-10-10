import { Logger } from "./Logger";
import { WebsocketBrowserWrapper } from "WebsocketBrowserWrapper";
import { Page, Browser, connect } from "puppeteer";


(async () => {
    let logger: Logger = new Logger();
    const endpoint = process.argv[2];

    var browser: Browser = await connect({
        browserWSEndpoint: endpoint,
    });
    
    logger.log("Wiping stored data (e.g. login data)");
    let page: Page = await browser.newPage();

    await wipeStorage(page);
    await page.close();
    await browser.close();

    return;
})();

async function wipeStorage(page : Page) : Promise < void > {
    const client = await page.target().createCDPSession();
    
    await client.send('Network.clearBrowserCookies');
    await client.send('Network.clearBrowserCache');
    return;
}