import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('https://mendlyapp.web.app', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
const favicon = await page.evaluate(() => {
  const link = document.querySelector('link[rel="icon"]');
  return link ? link.href.substring(0, 80) : 'none';
});
console.log('Favicon:', favicon);
await page.screenshot({ path: 'C:/home/user/mediguide/icon-check.png' });
console.log('Done');
await browser.close();
