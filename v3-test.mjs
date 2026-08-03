import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('https://mendlyapp.web.app', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// Test FAQ accordion
await page.evaluate(() => window.scrollTo(0, 5000));
await page.waitForTimeout(500);
const faqBtn = page.locator('.faq-question').first();
await faqBtn.click();
await page.waitForTimeout(500);
await page.screenshot({ path: 'C:/home/user/mediguide/v3-faq-open.png' });

// Test mobile hamburger
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page2 = await ctx2.newPage();
await page2.goto('https://mendlyapp.web.app', { waitUntil: 'networkidle', timeout: 15000 });
await page2.waitForTimeout(2000);
const hamb = page2.locator('.hamb-btn');
await hamb.click();
await page2.waitForTimeout(500);
await page2.screenshot({ path: 'C:/home/user/mediguide/v3-mobile-menu.png' });

// Check console errors
const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
await page.goto('https://mendlyapp.web.app', { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(3000);
console.log('Console errors:', errors.length === 0 ? 'none' : errors.join('\n'));

console.log('Done');
await browser.close();
