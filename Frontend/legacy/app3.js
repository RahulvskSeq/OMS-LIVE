(function(){
  'use strict';
  const _API     = window.__API__;
  const _JWT_KEY = 'stencil_jwt_v1';
  let _authReady = false;
  let _dataReady = false;   /* true only after _loadAll() finishes */
  let _initPending = false; /* IIFE called initApp() before data was ready */

  /* ── Override initApp — block IIFE's premature call until data is loaded ── */
  const _origInitApp = window.initApp;
  window.initApp = function(){
    if(!_authReady){ _showLogin(); return; }
    if(!_dataReady){ _initPending = true; return; } /* data not ready yet — bridge will call later */
    _origInitApp.call(this);
  };

  /* ── Save/restore current page + order filters across refreshes ── */
  const _PAGE_KEY = 'stencil_page_v1';
  const _ORD_FILTER_KEY = 'stencil_ord_filter_v1';
  const _origNavTo = window.navTo;
  window.navTo = function(page, ...args){
    try{ sessionStorage.setItem(_PAGE_KEY, page); }catch(e){}
    if(typeof _origNavTo === 'function') return _origNavTo.call(this, page, ...args);
  };

  /* ── Full-screen loading overlay (session restore on refresh) ──
     Keep BOTH the login screen and the app shell HIDDEN, and show only the
     full-screen #appLoader. This way the half-rendered sidebar / empty
     dashboard never flashes behind the spinner — the user sees just the
     loader until every record is loaded. The app is revealed in _renderApp()
     once the data is ready. */
  function _showLoadingOverlay(){
    const go = () => {
      const ls = document.getElementById('loginScreen');
      const ap = document.getElementById('app');
      if(ls) ls.style.display = 'none';
      if(ap) ap.style.display = 'none';
      const loader = document.getElementById('appLoader');
      const alText = document.getElementById('alText');
      const alSub  = document.getElementById('alSub');
      if(alText) alText.textContent = 'Loading your data…';
      if(alSub)  alSub.textContent  = 'Fetching your orders & masters';
      if(loader) loader.classList.add('show');
    };
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go, {once:true});
    else go();
  }

  /* ── Call _origInitApp safely after data is loaded, go directly to saved page ── */
  function _renderApp(){
    _dataReady = true;
    _initPending = false;
    /* Data is ready → reveal the app and drop the full-screen loader.
       (The shell was kept hidden during load so nothing half-rendered showed.) */
    const _ls = document.getElementById('loginScreen'); if(_ls) _ls.style.display = 'none';
    const _ap = document.getElementById('app');         if(_ap) _ap.style.display = 'block';
    const _ov = document.getElementById('appLoader');   if(_ov) _ov.classList.remove('show');
    const loader = document.getElementById('_bridgeLoader'); /* legacy node, if any */
    if(loader) loader.remove();
    /* Persist freshly-loaded data → localStorage (this used to be fired by the
       _bridgeLoader removal observer, which no longer runs). */
    setTimeout(function(){
      try{ if(typeof persistData==='function') persistData(); }catch(e){}
      try{ if(typeof persistOrders==='function') persistOrders(); }catch(e){}
    }, 300);

    /* Get saved page + saved order filter before initApp overwrites state */
    let savedPage = null;
    try{ savedPage = sessionStorage.getItem(_PAGE_KEY); }catch(e){}

    if(savedPage && savedPage !== 'dashboard' && typeof _origNavTo === 'function'){
      /* Intercept the navTo('dashboard') call inside initApp — redirect straight to saved page */
      const _prev = window.navTo;
      let _intercepted = false;
      window.navTo = function(page, ...args){
        if(!_intercepted && page === 'dashboard'){
          _intercepted = true;
          window.navTo = _prev; /* restore before calling so page tracking works */
          try{ sessionStorage.setItem(_PAGE_KEY, savedPage); }catch(e){}
          if(typeof _origNavTo === 'function') return _origNavTo.call(this, savedPage, ...args);
          return;
        }
        window.navTo = _prev;
        if(typeof _origNavTo === 'function') return _origNavTo.call(this, page, ...args);
      };
      if(typeof _origInitApp === 'function') _origInitApp.call(window);
      window.navTo = _prev; /* ensure restore in case initApp didn't call navTo */
    } else {
      if(typeof _origInitApp === 'function') _origInitApp.call(window);
    }

    /* Ensure live auto-refresh runs for every entry path (login, reload, session restore) */
    if(typeof _startPoll==='function' && currentUser){ _startPoll(); if(typeof _startStream==='function') _startStream(); }
  }

  /* ── Skeleton loading state (instant login) ──
     Shimmer placeholders shown in the content area the moment you log in, so
     the app appears immediately while orders/masters stream in behind it. */
  function _showSkeletons(){
    try{
      if(document.getElementById('_skelOverlay')) return;
      const main=document.querySelector('.main'); if(!main) return;
      if(getComputedStyle(main).position==='static') main.style.position='relative';
      const tb=main.querySelector('.topbar');
      const sk=document.createElement('div');
      sk.id='_skelOverlay'; sk.className='skel-overlay';
      sk.style.top=(tb?tb.offsetHeight:56)+'px';
      sk.innerHTML=
        '<div class="skel-pills">'+'<div class="skel-block skel-pill"></div>'.repeat(7)+'</div>'+
        '<div class="skel-cards">'+'<div class="skel-block skel-card"></div>'.repeat(3)+'</div>'+
        '<div class="skel-rows">'+'<div class="skel-block skel-row"></div>'.repeat(9)+'</div>';
      main.appendChild(sk);
    }catch(e){}
  }
  function _hideSkeletons(){ try{ const s=document.getElementById('_skelOverlay'); if(s) s.remove(); }catch(e){} }

  /* ── Instant reveal (fresh login) ──
     Show the app shell + skeleton IMMEDIATELY after auth, before any data.
     Unlike _renderApp() this does NOT auto-persist (which would overwrite the
     localStorage cache with empty arrays) — persistence happens once the real
     data has loaded (end of _loadAll's background pass). */
  function _revealInstant(){
    _dataReady=true; _initPending=false;
    const _ls=document.getElementById('loginScreen'); if(_ls) _ls.style.display='none';
    const _ap=document.getElementById('app');         if(_ap) _ap.style.display='block';
    const _ov=document.getElementById('appLoader');   if(_ov) _ov.classList.remove('show');
    /* Build the shell (lands on dashboard; the hash router in app4 keeps the
       URL in sync). Data streams in behind the skeleton. */
    try{ if(typeof _origInitApp==='function') _origInitApp.call(window); }catch(e){console.warn('initApp:',e);}
    _showSkeletons();
  }

  /* ── low-level fetch (throws only on non-ok, preserves error.status) ── */
  async function _req(method, path, body){
    const tok = localStorage.getItem(_JWT_KEY);
    const r = await fetch(_API + path, {
      method,
      headers:{
        'Content-Type':'application/json',
        ...(tok ? {'Authorization':'Bearer '+tok} : {})
      },
      ...(body ? {body:JSON.stringify(body)} : {})
    });
    const j = await r.json();
    if(!r.ok){
      const err = new Error(j.message || 'Error '+r.status);
      err.status = r.status;
      throw err;
    }
    return j;
  }

  /* ── map backend order → HTML order ── */
  function _toLocal(o){
    return {
      id:o.seqId||0, _id:o._id, groupDonId:o.groupDonId||null,
      customer:o.customer||'', product:o.product||'',
      orderedCode:o.orderedCode||'', vendor:o.vendor||'',
      qty:o.qty||0, unit:o.unit||'pcs',
      orderDate:o.orderDate?o.orderDate.split('T')[0]:'',
      eta:o.eta||'', dispatchDate:o.dispatchDate||'', transitExtendDate:o.transitExtendDate||'', status:(o.status==='Cancel'?'Cancelled':o.status)||'Order',
      lr:o.lr||'', lrDate:o.lrDate||'',
      transporter:o.transporter||'',
      purchaseRate:o.purchaseRate||0, sellingRate:o.sellingRate||0,
      notes:o.notes||'', poNum:o.poNum||'', vendorPoNum:o.vendorPoNum||'',
      grn:o.grn||{}, billing:o.billing||{}, delivery:o.delivery||{},
      etaHistory:o.etaHistory||[], trail:o.trail||[],
      createdBy:o.createdBy||'', isStockOrder:o.isStockOrder||false,
      /* Fields that must survive refresh — kept in sync with _toAPI */
      biller:o.biller||'', salesExec:o.salesExec||'',
      billerHistory:o.billerHistory||[], salesHistory:o.salesHistory||[],
      updatedAt:o.updatedAt||'',
      cancelReason:o.cancelReason||'', cancelledBy:o.cancelledBy||'', cancelledAt:o.cancelledAt||'',
      grnNo:o.grnNo||'', grnDate:o.grnDate||'', grnBy:o.grnBy||'', grnRemarks:o.grnRemarks||'',
      purchVoucherNo:o.purchVoucherNo||'', physGrnNo:o.physGrnNo||'', physGrnDate:o.physGrnDate||'',
      vendorInvoiceNum:o.vendorInvoiceNum||'', vendorInvoiceDate:o.vendorInvoiceDate||'',
      remark:o.remark||'', comments:o.comments||[],
      transitDetails:o.transitDetails||{},
      isStockAddition:o.isStockAddition||false, linkedToOrderId:o.linkedToOrderId||null,
      billedDate:o.billedDate||'',
    };
  }

  /* ── map HTML order → API payload ── */
  function _toAPI(o){
    return {
      customer:o.customer, product:o.product,
      orderedCode:o.orderedCode||'', vendor:o.vendor||'',
      qty:o.qty, unit:o.unit||'pcs', orderDate:o.orderDate,
      eta:o.eta||'', dispatchDate:o.dispatchDate||'', transitExtendDate:o.transitExtendDate||'', status:o.status||'Order',
      lr:o.lr||'', lrDate:o.lrDate||'',
      transporter:o.transporter||'',
      purchaseRate:o.purchaseRate||0, sellingRate:o.sellingRate||0,
      notes:o.notes||'', poNum:o.poNum||'', vendorPoNum:o.vendorPoNum||'',
      groupDonId:o.groupDonId||null,
      grn:o.grn||{}, billing:o.billing||{}, delivery:o.delivery||{},
      etaHistory:o.etaHistory||[], trail:o.trail||[],
      isStockOrder:o.isStockOrder||false,
      /* Additional fields — must match _toLocal to prevent data loss on refresh */
      biller:o.biller||'', salesExec:o.salesExec||'',
      cancelReason:o.cancelReason||'', cancelledBy:o.cancelledBy||'', cancelledAt:o.cancelledAt||'',
      grnNo:o.grnNo||'', grnDate:o.grnDate||'', grnBy:o.grnBy||'', grnRemarks:o.grnRemarks||'',
      purchVoucherNo:o.purchVoucherNo||'', physGrnNo:o.physGrnNo||'', physGrnDate:o.physGrnDate||'',
      vendorInvoiceNum:o.vendorInvoiceNum||'', vendorInvoiceDate:o.vendorInvoiceDate||'',
      remark:o.remark||'', comments:o.comments||[],
      transitDetails:o.transitDetails||{},
      isStockAddition:o.isStockAddition||false, linkedToOrderId:o.linkedToOrderId||null,
      createdBy:o.createdBy||'',
      billedDate:o.billedDate||'',
    };
  }

  /* Only the fields that changed vs a baseline order (both in _toAPI shape).
     The sync PUTs this delta instead of the whole order, so a concurrent write
     from another user can't revert a field THIS client never touched — e.g. you
     approve an order while a colleague edits its ETA; both changes survive. */
  function _deltaAPI(baseObj, curObj){
    const b=_toAPI(baseObj), c=_toAPI(curObj), d={};
    for(const k in c){ if(JSON.stringify(c[k])!==JSON.stringify(b[k])) d[k]=c[k]; }
    return d;
  }

  /* ── Pending sync queue: order IDs changed locally but not yet confirmed by API ── */
  const _PENDING_KEY = 'stencil_pending_v1';
  function _markPending(ids){
    try{
      const cur=JSON.parse(localStorage.getItem(_PENDING_KEY)||'[]');
      const merged=[...new Set([...cur,...ids])];
      if(merged.length) localStorage.setItem(_PENDING_KEY,JSON.stringify(merged));
    }catch(e){}
  }
  function _clearPending(id){
    try{
      const cur=JSON.parse(localStorage.getItem(_PENDING_KEY)||'[]');
      const filtered=cur.filter(x=>x!==id);
      if(filtered.length) localStorage.setItem(_PENDING_KEY,JSON.stringify(filtered));
      else localStorage.removeItem(_PENDING_KEY);
    }catch(e){}
  }

  /* ── load all master data from API ── */
  /* Dedup + map a flat array of raw order docs into the global `orders` array. */
  function _applyOrderData(all){
    const _SORD=['Order','Approved','PO Raised','In Transit','At Transporter','Warehouse','GRN','Purchased','Billed','Cancelled'];
    const _sp=s=>{const i=_SORD.indexOf(s);return i>=0?i:-1;};
    const _seenKeys=new Map(); const _deduped=[];
    for(const o of all){
      const key=(o.customer||'')+'|'+(o.product||o.orderedCode||'')+'|'+(o.qty||0)+'|'+(o.orderDate||'')+'|'+(o.biller||'')+'|'+(o.createdBy||'');
      if(!_seenKeys.has(key)){_seenKeys.set(key,{o,sp:_sp(o.status),sq:o.seqId||0});_deduped.push(o);}
      else{const p=_seenKeys.get(key);const cs=_sp(o.status);const cq=o.seqId||0;
        if(cs>p.sp||(cs===p.sp&&cq>p.sq)){const pi=_deduped.indexOf(p.o);if(pi>=0)_deduped[pi]=o;_seenKeys.set(key,{o,sp:cs,sq:cq});}}
    }
    orders=_deduped.map(_toLocal);
    if(orders.length>0) nextOrderId=Math.max(...orders.map(o=>typeof o.id==='number'?o.id:0))+1;
    orders.forEach(o=>{ _snap[o.id]=JSON.stringify(o); if(o.updatedAt) _verSeen[o.id]=o.updatedAt; }); /* seed snap + version baseline */
  }

  /* Restore any pending local (offline) changes over the freshly-loaded orders. */
  function _restorePending(){
    try{
      const pendingIds=JSON.parse(localStorage.getItem(_PENDING_KEY)||'[]');
      if(pendingIds.length){
        const lsOrders=JSON.parse(localStorage.getItem('oms_orders_v3')||'[]');
        for(const pid of pendingIds){
          const lsOrd=lsOrders.find(o=>o.id===pid);
          if(!lsOrd) continue;
          const idx=orders.findIndex(o=>o.id===pid);
          if(idx>=0){
            /* Override API version with local version — local is more recent */
            const merged={...orders[idx],...lsOrd, _id:orders[idx]._id||lsOrd._id};
            orders[idx]=merged;
            _snap[pid]=null; /* force re-sync */
          } else {
            /* New order not yet in API */
            orders.push({...lsOrd});
          }
        }
        /* Re-seed nextOrderId to account for any local orders */
        if(orders.length>0) nextOrderId=Math.max(nextOrderId,...orders.map(o=>typeof o.id==='number'?o.id:0))+1;
        /* Push pending to API in background immediately */
        setTimeout(async()=>{
          for(const pid of [...pendingIds]){
            const o=orders.find(x=>x.id===pid);
            if(!o) continue;
            try{
              if(!o._id){
                const r=await _req('POST','/api/orders',_toAPI(o));
                if(r.data){o._id=r.data._id;}
              }else{
                await _req('PUT','/api/orders/'+o._id,_toAPI(o));
              }
              _snap[o.id]=JSON.stringify(o);
              _clearPending(pid);
            }catch(ex){console.warn('pending sync fail:',ex);}
          }
        },200);
      }
    }catch(ex){console.warn('pending restore:',ex);}
  }

  /* Lightweight re-render after a background load finishes — same refresh the
     30s poll uses (re-paints the current page + sidebar; does NOT re-run initApp). */
  function _refreshAfterLoad(){
    try{
      if(currentUser){ const f=users.find(u=>u.username===currentUser.username); if(f) Object.assign(currentUser,f); }
      if(typeof renderPage==='function'&&currentPage) renderPage(currentPage);
      if(typeof buildSidebar==='function') buildSidebar();
    }catch(e){console.warn('post-load refresh:',e);}
  }

  /* Load every order page, dedup, and restore pending changes (blocking). */
  async function _loadOrdersFull(){
    try{
      let all=[];
      const _first=await _req('GET','/api/orders?page=1&limit=200');
      all=all.concat(_first.data||[]);
      const _np=Math.min(_first.pages||1,50);
      if(_np>1){
        const _reqs=[];
        for(let _p=2;_p<=_np;_p++) _reqs.push(_req('GET',`/api/orders?page=${_p}&limit=200`));
        (await Promise.all(_reqs)).forEach(r=>{ all=all.concat(r.data||[]); });
      }
      _applyOrderData(all);
      _restorePending();
    }catch(e){console.warn('orders:',e);}
  }

  /* ────────────────────────────────────────────────────────────────
     _loadAll(fast)
     Orders + masters now load CONCURRENTLY (were sequential: ~orders 13s
     THEN masters 7s ≈ 20s cold).
       fast=true  (fresh login): the reveal blocks on ONLY orders page 1
                  (~200 most-recent orders) + kicking off masters. The rest
                  of the orders and the full product catalog stream in the
                  background, then the table + sidebar re-render. Login feels
                  near-instant instead of waiting for every row to transfer
                  from the (throttled) DB.
       fast=false (session restore): wait for the full load — restore also
                  runs the one-time localStorage→DB migration, which must see
                  real master counts before deciding anything is "empty".
  ──────────────────────────────────────────────────────────────── */
  async function _loadAll(fast){
    const _mastersP=_loadMasters();   /* concurrent with orders */
    if(fast){
      try{
        const _first=await _req('GET','/api/orders?page=1&limit=200');
        _applyOrderData(_first.data||[]);
      }catch(e){console.warn('orders p1:',e);}
      /* page 1 is in → drop the skeleton and paint the first ~200 orders */
      _hideSkeletons();
      _refreshAfterLoad();
      /* finish the rest in the background, then refresh again + cache */
      (async()=>{
        try{ await _mastersP; }catch(e){}
        try{ await _pollOrders(); }catch(e){}   /* full orders, dirty-preserving re-render */
        try{ _restorePending(); }catch(e){}
        /* one-time localStorage->DB migration (no-op once done / when server has data) */
        try{ if(typeof _migrateFromLocalStorage==='function') await _migrateFromLocalStorage(); }catch(e){}
        try{ if(typeof populateDropdowns==='function') populateDropdowns(); }catch(e){} /* masters now loaded */
        _refreshAfterLoad();
        /* persist the fully-loaded data to localStorage (skipped during instant reveal) */
        try{ if(typeof persistData==='function') persistData(); }catch(e){}
        try{ if(typeof persistOrders==='function') persistOrders(); }catch(e){}
      })();
      return;
    }
    await _loadOrdersFull();
    await _mastersP;
  }

  async function _loadMasters(){
    await Promise.all([
    (async()=>{ try{
      const r=await _req('GET','/api/customers');
      customers=(r.data||[]).map((c,i)=>({
        id:i+1,_id:c._id,name:c.name||'',contact:c.contact||'',
        phone:c.phone||'',whatsapp:c.whatsapp||'',city:c.city||'',
        addr:c.address||'',email:c.email||'',
        salesExec:c.assignedSalesman||c.salesExec||'',biller:c.assignedBiller||c.biller||'',manager:c.manager||''
      }));
      nextId.customer=customers.length+1;
    }catch(e){console.warn('customers:',e);} })(),

    (async()=>{ try{
      const r=await _req('GET','/api/suppliers');
      vendors=(r.data||[]).map((v,i)=>({
        id:i+1,_id:v._id,name:v.name||'',
        location:v.city||v.address||'',
        deliveryDays:v.leadTimeDays||v.deliveryDays||7,
        contact:v.contact||v.contactPerson||'',
        phone:v.phone||'',whatsapp:v.whatsapp||''
      }));
      nextId.vendor=vendors.length+1;
    }catch(e){console.warn('vendors:',e);} })(),

    /* Products: the one master that can be tens of thousands of rows. Fetch
       only page 1 here (in parallel with the other masters) so the app opens
       with a populated catalog, then stream the rest in the BACKGROUND — the
       app is usable immediately because orders/home render from each order's
       own fields, never from this array. A generation token aborts a stale
       background stream if a fresh login/restore starts mid-flight. */
    (async()=>{ try{
      const _PLIM=1000;
      const _gen=(window.__prodLoadGen=(window.__prodLoadGen||0)+1);
      const _mapProd=(p,i)=>({
        id:i+1,_id:p._id,code:p.code||'',name:p.name||'',
        category:p.category||'',defaultVendor:p.defaultVendor||'',
        unit:p.unit||'pcs',parentCode:p.parentCode||'',parentAlias:p.parentAlias||''
      });
      const _p1=await _req('GET',`/api/products?page=1&limit=${_PLIM}`);
      if(window.__prodLoadGen!==_gen) return; /* superseded by a newer load */
      products=(_p1.data||[]).map((p,i)=>_mapProd(p,i));
      nextProductId=products.length+1;
      const _ppages=Math.min(_p1.pages||1,500);
      if(_ppages>1){
        /* detached — NOT awaited: app reveals now, rest of catalog fills in */
        (async()=>{
          try{
            for(let _pg=2;_pg<=_ppages;_pg++){
              const _r=await _req('GET',`/api/products?page=${_pg}&limit=${_PLIM}`);
              if(window.__prodLoadGen!==_gen) return;
              const _base=products.length;
              (_r.data||[]).forEach((p,i)=>products.push(_mapProd(p,_base+i)));
              nextProductId=products.length+1;
            }
          }catch(_e){console.warn('products bg:',_e);}
          /* refresh the Products table only if the user is on that page now */
          try{ if(window.__prodLoadGen===_gen&&document.getElementById('productsTableWrap')&&typeof renderProductsTable==='function') renderProductsTable(); }catch(_e){}
        })();
      }
    }catch(e){console.warn('products:',e);} })(),

    (async()=>{ try{
      const r=await _req('GET','/api/transporters');
      transporters=(r.data||[]).map((t,i)=>({
        id:i+1,_id:t._id,name:t.name||'',type:t.type||'',
        location:t.city||t.address||'',
        transitDays:t.avgTransitDays||t.transitDays||0,
        contact:t.contact||t.contactPerson||'',
        phone:t.phone||'',whatsapp:t.whatsapp||'',notes:t.notes||''
      }));
      nextTransporterId=transporters.length+1;
    }catch(e){console.warn('transporters:',e);} })(),

    (async()=>{ try{
      const r=await _req('GET','/api/users');
      if((r.data||[]).length>0){
        users=(r.data||[]).map((u,i)=>({
          id:i+1,_id:u._id,username:u.username,
          name:u.name||u.username,role:u.role,biller:u.biller||'',password:'',
          email:u.email||'',
          departmentId:u.department||'',departmentName:u.departmentName||'',
          teamLeadId:u.teamLeadId||'',teamLeadName:u.teamLeadName||''
        }));
        if(users.length>0) nextId.user=users.length+1;
        if(currentUser){
          const f=users.find(u=>u.username===currentUser.username);
          if(f) Object.assign(currentUser,f);
        }
      }
    }catch(e){console.warn('users:',e);} })(),

    (async()=>{ try{
      const r=await _req('GET','/api/departments');
      departments=(r.data||[]).map(d=>({id:d._id,_id:d._id,name:d.name||'',description:d.description||''}));
    }catch(e){console.warn('departments:',e);} })(),
    ]);
  }

  /* ════ ONE-TIME MIGRATION: localStorage → MongoDB ════
     If any entity has 0 records in the API but localStorage has data,
     push localStorage data to MongoDB so it persists after refresh.
  ═══════════════════════════════════════════════════════ */
  const _MIG_KEY = 'stencil_migrated_v2';
  async function _migrateFromLocalStorage(){
    if(localStorage.getItem(_MIG_KEY)) return; /* already done */
    const _ls = k => { try{ return JSON.parse(localStorage.getItem(k)||'[]'); }catch(e){ return []; } };
    let synced = 0;

    /* Customers */
    if(customers.length === 0){
      const ls = _ls('customers_v2');
      for(const c of ls){
        try{ await _req('POST','/api/customers',{name:c.name||'',phone:c.phone||'',email:c.email||'',address:c.addr||c.address||'',city:c.city||'',contact:c.contact||'',whatsapp:c.whatsapp||'',salesExec:c.salesExec||'',biller:c.biller||'',manager:c.manager||'',assignedSalesman:c.salesExec||'',assignedBiller:c.biller||''}); synced++; }catch(ex){}
      }
      if(synced > 0){ try{ const r=await _req('GET','/api/customers?isActive=true'); customers=(r.data||[]).map((c,i)=>({id:i+1,_id:c._id,name:c.name||'',contact:c.contact||'',phone:c.phone||'',whatsapp:c.whatsapp||'',city:c.city||'',addr:c.address||'',email:c.email||'',salesExec:c.assignedSalesman||c.salesExec||'',biller:c.assignedBiller||c.biller||'',manager:c.manager||''})); }catch(ex){} }
    }
    /* Vendors / Suppliers */
    if(vendors.length === 0){
      const ls = _ls('vendors_v2');
      for(const v of ls){
        try{ await _req('POST','/api/suppliers',{name:v.name||'',city:v.location||'',leadTimeDays:v.deliveryDays||7,phone:v.phone||'',whatsapp:v.whatsapp||'',contact:v.contact||''}); synced++; }catch(ex){}
      }
      if(vendors.length === 0 && ls.length > 0){ try{ const r=await _req('GET','/api/suppliers?isActive=true'); vendors=(r.data||[]).map((v,i)=>({id:i+1,_id:v._id,name:v.name||'',location:v.city||'',deliveryDays:v.leadTimeDays||7,contact:v.contactPerson||v.contact||'',phone:v.phone||'',whatsapp:v.whatsapp||''})); }catch(ex){} }
    }
    /* Products */
    if(products.length === 0){
      const ls = _ls('products_v2');
      for(const p of ls){
        try{ await _req('POST','/api/products',{name:p.name||'',code:p.code||'',category:p.category||'',unit:p.unit||'pcs',defaultVendor:p.defaultVendor||'',parentCode:p.parentCode||'',parentAlias:p.parentAlias||''}); synced++; }catch(ex){}
      }
      if(products.length === 0 && ls.length > 0){ try{ const r=await _req('GET','/api/products?isActive=true'); products=(r.data||[]).map((p,i)=>({id:i+1,_id:p._id,code:p.code||'',name:p.name||'',category:p.category||'',defaultVendor:p.defaultVendor||'',unit:p.unit||'pcs',parentCode:p.parentCode||'',parentAlias:p.parentAlias||''})); nextProductId=products.length+1; }catch(ex){} }
    }
    /* Transporters */
    if(transporters.length === 0){
      const ls = _ls('transporters_v1');
      for(const t of ls){
        try{ await _req('POST','/api/transporters',{name:t.name||'',type:t.type||'',city:t.location||'',avgTransitDays:t.transitDays||0,phone:t.phone||'',contact:t.contact||'',whatsapp:t.whatsapp||'',notes:t.notes||''}); synced++; }catch(ex){}
      }
      if(transporters.length === 0 && ls.length > 0){ try{ const r=await _req('GET','/api/transporters?isActive=true'); transporters=(r.data||[]).map((t,i)=>({id:i+1,_id:t._id,name:t.name||'',type:t.type||'',location:t.city||'',transitDays:t.avgTransitDays||0,contact:t.contact||'',phone:t.phone||'',whatsapp:t.whatsapp||'',notes:t.notes||''})); nextTransporterId=transporters.length+1; }catch(ex){} }
    }

    if(synced > 0 && typeof showToast==='function') showToast('✅ Migrated '+synced+' records from local storage to server','success');
    localStorage.setItem(_MIG_KEY,'1');
  }

  function _applyPerms(apiUser){
    if(apiUser.permissions&&apiUser.permissions.length>0)
      userPermOverrides[apiUser.id||apiUser._id]=apiUser.permissions;
  }

  function _showLogin(){
    currentUser=null;
    try{sessionStorage.removeItem('oms_session');}catch(e){}
    const ls=document.getElementById('loginScreen');
    const ap=document.getElementById('app');
    if(ls) ls.style.display='flex';
    if(ap) ap.style.display='none';
    const lu=document.getElementById('lusr'),lp=document.getElementById('lpwd');
    if(lu) lu.value=''; if(lp) lp.value='';
  }

  function _launchApp(usr, apiUser){
    _authReady=true;
    currentUser=usr;
    _applyPerms({id:usr.id,permissions:apiUser.permissions||[]});
    try{sessionStorage.setItem('oms_session',JSON.stringify({id:usr.id,username:usr.username}));}catch(e){}
    const go=()=>{
      document.getElementById('loginScreen').style.display='none';
      document.getElementById('app').style.display='block';
      _renderApp(); /* _dataReady=true → calls _origInitApp */
    };
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded',go,{once:true});
    } else { go(); }
  }

  /* ════════════════════════════════
     Restore session from JWT
     v5: INSTANT restore from localStorage cache — no API wait on refresh.
         JWT validated in background; only logs out on explicit 401.
  ════════════════════════════════ */
  const _USR_KEY = 'stencil_user_v1';

  async function _restoreSession(){
    const tok = localStorage.getItem(_JWT_KEY);
    if(!tok){ return; }

    /* ── Fast path: cached user → show app INSTANTLY, validate in background ── */
    let cachedUsr = null;
    try{ const s=localStorage.getItem(_USR_KEY); if(s) cachedUsr=JSON.parse(s); }catch(e){}

    if(cachedUsr && cachedUsr.username){
      /* Rebuild user object from cache */
      let usr = users.find(u=>u.username===cachedUsr.username);
      if(!usr){ usr={id:cachedUsr.id,username:cachedUsr.username,name:cachedUsr.name||cachedUsr.username,role:cachedUsr.role,biller:cachedUsr.biller||'',password:''}; users.push(usr); }
      usr.role=cachedUsr.role; usr.name=cachedUsr.name||cachedUsr.username; usr.id=cachedUsr.id; if(cachedUsr.biller) usr.biller=cachedUsr.biller;
      _authReady=true; currentUser=usr;
      _applyPerms({id:usr.id,permissions:cachedUsr.permissions||[]});
      /* Override any stale oms_session that restoreSession may have used */
      try{sessionStorage.setItem('oms_session',JSON.stringify({id:usr.id,username:usr.username}));}catch(ex){}
      /* Immediately update sidebar DOM in case restoreSession already rendered wrong user */
      try{
        const av=document.getElementById('sbAvatar'); const nm=document.getElementById('sbName'); const rl=document.getElementById('sbRole');
        if(av) av.textContent=(usr.name||usr.username).charAt(0).toUpperCase();
        if(nm) nm.textContent=usr.name||usr.username;
        if(rl && typeof getRoleLabel==='function') rl.textContent=getRoleLabel(usr.role);
      }catch(ex){}

      /* Reveal the app IMMEDIATELY with skeletons (same as fresh login); data
         streams in behind and _loadAll(true) migrates + persists when done. */
      _revealInstant();
      if(typeof _startPoll==='function') _startPoll();
      _loadAll(true);

      /* Validate JWT quietly in the background — log out only on an explicit 401 */
      _req('GET','/api/auth/me').then(r=>{
        const au=r.user;
        let u2=users.find(u=>u.username===au.username);
        if(u2){ u2.role=au.role; u2.name=au.name||au.username; u2._id=au._id; /* do NOT overwrite sequential u2.id */ }
        localStorage.setItem(_USR_KEY,JSON.stringify({id:au._id||au.id,username:au.username,name:au.name||au.username,role:au.role,permissions:au.permissions||[]}));
      }).catch(e=>{
        if(e.status===401){
          localStorage.removeItem(_JWT_KEY); localStorage.removeItem(_USR_KEY);
          _authReady=false; window.doLogout ? window.doLogout() : location.reload();
        }
      });
      return;
    }

    /* ── Slow path: no cache → wait for API (first login or cache cleared) ── */
    const lerr=document.getElementById('lerr');
    const _msg=(txt,col)=>{ if(!lerr) return; lerr.style.display='block'; lerr.style.color=col||'#64748b'; lerr.textContent=txt; };
    _msg('Restoring session…');

    const delays=[0,3000,6000,10000,15000];
    for(let attempt=0;attempt<delays.length;attempt++){
      if(delays[attempt]>0){ _msg('Connecting to server… ('+attempt+'/4)'); await new Promise(r=>setTimeout(r,delays[attempt])); }
      try{
        const r=await _req('GET','/api/auth/me');
        const au=r.user;
        if(lerr){ lerr.style.display='none'; }
        let usr=users.find(u=>u.username===au.username);
        if(!usr){ usr={id:au._id||au.id,username:au.username,name:au.name||au.username,role:au.role,password:''}; users.push(usr); }
        usr.role=au.role; usr.name=au.name||au.username; usr.id=au._id||au.id; if(au.biller) usr.biller=au.biller;
        try{ localStorage.setItem(_USR_KEY,JSON.stringify({id:usr.id,username:usr.username,name:usr.name,role:usr.role,biller:usr.biller||'',permissions:au.permissions||[]})); }catch(e){}
        await _loadAll();
        await _migrateFromLocalStorage();
        _launchApp(usr,au);
        return;
      }catch(e){
        if(e.status===401){
          localStorage.removeItem(_JWT_KEY); localStorage.removeItem(_USR_KEY);
          if(lerr) lerr.style.display='none';
          return;
        }
        if(attempt===delays.length-1){
          _msg('Server unavailable. Please try logging in again.','#ef4444');
          setTimeout(()=>{ if(lerr) lerr.style.display='none'; },4000);
        }
      }
    }
  }

  /* ════ OVERRIDE: doLogin ════ */
  window.doLogin=async function(){
    const u=(document.getElementById('lusr').value||'').trim();
    const p=(document.getElementById('lpwd').value||'').trim();
    const lerr=document.getElementById('lerr');
    const btn=document.getElementById('loginBtn');
    const loader=document.getElementById('appLoader');
    const alText=document.getElementById('alText'), alSub=document.getElementById('alSub');
    const _btnHTML = btn ? btn.innerHTML : '';
    if(lerr){lerr.style.display='none';lerr.style.color='';}
    /* Button spinner covers the quick credential check */
    if(btn){ btn.disabled=true; btn.innerHTML='<span class="btn-spin"></span> Signing in…'; }
    try{
      const r=await _req('POST','/api/auth/login',{username:u,password:p});   /* ~0.5s */
      localStorage.setItem(_JWT_KEY,r.token);
      const au=r.user;
      let usr=users.find(x=>x.username===au.username);
      if(!usr){usr={id:au.id,username:au.username,name:au.name||au.username,role:au.role,biller:au.biller||'',password:''};users.push(usr);}
      usr.role=au.role; usr.name=au.name||au.username; usr.id=au._id||au.id;
      _authReady=true;
      currentUser=usr;
      _applyPerms({id:usr.id,permissions:au.permissions});
      try{
        sessionStorage.setItem('oms_session',JSON.stringify({id:usr.id,username:usr.username}));
        localStorage.setItem(_USR_KEY,JSON.stringify({id:usr.id,username:usr.username,name:usr.name,role:usr.role,permissions:au.permissions||[]}));
      }catch(e){}
      /* ── Logged in — reveal the app IMMEDIATELY with skeletons; data streams in behind ── */
      if(loader) loader.classList.remove('show');
      if(btn){ btn.disabled=false; btn.innerHTML=_btnHTML; }
      _revealInstant();
      _startPoll();
      if(typeof audit==='function')
        audit('LOGIN',`Logged in as ${usr.name||usr.username} (${typeof getRoleLabel==='function'?getRoleLabel(usr.role):usr.role})`,'user',usr.id);
      _loadAll(true);   /* NOT awaited: orders page 1 fills in, then the rest streams in */
    }catch(e){
      if(loader) loader.classList.remove('show');
      if(btn){ btn.disabled=false; btn.innerHTML=_btnHTML||'🔐 Sign In'; }
      if(lerr){
        lerr.style.display='block'; lerr.style.color='';
        lerr.textContent=(e.message||'').toLowerCase().includes('invalid')||e.status===401
          ?'Wrong username or password.':'Login failed. Please try again.';
      }
    }
  };

  /* ════ OVERRIDE: doLogout ════ */
  window.doLogout=function(){
    _stopPoll();
    if(typeof _stopStream==='function') _stopStream();
    _authReady=false;
    localStorage.removeItem(_JWT_KEY);
    localStorage.removeItem(_USR_KEY);
    currentUser=null;
    try{sessionStorage.removeItem('oms_session');}catch(e){}
    document.getElementById('app').style.display='none';
    document.getElementById('loginScreen').style.display='flex';
    const lu=document.getElementById('lusr'),lp=document.getElementById('lpwd');
    if(lu) lu.value=''; if(lp) lp.value='';
  };

  /* ════ LIVE POLL — auto-refresh orders every 30s ════ */
  let _pollTimer=null;
  let _polling=false;
  async function _pollOrders(){
    if(_polling||_syncing) return;
    // Don't poll if any form input is focused (user is typing) or any modal is open
    const focused=document.activeElement;
    if(focused&&['INPUT','TEXTAREA','SELECT'].includes(focused.tagName)) return;
    if([...document.querySelectorAll('.modal,.overlay')].some(m=>m.offsetWidth>0&&m.offsetHeight>0)) return;
    _polling=true;
    try{
      let all=[],page=1,pages=1;
      while(page<=pages&&page<=50){
        const r=await _req('GET',`/api/orders?page=${page}&limit=200`);
        all=all.concat(r.data||[]); pages=r.pages||1; page++;
      }
      // Deduplicate (same logic as _loadAll)
      const _SORD2=['Order','Approved','PO Raised','In Transit','At Transporter','Warehouse','GRN','Purchased','Billed','Cancelled'];
      const _sp2=s=>{const i=_SORD2.indexOf(s);return i>=0?i:-1;};
      const _sk=new Map(); const _dd=[];
      for(const o of all){
        const key=(o.customer||'')+'|'+(o.product||o.orderedCode||'')+'|'+(o.qty||0)+'|'+(o.orderDate||'')+'|'+(o.biller||'')+'|'+(o.createdBy||'');
        if(!_sk.has(key)){_sk.set(key,{o,sp:_sp2(o.status),sq:o.seqId||0});_dd.push(o);}
        else{const p=_sk.get(key);const cs=_sp2(o.status);const cq=o.seqId||0;if(cs>p.sp||(cs===p.sp&&cq>p.sq)){const pi=_dd.indexOf(p.o);if(pi>=0)_dd[pi]=o;_sk.set(key,{o,sp:cs,sq:cq});}}
      }
      const fresh=_dd.map(_toLocal);
      // Check if anything changed
      const oldStr=JSON.stringify(orders.map(o=>o._id+'|'+(o.updatedAt||'')+'|'+o.status+':'+o.id).sort());
      const newStr=JSON.stringify(fresh.map(o=>o._id+'|'+(o.updatedAt||'')+'|'+o.status+':'+o.id).sort());
      if(oldStr!==newStr){
        // Merge: keep local unsaved changes, update everything else
        const localDirty=new Set(Object.keys(_snap).filter(id=>_snap[id]!==JSON.stringify(orders.find(o=>String(o.id)===String(id)))));
        const _gNow=Date.now();
        orders=fresh.map(f=>{
          const _fid=String(f.id);
          const _local=orders.find(o=>String(o.id)===_fid);
          // (1) Unsynced local change — our write hasn't been confirmed by the server
          //     yet, so never let a poll clobber it.
          if(localDirty.has(_fid)) return _local||f;
          // (2) We changed this order recently. A cached or replica-lagged read can
          //     still return the PRE-edit row and would visibly revert us (e.g. Approved
          //     snapping back to Order). Only accept the server copy once its version
          //     (updatedAt) has actually moved PAST the version our edit was based on —
          //     meaning the server truly reflects a newer write (ours or someone else's).
          //     Same-old updatedAt == stale read → keep local. Server-vs-server compare,
          //     so immune to client/server clock skew. 120s hard backstop against a stuck
          //     baseline (a genuinely dropped write is still protected by branch 1).
          const _touched=_localTouch[_fid];
          if(_touched && (_gNow-_touched<120000)){
            const _base=_verSeen[_fid], _fv=f.updatedAt;
            const _advanced=_base&&_fv&&(new Date(_fv).getTime()>new Date(_base).getTime());
            if(!_advanced) return _local||f;
          }
          // Accept the server copy; adopt its version as our new baseline.
          if(f.updatedAt) _verSeen[_fid]=f.updatedAt;
          _snap[f.id]=JSON.stringify(f);
          return f;
        });
        // Show subtle update indicator
        const dot=document.createElement('div');
        dot.style.cssText='position:fixed;top:10px;right:10px;background:#10b981;color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;z-index:99999;opacity:1;transition:opacity 1s';
        dot.textContent='🔄 Updated';
        document.body.appendChild(dot);
        setTimeout(()=>{dot.style.opacity='0';setTimeout(()=>dot.remove(),1000);},2000);
        // Re-render current page
        if(typeof renderPage==='function'&&currentPage) renderPage(currentPage);
        if(typeof buildSidebar==='function') buildSidebar();
      }
    }catch(e){console.warn('poll:',e);}
    finally{_polling=false;}
  }
  function _startPoll(){
    if(_pollTimer) clearInterval(_pollTimer);
    _pollTimer=setInterval(_pollOrders,30000); // every 30 seconds
  }
  function _stopPoll(){if(_pollTimer){clearInterval(_pollTimer);_pollTimer=null;}}

  /* ════ LIVE STREAM (SSE) — instant push, falls back to the 30s poll ════ */
  let _es=null, _liveDebounce=null;
  function _startStream(){
    if(_es) return;
    try{
      _es=new EventSource(_API+'/api/stream');
      _es.addEventListener('order', ()=>{ clearTimeout(_liveDebounce); _liveDebounce=setTimeout(()=>{ try{_pollOrders();}catch(e){} }, 400); });
    }catch(e){}
  }
  function _stopStream(){ if(_es){ try{_es.close();}catch(e){} _es=null; } }


  /* Watchdog: guarantee live poll + stream are running whenever a user is logged in,
     regardless of which session-restore / render path showed the app. Self-heals every 5s. */
  setInterval(function(){
    try{
      if(localStorage.getItem(_JWT_KEY)){
        if(!_pollTimer) _startPoll();
        if(!_es) _startStream();
      }
    }catch(e){}
  }, 5000);

  /* ════ ORDER SYNC ════ */
  let _syncTimer=null;
  let _syncing=false;   /* semaphore — prevents concurrent POST duplicates */
  let _syncQueued=false; /* if a sync was requested while one was running, run again after */
  let _lastSaveErrAt=0;  /* throttle for the "couldn't save" toast */
  const _snap={};
  const _localTouch={}; /* id → last local-change time (ms); guards recent edits from stale-read reverts */
  const _verSeen={};    /* id → the server updatedAt our current view/edit is based on.
                           A poll only overwrites a locally-changed order once the server's
                           updatedAt moves PAST this baseline — i.e. the server genuinely has
                           a newer write. A stale/cached read (same old updatedAt) can never
                           revert us. Compares server-vs-server, so no clock-skew risk. */
  async function _syncOrders(){
    if(_syncing){ _syncQueued=true; return; }
    _syncing=true; _syncQueued=false;
    try{
      for(const o of orders){
        let cur=JSON.stringify(o);
        if(_snap[o.id]===cur) continue;
        try{
          if(!o._id){
            const _oldId=o.id, _oldGroup=o.groupDonId;
            const _api=_toAPI(o); /* create: send full */
            /* The DON of a brand-new group is a LOCAL guess (nextOrderId), which is
               identical for every user who loaded together — so two users stamp the
               same DON. For the group PRIMARY (groupDonId === its own local id), drop
               the guess so the backend stamps its globally-unique seqId as the DON.
               Split/added lines carry an already-real shared DON and keep it. */
            if(_oldGroup===_oldId) _api.groupDonId=null;
            const r=await _req('POST','/api/orders',_api);
            if(r.data){
              o._id=r.data._id;
              o.id=r.data.seqId||o.id;
              /* The DON (groupDonId) was assigned from a LOCAL nextOrderId counter,
                 which is identical for every user who loaded at the same time — so
                 two users stamp the same DON. Adopt this order's server-assigned
                 (globally unique) seqId as the DON for its whole group. Only the
                 group PRIMARY (the line whose DON == its own local id) drives this;
                 split/added lines carry an existing real DON and are left alone. */
              if(_oldGroup===_oldId && o.id!==_oldGroup){
                const _newGroup=o.id;
                orders.forEach(x=>{
                  if((x.groupDonId||x.id)===_oldGroup){
                    x.groupDonId=_newGroup;
                    if(x!==o) _snap[x.id]=null; /* re-sync siblings with the new DON */
                  }
                });
              }
            }
          }else{
            /* PUT only the fields changed since our last sync — never a full
               stale snapshot — so we can't revert another user's concurrent
               change to a field we didn't touch (e.g. their status update). */
            const base=_snap[o.id]?JSON.parse(_snap[o.id]):null;
            const payload=base?_deltaAPI(base,o):_toAPI(o);
            if(Object.keys(payload).length){
              const r=await _req('PUT','/api/orders/'+o._id,payload);
              /* Adopt the server's fresh version stamp the instant the write returns —
                 but only if no concurrent local edit slipped in during the request.
                 This makes the poll's version-guard converge immediately, so a status
                 you just saved is confirmed in the DB and can never be reverted by a
                 later stale/cached read (no wait for the next poll to observe it). */
              if(r&&r.data&&r.data.updatedAt&&JSON.stringify(o)===cur){
                o.updatedAt=r.data.updatedAt; _verSeen[o.id]=r.data.updatedAt; cur=JSON.stringify(o);
              }
            }
          }
          // If the order changed while the request was in flight (e.g. you approved
          // right after creating it), the server only has the OLD state. Do NOT mark
          // it synced — otherwise a later poll reverts it. Leave it dirty and re-sync.
          if(JSON.stringify(o)===cur){
            _snap[o.id]=cur;
            _clearPending(o.id);
          }else{
            _syncQueued=true;
          }
        }catch(e){
          console.warn('order sync:',e);
          /* Make a failed save visible — the change stays pending and retries, but
             the user must know it isn't in the DB yet. Throttled; skip auth errors. */
          if(e&&e.status!==401){
            const _n=Date.now();
            if(_n-_lastSaveErrAt>8000){ _lastSaveErrAt=_n;
              if(typeof showToast==='function') showToast('⚠️ Couldn’t save to server — will retry','warning'); }
          }
        }
      }
    }finally{
      _syncing=false;
      if(_syncQueued) _syncOrders(); /* process any changes that arrived while we were busy */
    }
  }

  /* ════ OVERRIDE: persistOrders ════ */
  window.persistOrders=function(){
    try{localStorage.setItem('oms_orders_v3',JSON.stringify(orders));localStorage.setItem('oms_next_id',String(nextOrderId));}catch(e){}
    /* Mark all dirty orders as pending BEFORE async sync — survives refresh */
    try{
      const dirtyIds=orders.filter(o=>!_snap[o.id]||_snap[o.id]!==JSON.stringify(o)).map(o=>o.id);
      if(dirtyIds.length){ _markPending(dirtyIds); const _t=Date.now(); dirtyIds.forEach(id=>{
        _localTouch[id]=_t;
        /* Record the server version this edit is layered on top of (if not already
           tracking one) so a later poll knows when the server has truly moved past it. */
        if(_verSeen[id]==null){ const _o=orders.find(x=>x.id===id); if(_o&&_o.updatedAt) _verSeen[id]=_o.updatedAt; }
      }); }
    }catch(e){}
    clearTimeout(_syncTimer);
    _syncOrders(); /* fire-and-forget; semaphore prevents concurrent duplicates */
  };

  /* ════ OVERRIDE: saveCustomer ════ */
  const _origSaveCust=window.saveCustomer;
  window.saveCustomer=async function(){
    const wasEditing=typeof editingCustomer!=='undefined'?editingCustomer:null;
    _origSaveCust.call(this);
    const cust=wasEditing?customers.find(c=>c.id===wasEditing):customers[customers.length-1];
    if(!cust) return;
    try{
      const pl={name:cust.name,phone:cust.phone||'',email:cust.email||'',address:cust.addr||'',city:cust.city||'',contact:cust.contact||'',whatsapp:cust.whatsapp||'',salesExec:cust.salesExec||'',biller:cust.biller||'',manager:cust.manager||'',assignedSalesman:cust.salesExec||'',assignedBiller:cust.biller||''};
      if(cust._id){await _req('PUT','/api/customers/'+cust._id,pl);}
      else{const r=await _req('POST','/api/customers',pl);if(r.data)cust._id=r.data._id;}
    }catch(e){console.warn('customer sync:',e);if(typeof showToast==='function'){const m=e?.message||'Server error';showToast(m.toLowerCase().includes('duplicate')?'❌ Customer already exists':'❌ Customer not saved: '+m,'error');}}
  };

  /* ════ OVERRIDE: saveVendor ════ */
  const _origSaveVend=window.saveVendor;
  window.saveVendor=async function(){
    const wasEditing=typeof editingVendor!=='undefined'?editingVendor:null;
    _origSaveVend.call(this);
    const vend=wasEditing?vendors.find(v=>v.id===wasEditing):vendors[vendors.length-1];
    if(!vend) return;
    try{
      const pl={name:vend.name,city:vend.location||'',leadTimeDays:vend.deliveryDays||7,phone:vend.phone||'',whatsapp:vend.whatsapp||'',contact:vend.contact||''};
      if(vend._id){await _req('PUT','/api/suppliers/'+vend._id,pl);}
      else{const r=await _req('POST','/api/suppliers',pl);if(r.data)vend._id=r.data._id;}
    }catch(e){console.warn('vendor sync:',e);if(typeof showToast==='function'){const m=e?.message||'Server error';showToast(m.toLowerCase().includes('duplicate')?'❌ Vendor already exists':'❌ Vendor not saved: '+m,'error');}}
  };

  /* ════ OVERRIDE: saveProduct ════ */
  const _origSaveProd=window.saveProduct;
  window.saveProduct=async function(){
    const wasEditing=typeof editingProduct!=='undefined'?editingProduct:null;
    _origSaveProd.call(this);
    const prod=wasEditing?products.find(p=>p.id===wasEditing):products[products.length-1];
    if(!prod) return;
    try{
      const pl={name:prod.name,code:prod.code||'',category:prod.category||'',unit:prod.unit||'pcs',defaultVendor:prod.defaultVendor||'',parentCode:prod.parentCode||'',parentAlias:prod.parentAlias||''};
      if(prod._id){await _req('PUT','/api/products/'+prod._id,pl);}
      else{const r=await _req('POST','/api/products',pl);if(r.data)prod._id=r.data._id;}
    }catch(e){
      console.warn('product sync:',e);
      const msg=e?.message||'Server error';
      if(typeof showToast==='function'){
        if(msg.toLowerCase().includes('duplicate')||msg.toLowerCase().includes('code')){
          showToast('❌ Product code already exists — use a different code','error');
        } else if(e?.status===401){
          showToast('❌ Session expired — please log out and log back in','error');
        } else {
          showToast('❌ Product not saved to server: '+msg,'error');
        }
      }
    }
  };

  /* ════ OVERRIDE: saveTransporter ════ */
  const _origSaveTrans=window.saveTransporter;
  window.saveTransporter=async function(){
    const wasEditing=typeof editingTransporter!=='undefined'?editingTransporter:null;
    _origSaveTrans.call(this);
    const trans=wasEditing?transporters.find(t=>t.id===wasEditing):transporters[transporters.length-1];
    if(!trans) return;
    try{
      const pl={name:trans.name,type:trans.type||'',city:trans.location||'',avgTransitDays:trans.transitDays||0,phone:trans.phone||'',contact:trans.contact||'',whatsapp:trans.whatsapp||'',notes:trans.notes||''};
      if(trans._id){await _req('PUT','/api/transporters/'+trans._id,pl);}
      else{const r=await _req('POST','/api/transporters',pl);if(r.data)trans._id=r.data._id;}
    }catch(e){console.warn('transporter sync:',e);}
  };

  /* ════ OVERRIDE: saveUser — sync new/edited users to MongoDB ════ */
  const _origSaveUser = window.saveUser;
  window.saveUser = async function(){
    const wasEditing = typeof editingUser !== 'undefined' ? editingUser : null;
    /* Read password BEFORE the original closes the modal and clears fields */
    const pwd = (document.getElementById('umPwd')?.value||'').trim();
    _origSaveUser.call(this);
    const usr = wasEditing ? users.find(u=>u.id===wasEditing) : users[users.length-1];
    if(!usr) return;
    try{
      const pl = {
        name: usr.name,
        username: usr.username,
        email: usr.email || (usr.username+'@stencil.local'),
        role: usr.role,
        phone: usr.phone||'',
        departmentName: usr.departmentName||'',
        teamLeadName: usr.teamLeadName||''
      };
      // Only include ObjectId fields when they have a valid value (avoids Mongoose CastError)
      if(usr.departmentId) pl.department = usr.departmentId;
      if(usr.teamLeadId)   pl.teamLeadId = usr.teamLeadId;
      if(usr._id){
        await _req('PUT','/api/users/'+usr._id, pl);
      } else {
        const r = await _req('POST','/api/users',{...pl, password: pwd||'Stencil@123'});
        if(r.data) usr._id = r.data._id;
      }
    }catch(e){
      console.warn('user sync:',e);
      const msg=e?.message||'Server error. Please try again.';
      if(typeof showToast==='function') showToast('⚠️ User not saved: '+msg,'error');
    }
  };

  /* ════ OVERRIDE: delUser — soft-delete user in MongoDB ════ */
  const _origDelUser = window.delUser;
  window.delUser = async function(id){
    const usr = users.find(u=>u.id===id);
    const apiId = usr?._id;
    _origDelUser.call(this, id);
    if(!apiId) return;
    try{ await _req('DELETE','/api/users/'+apiId); }
    catch(e){ console.warn('user delete sync:',e); }
  };

  /* ════ OVERRIDE: delProduct — soft-delete product in MongoDB ════ */
  const _origDelProd = window.delProduct;
  window.delProduct = async function(id){
    const prod = products.find(p=>p.id===id);
    const apiId = prod?._id;
    _origDelProd.call(this, id);
    if(!apiId) return;
    try{ await _req('DELETE','/api/products/'+apiId); }
    catch(e){ console.warn('product delete sync:',e); }
  };

  /* ════ OVERRIDE: delCustomer — remove customer from MongoDB ════ */
  const _origDelCust = window.delCustomer;
  window.delCustomer = async function(id){
    const cust = customers.find(c=>c.id===id);
    const apiId = cust?._id;
    _origDelCust.call(this, id);
    if(!apiId) return;
    try{ await _req('DELETE','/api/customers/'+apiId); }
    catch(e){ console.warn('customer delete sync:',e); }
  };

  /* ════ OVERRIDE: delVendor — remove vendor from MongoDB ════ */
  const _origDelVend = window.delVendor;
  window.delVendor = async function(id){
    const vend = vendors.find(v=>v.id===id);
    const apiId = vend?._id;
    _origDelVend.call(this, id);
    if(!apiId) return;
    try{ await _req('DELETE','/api/suppliers/'+apiId); }
    catch(e){ console.warn('vendor delete sync:',e); }
  };

  /* ════ OVERRIDE: delTransporter — remove transporter from MongoDB ════ */
  const _origDelTransDel = window.delTransporter;
  window.delTransporter = async function(id){
    const trans = transporters.find(t=>t.id===id);
    const apiId = trans?._id;
    _origDelTransDel.call(this, id);
    if(!apiId) return;
    try{ await _req('DELETE','/api/transporters/'+apiId); }
    catch(e){ console.warn('transporter delete sync:',e); }
  };

  /* ════ OVERRIDE: saveDept / delDept — sync departments to MongoDB ════ */
  const _origSaveDept = window.saveDept;
  window.saveDept = async function(){
    const name = document.getElementById('dmName')?.value?.trim();
    const desc = document.getElementById('dmDesc')?.value?.trim()||'';
    if(!name) return;
    _origSaveDept.call(this);
    try{
      if(_editingDept){
        const d=departments.find(x=>(x._id||x.id)===_editingDept);
        if(d&&d._id) await _req('PUT','/api/departments/'+d._id,{name,description:desc});
      } else {
        const r=await _req('POST','/api/departments',{name,description:desc});
        if(r.data){
          const d=departments[departments.length-1];
          if(d) d._id=r.data._id;
        }
      }
    }catch(e){console.warn('dept sync:',e);}
  };
  const _origDelDept = window.delDept;
  window.delDept = async function(id){
    const d=departments.find(x=>(x._id||x.id)===id);
    const apiId=d?._id;
    _origDelDept.call(this,id);
    if(!apiId) return;
    try{ await _req('DELETE','/api/departments/'+apiId); }
    catch(e){console.warn('dept delete sync:',e);}
  };

  /* ════ OVERRIDE: _doRestoreFromFile — sync restored data to API ════
     The original only writes to localStorage then reloads.
     We intercept it: after writing localStorage, also push everything to MongoDB.
  ═══════════════════════════════════════════════════════════════════ */
  const _origRestoreFromFile = window._doRestoreFromFile;
  window._doRestoreFromFile = function(file){
    const reader = new FileReader();
    reader.onload = async function(e){
      let d;
      try{ d = JSON.parse(e.target.result); }
      catch(err){ if(typeof showToast==='function') showToast('❌ Failed to read file: '+err.message,'error'); return; }
      if(!d.orders){ if(typeof showToast==='function') showToast('⚠️ Invalid backup file — missing orders data','error'); return; }
      const exportedOn = d.exportedAt ? new Date(d.exportedAt).toLocaleString('en-IN') : 'unknown date';
      const exportedBy = d.exportedBy || 'unknown';
      if(!confirm('Restore backup?\n\nExported: '+exportedOn+'\nBy: '+exportedBy+'\n\nThis will REPLACE all current data and reload the page.')) return;

      /* 1 ── Write to localStorage (same as original) */
      try{localStorage.setItem('oms_orders_v1',JSON.stringify(d.orders||[]));}catch(ex){}
      try{localStorage.setItem('oms_nextOrderId_v1',String(d.nextOrderId||1));}catch(ex){}
      try{localStorage.setItem('oms_users_v1',JSON.stringify(d.users||[]));}catch(ex){}
      try{localStorage.setItem('vendors_v2',JSON.stringify(d.vendors||[]));}catch(ex){}
      try{localStorage.setItem('customers_v2',JSON.stringify(d.customers||[]));}catch(ex){}
      try{localStorage.setItem('products_v2',JSON.stringify(d.products||[]));}catch(ex){}
      try{localStorage.setItem('transporters_v1',JSON.stringify(d.transporters||[]));}catch(ex){}
      try{localStorage.setItem('oms_nextProductId',String(d.nextProductId||1));}catch(ex){}
      try{localStorage.setItem('oms_nextTransporterId',String(d.nextTransporterId||1));}catch(ex){}
      try{localStorage.setItem('oms_demo_seeded_v1','1');}catch(ex){}
      try{localStorage.setItem('oms_data_version','2');}catch(ex){}
      if(d.nextId) try{localStorage.setItem('oms_nextId_v1',JSON.stringify(d.nextId));}catch(ex){}

      /* 2 ── Sync to MongoDB API */
      if(typeof showToast==='function') showToast('⏳ Syncing to server… please wait','info');
      let synced=0, failed=0;

      /* Clear existing API data first so we don't get duplicates */
      /* (skip — we can't bulk-delete easily; rely on POST creating new records) */

      for(const c of (d.customers||[])){
        try{ await _req('POST','/api/customers',{name:c.name||'',phone:c.phone||'',email:c.email||'',address:c.addr||c.address||'',city:c.city||'',contact:c.contact||'',whatsapp:c.whatsapp||'',salesExec:c.salesExec||'',biller:c.biller||'',manager:c.manager||'',assignedSalesman:c.salesExec||'',assignedBiller:c.biller||''}); synced++; }
        catch(ex){ failed++; }
      }
      for(const v of (d.vendors||[])){
        try{ await _req('POST','/api/suppliers',{name:v.name||'',city:v.location||'',leadTimeDays:v.deliveryDays||7,phone:v.phone||'',whatsapp:v.whatsapp||'',contact:v.contact||''}); synced++; }
        catch(ex){ failed++; }
      }
      for(const p of (d.products||[])){
        try{ await _req('POST','/api/products',{name:p.name||'',code:p.code||'',category:p.category||'',unit:p.unit||'pcs',defaultVendor:p.defaultVendor||'',parentCode:p.parentCode||'',parentAlias:p.parentAlias||''}); synced++; }
        catch(ex){ failed++; }
      }
      for(const t of (d.transporters||[])){
        try{ await _req('POST','/api/transporters',{name:t.name||'',type:t.type||'',city:t.location||'',avgTransitDays:t.transitDays||0,phone:t.phone||'',contact:t.contact||'',whatsapp:t.whatsapp||'',notes:t.notes||''}); synced++; }
        catch(ex){ failed++; }
      }
      for(const o of (d.orders||[])){
        try{ await _req('POST','/api/orders',_toAPI(o)); synced++; }
        catch(ex){ failed++; }
      }

      if(typeof showToast==='function') showToast('✅ Synced '+synced+' records to server'+(failed?' ('+failed+' failed)':'')+'— reloading…','success');
      setTimeout(()=>location.reload(), 1500);
    };
    reader.readAsText(file);
  };

  /* ════ OVERRIDE: setOrdStageFilter — persist status filter across refresh ════ */
  const _origSetOrdStage = window.setOrdStageFilter;
  window.setOrdStageFilter = function(stage){
    if(typeof _origSetOrdStage==='function') _origSetOrdStage.call(this, stage);
    try{ sessionStorage.setItem(_ORD_FILTER_KEY, JSON.stringify(colFilters||{})); }catch(e){}
  };
  /* Also save filter when navigating to orders from dashboard KPI chips */
  const _origFilterAndGo = window.filterAndGoOrders;
  window.filterAndGoOrders = function(status){
    if(typeof _origFilterAndGo==='function') _origFilterAndGo.call(this, status);
    try{ sessionStorage.setItem(_ORD_FILTER_KEY, status ? JSON.stringify({status}) : '{}'); }catch(e){}
  };

  /* ════ ROBUST FILTER RESTORE: inject saved filter before the very first renderOrdersTable call ════ */
  /* This fires synchronously inside renderPage('orders') — no setTimeout race condition possible    */
  let _filterRestored = false;
  const _origRenderOrdTable = window.renderOrdersTable;
  window.renderOrdersTable = function(){
    if(!_filterRestored){
      _filterRestored = true;
      try{
        const sf = JSON.parse(sessionStorage.getItem(_ORD_FILTER_KEY)||'{}');
        if(sf.status && typeof colFilters !== 'undefined') colFilters['status'] = sf.status;
      }catch(e){}
    }
    if(typeof _origRenderOrdTable === 'function') return _origRenderOrdTable.call(this);
  };

  /* Clear saved filter when user explicitly clicks "Clear Filters" */
  const _origClearOrderFilters = window.clearOrderFilters;
  window.clearOrderFilters = function(){
    if(typeof _origClearOrderFilters === 'function') _origClearOrderFilters.call(this);
    try{ sessionStorage.setItem(_ORD_FILTER_KEY, '{}'); }catch(e){}
  };

  /* ════ OVERRIDE: _applyMasterImport — sync bulk-imported records to API ════
     Persists bulk master imports to MongoDB (not just localStorage).
     • Replace All: deletes the existing server records, then re-creates the
       imported set, so the database actually mirrors the upload.
     • New records are detected by a missing _id — NOT by local id, which can
       collide after a replace resets the id counter (the old bug that made
       Replace All silently skip every POST). ════════════════════════════════ */
  const _origApplyImport = window._applyMasterImport;
  const _impArr = t => t==='customers'?customers:t==='vendors'?vendors:t==='products'?products:transporters;
  window._applyMasterImport = async function(){
    /* Capture state BEFORE the import mutates the arrays */
    const type = _mapperState && _mapperState.type;
    const mode = (document.querySelector('input[name="imMode"]:checked')||{value:'add'}).value;
    /* Server _ids that exist right now — needed to remove them in replace mode */
    const oldServerIds = type ? _impArr(type).filter(r=>r._id).map(r=>r._id) : [];
    /* Snapshot already-synced records so update mode can detect edits → PUT them */
    const beforeJSON = {};
    if(type) _impArr(type).forEach(r=>{ if(r._id) beforeJSON[r.id]=JSON.stringify(r); });

    /* Run the original import (mutates arrays + localStorage, closes modal) */
    if(typeof _origApplyImport==='function') _origApplyImport.call(this);
    else return;
    if(!type) return;

    /* Endpoint + payload builders — mirror what restore-file-sync uses */
    const epMap = { customers:'/api/customers', vendors:'/api/suppliers', products:'/api/products', transporters:'/api/transporters' };
    const plMap = {
      customers:    r=>({name:r.name||'',phone:r.phone||'',email:r.email||'',address:r.addr||r.address||'',city:r.city||'',contact:r.contact||'',whatsapp:r.whatsapp||'',salesExec:r.salesExec||'',biller:r.biller||'',manager:r.manager||'',assignedSalesman:r.salesExec||'',assignedBiller:r.biller||''}),
      vendors:      r=>({name:r.name||'',city:r.location||'',leadTimeDays:parseInt(r.deliveryDays)||7,phone:r.phone||'',whatsapp:r.whatsapp||'',contact:r.contact||''}),
      products:     r=>({name:r.name||r.code||'',code:r.code||'',category:r.category||'',unit:r.unit||'pcs',defaultVendor:r.defaultVendor||'',parentCode:r.parentCode||'',parentAlias:r.parentAlias||''}),
      transporters: r=>({name:r.name||'',type:r.type||'',city:r.location||'',avgTransitDays:parseInt(r.transitDays)||0,phone:r.phone||'',contact:r.contact||'',whatsapp:r.whatsapp||'',notes:r.notes||''})
    };
    const ep = epMap[type], mkPl = plMap[type];
    if(!ep || !mkPl) return;
    const arr = _impArr(type);

    /* ── PRODUCTS: one bulk upsert instead of thousands of sequential POSTs.
         A large parent/child template expands to tens of thousands of rows;
         posting them one-by-one took many minutes and routinely died partway
         (tab closed / backend dropped), leaving most of the catalogue out of the
         DB. The /bulk endpoint upserts the whole set server-side in seconds. ── */
    if(type === 'products'){
      const items = arr.map(mkPl);
      if(typeof showToast==='function') showToast('⏳ Saving '+items.length+' products to server…','info');
      try{
        const res = await _req('POST', '/api/products/bulk', { items, mode: (mode==='replace'?'replace':'add') });
        /* Re-pull so local rows carry their server _ids (needed for later edits/deletes) */
        try{
          const rr = await _req('GET', '/api/products');
          if(rr && rr.data){
            products.length = 0;
            rr.data.forEach((p,i)=>products.push({id:i+1,_id:p._id,code:p.code||'',name:p.name||'',category:p.category||'',defaultVendor:p.defaultVendor||'',unit:p.unit||'pcs',parentCode:p.parentCode||'',parentAlias:p.parentAlias||''}));
            try{ if(typeof nextProductId!=='undefined') nextProductId = products.length+1; }catch(e){}
          }
        }catch(e){ console.warn('post-bulk product reload err:',e); }
        try{ if(typeof persistData==='function') persistData(); }catch(e){}
        try{ if(typeof renderPage==='function' && typeof currentPage!=='undefined') renderPage(currentPage); }catch(e){}
        const saved = res ? (res.activeTotal!=null ? res.activeTotal : ((res.upserted||0)+(res.modified||0))) : items.length;
        if(typeof showToast==='function') showToast('✅ '+saved+' products saved to the database','success');
      }catch(e){
        console.warn('bulk product import err:',e);
        if(typeof showToast==='function') showToast('⚠️ Products did not sync to server — '+((e&&e.message)||'request failed'),'warning');
      }
      return;
    }

    /* ── REPLACE ALL: clear server records, then re-create the imported set ── */
    if(mode === 'replace'){
      if(typeof showToast==='function') showToast('⏳ Replacing '+arr.length+' records on server…','info');
      let delFail=0;
      for(const id of oldServerIds){
        try{ await _req('DELETE', ep+'/'+id); }
        catch(e){ delFail++; console.warn('replace DELETE err:',e); }
      }
      /* The old _ids are gone — every local record must be (re)created on the server */
      arr.forEach(r=>{ r._id = undefined; });
      let ok=0, fail=0;
      for(const rec of arr){
        try{ const res = await _req('POST', ep, mkPl(rec)); if(res && res.data && res.data._id) rec._id = res.data._id; ok++; }
        catch(e){ fail++; console.warn('replace POST err:',e); }
      }
      try{ if(typeof persistData==='function') persistData(); }catch(e){}
      if(typeof showToast==='function'){
        showToast(fail ? ('⚠️ Replaced '+ok+' on server, '+fail+' failed') : ('✅ Replaced all on server — '+ok+' records saved'), fail?'warning':'success');
      }
      return;
    }

    /* ── ADD / UPDATE: POST new (no _id) + PUT edited existing ── */
    const newRecs = arr.filter(r => !r._id);
    const updRecs = (mode==='add') ? [] : arr.filter(r => r._id && beforeJSON[r.id]!==undefined && beforeJSON[r.id]!==JSON.stringify(r));
    if(!newRecs.length && !updRecs.length) return;

    if(typeof showToast==='function') showToast('⏳ Syncing '+(newRecs.length+updRecs.length)+' records to server…','info');
    let ok=0, fail=0;
    for(const rec of newRecs){
      try{ const res = await _req('POST', ep, mkPl(rec)); if(res && res.data && res.data._id) rec._id = res.data._id; ok++; }
      catch(e){ fail++; console.warn('bulk-import POST err:',e); }
    }
    for(const rec of updRecs){
      try{ await _req('PUT', ep+'/'+rec._id, mkPl(rec)); ok++; }
      catch(e){ fail++; console.warn('bulk-import PUT err:',e); }
    }
    try{ if(typeof persistData==='function') persistData(); }catch(e){}
    if(typeof showToast==='function'){
      showToast(fail ? ('⚠️ Synced '+ok+', failed '+fail) : ('✅ Synced '+ok+' records to server'), fail?'warning':'success');
    }
  };

  /* ── Start async session restore ── */
  _restoreSession();

})();
