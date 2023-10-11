import { CloudFlareHandler } from "../Handler/CloudFlareHandler";
import { MessageType } from "../Enum/MessageType";
import { Logger } from "../Logger";
import { Utils } from "../Utils";
import { WebsocketBrowserWrapper } from "../WebsocketBrowserWrapper";

import { exec } from 'child_process';
import { CaptchaHandler } from "../Handler/CaptchaHandler";
import { Page } from "puppeteer";
import { createCursor } from "ghost-cursor";


class CFTests {

    executeCommand(command: string): Promise<string> {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.warn('Error executing command:', error);
                    return reject(error);
                }
                if (stderr) {
                    console.log('stderr:', stderr);
                }
                resolve(stdout.trim());
            });
        });
    }

    async clearCache() {
        await this.executeCommand("exec $(node getChromiumExecutablePath.js) --remote-debugging-port=9222 & sleep 5 && curl -s http://127.0.0.1:9222/json/version | jq -r .webSocketDebuggerUrl | xargs node wipeSessionStorage.js")
    }

    async testDetectCFTurnstile() {
        await this.clearCache();
        let chromiumPath = await this.executeCommand("node getChromiumExecutablePath.js");
        this.executeCommand(`exec ${chromiumPath} --remote-debugging-port=9222 --disable-gpu --disable-dev-shm-usage --disable-setuid-sandbox --no-first-run --no-sandbox --no-zygote --deterministic-fetch --disable-features=IsolateOrigins --disable-site-isolation-trials`);
        await Utils.sleep(5000);
        
        let socketUrl = await this.executeCommand("curl -s http://127.0.0.1:9222/json/version | jq -r .webSocketDebuggerUrl");
        let logger = new Logger();
        let browserWrapper: WebsocketBrowserWrapper = new WebsocketBrowserWrapper(logger, socketUrl, '');
        await browserWrapper.initialize();

        let captchaHandler = new CaptchaHandler(logger, '');
        let cfHandler = new CloudFlareHandler(logger, captchaHandler);

        let pages = await browserWrapper.getOpenPages() as Page[];
        await pages[0].goto("https://www.nowsecure.nl");
        await Utils.sleep(2000);
        if (await cfHandler.gotCloudFlareCAPTCHA(pages[0])) {
            logger.log("testDetectCFTurnstile", MessageType.SUCCESS);
        }
        else {
            logger.log("testDetectCFTurnstile", MessageType.ERROR);
        }

        await browserWrapper.cleanup();
    }

    async testBypassCFTurnstile() {
        await this.clearCache();
        let chromiumPath = await this.executeCommand("node getChromiumExecutablePath.js");
        this.executeCommand(`exec ${chromiumPath} --remote-debugging-port=9222 --disable-gpu --disable-dev-shm-usage --disable-setuid-sandbox --no-first-run --no-sandbox --no-zygote --deterministic-fetch --disable-features=IsolateOrigins`);
        await Utils.sleep(5000);
        
        let socketUrl = await this.executeCommand("curl -s http://127.0.0.1:9222/json/version | jq -r .webSocketDebuggerUrl");
        let logger = new Logger();
        let browserWrapper: WebsocketBrowserWrapper = new WebsocketBrowserWrapper(logger, socketUrl, '');
        await browserWrapper.initialize();

        let captchaHandler = new CaptchaHandler(logger, '');
        let cfHandler = new CloudFlareHandler(logger, captchaHandler);
        
        let pages = await browserWrapper.getOpenPages() as Page[];
        pages[0].goto("https://www.nowsecure.nl").catch((e) => {});
        browserWrapper.disconnectFromBrowserInstance();
        await Utils.sleep(10 * 1000);
        await browserWrapper.reconnectToBrowserInstance();
        pages = await browserWrapper.getOpenPages() as Page[];
        let cursor = createCursor(pages[0]);

        await cfHandler.bypassCFCaptcha(pages[0], cursor, browserWrapper);
        pages = await browserWrapper.getOpenPages() as Page[];

        await Utils.sleep(10 * 1000);
        
        let passElement = await pages[0].$("div[class=nonhystericalbg]");

        if (passElement != null) {
            logger.log("testBypassCFTurnstile", MessageType.SUCCESS);
        }
        else {
            logger.log("testBypassCFTurnstile", MessageType.ERROR);
        }


        await browserWrapper.cleanup();
    }
}

(async () => {
    let tests = new CFTests();
    await tests.testDetectCFTurnstile();
    await tests.testBypassCFTurnstile();
})();