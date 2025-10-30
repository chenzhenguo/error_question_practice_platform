// Auto runner for practice settings test cases (TC031~TC035)
// Usage:
// - Open with ?autoPractice=1&debug=1 to auto-run
// - Or set window.__AUTO_PRACTICE__=true and reload
(function(){
  function log(tag, data){
    try { console.log(`[AutoPractice] ${tag}`, data || ''); } catch(_) {}
  }
  function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
  async function waitFor(fn, {timeout=8000, interval=100}={}){
    const start=Date.now();
    while(Date.now()-start < timeout){
      try { const v = fn(); if(v) return v; } catch(_){}
      await sleep(interval);
    }
    return null;
  }
  function setCheckbox(id, val){
    const el = document.getElementById(id);
    if (!el) return false;
    el.checked = !!val;
    el.dispatchEvent(new Event('change', {bubbles:true}));
    return true;
  }
  function getCurrentQuestion(){
    const arr = window.currentPracticeQuestions || [];
    const idx = window.currentQuestionIndex || 0;
    return arr[idx];
  }
  async function ensurePracticeStarted(mode='normal'){
    try {
      if (!Array.isArray(window.currentPracticeQuestions) || !window.currentPracticeQuestions.length){
        if (typeof window.startPractice === 'function') {
          window.startPractice(mode);
          log('startPractice', {mode});
        }
        await waitFor(()=> Array.isArray(window.currentPracticeQuestions) && window.currentPracticeQuestions.length);
      }
    } catch(e){}
  }
  function getOptionItems(){ return Array.from(document.querySelectorAll('.option-item')); }
  function getOptionRadios(){ return Array.from(document.querySelectorAll('.option-radio')); }
  function getOptionOrder(){ return getOptionItems().map(el => (el.querySelector('.option-text')?.textContent||'').trim()); }
  async function selectOptionByValue(letter){
    const radios = getOptionRadios();
    const target = radios.find(r => r.value === letter);
    if (!target) return false;
    const wrapper = target.closest('.option-item');
    if (wrapper){ wrapper.click(); return true; }
    try { target.click(); return true; } catch(_){}
    return false;
  }
  async function selectCorrect(){
    const q = getCurrentQuestion();
    if (!q) return false;
    return await selectOptionByValue(q.correctAnswer);
  }
  async function gotoIndex(i){
    if (typeof window.loadQuestion === 'function'){ window.loadQuestion(i); await sleep(200); return true; }
    return false;
  }
  async function clickNext(){
    const btn = document.getElementById('next-question');
    if (btn){ btn.click(); await sleep(200); return true; }
    if (typeof window.nextQuestion === 'function'){ window.nextQuestion(); await sleep(200); return true; }
    return false;
  }

  async function run_TC031(){
    log('TC031:start');
    await ensurePracticeStarted('normal');
    // Step1: enable autoNext
    setCheckbox('setting-auto-next', true);
    // Ensure memorize off for this case
    setCheckbox('setting-memorize', false);
    const startIdx = window.currentQuestionIndex||0;
    await selectCorrect();
    await sleep(700); // wait for auto jump (0.5s + buffer)
    const idxAfter = window.currentQuestionIndex||0;
    log('TC031:afterAutoNext', {startIdx, idxAfter});
    // Step2: disable autoNext and answer next correct
    setCheckbox('setting-auto-next', false);
    await selectCorrect();
    await sleep(600);
    const idxAfter2 = window.currentQuestionIndex||0;
    log('TC031:afterManualRemain', {idxAfter2});
    log('TC031:done');
  }

  async function run_TC034(){
    log('TC034:start');
    await ensurePracticeStarted('normal');
    // enable autoNext
    setCheckbox('setting-auto-next', true);
    setCheckbox('setting-memorize', false);
    const before = window.currentQuestionIndex||0;
    await selectCorrect();
    // Quickly click Next to simulate race
    await clickNext();
    await sleep(700);
    const after = window.currentQuestionIndex||0;
    const advancedBy = (after - before);
    log('TC034:advanceCheck', {before, after, advancedBy});
    log('TC034:done');
  }

  async function run_TC032(){
    log('TC032:start');
    await ensurePracticeStarted('normal');
    // Turn on memorize mode via settings
    setCheckbox('setting-memorize', true);
    await sleep(300);
    // pick an option (should not immediately show answer)
    const q = getCurrentQuestion();
    const wrongLetter = (['A','B','C','D'].find(x=> x!==q.correctAnswer)) || 'A';
    await selectOptionByValue(wrongLetter);
    await sleep(200);
    // Now click show-answer button
    const showBtn = document.getElementById('show-answer');
    if (showBtn){ showBtn.click(); }
    await sleep(300);
    // Turn off memorize
    setCheckbox('setting-memorize', false);
    await sleep(200);
    // Select any option again, should immediately show
    await selectOptionByValue(q.correctAnswer);
    await sleep(300);
    log('TC032:done');
  }

  async function run_TC033(){
    log('TC033:start');
    await ensurePracticeStarted('normal');
    // Close shuffle
    setCheckbox('setting-shuffle', false);
    await sleep(200);
    const idx = window.currentQuestionIndex||0;
    const order1 = getOptionOrder();
    await clickNext();
    await gotoIndex(idx);
    const order2 = getOptionOrder();
    // Enable shuffle
    setCheckbox('setting-shuffle', true);
    await gotoIndex(idx);
    const order3 = getOptionOrder();
    log('TC033:orderCompare', {order1, order2, order3});
    log('TC033:done');
  }

  async function run_TC035(){
    log('TC035:start');
    // Set states and reload, then verify persisted
    setCheckbox('setting-auto-next', true);
    setCheckbox('setting-memorize', true);
    setCheckbox('setting-shuffle', false);
    localStorage.setItem('__AUTO_RESUME__', '1');
    location.reload();
  }

  async function postReloadVerify(){
    if (localStorage.getItem('__AUTO_RESUME__') === '1'){
      await sleep(500);
      const s = {
        autoNext: !!document.getElementById('setting-auto-next')?.checked,
        memorize: !!document.getElementById('setting-memorize')?.checked,
        shuffle: !!document.getElementById('setting-shuffle')?.checked,
      };
      log('TC035:verify', s);
      localStorage.removeItem('__AUTO_RESUME__');
      log('TC035:done');
    }
  }

  async function runAll(){
    try{
      await ensurePracticeStarted('normal');
      await run_TC031();
      await run_TC034();
      await run_TC032();
      await run_TC033();
      await run_TC035();
    } catch(e){
      log('ERROR', String(e&&e.message||e));
    }
  }

  function shouldRun(){
    try{
      const url = new URL(location.href);
      const ok = !!url.searchParams.get('autoPractice');
      if (window.AutoCoordinator && !window.AutoCoordinator.shouldRun('practice')) return false;
      return ok;
    }catch(_){ return false; }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=>{
      postReloadVerify();
      if (shouldRun()) setTimeout(runAll, 600);
    });
  } else {
    postReloadVerify();
    if (shouldRun()) setTimeout(runAll, 600);
  }
})();

async function run(){
  if (window.AutoCoordinator && !window.AutoCoordinator.acquireLock('practice')) return;
  try{
    await ensurePracticeStarted('normal');
    // Step1: enable autoNext
    setCheckbox('setting-auto-next', true);
    // Ensure memorize off for this case
    setCheckbox('setting-memorize', false);
    const startIdx = window.currentQuestionIndex||0;
    await selectCorrect();
    await sleep(700); // wait for auto jump (0.5s + buffer)
    const idxAfter = window.currentQuestionIndex||0;
    log('TC031:afterAutoNext', {startIdx, idxAfter});
    // Step2: disable autoNext and answer next correct
    setCheckbox('setting-auto-next', false);
    await selectCorrect();
    await sleep(600);
    const idxAfter2 = window.currentQuestionIndex||0;
    log('TC031:afterManualRemain', {idxAfter2});
    log('TC031:done');
  } finally {
    try{ window.AutoCoordinator.releaseLock('practice'); }catch(_){}
  }
}