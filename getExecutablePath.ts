import { executablePath } from 'puppeteer';
import puppeteer from 'puppeteer'
import fs from 'fs'

function main() {
    console.log(executablePath()); // This is so this value can be consumed by the script!
} 

main();
