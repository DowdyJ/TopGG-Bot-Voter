import { VoteStatus } from "./Enum/VoteStatus";
import { MessageType } from "./Enum/MessageType";
import { WebsocketBrowserWrapper } from "./WebsocketBrowserWrapper";
import { Logger } from "./Logger";
import { CaptchaHandler } from "./Handler/CaptchaHandler";
import { DiscordHandler } from "./Handler/DiscordHandler";
import { TopGGHandler } from "./Handler/TopGGHandler";
import { CloudFlareHandler } from "./Handler/CloudFlareHandler";
import { Utils } from "./Utils";


(async () => {

    const realTerminal = (process.argv[8] == "true" ? true : false);
    Utils.setIsRealTerminal(realTerminal);

    const wsEndPoint: string = process.argv[4];
    const botID: string = process.argv[5];
    const email: string = process.argv[2];
    const password: string = process.argv[3];
    const displayName : string = process.argv[7];
    const _2captchaAPIKey: string = process.argv[6];

    const logger: Logger = new Logger();
    const captchaHandler: CaptchaHandler = new CaptchaHandler(logger, _2captchaAPIKey);
    const discordHandler: DiscordHandler = new DiscordHandler(logger, captchaHandler, displayName, email, password);
    const cfHandler: CloudFlareHandler = new CloudFlareHandler(logger, captchaHandler);
    const topGGHandler: TopGGHandler = new TopGGHandler(logger, captchaHandler, cfHandler, discordHandler);

    const browser: WebsocketBrowserWrapper = new WebsocketBrowserWrapper(logger, wsEndPoint, _2captchaAPIKey);
    await browser.initialize();


    try {
        let votingResult: VoteStatus = await topGGHandler.voteOnTopGG(browser, botID, displayName);

        logger.logVotingResultToFile(displayName, botID, votingResult);
        
        if (votingResult === VoteStatus.CLOUDFLARE_FAIL) {
            logger.log("Waiting 5 minutes before trying again...");
            sleep(5 * 60 * 1000);
            votingResult = await topGGHandler.voteOnTopGG(browser, botID, displayName);

            if (votingResult === VoteStatus.SUCCESS) {
                logger.logVotingResultToFile(displayName, botID, votingResult);
                return;
            } else if (votingResult === VoteStatus.CLOUDFLARE_FAIL) {
                logger.log("CloudFlare rejected the connection again. Try waiting a while before trying again.", MessageType.ERROR);
                logger.logVotingResultToFile(displayName, botID, votingResult);
                return;
            }
        }

        // One more chance for non-critical fails
        if (votingResult === VoteStatus.LOGIN_FAIL || votingResult === VoteStatus.OTHER_RETRY_FAIL) {
            await topGGHandler.voteOnTopGG(browser, botID, displayName);
            logger.logVotingResultToFile(displayName, botID, votingResult);
            return;
        }

        return;
    } 
    catch (err) {
        logger.log(err as string, MessageType.ERROR);
        logger.log("Saving screenshots of open tabs to data/ ...");
        await browser.screenshotAllOpenPages();
        logger.log("Finished screenshotting tabs.");
    } 
    finally {
        await browser.cleanup();
    }
})();