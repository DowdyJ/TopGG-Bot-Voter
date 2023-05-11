#!/usr/bin/env node

const os = require('os')

const shell = require('shelljs');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const scriptDirectory = path.dirname(process.argv[1]);
shell.cd(scriptDirectory);

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms * 1000));
  }

async function linux_vote() {

    async function launchChromium() {
        console.log(`Trying to launch Chromium`)
        const chromium = shell.exec('node source/getChromiumExecutablePath.js', { silent: true }).stdout.trim();
        const chromiumPath = chromium ?? '';
      
        if (chromiumPath === '') {
          throw new Error("Failed to find chromium on system. Make sure it is installed and try again.");
        }
        console.log(`Found Chrome at ${chromiumPath} and using it from ${chromium}`);
        const config = JSON.parse(fs.readFileSync('data/config.json', 'utf8'));
        const realScreen = config.settings.real_screen;
      
        if (realScreen.toLowerCase() === 'false') {
          console.log(`Launching Chromium: ${chromium} with virtual frame buffer...`);
          shell.exec(`xvfb-run -a -s "-ac" exec ${chromium} --remote-debugging-port=9222 --disable-gpu --no-sandbox > /dev/null 2>&1 &`);
          console.log(`Running Xvfb on server number ${process.env.DISPLAY}`);
        } else if (realScreen.toLowerCase() === 'true') {
          console.log(`Launching Chromium: ${chromium} with real display...`);
          shell.exec(`${chromium} --remote-debugging-port=9222 --disable-gpu --no-sandbox > /dev/null 2>&1 &`);
        } else {
          console.log('Please use "true" or "false" for real_screen in data/config.json');
          process.exit();
        }
      
        await sleep(config.advancedSettings.chromeLaunchPause);
      }
      


  const config = JSON.parse(fs.readFileSync('data/config.json', 'utf8'));
  const chromiumPath = config.advancedSettings.chromiumInstallDirectory;

  if (chromiumPath !== '') {
    process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = true;
    process.env.PUPPETEER_EXECUTABLE_PATH = chromiumPath;
  }

  const realTty = shell.exec('tty -s', { silent: true }).code === 0;
  const numberOfUsers = config.users.length;
  const logout = numberOfUsers !== 1 ? 'TRUE' : 'FALSE';

  for (const user of config.users) {
    if (logout === 'TRUE') {
      await launchChromium();
      const webSocketUrlForWipe = JSON.parse(execSync('curl -s http://127.0.0.1:9222/json/version').toString()).webSocketDebuggerUrl;
      shell.exec(`node source/wipeSessionStorage.js ${webSocketUrlForWipe}`);
    }

    for (const bot of user.bots_to_vote_for) {
      const botName = bot;
      const username = user.discord_username;
      const displayName = user.discord_displayname;
      const password = user.discord_password;
      const captchaApiKey = config.settings.twocaptchaAPIKey;
      const botId = config.bots[botName.toLowerCase()];
      await launchChromium();
      const webSocket = JSON.parse(execSync('curl -s http://127.0.0.1:9222/json/version').toString()).webSocketDebuggerUrl;

      shell.exec(`node source/index.js ${username} ${password} ${webSocket} ${botId} ${captchaApiKey} ${displayName} ${realTty}`);
      console.log('--------------------------------------------------------------------');
    }
    console.log('====================================================================');
  }
}

