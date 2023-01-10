# TopGG Bot Voter
This will allow you to automate the voting process for Discord bots on Top.gg.<br>
You can specify any number of bots to vote for, though too many entries may result in CloudFlare temporarily blocking your connections.<br><br>
From my experience other scripts using Puppeteer can sometimes fail to submit votes due to what I assume is their bot detection system. To avoid this, this project uses GhostCursor to emulate realistic mouse movement and a more elaborate Puppeteer setup that hooks into a chromium instance post-launch. Furthermore, to allow this script to run on headless servers and to avoid getting detected as running headless Chromium <i>but</i> still get the same convenience as running headless, this project optionally utilizes Xvfb to emulate a virtual screen for Chromium to run in.<br>
<s>Currently only Linux is supported, though it should work on Windows if the install and run scripts were converted.</s> Both Windows and Linux are now supported. Due to Windows not using X Server to render Xvfb does not work. The best alternative I could find for Windows to achieve a similar result is <a href="https://github.com/eksime/VDesk">VDesk</a>, but I've had only partial success using it. Details for installing on each platform are below.<br>


## Prerequisites
### Linux
You must have <b>Node.js</b> and <b>Make</b> installed for this to work. 
Install Node from here:
https://nodejs.org/en/download/ <br>
*Note*: Make sure you get an up-to-date installation of Node. Older versions of Node will not work!
<br>
### Windows
Same as with Linux, you must have <b>Node.js</b> installed for this to work. 
Install Node from here:
https://nodejs.org/en/download/ <br><br>
If you would like to run with <code>real_screen="FALSE"</code> (e.g. without seeing Chromium) you will need to install <a href="https://github.com/eksime/VDesk">VDesk</a>. If you don't mind seeing the window pop up <b>and you change <code>UserInfo.txt's real_screen</code> to TRUE</b> then you don't need to install this. <br>
You will also need to have a recent version of PowerShell, though as long as you are on a modern version of Windows it should be installed already.

## Instructions
After installing Node and cloning the repo, do the following.
<ol><h3>Linux</h3>
<li>Run <code>sudo make init</code>. NOTE: This script requires EITHER sudo permissions to install Xvfb and jq OR for those to be installed ahead of time. if you have both installed already, feel free to leave off the sudo c:<br>
Note: depending on permissions the script may also have issues compiling the TypeScript without <code>sudo</code></li>
<li>Edit <code>UserInfo.txt</code> and <code>bots.txt</code>
  <ul>
    <li>These are parsed as JSON files. Take care to format accordingly!</li>
    <li>Put your Discord email, display name and password in the appropriate fields in UserInfo.txt.</li>
    <li>The <code>real_screen</code> field in UserInfo.txt determines whether you want the program to execute with or without Chromium visible. You probably want to leave this as FALSE unless you are troubleshooting.</li>
    <li>The <code>bots_to_vote_for</code> field is a list of bot names as listed in the <code>bots.txt</code> file. If you'd like to vote for other bots than the ones included in that file, make sure to edit it and add bot ids. You can get the bot id either from within Discord or by going to their voting link and extracting the number from the URL.</li>
    <li>The <code>twocaptchaAPIKey</code> field in UserInfo.txt does what you'd probably imagine. If you have a 2Captcha account with funds you can paste your API key here for the script to use. Write anything other than a 32 character string for this field and the script will not use 2Captcha. If you don't include your API key here, in the event you <i>do</i> get a CAPTCHA challenge, the script will most likely fail to vote for the bot(s).</li>
  </ul>
</li>
<li>Run <code>./run.sh</code>. After initial setup, this is the only step you need to do.</li>
</ol>

<ol><h3>Windows</h3>
<li>Right click <code>install.ps1</code> and <code>Run with PowerShell</code>
<li>Edit <code>UserInfo.txt</code> and <code>bots.txt</code>
  <ul>
    <li>These are parsed as JSON files. Take care to format accordingly!</li>
    <li>Put your Discord email, display name and password in the appropriate fields in UserInfo.txt.</li>
    <li>The <code>real_screen</code> field in UserInfo.txt determines whether you want the program to execute with or without Chromium visible. You probably want to leave this as FALSE unless you are troubleshooting.</li>
    <li>The <code>bots_to_vote_for</code> field is a list of bot names as listed in the <code>bots.txt</code> file. If you'd like to vote for other bots than the ones included in that file, make sure to edit it and add bot ids. You can get the bot id either from within Discord or by going to their voting link and extracting the number from the URL.</li>
    <li>The <code>twocaptchaAPIKey</code> field in UserInfo.txt does what you'd probably imagine. If you have a 2Captcha account with funds you can paste your API key here for the script to use. Write anything other than a 32 character string for this field and the script will not use 2Captcha. If you don't include your API key here, in the event you <i>do</i> get a CAPTCHA challenge, the script will most likely fail to vote for the bot(s).</li>

  </ul>
</li>
<li>Right click <code>run.ps1</code> and <code>Run with PowerShell</code>. After initial setup, this is the only step you need to do.</li>
</ol>

<br>
That should be all you need to do! Due to how Puppeteer is setup, your cookies are not wiped after each use. If you want to reset this (such as to login as another user) run <code>./freshrun.sh</code> (freshrun.ps1 for Windows).<br>
If you'd like this to repeat on an interval, you are encouraged to set up a task in crontab or other applicable software. An example crontab entry is as follows:
<code>* */13 * * * /home/YOUR_USER/AND_PATH_HERE/TopGG-Bot-Voter/run.sh >/dev/null 2>&1</code>

## Notes
As far as I can tell, automation is in accordance with top.gg's privacy policy and terms of service (2022/12/05). As you must store your Discord username and password in plain text to use this, do be careful. This program doesn't steal your info, but it very well could. I've done my best to write this in a readable way, so feel free to check! If you have suggestions or contirbutions feel free to open a pull request or an issue.<br>
This project is licensed under the Creative Commons Zero v1.0 Universal license.
