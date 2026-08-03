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
await p.waitForTimeout(2500);

// Desktop dashboard with FAB
await p.setViewportSize({ width: 1280, height: 900 });
await p.goto(BASE + '#dashboard', { waitUntil: 'domcontentloaded', timeout: 10000 });
await p.waitForTimeout(1500);
await p.screenshot({ path: 'C:/home/user/mediguide/v4-final-dt-dashboard.png', fullPage: false });

// Mobile dashboard with FAB
await p.setViewportSize({ width: 375, height: 812 });
await p.goto(BASE + '#dashboard', { waitUntil: 'domcontentloaded', timeout: 10000 });
await p.waitForTimeout(1500);
await p.screenshot({ path: 'C:/home/user/mediguide/v4-final-mob-dashboard.png', fullPage: false });

// Desktop medicines
await p.setViewportSize({ width: 1280, height: 900 });
await p.goto(BASE + '#medicines', { waitUntil: 'domcontentloaded', timeout: 10000 });
await p.waitForTimeout(1500);
await p.screenshot({ path: 'C:/home/user/mediguide/v4-final-dt-medicines.png', fullPage: false });

// Desktop nearby
await p.goto(BASE + '#hospitals', { waitUntil: 'domcontentloaded', timeout: 10000 });
await p.waitForTimeout(1500);
await p.screenshot({ path: 'C:/home/user/mediguide/v4-final-dt-nearby.png', fullPage: false });

// Mobile medicines
await p.setViewportSize({ width: 375, height: 812 });
await p.goto(BASE + '#medicines', { waitUntil: 'domcontentloaded', timeout: 10000 });
await p.waitForTimeout(1500);
await p.screenshot({ path: 'C:/home/user/mediguide/v4-final-mob-medicines.png', fullPage: false });

// Account scrolled down
await p.setViewportSize({ width: 1280, height: 900 });
await p.goto(BASE + '#account', { waitUntil: 'domcontentloaded', timeout: 10000 });
await p.waitForTimeout(1500);
await p.evaluate(() => window.scrollTo(0, 600));
await p.waitForTimeout(500);
await p.screenshot({ path: 'C:/home/user/mediguide/v4-final-dt-account-privacy.png', fullPage: false });

await b.close();
console.log('done');
