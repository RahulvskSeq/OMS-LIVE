// ═══════════════════════════════════════════════════════
//  ENHANCEMENTS — injected
// ═══════════════════════════════════════════════════════

// ── Mobile sidebar ──
function toggleMobSidebar(){
  const sb=document.querySelector('.sidebar');
  const ov=document.getElementById('mobOverlay');
  if(!sb)return;
  const open=sb.classList.contains('mob-open');
  if(open){sb.classList.remove('mob-open');ov&&ov.classList.remove('open');}
  else{sb.classList.add('mob-open');ov&&ov.classList.add('open');}
}
function closeMobSidebar(){
  const sb=document.querySelector('.sidebar');
  const ov=document.getElementById('mobOverlay');
  sb&&sb.classList.remove('mob-open');
  ov&&ov.classList.remove('open');
}

// ── Notifications ──
let _notifs=[];let _notifNextId=1;
function _buildNotifs(){
  const now=new Date();
  const pending=orders.filter(o=>!['Billed','Cancelled'].includes(o.status));
  const newNotifs=[];
  pending.forEach(o=>{
    if(o.eta){
      const diff=Math.round((new Date(o.eta)-now)/(1000*86400));
      if(diff<0){
        newNotifs.push({id:_notifNextId++,type:'overdue',orderId:o.id,title:`⚠️ Overdue: DON-${o.id} ${o.customer}`,sub:`${Math.abs(diff)} days past ETA · Status: ${o.status}`,read:false,ts:new Date().toISOString()});
      } else if(diff<=3){
        newNotifs.push({id:_notifNextId++,type:'warn',orderId:o.id,title:`⏰ Due Soon: DON-${o.id} ${o.customer}`,sub:`ETA in ${diff} day${diff===1?'':'s'} · Status: ${o.status}`,read:false,ts:new Date().toISOString()});
      }
    }
  });
  _notifs=newNotifs;
  refreshNotifBell();
}
function refreshNotifBell(){
  const badge=document.getElementById('notifBadge');
  const unread=_notifs.filter(n=>!n.read).length;
  if(badge){badge.textContent=unread>9?'9+':unread;badge.style.display=unread>0?'flex':'none';}
}
function toggleNotifDrop(){
  const drop=document.getElementById('notifDrop');
  if(!drop)return;
  const isOpen=drop.classList.contains('open');
  document.querySelectorAll('.notif-drop.open').forEach(d=>d.classList.remove('open'));
  if(!isOpen){drop.classList.add('open');renderNotifBody();}
}
document.addEventListener('click',e=>{
  const wrap=document.getElementById('notifBellWrap');
  if(wrap&&!wrap.contains(e.target)){const d=document.getElementById('notifDrop');if(d)d.classList.remove('open');}
});
function renderNotifBody(){
  const body=document.getElementById('notifBody');
  if(!body)return;
  if(!_notifs.length){body.innerHTML='<div style="padding:24px;text-align:center;color:#94a3b8;font-size:13px">✅ No alerts right now</div>';return;}
  body.innerHTML=_notifs.map(n=>`
    <div class="notif-item ${n.read?'':'unread'}" onclick="_dismissNotif(${n.id})">
      <div class="ni-title">${n.title}</div>
      <div class="ni-sub">${n.sub}</div>
    </div>`).join('');
}
function _dismissNotif(id){
  const n=_notifs.find(x=>x.id===id);
  if(n)n.read=true;
  refreshNotifBell();renderNotifBody();
}
function markAllNotifsRead(){
  _notifs.forEach(n=>n.read=true);
  refreshNotifBell();renderNotifBody();
}


// ═══════════════════════════════════════
//  MASTERS ANALYTICS
// ═══════════════════════════════════════

let _rptMainTab='overview';

function _rptSwitchTab(tab){
  _rptMainTab=tab;
  ['overview','transport','sku','supplier','customer'].forEach(t=>{
    const btn=document.getElementById('rptTabBtn-'+t);
    const pane=document.getElementById('rptTab-'+t);
    if(btn) btn.classList.toggle('rpt-main-tab-active',t===tab);
    if(pane) pane.style.display=t===tab?'block':'none';
  });
  if(tab==='transport') _renderTransporterAnalytics();
  else if(tab==='sku')  _renderSkuAnalytics();
  else if(tab==='supplier') _renderSupplierAnalytics();
  else if(tab==='customer') _renderCustomerAnalytics();
  else renderReports();
}

// ── Helpers ──
function _maGetBilledAt(o){
  if(!o.trail)return null;
  const e=o.trail.slice().reverse().find(t=>t.type==='status'&&t.to==='Billed');
  return e?e.at:null;
}
function _maGetDispatchAt(o){ return o.transitDetails?.at||null; }
function _maDaysBetween(a,b){ return Math.round((new Date(b)-new Date(a))/(864e5)); }
function _maKpi(val,lbl,sub,color='#1a73e8'){
  return`<div class="ma-kpi" style="border-left-color:${color}">
    <div class="ma-val">${val}</div>
    <div class="ma-lbl">${lbl}</div>
    ${sub?`<div class="ma-sub" style="color:${color}">${sub}</div>`:''}
  </div>`;
}
function _maScoreBadge(pct){
  const cls=pct>=80?'score-green':pct>=50?'score-amber':'score-red';
  const icon=pct>=80?'✅':pct>=50?'⚠️':'❌';
  return`<span class="score-badge ${cls}">${icon} ${pct}%</span>`;
}
function _maBarRow(label,val,max,color,sub=''){
  const pct=max>0?Math.round(val/max*100):0;
  return`<tr>
    <td style="min-width:140px;font-weight:600;color:#1e293b">${label}</td>
    <td style="width:220px">
      <div class="ma-bar-bg"><div class="ma-bar-fill" style="width:${pct}%;background:${color}"></div></div>
    </td>
    <td style="font-size:12px;font-weight:800;color:${color};padding-left:8px">${val}</td>
    <td style="font-size:11px;color:#94a3b8">${sub}</td>
  </tr>`;
}



// ═══════════════════════════════════════════════════════
//  ⊞ DASHBOARD LAYOUT — drag to reorder, sizes locked
// ═══════════════════════════════════════════════════════
const LS_DASH_ORDER='oms_dash_order_v2'; // v2 = per-user keyed store
window._dashEditMode=false;
const _DASH_DEFAULT_ORDER=['pipeline','don','spo','dealer','supplier','recent'];

const _SWAP_CARDS=['don','spo','dealer','supplier','recent'];
// Per-user layout store: { userId: ['don','spo','dealer','recent'] }
let _dashOrderStore=(()=>{
  try{
    const s=localStorage.getItem(LS_DASH_ORDER);
    if(s){const o=JSON.parse(s);if(o&&typeof o==='object'&&!Array.isArray(o))return o;}
  }catch(e){}
  return {};
})();

function _getDashOrder(){
  if(!currentUser)return [..._SWAP_CARDS];
  const o=_dashOrderStore[currentUser.id];
  if(Array.isArray(o)&&o.length===_SWAP_CARDS.length&&_SWAP_CARDS.every(c=>o.includes(c)))return o;
  return [..._SWAP_CARDS];
}

function _saveDashOrder(){
  const grid=document.getElementById('dashGrid');
  if(!grid||!currentUser)return;
  // Read data-card from slots 2-5 in DOM order (pipeline slot 1 is always fixed)
  const order=[...grid.querySelectorAll('.dash-cw:not([data-slot="1"])')].map(el=>el.dataset.card);
  _dashOrderStore[currentUser.id]=order;
  try{localStorage.setItem(LS_DASH_ORDER,JSON.stringify(_dashOrderStore));}catch(e){}
}

function _applyDashOrder(){
  const grid=document.getElementById('dashGrid');
  if(!grid)return;
  const desired=_getDashOrder(); // e.g. ['spo','don','recent','dealer']
  // Get the 4 swappable slots in DOM order (skip pipeline slot)
  const slots=[...grid.querySelectorAll('.dash-cw:not([data-slot="1"])')];
  if(slots.length!==4)return;
  // Place each desired card into its slot via content-swaps
  desired.forEach((wantedCard,i)=>{
    if(slots[i].dataset.card===wantedCard)return; // already correct
    // Find the slot currently holding wantedCard (at index >= i)
    const srcIdx=slots.findIndex((s,j)=>j>i&&s.dataset.card===wantedCard);
    if(srcIdx===-1)return;
    // Swap content only (slot wrappers stay put)
    const cardA=slots[i].dataset.card, cardB=slots[srcIdx].dataset.card;
    const htmlA=slots[i].innerHTML, htmlB=slots[srcIdx].innerHTML;
    slots[i].innerHTML=htmlB; slots[i].dataset.card=cardB;
    slots[srcIdx].innerHTML=htmlA; slots[srcIdx].dataset.card=cardA;
  });
}

function _initDashGrid(){
  _rebuildDashRows(); // build row-based layout from saved config
  _initDashDragDrop();
}

function _initDashDragDrop(){
  const grid=document.getElementById('dashGrid');
  if(!grid)return;
  let _src=null;

  grid.addEventListener('dragstart',e=>{
    const cw=e.target.closest('.dash-cw');
    if(!cw||!window._dashEditMode)return;
    // Only the 4 lower cards are swappable; pipeline is fixed
    const _sw=new Set(['don','spo','dealer','recent']);
    if(!_sw.has(cw.dataset.card)){e.preventDefault();return;}
    _src=cw;
    cw.classList.add('drag-src');
    e.dataTransfer.effectAllowed='move';
  });

  grid.addEventListener('dragend',()=>{
    if(_src){_src.classList.remove('drag-src');_src=null;}
    grid.querySelectorAll('.drag-over').forEach(el=>el.classList.remove('drag-over'));
  });

  grid.addEventListener('dragover',e=>{
    e.preventDefault();
    e.dataTransfer.dropEffect='move';
    const cw=e.target.closest('.dash-cw');
    grid.querySelectorAll('.drag-over').forEach(el=>el.classList.remove('drag-over'));
    const _sw4=new Set(['don','spo','dealer','recent']);
    if(cw&&cw!==_src&&(_sw4.has(cw.dataset.card)||cw.classList.contains('dash-slot-placeholder')))
      cw.classList.add('drag-over');
  });

  grid.addEventListener('drop',e=>{
    e.preventDefault();
    if(!_src)return;

    // Primary: find slot under cursor via DOM
    let target=e.target.closest('.dash-cw');

    // Fallback: cursor may be over the CSS-grid gap — find nearest slot by position
    if(!target){
      const slots=[...grid.querySelectorAll('.dash-cw[data-slot]:not([data-slot="1"])')];
      let best=null,bestDist=Infinity;
      slots.forEach(sl=>{
        const r=sl.getBoundingClientRect();
        if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom){
          best=sl; bestDist=0;
        } else {
          const dx=Math.max(r.left-e.clientX, 0, e.clientX-r.right);
          const dy=Math.max(r.top -e.clientY, 0, e.clientY-r.bottom);
          const d=Math.hypot(dx,dy);
          if(d<bestDist&&d<60){bestDist=d;best=sl;}
        }
      });
      target=best;
    }

    if(!target||target===_src)return;
    target.classList.remove('drag-over');

    // Guard: pipeline slot is fixed
    if(target.dataset.slot==='1'||_src.dataset.slot==='1')return;
    const swappable=new Set(['don','spo','dealer','recent']);
    if(!swappable.has(_src.dataset.card))return;

    _swapSlotContent(_src, target);
    _saveDashOrder();
  });

  // ── CLICK-TO-SWAP / CLICK-TO-MOVE ──
  // Click a card → selects it (blue glow)
  // Click another card → swaps them
  // Click an empty placeholder slot → moves the selected card there
  let _swapSel=null;
  grid.addEventListener('click',e=>{
    if(!window._dashEditMode)return;
    // Ignore clicks on interactive elements inside the card
    if(e.target.closest('button,input,select,a,label'))return;
    const cw=e.target.closest('.dash-cw');
    if(!cw||cw.dataset.slot==='1')return; // pipeline is fixed

    const isEmpty=cw.classList.contains('dash-slot-placeholder');

    if(!_swapSel){
      if(isEmpty)return; // nothing selected yet, can't select an empty slot
      _swapSel=cw;
      cw.classList.add('swap-selected');
      showToast('Now click any other card to swap · or click an empty slot to move','info');
    } else if(_swapSel===cw){
      _swapSel.classList.remove('swap-selected');
      _swapSel=null;
    } else if(isEmpty){
      // Move selected card into empty placeholder slot
      _swapSel.classList.remove('swap-selected');
      const srcCard=_swapSel.dataset.card;
      const tgtCard=cw.dataset.card;
      const srcHTML=_swapSel.innerHTML;
      cw.innerHTML=srcHTML; cw.dataset.card=srcCard;
      cw.classList.remove('dash-slot-placeholder');
      _swapSel.innerHTML='<div class="dash-card"></div>';
      _swapSel.dataset.card=tgtCard;
      _swapSel.classList.add('dash-slot-placeholder');
      _rerenderCard(srcCard);
      _saveDashOrder();
      _swapSel=null;
      showToast('Card moved ✓','success');
    } else {
      // Swap two real cards
      _swapSel.classList.remove('swap-selected');
      _swapSlotContent(_swapSel,cw);
      _saveDashOrder();
      _swapSel=null;
      showToast('Cards swapped ✓','success');
    }
  });

  // Make cards draggable only in edit mode
  _refreshDragAttribs();
}

