// 自动化测试：错题本实时同步（Legacy <-> EQPP 双向桥接）
// 使用方式：
// 1) 访问页面加上 ?autoRealtime=1 运行全部；
//    或指定单项：?autoRealtime=legacy2eqpp / ?autoRealtime=eqpp2legacy
// 2) 控制台查看日志：[AutoRealtime] 标签
(function(){
  function log(tag, data){ try{ console.log(`[AutoRealtime] ${tag}`, data||''); }catch(_){} }
  function sleep(ms){ return new Promise(r=> setTimeout(r, ms)); }
  async function waitFor(fn, {timeout=8000, interval=120}={}){ const s=Date.now(); while(Date.now()-s<timeout){ try{ const v=fn(); if(v) return v; }catch(_){} await sleep(interval);} return null; }

  function getUIErrorCount(){ try{ const el=document.getElementById('error-book-count'); return el? Number(el.textContent)||0 : -1; }catch(_){ return -1; } }
  function getLegacyErrors(){ try{ return Array.isArray(window.errorQuestions)? window.errorQuestions : []; }catch(_){ return []; } }
  function getEqppErrors(){ try{ const v=localStorage.getItem('eqpp.errorQuestions'); const arr=JSON.parse(v||'[]'); return Array.isArray(arr)? arr: []; }catch(_){ return []; } }
  function setEqppErrors(arr){ try{ localStorage.setItem('eqpp.errorQuestions', JSON.stringify(arr||[])); window.dispatchEvent(new CustomEvent('eqpp:errorQuestions:updated', { detail: { from: 'auto' } })); return true; }catch(e){ log('eqpp:set:error', String(e&&e.message||e)); return false; } }

  async function ensureSample(){
    try{
      if (!Array.isArray(window.questions) || window.questions.length===0){
        const btn = document.getElementById('reset-and-sample');
        if (btn){ btn.click(); log('sample:trigger'); }
        await waitFor(()=> Array.isArray(window.questions) && window.questions.length>0);
        await sleep(300);
      }
      return true;
    }catch(e){ log('sample:error', String(e&&e.message||e)); return false; }
  }

  function pickNonErrorQuestion(){
    const qs = Array.isArray(window.questions)? window.questions : [];
    const errs = getLegacyErrors();
    const errSet = new Set(errs.map(q=> q && q.id));
    const found = qs.find(q=> q && !errSet.has(q.id));
    return found || qs[0] || null;
  }

  async function run_legacy2eqpp(){
    log('L2E:start');
    await ensureSample();
    // 记录基线
    const baseLegacy = getLegacyErrors().length;
    const baseEqpp = getEqppErrors().length;
    const baseUI = getUIErrorCount();
    log('L2E:baseline', {legacy: baseLegacy, eqpp: baseEqpp, ui: baseUI});

    // 选择一个不在错题本中的题目，塞入 legacy 全局数组
    const q = pickNonErrorQuestion();
    if (!q){ log('L2E:abort', 'no-question'); return; }
    try{
      if (!Array.isArray(window.errorQuestions)) window.errorQuestions = [];
      const exists = window.errorQuestions.some(x=> x && x.id===q.id);
      if (!exists) window.errorQuestions.push(q);
      // 通过旧函数保存（会写入 localStorage 并派发两个事件，包括 eqpp:errorQuestions:updated）
      if (typeof window.saveErrorQuestions === 'function'){
        window.saveErrorQuestions();
      } else {
        // 兜底：直接写 localStorage 并派发 legacy 事件
        localStorage.setItem('errorQuestions', JSON.stringify(window.errorQuestions));
        try{ window.dispatchEvent(new CustomEvent('legacy:errorQuestions:updated', { detail: {} })); }catch(_){ }
      }
    }catch(e){ log('L2E:push:error', String(e&&e.message||e)); }

    // 等待桥接完成：eqpp 列表和 UI 计数应与 legacy 同步
    const ok = await waitFor(()=>{
      const nowLegacy = getLegacyErrors().length;
      const nowEqpp = getEqppErrors().length;
      const nowUI = getUIErrorCount();
      return (nowLegacy>baseLegacy) && (nowEqpp===nowLegacy) && (nowUI===nowLegacy);
    }, {timeout: 8000, interval: 150});

    const finalLegacy = getLegacyErrors().length;
    const finalEqpp = getEqppErrors().length;
    const finalUI = getUIErrorCount();
    log('L2E:verify', {legacy: finalLegacy, eqpp: finalEqpp, ui: finalUI, ok: !!ok});
    log('L2E:done');
  }

  function mapLegacyToEqppItem(q){
    if (!q) return null;
    return {
      id: q.id || ('Q' + Date.now().toString(36) + Math.random().toString(36).slice(2,7)),
      question: q.content || q.question || '',
      answer: q.correctAnswer || q.answer || '',
      type: q.type || '选择题',
      knowledge: q.knowledge || '',
      analysis: q.analysis || '',
      note: q.correctMethod || q.errorReason || q.note || '',
      tags: Array.isArray(q.errorTags) ? q.errorTags.join(',') : (String(q.tags||'').split(/[，,、\/\s]+/).filter(Boolean).join(',')),
      source: q.source || '',
      errorCount: Number(q.errorCount || 0),
      lastErrorTime: q.lastErrorTime || new Date().toISOString(),
      createdAt: q.date ? (String(q.date).includes('T') ? q.date : (q.date + 'T00:00:00')) : (q.lastErrorTime || new Date().toISOString()),
    };
  }

  async function run_eqpp2legacy(){
    log('E2L:start');
    await ensureSample();
    const baseLegacy = getLegacyErrors().length;
    const baseEqpp = getEqppErrors().length;
    const baseUI = getUIErrorCount();
    log('E2L:baseline', {legacy: baseLegacy, eqpp: baseEqpp, ui: baseUI});

    // 取一个不在错题本的题，映射为 eqpp 错题项，写入 eqpp 存储并派发事件
    const q = pickNonErrorQuestion();
    if (!q){ log('E2L:abort', 'no-question'); return; }
    const eqppArr = getEqppErrors();
    const exists = eqppArr.some(x=> x && x.id===q.id);
    if (!exists){ eqppArr.push(mapLegacyToEqppItem(q)); }
    setEqppErrors(eqppArr);

    // 等待桥接完成：legacy 与 UI 刷新
    const ok = await waitFor(()=>{
      const nowLegacy = getLegacyErrors().length;
      const nowEqpp = getEqppErrors().length;
      const nowUI = getUIErrorCount();
      return (nowEqpp>baseEqpp) && (nowLegacy===nowEqpp) && (nowUI===nowEqpp);
    }, {timeout: 8000, interval: 150});

    const finalLegacy = getLegacyErrors().length;
    const finalEqpp = getEqppErrors().length;
    const finalUI = getUIErrorCount();
    log('E2L:verify', {legacy: finalLegacy, eqpp: finalEqpp, ui: finalUI, ok: !!ok});
    log('E2L:done');
  }

  function getMode(){ try{ const u=new URL(location.href); return (u.searchParams.get('autoRealtime')||'').toLowerCase(); }catch(_){ return ''; } }
  function shouldRun(){
    try{
      const url = new URL(location.href);
      const ok = !!url.searchParams.get('autoRealtime');
      if (window.AutoCoordinator && !window.AutoCoordinator.shouldRun('realtime')) return false;
      return ok;
    }catch(_){ return false; }
  }

  async function run(){
    if (window.AutoCoordinator && !window.AutoCoordinator.acquireLock('realtime')) return;
    try{
      const mode = getMode();
      log('start', {mode: mode||'all'});
      if (!mode || mode==='1' || mode==='true' || mode==='all'){
        await run_legacy2eqpp();
        await sleep(400);
        await run_eqpp2legacy();
      } else if (mode==='legacy2eqpp'){
        await run_legacy2eqpp();
      } else if (mode==='eqpp2legacy'){
        await run_eqpp2legacy();
      } else {
        log('unknown-mode', mode);
      }
      log('done');
    } finally {
      try{ window.AutoCoordinator.releaseLock('realtime'); }catch(_){}
    }
  }

  if (document.readyState==='loading'){
    window.addEventListener('DOMContentLoaded', ()=>{
      if (!shouldRun()) return;
      setTimeout(run, 400);
    });
  } else { if (shouldRun()) setTimeout(run, 600); }
})();
