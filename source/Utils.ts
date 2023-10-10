import { MessageType } from 'Enum/MessageType';
import { Logger } from 'Logger';
import { ClickOptions, GhostCursor } from 'ghost-cursor';
import { Vector } from 'ghost-cursor/lib/math';
import * as puppeteer from 'puppeteer'

export class Utils {

    private static logger: Logger = new Logger();

    // There are cases where process.stdout will be null due to how the script is launched, which causes problems with certain logging functions.
    private static isRealTerminal: boolean = true;

    static async sleep(ms: number, log: boolean = true) {
        let totalSecondsToWait: number = ms / 1000;
        let totalSecondsWaited: number = 0;
    
        let countdownResolution: number = 1000;
        let numberOfIterations: number = ms / countdownResolution;
    
        for (let i = 0; i < numberOfIterations; i++) {
            if (log && Utils.isRealTerminal)
                process.stdout.write(`Waiting: ${totalSecondsToWait - totalSecondsWaited} / ${totalSecondsToWait}`);
    
            await new Promise(resolve => setTimeout(resolve, countdownResolution));
            totalSecondsWaited += (countdownResolution / 1000);
    
            if (log && Utils.isRealTerminal) {
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
            }
    
        }
    
        return
    };

    static setIsRealTerminal(isRealTerminal: boolean) {
        this.isRealTerminal = isRealTerminal;
    }

    static async slowType(page: puppeteer.Page, whatToType: string) {
        for (let index = 0; index < whatToType.length; index++) {
            const element = whatToType[index];
            const delayAmount: number = (Math.random() * 100) + 200;
            await page.keyboard.type(element, {
                delay: delayAmount
            });
        }
        return;
    };

    static async getInnerTextFromElementBySelector(page: puppeteer.Page, selector: string): Promise < string > {
        let element: puppeteer.ElementHandle < Element > | null = await page.$(selector);
    
        if (element == null) {
            this.logger.log(`Failed to find element to extract innerHTML from with selector: ${selector}`, MessageType.WARNING);
            return "ERR";
        }
    
        return await this.getInnerTextFromElement(element);
    }
    
    static async getInnerTextFromElement(element: puppeteer.ElementHandle < Element > ): Promise < string > {
        return await element.evaluate((e) => e.innerHTML);
    }

    static async clickElementWithGhostCursor(cursor: GhostCursor, element: puppeteer.ElementHandle < Node > | puppeteer.ElementHandle < Element > | null, clickOptions: ClickOptions | undefined = undefined): Promise < void > {
        if (element == null) {
            this.logger.log("Tried to click null element!", MessageType.WARNING);
        }
        await cursor.click(element as puppeteer.ElementHandle < Element > , clickOptions);
        return;
    };
    
    static async moveToElementWithGhostCursor(cursor: GhostCursor, element: puppeteer.ElementHandle < Node > | puppeteer.ElementHandle < Element > | null, clickOptions: ClickOptions | undefined = undefined): Promise < void > {
        if (element == null) {
            this.logger.log("Tried to move to null element!", MessageType.WARNING);
        }
        let bBox = (await (element as puppeteer.ElementHandle < Element >).boundingBox());
    
        await cursor.moveTo({x:bBox!.x, y:bBox!.y} as Vector);
        return;
    };


    static printLoginInfo(botID : string, displayName : string) : void {
        this.logger.log("Recieved the following input:");

        this.logger.log(`Display Name: ${displayName}`)
        this.logger.log(`Bot ID: ${botID}`);
    
        return;
    };
    
}