// Swap the inner content + data-card between two slot wrappers.
// The slot wrapper itself (with its fixed span2/height via data-slot) never moves.
function _swapSlotContent(a, b){
  const cardA=a.dataset.card, cardB=b.dataset.card;
  const htmlA=a.innerHTML,    htmlB=b.innerHTML;
  const phA=a.classList.contains('dash-slot-placeholder');
  const phB=b.classList.contains('dash-slot-placeholder');
  a.innerHTML=htmlB; a.dataset.card=cardB;
  b.innerHTML=htmlA; b.dataset.card=cardA;
  // Swap placeholder class so the empty-slot visual follows the empty content
  a.classList.toggle('dash-slot-placeholder', phB);
  b.classList.toggle('dash-slot-placeholder', phA);
  // Re-render both cards so lists reflect new slot dimensions
  _rerenderCard(cardA);
  _rerenderCard(cardB);
}
function _rerenderCard(cardName){
  if(cardName==='don')    renderDashDonList();
  else if(cardName==='spo')    renderDashVpoList();
  else if(cardName==='dealer')    renderDealerSummary();
  else if(cardName==='supplier')  renderSupplierSummary();
  else if(cardName==='recent')    renderDashOrders();
}

function _refreshDragAttribs(){
  const grid=document.getElementById('dashGrid');
  if(!grid)return;
  grid.querySelectorAll('.dash-cw').forEach(el=>{
    // Slots 2-5 are swappable; slot 1 (pipeline) is always fixed
    const isSwappable=el.dataset.slot!=='1'&&el.dataset.slot!==undefined;
    el.draggable=window._dashEditMode&&isSwappable;
  });
}

function _toggleDashEditMode(){
  window._dashEditMode=!window._dashEditMode;
  _refreshDragAttribs();

  const grid=document.getElementById('dashGrid');
  if(grid) grid.classList.toggle('dash-grid-edit',window._dashEditMode);

  if(window._dashEditMode){
    // Reveal hidden slots as dashed placeholders so user can move cards into them
    grid&&grid.querySelectorAll('.dash-cw[data-slot]').forEach(el=>{
      if(el.style.display==='none'){
        el.style.display='';
        el.classList.add('dash-slot-placeholder');
      }
    });
  } else {
    // Re-apply visibility prefs (hides slots that should stay hidden)
    grid&&grid.querySelectorAll('.dash-cw.dash-slot-placeholder').forEach(el=>{
      el.classList.remove('dash-slot-placeholder');
    });
    _applyDashPrefs();
  }

  const banner=document.getElementById('dashEditBanner');
  if(banner) banner.classList.toggle('show',window._dashEditMode);

  const btn=document.getElementById('dashEditLayoutBtn');
  if(btn){
    if(window._dashEditMode){
      btn.innerHTML='<span style="font-size:14px">✓</span> Done';
      btn.style.background='#1a73e8';
      btn.style.borderColor='#1a73e8';
      btn.style.color='#fff';
    }else{
      btn.innerHTML='<span style="font-size:14px">⊞</span> Edit Layout';
      btn.style.background='#fff';
      btn.style.borderColor='#e2e8f0';
      btn.style.color='#475569';
    }
  }
  if(!window._dashEditMode) showToast('Layout saved ✓','success');
}

function _resetDashGridLayout(){
  if(currentUser){
    delete _dashRowsStore[currentUser.id];
    try{localStorage.setItem(LS_DASH_ROWS,JSON.stringify(_dashRowsStore));}catch(e){}
  }
  _rebuildDashRows();
  showToast('Layout reset to default','info');
}

// ── AI Copy cache ──
let _maLastStats={transport:null, sku:null, supplier:null, customer:null};

// ── Masters-page AI deep-dive (computes stats live, no cache needed) ──
function _masterAI(type, entityName){
  const now=new Date();
  const ts=now.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})+' '+now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  const app=sysSettings?.appName||'Order Management System';
  const company=sysSettings?.companyName||'Your Company';
  const today=new Date().toISOString().slice(0,10);
  const preamble=(title,chartList)=>
