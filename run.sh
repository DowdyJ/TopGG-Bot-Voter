if [ $(cat UserInfo.txt | jq -r .real_screen) = "FALSE" ]
then
    echo Launching Chromium: `which chromium` with virtual frame buffer...
    xvfb-run -a -s "-ac" exec `which chromium` --remote-debugging-port=9222 --disable-gpu --no-sandbox &>/dev/null &
    echo Running Xvfb on server number `printenv DISPLAY`
elif [ $(cat UserInfo.txt | jq -r .real_screen) = "TRUE" ]
then
    echo Launching Chromium: `which chromium` with real display...  
    exec `which chromium` --remote-debugging-port=9222 --disable-gpu --no-sandbox &>/dev/null &
else
    echo "Please use \"TRUE\" or \"FALSE\" for real_screen in UserInfo.txt"
    exit
fi

sleep 3
BOTNAME=$1
USERNAME=$(cat UserInfo.txt | jq -r .discord_username)
PASSWORD=$(cat UserInfo.txt | jq -r .discord_password)

node index.js \
$USERNAME \
$PASSWORD \
$(curl http://127.0.0.1:9222/json/version | jq -r .webSocketDebuggerUrl) \
$(cat bots.txt | jq -r .${BOTNAME,,})
