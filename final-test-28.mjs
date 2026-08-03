import { chromium } from 'playwright';

const BASE = 'https://mendlyapp.web.app';
let pass = 0, fail = 0;
const results = [];

async function test(name, fn) {
  try { await fn(); pass++; results.push(`PASS ${name}`); }
  catch (e) { fail++; results.push(`FAIL ${name}: ${e.message?.slice(0, 120)}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }

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

async function go(route, vp) {
  if (vp) await p.setViewportSize(vp);
  await p.goto(BASE + '#' + route, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await p.waitForTimeout(1500);
}

// ═══════════════════════════════════════════════
// SECTION 1: Navigation
// ═══════════════════════════════════════════════
await test('1.1 Emergency route', async () => {
  await go('emergency', { width: 1280, height: 900 });
  const t = await p.locator('#view-emergency').first().textContent();
  assert(t?.includes('Get urgent help'), `Got: ${t?.slice(0,80)}`);
});

await test('1.1 #more redirects to #emergency', async () => {
  await go('more', { width: 1280, height: 900 });
  const hash = await p.evaluate(() => location.hash);
  assert(hash === '#emergency', `Got ${hash}`);
});

await test('1.2 Sidebar text labels', async () => {
  await go('dashboard', { width: 1280, height: 900 });
  const labels = await p.locator('.sidebar-item').allTextContents();
  assert(labels.some(l => l.includes('Dashboard')));
  assert(labels.some(l => l.includes('Nearby')));
  assert(labels.some(l => l.includes('Emergency')));
});

await test('1.2 Active sidebar aria-current', async () => {
  await go('dashboard', { width: 1280, height: 900 });
  const v = await p.locator('.sidebar-item.active').first().getAttribute('aria-current');
  assert(v === 'page');
});

await test('1.2 Mobile nav 5 items', async () => {
  await go('dashboard', { width: 375, height: 812 });
  const count = await p.locator('#mobile-nav a').count();
  assert(count === 5, `Got ${count}`);
});

// ═══════════════════════════════════════════════
// SECTION 2: Dashboard
// ═══════════════════════════════════════════════
await go('dashboard', { width: 1280, height: 900 });

await test('2.1 Welcome card', async () => {
  const t = await p.locator('.dash-welcome-card').first().textContent();
  assert(t?.includes('Test'));
});

await test('2.1 Elix inline input', async () => {
  assert(await p.locator('input[placeholder*="health question"]').count() > 0);
});

await test('2.1 Suggestion chips ≥ 4', async () => {
  assert(await p.locator('.dash-prompt-chip').count() >= 4);
});

await test('2.1 Elix card disclaimer', async () => {
  const elixCard = p.locator('.dash-stat-card').filter({ hasText: 'How can Elix help today' });
  const t = await elixCard.first().textContent();
  assert(t?.includes('Educational information'));
});

await test('2.1 Quick Actions ≥ 4', async () => {
  assert(await p.locator('.dash-quick-card').count() >= 4);
});

await test('2.2 Activity section', async () => {
  const t = await p.locator('#view-dashboard, .page').first().textContent();
  assert(t?.includes('Your Health Space') || t?.includes('health space') || t?.includes('Health Space'));
});

await test('2.3 Wellness disclaimer', async () => {
  const t = await p.locator('#view-dashboard, .page').first().textContent();
  assert(t?.includes('General wellness') || t?.includes('not personalized') || t?.includes('weather'));
});

// ═══════════════════════════════════════════════
// SECTION 3: Chat
// ═══════════════════════════════════════════════
await go('chat', { width: 1280, height: 900 });

await test('3.1 Greeting + disclaimer', async () => {
  const t = await p.locator('#chat-msgs').first().textContent();
  assert(t?.includes("Hi, I'm Elix"));
  assert(t?.includes('Educational information'));
});

await test('3.1 Chat prompts ≥ 4', async () => {
  assert(await p.locator('.chat-prompt').count() >= 4);
});

await test('3.2 New conversation button', async () => {
  assert(await p.locator('button:has-text("New conversation")').count() > 0);
});

await test('3.2 Chat sidebar on desktop', async () => {
  assert(await p.locator('.chat-sidebar').count() > 0);
});

// ═══════════════════════════════════════════════
// SECTION 4: Medicines
// ═══════════════════════════════════════════════
await go('medicines', { width: 1280, height: 900 });

await test('4.1 Medicine disclaimer', async () => {
  const t = await p.locator('#view-medicines').first().textContent();
  assert(t?.includes('educational') || t?.includes('Confirm medicine'));
});

await test('4.1 Interaction warning', async () => {
  const t = await p.locator('#view-medicines').first().textContent();
  assert(t?.includes('Do not stop') || t?.includes('Speak with a doctor'));
});

await test('4.1 Search input', async () => {
  assert(await p.locator('#med-search').count() > 0);
});

// ═══════════════════════════════════════════════
// SECTION 5: Nearby
// ═══════════════════════════════════════════════
await go('hospitals', { width: 1280, height: 900 });

await test('5.1 Emergency banner', async () => {
  const t = await p.locator('#view-hospitals').first().textContent();
  assert(t?.includes('emergency number'));
});

await test('5.1 View toggle ≥ 3', async () => {
  assert(await p.locator('.view-toggle-btn').count() >= 3);
});

await test('5.1 Filter buttons ≥ 3', async () => {
  assert(await p.locator('.nearby-filter-btn').count() >= 3);
});

// ═══════════════════════════════════════════════
// SECTION 6: Emergency
// ═══════════════════════════════════════════════
await go('emergency', { width: 1280, height: 900 });

await test('6.1 Heading', async () => {
  const t = await p.locator('#view-emergency').first().textContent();
  assert(t?.includes('Get urgent help'), `Got: ${t?.slice(0, 80)}`);
});

await test('6.1 Not emergency service', async () => {
  const t = await p.locator('#view-emergency [role="alert"]').first().textContent();
  assert(t?.includes('not an emergency service'), `Got: ${t?.slice(0, 80)}`);
});

await test('6.1 Emergency entries ≥ 6', async () => {
  assert(await p.locator('.emergency-card').count() >= 6);
});

// ═══════════════════════════════════════════════
// SECTION 7: Account
// ═══════════════════════════════════════════════
await go('account', { width: 1280, height: 900 });

await test('7.1 Privacy section', async () => {
  const t = await p.locator('#view-account').first().textContent();
  assert(t?.includes('Privacy') || t?.includes('Data'));
});

await test('7.1 Security section', async () => {
  const t = await p.locator('#view-account').first().textContent();
  assert(t?.includes('Security') || t?.includes('Password'));
});

await test('7.1 Delete button', async () => {
  assert(await p.locator('.btn-danger').count() > 0);
});

// ═══════════════════════════════════════════════
// SECTION 9: Responsive
// ═══════════════════════════════════════════════
await test('9.1 No overflow 375px', async () => {
  await p.setViewportSize({ width: 375, height: 812 });
  for (const r of ['dashboard', 'chat', 'medicines', 'hospitals', 'emergency', 'account']) {
    await p.goto(BASE + '#' + r, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await p.waitForTimeout(1000);
    assert(!(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), `Overflow on ${r}`);
  }
});

await test('9.1 No overflow 320px', async () => {
  await p.setViewportSize({ width: 320, height: 568 });
  for (const r of ['dashboard', 'chat', 'medicines', 'hospitals', 'emergency', 'account']) {
    await p.goto(BASE + '#' + r, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await p.waitForTimeout(1000);
    assert(!(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), `Overflow on ${r}`);
  }
});

// ═══════════════════════════════════════════════
// SECTION 10: Accessibility
// ═══════════════════════════════════════════════
await test('10.1 Chat aria-live', async () => {
  await go('chat', { width: 1280, height: 900 });
  assert(await p.locator('#chat-msgs[aria-live="polite"]').count() > 0);
});

await test('10.1 Focus-visible CSS', async () => {
  const found = await p.evaluate(() => {
    for (const s of document.styleSheets) {
      try { for (const r of s.cssRules) { if (r.selectorText?.includes(':focus-visible')) return true; } } catch {}
    }
    return false;
  });
  assert(found);
});

// ═══════════════════════════════════════════════
await b.close();
console.log('\n' + '='.repeat(60));
console.log(`RESULTS: ${pass} passed, ${fail} failed, ${pass + fail} total`);
console.log('='.repeat(60));
results.forEach(r => console.log(r));
console.log('='.repeat(60));
process.exit(fail > 0 ? 1 : 0);
