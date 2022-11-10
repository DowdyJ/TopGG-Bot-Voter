

import { createCursor } from "ghost-cursor"
import puppeteer from "puppeteer"

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



(async () => {
    // 251239170058616833 kotoba
    // 646937666251915264 karuta
    const botID : string = "877436488344805426";
    const url : string = `https://top.gg/bot/${botID}/vote`;
    const email : string = process.argv[3];
    const password : string = process.argv[4];


    const browser : puppeteer.Browser = await puppeteer.launch({headless: false, timeout: 300000});
    const page : puppeteer.Page = await browser.newPage();
    page.setDefaultTimeout(300000);

    const selector : string = "#sign-up button"
    const cursor = createCursor(page)
    await page.goto(url)
    await page.waitForSelector(selector)

    let loginToVoteButton : puppeteer.ElementHandle<Node>[]= await page.$x('//a[text()="Login to vote"]');

    if (loginToVoteButton.length === 0)
    {
        console.log('Failed to click login button on Top.gg');
    }

    cursor.click(loginToVoteButton[0] as puppeteer.ElementHandle<Element>);

    await sleep(10 * 1000);

    await browser.close();
  })();