`You are a data visualization expert.
I will give you real order data for one specific entity from ${company} (${app}).

YOUR TASK: Produce a single complete self-contained HTML file that:
1. Loads Chart.js 4 from CDN: https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js
2. Renders these 5 charts using the embedded data:
${chartList}
3. Shows a KPI summary row at the top (cards with key numbers and icons)
4. Clean professional layout: white cards, #1e293b headings, subtle shadows
5. Dark header: "${title}" | ${company} | Exported: ${ts}
6. All data embedded inline — no fetch calls
7. Each chart has a title, tooltip, and legend
8. Page works when saved as .html and opened in any browser

DATA (embed as JavaScript directly in your <script> tag):
`;
  let text='';
  if(type==='customer'){
    const co=orders.filter(o=>o.customer===entityName);
    if(!co.length){showToast('No orders found for '+entityName,'warning');return;}
    const del=co.filter(o=>o.status==='Billed').length;
    const act=co.filter(o=>!['Billed','Cancelled'].includes(o.status)).length;
    const ovd=co.filter(o=>!['Billed','Cancelled'].includes(o.status)&&o.eta&&o.eta<today).length;
    const can_=co.filter(o=>o.status==='Cancelled').length;
    const qty=co.reduce((s,o)=>s+(Number(o.qty)||0),0);
    const skus=[...new Set(co.map(o=>o.orderedCode||o.product))];
    const sups=[...new Set(co.map(o=>o.vendor))];
    const dates=co.map(o=>o.orderDate).filter(Boolean).sort();
    const jsData=`const customer=${JSON.stringify({name:entityName,totalOrders:co.length,totalUnits:qty,billed:del,active:act,overdue:ovd,cancelled:can_,deliveryRate:Math.round(del/co.length*100),uniqueSkus:skus.length,uniqueSuppliers:sups.length,firstOrder:dates[0]||null,lastOrder:dates[dates.length-1]||null},null,2)};
const orders=${JSON.stringify(co.map(o=>{const d=_maGetBilledAt(o);return{orderDate:o.orderDate,eta:o.eta,billedDate:d?d.slice(0,10):null,status:o.status,sku:o.orderedCode||o.product,qty:Number(o.qty)||0,supplier:o.vendor,transporter:o.transitDetails?.vendor||null};}),null,2)};`;
    text=preamble(`🧑 ${entityName} — Customer Deep Dive`,
`   Chart 1 — Line: Monthly units ordered trend — growing or shrinking demand?
   Chart 2 — Doughnut: SKU mix — which products this customer orders most
   Chart 3 — Doughnut: Supplier mix — which suppliers fulfil this customer's orders
   Chart 4 — Stacked bar: Monthly order status (Billed / Active / Cancelled) per month
   Chart 5 — Bar: Order volume per month (quantity ordered each month)`)
+jsData+`\n\nANALYSIS BELOW THE CHARTS:\n- Customer health score (order frequency + delivery rate + recency)\n- Buying trend: Growing / Stable / At Risk of Churn\n- Top 3 most ordered SKUs; stock availability concerns\n- Months with high cancellations (service failure signals)\n- Days since last order — active or dormant?\n- 3 personalized recommendations to serve this customer better`;
  } else if(type==='supplier'){
    const so=orders.filter(o=>o.vendor===entityName);
    if(!so.length){showToast('No orders found for '+entityName,'warning');return;}
    const del=so.filter(o=>o.status==='Billed').length;
    const act=so.filter(o=>!['Billed','Cancelled'].includes(o.status)).length;
    const ovd=so.filter(o=>!['Billed','Cancelled'].includes(o.status)&&o.eta&&o.eta<today).length;
    const can_=so.filter(o=>o.status==='Cancelled').length;
    const qty=so.reduce((s,o)=>s+(Number(o.qty)||0),0);
    const skus=[...new Set(so.map(o=>o.orderedCode||o.product))];
    const custs=[...new Set(so.map(o=>o.customer))];
    const tps=[...new Set(so.map(o=>o.transitDetails?.vendor).filter(Boolean))];
    const fDays=so.filter(o=>o.status==='Billed').map(o=>{const dp=_maGetDispatchAt(o);const dl=_maGetBilledAt(o);return dp&&dl?_maDaysBetween(dp,dl):null;}).filter(x=>x!==null);
    const avgFD=fDays.length?parseFloat((fDays.reduce((a,b)=>a+b,0)/fDays.length).toFixed(1)):null;
    const jsData=`const supplier=${JSON.stringify({name:entityName,totalPOs:so.length,totalUnits:qty,billed:del,active:act,overdue:ovd,cancelled:can_,fulfillRate:Math.round(del/so.length*100),avgDeliveryDays:avgFD,uniqueSkus:skus.length,uniqueCustomers:custs.length,transportersUsed:tps},null,2)};
const orders=${JSON.stringify(so.map(o=>{const dp=_maGetDispatchAt(o);const dl=_maGetBilledAt(o);const onT=dl&&o.eta?new Date(dl).toISOString().slice(0,10)<=o.eta:null;return{orderDate:o.orderDate,eta:o.eta,billedDate:dl?dl.slice(0,10):null,fulfillDays:dp&&dl?_maDaysBetween(dp,dl):null,onTime:onT,status:o.status,sku:o.orderedCode||o.product,qty:Number(o.qty)||0,customer:o.customer,transporter:o.transitDetails?.vendor||null};}),null,2)};`;
    text=preamble(`🏭 ${entityName} — Supplier Deep Dive`,
`   Chart 1 — Bar+Line combo: Monthly PO volume (bars) with cumulative fulfillment rate % (line)
   Chart 2 — Doughnut: SKU mix this supplier provides (by order count)
   Chart 3 — Doughnut: Customer distribution — which customers buy through this supplier
   Chart 4 — Scatter: Each billed order — promised days (X) vs actual days (Y); green=on-time, red=late
   Chart 5 — Bar: Monthly fulfillment rate % — reliability trend`)
+jsData+`\n\nANALYSIS BELOW THE CHARTS:\n- Reliability grade A/B/C/D/F with explanation\n- Fulfillment trend: improving or worsening?\n- Fastest vs slowest SKUs for this supplier\n- Customer concentration risk\n- Risk flags: overdue orders, low fulfillment, long avg delivery\n- 3 vendor management recommendations`;
  } else if(type==='product'){
    const po=orders.filter(o=>(o.orderedCode||o.product)===entityName);
    if(!po.length){showToast('No orders found for '+entityName,'warning');return;}
    const del=po.filter(o=>o.status==='Billed').length;
    const act=po.filter(o=>!['Billed','Cancelled'].includes(o.status)).length;
    const ovd=po.filter(o=>!['Billed','Cancelled'].includes(o.status)&&o.eta&&o.eta<today).length;
    const can_=po.filter(o=>o.status==='Cancelled').length;
    const qty=po.reduce((s,o)=>s+(Number(o.qty)||0),0);
    const custs=[...new Set(po.map(o=>o.customer))];
    const sups=[...new Set(po.map(o=>o.vendor))];
    const fDays=po.filter(o=>o.status==='Billed').map(o=>{const dp=_maGetDispatchAt(o);const dl=_maGetBilledAt(o);return dp&&dl?_maDaysBetween(dp,dl):null;}).filter(x=>x!==null);
    const avgFD=fDays.length?parseFloat((fDays.reduce((a,b)=>a+b,0)/fDays.length).toFixed(1)):null;
    const dates=po.map(o=>o.orderDate).filter(Boolean).sort();
    const jsData=`const sku=${JSON.stringify({sku:entityName,orderCount:po.length,totalQty:qty,billed:del,active:act,overdue:ovd,cancelled:can_,customers:custs.length,suppliers:sups.length,avgFulfillDays:avgFD,firstOrder:dates[0]||null,lastOrder:dates[dates.length-1]||null},null,2)};
const orders=${JSON.stringify(po.map(o=>{const dp=_maGetDispatchAt(o);const dl=_maGetBilledAt(o);return{orderDate:o.orderDate,eta:o.eta,billedDate:dl?dl.slice(0,10):null,fulfillDays:dp&&dl?_maDaysBetween(dp,dl):null,status:o.status,qty:Number(o.qty)||0,customer:o.customer,supplier:o.vendor,transporter:o.transitDetails?.vendor||null};}),null,2)};`;
    text=preamble(`📦 ${entityName} — Product/SKU Deep Dive`,
`   Chart 1 — Line: Monthly units ordered trend — demand over time
   Chart 2 — Doughnut: Customer distribution — who orders this product most
   Chart 3 — Bar: Supplier comparison — total POs and avg fulfillment days per supplier
   Chart 4 — Bar histogram: Fulfillment days distribution (how long does this SKU typically take?)
   Chart 5 — Stacked bar: Monthly status breakdown (Billed / Active / Cancelled) per month`)
+jsData+`\n\nANALYSIS BELOW THE CHARTS:\n- Demand trend: Growing / Stable / Declining\n- Best supplier for this product (fastest + most reliable)\n- Customer concentration risk (one customer > 50%?)\n- Average lead time and whether it's improving\n- Seasonal demand pattern if visible\n- 3 recommendations: stock planning, supplier selection, lead-time reduction`;
  } else if(type==='transporter'){
    const to=orders.filter(o=>o.transitDetails?.vendor===entityName);
    if(!to.length){showToast('No orders found for '+entityName,'warning');return;}
    const del=to.filter(o=>o.status==='Billed').length;
    const act=to.filter(o=>!['Billed','Cancelled'].includes(o.status)).length;
    const ovd=to.filter(o=>!['Billed','Cancelled'].includes(o.status)&&o.eta&&o.eta<today).length;
    const can_=to.filter(o=>o.status==='Cancelled').length;
    let onTime=0,late=0;
    const toData=to.map(o=>{
      const dp=_maGetDispatchAt(o);const dl=_maGetBilledAt(o);
      const actualD=dp&&dl?_maDaysBetween(dp,dl):null;
      const promD=dp&&o.eta?_maDaysBetween(dp,o.eta+'T23:59:00'):null;
      const isOT=dl&&o.eta?new Date(dl).toISOString().slice(0,10)<=o.eta:null;
      if(isOT===true)onTime++;else if(isOT===false)late++;
      return{orderDate:o.orderDate,dispatchDate:dp?dp.slice(0,10):null,billedDate:dl?dl.slice(0,10):null,eta:o.eta,actualDays:actualD,promisedDays:promD,onTime:isOT,status:o.status,sku:o.orderedCode||o.product,customer:o.customer,qty:Number(o.qty)||0};
    });
    const onTimePct=del>0?Math.round(onTime/del*100):null;
    const custs=[...new Set(to.map(o=>o.customer))];
    const skus=[...new Set(to.map(o=>o.orderedCode||o.product))];
    const jsData=`const transporter=${JSON.stringify({name:entityName,total:to.length,billed:del,onTime,late,onTimePct,active:act,overdue:ovd,cancelled:can_,customersServed:custs.length,skusHandled:skus.length},null,2)};
const orders=${JSON.stringify(toData,null,2)};`;
    text=preamble(`🚛 ${entityName} — Transporter Deep Dive`,
`   Chart 1 — Timeline bars: each billed order as a bar from dispatchDate to billedDate; green=on-time, red=late, grey=in-progress
   Chart 2 — Stacked bar: Monthly volume — on-time (green) vs late (red) vs active (amber) per month
   Chart 3 — Bar histogram: Delivery time distribution (how many orders took 1d / 2d / 3d / etc.)
   Chart 4 — Doughnut: On-Time vs Late vs Active vs Cancelled overall split
   Chart 5 — Doughnut: Top SKUs handled by this transporter (by order count)`)
+jsData+`\n\nANALYSIS BELOW THE CHARTS:\n- Reliability grade A (≥90%) / B (75-89%) / C (60-74%) / D (40-59%) / F (<40%)\n- Trend: on-time % improving or worsening over recent months?\n- Best vs worst months\n- SKUs that consistently take longer through this transporter\n- Customers most impacted by delays\n- 3 actionable improvement recommendations`;
  }
  if(!text){showToast('Nothing to copy','warning');return;}
  navigator.clipboard.writeText(text).then(()=>{
    showToast(`🤖 ${entityName} deep-dive prompt copied! Paste into Claude for a full visual dashboard`,'success');
  }).catch(()=>{
    const ta=document.createElement('textarea');
    ta.value=text;
    ta.style.cssText='position:fixed;top:10px;left:50%;transform:translateX(-50%);width:min(760px,94vw);height:75vh;z-index:99999;padding:16px;font-family:monospace;font-size:11px;border:2px solid #667eea;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.4);resize:none';
    const closeBtn=document.createElement('button');
    closeBtn.textContent='✕ Close';
    closeBtn.style.cssText='position:fixed;top:14px;right:calc(50% - min(380px,47vw) + 8px);z-index:100000;padding:4px 12px;background:#dc2626;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer';
    closeBtn.onclick=()=>{document.body.removeChild(ta);document.body.removeChild(closeBtn);};
    document.body.appendChild(ta);document.body.appendChild(closeBtn);
    ta.select();try{document.execCommand('copy');}catch(e){}
    showToast('📋 Prompt shown — select all & copy, then paste into Claude','info');
  });
}

