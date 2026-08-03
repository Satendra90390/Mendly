import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('file:///C:/home/user/mediguide/frontend/index.html');
await page.waitForTimeout(1000);
await page.evaluate(() => {
  localStorage.setItem('mendly_token', 'test-token-123');
  localStorage.setItem('mendly_user', JSON.stringify({ id: 1, name: 'John Doe', email: 'john@example.com', created_at: '2025-01-15T10:30:00Z' }));
  localStorage.setItem('mendly_theme', 'light');
});
await page.reload();
await page.waitForTimeout(2000);

const pages = ['dashboard', 'chat', 'medicines', 'hospitals', 'emergency', 'account'];
for (const p of pages) {
  await page.evaluate((h) => { window.location.hash = h; }, p);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `C:/home/user/mediguide/final-dt-${p}.png`, fullPage: false });
  console.log(`Desktop ${p} captured`);
}

// Mobile
await page.setViewportSize({ width: 375, height: 812 });
await page.waitForTimeout(500);
for (const p of pages) {
  await page.evaluate((h) => { window.location.hash = h; }, p);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `C:/home/user/mediguide/final-mob-${p}.png`, fullPage: false });
  console.log(`Mobile ${p} captured`);
}

// Check no horizontal overflow on mobile
for (const p of pages) {
  await page.evaluate((h) => { window.location.hash = h; }, p);
  await page.waitForTimeout(1000);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  console.log(`Mobile ${p} overflow: ${overflow}`);
}

// Check console errors
const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
await page.evaluate(() => { window.location.hash = 'dashboard'; });
await page.waitForTimeout(2000);
console.log('Console errors:', errors.length ? errors.join('; ') : 'None');

await browser.close();
