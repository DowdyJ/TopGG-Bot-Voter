exec $(node getExecutablePath.js) --remote-debugging-port=9222 --headless &
sleep 3
node index.js $1 $2 $(curl http://127.0.0.1:9222/json/version | jq -r .webSocketDebuggerUrl)
