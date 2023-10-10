import * as puppeteer from "puppeteer";
import puppeteer_e from "puppeteer-extra"
import {
    Browser,
    DEFAULT_INTERCEPT_RESOLUTION_PRIORITY,
    Page
} from 'puppeteer';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';

import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha'
import { Logger } from "Logger";
import { MessageType } from "Enum/MessageType";


export class WebsocketBrowserWrapper {

    private wsEndpoint : string;
    private _2CaptchaApiKey: string;
    private browserInstance: puppeteer.Browser | undefined;
    private logger: Logger;

    public constructor(logger: Logger, wsEndpoint : string, _2captchaApiKey: string) {
        this.wsEndpoint = wsEndpoint;
        this._2CaptchaApiKey = _2captchaApiKey;
        this.logger = logger;

        puppeteer_e.use(
            AdblockerPlugin({
                interceptResolutionPriority: DEFAULT_INTERCEPT_RESOLUTION_PRIORITY,
                blockTrackers: true
            })
        );
    
        puppeteer_e.use(
            RecaptchaPlugin({
                provider: {
                    id: '2captcha',
                    token: _2captchaApiKey
                }
            })
        );
    };

    public async initialize() {
        this.logger.log(`Connecting to endpoint ${this.wsEndpoint}`);

        this.browserInstance = await puppeteer_e.connect({
            browserWSEndpoint: this.wsEndpoint,
            targetFilter: (target) => !!target.url,
        });
    }

    public async getPuppeteerBrowser(): Promise<Browser> {
        if (this.browserInstance?.isConnected()) {
            return this.browserInstance;
        }
        
        try {
            this.disconnectFromBrowserInstance();
            await this.reconnectToBrowserInstance();
        }
        catch (err) {
            this.logger.log(err as string, MessageType.ERROR);
        }

        return this.browserInstance!;
    }

    public async cleanup() {
        if (this.browserInstance == null)
            return;

        if (!this.browserInstance.isConnected()) {
            await this.reconnectToBrowserInstance();
        }

        try {
            const pages = await this.browserInstance!.pages();
            this.logger.log("Cleaning up.");
            
            for (let i = 0; i < pages.length; i++) {
                try {
                    await pages[i].close();
                }
                catch (err) {
                    this.logger.log(err as string, MessageType.ERROR);
                }
            }

            await this.browserInstance.close();
            this.logger.log("Finshed cleaning up.")
        } catch (err) {
            this.logger.log(err as string, MessageType.ERROR);
        }
    }

    public disconnectFromBrowserInstance() {
        try {
            this.browserInstance!.disconnect();
        }
        catch (err) {
            this.logger.log(err as string, MessageType.WARNING);
        }
    }

    public async reconnectToBrowserInstance() {
        try {
            await this.initialize();
        }
        catch (err) {
            this.logger.log(err as string, MessageType.WARNING);
        }
    }


    public async getOpenPages(): Promise<Page[] | undefined> {
        if (this.browserInstance == null)
            throw new Error("Browser instance was null");

        if (!this.browserInstance.isConnected()) {
            await this.reconnectToBrowserInstance();
        }

        return await this.browserInstance.pages();
    }

    public async screenshotAllOpenPages() {
        if (!this.browserInstance?.isConnected()) {
            await this.reconnectToBrowserInstance();
        }

        let screenshots : Promise< string | Buffer >[] = [];
        let pages = await this.getOpenPages();
        if (pages == null)
            return;

        for (const p of pages) {
           await p.screenshot({path:`data/error_${new Date()}_${Math.random()}.jpg`, fullPage:true, type:"jpeg", fromSurface:false});
        }

        await Promise.all(screenshots);
    }

}