function _copyForAI(section){
  const now=new Date();
  const ts=now.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})+' '+now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  const app=sysSettings?.appName||'Order Management System';
  const company=sysSettings?.companyName||'Your Company';
  let text='';

  // ── shared preamble ──
  const preamble=(title,chartList)=>`You are a data visualization and business analytics expert.
I will give you real order management data from ${company} (${app}).

YOUR TASK: Produce a single complete self-contained HTML file that:
1. Loads Chart.js 4 from CDN: https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js
2. Renders the following charts using the data below:
${chartList}
3. Includes a KPI summary row at the top (cards with key numbers)
4. Uses a clean professional layout: white cards, subtle shadows, #1e293b headings
5. Has a dark header bar showing: "${title}" | ${company} | Exported: ${ts}
6. All data is embedded inline — no fetch calls, no external data files
7. Each chart has a title, tooltip, and legend
8. Page must work when saved as .html and opened in any browser

DATA (as JavaScript — embed directly in your script tags):
`;

  if(section==='transport'){
    const d=_maLastStats.transport;
    if(!d||!d.rows.length){showToast('No transporter data to copy','warning');return;}
    const {rows,totalOrders,totalDel,totalOnTime,overallPct,avgActual,totalActive,totalOverdue}=d;

    const jsData=`const summary = {
  transporters: ${rows.length},
  totalShipments: ${totalOrders},
  billed: ${totalDel},
  onTimePct: ${overallPct},
  avgTransitDays: ${avgActual},
  activeNow: ${totalActive},
  overdueNow: ${totalOverdue}
};

const transporters = ${JSON.stringify(rows.map(r=>({
  name:r.name,
  total:r.total,
  billed:r.billed,
  onTime:r.onTime,
  late:r.late,
  onTimePct:r.billed>0?Math.round(r.onTime/r.billed*100):null,
  avgActualDays:r.dispatchCount>0?parseFloat((r.totalDispatchDays/r.dispatchCount).toFixed(1)):null,
  avgPromisedDays:r.dispatchCount>0?parseFloat((r.totalEtaDays/r.dispatchCount).toFixed(1)):null,
  delayDays:r.dispatchCount>0?parseFloat(((r.totalDispatchDays-r.totalEtaDays)/r.dispatchCount).toFixed(1)):null,
  active:r.active,
  overdue:r.overdue,
  cancelled:r.cancelled,
  customersServed:r.customers.size,
  skusHandled:r.skus.size
})),null,2)};`;

    text=preamble('🚛 Transporter Performance Dashboard',
`   Chart 1 — Horizontal bar chart: On-Time % per transporter
            Color bars: green if ≥80%, amber if 50–79%, red if <50%
            Show a vertical reference line at 80% (target)
   Chart 2 — Grouped bar chart: Avg Actual Days vs Avg Promised Days per transporter
            Two datasets side by side; highlight excess in red
   Chart 3 — Stacked bar chart: Billed vs Active vs Cancelled per transporter
   Chart 4 — Horizontal bar chart: Total Shipments per transporter (volume ranking)
   Chart 5 — Scatter/bar chart: Delay Days per transporter (+ = late, - = early)
            Color positive bars red, negative bars green`)
+jsData+`

ANALYSIS TO INCLUDE BELOW THE CHARTS:
- Rank transporters by overall reliability score (combine on-time % + delay days)
- Flag any transporter with on-time % below 70% as HIGH RISK in red
- Identify the best transporter and explain why
- Write 3–5 actionable recommendations
- If a transporter has overdue shipments, show a warning callout box`;

  } else if(section==='sku'){
    const d=_maLastStats.sku;
    if(!d||!d.rows.length){showToast('No SKU data to copy','warning');return;}
    const {rows,totalSkus,totalOrders,totalQty,topSku}=d;
    const top20=rows.slice(0,20);

    const jsData=`const summary = {
  uniqueSkus: ${totalSkus},
  totalOrderLines: ${totalOrders},
  totalUnits: ${totalQty},
  topSku: ${JSON.stringify(topSku?topSku.sku:'—')}
};

const skus = ${JSON.stringify(top20.map(r=>({
  sku:r.sku,
  product:r.product,
  orderCount:r.orderCount,
  totalQty:r.totalQty,
  billed:r.billed,
  active:r.active,
  overdue:r.overdue,
  cancelled:r.cancelled,
  customers:r.customers.size,
  suppliers:r.vendors.size,
  avgFulfillDays:r.fulfillDays.length?parseFloat((r.fulfillDays.reduce((a,b)=>a+b,0)/r.fulfillDays.length).toFixed(1)):null,
  firstOrder:r.firstOrder,
  lastOrder:r.lastOrder
})),null,2)};`;

    text=preamble('📦 SKU / Product Analytics Dashboard',
`   Chart 1 — Horizontal bar chart: Order Count per SKU (top 20, sorted descending)
            Color top 3 in gold/silver/bronze
   Chart 2 — Horizontal bar chart: Total Units Ordered per SKU
   Chart 3 — Bubble chart: SKU popularity — X=order count, Y=avg fulfill days, bubble size=total units
            Helps identify fast movers vs slow fulfillment SKUs
   Chart 4 — Grouped bar: Billed vs Active vs Overdue per SKU (top 10)
   Chart 5 — Doughnut chart: Overall status split (Billed / Active / Cancelled / Overdue) across all SKUs`)
+jsData+`

ANALYSIS TO INCLUDE BELOW THE CHARTS:
- Classify SKUs into Fast Movers / Medium Movers / Slow Movers based on order frequency
- Identify any SKU that has only 1 customer (single-customer dependency risk)
- Highlight SKUs with high active + overdue counts (fulfilment concern)
- Write top 5 insights about the SKU mix
- Suggest which SKUs deserve priority stock planning`;

  } else if(section==='supplier'){
    const d=_maLastStats.supplier;
    if(!d||!d.rows.length){showToast('No supplier data to copy','warning');return;}
    const {rows,totalOrders,totalDel}=d;

    const jsData=`const summary = {
  activeSuppliers: ${rows.length},
  totalPOs: ${totalOrders},
  totalBilled: ${totalDel},
  overallFulfillPct: ${totalOrders>0?Math.round(totalDel/totalOrders*100):0}
};

const suppliers = ${JSON.stringify(rows.map(r=>({
  name:r.name,
  totalPOs:r.total,
  totalUnits:r.totalQty,
  billed:r.billed,
  active:r.active,
  overdue:r.overdue,
  cancelled:r.cancelled,
  fulfillRate:r.total>0?Math.round(r.billed/r.total*100):0,
  avgDeliveryDays:r.fulfillDays.length?parseFloat((r.fulfillDays.reduce((a,b)=>a+b,0)/r.fulfillDays.length).toFixed(1)):null,
  uniqueSkus:r.skus.size,
  uniqueCustomers:r.customers.size,
  transportersUsed:[...r.transporters]
})),null,2)};`;

    text=preamble('🏭 Supplier / Vendor Analytics Dashboard',
`   Chart 1 — Horizontal bar chart: Fulfillment Rate % per supplier
            Green ≥80%, amber 50–79%, red <50%; show 80% target line
   Chart 2 — Bar chart: Total POs per supplier (volume ranking)
   Chart 3 — Grouped bar: Billed vs Active vs Overdue per supplier (stacked)
   Chart 4 — Horizontal bar: Avg Delivery Days per supplier (fastest to slowest)
   Chart 5 — Scatter chart: Fulfillment Rate (X) vs Avg Delivery Days (Y) — bubble = volume
            Quadrants: Top-right = reliable+fast (green zone), bottom-left = risk zone`)
+jsData+`

ANALYSIS TO INCLUDE BELOW THE CHARTS:
- Score each supplier: combine fulfillment rate + avg delivery days into a reliability score
- Flag suppliers with fulfillment rate < 60% as HIGH RISK
- Identify if any single supplier handles > 40% of total POs (concentration risk)
- Write a vendor scorecard table with traffic-light ratings (🟢🟡🔴)
- 3–5 actionable recommendations for vendor management`;

  } else if(section==='customer'){
    const d=_maLastStats.customer;
    if(!d||!d.rows.length){showToast('No customer data to copy','warning');return;}
    const {rows,totalOrders,totalOverdue,activeCustomers}=d;

    const jsData=`const summary = {
  totalCustomers: ${rows.length},
  activeCustomers: ${activeCustomers},
  totalOrders: ${totalOrders},
  overdueOrders: ${totalOverdue}
};

const customers = ${JSON.stringify(rows.map(r=>({
  name:r.name,
  totalOrders:r.total,
  totalUnits:r.totalQty,
  billed:r.billed,
  active:r.active,
  overdue:r.overdue,
  cancelled:r.cancelled,
  deliveryRate:r.total>0?Math.round(r.billed/r.total*100):0,
  uniqueSkus:r.skus.size,
  uniqueSuppliers:r.vendors.size,
  firstOrder:r.firstOrder,
  lastOrder:r.lastOrder
})),null,2)};`;

    text=preamble('🧑 Customer Analytics Dashboard',
`   Chart 1 — Horizontal bar chart: Total Orders per customer (top 15, sorted)
            Colour-grade bars from dark blue (highest) to light blue (lowest)
   Chart 2 — Horizontal bar chart: Total Units Ordered per customer
   Chart 3 — Doughnut chart: Customer segmentation by order volume
            Bands: High (top 20%), Medium (next 30%), Low (bottom 50%)
   Chart 4 — Grouped bar: Billed vs Active vs Overdue per customer (top 10)
   Chart 5 — Scatter chart: Total Orders (X) vs Delivery Rate % (Y)
            Bubble size = total units; helps spot high-volume + low-service-rate customers`)
+jsData+`

ANALYSIS TO INCLUDE BELOW THE CHARTS:
- Segment customers into A / B / C tiers by order volume (Pareto analysis)
- Identify dormant customers: last order was more than 90 days ago
- Flag customers with delivery rate < 50% — are we failing them?
- Highlight top 5 customers by total units — these need priority service
- Write 3 retention recommendations for medium/low tier customers
- Create a simple customer health scorecard table (🟢🟡🔴 per customer)`;
  }

  if(!text){showToast('Nothing to copy','warning');return;}
  const _doClip=()=>{
    navigator.clipboard.writeText(text).then(()=>{
      showToast('🤖 Prompt copied! Paste into Claude → you\'ll get a full visual HTML dashboard','success');
    }).catch(()=>{
      const ta=document.createElement('textarea');
      ta.value=text;
      ta.style.cssText='position:fixed;top:10px;left:50%;transform:translateX(-50%);width:min(760px,94vw);height:75vh;z-index:99999;padding:16px;font-family:monospace;font-size:11px;border:2px solid #667eea;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.4);resize:none';
      const closeBtn=document.createElement('button');
      closeBtn.textContent='✕ Close';
      closeBtn.style.cssText='position:fixed;top:14px;right:calc(50% - min(380px,47vw) + 8px);z-index:100000;padding:4px 12px;background:#dc2626;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer';
      closeBtn.onclick=()=>{document.body.removeChild(ta);document.body.removeChild(closeBtn);};
      document.body.appendChild(ta);document.body.appendChild(closeBtn);
      ta.select();
      try{document.execCommand('copy');}catch(e){}
      showToast('📋 Prompt shown — select all & copy, then paste into Claude','info');
    });
  };
  _doClip();
}

// ── Per-row AI deep-dive copy ──
function _copyForAIRow(section,idx){
  const d=_maLastStats[section];
  if(!d||!d.rows[idx]){showToast('No data for this entry','warning');return;}
  const r=d.rows[idx];
  const now=new Date();
  const ts=now.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})+' '+now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  const app=sysSettings?.appName||'Order Management System';
  const company=sysSettings?.companyName||'Your Company';
  const preamble=(title,chartList)=>
