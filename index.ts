

import { createCursor, GhostCursor, installMouseHelper } from "ghost-cursor"
import ghostcursor from "ghost-cursor"
import puppeteer_e from "puppeteer-extra"
import puppeteer, { Browser } from "puppeteer"
import { KnownDevices } from "puppeteer"
import { DEFAULT_INTERCEPT_RESOLUTION_PRIORITY } from 'puppeteer';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import { executablePath } from 'puppeteer';
import { Vector } from "ghost-cursor/lib/math";



(async () => {
    try 
    {
        await voteOnTopGG();
    }
    catch (err)
    {
        console.log(err);
    }
    finally 
    {
        //close browser
    }
  })();

  async function voteOnTopGG() 
  {
      // 251239170058616833 kotoba
      // 646937666251915264 karuta
      // 905658191659040808 ostra
      // 945683386100514827 nero bot
      const botID : string = "905658191659040808";
      const url : string = `https://top.gg/bot/${botID}/vote`;
      const email : string = process.argv[2];
      const password : string = process.argv[3];
      const wsEndPoint : string = process.argv[4];
  
  
      const browser : Browser = await initializeBrower(wsEndPoint);
      const page : puppeteer.Page = await browser.newPage();
      page.setDefaultTimeout(300000);
  
      const cursor : ghostcursor.GhostCursor = createCursor(page);
  
      
      await installMouseHelper(page);
  
      await page.goto(url);
      
      if (await needsLoggedIn(page))
      {
          await clickLoginButtonOnTopGG(page, cursor);
  
          if (await onAuthPage(page))
          {
              await clickAuthButton(page, cursor);
          }
          else 
          {
              await loginOntoDiscord(page, cursor, email, password);
              await clickAuthButton(page, cursor);
          }
      }

      await sleep(10 * 1000);

      let botName : string = await getBotName(page);

      const responseCallback = async (response : puppeteer.HTTPResponse) => {
        if (response.request().method() === 'POST' && response.url().includes(`${botID}/vote`))
        {
            if (response?.ok())
            {
                console.log(`Successfully voted for ${botName}`);
            } 
            else 
            {
                console.log(`Failed to vote for ${botName}. Response as follows.`);
                console.log(await response?.text());
            }
        }
    }

    page.on('response', responseCallback);

    await clickVoteOnTopGG(page, cursor);
    await sleep(5000, false);

    page.off('response', responseCallback);
    await page.close();
    await browser.close();
  };
  

  async function sleep(ms : number, log : boolean = true) {
    let totalSecondsToWait : number = ms / 1000;
    let totalSecondsWaited : number = 0;

    let countdownResolution : number = 1000;
    let numberOfIterations : number = ms / countdownResolution;

    for (let i = 0; i < numberOfIterations; i ++)
    {
        if (log)
            process.stdout.write(`Waiting: ${totalSecondsToWait - totalSecondsWaited} / ${totalSecondsToWait}`);

        await new Promise(resolve => setTimeout(resolve, countdownResolution));
        totalSecondsWaited += (countdownResolution / 1000); 

        if(log)
        {
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
        }

    }

    return 
};

async function slowType(page : puppeteer.Page, whatToType : string) {
    for (let index = 0; index < whatToType.length; index++) {
        const element = whatToType[index];
        const delayAmount : number = (Math.random() * 600) + 200;
        await page.keyboard.type(element, { delay: delayAmount });
    }
    return;
};

async function getBotName(page : puppeteer.Page) : Promise<string>
{
    try 
    {
        let voteForString = (await page.$eval("img[alt*='Voting for']", el => el.getAttribute('alt')));

        if (voteForString == null)
        {
            console.log("Failed to get bot name.");
            return "UNKNOWN BOT";
        }
        
        return voteForString.substring(11);
    }
    catch (err)
    {
        console.log(err);
        return "UNKNOWN BOT (Exception)";
    }
};

async function convertElementToCenteredVector(element : puppeteer.ElementHandle<Node> | puppeteer.ElementHandle<Element> | null) : Promise<Vector | null>
{
    try 
    {
        let boundingBox : puppeteer.BoundingBox | null = await (element as puppeteer.ElementHandle<Element>).boundingBox();    

        let vector : Vector = { 
            x: (boundingBox?.x as number + (boundingBox?.width as number / 2)) , 
            y: (boundingBox?.y as number + (boundingBox?.height as number / 2))
        };

        return vector;
    }
    catch (err)
    {
        console.log(err);
    }

    return null;
};

async function clickElementWithGhostCursor(cursor : ghostcursor.GhostCursor, element : puppeteer.ElementHandle<Node> | puppeteer.ElementHandle<Element> | null, clickOptions : ghostcursor.ClickOptions | undefined = undefined) : Promise<void>
{
    await cursor.click(element as puppeteer.ElementHandle<Element>, clickOptions);
    return;
};

