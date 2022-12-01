
if [ $3 = "T" ]
then
    echo Launching Chromium: `which chromium` with virtual frame buffer...
    xvfb-run -a -s "-ac" exec `which chromium` --remote-debugging-port=9222 --disable-gpu --no-sandbox &
    echo Running Xvfb on server number `printenv DISPLAY`
    #x11vnc -display `printenv DISPLAY` &
else
    echo Launching Chromium: `which chromium` with real display...  
    exec `which chromium` --remote-debugging-port=9222 --disable-gpu --no-sandbox &
fi

sleep 3
BOTNAME=$4
node index.js \
$1 \
$2 \
$(curl http://127.0.0.1:9222/json/version | jq -r .webSocketDebuggerUrl) \
$(cat bots.txt | jq -r .${BOTNAME,,})
