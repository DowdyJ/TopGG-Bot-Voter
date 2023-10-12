#!/usr/bin/env bash

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd $SCRIPT_DIRECTORY

ECHO_PREFIX_1=$'\e[0m\e[38;5;236m'
ECHO_PREFIX_2="[\x20\x20SHELL\x20\x20]"
ECHO_PREFIX_3=$'\e[0m'
ECHO_PREFIX="${ECHO_PREFIX_1}${ECHO_PREFIX_2}${ECHO_PREFIX_3}"
BROWSER_LAUNCH_FLAGS="--remote-debugging-port=9222 --disable-gpu --disable-dev-shm-usage --disable-setuid-sandbox --no-first-run --no-sandbox --no-zygote --deterministic-fetch --disable-features=IsolateOrigins --user-data-dir="
# Flag Explanation
# --disable-gpu & --no-zygote & --disable-dev-shm-usage => Flags for servers
# --deterministic-fetch & --no-first-run => Helps with consistency
# --no-sandbox & --disable-setuid-sandbox => I believe this fixes issues with snap/flatpack chrome/chromium installs
# --disable-features=IsolateOrigins => Potentially unneeded. Supposed to allow for interacting with elements inside of iframes from different domains
# --remote-debugging-port=9222 => Exposes the browser on port 9222 so that we can get the websocket URL. Absolutely necessary.
# --user-data-dir= => This must be last, as we tack on more to it later. This saves cache data to a specific location. We use this to save on login count and CF checks.
#
# DO NOT USE --disable-site-isolation-trials - It will cause CF Turnstile to fail

LaunchChromium() 
{
    # Cleanup lock files left over from dirty runs
    rm -f "$1/SingletonLock"
    rm -f "$1/SingletonCookie"
    rm -f "$1/SingletonSocket"

    CHROMIUM=$(node source/getChromiumExecutablePath.js)
    # CHROMIUM=$(which chromium)
    echo -e $ECHO_PREFIX Found Chrome at $(which chromium) and using it from $CHROMIUM
    REAL_SCREEN=$(cat data/config.json | jq -r .settings.real_screen)

    if [ ${REAL_SCREEN,,} = "false" ]
    then
        echo -e $ECHO_PREFIX Launching Chromium: $CHROMIUM with virtual frame buffer...
        xvfb-run -a -s "-ac" exec $CHROMIUM ${BROWSER_LAUNCH_FLAGS}$1 &>/dev/null &
    elif [ ${REAL_SCREEN,,} = "true" ]
    then
        echo -e $ECHO_PREFIX Launching Chromium: $CHROMIUM with real display...  
        exec $CHROMIUM ${BROWSER_LAUNCH_FLAGS}$1 &>/dev/null &
    else
        echo -e $ECHO_PREFIX "Please use \"true\" or \"false\" for real_screen in data/config.json"
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
        # This wipes the log in data and cache data for the browser. We now cache this in individual folders based on user, so this is currently undesireable.
        # if [ $LOGOUT = "TRUE" ]
        # then
        #     LaunchChromium
        #     webSocketURLForWipe=$(curl -s http://127.0.0.1:9222/json/version | jq -r .webSocketDebuggerUrl)
        #     node source/wipeSessionStorage.js $webSocketURLForWipe
        # fi

        for bot in $(echo $USERJSON | jq -r .bots_to_vote_for[])
        do
            BOTNAME=$bot
            USERNAME=$(echo $USERJSON | jq -r .discord_username)
            DISPLAYNAME=$(echo $USERJSON | jq -r .discord_displayname)
            mkdir -p "data/userdata_cache/$DISPLAYNAME"
            PASSWORD=$(echo $USERJSON | jq -r .discord_password)
            CAPTCHA_API_KEY=$(cat data/config.json | jq -r .settings.twocaptchaAPIKey)
            BOTID=$(cat data/config.json | jq -r .bots.${BOTNAME,,})
            LaunchChromium data/userdata_cache/$DISPLAYNAME
            WEBSOCKET=$(curl -s http://localhost:9222/json/version | jq -r .webSocketDebuggerUrl)

            if [ -z $WEBSOCKET ] 
            then
                echo -e "$ECHO_PREFIX Failed to get websocket URL. Aborting."
                exit
            fi

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
SLEEP_COUNTDOWN="$(cat data/config.json | jq -r .advancedSettings.sleepCountDown)"

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
        echo -e $ECHO_PREFIX "Sleeping for ${SECONDS_TO_SLEEP} seconds."

        for i in $(seq 1 $SECONDS_TO_SLEEP); do   
            if [ $SLEEP_COUNTDOWN = "TRUE" ]
            then
                # This gives a nice count down, but fills up nohup logs. 
                echo -e "\e[1A\e[KSleeping... $(($SECONDS_TO_SLEEP - $i))"
            fi
            
            sleep 1
        done
    done
fi
