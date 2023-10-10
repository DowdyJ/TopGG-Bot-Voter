import { Logger } from "../Logger";
import * as puppeteer from "puppeteer"
import { MessageType } from "../Enum/MessageType";
import { GhostCursor, createCursor, installMouseHelper } from "ghost-cursor";
import { Utils } from "../Utils";
import { CaptchaHandler } from "./CaptchaHandler";
import { VoteStatus } from "../Enum/VoteStatus";
import { CloudFlareHandler } from "./CloudFlareHandler";
import { DiscordHandler } from "./DiscordHandler";
import { WebsocketBrowserWrapper } from "../WebsocketBrowserWrapper";
import { Page } from "puppeteer";


export class TopGGHandler {
    private logger: Logger;
    private captchaHandler: CaptchaHandler;
    private cfHandler: CloudFlareHandler;
    private discordHandler : DiscordHandler;

    public constructor(logger: Logger, captchaHandler: CaptchaHandler, cfHandler: CloudFlareHandler, discordHandler: DiscordHandler) {
        this.logger = logger;
        this.captchaHandler = captchaHandler;
        this.cfHandler = cfHandler;
        this.discordHandler = discordHandler;
    }


    async voteOnTopGG(browserWrapper: WebsocketBrowserWrapper, botID: string, displayName : string): Promise < VoteStatus > {

        Utils.printLoginInfo(botID, displayName);

        let page: puppeteer.Page = (await browserWrapper.getOpenPages() as Page[])[0];
        page.setDefaultTimeout(20 * 1000);
        
        // This ensures that certain elements of the page are loaded without the need to scroll
        await page.setViewport({
            width: 1920,
            height: 1080
        });

        let cursor: GhostCursor = createCursor(page);
        await installMouseHelper(page);

        const url: string = `https://top.gg/bot/${botID}/vote`;
        await page.goto(url);
        
        // CF detects pptr, so we need to disconnect while it inspects environment.
        browserWrapper.disconnectFromBrowserInstance();
        await Utils.sleep(10 * 1000);
        await browserWrapper.reconnectToBrowserInstance();
        
        page = (await browserWrapper.getOpenPages() as Page[])[0];
        cursor = createCursor(page);
        await installMouseHelper(page);
        
        await page.setViewport({
            width: 1920,
            height: 1080
        });

        if (await this.cfHandler.gotCloudFlareBlocked(page)) {
            this.logger.log("Encountered CloudFlare error. This may be caused by too many connections. Details are below.", MessageType.ERROR);
            this.logger.log(await this.cfHandler.getCloudFlareErrInfo(page), MessageType.NONE);
            await Utils.sleep(5000);
            return VoteStatus.CLOUDFLARE_FAIL;
        }

        // This checks for the CloudFlare landing page. This seems to now be mandatory for all users.
        if (await this.cfHandler.gotCloudFlareCAPTCHA(page)) {
            let status = await this.cfHandler.bypassCFCaptcha(page, cursor);

            if (status !== VoteStatus.CONTINUE) {
                return status;
            }
        }
        
        let needsLoggedIn : boolean = await this.needsLoggedInToDiscord(page);
        let loggedInUser : string = await this.getCurrentlyLoggedInUserOnTopGG(page);

        if (!needsLoggedIn && loggedInUser !== displayName) {
            this.logger.log(`Did not successfully clear login data of former user. Currently logged in as: ${loggedInUser}, should be: ${displayName}`, MessageType.ERROR);
            return VoteStatus.FAILED_TO_CLEAR_LOGIN_DATA_FAIL;
        }

        if (await this.checkAlreadyVoted(page)) {
            this.logger.log(`You have already voted for ${await this.getBotName(page)}. Exiting...`, MessageType.WARNING);
            return VoteStatus.ALREADY_VOTED_FAIL;
        }

        if (needsLoggedIn) {
            await this.clickLoginButtonOnTopGG(page, cursor);

            await Promise.any([page.waitForNetworkIdle(), Utils.sleep(10 * 1000)]);

            let status = await this.discordHandler.discordSignIn(page, cursor);
        
            if (status !== VoteStatus.CONTINUE) {
                return status;
            }
        }

        await Promise.any([page.waitForNetworkIdle(), Utils.sleep(10 * 1000, false)]);

        let voteSuccess: boolean | null = await this.handleVotingPostLogin(page, cursor, botID);

        if (voteSuccess == null) {
            this.logger.log("Did not recieve failure nor success repsonse from server. Retrying vote process.", MessageType.WARNING)
            await page.reload();
            await Promise.any([page.waitForNetworkIdle(), Utils.sleep(20 * 1000, false)]);
            voteSuccess = await this.handleVotingPostLogin(page, cursor, botID);
        }

        await page.close();
        if (voteSuccess == null) {
            this.logger.log("Did not recieve failure nor success repsonse from server again. Aborting.", MessageType.ERROR);
            return VoteStatus.OTHER_RETRY_FAIL;
        } else if (voteSuccess === false) {
            return VoteStatus.OTHER_CRIT_FAIL;
        } else {
            return VoteStatus.SUCCESS;
        }
    };


