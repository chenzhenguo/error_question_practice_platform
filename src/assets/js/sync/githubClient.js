// GitHub Gist API 客户端（v1）
// 职责：拉取与更新单 Gist 的文件内容；处理常见错误分支（401/403/404/Rate limit）。
// 文案与错误提示使用英文；中文注释说明关键逻辑。

import { getToken, redactToken } from './config.js';

const API_BASE = 'https://api.github.com';

// 内部：统一 fetch 包装，添加认证头与 Accept
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = Object.assign({
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json',
  }, options.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // GitHub 可能以 403 表示 rate limit，需解析响应
  if (res.status === 403) {
    try {
      const body = await res.clone().json();
      const msg = (body && body.message) || '';
      if (/rate limit/i.test(msg)) {
        throw new Error('Rate limited. Please try again later.');
      }
    } catch (_) {
      // ignore parse error
    }
  }

  if (res.status === 401) throw new Error('Unauthorized. Please check your token.');
  if (res.status === 404) throw new Error('Not Found. Please check your Gist ID.');
  if (res.status === 403) throw new Error('Forbidden. Access denied.');

  return res;
}

// 拉取 Gist 文件名与内容（若文件被截断，则请求 raw_url 获取完整内容）
export async function getGistFiles(gistId) {
  if (!gistId) throw new Error('Gist ID is required.');
  let data;
  try {
    const res = await apiFetch(`/gists/${encodeURIComponent(gistId)}`);
    data = await res.json();
  } catch (e) {
    // 网络错误等
    if (e instanceof TypeError) throw new Error('Network error. Please check your connectivity.');
    throw e;
  }

  const files = data && data.files ? data.files : {};
  const out = {};
  for (const name in files) {
    const f = files[name];
    if (!f) continue;
    if (f.truncated || !('content' in f) || f.content == null) {
      // 需要到 raw_url 获取完整内容
      if (f.raw_url) {
        const rawRes = await fetch(f.raw_url);
        if (!rawRes.ok) throw new Error('Failed to fetch raw file content.');
        out[name] = await rawRes.text();
      } else {
        out[name] = '';
      }
    } else {
      out[name] = f.content;
    }
  }
  return out; // { filename: content }
}

// 更新 Gist 指定文件内容，仅传递变更项
// files 形如：{ 'answers.json': { content: '...'}, ... }
export async function updateGistFiles(gistId, files) {
  if (!gistId) throw new Error('Gist ID is required.');
  if (!files || typeof files !== 'object' || Object.keys(files).length === 0) {
    throw new Error('No files to update.');
  }
  try {
    const res = await apiFetch(`/gists/${encodeURIComponent(gistId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ files }),
    });
    const body = await res.json();
    // 试图提取 revision id（history[0].version）
    const rev = (body && body.history && body.history[0] && body.history[0].version)
      || body.updated_at
      || '';
    return { revisionId: rev };
  } catch (e) {
    if (e instanceof TypeError) throw new Error('Network error. Please check your connectivity.');
    throw e;
  }
}

// 轻量日志（不输出 token 全值）
export function debugAuthLog() {
  const token = getToken();
  console.debug('[Gist] using token:', redactToken(token));
}
