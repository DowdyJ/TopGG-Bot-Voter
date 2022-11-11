

import { createCursor } from "ghost-cursor"
import puppeteer from "puppeteer-extra"
import { DEFAULT_INTERCEPT_RESOLUTION_PRIORITY } from 'puppeteer';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import { executablePath } from 'puppeteer';

function sleep(ms : number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



(async () => {
    // 251239170058616833 kotoba
    // 646937666251915264 karuta
    const botID : string = "877436488344805426";
    const url : string = `https://top.gg/bot/${botID}/vote`;
    const email : string = process.argv[2];
    const password : string = process.argv[3];

    puppeteer.use(
        AdblockerPlugin({
          interceptResolutionPriority: DEFAULT_INTERCEPT_RESOLUTION_PRIORITY,
          blockTrackers: true
        })
      );

    const browser : any = await puppeteer.launch({headless: false, timeout: 300000, executablePath: executablePath(),});
    const page : any = await browser.newPage();
    page.setDefaultTimeout(300000);

    const cursor = createCursor(page)
    await page.goto(url)

    //Top.gg login to vote page
    let loginToVoteButton : any = await page.waitForXPath('//a[text()="Login to vote"]');

    if (loginToVoteButton == null)
    {
        console.log('Failed to click login button on Top.gg');
        return;
    }

    await cursor.click(loginToVoteButton);


    //Discord login page
    let emailField : any = await page.waitForSelector("input[name='email']");
    let passwordField : any | null = await page.waitForSelector("input[name='password']");

    if (emailField == null || passwordField == null)
    {
        console.log("Failed to get discord's email and password fields");
    }

    await cursor.click(emailField);

    for (let index = 0; index < email.length; index++) {
        const element = email[index];
        const delayAmount : number = (Math.random() * 600) + 200;
        await (emailField).type(element, { delay: delayAmount });
    }


    await page.keyboard.type(String.fromCharCode(9)); //tab

    for (let index = 0; index < password.length; index++) {
        const element = password[index];
        const delayAmount : number = (Math.random() * 600) + 200;
        await (passwordField).type(element, { delay: delayAmount });
    }

    await page.keyboard.type(String.fromCharCode(13)); //enter
    
    // Authorize page
    console.log("Getting auth button...");

    let authorizeButton : any =  await page.waitForXPath("//div[text()='Authorize']");

    if (authorizeButton == null)
    {
        console.log("Failed to get authorize button on discord. Aborting...");
        return;
    }
    console.log("Sleeping...");

    await sleep((Math.random() * 1000) + 200);
    console.log("Moving mouse...");
    await cursor.move("div[class*='oauth2Wrapper']")
    console.log("Scrolling mouse...");

    await page.mouse.wheel({deltaY:-100});
    console.log("Clicking mouse...");

    await cursor.click((authorizeButton));
    console.log("Done clicking mouse...");


    // back to top.gg
    await Promise.any([page.waitForNetworkIdle(), sleep(10 * 1000)]);
    console.log("Finished waiting for page...");

    //await page.reload()
    await sleep(20 * 1000);

    let voteButton : any = await page.waitForXPath("//button[text()='Vote']");
    console.log("Found vote button.");

    //cursor.click(passwordField as puppeteer.ElementHandle<Element>);

    await sleep((Math.random() * 1000) + 200);
    console.log("Clicking...");

    cursor.click(voteButton);
    console.log("Done.");
    await sleep(1000 * 1000);

    await browser.close();
  })();