`You are a data visualization expert.
I will give you real order data for one specific entity from ${company} (${app}).

YOUR TASK: Produce a single complete self-contained HTML file that:
1. Loads Chart.js 4 from CDN: https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js
2. Renders the following charts using the embedded data:
${chartList}
3. Shows a KPI summary row at top (key numbers in cards with icons)
4. Clean professional layout: white cards, #1e293b headings, subtle box-shadows, responsive grid
5. Dark header bar: "${title}" | ${company} | Exported: ${ts}
6. All data embedded inline — no fetch calls, no external data files
7. Each chart has a descriptive title, tooltips, and legend
8. Page works when saved as .html and opened in any browser

DATA (embed these JavaScript objects directly in your <script> tag):
`;
  let text='';
  if(section==='transport'){
    const tpOrders=orders.filter(o=>o.transitDetails?.vendor===r.name).map(o=>{
      const dispAt=_maGetDispatchAt(o);
      const delAt=_maGetBilledAt(o);
      const actualDays=dispAt&&delAt?_maDaysBetween(dispAt,delAt):null;
      const promisedDays=dispAt&&o.eta?_maDaysBetween(dispAt,o.eta+'T23:59:00'):null;
      const onTime=delAt&&o.eta?new Date(delAt).toISOString().slice(0,10)<=o.eta:null;
      return{orderDate:o.orderDate,dispatchDate:dispAt?dispAt.slice(0,10):null,billedDate:delAt?delAt.slice(0,10):null,eta:o.eta,actualDays,promisedDays,onTime,status:o.status,sku:o.orderedCode||o.product,customer:o.customer,qty:Number(o.qty)||0};
    });
    const onTimePct=r.billed>0?Math.round(r.onTime/r.billed*100):null;
    const avgDays=r.dispatchCount>0?parseFloat((r.totalDispatchDays/r.dispatchCount).toFixed(1)):null;
    const jsData=`const transporter=${JSON.stringify({name:r.name,total:r.total,billed:r.billed,onTime:r.onTime,late:r.late,onTimePct,avgActualDays:avgDays,avgPromisedDays:r.dispatchCount>0?parseFloat((r.totalEtaDays/r.dispatchCount).toFixed(1)):null,active:r.active,overdue:r.overdue,cancelled:r.cancelled,customersServed:r.customers.size,skusHandled:r.skus.size},null,2)};
const orders=${JSON.stringify(tpOrders,null,2)};`;
    text=preamble(`🚛 ${r.name} — Transporter Deep Dive`,
`   Chart 1 — Horizontal bar timeline: each order as a bar from dispatchDate to billedDate
            Color green if onTime=true, red if false, grey if not yet billed
   Chart 2 — Stacked bar: Monthly volume — on-time (green) vs late (red) vs active (amber) per month
   Chart 3 — Bar histogram: Delivery time distribution — how many orders took 1d / 2d / 3d / etc.
   Chart 4 — Doughnut: On-Time vs Late vs Active vs Cancelled split
   Chart 5 — Doughnut: Top SKUs handled by this transporter (by order count)`)
    +jsData+`

ANALYSIS BELOW THE CHARTS:
- Reliability grade: A (≥90% on-time) / B (75-89%) / C (60-74%) / D (40-59%) / F (<40%)
- Trend: is on-time % improving or worsening over recent months?
- Best month vs worst month for this transporter
- Which SKUs consistently take longer than promised through this transporter
- Customers most impacted by delays from this transporter
- 3 actionable improvement recommendations`;
  } else if(section==='sku'){
    const skuOrders=orders.filter(o=>(o.orderedCode||o.product)===r.sku).map(o=>{
      const dispAt=_maGetDispatchAt(o);
      const delAt=_maGetBilledAt(o);
      return{orderDate:o.orderDate,eta:o.eta,billedDate:delAt?delAt.slice(0,10):null,fulfillDays:dispAt&&delAt?_maDaysBetween(dispAt,delAt):null,status:o.status,qty:Number(o.qty)||0,customer:o.customer,supplier:o.vendor,transporter:o.transitDetails?.vendor||null};
    });
    const avgFulfill=r.fulfillDays.length?parseFloat((r.fulfillDays.reduce((a,b)=>a+b,0)/r.fulfillDays.length).toFixed(1)):null;
    const jsData=`const sku=${JSON.stringify({sku:r.sku,product:r.product,orderCount:r.orderCount,totalQty:r.totalQty,billed:r.billed,active:r.active,overdue:r.overdue,cancelled:r.cancelled,customers:r.customers.size,suppliers:r.vendors.size,avgFulfillDays:avgFulfill,firstOrder:r.firstOrder,lastOrder:r.lastOrder},null,2)};
const orders=${JSON.stringify(skuOrders,null,2)};`;
    text=preamble(`📦 ${r.sku} — SKU Deep Dive`,
`   Chart 1 — Line chart: Monthly units ordered trend (X=month, Y=units) — demand over time
   Chart 2 — Doughnut: Customer distribution — who orders this SKU and how much
   Chart 3 — Bar chart: Supplier comparison — total POs and avg fulfillment days per supplier
   Chart 4 — Bar histogram: Fulfillment days distribution (1d / 2d / 3d etc.)
   Chart 5 — Stacked bar: Monthly status breakdown (Billed / Active / Cancelled) over time`)
    +jsData+`

ANALYSIS BELOW THE CHARTS:
- Demand trend classification: Growing / Stable / Declining
- Best supplier for this SKU (fastest + most reliable)
- Customer concentration risk (is one customer > 50% of demand?)
- Average lead time and whether it's improving over time
- Seasonal demand pattern if visible
- 3 recommendations: stock planning, supplier selection, lead-time reduction`;
  } else if(section==='supplier'){
    const suppOrders=orders.filter(o=>o.vendor===r.name).map(o=>{
      const dispAt=_maGetDispatchAt(o);
      const delAt=_maGetBilledAt(o);
      const onTime=delAt&&o.eta?new Date(delAt).toISOString().slice(0,10)<=o.eta:null;
      return{orderDate:o.orderDate,eta:o.eta,billedDate:delAt?delAt.slice(0,10):null,fulfillDays:dispAt&&delAt?_maDaysBetween(dispAt,delAt):null,onTime,status:o.status,sku:o.orderedCode||o.product,qty:Number(o.qty)||0,customer:o.customer,transporter:o.transitDetails?.vendor||null};
    });
    const avgFulfill=r.fulfillDays.length?parseFloat((r.fulfillDays.reduce((a,b)=>a+b,0)/r.fulfillDays.length).toFixed(1)):null;
    const fillRate=r.total>0?Math.round(r.billed/r.total*100):0;
    const jsData=`const supplier=${JSON.stringify({name:r.name,totalPOs:r.total,totalUnits:r.totalQty,billed:r.billed,active:r.active,overdue:r.overdue,cancelled:r.cancelled,fulfillRate:fillRate,avgDeliveryDays:avgFulfill,uniqueSkus:r.skus.size,uniqueCustomers:r.customers.size,transportersUsed:[...r.transporters]},null,2)};
const orders=${JSON.stringify(suppOrders,null,2)};`;
    text=preamble(`🏭 ${r.name} — Supplier Deep Dive`,
`   Chart 1 — Line + bar combo: Monthly PO volume (bars) with cumulative delivery rate % (line)
   Chart 2 — Doughnut: SKU mix this supplier provides (top 10 SKUs by order count)
   Chart 3 — Doughnut: Customer distribution — which customers buy through this supplier
   Chart 4 — Scatter: Each billed order — promised days (X) vs actual days (Y)
            Points below the diagonal = early/on-time (green); above = late (red)
   Chart 5 — Bar: Monthly fulfillment rate % — is reliability trending up or down?`)
    +jsData+`

ANALYSIS BELOW THE CHARTS:
- Supplier reliability grade A/B/C/D/F with explanation
- Fulfillment trend: improving or worsening?
- Which SKUs this supplier delivers fastest vs slowest
- Customers most dependent on this supplier (concentration risk)
- Risk flags: overdue orders, low fulfillment, long avg delivery
- 3 vendor management recommendations`;
  } else if(section==='customer'){
    const custOrders=orders.filter(o=>o.customer===r.name).map(o=>{
      const delAt=_maGetBilledAt(o);
      return{orderDate:o.orderDate,eta:o.eta,billedDate:delAt?delAt.slice(0,10):null,status:o.status,sku:o.orderedCode||o.product,qty:Number(o.qty)||0,supplier:o.vendor,transporter:o.transitDetails?.vendor||null};
    });
    const delivRate=r.total>0?Math.round(r.billed/r.total*100):0;
    const jsData=`const customer=${JSON.stringify({name:r.name,totalOrders:r.total,totalUnits:r.totalQty,billed:r.billed,active:r.active,overdue:r.overdue,cancelled:r.cancelled,deliveryRate:delivRate,uniqueSkus:r.skus.size,uniqueSuppliers:r.vendors.size,firstOrder:r.firstOrder,lastOrder:r.lastOrder},null,2)};
const orders=${JSON.stringify(custOrders,null,2)};`;
    text=preamble(`🧑 ${r.name} — Customer Deep Dive`,
`   Chart 1 — Line chart: Monthly order quantity trend — is this customer growing or shrinking?
   Chart 2 — Doughnut: SKU mix — which products does this customer order most?
   Chart 3 — Doughnut: Supplier mix — which suppliers fulfil orders for this customer?
   Chart 4 — Stacked bar: Monthly order status breakdown (Billed / Active / Cancelled)
   Chart 5 — Bar: Order frequency per month — how often and how much do they order?`)
    +jsData+`

ANALYSIS BELOW THE CHARTS:
- Customer health score based on order frequency, delivery rate, and recency
- Buying trend: Growing / Stable / At Risk of Churn
- Top 3 most ordered SKUs and whether stock is consistently available
- Any months with unusually high cancellations (service failure signal)
- Days since last order — active or dormant?
- 3 personalized recommendations to serve this customer better`;
  }
  if(!text){showToast('Nothing to copy','warning');return;}
  navigator.clipboard.writeText(text).then(()=>{
    showToast(`🤖 ${r.name||r.sku} deep-dive prompt copied! Paste into Claude for a visual dashboard`,'success');
  }).catch(()=>{
    const ta=document.createElement('textarea');
    ta.value=text;
    ta.style.cssText='position:fixed;top:10px;left:50%;transform:translateX(-50%);width:min(760px,94vw);height:75vh;z-index:99999;padding:16px;font-family:monospace;font-size:11px;border:2px solid #667eea;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.4);resize:none';
    const closeBtn=document.createElement('button');
    closeBtn.textContent='✕ Close';
    closeBtn.style.cssText='position:fixed;top:14px;right:calc(50% - min(380px,47vw) + 8px);z-index:100000;padding:4px 12px;background:#dc2626;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer';
    closeBtn.onclick=()=>{document.body.removeChild(ta);document.body.removeChild(closeBtn);};
    document.body.appendChild(ta);document.body.appendChild(closeBtn);
    ta.select();try{document.execCommand('copy');}catch(e){}
    showToast('📋 Prompt shown — select all & copy, then paste into Claude','info');
  });
}

const _maAiBtn=(section)=>`<button onclick="_copyForAI('${section}')"
  style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(102,126,234,.4);transition:all .15s;white-space:nowrap"
  onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 16px rgba(102,126,234,.5)'"
  onmouseout="this.style.transform='';this.style.boxShadow='0 2px 8px rgba(102,126,234,.4)'"
  title="Copy data as an AI chart prompt — paste into Claude to get a full HTML visual dashboard">
  🤖 Copy for AI Charts
</button>`;

// ─────────────────────────────────────
//  🚛 TRANSPORTER ANALYTICS
// ─────────────────────────────────────
function _renderTransporterAnalytics(){
  const wrap=document.getElementById('rptTransportContent');if(!wrap)return;
  const today=new Date().toISOString().slice(0,10);

  // Build per-transporter stats from orders with transitDetails
  const stats={};
  orders.forEach(o=>{
    const tp=o.transitDetails?.vendor;
    if(!tp)return;
    if(!stats[tp]) stats[tp]={
      name:tp, total:0, billed:0, onTime:0, late:0,
      totalDispatchDays:0, totalEtaDays:0, dispatchCount:0,
      active:0, overdue:0, cancelled:0,
      customers:new Set(), skus:new Set()
    };
    const s=stats[tp];
    s.total++;
    s.customers.add(o.customer);
    s.skus.add(o.orderedCode||o.product);
    if(o.status==='Cancelled'){s.cancelled++;return;}
    if(['In Transit','At Transporter','Warehouse','Purchased'].includes(o.status)){
      s.active++;
      if(o.eta&&o.eta<today) s.overdue++;
    }
    const delivAt=_maGetBilledAt(o);
    const dispAt=_maGetDispatchAt(o);
    if(delivAt&&dispAt&&o.eta){
      s.billed++;
      const actualDays=_maDaysBetween(dispAt,delivAt);
      const etaDays=_maDaysBetween(dispAt,o.eta+'T23:59:00');
      s.totalDispatchDays+=actualDays;
      s.totalEtaDays+=etaDays>0?etaDays:1;
      s.dispatchCount++;
      if(new Date(delivAt).toISOString().slice(0,10)<=o.eta) s.onTime++;
      else s.late++;
    }
  });

  const rows=Object.values(stats).sort((a,b)=>b.total-a.total);
  const srchId='maTpSrch';

  function _buildTable(filter=''){
    const fl=filter.toLowerCase();
    const visible=rows.filter(r=>!fl||r.name.toLowerCase().includes(fl));
    if(!visible.length) return`<div style="padding:40px;text-align:center;color:#94a3b8">No transporters found</div>`;

    // Summary KPIs
    const totalOrders=visible.reduce((s,r)=>s+r.total,0);
    const totalDel=visible.reduce((s,r)=>s+r.billed,0);
    const totalOnTime=visible.reduce((s,r)=>s+r.onTime,0);
    const overallPct=totalDel>0?Math.round(totalOnTime/totalDel*100):0;
    const allDays=visible.filter(r=>r.dispatchCount>0);
    const avgActual=allDays.length?Math.round(allDays.reduce((s,r)=>s+r.totalDispatchDays/r.dispatchCount,0)/allDays.length*10)/10:0;
    const totalActive=visible.reduce((s,r)=>s+r.active,0);
    const totalOverdue=visible.reduce((s,r)=>s+r.overdue,0);

    const kpis=`<div class="ma-kpi-row">
      ${_maKpi(visible.length,'Transporters Active','across all orders','#1a73e8')}
      ${_maKpi(totalOrders,'Total Shipments','orders dispatched','#7c3aed')}
      ${_maKpi(totalDel,'Billed','completed trips','#16a34a')}
      ${_maKpi(overallPct+'%','Overall On-Time Rate',totalOnTime+' of '+totalDel+' deliveries',overallPct>=80?'#16a34a':overallPct>=50?'#f59e0b':'#dc2626')}
      ${_maKpi(avgActual+' days','Avg Actual Transit','dispatch → billed','#0ea5e9')}
      ${_maKpi(totalActive,'Currently Active',totalOverdue>0?totalOverdue+' overdue ⚠️':'all on schedule',totalOverdue>0?'#dc2626':'#16a34a')}
    </div>`;

    const tbody=visible.map((r,i)=>{
      const onTimePct=r.billed>0?Math.round(r.onTime/r.billed*100):null;
      const avgDays=r.dispatchCount>0?(r.totalDispatchDays/r.dispatchCount).toFixed(1):null;
      const avgEtaDays=r.dispatchCount>0?(r.totalEtaDays/r.dispatchCount).toFixed(1):null;
      const delayDiff=avgDays&&avgEtaDays?(parseFloat(avgDays)-parseFloat(avgEtaDays)).toFixed(1):null;
      return`<tr>
        <td><div style="font-weight:700;color:#1e293b">${r.name}</div>
          <div style="font-size:10px;color:#94a3b8;margin-top:2px">${r.customers.size} customer${r.customers.size!==1?'s':''} · ${r.skus.size} SKU${r.skus.size!==1?'s':''}</div>
          <button onclick="_copyForAIRow('transport',${i})" title="Copy AI deep-dive prompt for ${r.name}" style="margin-top:5px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:5px;font-size:10px;font-weight:700;padding:2px 7px;cursor:pointer;display:inline-flex;align-items:center;gap:3px" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">🤖 AI Charts</button>
        </td>
        <td style="text-align:center;font-weight:800">${r.total}</td>
        <td style="text-align:center">${r.billed>0?_maScoreBadge(onTimePct):'<span style="color:#94a3b8;font-size:12px">—</span>'}</td>
        <td style="text-align:center">
          ${avgDays?`<span style="font-weight:700;color:#1e293b">${avgDays}d</span>`:'—'}
          ${avgEtaDays?`<span style="font-size:10px;color:#64748b"> (promised: ${avgEtaDays}d)</span>`:''}
        </td>
        <td style="text-align:center">
          ${delayDiff!==null?`<span style="font-weight:700;color:${parseFloat(delayDiff)<=0?'#16a34a':parseFloat(delayDiff)<=2?'#f59e0b':'#dc2626'}">${parseFloat(delayDiff)>0?'+':''}${delayDiff}d</span>`:'—'}
        </td>
        <td style="text-align:center"><span style="font-weight:700;color:#0ea5e9">${r.active}</span>${r.overdue>0?` <span style="color:#dc2626;font-size:10px;font-weight:700">(${r.overdue} overdue)</span>`:''}</td>
        <td style="text-align:center;color:#94a3b8;font-size:12px">${r.cancelled}</td>
        <td>
          <div class="ma-bar-bg" style="width:100px"><div class="ma-bar-fill" style="width:${onTimePct||0}%;background:${(onTimePct||0)>=80?'#16a34a':(onTimePct||0)>=50?'#f59e0b':'#dc2626'}"></div></div>
        </td>
      </tr>`;
    }).join('');

    // Cache for AI copy
    _maLastStats.transport={rows:visible,totalOrders,totalDel,totalOnTime,overallPct,avgActual,totalActive,totalOverdue};
    return kpis+`<div class="ma-card">
      <div class="ma-card-hdr">
        <h4>🚛 Transporter Performance Scorecard</h4>
        <div style="display:flex;align-items:center;gap:8px">
          ${_maAiBtn('transport')}
          <input class="ma-srch" id="${srchId}" placeholder="🔍 Search transporter…" value="${filter}" oninput="_renderTransporterAnalytics()">
        </div>
      </div>
      <div style="overflow-x:auto">
        <table class="ma-table">
          <thead><tr>
            <th>Transporter</th><th style="text-align:center">Total Shipped</th>
            <th style="text-align:center">On-Time %</th>
            <th style="text-align:center">Avg Actual Days</th>
            <th style="text-align:center">Delay vs Promised</th>
            <th style="text-align:center">Active</th>
            <th style="text-align:center">Cancelled</th>
            <th>Accuracy Bar</th>
          </tr></thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
    </div>`;
  }

  const srchVal=document.getElementById(srchId)?.value||'';
  wrap.innerHTML=`<div style="padding-bottom:20px">${_buildTable(srchVal)}</div>`;
}

