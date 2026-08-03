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

// Desktop pages
for (const r of ['dashboard', 'chat', 'medicines', 'hospitals', 'emergency', 'account']) {
  await p.setViewportSize({ width: 1280, height: 900 });
  await p.goto(BASE + '#' + r, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `C:/home/user/mediguide/v4-dt-${r}.png`, fullPage: false });
}

// Mobile pages
for (const r of ['dashboard', 'chat', 'medicines', 'hospitals', 'emergency', 'account']) {
  await p.setViewportSize({ width: 375, height: 812 });
  await p.goto(BASE + '#' + r, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `C:/home/user/mediguide/v4-mob-${r}.png`, fullPage: false });
}

await b.close();
console.log('done');
