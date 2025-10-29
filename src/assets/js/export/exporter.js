import { loadQuestions } from '../core/storage.js';
import { downloadBlob } from '../core/utils.js';

function el(html){ const div=document.createElement('div'); div.innerHTML=html.trim(); return div.firstElementChild; }
function closeModal(modal){ modal.parentElement.remove(); }

const PRESETS = {
  基础信息: ['question','answer','type','knowledge','difficulty'],
  完整信息: ['question','answer','type','difficulty','score','knowledge','analysis','note','tags','source','createdAt'],
  学习记录: ['question','answer','knowledge','createdAt']
};

function fieldsAll(){ return ['question','answer','type','difficulty','score','knowledge','analysis','note','tags','source','createdAt']; }

function exporterUI(){
  const overlay = el(`<div class="modal-overlay"><div class="modal">
    <header><h3>导出数据</h3><button class="btn ghost" id="close">关闭</button></header>
    <div class="body" id="body"></div>
    <footer id="footer"></footer>
  </div></div>`);
  document.body.appendChild(overlay);
  const modal = overlay.querySelector('.modal');
  const body = overlay.querySelector('#body');
  const footer = overlay.querySelector('#footer');

  const allFields = fieldsAll();
  let selected = new Set(allFields);
  let format = 'xlsx';
  let filters = { knowledge:'', difficulty:'', type:'', tags:'', batch:'', from:'', to:'' };

  const questions = loadQuestions();
  const distinct = (key)=> Array.from(new Set((questions||[]).map(q=>String(q[key]||'').trim()).filter(Boolean)));

  const render = ()=>{
    body.innerHTML = `
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <label>导出格式：
          <select id="fmt" class="input">
            <option value="xlsx">Excel(.xlsx)</option>
            <option value="csv">CSV</option>
          </select>
        </label>
        <label>快速选择：
          <select id="preset" class="input">
            <option value="">自定义</option>
            ${Object.keys(PRESETS).map(k=>`<option>${k}</option>`).join('')}
          </select>
        </label>
      </div>
      <hr class="soft"/>
      <div>
        <div class="small">字段选择</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px">
          ${allFields.map(f=>`<label><input type="checkbox" class="checkbox field" value="${f}" ${selected.has(f)?'checked':''}/> ${f}</label>`).join('')}
        </div>
        <div style="margin-top:8px;display:flex;gap:8px">
          <button class="btn ghost" id="all">全选</button>
          <button class="btn ghost" id="none">全不选</button>
        </div>
      </div>
      <hr class="soft"/>
      <div>
        <div class="small">数据筛选</div>
        <div style="display:grid;grid-template-columns:repeat(3,minmax(200px,1fr));gap:10px;margin-top:6px">
          <label>知识点<select id="f-knowledge" class="input"><option value=""></option>${distinct('knowledge').map(v=>`<option>${v}</option>`).join('')}</select></label>
          <label>难度<select id="f-difficulty" class="input"><option value=""></option>${distinct('difficulty').map(v=>`<option>${v}</option>`).join('')}</select></label>
          <label>题型<select id="f-type" class="input"><option value=""></option>${distinct('type').map(v=>`<option>${v}</option>`).join('')}</select></label>
          <label>标签<input id="f-tags" class="input" placeholder="包含的标签(逗号分隔)"/></label>
          <label>开始时间<input id="f-from" type="date" class="input"/></label>
          <label>结束时间<input id="f-to" type="date" class="input"/></label>
        </div>
      </div>`;
    footer.innerHTML = `<button class="btn" id="go">开始导出</button>`;

    body.querySelector('#fmt').value = format;
    body.querySelector('#fmt').onchange = e=> format = e.target.value;
    body.querySelector('#preset').onchange = e=>{
      const k = e.target.value; if (!k) return; selected = new Set(PRESETS[k]); render();
    };
    body.querySelector('#all').onclick = ()=>{ selected = new Set(allFields); render(); };
    body.querySelector('#none').onclick = ()=>{ selected = new Set(); render(); };
    body.querySelectorAll('.field').forEach(cb=>{
      cb.onchange = (e)=>{ const v = e.target.value; if (e.target.checked) selected.add(v); else selected.delete(v); };
    });
    ['knowledge','difficulty','type','tags','from','to'].forEach(k=>{
      const el = body.querySelector('#f-'+k);
      if (!el) return; el.onchange = e=> filters[k] = e.target.value;
    });
  };

  overlay.querySelector('#close').onclick = ()=> closeModal(modal);
  footer.onclick = async (e)=>{
    if (e.target && e.target.id==='go'){
      // filter and project
      let list = questions||[];
      if (filters.knowledge) list = list.filter(x=>String(x.knowledge||'')===filters.knowledge);
      if (filters.difficulty) list = list.filter(x=>String(x.difficulty||'')===filters.difficulty);
      if (filters.type) list = list.filter(x=>String(x.type||'')===filters.type);
      if (filters.tags) {
        const req = filters.tags.split(',').map(s=>s.trim()).filter(Boolean);
        list = list.filter(x=> req.every(t=> String(x.tags||'').includes(t)));
      }
      if (filters.from) list = list.filter(x=> String(x.createdAt||'') >= filters.from);
      if (filters.to) list = list.filter(x=> String(x.createdAt||'') <= filters.to + 'T23:59:59');

      const fields = Array.from(selected);
      const data = [fields, ...list.map(row=> fields.map(f=> row[f] ?? ''))];

      if (format==='xlsx'){
        const ws = window.XLSX.utils.aoa_to_sheet(data);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, '题库导出');
        const out = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        downloadBlob(new Blob([out], { type: 'application/octet-stream' }), '题库导出.xlsx');
      } else {
        const csv = data.map(r=> r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
        downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), '题库导出.csv');
      }
      closeModal(modal);
    }
  };

  render();
}

export function attachExport(){
  const btn = document.querySelector('#export-questions');
  if (btn) btn.addEventListener('click', (e)=>{ e.preventDefault(); exporterUI(); });
}
