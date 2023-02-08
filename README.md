<h1>TopGG Bot Voter</h1>

This will allow you to automate the voting process for Discord bots on Top.gg.<br>
With this, you can vote for any number of bots with any number of users. <br><br>
From my experience other scripts using Puppeteer often fail to submit votes. In an effort to avoid seem as much like a real user as possible (therefore succeeding at voting more frequently), this project uses GhostCursor to emulate realistic mouse movement and a more elaborate Puppeteer setup that hooks into a Chromium instance post-launch. Furthermore, to allow this script to run on headless servers and to avoid getting detected as running headless Chromium <i>but</i> still get the same convenience as running headless, this project optionally utilizes Xvfb to emulate a virtual screen for Chromium to run in.<br><br>
Both Windows and Linux are now supported. <b>However</b>, due to Windows not using the X window system, Xvfb does not work. The best alternative I could find for Windows to achieve a similar result is <a href="https://github.com/eksime/VDesk">VDesk</a>, but I've had only partial success using it. Details for installing on each platform are below.<br>

<h2 id="LinuxInstallInstructions">Linux</h2>
<h3>Prerequisites</h3>
You must have <b>Node.js</b> and <b>Make</b> installed for this to work. 
Install Node from here:
https://nodejs.org/en/download/ <br>
*Note*: Make sure you get an up-to-date installation of Node. Older versions of Node will not work!
<br>
<h3>Instructions</h3>
<ol>
<li>Change to the source/ directory and run <code>sudo make init</code>. NOTE: This script requires EITHER sudo permissions to install Xvfb and jq OR for those to be installed ahead of time. if you have both installed already, feel free to leave off the sudo c:<br>
Note: depending on permissions the script may also have issues compiling the TypeScript without <code>sudo</code></li>
<li><a href="#configjson">Edit <code>data/config.json</code></a></li>
<li>Run <code>./run.sh</code>. After initial setup, this is the only step you need to do.</li>
</ol>
<br>
<br>
<h2 id="WindowsInstallInstructions">Windows</h2>
<h3>Prerequisites</h3>
You must have <b>Node.js</b> installed for this to work. 
Install Node from here:
https://nodejs.org/en/download/ <br><br>
If you would like to run with <code>real_screen="FALSE"</code> (e.g. without seeing Chromium) you will need to install <a href="https://github.com/eksime/VDesk">VDesk</a>. If you don't mind seeing the window pop up <b>and you change <code>real_screen</code> to TRUE in data/config.json</b> then you don't need to install this.<br>
You will also need to have a recent version of PowerShell, though as long as you are on a modern version of Windows it should be installed already.
<ol>
<li>Right click <code>install.ps1</code> and <code>Run with PowerShell</code>
<li><a href="#configjson">Edit <code>data/config.json</code></a></li>
<li>Right click <code>run.ps1</code> and <code>Run with PowerShell</code>. After initial setup, this is the only step you need to do.</li>
</ol>

<h2 id="configjson">config.json</h2><br>
<p>This file contains all configuration settings for the project. You will need to edit this for the program to work! Details for each entry are as follows. As it is a JSON file, be sure to format accordingly. I <i>strongly</i> recommend you paste it into a JSON checker after you are done, such as this: https://jsonlint.com/</p>
<ul>
  <li>Settings
    <ul>
    <li>real_screen</li>
    <p>"true" if you want to see Chromium pop up and the process be done. "false" otherwise.</p>
    <li>twocaptchaAPIKey</li>
    <p>If you have a 2Captcha account with funds you can paste your API key here for the script to use. Write anything other than a 32 character string for this field and the script will not use 2Captcha. If you don't include your API key here, in the event you <i>do</i> get a CAPTCHA challenge, the script will most likely fail to vote for the bot(s).</p>
    <li>autoloop</li>
    <p>"true" if you want to have the script repeat the voting process every twelve hours*. "false" otherwise. <br>* the interval is specified in advanced settings.</p>
    </ul>
  </li>
  <li>Advanced Settings<br><p>Feel free to skip over this section unless you are having problems.</p>
    <ul>
    <li>chromiumInstallDirectory</li>
    <p>Some systems (such as non-Mac machines running ARM64 architecture) do not have builds available from the Chromium developers directly. As such, puppeteer will fail to work on these systems. To get around this you can install Chromium (or Chrome) yourself and specify the absolute path to the executable here. In most cases you should just leave this blank.</p>
    <li>chromeLaunchPause</li>
    <p>The number of seconds to wait after launching Chromium before attempting a connection to attach via websocket. If you have a slow machine, changing this to a higher value may be necessary.</p>
    <li>minTimeToWaitForLoop</li>
    <p>The minimum number of seconds to wait before voting again. Only used if "autoloop" is true.</p>
    <li>maxTimeToWaitForLoop</li>
    <p>The maximum number of seconds to wait before voting again. Only used if "autoloop" is true.</p>
    </ul>
  </li>
  <li>Bots<br><p>This is a user defined list of short hand bot names and Discord user ids for bots. If you'd like to vote for other bots than the ones included in that file, make sure to edit it and add bot ids. You can get the bot id either from within Discord or by going to their voting link and extracting the number from the URL.</p>
  </li>
  <li>Users<br><p></p>
    <ul>
    <li>discord_displayname</li>
    <p>This is what shows up when you click your Discord profile or you are @Mentioned. Don't include the numbers. This is used as a failsafe to verify which user is signed in when the browser opens.</p>
    <li>discord_username</li>
    <p>This is where you should put whatever you use to sign in to Discord. Likely, this will be an email or a phone number.</p>
    <li>discord_password</li>
    <p>Your Discord password. Be sure not to share this file with anyone later.</p>
    <li>bots_to_vote_for</li>
    <p>A list of bots you would like this account to vote for, seperated by commas. Use the names as declared in the "Bots section".</p>
    </ul>
</ul>


<br>
That should be all you need to do! Due to how Puppeteer is setup, your cookies are not wiped after each use unless you specify more than one user.<br>

<h2>Notes</h2>
As you must store your Discord username and password in plain text to use this, do be careful. This program doesn't steal your info, but it very well could. I've done my best to write this in a readable way, so feel free to check! If you have suggestions or contributions feel free to open a pull request or an issue.<br>
This project is licensed under the Creative Commons Zero v1.0 Universal license.
