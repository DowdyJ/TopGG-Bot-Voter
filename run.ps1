$UserInfoJson = Get-Content -Path .\UserInfo.txt -Raw | ConvertFrom-Json
$USERNAME = $UserInfoJson.discord_username
$PASSWORD = $UserInfoJson.discord_password
$REALSCREEN = $UserInfoJson.real_screen
$BOTSTOVOTEFOR = $UserInfoJson.bots_to_vote_for
$TWO_CAPTCHA_KEY = $UserInfoJson.twocaptchaAPIKey
$BOTNAME_TOID_CONVERSION = Get-Content -Path .\bots.txt -Raw | ConvertFrom-Json


$CHROMIUM = node getChromiumExecutablePath.js

$LOGOUT = "FALSE"

if ( $args.Length -ne 0 )
{
    $LOGOUT = $args[0]
}

$BOTSTOVOTEFOR | ForEach-Object { 
    if ( $REALSCREEN -eq "FALSE" )
    {
        $HAS_VDESK = $true
        Get-Package vdesk
        $HAS_VDESK = $?
        if ( $HAS_VDESK ) 
        {
            Write-Output "Launching Chromium: $CHROMIUM on virtual desktop 2..."
            Start-Process vdesk -ArgumentList "on:2 noswitch:true run:$CHROMIUM --remote-debugging-port=9222 --disable-gpu --no-sandbox"
        } 
        else 
        {
            Write-Output "Failed to find vdesk. If you'd like to use 'real_screen=FALSE' you must have VDESK installed and on PATH. Otherwise, switch to 'real_screen=TRUE' in UserInfo.txt."
            break
        }
        
    }
    else 
    {
        Write-Output "Launching Chromium: $CHROMIUM with real display..."
        Start-Process -FilePath $CHROMIUM -ArgumentList "--remote-debugging-port=9222 --disable-gpu --no-sandbox"
    }

    Start-Sleep -Seconds 5.0

    $WEBSOCKETJSON = Invoke-WebRequest -Uri http://127.0.0.1:9222/json/version | ConvertFrom-Json
    $WEBSOCKET = $WEBSOCKETJSON.webSocketDebuggerUrl
    $BOTID = $BOTNAME_TOID_CONVERSION.$_ 
    node index.js $USERNAME $PASSWORD $WEBSOCKET $BOTID $TWO_CAPTCHA_KEY
}

pause