#!/usr/bin/env bash

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd $SCRIPT_DIRECTORY

LaunchChromium() 
{
    
    CHROMIUM=$(node source/getChromiumExecutablePath.js)
    # CHROMIUM=$(which chromium)
    echo Found Chrome at $(which chromium) and using it from $CHROMIUM
    REAL_SCREEN=$(cat data/config.json | jq -r .settings.real_screen)

    if [ ${REAL_SCREEN,,} = "false" ]
    then
        echo Launching Chromium: $CHROMIUM with virtual frame buffer...
        xvfb-run -a -s "-ac" exec $CHROMIUM --remote-debugging-port=9222 --disable-gpu --no-sandbox &>/dev/null &
        echo Running Xvfb on server number `printenv DISPLAY`
    elif [ ${REAL_SCREEN,,} = "true" ]
    then
        echo Launching Chromium: $CHROMIUM with real display...  
        exec $CHROMIUM --remote-debugging-port=9222 --disable-gpu --no-sandbox &>/dev/null &
    else
        echo "Please use \"true\" or \"false\" for real_screen in data/config.json"
        exit
    fi

    sleep "$(cat data/config.json | jq -r .advancedSettings.chromeLaunchPause)"
}


Vote() 
{
    CHROMIUM_PATH="$(cat data/config.json | jq -r .advancedSettings.chromiumInstallDirectory)"

    if [ "${CHROMIUM_PATH}" != "" ]
    then
        export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
        export PUPPETEER_EXECUTABLE_PATH="${CHROMIUM_PATH}"
    fi

    # Check if the script is being run on a terminal.
    REAL_TTY=true
    tty -s;
    if [ "0" != "$?" ]; then
        REAL_TTY=false;
    fi    


    # If there is more than one user, set the flag to wipe user data from Chromium
    NUMBEROFUSERS=( $(cat data/config.json | jq -rc .users[]) )
    NUMBEROFUSERS=${#NUMBEROFUSERS[@]}
    LOGOUT="FALSE"
    if [ $NUMBEROFUSERS -ne 1 ]
    then
        LOGOUT="TRUE"
    fi

    # Do the voting
    for user in $(cat data/config.json | jq -rc .users[])
    do
        USERJSON=$user
        if [ $LOGOUT = "TRUE" ]
        then
            LaunchChromium
            webSocketURLForWipe=$(curl -s http://127.0.0.1:9222/json/version | jq -r .webSocketDebuggerUrl)
            node source/wipeSessionStorage.js $webSocketURLForWipe
        fi

        for bot in $(echo $USERJSON | jq -r .bots_to_vote_for[])
        do
            BOTNAME=$bot
            USERNAME=$(echo $USERJSON | jq -r .discord_username)
            DISPLAYNAME=$(echo $USERJSON | jq -r .discord_displayname)
            PASSWORD=$(echo $USERJSON | jq -r .discord_password)
            CAPTCHA_API_KEY=$(cat data/config.json | jq -r .settings.twocaptchaAPIKey)
            BOTID=$(cat data/config.json | jq -r .bots.${BOTNAME,,})
            LaunchChromium
            WEBSOCKET=$(curl -s http://127.0.0.1:9222/json/version | jq -r .webSocketDebuggerUrl)

            node source/index.js \
            $USERNAME \
            $PASSWORD \
            $WEBSOCKET \
            $BOTID \
            $CAPTCHA_API_KEY \
            $DISPLAYNAME \
            $REAL_TTY

            echo --------------------------------------------------------------------
        done
        echo ====================================================================
    done
    
}


SHOULD_LOOP="$(cat data/config.json | jq -r .settings.autoloop)"
if [ "${SHOULD_LOOP,,}" = "false" ]
then
    Vote
elif [ "${SHOULD_LOOP,,}" = "true" ]
then
    #12 hours as seconds: 43200
    MINLOOPTIME=$(cat data/config.json | jq -r .advancedSettings.minTimeToWaitForLoop)
    MAXLOOPTIME=$(cat data/config.json | jq -r .advancedSettings.maxTimeToWaitForLoop)

    while :
    do
        Vote
        SECONDS_TO_SLEEP=$(shuf -i ${MINLOOPTIME}-${MAXLOOPTIME} -n1)
        echo "Sleeping for ${SECONDS_TO_SLEEP} seconds."
        for i in $(seq 1 $SECONDS_TO_SLEEP); do   
            echo -e "\e[1A\e[KSleeping... $(($SECONDS_TO_SLEEP - $i))"
            sleep 1
        done
        echo "Sleeping for $SECONDS_TO_SLEEP seconds..."
    done
fi
