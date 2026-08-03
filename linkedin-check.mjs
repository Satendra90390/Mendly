import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const results = [];

// 1. Landing page
try {
  await page.goto('https://mendlyapp.web.app', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  const hero = await page.locator('.hero').count();
  const tiles = await page.locator('.tile').count();
  const faq = await page.locator('.faq-item').count();
  results.push(`✓ Landing: hero=${hero} tiles=${tiles} faq=${faq}`);
} catch(e) { results.push(`✗ Landing: ${e.message.slice(0,80)}`); }

// 2. Guest Chat
try {
  await page.goto('https://mendlyapp.web.app/#chat', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  const banner = await page.locator('.guest-banner').count();
  const input = await page.locator('#chat-input').count();
  results.push(`✓ Guest Chat: banner=${banner} input=${input}`);
} catch(e) { results.push(`✗ Guest Chat: ${e.message.slice(0,80)}`); }

// 3. Guest Medicines
try {
  await page.goto('https://mendlyapp.web.app/#medicines', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  const banner = await page.locator('.guest-banner').count();
  const input = await page.locator('#med-search').count();
  results.push(`✓ Guest Medicines: banner=${banner} input=${input}`);
} catch(e) { results.push(`✗ Guest Medicines: ${e.message.slice(0,80)}`); }

// 4. Guest Nearby
try {
  await page.goto('https://mendlyapp.web.app/#nearby', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  const banner = await page.locator('.guest-banner').count();
  const input = await page.locator('#nearby-search').count();
  results.push(`✓ Guest Nearby: banner=${banner} input=${input}`);
} catch(e) { results.push(`✗ Guest Nearby: ${e.message.slice(0,80)}`); }

// 5. Emergency
try {
  await page.goto('https://mendlyapp.web.app/#emergency', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  const content = await page.locator('.view').textContent();
  const hasEmergency = content.includes('Emergency') || content.includes('emergency');
  results.push(`✓ Emergency page: loaded=${hasEmergency}`);
} catch(e) { results.push(`✗ Emergency: ${e.message.slice(0,80)}`); }

// 6. Signup/Login pages
try {
  await page.goto('https://mendlyapp.web.app/#signup', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  const signupForm = await page.locator('#signup-form').count();
  results.push(`✓ Signup page: form=${signupForm}`);
} catch(e) { results.push(`✗ Signup: ${e.message.slice(0,80)}`); }

try {
  await page.goto('https://mendlyapp.web.app/#login', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  const loginForm = await page.locator('#login-form').count();
  results.push(`✓ Login page: form=${loginForm}`);
} catch(e) { results.push(`✗ Login: ${e.message.slice(0,80)}`); }

// 7. Backend health
try {
  const resp = await page.goto('https://mendly-backend-0vyg.onrender.com/api/health', { timeout: 30000 });
  results.push(`✓ Backend: status=${resp.status()}`);
} catch(e) { results.push(`✗ Backend: ${e.message.slice(0,80)}`); }

// 8. Check console errors
try {
  await page.goto('https://mendlyapp.web.app', { waitUntil: 'networkidle', timeout: 15000 });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.waitForTimeout(3000);
  results.push(`✓ Console errors: ${errors.length === 0 ? 'none' : errors.join('; ').slice(0,100)}`);
} catch(e) { results.push(`✗ Console check: ${e.message.slice(0,80)}`); }

console.log('\n=== LINKEDIN READINESS CHECK ===');
results.forEach(r => console.log(r));
console.log('================================\n');

await browser.close();
