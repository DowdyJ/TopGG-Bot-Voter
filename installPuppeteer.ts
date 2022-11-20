import puppeteer from 'puppeteer'
import { executablePath } from 'puppeteer';
import fs from 'fs';

async function main()
{
    if (!fs.existsSync(executablePath()))
    {
        console.log("Downloading chromium for puppeteer...");
        await puppeteer.launch();
        console.log("Download finished.");
        return;
    }
}

async () =>
{
    await main();
}
