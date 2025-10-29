import { autoMapColumns, DEFAULT_FIELDS, REQUIRED_FIELDS, toRecord, listTemplates, saveTemplate, removeTemplate } from './mapping.js';
import { readFileAsTable } from './parser.js';
import { normalizeText, hashContent } from '../core/utils.js';
import { loadQuestions, upsertQuestions, getNextBatchId } from '../core/storage.js';

function el(html){ const div=document.createElement('div'); div.innerHTML=html.trim(); return div.firstElementChild; }
function closeModal(el){
  // Robustly remove the whole overlay
  const overlay = (el && typeof el.closest === 'function') ? el.closest('.modal-overlay') : (el ? el.parentElement : null);
  if (overlay && overlay.parentElement) {
    overlay.parentElement.removeChild(overlay);
  } else if (overlay && typeof overlay.remove === 'function') {
    overlay.remove();
  }
}

function buildStepIndicator(active){
  const steps=['选择文件','字段映射','预览与导入'];
  return `<div class="step-indicator">${steps.map((s,i)=>`<span class="step ${i===active?'active':''}">${i+1}. ${s}</span>`).join('')}</div>`;
}

function buildMappingTable(headers, mapping){
  const options = ['','question','answer','type','difficulty','score','knowledge','analysis','note','tags','source','createdAt'];
  return `
    <table class="table">
      <thead><tr><th>文件列名</th><th>映射为字段</th></tr></thead>
      <tbody>
        ${headers.map((h,idx)=>`<tr>
          <td>${h||'(空列)'}<div class="small text-gray-500">第${idx+1}列</div></td>
          <td>
            <select data-col="${idx}" class="input" style="min-width:220px">${options.map(f=>`<option value="${f}" ${mapping[f]===idx? 'selected':''}>${f||'不导入'}</option>`).join('')}</select>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

function detectMapping(headers){
  const suggested = autoMapColumns(headers);
  return suggested;
}

function getMappingFromDom(container){
  const selects = container.querySelectorAll('select[data-col]');
  const mapping={};
  selects.forEach(sel=>{
    const col = parseInt(sel.getAttribute('data-col'),10);
    const field = sel.value;
    if (field) mapping[field] = col;
  });
  return mapping;
}

function validateRecords(records){
  const errors=[];
  records.forEach((r,idx)=>{
    const rowErr=[];
    REQUIRED_FIELDS.forEach(f=>{ if (!normalizeText(r[f])) rowErr.push(`缺少必填字段 ${f}`); });
    if (rowErr.length) errors.push({ index: idx, errors: rowErr });
  });
  return errors;
}

function deduplicate(records, strategy, existing){
  if (strategy==='none') return { kept: records, removed: [] };
  const seen = new Set();
  const removed=[]; const kept=[];
  const existSet = new Set((existing||[]).map(x=>hashContent(x.question)));
  for (const r of records){
    const key = strategy==='byQuestion' ? hashContent(r.question) : JSON.stringify([r.question, r.type, r.knowledge]);
    const dup = seen.has(key) || (strategy==='byQuestion' && existSet.has(key));
    if (dup) removed.push(r); else { kept.push(r); seen.add(key); }
  }
  return { kept, removed };
}

function importWizard(){
  const overlay = el(`<div class="modal-overlay"><div class="modal">
    <header><h3>导入试题</h3><button class="btn ghost" id="close-modal">关闭</button></header>
    <div class="body" id="modal-body"></div>
    <footer id="modal-footer"></footer>
  </div></div>`);
  document.body.appendChild(overlay);
  const modal = overlay.querySelector('.modal');
  const body = overlay.querySelector('#modal-body');
  const footer = overlay.querySelector('#modal-footer');

  let file=null, table=null, headers=[], mapping={}, records=[], errors=[], step=0;
  let importMode='append', dedup='byQuestion';

  const render = async ()=>{
    if (step===0){
      body.innerHTML = `${buildStepIndicator(0)}
        <div style="display:grid;gap:14px;">
          <div>
            <input type="file" id="file" class="input" accept=".xlsx,.xls,.csv,.txt"/>
            <div class="small">支持 Excel(.xlsx/.xls)、CSV、TXT</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <div class="small">可拖拽文件到此处或点击选择</div>
            <button class="btn ghost" id="load-sample">加载示例数据</button>
          </div>
        </div>`;
      footer.innerHTML = `<button class="btn" id="next" disabled>下一步</button>`;
      const inp = body.querySelector('#file');
      inp.addEventListener('change', async (e)=>{
        file = e.target.files[0];
        if (!file) return;
        table = await readFileAsTable(file);
        headers = table.headers && table.headers.length ? table.headers : Array.from({length: (table.rows[0]||[]).length}, (_,i)=>`列${i+1}`);
        mapping = detectMapping(headers);
        footer.querySelector('#next').disabled = false;
      });
      const sampleBtn = body.querySelector('#load-sample');
      if (sampleBtn){
        sampleBtn.addEventListener('click', async ()=>{
          try {
            const resp = await fetch('./assets/sample/sample_questions.csv');
            const text = await resp.text();
            const blob = new Blob([text], { type:'text/csv' });
            file = new File([blob], 'sample_questions.csv', { type: 'text/csv' });
            table = await readFileAsTable(file);
            headers = table.headers && table.headers.length ? table.headers : Array.from({length: (table.rows[0]||[]).length}, (_,i)=>`列${i+1}`);
            mapping = detectMapping(headers);
            footer.querySelector('#next').disabled = false;
            step = 1;
            render();
          } catch (e) {
            alert('加载示例数据失败，请检查 sample 文件是否存在');
          }
        });
      }
      footer.querySelector('#next').onclick = ()=>{ step=1; render(); };
    } else if (step===1){
      body.innerHTML = `${buildStepIndicator(1)}
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:8px">
          <button class="btn ghost" id="auto">智能识别</button>
          <button class="btn" id="save-tpl">保存为模板</button>
          <select id="tpl" class="input"><option value="">加载模板...</option>${listTemplates().map(t=>`<option value="${t.name}">${t.name}</option>`).join('')}</select>
          <button class="btn danger" id="del-tpl">删除模板</button>
        </div>
        ${buildMappingTable(headers, mapping)}
        <hr class="soft"/>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <label>导入模式：
            <select id="mode" class="input">
              <option value="append">追加</option>
              <option value="overwrite">覆盖</option>
              <option value="update">更新(按题目)</option>
            </select>
          </label>
          <label>去重：
            <select id="dedup" class="input">
              <option value="byQuestion">按题目内容</option>
              <option value="byCombo">按题目+题型+知识点</option>
              <option value="none">不去重</option>
            </select>
          </label>
        </div>`;
      footer.innerHTML = `<button class="btn secondary" id="prev">上一步</button><button class="btn" id="next">下一步</button>`;

      body.querySelector('#auto').onclick = ()=>{ mapping = detectMapping(headers); body.querySelector('table').outerHTML = buildMappingTable(headers, mapping); };
      body.querySelector('#save-tpl').onclick = ()=>{
        const name = prompt('输入模板名称');
        if (!name) return;
        const m = getMappingFromDom(body);
        try { saveTemplate(name, m, headers, []); alert('已保存模板'); } catch(e){ alert(e.message); }
      };
      body.querySelector('#tpl').onchange = (e)=>{
        const t = listTemplates().find(x=>x.name===e.target.value);
        if (t){ mapping = t.mapping || {}; body.querySelector('table').outerHTML = buildMappingTable(headers, mapping); }
      };
      body.querySelector('#del-tpl').onclick = ()=>{
        const name = body.querySelector('#tpl').value; if(!name) return alert('请选择模板');
        if (confirm(`确定删除模板【${name}】?`)) { removeTemplate(name); body.querySelector('#tpl').selectedIndex=0; alert('已删除'); }
      };
      body.querySelector('#mode').value = importMode;
      body.querySelector('#dedup').value = dedup;
      body.querySelector('#mode').onchange = e=> importMode = e.target.value;
      body.querySelector('#dedup').onchange = e=> dedup = e.target.value;

      footer.querySelector('#prev').onclick = ()=>{ step=0; render(); };
      footer.querySelector('#next').onclick = ()=>{ mapping = getMappingFromDom(body); step=2; render(); };
    } else if (step===2){
      // build records
      const previewRows = table.rows.slice(0, 10);
      records = previewRows.map(r=>toRecord(r, headers, mapping, []));
      errors = validateRecords(records);
      const existing = loadQuestions();
      const { kept, removed } = deduplicate(records, dedup==='byCombo'?'byCombo':dedup, existing);

      body.innerHTML = `${buildStepIndicator(2)}
        <div class="small">预览前10条，红色为有问题的记录。将导入：${kept.length} 条，预览中因去重移除：${removed.length} 条。</div>
        <table class="table"><thead><tr>
          <th>#</th><th>题目</th><th>答案</th><th>题型</th><th>难度</th><th>知识点</th><th>选项</th><th>状态</th></tr></thead>
          <tbody>
            ${records.map((rec, i)=>{
              const err = errors.find(e=>e.index===i);
              const opts = Array.isArray(rec.options)? rec.options.map(o=>`${o.key}.${o.text}`).join('<br>') : '';
              return `<tr class="${err?'row-error':''}">
                <td>${i+1}</td>
                <td>${(rec.question||'').slice(0,40)}</td>
                <td>${rec.answer||''}</td>
                <td>${rec.type||''}</td>
                <td>${rec.difficulty||''}</td>
                <td>${rec.knowledge||''}</td>
                <td>${opts}</td>
                <td>${err? `<span class=\"badge danger\">${err.errors.join('；')}</span>`: '<span class=\"badge ok\">OK</span>'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>`;
      footer.innerHTML = `<button class="btn secondary" id="prev">上一步</button>
        <button class="btn success" id="import">开始导入</button>`;
      footer.querySelector('#prev').onclick = ()=>{ step=1; render(); };
      footer.querySelector('#import').onclick = async (ev)=>{
        const btn = ev && (ev.currentTarget || ev.target);
        if (btn) btn.disabled = true;
        try {
          // convert all rows, not just preview
          const all = table.rows.map(r=>toRecord(r, headers, mapping, []));
          const batchId = getNextBatchId();
          const { kept:finalKept } = deduplicate(all, dedup==='byCombo'?'byCombo':dedup, importMode==='append'? loadQuestions(): []);
          // filter out invalid
          const valid = finalKept.filter(r=>REQUIRED_FIELDS.every(f=>normalizeText(r[f])));
          upsertQuestions(valid, { mode: importMode, matchKey: 'question', batchId });
          alert(`导入完成\n批次：${batchId}\n总计：${all.length}\n有效：${valid.length}`);
          closeModal(modal);
          // optional: refresh UI counters if existing page has these ids
          try {
            const total = (loadQuestions()||[]).length;
            const totalEl = document.querySelector('#total-questions'); if (totalEl) totalEl.textContent = String(total);
          } catch{}
        } finally {
          if (btn && document.body.contains(btn)) btn.disabled = false;
        }
      };
    }
  };

  overlay.querySelector('#close-modal').onclick = ()=>closeModal(modal);
  render();
}

export function attachImport(){
  const triggerIds = ['#import-btn','#import-from-table'];
  triggerIds.forEach(id=>{
    const el = document.querySelector(id);
    if (el){ el.addEventListener('click', (e)=>{ e.preventDefault(); importWizard(); }); }
  });
}