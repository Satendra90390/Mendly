import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });

// Desktop
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('https://mendlyapp.web.app', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: 'C:/home/user/mediguide/v3-desktop.png' });

// Scroll down to see more sections
await page.evaluate(() => window.scrollTo(0, 800));
await page.waitForTimeout(500);
await page.screenshot({ path: 'C:/home/user/mediguide/v3-desktop-trust.png' });

await page.evaluate(() => window.scrollTo(0, 1600));
await page.waitForTimeout(500);
await page.screenshot({ path: 'C:/home/user/mediguide/v3-desktop-features.png' });

await page.evaluate(() => window.scrollTo(0, 2400));
await page.waitForTimeout(500);
await page.screenshot({ path: 'C:/home/user/mediguide/v3-desktop-elix.png' });

await page.evaluate(() => window.scrollTo(0, 3200));
await page.waitForTimeout(500);
await page.screenshot({ path: 'C:/home/user/mediguide/v3-desktop-how.png' });

await page.evaluate(() => window.scrollTo(0, 4000));
await page.waitForTimeout(500);
await page.screenshot({ path: 'C:/home/user/mediguide/v3-desktop-safety.png' });

await page.evaluate(() => window.scrollTo(0, 4800));
await page.waitForTimeout(500);
await page.screenshot({ path: 'C:/home/user/mediguide/v3-desktop-emergency.png' });

await page.evaluate(() => window.scrollTo(0, 5400));
await page.waitForTimeout(500);
await page.screenshot({ path: 'C:/home/user/mediguide/v3-desktop-faq.png' });

await page.evaluate(() => window.scrollTo(0, 6200));
await page.waitForTimeout(500);
await page.screenshot({ path: 'C:/home/user/mediguide/v3-desktop-cta.png' });

await page.evaluate(() => document.documentElement.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(500);
await page.screenshot({ path: 'C:/home/user/mediguide/v3-desktop-footer.png' });

// Mobile
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page2 = await ctx2.newPage();
await page2.goto('https://mendlyapp.web.app', { waitUntil: 'networkidle', timeout: 15000 });
await page2.waitForTimeout(2000);
await page2.screenshot({ path: 'C:/home/user/mediguide/v3-mobile.png' });

await page2.evaluate(() => window.scrollTo(0, 700));
await page2.waitForTimeout(500);
await page2.screenshot({ path: 'C:/home/user/mediguide/v3-mobile-features.png' });

console.log('Done');
await browser.close();
