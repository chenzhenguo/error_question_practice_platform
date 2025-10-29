import { loadQuestions, saveQuestions } from '../core/storage.js';

function el(html){ const d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstElementChild; }
function closeModal(modal){ modal.parentElement.remove(); }

function bulkUI(){
  const overlay = el(`<div class="modal-overlay"><div class="modal">
    <header><h3>批量操作</h3><button class="btn ghost" id="close">关闭</button></header>
    <div class="body" id="body"></div>
    <footer id="footer"></footer>
  </div></div>`);
  document.body.appendChild(overlay);
  const modal = overlay.querySelector('.modal');
  const body = overlay.querySelector('#body');
  const footer = overlay.querySelector('#footer');

  const questions = loadQuestions();
  const distinct = (key)=> Array.from(new Set(questions.map(q=>String(q[key]||'').trim()).filter(Boolean)));

  let action='edit';
  let payload={ difficulty:'', knowledge:'', addTag:'', removeTag:'' };
  let filters={ knowledge:'', difficulty:'', type:'' };

  const render = ()=>{
    body.innerHTML = `
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <label>操作：
          <select id="act" class="input">
            <option value="edit">批量修改属性</option>
            <option value="tag">批量标签</option>
            <option value="delete">批量删除</option>
          </select>
        </label>
      </div>
      <hr class="soft"/>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(220px,1fr));gap:10px">
        <label>按知识点<select id="f-knowledge" class="input"><option value=""></option>${distinct('knowledge').map(v=>`<option>${v}</option>`).join('')}</select></label>
        <label>按难度<select id="f-difficulty" class="input"><option value=""></option>${distinct('difficulty').map(v=>`<option>${v}</option>`).join('')}</select></label>
        <label>按题型<select id="f-type" class="input"><option value=""></option>${distinct('type').map(v=>`<option>${v}</option>`).join('')}</select></label>
      </div>
      <hr class="soft"/>
      <div id="panel"></div>`;

    const panel = body.querySelector('#panel');
    if (action==='edit'){
      panel.innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,minmax(220px,1fr));gap:10px">
        <label>设置难度<input id="p-difficulty" class="input" placeholder="如：易/中/难"/></label>
        <label>设置知识点<input id="p-knowledge" class="input" placeholder="如：定语从句"/></label>
        <label>添加备注<input id="p-note" class="input" placeholder="统一备注(可选)"/></label>
      </div>`;
    } else if (action==='tag'){
      panel.innerHTML = `<div style="display:grid;grid-template-columns:repeat(2,minmax(260px,1fr));gap:10px">
        <label>添加标签<input id="p-addTag" class="input" placeholder="支持多个用逗号分隔"/></label>
        <label>移除标签<input id="p-removeTag" class="input" placeholder="支持多个用逗号分隔"/></label>
      </div>`;
    } else if (action==='delete'){
      panel.innerHTML = `<div class="small">将会删除符合筛选条件的题目，删除后无法恢复。</div>`;
    }

    footer.innerHTML = `<button class="btn danger" id="apply">执行</button>`;

    body.querySelector('#act').value = action;
    body.querySelector('#act').onchange = e=>{ action = e.target.value; render(); };
    ['knowledge','difficulty','type'].forEach(k=>{
      const el = body.querySelector('#f-'+k); if(!el) return; el.onchange = e=> filters[k] = e.target.value;
    });
  };

  overlay.querySelector('#close').onclick = ()=> closeModal(modal);
  footer.onclick = ()=>{
    if (event.target && event.target.id==='apply'){
      let list = questions;
      if (filters.knowledge) list = list.filter(x=>x.knowledge===filters.knowledge);
      if (filters.difficulty) list = list.filter(x=>x.difficulty===filters.difficulty);
      if (filters.type) list = list.filter(x=>x.type===filters.type);

      if (action==='delete'){
        if (!confirm(`确认删除 ${list.length} 条记录？`)) return;
        const ids = new Set(list.map((x,i)=> i)); // fallback by index; in real app should use id
        const remain = questions.filter(q=> !ids.has(questions.indexOf(q)));
        saveQuestions(remain);
      } else if (action==='edit'){
        const d = document.querySelector('#p-difficulty')?.value.trim();
        const k = document.querySelector('#p-knowledge')?.value.trim();
        const n = document.querySelector('#p-note')?.value.trim();
        questions.forEach(q=>{
          if (list.includes(q)){
            if (d) q.difficulty = d; if (k) q.knowledge = k; if (n) q.note = (q.note? q.note+'\n': '') + n;
          }
        });
        saveQuestions(questions);
      } else if (action==='tag'){
        const add = (document.querySelector('#p-addTag')?.value||'').split(',').map(s=>s.trim()).filter(Boolean);
        const rem = (document.querySelector('#p-removeTag')?.value||'').split(',').map(s=>s.trim()).filter(Boolean);
        questions.forEach(q=>{
          if (list.includes(q)){
            const cur = new Set(String(q.tags||'').split(',').map(s=>s.trim()).filter(Boolean));
            add.forEach(t=>cur.add(t)); rem.forEach(t=>cur.delete(t));
            q.tags = Array.from(cur).join(',');
          }
        });
        saveQuestions(questions);
      }
      alert('批量操作完成');
      closeModal(modal);
    }
  };

  render();
}

export function attachBulk(){
  // inject a button in 题库管理工具栏（如果存在）
  const container = document.querySelector('#question-bank .p-6 .flex');
  if (container){
    const btn = document.createElement('button');
    btn.className = 'bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors';
    btn.innerHTML = '<i class="fa fa-tasks mr-2"></i>批量操作';
    btn.style.marginLeft = '8px';
    btn.addEventListener('click', (e)=>{ e.preventDefault(); bulkUI(); });
    container.appendChild(btn);
  }
}
