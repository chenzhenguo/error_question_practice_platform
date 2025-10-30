// 自动化测试协调器：避免多测试同时运行导致 UI 来回跳、弹窗冲突
(function(){
  function parse(){
    try{
      const u = new URL(location.href);
      return {
        raw: !!u.searchParams.get('autoRaw'),
        realtime: !!u.searchParams.get('autoRealtime'),
        practice: !!u.searchParams.get('autoPractice'),
        export: !!u.searchParams.get('autoExport'),
        filter: !!u.searchParams.get('autoFilter'),
        import: (u.searchParams.get('autoTest') === '1') || ((u.hash||'').toLowerCase().includes('autotest')),
      };
    }catch(_){ return {}; }
  }
  const modes = parse();
  const present = Object.keys(modes).filter(k=> modes[k]);
  const suppress = new Set();
  // 策略：当存在多个 auto 参数，默认压制“导入(import)”与“导出(export)”以避免弹窗与路由跳动
  if (present.length > 1){ suppress.add('import'); suppress.add('export'); }
  // 当包含原始编辑/实时同步时，也压制导入与导出（避免弹窗被覆盖）
  if (modes.raw || modes.realtime){ suppress.add('import'); suppress.add('export'); }

  const AutoCoordinator = {
    shouldRun(tag){
      // tag: 'import'|'export'|'practice'|'filter'|'realtime'|'raw'
      if (suppress.has(tag)) return false;
      try{
        const u = new URL(location.href);
        if (tag==='import') return (u.searchParams.get('autoTest') === '1') || ((u.hash||'').toLowerCase().includes('autotest'));
        if (tag==='export') return !!u.searchParams.get('autoExport');
        if (tag==='practice') return !!u.searchParams.get('autoPractice');
        if (tag==='filter') return !!u.searchParams.get('autoFilter');
        if (tag==='realtime') return !!u.searchParams.get('autoRealtime');
        if (tag==='raw') return !!u.searchParams.get('autoRaw');
      }catch(_){ }
      return false;
    },
    acquireLock(tag){
      try{
        if (window.__AUTO_LOCK__) return false;
        window.__AUTO_LOCK__ = tag || true;
        return true;
      }catch(_){ return true; }
    },
    releaseLock(tag){
      try{
        window.__AUTO_LOCK__ = null;
      }catch(_){ }
    }
  };

  window.AutoCoordinator = AutoCoordinator;
})();
