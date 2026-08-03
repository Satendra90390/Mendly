import { chromium } from 'playwright';

const b = await chromium.launch({ headless: true });
const p = await b.newPage();

// Desktop nearby
await p.setViewportSize({ width: 1280, height: 900 });
await p.goto('https://mendlyapp.web.app');
await p.waitForTimeout(3000);
const hospBtn = p.locator('.sidebar-item', { hasText: 'Nearby Care' });
if (await hospBtn.count()) {
  await hospBtn.first().click();
  await p.waitForTimeout(2000);
}
await p.screenshot({ path: 'C:/home/user/mediguide/nearby-desktop.png', fullPage: false });

// Mobile nearby
await p.setViewportSize({ width: 375, height: 812 });
await p.waitForTimeout(1000);
await p.screenshot({ path: 'C:/home/user/mediguide/nearby-mobile.png', fullPage: false });

// All desktop pages
const routes = ['Dashboard', 'Nearby Care', 'Medicines', 'Emergency', 'Account'];
for (const r of routes) {
  await p.setViewportSize({ width: 1280, height: 900 });
  const btn = p.locator('.sidebar-item', { hasText: r });
  if (await btn.count()) {
    await btn.first().click();
    await p.waitForTimeout(1500);
  }
  await p.screenshot({ path: `C:/home/user/mediguide/final-dt-${r.toLowerCase().replace(/ /g, '-')}.png`, fullPage: false });
}

// All mobile pages
const mobileRoutes = ['Dashboard', 'Nearby Care', 'Medicines', 'Emergency', 'Account'];
for (const r of mobileRoutes) {
  await p.setViewportSize({ width: 375, height: 812 });
  const btn = p.locator('.mobile-nav-item', { hasText: r });
  if (await btn.count()) {
    await btn.first().click();
    await p.waitForTimeout(1500);
  }
  await p.screenshot({ path: `C:/home/user/mediguide/final-mob-${r.toLowerCase().replace(/ /g, '-')}.png`, fullPage: false });
}

await b.close();
console.log('all done');
