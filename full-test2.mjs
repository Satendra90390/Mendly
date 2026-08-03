import { chromium } from 'playwright';

const b = await chromium.launch({ headless: true });
const p = await b.newPage();

// Desktop - set auth to bypass login
await p.setViewportSize({ width: 1280, height: 900 });
await p.goto('https://mendlyapp.web.app');
await p.waitForTimeout(2000);

// Set a fake user token to access authenticated routes
await p.evaluate(() => {
  localStorage.setItem('mendly_user', JSON.stringify({ name: 'Test User', email: 'test@test.com' }));
  localStorage.setItem('mendly_token', 'test-token');
});
await p.reload();
await p.waitForTimeout(2000);

// Navigate to hospitals
await p.goto('https://mendlyapp.web.app#hospitals');
await p.waitForTimeout(2000);
await p.screenshot({ path: 'C:/home/user/mediguide/nearby-desktop.png', fullPage: false });

// Mobile
await p.setViewportSize({ width: 375, height: 812 });
await p.waitForTimeout(1000);
await p.screenshot({ path: 'C:/home/user/mediguide/nearby-mobile.png', fullPage: false });

// Dashboard desktop
await p.setViewportSize({ width: 1280, height: 900 });
await p.goto('https://mendlyapp.web.app#dashboard');
await p.waitForTimeout(2000);
await p.screenshot({ path: 'C:/home/user/mediguide/final-dt-dashboard.png', fullPage: false });

// Dashboard mobile
await p.setViewportSize({ width: 375, height: 812 });
await p.waitForTimeout(1000);
await p.screenshot({ path: 'C:/home/user/mediguide/final-mob-dashboard.png', fullPage: false });

// Emergency desktop
await p.setViewportSize({ width: 1280, height: 900 });
await p.goto('https://mendlyapp.web.app#emergency');
await p.waitForTimeout(2000);
await p.screenshot({ path: 'C:/home/user/mediguide/final-dt-emergency.png', fullPage: false });

// Emergency mobile
await p.setViewportSize({ width: 375, height: 812 });
await p.waitForTimeout(1000);
await p.screenshot({ path: 'C:/home/user/mediguide/final-mob-emergency.png', fullPage: false });

// Medicines desktop
await p.setViewportSize({ width: 1280, height: 900 });
await p.goto('https://mendlyapp.web.app#medicines');
await p.waitForTimeout(2000);
await p.screenshot({ path: 'C:/home/user/mediguide/final-dt-medicines.png', fullPage: false });

// Medicines mobile
await p.setViewportSize({ width: 375, height: 812 });
await p.waitForTimeout(1000);
await p.screenshot({ path: 'C:/home/user/mediguide/final-mob-medicines.png', fullPage: false });

// Account desktop
await p.setViewportSize({ width: 1280, height: 900 });
await p.goto('https://mendlyapp.web.app#account');
await p.waitForTimeout(2000);
await p.screenshot({ path: 'C:/home/user/mediguide/final-dt-account.png', fullPage: false });

// Account mobile
await p.setViewportSize({ width: 375, height: 812 });
await p.waitForTimeout(1000);
await p.screenshot({ path: 'C:/home/user/mediguide/final-mob-account.png', fullPage: false });

// Chat desktop
await p.setViewportSize({ width: 1280, height: 900 });
await p.goto('https://mendlyapp.web.app#chat');
await p.waitForTimeout(2000);
await p.screenshot({ path: 'C:/home/user/mediguide/final-dt-chat.png', fullPage: false });

// Chat mobile
await p.setViewportSize({ width: 375, height: 812 });
await p.waitForTimeout(1000);
await p.screenshot({ path: 'C:/home/user/mediguide/final-mob-chat.png', fullPage: false });

// 320px test
await p.setViewportSize({ width: 320, height: 568 });
await p.goto('https://mendlyapp.web.app#dashboard');
await p.waitForTimeout(2000);
await p.screenshot({ path: 'C:/home/user/mediguide/final-320-dashboard.png', fullPage: false });

// 1024px test
await p.setViewportSize({ width: 1024, height: 768 });
await p.goto('https://mendlyapp.web.app#dashboard');
await p.waitForTimeout(2000);
await p.screenshot({ path: 'C:/home/user/mediguide/final-1024-dashboard.png', fullPage: false });

await b.close();
console.log('all done');
