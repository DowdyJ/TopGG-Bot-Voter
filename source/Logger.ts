import { VoteStatus } from "./Enum/VoteStatus";
import { MessageType } from "./Enum/MessageType";
import fs from "fs";

export class Logger {
    static readonly BOLD = '\u001b[1m';
    static readonly ITALIC = '\u001b[3m';
    static readonly UNDERLINE = '\u001b[4m';
    static readonly BLUE = '\u001b[34m';
    static readonly RED = '\u001b[31m';
    static readonly GREEN = '\u001b[32m';
    static readonly YELLOW = '\u001b[33m';
    static readonly RESET = '\u001b[0m';

    private loggedMessageKeys = new Set<string>();

    logSuccess(message: string): void {
        console.log(`${Logger.RESET}${Logger.GREEN}${Logger.BOLD}[ SUCCESS ]${Logger.RESET} ${message}`);
    }
    
    logError(message: string): void {
        console.log(`${Logger.RESET}${Logger.RED}${Logger.BOLD}[  ERROR  ]${Logger.RESET} ${message}`);
    }
    
    logWarning(message: string): void {
        console.log(`${Logger.RESET}${Logger.YELLOW}${Logger.BOLD}[ WARNING ]${Logger.RESET} ${message}`);
    }
    
    logInfo(message: string): void {
        console.log(`${Logger.RESET}${Logger.BLUE}${Logger.BOLD}[  INFO   ]${Logger.RESET} ${message}`);
    }

    logOnce(message: string, messageType: MessageType = MessageType.INFO, messageKey: string) {
        if (this.loggedMessageKeys.has(messageKey))
            return;

        this.loggedMessageKeys.add(messageKey);
        this.log(message, messageType);
    }
    
    log(message: string, messageType: MessageType = MessageType.INFO): void {
        switch (messageType) {
            case MessageType.INFO:
                this.logInfo(message);
                break;
            case MessageType.SUCCESS:
                this.logSuccess(message);
                break;
            case MessageType.WARNING:
                this.logWarning(message);
                break;
            case MessageType.ERROR:
                this.logError(message);
                break;
            case MessageType.NONE:
                console.log(message);
                break;
            default:
                this.logError("Ran default case in logger.");
                break;
        }
    }
    

    logToFile(data : string) : void {
        fs.writeFileSync("data/log.txt", `${data}\n`, {
            flag: "as"
        });
    };

    logVotingResultToFile(username: string, botID : string, successValue : VoteStatus): void {

        let failedToVoteBase : string = `${new Date()}: Failed to vote for ${botID} with user ${username}. Reason: `;
        let succeededInVotingBase : string = `${new Date()}: Successfully voted for ${botID} with user ${username}`
        let resultString : string = "";
        switch (successValue) {
            case VoteStatus.ALREADY_VOTED_FAIL:
                resultString = failedToVoteBase + "Already voted";
                break;
            case VoteStatus.CAPTCHA_FAIL:
                resultString = failedToVoteBase + "Failed Captcha Challenge";
                break;
            case VoteStatus.CLOUDFLARE_FAIL:
                resultString = failedToVoteBase + "Blocked by CloudFlare";
                break;
            case VoteStatus.LOGIN_FAIL:
                resultString = failedToVoteBase + "Failed to log in to Discord";
                break;
            case VoteStatus.DISCORD_NEW_LOCATION_FAIL:
                resultString = failedToVoteBase + "Discord flagged new login location";
                break;
            case VoteStatus.FAILED_TO_CLEAR_LOGIN_DATA_FAIL:
                resultString = failedToVoteBase + "Failed to clear prior log in data";
                break;
            case VoteStatus.OTHER_CRIT_FAIL:
                resultString = failedToVoteBase + "Other major failure";
                break;
            case VoteStatus.OTHER_RETRY_FAIL:
                resultString = failedToVoteBase + "Other recoverable failure";
                break;
            case VoteStatus.SUCCESS:
                resultString = succeededInVotingBase;
                break;
            default:
                resultString = "UNHANDLED CASE";
                break;
        }
    
        this.logToFile(resultString);
    }
}