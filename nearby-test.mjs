import { chromium } from 'playwright';

const b = await chromium.launch({ headless: true });
const p = await b.newPage();
await p.setViewportSize({ width: 1280, height: 900 });
await p.goto('https://mendlyapp.web.app');
await p.waitForTimeout(3000);

// Click nearby in sidebar
const hospBtn = p.locator('.sidebar-item', { hasText: 'Nearby Care' });
if (await hospBtn.count()) {
  await hospBtn.first().click();
  await p.waitForTimeout(2000);
}
await p.screenshot({ path: 'C:/home/user/mediguide/nearby-desktop.png', fullPage: false });

// Mobile
await p.setViewportSize({ width: 375, height: 812 });
await p.waitForTimeout(1000);
await p.screenshot({ path: 'C:/home/user/mediguide/nearby-mobile.png', fullPage: false });

await b.close();
console.log('done');
