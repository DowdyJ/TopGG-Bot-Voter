REAL_SCREEN=$(cat UserInfo.txt | jq -rc .users[0].real_screen)

LaunchChromium() 
{
    CHROMIUM=$(node getChromiumExecutablePath.js)

    if [ $REAL_SCREEN = "FALSE" ]
    then
        echo Launching Chromium: $CHROMIUM with virtual frame buffer...
        xvfb-run -a -s "-ac" exec $CHROMIUM --remote-debugging-port=9222 --disable-gpu --no-sandbox &>/dev/null &
        echo Running Xvfb on server number `printenv DISPLAY`
    elif [ $REAL_SCREEN = "TRUE" ]
    then
        echo Launching Chromium: $CHROMIUM with real display...  
        exec $CHROMIUM --remote-debugging-port=9222 --disable-gpu --no-sandbox &>/dev/null &
    else
        echo "Please use \"TRUE\" or \"FALSE\" for real_screen in UserInfo.txt"
        exit
    fi

    sleep 5
}

LaunchChromium
node wipeSessionStorage.js $(curl -s http://127.0.0.1:9222/json/version | jq -r .webSocketDebuggerUrl)