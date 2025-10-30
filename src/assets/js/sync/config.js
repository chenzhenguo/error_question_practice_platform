// 配置管理：本地持久化 gistId 与 token（不上传远端）
// 文案与错误提示使用英文；中文注释说明关键逻辑。

const LS_KEYS = {
  gistId: 'eqpp.sync.gistId',
  token: 'eqpp.sync.token',
};

export function getGistId() {
  try {
    const raw = localStorage.getItem(LS_KEYS.gistId);
    return raw ? JSON.parse(raw) : '';
  } catch (_) {
    return '';
  }
}

export function setGistId(value) {
  try {
    localStorage.setItem(LS_KEYS.gistId, JSON.stringify(value || ''));
  } catch (e) {
    console.warn('Failed to persist gistId to localStorage');
  }
}

export function getToken() {
  try {
    const raw = localStorage.getItem(LS_KEYS.token);
    return raw ? JSON.parse(raw) : '';
  } catch (_) {
    return '';
  }
}

export function setToken(value) {
  try {
    localStorage.setItem(LS_KEYS.token, JSON.stringify(value || ''));
  } catch (e) {
    console.warn('Failed to persist token to localStorage');
  }
}

export function redactToken(token) {
  // 中文注释：用于日志脱敏，仅显示前后若干字符
  if (!token || typeof token !== 'string') return '';
  if (token.length <= 8) return '***';
  return token.slice(0, 4) + '***' + token.slice(-4);
}
