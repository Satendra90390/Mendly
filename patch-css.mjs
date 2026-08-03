import { readFileSync, writeFileSync } from 'fs';
const filePath = 'C:/home/user/mediguide/frontend/css/style.css';
let c = readFileSync(filePath, 'utf8');

const oldChatWrap = `.chat-wrap { display: flex; flex-direction: column; height: calc(100vh - var(--header-h)); height: calc(100dvh - var(--header-h)); max-width: 800px; margin: 0 auto; }
@media (max-width: 768px) { .chat-wrap { height: calc(100vh - var(--header-h) - 60px); height: calc(100dvh - var(--header-h) - 60px); } }`;

const newChatWrap = `.chat-layout { display: flex; height: calc(100vh - var(--header-h)); height: calc(100dvh - var(--header-h)); overflow: hidden; }
.chat-sidebar { width: 260px; flex-shrink: 0; background: var(--bg-card); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
.chat-sidebar-header { padding: 12px; border-bottom: 1px solid var(--border); }
.chat-history-list { flex: 1; overflow-y: auto; padding: 8px; }
.chat-history-item { padding: 10px 12px; border-radius: var(--radius); cursor: pointer; transition: background var(--duration) var(--ease); margin-bottom: 2px; position: relative; }
.chat-history-item:hover { background: var(--color-primary-bg); }
.chat-history-item.active { background: var(--color-primary-bg); border-left: 3px solid var(--color-primary); }
.chat-history-title { font-size: 13px; font-weight: 600; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 20px; }
.chat-history-time { font-size: 11px; color: var(--muted); margin-top: 2px; }
.chat-history-delete { position: absolute; top: 10px; right: 8px; background: none; border: none; color: var(--muted); cursor: pointer; font-size: 12px; padding: 2px 6px; border-radius: var(--radius-sm); opacity: 0; transition: opacity var(--duration) var(--ease); }
.chat-history-item:hover .chat-history-delete { opacity: 1; }
.chat-history-delete:hover { color: var(--danger); background: rgba(239,68,68,0.1); }
.chat-sidebar-toggle { display: none; background: none; border: none; color: var(--fg-secondary); cursor: pointer; padding: 4px; }
.chat-file-disclaimer { display: flex; align-items: center; gap: 6px; padding: 6px 16px; font-size: 11px; color: var(--muted); font-style: italic; background: var(--bg-card); border-top: 1px solid var(--border); }
.chat-wrap { display: flex; flex-direction: column; height: 100%; max-width: 800px; margin: 0 auto; flex: 1; min-width: 0; }
@media (max-width: 768px) {
  .chat-layout { flex-direction: column; }
  .chat-sidebar { display: none; width: 100%; max-width: 300px; position: fixed; top: 0; left: 0; bottom: 0; z-index: 100; box-shadow: var(--shadow-lg); }
  .chat-sidebar.open { display: flex; }
  .chat-sidebar-toggle { display: flex; }
  .chat-wrap { max-width: 100%; height: calc(100vh - var(--header-h) - 60px); height: calc(100dvh - var(--header-h) - 60px); }
}
@media (max-width: 480px) { .chat-wrap { height: calc(100vh - var(--header-h) - 60px); height: calc(100dvh - var(--header-h) - 60px); } }`;

if (c.includes(oldChatWrap)) {
  c = c.replace(oldChatWrap, newChatWrap);
  console.log('Replaced chat-wrap CSS');
} else {
  console.log('chat-wrap CSS not found exactly');
}

writeFileSync(filePath, c, 'utf8');
console.log('CSS written');
