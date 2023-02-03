Set-Location (Split-Path $PSCommandPath)

$CONFIG_JSON = Get-Content -Path ".\data\config.json" -Raw | ConvertFrom-Json
$ADVANCED_SETTINGS=$CONFIG_JSON.advancedSettings

cd source

Write-Output "$([char]27)[39;49;1mInstalling node package prerequisites...$([char]27)[0m"
& npm i
Write-Output "$([char]27)[39;49;1mCompiling typescript files...$([char]27)[0m"
& npx tsc
if ($ADVANCED_SETTINGS.chromiumInstallDirectory -match "")
{
    Write-Output "$([char]27)[39;49;1mInstalling chromium...$([char]27)[0m"
    & node installPuppeteerChromium.js
}
else 
{
    Write-Output "$([char]27)[39;49;1mSkipping Chromium install.$([char]27)[0m"
}

Write-Output "$([char]27)[34;1m[Setup complete]$([char]27)[0m$([char]27)[39;49m To run, edit$([char]27)[39;49;1m 'UserInfo.txt',$([char]27)[0m then right click and run$([char]27)[39;49;1m 'run.ps1'."
pause