// Local persistence and batch/template management
const LS_KEYS = {
  QUESTIONS: 'eqpp.questions',
  ERROR_QUESTIONS: 'eqpp.errorQuestions',
  BATCHES: 'eqpp.batches',
  TEMPLATES: 'eqpp.mappingTemplates'
};

export function loadQuestions() {
  try { return JSON.parse(localStorage.getItem(LS_KEYS.QUESTIONS) || '[]'); } catch { return []; }
}
export function saveQuestions(list) {
  const items = list || [];
  localStorage.setItem(LS_KEYS.QUESTIONS, JSON.stringify(items));
  try {
    window.dispatchEvent(new CustomEvent('eqpp:questions:updated', { detail: { origin: 'eqpp', count: items.length } }));
  } catch (_) {}
}

export function loadErrorQuestions() {
  try { return JSON.parse(localStorage.getItem(LS_KEYS.ERROR_QUESTIONS) || '[]'); } catch { return []; }
}
export function saveErrorQuestions(list) {
  const items = list || [];
  localStorage.setItem(LS_KEYS.ERROR_QUESTIONS, JSON.stringify(items));
  try {
    window.dispatchEvent(new CustomEvent('eqpp:errorQuestions:updated', { detail: { origin: 'eqpp', count: items.length } }));
  } catch (_) {}
}

export function loadBatches() {
  try { return JSON.parse(localStorage.getItem(LS_KEYS.BATCHES) || '[]'); } catch { return []; }
}
export function saveBatches(list) {
  localStorage.setItem(LS_KEYS.BATCHES, JSON.stringify(list || []));
}

export function getNextBatchId() {
  const ts = new Date();
  const id = 'B' + ts.toISOString().replace(/[-:.TZ]/g, '').slice(0,14);
  return id;
}

export function getTemplates() {
  try { return JSON.parse(localStorage.getItem(LS_KEYS.TEMPLATES) || '[]'); } catch { return []; }
}
export function saveTemplates(templates) {
  localStorage.setItem(LS_KEYS.TEMPLATES, JSON.stringify(templates || []));
}
export function addTemplate(tpl) {
  const list = getTemplates();
  const existsIdx = list.findIndex(x => x.name === tpl.name);
  if (existsIdx >= 0) list[existsIdx] = tpl; else list.push(tpl);
  saveTemplates(list);
}
export function deleteTemplate(name) {
  saveTemplates(getTemplates().filter(t => t.name !== name));
}
export function exportTemplates() {
  const data = JSON.stringify(getTemplates(), null, 2);
  const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'mapping_templates.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
export function importTemplatesFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      try {
        const arr = JSON.parse(reader.result);
        if (!Array.isArray(arr)) throw new Error('模板文件格式不正确');
        saveTemplates(arr);
        resolve(arr);
      } catch(e) { reject(e); }
    };
    reader.readAsText(file, 'utf-8');
  });
}

function genId() {
  return 'Q' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}

export function upsertQuestions(newItems, { mode='append', matchKey='question', batchId } = {}) {
  let items = loadQuestions();
  if (mode === 'overwrite') items = [];
  if (mode === 'update') {
    const map = new Map(items.map(x => [String(x[matchKey]||'').trim(), x]));
    newItems.forEach(n => {
      const key = String(n[matchKey]||'').trim();
      if (!key) return;
      if (map.has(key)) {
        const target = map.get(key);
        const keptId = target.id || genId();
        Object.assign(target, n, { id: keptId, updatedAt: new Date().toISOString(), batchId });
      } else {
        items.push({ ...n, id: n.id || genId(), createdAt: n.createdAt || new Date().toISOString(), batchId });
      }
    });
  } else {
    newItems.forEach(n => items.push({ ...n, id: n.id || genId(), createdAt: n.createdAt || new Date().toISOString(), batchId }));
  }
  saveQuestions(items);
  // Batch log
  const batches = loadBatches();
  const count = newItems.length;
  batches.unshift({ id: batchId, time: new Date().toISOString(), mode, count });
  saveBatches(batches.slice(0, 200));
}
