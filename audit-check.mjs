import { readFileSync } from 'fs';
const c = readFileSync('C:/home/user/mediguide/frontend/js/app.js', 'utf8');
const css = readFileSync('C:/home/user/mediguide/frontend/css/style.css', 'utf8');

const checks = [
  ['1.1 Route #emergency', c.includes('case "emergency"')],
  ['1.1 Backward compat #more', c.includes('route === "more"')],
  ['1.2 Sidebar focus-visible', css.includes('sidebar-item:focus-visible')],
  ['2.1 Dashboard Elix input', c.includes('dash-elix-input')],
  ['2.1 Dashboard suggestion chips', c.includes('dash-prompt-chip')],
  ['2.1 Dashboard loading state', c.includes('Elix is thinking')],
  ['2.1 Dashboard error+retry', c.includes('Check your connection and try again') && c.includes('Try again')],
  ['2.2 Activity section', c.includes('Your health space is ready')],
  ['2.2 Wellness disclaimer', c.includes('not personalized medical advice')],
  ['2.3 Weather loading spinner', c.includes('Loading weather')],
  ['3.1 Chat ELIX_GREETING', c.includes('ELIX_GREETING')],
  ['3.1 Chat disclaimer on msgs', c.includes('chat-disclaimer')],
  ['3.1 Chat spec prompts', c.includes('What causes a headache')],
  ['3.2 Clear chat dialog', c.includes('Clear this conversation?')],
  ['4.1 Medicine disclaimer', c.includes('Confirm medicine decisions with a doctor')],
  ['4.1 Interaction warning', c.includes('Do not stop or change prescribed medication')],
  ['5.1 Nearby emergency msg', c.includes('experiencing a medical emergency')],
  ['6.1 Emergency heading', c.includes('Get urgent help')],
  ['6.1 Emergency not service', c.includes('Mendly is not an emergency service')],
  ['7.1 Account privacy section', c.includes('Privacy')],
  ['7.1 Account security section', c.includes('Security')],
  ['7.1 Delete confirm dialog', c.includes('Delete your account?')],
  ['7.1 Logout confirm dialog', c.includes('Log out of Mendly?')],
  ['8.1 Retry button', c.includes('Try again')],
  ['10.1 Focus visible global', css.includes(':focus-visible')],
  ['10.1 ARIA aria-current', c.includes('aria-current')],
  ['10.1 Reduced motion', css.includes('prefers-reduced-motion')],
];
checks.forEach(([name, done]) => console.log(done ? 'DONE' : 'MISSING', name));
console.log('---');
console.log(checks.filter(c => !c[1]).length, 'items still missing');
