CHROMIUM=$(node getChromiumExecutablePath.js)

for bot in $(cat UserInfo.txt | jq -r .bots_to_vote_for[])
do
    if [ $(cat UserInfo.txt | jq -r .real_screen) = "FALSE" ]
    then
        echo Launching Chromium: $CHROMIUM with virtual frame buffer...
        xvfb-run -a -s "-ac" exec $CHROMIUM --remote-debugging-port=9222 --disable-gpu --no-sandbox &>/dev/null &
        echo Running Xvfb on server number `printenv DISPLAY`
    elif [ $(cat UserInfo.txt | jq -r .real_screen) = "TRUE" ]
    then
        echo Launching Chromium: $CHROMIUM with real display...  
        exec $CHROMIUM --remote-debugging-port=9222 --disable-gpu --no-sandbox &>/dev/null &
    else
        echo "Please use \"TRUE\" or \"FALSE\" for real_screen in UserInfo.txt"
        exit
    fi

    sleep 5

    BOTNAME=$bot
    USERNAME=$(cat UserInfo.txt | jq -r .discord_username)
    PASSWORD=$(cat UserInfo.txt | jq -r .discord_password)
    LOGOUT="FALSE"

    if [ $# -ne 0 ]
    then
        LOGOUT=$1
    fi

    node index.js \
    $USERNAME \
    $PASSWORD \
    $(curl -s http://127.0.0.1:9222/json/version | jq -r .webSocketDebuggerUrl) \
    $(cat bots.txt | jq -r .${BOTNAME,,}) \
    $LOGOUT
done
