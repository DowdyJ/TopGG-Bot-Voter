import { MessageType } from "Enum/MessageType";
import { VoteStatus } from "Enum/VoteStatus";
import { Logger } from "Logger";
import { Utils } from "Utils";
import { GhostCursor } from "ghost-cursor";
import * as puppeteer from "puppeteer"
import { Page } from "puppeteer";
import { CaptchaHandler } from "./CaptchaHandler";



export class CloudFlareHandler {
    private logger: Logger;
    private captchaHandler: CaptchaHandler;

    public constructor(logger: Logger, captchaHandler: CaptchaHandler) {
        this.logger = logger;
        this.captchaHandler = captchaHandler;
    }


    async getCloudFlareErrInfo(page: puppeteer.Page): Promise < string > {
        let errorLabel: string = await Utils.getInnerTextFromElementBySelector(page, "span[class='inline-block']");
        let errorNumber: string = await Utils.getInnerTextFromElementBySelector(page, "span[class='code-label']");
        return `${errorLabel}: ${errorNumber}`;
    }
    
    async gotCloudFlareBlocked(page: puppeteer.Page): Promise < boolean > {
        
        if (await page.$("div[class='cf-wrapper']"))
            return true;
        else
            return false;
    };


    async gotCloudFlareCAPTCHA(page : puppeteer.Page) {
        let captchaBox = await page.$("#turnstile-wrapper");
        if (captchaBox !== null) {
            this.logger.log("Encountered Cloudflare CAPTCHA challenge.", MessageType.WARNING);
            return true;
        }
        return false;
    }

    async bypassCFCaptcha(page: Page, cursor: GhostCursor) {
        // IFrame containing the checkbox to continue
        let iframeContainer = (await page.$$("iframe"))[0];
        if (iframeContainer === null) {
            this.logger.log("Unable to locate CloudFlare CAPTCHA field to click, aborting.", MessageType.ERROR);
            return VoteStatus.CLOUDFLARE_FAIL;
        }

        // Get the actual area to click within the IFrame. We then wait for the decision by CF on if we need to click the box or not.
        let elementToClick = await iframeContainer.$('#challenge-stage');
        await Utils.sleep(10 * 1000);

        // This element is present on the top.gg side, but not on the CF side. If the element is not found, we need to solve the CF puzzle.
        if ((await page.$x("/html/body/div[1]/div/div/div[1]/footer/div/div[1]/p[1]")).length == 0) {
            this.logger.log("Forced CF CAPTCHA");
            try {       
                await Utils.moveToElementWithGhostCursor(cursor, elementToClick);
                await elementToClick!.click();
            }
            catch (err) {
                this.logger.log(err as string, MessageType.ERROR);
                return VoteStatus.OTHER_CRIT_FAIL;
            }
            
            await Utils.sleep(10 * 1000);
            await this.captchaHandler.bypassCaptchas(page, cursor);
        }
        else {
            this.logger.log("Automatic CF bypass");
        }

        return VoteStatus.CONTINUE;
    }

}