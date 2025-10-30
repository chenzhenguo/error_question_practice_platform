// 自动化测试：题库原始编辑器（JSON/TXT 粘贴与整库编辑）
// 使用方式：?autoRaw=1|json|txt|full
(function(){
  function log(tag, data){ try{ console.log(`[AutoRaw] ${tag}`, data||''); }catch(_){} }
  function sleep(ms){ return new Promise(r=> setTimeout(r, ms)); }
  async function waitFor(fn, {timeout=8000, interval=120}={}){ const s=Date.now(); while(Date.now()-s<timeout){ try{ const v=fn(); if(v) return v; }catch(_){} await sleep(interval);} return null; }

  function findRawBtn(){ return Array.from(document.querySelectorAll('#question-bank .p-6 .flex button')).find(b=> /原始编辑/.test(b.textContent||'')); }
  function openRaw(){ const b=findRawBtn(); if (b){ b.click(); return true; } return false; }

  function getCount(){ try{ const v = localStorage.getItem('eqpp.questions'); const arr = JSON.parse(v||'[]'); return Array.isArray(arr)? arr.length : 0; }catch(_){ return 0; } }

  function fill(mode){
    const modeSel = document.querySelector('[data-testid="raw-mode"]');
    const inputEl = document.querySelector('[data-testid="raw-input"]');
    if (!modeSel || !inputEl) return false;
    modeSel.value = mode;
    if (mode==='json'){
      inputEl.value = JSON.stringify([
        { question: 'JSON 粘贴题目 1', answer: 'A', knowledge: '定语从句', type: '选择题', tags: 'demo' },
        { question: 'JSON 粘贴题目 2', answer: 'B', knowledge: '虚拟语气', type: '选择题', tags: 'demo' }
      ], null, 2);
    } else if (mode==='txt'){
      inputEl.value = [
        'TXT 粘贴题目 1|||C|||非谓语动词|||选择题|||demo',
        'TXT 粘贴题目 2|||D|||倒装句|||选择题|||demo'
      ].join('\n');
    } else if (mode==='full'){
      inputEl.value = JSON.stringify([
        { question: '整库替换 1', answer: 'A', knowledge: '词汇', type: '选择题' },
        { question: '整库替换 2', answer: 'B', knowledge: '语法', type: '选择题' }
      ], null, 2);
    }
    return true;
  }

  async function runOnce(mode){
    log('start', {mode});
    const base = getCount();
    if (!openRaw()){ log('open:error'); return; }
    await waitFor(()=> document.getElementById('raw-editor-modal'));
    fill(mode);
    const saveSel = document.querySelector('[data-testid="raw-save-mode"]');
    const btnPreview = document.querySelector('[data-testid="raw-preview"]');
    const btnSave = document.querySelector('[data-testid="raw-save"]');
    if (btnPreview) btnPreview.click();
    await sleep(200);
    // json/txt 使用追加，full 使用替换
    if (saveSel){ saveSel.value = (mode==='full')? 'replace' : 'append'; }
    if (btnSave) btnSave.click();
    await waitFor(()=> !document.getElementById('raw-editor-modal'));
    const after = getCount();
    log('verify', {base, after, mode});
    log('done', mode);
  }

  function getMode(){ try{ const u=new URL(location.href); return (u.searchParams.get('autoRaw')||'1').toLowerCase(); }catch(_){ return '1'; } }

  function shouldRun(){
    try{
      const url = new URL(location.href);
      const ok = !!url.searchParams.get('autoRaw') || (location.hash||'').includes('autoRaw');
      if (window.AutoCoordinator && !window.AutoCoordinator.shouldRun('raw')) return false;
      return ok;
    }catch(_){ return false; }
  }
  async function run(){
    const m = getMode();
    // 进入题库面板以确保工具栏可见
    try{ const link = Array.from(document.querySelectorAll('.nav-link')).find(a=> /题库管理/.test(a.textContent||'')); if (link){ link.click(); await sleep(200); } }catch(_){}
    if (m==='1' || m==='true'){
      await runOnce('json');
      await sleep(200);
      await runOnce('txt');
      await sleep(200);
      await runOnce('full');
    } else if (['json','txt','full'].includes(m)){
      await runOnce(m);
    } else {
      log('unknown-mode', m);
    }
  }

  if (document.readyState==='loading'){
    window.addEventListener('DOMContentLoaded', ()=>{
      if (!shouldRun()) return;
      setTimeout(run, 400);
    });
  } else {
    const u=new URL(location.href); if (u.searchParams.get('autoRaw')) setTimeout(run, 600);
  }
})();