    async getCurrentlyLoggedInUserOnTopGG(page : puppeteer.Page) : Promise< string >
    {
        let results = await page.$("button[id='popover-trigger-10']");

        if (results === null)
            return "";

        let username : string | null = await results.evaluate(el => el.getAttribute("data-testid"));
        username === "false" ? this.logger.log("No user currently logged in") : this.logger.log(`Extracted the username ${username} from top.gg`)
        if (username === null)
        {
            this.logger.log("Failed to extract username from page.", MessageType.WARNING);
            username = "";
        }

        return username;
    }

    async getBotName(page: puppeteer.Page): Promise < string > {
        try {
            let voteForString = (await page.$eval("img[alt*='Voting for']", el => el.getAttribute('alt')));
    
            if (voteForString == null) {
                this.logger.log("Failed to get bot name.", MessageType.WARNING);
                return "UNKNOWN BOT";
            }
    
            return voteForString.substring(11);
        } catch (err) {
            this.logger.log(err as string, MessageType.ERROR);
            return "UNKNOWN BOT (Exception)";
        }
    };


    /**
     * 
     * @param page The page, which should be navigated to the Bot's Top.gg vote page.
     * @returns TRUE if top.gg displays text indicating that the user has already voted for the bot. FALSE otherwise. Note this will sometimes return FALSE even if the user has voted for the bot already due to top.gg not specifying as much.
     */
    async checkAlreadyVoted(page: puppeteer.Page): Promise < boolean > {
        let element = await page.$x("//p[text()='You have already voted']");

        if (element.length)
            return true;
        else
            return false;
    };

    async handleVotingPostLogin(page: puppeteer.Page, cursor: GhostCursor, botID: string): Promise < boolean | null > {
        let lastVoteSuccess: boolean | null = null;
        let botName: string = await this.getBotName(page);
        this.logger.log(`Attempting to vote for ${botName}...`);
    
        const responseCallback = async (response: puppeteer.HTTPResponse) => {
            if (response.request().method() === 'POST') {
                if (response.url().includes(`${botID}/vote`)) {
                    if (response?.ok()) {
                        this.logger.log(`Successfully voted for ${botName}!`, MessageType.SUCCESS);
                        lastVoteSuccess = true;
                    } else {
                        this.logger.log(`Failed to vote for ${botName}. Response as follows.`, MessageType.WARNING);
                        this.logger.logToFile(`Failure response from top.gg. Bot ID: ${botID}. Details: ${await response?.text()}`);
                        lastVoteSuccess = false;
                    }
                } else {
                    //console.this.logger.log(`Other POST request: ${response.url()} with response ${response.status}`);
                }
            }
        }
    
    
        page.on('response', responseCallback);
    
        await this.clickVoteButtonOnTopGG(page, cursor);
    
        for (let i = 0; i <= 25 && lastVoteSuccess === null; i++)
            await Utils.sleep(1000, false);
    
        if (lastVoteSuccess === false)
            await Utils.sleep(5000);
        
        let captchaResult = await this.captchaHandler.bypassCaptchas(page, cursor);
        if (captchaResult === false) {
            return false;
        } else if (captchaResult === true) {
            lastVoteSuccess = null;
    
            for (let i = 0; i <= 25 && lastVoteSuccess === null; i++)
                await Utils.sleep(1000, false);
        } else {
            this.logger.log("Did not find a CAPTCHA to solve.");
        }
    
        page.off('response', responseCallback);
    
        return lastVoteSuccess;
        
    };


    async needsLoggedInToDiscord(page: puppeteer.Page): Promise < boolean > {
        await Utils.sleep(5000); //on page load
    
        let results = await page.$("button[id='popover-trigger-10']");
        if (results == null) {
            return true;
        }
    
        let username : string | null = await results.evaluate(el => el.getAttribute("data-testid"));
        if (username == "false") {
            return true;
        }
    
        this.logger.log("User already signed in.")
        return false;
    };
    
    async clickLoginButtonOnTopGG(page: puppeteer.Page, cursor: GhostCursor): Promise < void > {
        this.logger.log("Attempting to click log in button on top.gg...");
        let loginToVoteButton: puppeteer.ElementHandle < Node > | null = await page.waitForXPath('//a[text()="Login"]');
    
        if (loginToVoteButton == null) {
            this.logger.log('Failed to click login button on Top.gg', MessageType.ERROR);
            return;
        }
    
        await Utils.clickElementWithGhostCursor(cursor, loginToVoteButton);
        this.logger.log("Log in button clicked.");
        return;
    };

    async clickVoteButtonOnTopGG(page: puppeteer.Page, cursor: GhostCursor): Promise < void > {
        this.logger.log("Waiting for Top.gg...", MessageType.INFO);
        await Promise.any([page.waitForNetworkIdle(), Utils.sleep(20 * 1000, false)]);
        this.logger.log("Finished waiting for page.", MessageType.INFO);
    
        await page.evaluate("window.readyToVote();");
    
        let voteButton: puppeteer.ElementHandle < Node > | null = await page.waitForXPath("//button[text()='Vote']");
    
        this.logger.log("Clicking vote button...");
    
        await Utils.clickElementWithGhostCursor(cursor, voteButton);
    
        this.logger.log("Vote button clicked.");
        return;
    };
}