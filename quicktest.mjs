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
await page.screenshot({ path: 'C:/home/user/mediguide/test-dash.png', fullPage: false });
console.log('Dashboard captured');
await browser.close();