async function clickElementWithGhostCursorBySelector(page : puppeteer.Page, cursor: ghostcursor.GhostCursor, selector : string, xpathOrCSS : string = 'CSS', clickOptions : ghostcursor.ClickOptions | undefined = undefined) : Promise<boolean> {
    let element : puppeteer.ElementHandle<Element> | puppeteer.ElementHandle<Node> | null;

    if (xpathOrCSS.toUpperCase() === "XPATH")
    {
        var elements : puppeteer.ElementHandle<Node>[] = await page.$x(selector);

        if (elements.length === 0)
        {
            console.log(`Failed to find any elements with XPath selector ${selector}.`);
            return false;
        }
        else if (elements.length > 1) 
        {
            console.log(`Found more than one element with XPath selector: ${selector}. Found ${elements.length} elements. Clicking first...`);
            element = elements[0];

            await clickElementWithGhostCursor(cursor, element);
            return true;
        }
        else 
        {
            await clickElementWithGhostCursor(cursor, elements[0]);
            return true;
        }
    }
    else if (xpathOrCSS.toUpperCase() === "CSS") 
    {
        element = await page.$(selector);

        if (element == null)
            return false;

        clickElementWithGhostCursor(cursor, element);
        return true;
    } 
    else 
    {
        console.log(`Failed to parse selector method: ${xpathOrCSS}`);
        return false;
    }
};


async function initializeBrower(wsEndpoint : string) : Promise<Browser>
{
 /*   
    puppeteer_e.use(
        AdblockerPlugin({
          interceptResolutionPriority: DEFAULT_INTERCEPT_RESOLUTION_PRIORITY,
          blockTrackers: true
        })
      );
    
    const stealthPlugin = require('puppeteer-extra-plugin-stealth')();

    puppeteer_e.use(stealthPlugin);
*/
    return await puppeteer_e.connect({browserWSEndpoint : wsEndpoint});
};

async function needsLoggedIn(page : puppeteer.Page) : Promise<boolean> 
{
    await sleep(5000); //on page load

    var numberOfMatches : number = (await page.$x("//a[text()='Login to vote']")).length;

    if (!!(numberOfMatches))
    {
        console.log("User not signed in.")
        return true;
    }
        

    console.log("User already signed in.")
    return false;
};

async function clickLoginButtonOnTopGG(page : puppeteer.Page, cursor : GhostCursor) : Promise<void>
{
    console.log("Attempting to click log in button on top.gg...");
    let loginToVoteButton : puppeteer.ElementHandle<Node> | null = await page.waitForXPath('//a[text()="Login to vote"]');

    if (loginToVoteButton == null)
    {
        console.log('Failed to click login button on Top.gg');
        return;
    }

    await clickElementWithGhostCursor(cursor, loginToVoteButton);
    console.log("Log in button clicked.");
    return;
};

async function onAuthPage(page : puppeteer.Page) : Promise<boolean> 
{
    await sleep(3000);

    let authorizeButton : puppeteer.ElementHandle<Node>[] =  await page.$x("//div[text()='Authorize']");

    if (authorizeButton.length == 0)
    {
        console.log("Assuming not on authorization page...");
        return false;
    }
    console.log("Assuming on authorization page...");
    return true;
}

async function loginOntoDiscord(page : puppeteer.Page, cursor : GhostCursor, userName : string, password : string) 
{
    //Discord login page
    let emailField : puppeteer.ElementHandle<Element> | null = await page.waitForSelector("input[name='email']");
    let passwordField : puppeteer.ElementHandle<Element> | null = await page.waitForSelector("input[name='password']");

    if (emailField == null || passwordField == null)
    {
        console.log("Failed to get discord's email and password fields");
        return;
    }

    await clickElementWithGhostCursor(cursor, emailField);
    await slowType(page, userName);

    await clickElementWithGhostCursor(cursor, passwordField);
    await slowType(page, password);

    await page.keyboard.type(String.fromCharCode(13)); //enter
};

async function clickAuthButton(page : puppeteer.Page, cursor : GhostCursor) : Promise<void>
{
    console.log("Trying to click auth button...");
    let authorizeButton : puppeteer.ElementHandle<Node> | null =  await page.waitForXPath("//div[text()='Authorize']");

    if (authorizeButton == null)
    {
        console.log("Failed to get authorize button on discord. Aborting...");
        return;
    }

    await sleep((Math.random() * 1000) + 200);

    await cursor.move("div[class*='oauth2Wrapper']")
    await cursor.click((authorizeButton as puppeteer.ElementHandle<Element>));

    console.log("Auth button clicked.");
};

async function clickVoteOnTopGG(page : puppeteer.Page, cursor : GhostCursor) : Promise<void>
{
    console.log("Waiting for Top.gg...");
    await Promise.any([page.waitForNetworkIdle(), sleep(10 * 1000)]);
    console.log("Finished waiting for page.");

    await page.evaluate("window.readyToVote();");

    let voteButton : puppeteer.ElementHandle<Node> | null = await page.waitForXPath("//button[text()='Vote']");

    //await sleep((Math.random() * 1000) + 200);
    console.log("Clicking vote button...");

    clickElementWithGhostCursor(cursor, voteButton);

    console.log("Vote button clicked.");

    return;
};