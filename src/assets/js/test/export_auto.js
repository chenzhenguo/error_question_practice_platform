// Auto runner for Export flow tests (TC006~TC010)
// Trigger with ?autoExport=1|filter|custom|batch|consistency
(function(){
  function log(tag, data){ try{ console.log(`[AutoExport] ${tag}`, data||''); }catch(_){} }
  function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
  async function waitFor(fn, {timeout=7000, interval=120}={}){ const s=Date.now(); while(Date.now()-s < timeout){ try{ const v=fn(); if(v) return v; }catch(_){} await sleep(interval);} return null; }

  // Observability hooks: blob download + <a download>
  (function patchDownload(){
    try{
      const orig = URL.createObjectURL;
      URL.createObjectURL = function(obj){ try{ log('blob:createObjectURL', {type: obj&&obj.type, size: obj&&obj.size}); }catch(_){} return orig.apply(this, arguments); };
    }catch(_){}
    try{
      const mo = new MutationObserver(muts=>{
        muts.forEach(m=> m.addedNodes && m.addedNodes.forEach(n=>{
          if (n && n.nodeType===1 && n.tagName==='A' && n.hasAttribute('download')){
            log('anchor:download', {href: n.getAttribute('href')||'', download: n.getAttribute('download')||''});
          }
        }));
      });
      mo.observe(document.documentElement, {childList:true, subtree:true});
    }catch(_){ }
  })();

  function qselAll(sel){ return Array.from(document.querySelectorAll(sel)); }
  function byText(root, text){
    const t = (text||'').toLowerCase();
    const el = qselAll('button,a,[role="button"],.btn, .menu-item, label, .tab, .nav-item').find(e=> (e.textContent||'').toLowerCase().includes(t));
    return el||null;
  }
  function clickEl(el, tag){ try{ el.click(); log(tag||'clicked'); return true; }catch(e){ log('click-failed', String(e)); return false; } }

  async function ensureExportUI(){
    // Open export UI via explicit button
    let btn = document.getElementById('export-questions');
    if (!btn){ btn = byText(document, '导出'); }
    if (!btn){ log('not-found:export-button'); return false; }
    clickEl(btn, 'export-ui:open');
    await sleep(400);
    return true;
  }
  function findSelectWithOptionText(text){
    const sels = qselAll('select');
    const t = (text||'').toLowerCase();
    for (const s of sels){
      const o = Array.from(s.options||[]).find(opt=> (opt.textContent||'').toLowerCase().includes(t));
      if (o) return {sel:s, opt:o};
    }
    return null;
  }
  function selectOptionByText(selectEl, text){
    if (!selectEl) return false; const opts = Array.from(selectEl.options||[]); const t=(text||'').toLowerCase();
    const o = opts.find(opt=> (opt.textContent||'').toLowerCase().includes(t)); if (!o) return false; selectEl.value = o.value; selectEl.dispatchEvent(new Event('change', {bubbles:true})); return true;
  }
  function findLabeledInput(labelText){
    const labels = qselAll('label');
    const t = (labelText||'').toLowerCase();
    for (const lb of labels){
      if ((lb.textContent||'').toLowerCase().includes(t)){
        const forId = lb.getAttribute('for');
        if (forId){ const el = document.getElementById(forId); if (el) return el; }
        const sib = lb.nextElementSibling; if (sib && (sib.tagName==='INPUT' || sib.tagName==='SELECT')) return sib;
      }
    }
    return null;
  }
  function setCheckboxByLabel(label, checked){
    const el = findLabeledInput(label) || qselAll('input[type="checkbox"]').find(cb=> (cb.closest('label')?.textContent||'').includes(label));
    if (!el) return false; el.checked = !!checked; el.dispatchEvent(new Event('change', {bubbles:true})); return true;
  }

  async function selectFormat(fmt){
    // Try dedicated format select
    const found = findSelectWithOptionText(fmt);
    if (found){ selectOptionByText(found.sel, fmt); log('format:selected', fmt); return true; }
    // Try tabs or buttons by text
    const el = byText(document, fmt); if (el){ clickEl(el, 'format:tab'); return true; }
    log('format:not-found', fmt); return false;
  }
  async function clickStartExport(){
    const el = byText(document, '开始导出') || byText(document, '导出');
    if (!el){ log('not-found:start-export'); return false; }
    clickEl(el, 'export:started'); await sleep(300); return true;
  }

  async function run_TC006(){
    log('TC006:start');
    await sleep(500);
    if (!await ensureExportUI()) return log('TC006:abort');
    await selectFormat('Excel');
    await clickStartExport();
    await sleep(500);
    log('TC006:done');
  }

  async function run_TC007(){
    log('TC007:start');
    await sleep(500);
    if (!await ensureExportUI()) return log('TC007:abort');
    // Set filters: 知识点、难度
    let kpSel = findLabeledInput('知识点') || findSelectWithOptionText('知识点')?.sel; if (kpSel){ selectOptionByText(kpSel, '定语从句'); }
    else { log('filter:knowledge:not-found'); }
    let diffSel = findLabeledInput('难度') || findSelectWithOptionText('难度')?.sel; if (diffSel){ selectOptionByText(diffSel, '中等'); }
    else { log('filter:difficulty:not-found'); }
    log('filter:set', {knowledge:'定语从句', difficulty:'中等'});
    // Preview
    const pre = byText(document, '预览'); if (pre){ clickEl(pre, 'filter:preview'); } else { log('filter:preview:not-found'); }
    await selectFormat('PDF');
    await clickStartExport();
    await sleep(500);
    log('TC007:done');
  }

  async function run_TC008(){
    log('TC008:start');
    await sleep(500);
    if (!await ensureExportUI()) return log('TC008:abort');
    const cust = byText(document, '自定义字段'); if (cust){ clickEl(cust, 'custom:mode'); } else { log('custom:mode:not-found'); }
    // Toggle checkboxes
    const fields = ['题目','答案','知识点'];
    const allBoxes = qselAll('input[type="checkbox"]');
    // first uncheck all
    allBoxes.forEach(cb=>{ cb.checked=false; cb.dispatchEvent(new Event('change', {bubbles:true})); });
    let checked = [];
    for (const f of fields){
      const cb = allBoxes.find(x=> (x.closest('label')?.textContent||'').includes(f));
      if (cb){ cb.checked=true; cb.dispatchEvent(new Event('change', {bubbles:true})); checked.push(f); } else { log('custom:field:not-found', f); }
    }
    log('custom:fields:set', checked);
    // Try adjust order via up/down buttons near labels
    let moved = false;
    try{
      const item = qselAll('*').find(n=> (n.textContent||'').includes('知识点'));
      const up = item && (item.querySelector('.move-up') || byText(item.parentElement||document, '上移'));
      if (up){ clickEl(up, 'custom:order:attempt'); moved = true; }
    }catch(_){ }
    if (!moved) log('custom:order:not-supported');
    await selectFormat('CSV');
    await clickStartExport();
    await sleep(500);
    log('TC008:done');
  }

  async function run_TC009(){
    log('TC009:start');
    await sleep(500);
    // Try open batch export
    let btn = byText(document, '批量导出') || byText(document, '批量');
    if (!btn){ if (!await ensureExportUI()) return log('TC009:abort'); }
    if (btn) clickEl(btn, 'batch:ui');
    await sleep(300);
    // Try create 5 tasks
    let created=0;
    for (let i=0;i<5;i++){
      const add = byText(document, '新增任务') || byText(document, '添加任务');
      if (!add){ log('batch:add-task:not-found'); break; }
      clickEl(add, 'batch:add'); created++;
      await sleep(150);
      // set knowledge if possible
      const select = findLabeledInput('知识点') || findSelectWithOptionText('知识点')?.sel;
      if (select){ selectOptionByText(select, ''); }
    }
    log('batch:created', created);
    await selectFormat('Word');
    await clickStartExport();
    await sleep(500);
    log('TC009:done');
  }

  async function run_TC010(){
    log('TC010:start');
    await sleep(500);
    if (!await ensureExportUI()) return log('TC010:abort');
    await selectFormat('Excel');
    await clickStartExport();
    log('consistency:exported');
    // Non-destructive: we do NOT clear DB here. Suggest manual or dedicated sandbox endpoint.
    log('consistency:import:skipped');
    log('TC010:done');
  }

  function getMode(){ try{ const u=new URL(location.href); return (u.searchParams.get('autoExport')||'1').toLowerCase(); }catch(_){ return '1'; } }
  async function run(){
    const mode = getMode();
    log('start', {mode});
    try{
      if (mode==='1' || mode==='true'){ await run_TC006(); }
      else if (mode==='filter'){ await run_TC007(); }
      else if (mode==='custom'){ await run_TC008(); }
      else if (mode==='batch'){ await run_TC009(); }
      else if (mode==='consistency'){ await run_TC010(); }
      else { log('unknown-mode', mode); }
    }catch(e){ log('ERROR', String(e&&e.message||e)); }
    log('done');
  }

  function shouldRun(){ try{ const u=new URL(location.href); return !!u.searchParams.get('autoExport'); }catch(_){ return false; } }
  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', ()=>{ if (shouldRun()) setTimeout(run, 600); });
  } else { if (shouldRun()) setTimeout(run, 600); }
})();
