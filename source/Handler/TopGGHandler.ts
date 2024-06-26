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

        //let page: puppeteer.Page = await browserWrapper.getNthPage(0);
        (await browserWrapper.getNthPage(0)).setDefaultTimeout(20 * 1000);

        // This ensures that certain elements of the page are loaded without the need to scroll
        await (await browserWrapper.getNthPage(0)).setViewport({
            width: 1920,
            height: 1080
        });


        const url: string = `https://top.gg/bot/${botID}/vote`;
        (await browserWrapper.getNthPage(0)).goto(url).catch(error => {});
        // CF detects pptr, so we need to disconnect while it inspects the environment.
        browserWrapper.disconnectFromBrowserInstance();
        await Utils.sleep(10 * 1000);
        await browserWrapper.reconnectToBrowserInstance();
        
        //let cursor = createCursor(await browserWrapper.getNthPage(0));
        await installMouseHelper(await browserWrapper.getNthPage(0));
        
        await (await browserWrapper.getNthPage(0)).setViewport({
            width: 1920,
            height: 1080
        });

        if (await this.cfHandler.gotCloudFlareBlocked((await browserWrapper.getNthPage(0)))) {
            this.logger.log("Encountered CloudFlare error. This may be caused by too many connections. Details are below.", MessageType.ERROR);
            this.logger.log(await this.cfHandler.getCloudFlareErrInfo((await browserWrapper.getNthPage(0))), MessageType.NONE);
            await Utils.sleep(5000);
            return VoteStatus.CLOUDFLARE_FAIL;
        }

        // This checks for the CloudFlare landing (await browserWrapper.getNthPage(0)). This seems to now be mandatory for all users.
        if (await this.cfHandler.gotCloudFlareCAPTCHA((await browserWrapper.getNthPage(0)))) {
            let status = await this.cfHandler.bypassCFCaptcha((await browserWrapper.getNthPage(0)), await browserWrapper.getCursor(0), browserWrapper);

            if (status !== VoteStatus.CONTINUE) {
                return status;
            }
        }
        
        let needsLoggedIn : boolean = await this.needsLoggedInToDiscord(await browserWrapper.getNthPage(0));
        let loggedInUser : string = await this.getCurrentlyLoggedInUserOnTopGG(await browserWrapper.getNthPage(0));

        if (!needsLoggedIn && loggedInUser !== displayName) {
            this.logger.log(`Did not successfully clear login data of former user. Currently logged in as: ${loggedInUser}, should be: ${displayName}`, MessageType.ERROR);
            return VoteStatus.FAILED_TO_CLEAR_LOGIN_DATA_FAIL;
        }

        if (await this.checkAlreadyVoted((await browserWrapper.getNthPage(0)))) {
            this.logger.log(`You have already voted for ${await this.getBotName((await browserWrapper.getNthPage(0)))}. Exiting...`, MessageType.WARNING);
            return VoteStatus.ALREADY_VOTED_FAIL;
        }

        if (needsLoggedIn) {
            await this.clickLoginButtonOnTopGG((await browserWrapper.getNthPage(0)), await browserWrapper.getCursor(0));

            await Promise.all([(await browserWrapper.getNthPage(0)).waitForNetworkIdle(), Utils.sleep(10 * 1000)]);

            let status = await this.discordHandler.discordSignIn((await browserWrapper.getNthPage(0)), await browserWrapper.getCursor(0));
        
            if (status !== VoteStatus.CONTINUE) {
                return status;
            }
        }

        await Promise.any([(await browserWrapper.getNthPage(0)).waitForNetworkIdle(), Utils.sleep(10 * 1000, false)]);

        let voteSuccess: boolean | null = await this.handleVotingPostLogin((await browserWrapper.getNthPage(0)), await browserWrapper.getCursor(0), botID);

        if (voteSuccess == null) {
            this.logger.log("Did not recieve failure nor success repsonse from server. Retrying vote process.", MessageType.WARNING)
            await (await browserWrapper.getNthPage(0)).reload();
            await Promise.any([(await browserWrapper.getNthPage(0)).waitForNetworkIdle(), Utils.sleep(20 * 1000, false)]);
            voteSuccess = await this.handleVotingPostLogin((await browserWrapper.getNthPage(0)), await browserWrapper.getCursor(0), botID);
        }

        if (voteSuccess === false) {
            throw new Error("Fatal voting error.");
        }

        await (await browserWrapper.getNthPage(0)).close();
        if (voteSuccess == null) {
            this.logger.log("Did not recieve failure nor success repsonse from server again. Aborting.", MessageType.ERROR);
            return VoteStatus.OTHER_RETRY_FAIL;
        } 
        else {
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
            this.logger.log("Failed to extract username from (await browserWrapper.getNthPage(0)).", MessageType.WARNING);
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
            this.logger.log((err as Error).message, MessageType.ERROR);
            return "UNKNOWN BOT (Exception)";
        }
    };


    /**
     * 
     * @param page The page, which should be navigated to the Bot's Top.gg vote (await browserWrapper.getNthPage(0)).
     * @returns TRUE if top.gg displays text indicating that the user has already voted for the bot. FALSE otherwise. Note this will sometimes return FALSE even if the user has voted for the bot already due to top.gg not specifying as much.
     */
    async checkAlreadyVoted(page: puppeteer.Page): Promise < boolean > {
        let element = await page.$x("//p[text()='You have already voted']");

        if (element.length)
            return true;
        else
            return false;
    };

    async handleVotingPostLogin(page: Page, cursor: GhostCursor, botID: string): Promise < boolean | null > {
        let lastVoteSuccess: boolean | null = null;
        let botName: string = await this.getBotName(page);
        this.logger.log(`Starting vote process on top.gg for ${botName}...`);
    
        const responseCallback = async (response: puppeteer.HTTPResponse) => {
            if (response.request().method() === 'POST') {
                if (response.url().includes(`${botID}/vote`)) {
                    if (response?.ok()) {
                        this.logger.logOnce(`Successfully voted for ${botName}!`, MessageType.SUCCESS, "1341" + botName);
                        lastVoteSuccess = true;
                    } else {
                        this.logger.log(`Failed to vote for ${botName}. Response logged to data/log.txt.`, MessageType.WARNING);
                        this.logger.logToFile(`Failure response from top.gg. Bot ID: ${botID}. Details: ${await response?.text()}`);
                        lastVoteSuccess = false;
                    }
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
            page.off('response', responseCallback);
        
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


    async needsLoggedInToDiscord(page: Page): Promise < boolean > {
        await Utils.sleep(5000); //on page load
        
        // Id of button that shows profile info
        let results = await page.$("button[id='popover-trigger-:r8:']");
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
    
    async clickLoginButtonOnTopGG(page: Page, cursor: GhostCursor): Promise < void > {
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
        this.logger.log("Finished waiting for top.gg.", MessageType.INFO);
    
        await page.evaluate("window.readyToVote();");
    
        let voteButton: puppeteer.ElementHandle < Node > | null = await page.waitForXPath("//button[text()='Vote']");
    
        this.logger.log("Clicking vote button...");
    
        await Utils.clickElementWithGhostCursor(cursor, voteButton);
    
        this.logger.log("Vote button clicked.");
        return;
    };
}