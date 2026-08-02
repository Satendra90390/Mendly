import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });

// Desktop - all pages
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('https://mendlyapp.web.app', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.evaluate(() => { openAuth('signup'); });
await page.waitForTimeout(500);
await page.fill('#auth-name', 'Test User');
await page.fill('#auth-email', `r${Date.now()}@example.com`);
await page.fill('#auth-pass', 'test123456');
await page.click('#auth-submit');
await page.waitForFunction(() => document.getElementById('view-dashboard')?.classList.contains('active'), { timeout: 60000 });
await page.waitForTimeout(5000);
await page.screenshot({ path: 'C:/home/user/mediguide/r-dashboard.png', fullPage: false });

// Scroll dashboard to see bottom
await page.evaluate(() => document.querySelector('.dash-main')?.scrollTo(0, 9999));
await page.waitForTimeout(1000);
await page.screenshot({ path: 'C:/home/user/mediguide/r-dashboard-bottom.png', fullPage: false });

for (const route of ['chat', 'medicines', 'hospitals', 'more', 'account']) {
  await page.goto(`https://mendlyapp.web.app/#${route}`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `C:/home/user/mediguide/r-${route}.png`, fullPage: false });
}
console.log('Desktop done');

// Mobile
await ctx.close();
const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mPage = await mCtx.newPage();
await mPage.goto('https://mendlyapp.web.app', { waitUntil: 'networkidle', timeout: 30000 });
await mPage.waitForTimeout(2000);
await mPage.evaluate(() => { openAuth('signup'); });
await mPage.waitForTimeout(500);
await mPage.fill('#auth-name', 'Test User');
await mPage.fill('#auth-email', `m${Date.now()}@example.com`);
await mPage.fill('#auth-pass', 'test123456');
await mPage.click('#auth-submit');
await mPage.waitForFunction(() => document.getElementById('view-dashboard')?.classList.contains('active'), { timeout: 60000 });
await mPage.waitForTimeout(5000);
await mPage.screenshot({ path: 'C:/home/user/mediguide/r-mobile-dash.png', fullPage: false });

// Scroll mobile dashboard
await mPage.evaluate(() => window.scrollTo(0, 9999));
await mPage.waitForTimeout(1000);
await mPage.screenshot({ path: 'C:/home/user/mediguide/r-mobile-dash-bottom.png', fullPage: false });

for (const route of ['chat', 'medicines', 'hospitals', 'more']) {
  await mPage.goto(`https://mendlyapp.web.app/#${route}`, { waitUntil: 'networkidle', timeout: 15000 });
  await mPage.waitForTimeout(2000);
  await mPage.screenshot({ path: `C:/home/user/mediguide/r-mobile-${route}.png`, fullPage: false });
}
console.log('Mobile done');

await browser.close();
console.log('All done!');
