# TopGGBotVoter
This will allow you to automate the voting process for Discord bots on Top.gg using Puppeteer. Currently only Linux is supported. <br>

## Prerequisites
You must have <b>Node.js</b> and <b>Make</b> installed for this to work. 
Install Node from here:
https://nodejs.org/en/download/ <br>
*Note*: Make sure you get an up-to-date installation of Node. Older versions of Node will not work!


## Instructions
After installing Node and cloning the repo, do the following.
<ol>
<li>Run <code>make init</code></li>
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
