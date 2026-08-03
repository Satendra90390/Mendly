import { chromium } from 'playwright';
const BASE = 'https://mendlyapp.web.app';
const b = await chromium.launch({ headless: true });
const p = await b.newPage();
await p.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
await p.waitForTimeout(1500);
await p.evaluate(({e, n}) => {
  localStorage.setItem('mendly_user', JSON.stringify({ name: n, email: e }));
  localStorage.setItem('mendly_token', 'test-token');
}, {e: 'test@test.com', n: 'Test User'});
await p.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
await p.waitForTimeout(2000);

// Desktop dashboard - check FAB
await p.setViewportSize({ width: 1280, height: 900 });
await p.goto(BASE + '#dashboard', { waitUntil: 'domcontentloaded', timeout: 10000 });
await p.waitForTimeout(1500);
await p.screenshot({ path: 'C:/home/user/mediguide/v4-fab-desktop.png', fullPage: false });

// Mobile dashboard - check FAB
await p.setViewportSize({ width: 375, height: 812 });
await p.goto(BASE + '#dashboard', { waitUntil: 'domcontentloaded', timeout: 10000 });
await p.waitForTimeout(1500);
await p.screenshot({ path: 'C:/home/user/mediguide/v4-fab-mobile.png', fullPage: false });

// Check FAB is hidden on emergency page
await p.setViewportSize({ width: 1280, height: 900 });
await p.goto(BASE + '#emergency', { waitUntil: 'domcontentloaded', timeout: 10000 });
await p.waitForTimeout(1500);
await p.screenshot({ path: 'C:/home/user/mediguide/v4-fab-emergency.png', fullPage: false });

await b.close();
console.log('done');
