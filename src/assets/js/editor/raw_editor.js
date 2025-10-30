// 原始编辑器：支持 JSON/TXT 粘贴、整库原始编辑（类似数据库直接改）
// 使用方法：题库管理面板工具栏新增“原始编辑”按钮，点击打开编辑器。
import { loadQuestions as loadEqppQuestions, saveQuestions as saveEqppQuestions } from '../core/storage.js';

function createOverlay(){
  const overlay = document.createElement('div');
  overlay.id = 'raw-editor-modal';
  overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
  const panel = document.createElement('div');
  panel.className = 'bg-white rounded-xl p-6 w-full max-w-3xl mx-4 card-shadow';
  panel.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-bold text-gray-900">题库原始编辑器</h3>
      <button data-testid="raw-close" class="text-gray-400 hover:text-gray-600"><i class="fa fa-times"></i></button>
    </div>
    <div class="space-y-3">
      <div class="flex items-center gap-3">
        <label class="text-sm text-gray-700">模式：</label>
        <select data-testid="raw-mode" class="border rounded px-2 py-1">
          <option value="json">JSON 粘贴</option>
          <option value="txt">TXT 粘贴（行内字段以 ||| 分隔）</option>
          <option value="full">整库原始编辑（JSON）</option>
        </select>
        <label class="text-sm text-gray-700 ml-4">保存方式：</label>
        <select data-testid="raw-save-mode" class="border rounded px-2 py-1">
          <option value="append">追加到现有题库</option>
          <option value="replace">替换现有题库</option>
        </select>
      </div>
      <div>
        <textarea data-testid="raw-input" class="w-full h-64 border rounded p-2 font-mono text-sm" placeholder="在此粘贴 JSON 数组或按 txt 格式（每行：题干|||答案|||知识点|||题型|||标签）"></textarea>
      </div>
      <div class="flex justify-end gap-3">
        <button data-testid="raw-preview" class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg transition-colors border border-gray-300">预览</button>
        <button data-testid="raw-save" class="bg-primary hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">保存到题库</button>
      </div>
      <div data-testid="raw-output" class="mt-3 text-sm text-gray-600"></div>
    </div>
  `;
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  return overlay;
}

function closeOverlay(){ const m=document.getElementById('raw-editor-modal'); if(m) m.remove(); }

function mapToEqpp(obj){
  // 兼容旧字段名与最小字段集
  const question = obj.question || obj.content || obj.title || '';
  const answer = obj.answer || obj.correctAnswer || obj.right || '';
  const type = obj.type || '选择题';
  const knowledge = obj.knowledge || obj.kp || '';
  const analysis = obj.analysis || '';
  const note = obj.note || obj.correctMethod || obj.errorReason || '';
  const tags = Array.isArray(obj.tags) ? obj.tags.join(',') : (obj.tags || (Array.isArray(obj.errorTags)? obj.errorTags.join(',') : ''));
  const source = obj.source || '';
  const createdAt = obj.createdAt || (obj.date ? (String(obj.date).includes('T')? obj.date : (obj.date + 'T00:00:00')) : new Date().toISOString());
  const id = obj.id || ('Q' + Date.now().toString(36) + Math.random().toString(36).slice(2,7));
  return { id, question, answer, type, knowledge, analysis, note, tags, source, createdAt };
}

function parseJsonInput(text){
  let data = [];
  try{
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) data = parsed;
    else if (parsed && typeof parsed === 'object') data = [parsed];
  }catch(e){ throw new Error('Invalid JSON'); }
  const mapped = data.map(mapToEqpp).filter(x=> x.question && x.answer);
  return mapped;
}

function parseTxtInput(text){
  // 每行：题干|||答案|||知识点|||题型|||标签（缺失字段自动填空）
  const lines = String(text||'').split(/\r?\n/).map(l=> l.trim()).filter(Boolean);
  const mapped = lines.map(l=>{
    const parts = l.split('|||');
    const obj = { question: parts[0]||'', answer: parts[1]||'', knowledge: parts[2]||'', type: parts[3]||'选择题', tags: parts[4]||'' };
    return mapToEqpp(obj);
  }).filter(x=> x.question && x.answer);
  return mapped;
}

function renderPreview(outEl, items){
  outEl.innerHTML = '';
  const cnt = items.length;
  const hint = document.createElement('div');
  hint.className = 'p-2 bg-blue-50 border border-blue-200 rounded';
  hint.textContent = `准备导入 ${cnt} 条题目（仅预览前 3 条）`;
  outEl.appendChild(hint);
  const pre = document.createElement('pre');
  pre.className = 'text-xs bg-gray-50 border rounded p-2 overflow-auto';
  pre.textContent = JSON.stringify(items.slice(0,3), null, 2);
  outEl.appendChild(pre);
}

function attachRawEditor(){
  const container = document.querySelector('#question-bank .p-6 .flex');
  if (!container) return;
  const btn = document.createElement('button');
  btn.className = 'bg-gray-100 hover:bg-gray-200 text-gray-800 h-10 px-4 rounded-lg transition-colors border border-gray-300';
  btn.setAttribute('aria-label', '原始编辑');
  btn.innerHTML = '<i class="fa fa-database"></i>';
  btn.addEventListener('click', (e)=>{
    e.preventDefault();
    const modal = createOverlay();
    const modeSel = modal.querySelector('[data-testid="raw-mode"]');
    const saveSel = modal.querySelector('[data-testid="raw-save-mode"]');
    const inputEl = modal.querySelector('[data-testid="raw-input"]');
    const outEl = modal.querySelector('[data-testid="raw-output"]');
    modal.querySelector('[data-testid="raw-close"]').onclick = closeOverlay;

    function getItems(){
      const mode = modeSel.value;
      const text = inputEl.value || '';
      if (mode==='json') return parseJsonInput(text);
      if (mode==='txt') return parseTxtInput(text);
      if (mode==='full'){
        // 整库原始编辑：若输入为空则预填当前题库 JSON
        if (!text.trim()){
          const curr = loadEqppQuestions() || [];
          inputEl.value = JSON.stringify(curr, null, 2);
          return [];
        }
        return parseJsonInput(text);
      }
      return [];
    }

    modal.querySelector('[data-testid="raw-preview"]').onclick = ()=>{
      try{ const items = getItems(); renderPreview(outEl, items); }
      catch(e){ outEl.textContent = String(e&&e.message||e); }
    };

    modal.querySelector('[data-testid="raw-save"]').onclick = ()=>{
      try{
        const items = getItems();
        const mode = saveSel.value; // append/replace
        const curr = loadEqppQuestions() || [];
        const next = (mode==='replace') ? items : (curr.concat(items));
        // 去重：按 id 保留最后一条
        const map = new Map();
        next.forEach(it=>{ map.set(it.id, it); });
        const final = Array.from(map.values());
        saveEqppQuestions(final);
        outEl.innerHTML = `<span class="text-green-700">已保存 ${items.length} 条（总计 ${final.length}）</span>`;
        // 自动关闭
        setTimeout(closeOverlay, 800);
      }catch(e){ outEl.textContent = String(e&&e.message||e); }
    };
  });
  container.appendChild(btn);
}

export function attachRawEditorUI(){ attachRawEditor(); }
export default attachRawEditorUI;
