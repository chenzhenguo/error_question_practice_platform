// Auto runner for Practice Filter tests across modes (Requirement: unified filters per mode)
// Trigger with ?autoFilter=all|normal|random|error|simulation|chapter|knowledge|memorize
(function(){
  function log(tag, data){ try{ console.log(`[AutoFilter] ${tag}`, data||''); }catch(_){} }
  function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
  async function waitFor(fn, {timeout=8000, interval=120}={}){ const s=Date.now(); while(Date.now()-s<timeout){ try{ const v=fn(); if(v) return v; }catch(_){} await sleep(interval);} return null; }

  function setTableFilter({knowledge='', type='', tag=''}){
    try{
      const k=document.getElementById('filter-knowledge');
      const t=document.getElementById('filter-type');
      const g=document.getElementById('filter-error-tag');
      if (k && knowledge){ k.value = knowledge; k.dispatchEvent(new Event('change', {bubbles:true})); }
      if (t && type){ t.value = type; t.dispatchEvent(new Event('change', {bubbles:true})); }
      if (g && tag){ g.value = tag; g.dispatchEvent(new Event('change', {bubbles:true})); }
      const rows = Array.from(document.querySelectorAll('#question-table-body tr'));
      const visible = rows.filter(r=> !r.classList.contains('hidden')).length;
      log('table:filter:applied', {knowledge,type,tag,visible});
      return visible;
    }catch(e){ log('table:filter:error', String(e)); return -1; }
  }

  async function pickKnowledgeMulti(max=2){
    try{
      if (typeof window.openKnowledgeFilterModal !== 'function') { log('knowledge:modal:not-found'); return false; }
      window.openKnowledgeFilterModal();
      log('knowledge:modal:open');
      await waitFor(()=> document.getElementById('k-multi'));
      // switch to multi
      const radios = Array.from(document.querySelectorAll('input[name="k-mode"]'));
      const multi = radios.find(r=> r.value==='multi'); if (multi){ multi.click(); }
      await sleep(100);
      const list = document.querySelectorAll('#knowledge-checkbox-list input[type="checkbox"]');
      let n=0; list.forEach(cb=>{ if (n<max){ cb.checked=true; n++; }});
      const confirm = document.getElementById('k-confirm');
      if (confirm){ confirm.click(); log('knowledge:confirm', {selected: (window.selectedKnowledgeFilter||[])}); }
      await sleep(200);
      return true;
    }catch(e){ log('knowledge:pick:error', String(e)); return false; }
  }

  async function runMode(mode){
    log('mode:start', mode);
    try{
      if (mode==='knowledge'){
        const ok = await pickKnowledgeMulti(1);
        if (!ok){ log('mode:abort', mode); return; }
      }
      if (typeof window.startPractice === 'function'){
        window.startPractice(mode);
      } else { log('startPractice:not-found'); return; }
      await sleep(400);
      const cnt = Array.isArray(window.currentPracticeQuestions)? window.currentPracticeQuestions.length : 0;
      const idx = window.currentQuestionIndex||0;
      const selK = Array.isArray(window.selectedKnowledgeFilter)? window.selectedKnowledgeFilter.slice() : [];
      log('mode:started', {mode, count: cnt, index: idx, selectedKnowledge: selK});
      // simple sanity: answer once then stop
      const btnNext = document.getElementById('next-question'); if (btnNext){ btnNext.click(); }
      await sleep(100);
      log('mode:done', mode);
    }catch(e){ log('ERROR', {mode, error: String(e&&e.message||e)}); }
  }

  async function runAll(){
    const modes=['knowledge','normal','random','error','simulation','chapter','memorize'];
    for (const m of modes){ await runMode(m); await sleep(200); }
  }

  function getParam(){ try{ const u=new URL(location.href); return (u.searchParams.get('autoFilter')||'').toLowerCase(); }catch(_){ return ''; } }
  function shouldRun(){ return !!getParam(); }

  async function run(){
    const p = getParam();
    log('start', {mode:p||'all'});
    if (!p || p==='all'){ await runAll(); }
    else { await runMode(p); }
    // Also demo table filters from requirement baseline
    setTableFilter({knowledge:'', type:'', tag:''});
    log('done');
  }

  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', ()=>{ if (shouldRun()) setTimeout(run, 600); });
  } else { if (shouldRun()) setTimeout(run, 600); }
})();