async function windows_vote(config) {
    async function openChrome(useRealScreen, chromiumExecPath) {
        if (useRealScreen.toLowerCase() === 'false') {
          // ...
          // TODO: Reimplement VDesk functionality
          // ...
        } else {
          console.log(`Launching Chromium: ${chromiumExecPath} with real display...`);
          shell.exec(`${chromiumExecPath} --remote-debugging-port=9222 --disable-gpu --no-sandbox`, {
            async: true,
            silent: true,
          });
        }
      
        await sleep(advancedSettings.chromeLaunchPause);
      }


      const users = config.users;
      const settings = config.settings;
      const advancedSettings = config.advancedSettings;
      const botNameToIdConversion = config.bots;
      
      const twoCaptchaKey = settings.twocaptchaAPIKey;
      const realScreen = settings.real_screen;


      const chromium = shell.exec('node source/getChromiumExecutablePath.js', { silent: true }).stdout.trim();

      let logout = 'false';
      if (users.length !== 1) {
        logout = 'true';
      }
    
      const realTty = true;
    
      for (const user of users) {
        const username = user.discord_username;
        const password = user.discord_password;
        const displayName = user.discord_displayname;
    
        if (logout === 'true') {
          await openChrome(realScreen, chromium);
          const websocketJsonForWipe = JSON.parse(
            shell.exec('curl -s http://127.0.0.1:9222/json/version', { silent: true }).stdout
          );
          const websocketForWipe = websocketJsonForWipe.webSocketDebuggerUrl;
          shell.exec(`node source/wipeSessionStorage.js ${websocketForWipe}`);
        }
    
        const botsToVoteFor = user.bots_to_vote_for;
        for (const bot of botsToVoteFor) {
          await openChrome(realScreen, chromium);
    
          const botId = botNameToIdConversion[bot.toLowerCase()];
          const websocketJson = JSON.parse(
            shell.exec('curl -s http://127.0.0.1:9222/json/version', { silent: true }).stdout
          );
          const websocket = websocketJson.webSocketDebuggerUrl;
    
          shell.exec(
            `node source/index.js ${username} ${password} ${websocket} ${botId} ${twoCaptchaKey} ${displayName} ${realTty}`
          );
          console.log('--------------------------------------------------------------------');
        }
    
        console.log('====================================================================');
      }
};


const linux_voteloop = (async () => {
    const shouldLoop = JSON.parse(fs.readFileSync('data/config.json', 'utf8')).settings.autoloop.toLowerCase();
    console.log(`Should repeat is set to: ${shouldLoop}`);
    if (shouldLoop === 'false') {
        await linux_vote();
      } else if (shouldLoop === 'true') {
        const minLoopTime = config.advancedSettings.minTimeToWaitForLoop;
        const maxLoopTime = config.advancedSettings.maxTimeToWaitForLoop;
      
        while (true) {
          await linux_vote();
          const secondsToSleep = shell.exec(`shuf -i ${minLoopTime}-${maxLoopTime} -n1`, { silent: true }).stdout.trim();
          console.log(`Sleeping for ${secondsToSleep} seconds.`);
      
          for (let i = 1; i <= secondsToSleep; i++) {
            process.stdout.write(`\x1b[1A\x1b[KSleeping... ${secondsToSleep - i}\n`);
            await sleep(1);
          }
          console.log(`Sleeping for ${secondsToSleep} seconds...`);
        }
      }
})

const windows_voteloop = (async () => {
    const config = JSON.parse(fs.readFileSync('./data/config.json', 'utf-8'));
    const autoLoop = config.settings.autoloop;

    if (autoLoop.toLowerCase() === 'true') {
        (async function () {
          while (true) {
            await windows_vote(config);
            const minSleepTime = advancedSettings.minTimeToWaitForLoop;
            const maxSleepTime = advancedSettings.maxTimeToWaitForLoop;
            const sleepSeconds = Math.floor(Math.random() * (maxSleepTime - minSleepTime + 1) + minSleepTime);
      
            for (let i = 0; i < sleepSeconds; i++) {
              const remainingTime = sleepSeconds - i;
              console.log(`Sleeping... ${remainingTime}`);
              await sleep(1);
            }
          }
        })();
      } else {
        (async function () {
          await windows_vote(config);
        })();
      }
});

const vote = (async () => {
    let platform = os.platform();
    console.log(`Starting vote function. Platform ${platform}`);
    switch (platform) {
        case 'linux':
            await linux_voteloop();
            break;
        case 'win32':
            await windows_voteloop();
            break;
        default:
            throw new Error(`Unsupported platform used! Platform was ${platform}`);
    }
    console.log(`Ending vote function`);

});

(async () => {
    console.log("Starting top level function");
    try {
        await vote();
    } catch (err) {
        console.log(err);
    }
    console.log("Leaving top level function");
})();
