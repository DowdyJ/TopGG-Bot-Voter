#!/usr/bin/env bash

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

cd $SCRIPT_DIRECTORY

LaunchChromium() 
{
    CHROMIUM=$(node getChromiumExecutablePath.js)

    if [ $(echo $USERJSON | jq -r .real_screen) = "FALSE" ]
    then
        echo Launching Chromium: $CHROMIUM with virtual frame buffer...
        xvfb-run -a -s "-ac" exec $CHROMIUM --remote-debugging-port=9222 --disable-gpu --no-sandbox &>/dev/null &
        echo Running Xvfb on server number `printenv DISPLAY`
    elif [ $(echo $USERJSON | jq -r .real_screen) = "TRUE" ]
    then
        echo Launching Chromium: $CHROMIUM with real display...  
        exec $CHROMIUM --remote-debugging-port=9222 --disable-gpu --no-sandbox &>/dev/null &
    else
        echo "Please use \"TRUE\" or \"FALSE\" for real_screen in UserInfo.txt"
        exit
    fi

    sleep 5
}

NUMBEROFUSERS=0

for user in $(cat UserInfo.txt | jq -rc .users[])
do
    NUMBEROFUSERS=$((NUMBEROFUSERS+1))
done

LOGOUT="FALSE"

if [ $NUMBEROFUSERS -ne 1 ]
then
    LOGOUT="TRUE"
fi


for user in $(cat UserInfo.txt | jq -rc .users[])
do
    USERJSON=$user
    if [ $LOGOUT = "TRUE" ]
    then
        LaunchChromium
        node wipeSessionStorage.js $(curl -s http://127.0.0.1:9222/json/version | jq -r .webSocketDebuggerUrl)
    fi

    for bot in $(echo $USERJSON | jq -r .bots_to_vote_for[])
    do
        BOTNAME=$bot
        USERNAME=$(echo $USERJSON | jq -r .discord_username)
        DISPLAYNAME=$(echo $USERJSON | jq -r .discord_displayname)
        PASSWORD=$(echo $USERJSON | jq -r .discord_password)
        CAPTCHA_API_KEY=$(echo $USERJSON | jq -r .twocaptchaAPIKey)
        
        LaunchChromium

        node index.js \
        $USERNAME \
        $PASSWORD \
        $(curl -s http://127.0.0.1:9222/json/version | jq -r .webSocketDebuggerUrl) \
        $(cat bots.txt | jq -r .${BOTNAME,,}) \
        $CAPTCHA_API_KEY \
        $DISPLAYNAME

        echo ----------------------------------
    done
    echo ==================================
done