// ─────────────────────────────────────
//  📦 SKU ANALYTICS
// ─────────────────────────────────────
function _renderSkuAnalytics(){
  const wrap=document.getElementById('rptSkuContent');if(!wrap)return;
  const today=new Date().toISOString().slice(0,10);
  const srchId='maSkuSrch';
  const srchVal=document.getElementById(srchId)?.value||'';
  const fl=srchVal.toLowerCase();

  // Build per-SKU stats
  const stats={};
  orders.forEach(o=>{
    const sku=o.orderedCode||o.product||'Unknown';
    if(!stats[sku]) stats[sku]={
      sku, product:o.product,
      orderCount:0, totalQty:0,
      billed:0, active:0, cancelled:0, overdue:0,
      customers:new Set(), vendors:new Set(), transporters:new Set(),
      fulfillDays:[], firstOrder:o.orderDate, lastOrder:o.orderDate
    };
    const s=stats[sku];
    s.orderCount++;
    s.totalQty+=(Number(o.qty)||0);
    s.customers.add(o.customer);
    s.vendors.add(o.vendor);
    if(o.transitDetails?.vendor) s.transporters.add(o.transitDetails.vendor);
    if(o.orderDate<s.firstOrder) s.firstOrder=o.orderDate;
    if(o.orderDate>s.lastOrder) s.lastOrder=o.orderDate;
    if(o.status==='Cancelled') s.cancelled++;
    else if(o.status==='Billed'){
      s.billed++;
      const dispAt=_maGetDispatchAt(o);
      const delAt=_maGetBilledAt(o);
      if(dispAt&&delAt) s.fulfillDays.push(_maDaysBetween(dispAt,delAt));
    } else {
      s.active++;
      if(o.eta&&o.eta<today) s.overdue++;
    }
  });

  const rows=Object.values(stats)
    .filter(r=>!fl||r.sku.toLowerCase().includes(fl)||r.product.toLowerCase().includes(fl))
    .sort((a,b)=>b.orderCount-a.orderCount);

  const totalSkus=rows.length;
  const totalOrders=rows.reduce((s,r)=>s+r.orderCount,0);
  const totalQty=rows.reduce((s,r)=>s+r.totalQty,0);
  const topSku=rows[0];
  const maxOrders=rows[0]?.orderCount||1;

  const kpis=`<div class="ma-kpi-row">
    ${_maKpi(totalSkus,'Unique SKUs','in all orders','#7c3aed')}
    ${_maKpi(totalOrders,'Total Order Lines','across all SKUs','#1a73e8')}
    ${_maKpi(totalQty.toLocaleString(),'Total Units Ordered','','#0ea5e9')}
    ${_maKpi(topSku?topSku.sku:'—','Most Ordered SKU',topSku?topSku.orderCount+' orders':'','#f97316')}
  </div>`;

  const tbody=rows.map((r,i)=>{
    const avgFulfill=r.fulfillDays.length?(r.fulfillDays.reduce((a,b)=>a+b,0)/r.fulfillDays.length).toFixed(1):null;
    const fillPct=maxOrders>0?Math.round(r.orderCount/maxOrders*100):0;
    return`<tr>
      <td>
        <div style="font-weight:700;color:#1a73e8;font-family:monospace">${r.sku}</div>
        ${r.sku!==r.product?`<div style="font-size:10px;color:#7c3aed">↳ ${r.product}</div>`:''}
        <button onclick="_copyForAIRow('sku',${i})" title="Copy AI deep-dive prompt for ${r.sku}" style="margin-top:5px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:5px;font-size:10px;font-weight:700;padding:2px 7px;cursor:pointer;display:inline-flex;align-items:center;gap:3px" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">🤖 AI Charts</button>
      </td>
      <td style="text-align:center">
        <span style="font-weight:900;font-size:16px;color:#1e293b">${r.orderCount}</span>
        <div style="margin-top:3px"><div class="ma-bar-bg" style="width:80px;margin:0 auto"><div class="ma-bar-fill" style="width:${fillPct}%;background:#7c3aed"></div></div></div>
      </td>
      <td style="text-align:center;font-weight:700">${r.totalQty.toLocaleString()}</td>
      <td><span style="font-size:11px;color:#64748b">${[...r.vendors].slice(0,2).join(', ')}${r.vendors.size>2?' +'+( r.vendors.size-2)+' more':''}</span></td>
      <td style="text-align:center;font-size:12px;color:#64748b">${r.customers.size}</td>
      <td style="text-align:center">
        ${avgFulfill?`<span style="font-weight:700;color:#0ea5e9">${avgFulfill}d</span>`:'<span style="color:#94a3b8">—</span>'}
      </td>
      <td style="text-align:center">
        <span style="color:#16a34a;font-weight:700">${r.billed}</span>
        ${r.active>0?` <span style="color:#f59e0b;font-weight:700">/ ${r.active} active</span>`:''}
        ${r.overdue>0?` <span style="color:#dc2626;font-size:10px">(${r.overdue}⚠️)</span>`:''}
      </td>
      <td style="text-align:center;color:#94a3b8;font-size:12px">${r.firstOrder||'—'}</td>
    </tr>`;
  }).join('');

  _maLastStats.sku={rows,totalSkus,totalOrders,totalQty,topSku};
  wrap.innerHTML=`<div style="padding-bottom:20px">
    ${kpis}
    <div class="ma-card">
      <div class="ma-card-hdr">
        <h4>📦 SKU Performance & Order Frequency</h4>
        <div style="display:flex;align-items:center;gap:8px">
          ${_maAiBtn('sku')}
          <input class="ma-srch" id="${srchId}" placeholder="🔍 Search SKU…" value="${srchVal}" oninput="_renderSkuAnalytics()">
        </div>
      </div>
      <div style="overflow-x:auto">
        <table class="ma-table">
          <thead><tr>
            <th>SKU / Product</th>
            <th style="text-align:center">Order Count</th>
            <th style="text-align:center">Total Units</th>
            <th>Suppliers</th>
            <th style="text-align:center">Customers</th>
            <th style="text-align:center">Avg Fulfill Days</th>
            <th style="text-align:center">Status</th>
            <th style="text-align:center">First Ordered</th>
          </tr></thead>
          <tbody>${tbody||'<tr><td colspan="8" style="text-align:center;padding:40px;color:#94a3b8">No SKUs found</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  </div>`;
}

// ─────────────────────────────────────
//  🏭 SUPPLIER ANALYTICS
// ─────────────────────────────────────
function _renderSupplierAnalytics(){
  const wrap=document.getElementById('rptSupplierContent');if(!wrap)return;
  const today=new Date().toISOString().slice(0,10);
  const srchId='maVendSrch';
  const srchVal=document.getElementById(srchId)?.value||'';
  const fl=srchVal.toLowerCase();

  const stats={};
  orders.forEach(o=>{
    const vn=o.vendor||'Unknown';
    if(!stats[vn]) stats[vn]={
      name:vn, total:0, billed:0, active:0, cancelled:0, overdue:0,
      totalQty:0, fulfillDays:[], customers:new Set(), skus:new Set(),
      transporters:new Set()
    };
    const s=stats[vn];
    s.total++;
    s.totalQty+=(Number(o.qty)||0);
    s.customers.add(o.customer);
    s.skus.add(o.orderedCode||o.product);
    if(o.transitDetails?.vendor) s.transporters.add(o.transitDetails.vendor);
    if(o.status==='Cancelled') s.cancelled++;
    else if(o.status==='Billed'){
      s.billed++;
      const dispAt=_maGetDispatchAt(o);
      const delAt=_maGetBilledAt(o);
      if(dispAt&&delAt) s.fulfillDays.push(_maDaysBetween(dispAt,delAt));
    } else {
      s.active++;
      if(o.eta&&o.eta<today) s.overdue++;
    }
  });

  const rows=Object.values(stats)
    .filter(r=>!fl||r.name.toLowerCase().includes(fl))
    .sort((a,b)=>b.total-a.total);

  const maxTotal=rows[0]?.total||1;
  const totalOrders=rows.reduce((s,r)=>s+r.total,0);
  const totalDel=rows.reduce((s,r)=>s+r.billed,0);

  const kpis=`<div class="ma-kpi-row">
    ${_maKpi(rows.length,'Active Suppliers','','#1a73e8')}
    ${_maKpi(totalOrders,'Total POs Raised','','#7c3aed')}
    ${_maKpi(totalDel,'Orders Billed','','#16a34a')}
    ${_maKpi(rows[0]?.name||'—','Most Used Supplier',rows[0]?rows[0].total+' orders':'','#f97316')}
  </div>`;

  const tbody=rows.map((r,i)=>{
    const avgFulfill=r.fulfillDays.length?(r.fulfillDays.reduce((a,b)=>a+b,0)/r.fulfillDays.length).toFixed(1):null;
    const fillRate=r.total>0?Math.round((r.billed)/(r.total)*100):0;
    const pct=Math.round(r.total/maxTotal*100);
    return`<tr>
      <td>
        <div style="font-weight:700;color:#1e293b">${r.name}</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:2px">${r.skus.size} SKU${r.skus.size!==1?'s':''} · ${r.customers.size} customer${r.customers.size!==1?'s':''}</div>
        <button onclick="_copyForAIRow('supplier',${i})" title="Copy AI deep-dive prompt for ${r.name}" style="margin-top:5px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:5px;font-size:10px;font-weight:700;padding:2px 7px;cursor:pointer;display:inline-flex;align-items:center;gap:3px" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">🤖 AI Charts</button>
      </td>
      <td style="text-align:center">
        <span style="font-weight:900;font-size:15px">${r.total}</span>
        <div style="margin-top:3px"><div class="ma-bar-bg" style="width:80px;margin:0 auto"><div class="ma-bar-fill" style="width:${pct}%;background:#1a73e8"></div></div></div>
      </td>
      <td style="text-align:center;font-weight:700">${r.totalQty.toLocaleString()}</td>
      <td style="text-align:center">${_maScoreBadge(fillRate)}</td>
      <td style="text-align:center">
        ${avgFulfill?`<span style="font-weight:700;color:#0ea5e9">${avgFulfill}d</span>`:'<span style="color:#94a3b8">—</span>'}
      </td>
      <td style="text-align:center"><span style="color:#16a34a;font-weight:700">${r.billed}</span></td>
      <td style="text-align:center">
        <span style="color:#f59e0b;font-weight:700">${r.active}</span>
        ${r.overdue>0?`<span style="color:#dc2626;font-size:10px;font-weight:700"> (${r.overdue}⚠️)</span>`:''}
      </td>
      <td style="text-align:center;color:#94a3b8;font-size:12px">${r.cancelled}</td>
      <td style="font-size:11px;color:#64748b">${[...r.transporters].slice(0,2).join(', ')||'—'}</td>
    </tr>`;
  }).join('');

  _maLastStats.supplier={rows,totalOrders,totalDel};
  wrap.innerHTML=`<div style="padding-bottom:20px">
    ${kpis}
    <div class="ma-card">
      <div class="ma-card-hdr">
        <h4>🏭 Supplier / Vendor Scorecard</h4>
        <div style="display:flex;align-items:center;gap:8px">
          ${_maAiBtn('supplier')}
          <input class="ma-srch" id="${srchId}" placeholder="🔍 Search supplier…" value="${srchVal}" oninput="_renderSupplierAnalytics()">
        </div>
      </div>
      <div style="overflow-x:auto">
        <table class="ma-table">
          <thead><tr>
            <th>Supplier</th><th style="text-align:center">Total POs</th>
            <th style="text-align:center">Total Units</th>
            <th style="text-align:center">Fulfillment Rate</th>
            <th style="text-align:center">Avg Deliver Days</th>
            <th style="text-align:center">Billed</th>
            <th style="text-align:center">Active</th>
            <th style="text-align:center">Cancelled</th>
            <th>Transporters Used</th>
          </tr></thead>
          <tbody>${tbody||'<tr><td colspan="9" style="text-align:center;padding:40px;color:#94a3b8">No suppliers found</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  </div>`;
}

