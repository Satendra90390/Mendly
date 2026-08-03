import { readFileSync, writeFileSync } from 'fs';

const filePath = 'C:/home/user/mediguide/frontend/js/app.js';
let c = readFileSync(filePath, 'utf8');

// 1. Replace getChatGreeting with ELIX_GREETING constant
const oldGreeting = `function getChatGreeting() {
  const name = state.user?.name?.split(" ")[0];
  const hour = new Date().getHours();
  let timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const namePart = name ? \\\`, \\\${escapeHtml(name)}\\\` : "";
  return \\\`\\\${timeGreeting}\\\${namePart}! I'm Elix, your personal health companion. Ask me anything about symptoms, medicines, or wellness — I'm here to help.\\\`;
}
let chatMsgs = [{ role: "bot", content: getChatGreeting() }];`;

// Try a simpler approach - just find and replace line by line
const lines = c.split('\n');
let startIdx = -1;
let endIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function getChatGreeting()')) startIdx = i;
  if (startIdx >= 0 && lines[i].includes('let chatMsgs = [{ role: "bot", content: getChatGreeting() }];')) {
    endIdx = i;
    break;
  }
}

if (startIdx >= 0 && endIdx >= 0) {
  const newLines = [
    'const ELIX_GREETING = "Hi, I\'m Elix.\\n\\nI can help explain health topics, medicines, medical terms, and possible next steps. I cannot diagnose conditions or replace a healthcare professional.\\n\\nWhat would you like to know?";',
    'let chatMsgs = [{ role: "bot", content: ELIX_GREETING }];'
  ];
  lines.splice(startIdx, endIdx - startIdx + 1, ...newLines);
  c = lines.join('\n');
  console.log(`Replaced getChatGreeting at lines ${startIdx}-${endIdx}`);
} else {
  console.log('Could not find getChatGreeting block', startIdx, endIdx);
}

// 2. Replace all remaining getChatGreeting() calls in resetChat
c = c.replace(/getChatGreeting\(\)/g, 'ELIX_GREETING');
console.log('Replaced getChatGreeting() calls');

// 3. Improve clearChatHistory confirmation
const oldClear = `async function clearChatHistory() {
  if (!confirm("Clear all messages in this chat? This cannot be undone.")) return;`;
const newClear = `async function clearChatHistory() {
  showConfirmDialog("Clear this conversation?", "This action will remove the current conversation from your chat history.", "Clear conversation", async () => {`;
if (c.includes(oldClear)) {
  c = c.replace(oldClear, newClear);
  // Find the closing of clearChatHistory and add the closing bracket for showConfirmDialog
  const clearIdx = c.indexOf('showConfirmDialog("Clear this conversation?"');
  if (clearIdx >= 0) {
    // Find "resetChat();\n  renderChat();\n}" after the showConfirmDialog
    const resetIdx = c.indexOf('resetChat();\n  renderChat();\n}', clearIdx);
    if (resetIdx >= 0) {
      const closeBrace = resetIdx + 'resetChat();\n  renderChat();\n}'.length;
      c = c.substring(0, closeBrace) + '\n  );\n}' + c.substring(closeBrace + 1);
    }
  }
  console.log('Updated clearChatHistory');
}

writeFileSync(filePath, c, 'utf8');
console.log('File written successfully');
