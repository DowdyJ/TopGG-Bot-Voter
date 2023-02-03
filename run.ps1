Set-Location (Split-Path $PSCommandPath)

function Open-Chrome($USE_REAL_SCREEN, $CHROMIUM_EXEC_PATH) {
    if ( $($USE_REAL_SCREEN.ToLower()) -eq "FALSE" )
    {
        $HAS_VDESK = $true
        Get-Package vdesk
        $HAS_VDESK = $?
        if ( $HAS_VDESK ) 
        {
            Write-Output "Launching Chromium: $CHROMIUM_EXEC_PATH on virtual desktop 2..."
            Start-Process vdesk -ArgumentList "on:2 noswitch:true run:$CHROMIUM_EXEC_PATH --remote-debugging-port=9222 --disable-gpu --no-sandbox"
        } 
        else 
        {
            Write-Output "Failed to find vdesk. If you'd like to use 'real_screen=FALSE' you must have VDESK installed and on PATH. Otherwise, switch to 'real_screen=TRUE' in data/config.json"
            break
        }
    }
    else 
    {
        Write-Output "Launching Chromium: $CHROMIUM_EXEC_PATH with real display..."
        Start-Process -FilePath $CHROMIUM_EXEC_PATH -ArgumentList "--remote-debugging-port=9222 --disable-gpu --no-sandbox"
    }

    Start-Sleep -Seconds $ADVANCED_SETTINGS.chromeLaunchPause
}

function Invoke-Vote {
    $CHROMIUM = node source/getChromiumExecutablePath.js

    $LOGOUT = "false"
    if ( $USERS.Length -ne 1 )
    {
        $LOGOUT = "true"
    }
    
    $REAL_TTY="true"
    if ($host.Name -notmatch "consolehost")
    {
        Write-Output "Not using a standard TTY"
        $REAL_TTY="false"
    }

    foreach ($USER in $USERS)
    {
        $USERNAME=$USER.discord_username
        $PASSWORD=$USER.discord_password
        $DISPLAY_NAME=$USER.discord_displayname
        
        if ($LOGOUT -match "true")
        {
            Open-Chrome $REALSCREEN $CHROMIUM
            $WEBSOCKETJSON_FORWIPE = Invoke-WebRequest -Uri http://127.0.0.1:9222/json/version | ConvertFrom-Json
            $WEBSOCKET_FORWIPE = $WEBSOCKETJSON_FORWIPE.webSocketDebuggerUrl
            node source/wipeSessionStorage.js $WEBSOCKET_FORWIPE
        }
    
        $BOTS_TO_VOTE_FOR = $USER.bots_to_vote_for
        foreach ($BOT in $BOTS_TO_VOTE_FOR)
        {
            Open-Chrome $REALSCREEN $CHROMIUM
    
            $BOTID = $BOTNAME_TOID_CONVERSION.$BOT
            $WEBSOCKETJSON = Invoke-WebRequest -Uri http://127.0.0.1:9222/json/version | ConvertFrom-Json
            $WEBSOCKET = $WEBSOCKETJSON.webSocketDebuggerUrl
    
            node source/index.js $USERNAME $PASSWORD $WEBSOCKET $BOTID $TWO_CAPTCHA_KEY $DISPLAY_NAME $REAL_TTY
            Write-Output "--------------------------------------------------------------------"
        }
    
        Write-Output "===================================================================="
    }
    
}


$CONFIG_JSON = Get-Content -Path ".\data\config.json" -Raw | ConvertFrom-Json
$USERS=$CONFIG_JSON.users
$SETTINGS=$CONFIG_JSON.settings
$ADVANCED_SETTINGS=$CONFIG_JSON.advancedSettings
$BOTNAME_TOID_CONVERSION=$CONFIG_JSON.bots

$TWO_CAPTCHA_KEY = $SETTINGS.twocaptchaAPIKey
$REALSCREEN = $SETTINGS.real_screen
$AUTOLOOP = $SETTINGS.autoloop


if ($ADVANCED_SETTINGS.chromiumInstallDirectory -ne "")
{
    $env:PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = true
    $env:PUPPETEER_EXECUTABLE_PATH = $ADVANCED_SETTINGS.chromiumInstallDirectory
}

if ($AUTOLOOP -match "true")
{
    while ($true) {
        Invoke-Vote
        $MIN_SLEEP_TIME
        $MAX_SLEEP_TIME
        $SLEEP_SECONDS = Get-Random -Minimum $MIN_SLEEP_TIME -Maximum $MAX_SLEEP_TIME
        for ($i=0; $i -lt $SLEEP_SECONDS; $i++)
        {
            $REMAINING_TIME = $SLEEP_SECONDS - $i
            Write-Output "$([char]27)[1A$([char]27)[KSleeping... $REMAINING_TIME"
            Start-Sleep -Seconds 1 
        }
    }
} 
else 
{
    Invoke-Vote
}

PAUSE