// ─────────────────────────────────────
//  🧑 CUSTOMER ANALYTICS
// ─────────────────────────────────────
function _renderCustomerAnalytics(){
  const wrap=document.getElementById('rptCustomerContent');if(!wrap)return;
  const today=new Date().toISOString().slice(0,10);
  const srchId='maCustSrch';
  const srchVal=document.getElementById(srchId)?.value||'';
  const fl=srchVal.toLowerCase();

  const stats={};
  orders.forEach(o=>{
    const cn=o.customer||'Unknown';
    if(!stats[cn]) stats[cn]={
      name:cn, total:0, billed:0, active:0, cancelled:0, overdue:0,
      totalQty:0, skus:new Set(), vendors:new Set(),
      firstOrder:o.orderDate, lastOrder:o.orderDate
    };
    const s=stats[cn];
    s.total++;
    s.totalQty+=(Number(o.qty)||0);
    s.skus.add(o.orderedCode||o.product);
    s.vendors.add(o.vendor);
    if(o.orderDate<s.firstOrder) s.firstOrder=o.orderDate;
    if(o.orderDate>s.lastOrder)  s.lastOrder=o.orderDate;
    if(o.status==='Cancelled') s.cancelled++;
    else if(o.status==='Billed') s.billed++;
    else {
      s.active++;
      if(o.eta&&o.eta<today) s.overdue++;
    }
  });

  const rows=Object.values(stats)
    .filter(r=>!fl||r.name.toLowerCase().includes(fl))
    .sort((a,b)=>b.total-a.total);

  const maxTotal=rows[0]?.total||1;
  const totalOrders=rows.reduce((s,r)=>s+r.total,0);
  const totalOverdue=rows.reduce((s,r)=>s+r.overdue,0);
  const activeCustomers=rows.filter(r=>r.active>0).length;

  const kpis=`<div class="ma-kpi-row">
    ${_maKpi(rows.length,'Total Customers','','#1a73e8')}
    ${_maKpi(activeCustomers,'With Active Orders','currently in pipeline','#f97316')}
    ${_maKpi(totalOrders,'Total Orders','all time','#7c3aed')}
    ${_maKpi(totalOverdue>0?totalOverdue+'⚠️':'0','Overdue Orders',totalOverdue>0?'need attention':'all on schedule',totalOverdue>0?'#dc2626':'#16a34a')}
  </div>`;

  const tbody=rows.map((r,i)=>{
    const pct=Math.round(r.total/maxTotal*100);
    const delivRate=r.total>0?Math.round(r.billed/r.total*100):0;
    return`<tr>
      <td>
        <div style="font-weight:700;color:#1e293b">${r.name}</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:2px">${r.skus.size} SKU${r.skus.size!==1?'s':''} · ${r.vendors.size} supplier${r.vendors.size!==1?'s':''}</div>
        <button onclick="_copyForAIRow('customer',${i})" title="Copy AI deep-dive prompt for ${r.name}" style="margin-top:5px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:5px;font-size:10px;font-weight:700;padding:2px 7px;cursor:pointer;display:inline-flex;align-items:center;gap:3px" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">🤖 AI Charts</button>
      </td>
      <td style="text-align:center">
        <span style="font-weight:900;font-size:15px">${r.total}</span>
        <div style="margin-top:3px"><div class="ma-bar-bg" style="width:80px;margin:0 auto"><div class="ma-bar-fill" style="width:${pct}%;background:#7c3aed"></div></div></div>
      </td>
      <td style="text-align:center;font-weight:700">${r.totalQty.toLocaleString()}</td>
      <td style="text-align:center">${_maScoreBadge(delivRate)}</td>
      <td style="text-align:center">
        <span style="color:#f59e0b;font-weight:700">${r.active}</span>
        ${r.overdue>0?`<span style="color:#dc2626;font-size:11px;font-weight:700"> · ${r.overdue}⚠️</span>`:''}
      </td>
      <td style="text-align:center;color:#16a34a;font-weight:700">${r.billed}</td>
      <td style="text-align:center;color:#94a3b8;font-size:12px">${r.cancelled}</td>
      <td style="font-size:11px;color:#64748b">${r.firstOrder||'—'}</td>
      <td style="font-size:11px;color:#64748b">${r.lastOrder||'—'}</td>
    </tr>`;
  }).join('');

  _maLastStats.customer={rows,totalOrders,totalOverdue,activeCustomers};
  wrap.innerHTML=`<div style="padding-bottom:20px">
    ${kpis}
    <div class="ma-card">
      <div class="ma-card-hdr">
        <h4>🧑 Customer Activity & Order Intelligence</h4>
        <div style="display:flex;align-items:center;gap:8px">
          ${_maAiBtn('customer')}
          <input class="ma-srch" id="${srchId}" placeholder="🔍 Search customer…" value="${srchVal}" oninput="_renderCustomerAnalytics()">
        </div>
      </div>
      <div style="overflow-x:auto">
        <table class="ma-table">
          <thead><tr>
            <th>Customer</th><th style="text-align:center">Total Orders</th>
            <th style="text-align:center">Total Units</th>
            <th style="text-align:center">Delivery Rate</th>
            <th style="text-align:center">Active</th>
            <th style="text-align:center">Billed</th>
            <th style="text-align:center">Cancelled</th>
            <th>First Order</th><th>Last Order</th>
          </tr></thead>
          <tbody>${tbody||'<tr><td colspan="9" style="text-align:center;padding:40px;color:#94a3b8">No customers found</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  </div>`;
}

