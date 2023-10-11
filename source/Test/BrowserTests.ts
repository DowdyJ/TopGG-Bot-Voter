import { MessageType } from "../Enum/MessageType";
import { Logger } from "../Logger";
import { Utils } from "../Utils";
import { WebsocketBrowserWrapper } from "../WebsocketBrowserWrapper";

import { exec } from 'child_process';


class BrowserTests {


    executeCommand(command: string): Promise<string> {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.warn('Error executing command:', error);
                    return reject(error);
                }
                if (stderr) {
                    console.warn('stderr:', stderr);
                }
                resolve(stdout.trim());
            });
        });
    }

    async testBrowserConnect() {
        let chromiumPath = await this.executeCommand("node getChromiumExecutablePath.js");
        this.executeCommand(`exec ${chromiumPath} --remote-debugging-port=9222 --disable-gpu --disable-dev-shm-usage --disable-setuid-sandbox --no-first-run --no-sandbox --no-zygote --deterministic-fetch --disable-features=IsolateOrigins --disable-site-isolation-trials`);
        await Utils.sleep(5000);
        
        let socketUrl = await this.executeCommand("curl -s http://127.0.0.1:9222/json/version | jq -r .webSocketDebuggerUrl");
        let logger = new Logger();
        let browserWrapper: WebsocketBrowserWrapper = new WebsocketBrowserWrapper(logger, socketUrl, '');
        await browserWrapper.initialize();
        await browserWrapper.cleanup();
        logger.log("testBrowserConnect", MessageType.SUCCESS);
    }

    async testBrowserConnectXvfb() {
        let chromiumPath = await this.executeCommand("node getChromiumExecutablePath.js");
        this.executeCommand(`xvfb-run -a -s "-ac" exec ${chromiumPath} --remote-debugging-port=9222 --disable-gpu --disable-dev-shm-usage --disable-setuid-sandbox --no-first-run --no-sandbox --no-zygote --deterministic-fetch --disable-features=IsolateOrigins --disable-site-isolation-trials`);
        await Utils.sleep(5000);
        
        let socketUrl = await this.executeCommand("curl -s http://127.0.0.1:9222/json/version | jq -r .webSocketDebuggerUrl");
        let logger = new Logger();
        let browserWrapper: WebsocketBrowserWrapper = new WebsocketBrowserWrapper(logger, socketUrl, '');
        await browserWrapper.initialize();
        await browserWrapper.cleanup();
        logger.log("testBrowserConnectXvfb", MessageType.SUCCESS);
    }
}

(async () => {
    let tests = new BrowserTests();
    await tests.testBrowserConnect();
    await tests.testBrowserConnectXvfb();
})();