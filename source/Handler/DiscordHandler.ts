import { MessageType } from "Enum/MessageType";
import { Logger } from "Logger";
import { Utils } from "Utils";
import { GhostCursor } from "ghost-cursor";
import * as puppeteer from "puppeteer"
import { Page } from "puppeteer";
import { CaptchaHandler } from "./CaptchaHandler";
import { VoteStatus } from "Enum/VoteStatus";



export class DiscordHandler {
    private logger: Logger;
    private captchaHandler: CaptchaHandler;
    private email: string;
    private password: string;
    private displayName: string;

    public constructor(logger: Logger, captchaHandler: CaptchaHandler, displayName: string, email: string, password: string) {
        this.logger = logger;
        this.captchaHandler = captchaHandler;
        this.email = email;
        this.password = password;
        this.displayName = displayName;
    }


    public async discordSignIn(page: Page, cursor: GhostCursor) {
        if (!(await this.onAuthPage(page)) || !(await this.hitNotYouPromptIfUserNamesDontMatch(page, cursor, this.displayName))) {
            await this.enterLoginDetails(page, cursor, this.email, this.password);

            await Promise.any([page.waitForNetworkIdle(), Utils.sleep(10 * 1000, false)]);
    
            let captchaResult = await this.captchaHandler.bypassCaptchas(page, cursor);
            if (captchaResult === false) {
                return VoteStatus.CAPTCHA_FAIL;
            } else if (captchaResult === true) {
                await Utils.sleep(2000, false);
    
                if (await this.checkDiscordNewLocationError(page, cursor)) {
                    this.logger.log("Discord flagged new location login. Check your email, authorize and try again.", MessageType.ERROR);
                    return VoteStatus.DISCORD_NEW_LOCATION_FAIL;
                }
                if (await this.clickLogInButtonOnDiscordLogInPage(page, cursor)) {
                    this.logger.log("Clicked the log in button again.")
                }
            }
        }

        await this.clickAuthButton(page, cursor);

        return VoteStatus.CONTINUE;
    }

    /**
     * 
     * @param page 
     * @param cursor 
     * @returns true if error is encountered, false otherwise.
     */
    private async checkDiscordNewLocationError(page: puppeteer.Page, cursor: GhostCursor): Promise < boolean > {
        let errorElement = await page.$x("//span[text()[contains(.,'New login location detected')]]");
        if (errorElement.length === 0)
            return false;

        return true;
    }


    private async onAuthPage(page: puppeteer.Page): Promise < boolean > {

        let authorizeButton: puppeteer.ElementHandle < Node > [] = await page.$x("//div[text()='Authorize']");

        if (authorizeButton.length == 0) {
            this.logger.log("Assuming not on authorization page...");
            return false;
        }
        this.logger.log("Assuming on authorization page...");
        return true;
    }

    private async clickLogInButtonOnDiscordLogInPage(page: puppeteer.Page, cursor: GhostCursor): Promise < boolean > {
        let logInButtonMatches = await page.$x('//div[text()="Log In"]');
        if (logInButtonMatches.length === 0)
            return false;

        await cursor.click(logInButtonMatches[0] as puppeteer.ElementHandle < Element > );
        return true;
    }

    private async enterLoginDetails(page: puppeteer.Page, cursor: GhostCursor, userName: string, password: string) {
        
        //Discord login page
        let emailField: puppeteer.ElementHandle < Element > | null = await page.waitForSelector("input[name='email']");
        let passwordField: puppeteer.ElementHandle < Element > | null = await page.waitForSelector("input[name='password']");

        if (emailField == null || passwordField == null) {
            this.logger.log("Failed to get discord's email and password fields", MessageType.ERROR);
            return;
        }

        this.logger.log(`Logging into Discord. This can take some time.`);

        await Utils.clickElementWithGhostCursor(cursor, emailField);
        await Utils.slowType(page, userName);

        await Utils.clickElementWithGhostCursor(cursor, passwordField);
        await Utils.slowType(page, password);

        await page.keyboard.type(String.fromCharCode(13)); //enter

        this.logger.log(`Done.`);
    };


    async hitNotYouPromptIfUserNamesDontMatch(page : puppeteer.Page, cursor : GhostCursor, displayname : string) : Promise < boolean > {
        let usernameOnPage = await page.$x(`//div[text()=\"${displayname}\"]`);
        
        if (usernameOnPage.length > 0)
        {
            this.logger.log("Discord assumed correct user. Remaining on page.");
            return true;
        }

        this.logger.log("Discord assumed incorrect user.");
        
        let notYouPrompt = await page.$x("//a[text()='Not you?']");

        if (notYouPrompt.length === 0)
        {
            this.logger.log("Failed to go back from Auth page.", MessageType.ERROR);
            return true;
        }
        
        await cursor.click(notYouPrompt[0] as puppeteer.ElementHandle<Element>);
        return false;
    }

    async clickAuthButton(page: puppeteer.Page, cursor: GhostCursor): Promise < void > {
        this.logger.log("Trying to find auth button...");
        let authorizeButton: puppeteer.ElementHandle < Node > | null = null;

        authorizeButton = await page.waitForXPath("//div[text()='Authorize']", {
            timeout: 60000
        });
        

        if (authorizeButton == null) {
            this.logger.log("Failed to get authorize button on discord. Aborting.", MessageType.ERROR);
            return;
        }

        await sleep((Math.random() * 1000) + 200);

        await cursor.move("div[class*='oauth2Wrapper']")
        await cursor.click((authorizeButton as puppeteer.ElementHandle < Element > ));

        this.logger.log("Auth button clicked.");
    };
}