// ── Enhanced Reports ──
let _rptDays=0;
function _rptSetPeriod(days){
  _rptDays=days;
  document.querySelectorAll('.rpt-period-btn').forEach(b=>{
    b.classList.toggle('active',b.textContent.includes(days===0?'All':days+''));
  });
  const now=new Date();
  const from=document.getElementById('rptFrom');
  const to=document.getElementById('rptTo');
  if(days===0){if(from)from.value='';if(to)to.value='';}
  else{
    const d=new Date(now);d.setDate(d.getDate()-days);
    if(from)from.value=d.toISOString().slice(0,10);
    if(to)to.value=now.toISOString().slice(0,10);
  }
  renderReports();
}
window.renderReports=function(){
  // Sync tab visibility when called directly (e.g. from navTo)
  if(_rptMainTab&&_rptMainTab!=='overview'){
    ['overview','transport','sku','supplier','customer'].forEach(t=>{
      const btn=document.getElementById('rptTabBtn-'+t);
      const pane=document.getElementById('rptTab-'+t);
      if(btn) btn.classList.toggle('rpt-main-tab-active',t===_rptMainTab);
      if(pane) pane.style.display=t===_rptMainTab?'block':'none';
    });
    if(_rptMainTab==='transport') _renderTransporterAnalytics();
    else if(_rptMainTab==='sku') _renderSkuAnalytics();
    else if(_rptMainTab==='supplier') _renderSupplierAnalytics();
    else if(_rptMainTab==='customer') _renderCustomerAnalytics();
    return;
  }
  // Ensure overview tab is marked active
  ['overview','transport','sku','supplier','customer'].forEach(t=>{
    const btn=document.getElementById('rptTabBtn-'+t);
    const pane=document.getElementById('rptTab-'+t);
    if(btn) btn.classList.toggle('rpt-main-tab-active',t==='overview');
    if(pane) pane.style.display=t==='overview'?'block':'none';
  });
  const fromV=document.getElementById('rptFrom')?.value||'';
  const toV=document.getElementById('rptTo')?.value||'';
  const all=orders.filter(o=>{
    if(fromV&&o.orderDate<fromV)return false;
    if(toV&&o.orderDate>toV)return false;
    return true;
  });
  const now=new Date();
  const billed=all.filter(o=>o.status==='Billed');
  const pipeline=all.filter(o=>!['Billed','Cancelled'].includes(o.status));
  const overdue=pipeline.filter(o=>o.eta&&new Date(o.eta)<now);
  const cancelled=all.filter(o=>o.status==='Cancelled');
  // Avg fulfillment
  const fulfilTimes=billed.filter(o=>o.orderDate&&(o.billedDate||_maGetBilledAt(o))).map(o=>{const bd=o.billedDate||(_maGetBilledAt(o)||'').slice(0,10);return Math.round((new Date(bd)-new Date(o.orderDate))/(864e5));}).filter(d=>d>=0);
  const avgFulfill=fulfilTimes.length?Math.round(fulfilTimes.reduce((a,b)=>a+b,0)/fulfilTimes.length):null;
  // Set KPIs
  const se=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  se('rptTotal',all.length);se('rptBilled',billed.length);se('rptPending',pipeline.length);
  se('rptOverdue',overdue.length);se('rptAvgFulfill',avgFulfill?avgFulfill+'d':'—');se('rptCancelled',cancelled.length);
  // Aging report
  const aging={'>60d':0,'31-60d':0,'16-30d':0,'8-15d':0,'0-7d':0};
  pipeline.forEach(o=>{
    const days=Math.round((now-new Date(o.orderDate))/(1000*86400));
    if(days>60)aging['>60d']++;else if(days>30)aging['31-60d']++;else if(days>15)aging['16-30d']++;else if(days>7)aging['8-15d']++;else aging['0-7d']++;
  });
  const maxA=Math.max(...Object.values(aging))||1;
  const agingColors={'>60d':'#ef4444','31-60d':'#f97316','16-30d':'#f59e0b','8-15d':'#0ea5e9','0-7d':'#16a34a'};
  const agingEl=document.getElementById('rptAging');
  if(agingEl)agingEl.innerHTML=Object.entries(aging).map(([k,v])=>`
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
        <span style="font-weight:600;color:${agingColors[k]}">${k}</span>
        <span style="font-weight:700">${v} orders</span>
      </div>
      <div style="height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden">
        <div style="height:100%;background:${agingColors[k]};width:${Math.round(v/maxA*100)}%;border-radius:4px;transition:width .5s"></div>
      </div>
    </div>`).join('');
  // By status
  const STATUSES_ALL=['Order','Approved','PO Raised','In Transit','At Transporter','Warehouse','Purchased','Billed','Cancelled'];
  const STATUS_COLS_MAP={'Order':'#6366f1','Approved':'#0ea5e9','PO Raised':'#f59e0b','In Transit':'#f97316','At Transporter':'#8b5cf6','Warehouse':'#10b981','Purchased':'#06b6d4','Billed':'#16a34a','Cancelled':'#94a3b8'};
  const byStatus=STATUSES_ALL.map(s=>({s,cnt:all.filter(o=>o.status===s).length})).filter(x=>x.cnt>0);
  const maxS=Math.max(...byStatus.map(x=>x.cnt))||1;
  const bsEl=document.getElementById('rptByStatus');
  if(bsEl)bsEl.innerHTML=byStatus.map(({s,cnt})=>`
    <div style="margin-bottom:11px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
        <span style="font-weight:600">${s}</span>
        <span style="font-weight:700;color:${STATUS_COLS_MAP[s]||'#64748b'}">${cnt} (${Math.round(cnt/all.length*100)||0}%)</span>
      </div>
      <div style="height:7px;background:#f1f5f9;border-radius:4px;overflow:hidden">
        <div style="height:100%;background:${STATUS_COLS_MAP[s]||'#64748b'};width:${Math.round(cnt/maxS*100)}%;border-radius:4px"></div>
      </div>
    </div>`).join('');
  // Top customers
  const custMap={};all.forEach(o=>{if(o.customer)custMap[o.customer]=(custMap[o.customer]||0)+1;});
  const topCust=Object.entries(custMap).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const maxC=topCust[0]?.[1]||1;
  const bcEl=document.getElementById('rptByCust');
  if(bcEl)bcEl.innerHTML=topCust.map(([n,c])=>`
    <div style="margin-bottom:9px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px">
        <span style="font-weight:600">${n}</span><span style="font-weight:700;color:#1a73e8">${c}</span>
      </div>
      <div style="height:6px;background:#f1f5f9;border-radius:4px;overflow:hidden">
        <div style="height:100%;background:#1a73e8;width:${Math.round(c/maxC*100)}%;border-radius:4px"></div>
      </div>
    </div>`).join('');
  // Top vendors
  const vendMap={};all.forEach(o=>{if(o.vendor)vendMap[o.vendor]=(vendMap[o.vendor]||0)+1;});
  const topVend=Object.entries(vendMap).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const maxV=topVend[0]?.[1]||1;
  const bvEl=document.getElementById('rptByVend');
  if(bvEl)bvEl.innerHTML=topVend.map(([n,c])=>`
    <div style="margin-bottom:9px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px">
        <span style="font-weight:600">${n}</span><span style="font-weight:700;color:#16a34a">${c}</span>
      </div>
      <div style="height:6px;background:#f1f5f9;border-radius:4px;overflow:hidden">
        <div style="height:100%;background:#16a34a;width:${Math.round(c/maxV*100)}%;border-radius:4px"></div>
      </div>
    </div>`).join('');
  // Trend chart (monthly)
  const trendEl=document.getElementById('rptTrendChart');
  if(trendEl){
    const monthMap={};all.forEach(o=>{if(o.orderDate){const m=o.orderDate.slice(0,7);monthMap[m]=(monthMap[m]||0)+1;}});
    const months=Object.keys(monthMap).sort().slice(-12);
    const vals=months.map(m=>monthMap[m]);
    const maxTrend=Math.max(...vals)||1;
    const W=trendEl.parentElement.offsetWidth-32||300;const H=160;
    trendEl.width=W;trendEl.height=H;
    const ctx=trendEl.getContext('2d');
    ctx.clearRect(0,0,W,H);
    if(months.length<2){ctx.fillStyle='#94a3b8';ctx.font='12px sans-serif';ctx.fillText('Not enough data for trend',10,80);return;}
    const pad=30;const chartW=W-pad*2;const chartH=H-pad*2;
    const step=chartW/(months.length-1);
    // Grid lines
    ctx.strokeStyle='#f1f5f9';ctx.lineWidth=1;
    for(let i=0;i<=4;i++){const y=pad+chartH*(1-i/4);ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(W-pad,y);ctx.stroke();}
    // Line
    ctx.beginPath();ctx.strokeStyle='#1a73e8';ctx.lineWidth=2.5;ctx.lineJoin='round';
    months.forEach((m,i)=>{const x=pad+i*step;const y=pad+chartH*(1-vals[i]/maxTrend);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
    ctx.stroke();
    // Fill
    ctx.lineTo(pad+(months.length-1)*step,pad+chartH);ctx.lineTo(pad,pad+chartH);ctx.closePath();
    ctx.fillStyle='rgba(26,115,232,.1)';ctx.fill();
    // Dots
    ctx.fillStyle='#1a73e8';
    months.forEach((m,i)=>{const x=pad+i*step;const y=pad+chartH*(1-vals[i]/maxTrend);ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();});
    // Labels
    ctx.fillStyle='#94a3b8';ctx.font='9px sans-serif';ctx.textAlign='center';
    months.forEach((m,i)=>{const x=pad+i*step;ctx.fillText(m.slice(5),x,H-4);});
  }
};

function exportReportsExcel(){
  const fromV=document.getElementById('rptFrom')?.value||'';
  const toV=document.getElementById('rptTo')?.value||'';
  const filtered=orders.filter(o=>{
    if(fromV&&o.orderDate<fromV)return false;
    if(toV&&o.orderDate>toV)return false;
    return true;
  });
  const rows=filtered.map(o=>({'DON':o.groupDonId||o.id,'Customer':o.customer,'Product':o.orderedCode||o.product,'Vendor':o.vendor,'Qty':o.qty,'Order Date':o.orderDate,'ETA':o.eta||'','Status':o.status,'Biller':o.biller||'','Sales':o.salesExec||'','Remark':o.remark||''}));
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'Report');
  XLSX.writeFile(wb,`report_${(fromV||'all')}_${(toV||'all')}.xlsx`);
}

// ── Role-based dashboard widget ──
(function(){
  const _origRD=window.renderDashboard||renderDashboard;
  window.renderDashboard=function(){
    _origRD();
    _injectRoleWidget();
    setTimeout(()=>_buildNotifs(),200);
  };
})();
function _injectRoleWidget(){
  if(!currentUser)return;
  const role=currentUser.role;
  const wrap=document.getElementById('dashRoleWidget');
  if(!wrap)return;
  const myOrders=(window.getVisibleOrders||getVisibleOrders)();
  const now=new Date();
  if(role==='salesman'){
    const my=myOrders.filter(o=>o.salesExec===currentUser.name);
    wrap.innerHTML=`<div class="card" style="margin-bottom:14px;background:linear-gradient(135deg,#eff6ff,#fff)">
      <div style="padding:16px 20px">
        <h4 style="font-size:13px;font-weight:800;color:#1e293b;margin-bottom:10px">👤 My Sales Summary</h4>
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <div><div style="font-size:22px;font-weight:800;color:#1a73e8">${my.length}</div><div style="font-size:11px;color:#64748b">My Orders</div></div>
          <div><div style="font-size:22px;font-weight:800;color:#f59e0b">${my.filter(o=>!['Billed','Cancelled'].includes(o.status)).length}</div><div style="font-size:11px;color:#64748b">In Pipeline</div></div>
          <div><div style="font-size:22px;font-weight:800;color:#ef4444">${my.filter(o=>o.eta&&new Date(o.eta)<now&&!['Billed','Cancelled'].includes(o.status)).length}</div><div style="font-size:11px;color:#64748b">Overdue</div></div>
        </div>
      </div></div>`;
  } else if(role==='biller'){
    wrap.innerHTML='';
  }
}

// ── Duplicate prevention ──
function _checkDuplicate(custName){
  const note=document.getElementById('omDupWarn');if(!note)return;
  if(!custName){note.style.display='none';return;}
  const today=new Date().toISOString().slice(0,10);
  const dups=orders.filter(o=>o.customer===custName&&o.orderDate===today&&!['Billed','Cancelled'].includes(o.status));
  if(dups.length>0){
    note.style.display='block';
    note.textContent=`⚠️ ${dups.length} active order${dups.length>1?'s':''} for ${custName} already placed today (DON-${dups.map(o=>o.groupDonId||o.id).join(', DON-')})`;
  } else {note.style.display='none';}
}
// Wrap acShow to call duplicate check
(function(){
  const _origAcShow=window.acShow||acShow;
  window.acShow=function(inputId,q,type){
    _origAcShow(inputId,q,type);
    if(inputId==='omCust'&&type==='cust')_checkDuplicate(q);
  };
  // Also patch acPick
  const _origAcPick=window.acPick||acPick;
  window.acPick=function(inputId,el){
    _origAcPick(inputId,el);
    if(inputId==='omCust'){
      _checkDuplicate(el.dataset.val);
      const custName=el.dataset.val;
      const cust=customers.find(c=>c.name===custName||c.apiName===custName);
      if(cust){
        const billerEl=document.getElementById('omBillerDisp');
        const salesEl=document.getElementById('omSalesDisp');
        if(billerEl&&!billerEl.readOnly&&cust.biller) billerEl.value=cust.biller;
        if(salesEl&&!salesEl.readOnly&&cust.salesExec) salesEl.value=cust.salesExec;
      }
    }
  };
})();

// ── Enhanced audit trail ──
(function(){
  const _origAudit=window.audit||audit;
  window.audit=function(action,detail,entityType='',entityId='',changes=null){
    _origAudit(action,detail,entityType,entityId);
    // Attach changes to the most recent audit entry
    if(changes&&auditLogs.length>0){
      auditLogs[0].changes=changes;
      try{localStorage.setItem(LS_AUDIT,JSON.stringify(auditLogs));}catch(e){}
    }
  };
})();
function _renderAuditChanges(changes){
  if(!changes||!changes.length)return'';
  return`<div style="margin-top:6px;background:#f8fafc;border-radius:6px;padding:6px 10px;font-size:11px">
    ${changes.map(c=>`<div style="display:flex;gap:6px;margin-bottom:3px;align-items:flex-start">
      <span style="color:#64748b;font-weight:600;min-width:80px;flex-shrink:0">${c.field}:</span>
      <span style="color:#ef4444;text-decoration:line-through;flex:1">${c.from||'—'}</span>
      <span style="color:#94a3b8;flex-shrink:0">→</span>
      <span style="color:#16a34a;flex:1">${c.to||'—'}</span>
    </div>`).join('')}
  </div>`;
}

// Init notification build after orders load
window.addEventListener('load',()=>{
  setTimeout(()=>{_buildNotifs();},1200);
});

// ── Dashboard role widget container injection ──
(function(){
  const _origRD2=window.renderDashboard;
  if(_origRD2){
    window.renderDashboard=function(){
      _origRD2();
      // Ensure role widget placeholder exists
      if(!document.getElementById('dashRoleWidget')){
        const pg=document.getElementById('pg-dashboard');
        if(pg){const div=document.createElement('div');div.id='dashRoleWidget';pg.insertBefore(div,pg.firstChild);}
      }
      _injectRoleWidget();
    };
  }
})();


// ── Filter chip active-state sync ──
function _updateChipStates(){
  // DON chips
  document.querySelectorAll('.don-chip').forEach(el=>{
    const chipKey=el.id.replace('don-chip-','');
    el.classList.toggle('chip-active', _donExactFilter===chipKey);
  });
  // SPO chips — match by text content stripped of icon/close marker
  document.querySelectorAll('.spo-chip').forEach(el=>{
    const label=el.textContent.replace(/^📋\s*/,'').replace(/\s*✕\s*$/,'').trim();
    el.classList.toggle('chip-active', !!_spoActiveFilter && _spoActiveFilter===label);
  });
}
