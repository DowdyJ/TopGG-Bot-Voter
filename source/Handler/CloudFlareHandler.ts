import { MessageType } from "../Enum/MessageType";
import { VoteStatus } from "../Enum/VoteStatus";
import { Logger } from "../Logger";
import { Utils } from "../Utils";
import { GhostCursor } from "ghost-cursor";
import * as puppeteer from "puppeteer"
import { ElementHandle, Page } from "puppeteer";
import { CaptchaHandler } from "./CaptchaHandler";
import { Vector } from "ghost-cursor/lib/math";
import { WebsocketBrowserWrapper } from "WebsocketBrowserWrapper";



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

    /**
     * This function will consume the page object. It must be reassigned after calling the function.
     * @param page 
     * @param cursor 
     * @param browser 
     * @returns 
     */
    async bypassCFCaptcha(page: Page, cursor: GhostCursor, browser: WebsocketBrowserWrapper): Promise<VoteStatus> {
        // IFrame containing the checkbox to continue
        let iframeContainer = (await page.$$("iframe"))[0];
        if (iframeContainer === null) {
            this.logger.log("Unable to locate CloudFlare CAPTCHA field to click, aborting.", MessageType.ERROR);
            return VoteStatus.CLOUDFLARE_FAIL;
        }
        
        // Wait for the decision by CF on if we need to click the box or not.
        // await Utils.sleep(10 * 1000);

        // This element is present on the top.gg side, but not on the CF side. If the element is not found, we need to solve the CF puzzle.
        if (await this.gotCloudFlareCAPTCHA(page)) {
            this.logger.log("Forced CF CAPTCHA");
            try {
                let captchaBoundingBox = await iframeContainer.boundingBox();
                
                let clickVector: Vector = {
                    x: (captchaBoundingBox?.x as number + (captchaBoundingBox?.width as number * 0.2)),
                    y: (captchaBoundingBox?.y as number + 7 * ((captchaBoundingBox?.height as number) / 16))
                }
                
                await cursor.moveTo(clickVector);
                await Utils.sleep(1000, false);

                await cursor.click(undefined, {
                    paddingPercentage: 0
                });

                browser.disconnectFromBrowserInstance();
            }
            catch (err) {
                this.logger.log((err as Error).message, MessageType.ERROR);
                return VoteStatus.OTHER_CRIT_FAIL;
            }
            
            await Utils.sleep(10 * 1000);
            await browser.reconnectToBrowserInstance();
            page = (await browser.getOpenPages() as Page[])[0];
            await this.captchaHandler.bypassCaptchas(page, cursor);
        }
        else {
            this.logger.log("Automatic CF bypass");
        }

        return VoteStatus.CONTINUE;
    }

}