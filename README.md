<h1>TopGG Bot Voter</h1>

This will allow you to automate the voting process for Discord bots on Top.gg.<br>
With this, you can vote for any number of bots with any number of users. <br><br>
From my experience other scripts using Puppeteer often fail to submit votes. In an effort to avoid seem as much like a real user as possible (therefore succeeding at voting more frequently), this project uses GhostCursor to emulate realistic mouse movement and a more elaborate Puppeteer setup that hooks into a Chromium instance post-launch. Furthermore, to allow this script to run on headless servers and to avoid getting detected as running headless Chromium <i>but</i> still get the same convenience as running headless, this project optionally utilizes Xvfb to emulate a virtual screen for Chromium to run in.<br><br>
Linux is supported both natively and through Docker. For MacOS and Windows, you must use <a href="https://docs.docker.com/desktop/" target="_blank">Docker</a>. Details for running the system on each platform are below.

<h2 id="LinuxInstallInstructions">Linux (Native)</h2>
This section details how to run the solution natively. If you would like to use the Docker version, the steps <a href="#WindowsInstallInstructions">here</a> will work for Linux systems as well.
<h3>Prerequisites</h3>
You must have <b>Node.js</b> and <b>Make</b> installed for this to work. 
Install Node from here:
https://nodejs.org/en/download/ <br>
*Note*: Make sure you get an up-to-date installation of Node (18.0 or above). Older versions of Node will not work!
<br>
<h3>Instructions</h3>
<ol>
  <li>Download the repository.</li>
  <li>Install the <code>jq</code> and <code>xvfb</code> packages on your system.</li>
  <li>Change to the source/ directory and run <code>make init</code>.</li>
  <li><a href="#configjson">Edit <code>data/config.json</code></a></li>
  <li>Run <code>./run.sh</code>. After initial setup, this is the only step you need to do.</li>
</ol>
<br>
<br>
<h2 id="WindowsInstallInstructions">Windows / Intel MacOS (Docker)</h2>
For all x86_64 operating systems, the following steps will work. If you are using an Arm processor (e.g. MacOS with Apple silicon chip), you need to use the instructions <a href="#armInstallInstructions">here</a>

<h3>Prerequisites</h3>
You must have <a href="https://docs.docker.com/desktop/" target="_blank">Docker</a> installed.
After installing Docker, do the following:

<ol>
  <li>Download the repository.</li>
  <li>Open the Docker desktop app. You can close it as soon as it finishes loading. This starts the background process (daemon) that's needed for the application.</li>
  <li><a href="#configjson">Edit <code>data/config.json</code></a></li>
  <li>Double click on <code>run_container.bat</code>. For MacOS, copy the command from the file and run it in your terminal.</li>
</ol>

<h2 id="armInstallInstructions">Arm64 (Docker)</h2>
The instructions in prior sections work only for amd64 (x86_64) architectures. For users using arm64, you must use the method below.

<h3>Prerequisites</h3>
You must have <a href="https://docs.docker.com/desktop/" target="_blank">Docker</a> installed.
After installing Docker, do the following:

<ol>
  <li>Download the repository.</li>
  <li>Open the Docker desktop app (Windows/Mac only). You can close it as soon as it finishes loading. This starts the background process (daemon) that's needed for the application.</li>
  <li><a href="#configjson">Edit <code>data/config.json</code></a>. *NOTE*: <b>You will need to set the "chromiumInstallDirectory" to "/usr/bin/chromium".</b></li>
  <li>From a terminal in the root of the repository, run the command <code>docker build -t botvoter-backend -f Dockerfile.arm64 .</code></li>
  <li>To run the solution, use the command:<br> <code>docker run --cap-add=SYS_ADMIN --rm -v ./data/:/app/bot_voter/data/ -it botvoter-backend</code><br>This is the only step you need to launch it in the future.</li>
</ol>

<h2 id="configjson">Editing config.json</h2><br>
<p>This file contains all configuration settings for the project. You will need to edit this for the program to work! Details for each entry are as follows. As it is a JSON file, be sure to format accordingly. I <i>strongly</i> recommend you paste it into a JSON checker after you are done, such as this: https://jsonlint.com/</p>
<ul>
  <li>Settings
    <ul>
    <li>real_screen</li>
    <p>"TRUE" if you want to see Chromium pop up and the process be done. "FALSE" otherwise. If you are using Docker, leave this as "FALSE".</p>
    <li>twocaptchaAPIKey</li>
    <p>If you have a 2Captcha account with funds you can paste your API key here for the script to use. Write anything other than a 32 character string for this field and the script will not use 2Captcha. If you don't include your API key here, in the very likely event you <i>do</i> get a CAPTCHA challenge, the script will most likely fail to vote for the bot(s).</p>
    <li>autoloop</li>
    <p>"TRUE" if you want to have the script repeat the voting process every twelve hours*. "FALSE" otherwise. <br>* the interval is specified in advanced settings.</p>
    </ul>
  </li>
  <li>Advanced Settings<br><p>Feel free to skip over this section unless you are having problems.</p>
    <ul>
    <li>chromiumInstallDirectory</li>
    <p>This option only affects running natively. Some systems (such as non-Mac machines running ARM64 architecture) do not have builds available for Chrome/Chromium from Puppeteer. As such, puppeteer will fail to work on these systems. To get around this you can install Chromium (or Chrome) yourself and specify the absolute path to the executable here. In most cases you should just leave this blank.</p>
    <li>chromeLaunchPause</li>
    <p>The number of seconds to wait after launching Chromium before attempting a connection to attach via websocket. If you have a slow machine, changing this to a higher value may be necessary.</p>
    <li>sleepCountDown</li>
    <p>When autoloop is set to "TRUE", the script will count down, displaying how much time is left until it starts the voting process again. This is convenient most of the time. However, for users seeking to run the process on a server or use nohup, this can create giant log files. Set to "FALSE" to disable this countdown.</p>
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
    <p>Discord recently changed how usernames worked when they moved away from the discriminators. As such, this is your <b>real, unique username</b>, not nicknames or anything else . This is used as a failsafe to verify which user is signed in when the browser opens.</p>
    <li>discord_username</li>
    <p>This is where you should put whatever you use to sign in to Discord. Likely, this will be an email or a phone number.</p>
    <li>discord_password</li>
    <p>Your Discord password. Be sure not to share this file with anyone later.</p>
    <li>bots_to_vote_for</li>
    <p>A list of bots you would like this account to vote for, seperated by commas. Use the names as declared in the "Bots section".</p>
    </ul>
</ul>


<br>
That should be all you need to do! To reduce the occurance of CAPTCHA puzzles and other headaches, userdata is cached in data/. This is largely beneficial. However, if for whatever reason this is causing trouble, you can safely delete these folders and it will act like a fresh install for each user.<br>

<h2>Notes</h2>
As you must store your Discord username and password in plain text to use this, do be careful. This program doesn't steal your info, but it very well could. I've done my best to write this in a readable way, so feel free to check! If you have suggestions or contributions feel free to open a pull request or an issue.<br>

<h2>License</h2>
This project is licensed under the Creative Commons Zero v1.0 Universal license.
