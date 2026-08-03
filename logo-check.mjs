import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });

// Desktop
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('https://mendlyapp.web.app', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: 'C:/home/user/mediguide/logo-desktop.png' });

// Mobile
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page2 = await ctx2.newPage();
await page2.goto('https://mendlyapp.web.app', { waitUntil: 'networkidle', timeout: 15000 });
await page2.waitForTimeout(2000);
await page2.screenshot({ path: 'C:/home/user/mediguide/logo-mobile.png' });

console.log('Done');
await browser.close();
