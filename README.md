# TopGGBotVoter
This will allow you to automate the voting process for Discord bots on Top.gg.<br>
You can specify any number of bots to vote for, though too many entries may result in CloudFlare temporarily blocking your connections.<br><br>
From my experience other scripts using Puppeteer can sometimes fail to submit votes due to what I assume is their bot detection system. To avoid this, this project uses GhostCursor to emulate realistic mouse movement and a more elaborate Puppeteer setup that hooks into a chromium instance post-launch. Furthermore, to allow this script to run on headless servers and to avoid getting detected as running headless Chromium <i>but</i> still get the same convenience as running headless, this project optionally utilizes Xvfb to emulate a virtual screen for Chromium to run in.<br>
Currently only Linux is supported, though it should work on Windows if the install and run scripts were converted.<br>


## Prerequisites
You must have <b>Node.js</b> and <b>Make</b> installed for this to work. 
Install Node from here:
https://nodejs.org/en/download/ <br>
*Note*: Make sure you get an up-to-date installation of Node. Older versions of Node will not work!


## Instructions
After installing Node and cloning the repo, do the following.
<ol>
<li>Run <code>sudo make init</code>. NOTE: This script requires EITHER sudo permissions to install Xvfb and jq OR for those to be installed ahead of time. if you have both installed already, feel free to leave off the sudo c:</li>
<li>Edit <code>UserInfo.txt</code> and <code>bots.txt</code>
  <ul>
    <li>These are parsed as JSON files. Take care to format accordingly!</li>
    <li>Put your Discord username and password in the appropriate fields in UserInfo.txt.</li>
    <li>The <code>real_screen</code> field in UserInfo.txt determines whether you want the program to execute with or without Chromium visible. You probably want to leave this as FALSE unless you are troubleshooting.</li>
    <li>The <code>bots_to_vote_for</code> field is a list of bot names as listed in the <code>bots.txt</code> file. If you'd like to vote for other bots than the ones included in that file, make sure to edit it and add bot ids. You can get the bot id either from within Discord or by going to their voting link and extracting the number from the URL.</li>
  </ul>
</li>
<li>Run <code>./run.sh</code>. After initial setup, this is the only step you need to do.</li>
</ol>
<br>
That should be all you need to do! Due to how Puppeteer is setup, your cookies are not wiped after each use. If you want to reset this (such as to login as another user) run <code>./freshrun.sh</code>. <br>
If you'd like this to repeat on an interval, you are encouraged to set up a task in cron.

## Notes
As far as I can tell, all aspects of this script are in accordance with top.gg's privacy policy and terms of service (2022/12/05). As you must store your Discord username and password in plain text to use this, do be careful. This program doesn't steal your info, but it very well could. I've done my best to write this in a readable way, so feel free to check! If you have suggestions or contirbutions feel free to open a pull request or issue.<br>
This project is licensed under the Creative Commons Zero v1.0 Universal license.
