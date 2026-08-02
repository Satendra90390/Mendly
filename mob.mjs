import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto('https://mendlyapp.web.app', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.evaluate(() => { openAuth('signup'); });
await page.waitForTimeout(500);
await page.fill('#auth-name', 'Test');
await page.fill('#auth-email', `m${Date.now()}@example.com`);
await page.fill('#auth-pass', 'test123456');
await page.click('#auth-submit');
await page.waitForFunction(() => document.getElementById('view-dashboard')?.classList.contains('active'), { timeout: 60000 });
await page.waitForTimeout(5000);
await page.screenshot({ path: 'C:/home/user/mediguide/m-dash.png', fullPage: false });

for (const route of ['chat', 'medicines', 'hospitals', 'more', 'account']) {
  await page.goto(`https://mendlyapp.web.app/#${route}`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `C:/home/user/mediguide/m-${route}.png`, fullPage: false });
}
console.log('All done');
await browser.close();
