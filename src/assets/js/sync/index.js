// 同步面板入口脚本（v1 骨架）
// 说明：仅负责面板初始化与基本交互绑定；后续服务在独立模块中实现。
// 文案与错误提示使用英文；中文注释说明关键逻辑。

// 本地持久化键约定（与设计文档一致）
const LS_KEYS = {
  selection: 'eqpp.sync.selection',
  gistId: 'eqpp.sync.gistId',
  token: 'eqpp.sync.token',
};

// 默认选择：answers + settings（需求 3.4）
const DEFAULT_SELECTION = ['answers', 'settings'];

// 实用函数：安全读取/写入 localStorage JSON
function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // 忽略写入错误（配额等），后续操作会给出英文提示
    console.warn('Failed to persist localStorage JSON');
  }
}

// 初始化选择状态（默认/记忆）
function initSelection() {
  // 读取上次选择；无则使用默认
  const last = readJson(LS_KEYS.selection, null);
  const sel = Array.isArray(last) && last.length > 0 ? last : DEFAULT_SELECTION;
  // 勾选复选框
  const ids = {
    answers: document.getElementById('ds-answers'),
    error_queue: document.getElementById('ds-error-queue'),
    settings: document.getElementById('ds-settings'),
    progress: document.getElementById('ds-progress'),
  };
  Object.entries(ids).forEach(([name, el]) => {
    if (el) el.checked = sel.includes(name);
  });
}

// 读取当前选择（空选择视为错误）
function getCurrentSelection() {
  const ids = {
    answers: document.getElementById('ds-answers'),
    error_queue: document.getElementById('ds-error-queue'),
    settings: document.getElementById('ds-settings'),
    progress: document.getElementById('ds-progress'),
  };
  const sel = Object.entries(ids)
    .filter(([, el]) => el && el.checked)
    .map(([name]) => name);
  return sel;
}

// 记忆选择（需求 3.5）
function persistSelection() {
  const sel = getCurrentSelection();
  writeJson(LS_KEYS.selection, sel);
}

// 初始化 Gist ID 与 token 输入框（仅读取/保存本地，不执行网络）
function initConfigInputs() {
  const gistIdInput = document.getElementById('gist-id-input');
  const tokenInput = document.getElementById('token-input');
  const gistId = readJson(LS_KEYS.gistId, '');
  const token = readJson(LS_KEYS.token, '');
  if (gistIdInput) gistIdInput.value = typeof gistId === 'string' ? gistId : '';
  if (tokenInput) tokenInput.value = typeof token === 'string' ? token : '';
  gistIdInput?.addEventListener('change', () => {
    writeJson(LS_KEYS.gistId, gistIdInput.value || '');
  });
  tokenInput?.addEventListener('change', () => {
    writeJson(LS_KEYS.token, tokenInput.value || '');
  });
}

// 面板开合逻辑
function bindPanelToggles() {
  const openBtn = document.getElementById('open-sync-panel');
  const closeBtn = document.getElementById('close-sync-panel');
  const panel = document.getElementById('sync-panel');
  if (!openBtn || !closeBtn || !panel) return;
  openBtn.addEventListener('click', () => {
    panel.classList.remove('hidden');
  });
  closeBtn.addEventListener('click', () => {
    panel.classList.add('hidden');
  });
}

// Push/Pull 按钮绑定（仅骨架，后续调用 SyncService）
function bindActions() {
  const btnPull = document.getElementById('btn-pull');
  const btnPush = document.getElementById('btn-push');
  const summary = document.getElementById('sync-summary');
  const setSummary = (text) => { if (summary) summary.textContent = text; };

  const ensureSelection = () => {
    const sel = getCurrentSelection();
    if (sel.length === 0) {
      setSummary('Selection is empty. Please choose datasets.');
      return null;
    }
    return sel;
  };

  // 选择变化即记忆
  const checkboxes = ['ds-answers','ds-error-queue','ds-settings','ds-progress']
    .map(id => document.getElementById(id))
    .filter(Boolean);
  checkboxes.forEach(el => el.addEventListener('change', persistSelection));

  btnPull?.addEventListener('click', () => {
    const sel = ensureSelection();
    if (!sel) return;
    // 英文摘要（骨架态）
    setSummary(`Pull requested for: ${sel.join(', ')}`);
    // TODO: 调用 SyncService.pullSelected(sel)
  });
  btnPush?.addEventListener('click', () => {
    const sel = ensureSelection();
    if (!sel) return;
    setSummary(`Push requested for: ${sel.join(', ')}`);
    // TODO: 调用 SyncService.pushSelected(sel)
  });
}

export function initSyncPanel() {
  // 初始化配置与选择、面板开合与动作绑定
  initConfigInputs();
  initSelection();
  bindPanelToggles();
  bindActions();
}

// 确保在 DOMContentLoaded 后执行初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSyncPanel);
} else {
  initSyncPanel();
}
