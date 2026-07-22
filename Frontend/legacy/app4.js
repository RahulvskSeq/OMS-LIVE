(function(){
  var _BEURL=window.__API__;
  var _JWT='stencil_jwt_v1';
  var _WMAP={
    'WIPE_ORDERS':'/api/admin/wipe-orders',
    'WIPE_PRODUCTS':'/api/admin/wipe-products',
    'WIPE_CUSTOMERS':'/api/admin/wipe-customers',
    'WIPE_VENDORS':'/api/admin/wipe-suppliers',
    'WIPE_TRANSPORTERS':'/api/admin/wipe-transporters',
    'WIPE_USERS':'/api/admin/wipe-users',
    'WIPE_ROLES':'/api/admin/wipe-roles'
  };

  /* ── Intercept window.audit() to fire MongoDB deletes on wipe ── */
  var _oa=window.audit;
  window.audit=function(action){
    if(_WMAP[action]){
      var t=localStorage.getItem(_JWT);
      fetch(_BEURL+_WMAP[action],{method:'DELETE',headers:{Authorization:'Bearer '+t}}).catch(function(){});
    }
    return _oa ? _oa.apply(this,arguments) : undefined;
  };

  /* ── After data loads, sync in-memory arrays → localStorage ── */
  var _syncDone=false;
  var _syncObs=new MutationObserver(function(muts){
    if(_syncDone) return;
    for(var m of muts){
      for(var n of m.removedNodes){
        if(n.id==='_bridgeLoader'){
          _syncDone=true;
          _syncObs.disconnect();
          setTimeout(function(){
            try{ if(typeof persistData==='function') persistData(); }catch(e){}
            try{ if(typeof persistOrders==='function') persistOrders(); }catch(e){}
          },300);
          return;
        }
      }
    }
  });
  document.addEventListener('DOMContentLoaded',function(){
    _syncObs.observe(document.body,{childList:true,subtree:true});
  });

  /* ── Wrap saveProduct / saveCustomer / saveVendor with error toasts ── */
  function _wrapSave(fnName,label){
    var orig=window[fnName];
    if(typeof orig!=='function') return;
    window[fnName]=async function(){
      await orig.apply(this,arguments);
      /* Give the async API call 3s to set _id; warn if it didn't */
      await new Promise(function(r){setTimeout(r,3000);});
      var arr = fnName==='saveProduct'?products:fnName==='saveCustomer'?customers:vendors;
      if(!arr) return;
      var last=arr[arr.length-1];
      if(last&&!last._id&&typeof showToast==='function'){
        showToast('⚠️ '+label+' saved locally but NOT synced to server — please check your connection and try again.','error');
      }
    };
  }
  /* Wait for page ready before wrapping */
  var _wrapInterval=setInterval(function(){
    if(typeof saveProduct==='function'&&typeof saveCustomer==='function'&&typeof saveVendor==='function'){
      clearInterval(_wrapInterval);
      _wrapSave('saveProduct','Product');
      _wrapSave('saveCustomer','Customer');
      _wrapSave('saveVendor','Vendor');
    }
  },500);
  setTimeout(function(){clearInterval(_wrapInterval);},15000);
})();

/* ═══════════════════════════════════════════════════════════════
 *  URL ROUTING (hash-based)
 *  ---------------------------------------------------------------
 *  Reflects the active screen in the address bar (#/orders,
 *  #/dashboard, #/pending-don, #/ship-intransit, …) so clicking any
 *  nav item produces a real, shareable, Back/Forward-able route.
 *  This is layered ON TOP of navTo(): no screen behaviour or design
 *  changes — navTo still does exactly what it did, we just keep the
 *  URL in sync with it and let the URL drive navigation too.
 * ═══════════════════════════════════════════════════════════════ */
(function(){
  if(window.__omsHashRouter) return;
  window.__omsHashRouter = true;

  function pageFromHash(){ return (location.hash||'').replace(/^#\/?/, '').trim(); }
  function appVisible(){ var a=document.getElementById('app'); return !!a && a.style.display==='block'; }

  var _programmatic = false;            // set while WE change the hash, to skip our own hashchange
  var _innerNavTo = window.navTo;       // the (session-saving) navTo already installed at boot

  function setHash(page){
    var target = '#/' + page;
    if(location.hash === target) return;
    _programmatic = true;
    location.hash = target;             // pushes a history entry → enables Back/Forward
  }

  /* 1) Every navigation updates the URL. Sidebar onclick="navTo(...)",
        internal navTo() calls and sub-navs all flow through here. */
  if(typeof _innerNavTo === 'function'){
    window.navTo = function(page){
      var r = _innerNavTo.apply(this, arguments);
      try{ setHash((typeof currentPage!=='undefined' && currentPage) || page); }catch(e){}
      return r;
    };
  }

  /* 2) Back / Forward buttons and manual URL edits navigate the app
        (call the inner navTo so we don't push a duplicate history entry). */
  window.addEventListener('hashchange', function(){
    if(_programmatic){ _programmatic = false; return; }
    if(!appVisible()) return;
    var page = pageFromHash();
    if(page && page !== currentPage && typeof _innerNavTo === 'function') _innerNavTo(page);
  });

  /* 3) Deep-link on first load: seed the existing page-restore with the
        URL's screen BEFORE the app boots, so a shared/refreshed
        #/orders opens Orders. (Restore logic reads stencil_page_v1.) */
  try{ var _hp = pageFromHash(); if(_hp) sessionStorage.setItem('stencil_page_v1', _hp); }catch(e){}

  /* 4) Once the shell is visible, make sure the URL shows the current
        screen even when it was restored via sessionStorage (no hash yet). */
  var _tries = 0;
  var _t = setInterval(function(){
    if(appVisible() && typeof currentPage!=='undefined' && currentPage){
      if(!location.hash) setHash(currentPage);
      clearInterval(_t);
    }
    if(++_tries > 100) clearInterval(_t);   // give up after ~20s
  }, 200);
})();
