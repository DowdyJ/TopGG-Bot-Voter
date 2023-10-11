import { MessageType } from "../Enum/MessageType";
import { Logger } from "../Logger";
import { Utils } from "../Utils";
import { GhostCursor } from "ghost-cursor";
import { Vector } from "ghost-cursor/lib/math";
import { BoundingBox, Page } from "puppeteer";
import { SolveRecaptchasResult } from "puppeteer-extra-plugin-recaptcha/dist/types";



export class CaptchaHandler {
    private logger: Logger;
    private _2CaptchaApiKey: string;

    public constructor(logger: Logger, _2CaptchaApiKey: string) {
        this.logger = logger;
        this._2CaptchaApiKey = _2CaptchaApiKey;

        if (_2CaptchaApiKey.length !== 32) {
            this.logger.log("Assuming not using 2Captcha's Service.", MessageType.INFO);
            this._2CaptchaApiKey = '';
        } else {
            this.logger.log("Using 2Captcha.", MessageType.INFO);
        }
    }

    /**
     * 
     * @param page 
     * @param cursor 
     * @param _2captchaAPIKey 
     * @returns false on failure, true on success. Returns null if no CAPTCHA is found.
     */
    async bypassCaptchas(page: Page, cursor: GhostCursor): Promise < boolean | null > {
        this.logger.log("Searching for CAPTCHAS...");
        if (this._2CaptchaApiKey !== '') {
            var result: SolveRecaptchasResult = await page.solveRecaptchas();

            if (result.error) {
                this.logger.log(`2Captcha failure: ${result.error}`, MessageType.ERROR)
                return false;
            }

            if (result.captchas.length !== 0) {
                this.logger.log(`Successfully bypassed ${result.captchas.length} CAPTCHA(s).`, MessageType.SUCCESS);
                return true;
            }

            return null;
        } else {
            if (await this.gotCaptchaed(page)) {
                await this.clickHCaptchaBox(page, cursor);
                await Utils.sleep(5000);
                if (await this.gotCaptchaed(page)) {
                    this.logger.log("Failed captcha challenge. Trying again...", MessageType.WARNING);
                    await this.clickHCaptchaBox(page, cursor);
                    await Utils.sleep(5000);
                    if (await this.gotCaptchaed(page)) {
                        this.logger.log("Failed captcha challenge again. Please try logging in manually in the Chromium instance and Authorizing. This should save your login for future attempts.", MessageType.ERROR);
                        return false;
                    } else {
                        this.logger.log("Successfully bypassed captcha challenge!");
                        return true;
                    }
                } else {
                    this.logger.log("Successfully bypassed captcha challenge!");
                    return true;
                }
            }
            return null;
        }
    }

    async gotCaptchaed(page: Page): Promise < boolean > {
        let captchaBox = await page.$("iframe[src*='hcaptcha']");
        if (captchaBox !== null) {
            this.logger.log("Encountered hCaptcha challenge.", MessageType.WARNING);
            return true;
        }
        return false;
    }

    async clickHCaptchaBox(page: Page, cursor: GhostCursor): Promise < void > {
        this.logger.log("Clicking captcha box...", MessageType.INFO);
        let captchaBox = await page.$("iframe[src*='hcaptcha']");
        let captchaBoundingBox: BoundingBox | null | undefined = (await captchaBox?.boundingBox());
        if (captchaBoundingBox == null) {
            this.logger.log("Failed to find captcha bounding box.", MessageType.ERROR);
            return
        }

        let clickVector: Vector = {
            x: (captchaBoundingBox?.x as number + (captchaBoundingBox?.width as number * 0.1)),
            y: (captchaBoundingBox?.y as number + ((captchaBoundingBox?.height as number) / 2))
        }
        await cursor.moveTo(clickVector);
        await Utils.sleep(1000, false);
        await cursor.click(undefined, {
            paddingPercentage: 0
        });
    }


}