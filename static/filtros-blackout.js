/* ============================================================
   ConvertAR · Hero + Filtros Cortinas Black Out
   convertar-app-production.up.railway.app/static/filtros-blackout.js
   ============================================================ */
(function () {
  if (!window.location.pathname.includes('/black-out')) return;
  if (window.location.pathname.includes('/combos-home')) return;
  var css = '#ph-cortinas-hero{width:100%;overflow:hidden;background:linear-gradient(135deg,#0a0a0a 0%,#1a1a1a 50%,#2a2a2a 100%);display:flex;align-items:center;justify-content:center;padding:40px 24px;min-height:260px}#ph-cortinas-hero-inner{max-width:680px;width:100%;text-align:center}#ph-cortinas-hero-inner .hero-tag{display:inline-block;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:14px}#ph-cortinas-hero-inner h1{font-size:clamp(20px,3.5vw,32px);font-weight:800;color:#fff;line-height:1.2;margin-bottom:18px}.ph-cortinas-formula{display:inline-flex;align-items:center;gap:12px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:14px 22px;margin-bottom:18px;flex-wrap:wrap;justify-content:center}.ph-cortinas-fbox{display:flex;flex-direction:column;align-items:center;gap:2px}.ph-cortinas-fbox .flabel{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.4)}.ph-cortinas-fbox .fval{font-size:13px;font-weight:700;color:#fff;white-space:nowrap}.ph-cortinas-fsep{font-size:20px;color:rgba(255,255,255,0.25)}.ph-cortinas-note{font-size:12px;color:rgba(255,255,255,0.45);line-height:1.6;max-width:400px;margin:0 auto}.ph-cortinas-note strong{color:rgba(255,255,255,0.8)}#ph-cortinas-filtros{background:#fafaf9;padding:28px 16px 22px;text-align:center;border-bottom:1px solid #efefed;margin-bottom:8px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}#ph-cortinas-filtros h3{font-size:clamp(13px,2.2vw,16px);font-weight:700;color:#111;margin:0 0 6px}#ph-cortinas-filtros p{font-size:12px;color:#888;margin:0 0 18px}#ph-cortinas-pills{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}.ph-co-pill{display:inline-flex;flex-direction:column;align-items:center;gap:3px;padding:10px 18px;border-radius:999px;border:1.5px solid rgba(0,0,0,.12);background:rgba(255,255,255,.85);cursor:pointer;transition:all .2s ease;box-shadow:0 2px 8px rgba(0,0,0,.06);min-width:100px;font-family:inherit}.ph-co-pill:hover{border-color:#111;background:#fff;transform:translateY(-1px)}.ph-co-pill.active{background:#111;border-color:#111}.ph-co-pill.active .ph-co-label{color:#fff}.ph-co-pill.active .ph-co-sub{color:rgba(255,255,255,.6)}.ph-co-label{font-size:14px;font-weight:700;color:#111;white-space:nowrap}.ph-co-sub{font-size:10px;color:#999;white-space:nowrap;text-align:center;line-height:1.3}#ph-cortinas-result{font-size:12px;color:#aaa;margin-top:14px}.ph-co-pill.pill-combos{border-color:rgba(180,130,60,.4);background:linear-gradient(135deg,rgba(212,168,90,.12),rgba(180,130,60,.08))}.ph-co-pill.pill-combos .ph-co-label{color:#8a6020}.ph-co-pill.pill-combos .ph-co-sub{color:#b8954a}@media(max-width:480px){.ph-co-pill{min-width:75px;padding:9px 10px}.ph-co-label{font-size:12px}.ph-co-sub{font-size:9px}}';
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

  var filtros=[
    {key:'todos',  label:'Todas',       sub:'Ver todo'},
    {key:'h150',   label:'150cm',       sub:'110 – 150cm'},
    {key:'h210',   label:'210cm',       sub:'2 paños'},
    {key:'h220',   label:'220cm',       sub:'1 paño'},
    {key:'h240',   label:'240cm',       sub:'1 paño'},
    {key:'h260',   label:'260cm',       sub:'1 paño'},
    {key:'h280',   label:'280cm',       sub:'1 paño'},
    {key:'h3m',    label:'3m',          sub:'300cm'},
    {key:'combos', label:'Combo Home',  sub:'Black Out + Voile', url:'https://www.pintoshogar.com.ar/black-out/combos-home/', extraClass:'pill-combos'}
  ];

  var activoKey='todos';
  function getCards(){return document.querySelectorAll('.js-item-product,.item-product');}
  function getNombre(card){var el=card.querySelector('.js-item-name,.item-name');return el?el.textContent.toLowerCase():'';}
  function matchFiltro(n,key){
    if(key==='todos') return true;
    if(key==='h150') return /\b(110|120|130|140|150)(?:cm)?\s*[x×]/i.test(n);
    if(key==='h210') return /\b210(?!\d)/i.test(n);
    if(key==='h220') return /\b220(?!\d)/i.test(n);
    if(key==='h240') return /\b240(?!\d)/i.test(n);
    if(key==='h260') return /\b260(?!\d)/i.test(n);
    if(key==='h280') return /\b280(?!\d)/i.test(n);
    if(key==='h3m')  return /\b300(?!\d)/i.test(n)||/\b3\s*m\b/i.test(n);
    return true;
  }
  function aplicarFiltro(key,url){
    if(url){window.location.href=url;return;}
    activoKey=key; var visibles=0;
    getCards().forEach(function(card){var m=matchFiltro(getNombre(card),key);card.style.display=m?'':'none';if(m)visibles++;});
    document.querySelectorAll('.ph-co-pill').forEach(function(p){p.classList.toggle('active',p.dataset.key===key);});
    var res=document.getElementById('ph-cortinas-result');if(res)res.textContent=visibles+' producto'+(visibles!==1?'s':'');
  }
  function insertarHero(){
    if(document.getElementById('ph-cortinas-hero'))return;
    var hero=document.createElement('div');hero.id='ph-cortinas-hero';
    hero.innerHTML='<div id="ph-cortinas-hero-inner"><span class="hero-tag">Cortinas Black Out</span><h1>¿Cuál es la cortina perfecta para tu ventana?</h1><div class="ph-cortinas-formula"><div class="ph-cortinas-fbox"><span class="flabel">Alto</span><span class="fval">Tu ventana</span></div><span class="ph-cortinas-fsep">×</span><div class="ph-cortinas-fbox"><span class="flabel">Ancho</span><span class="fval">Cantidad de paños</span></div><span class="ph-cortinas-fsep">=</span><div class="ph-cortinas-fbox"><span class="flabel">Tu cortina</span><span class="fval">Perfecta</span></div></div><p class="ph-cortinas-note">El <strong>alto</strong> define el tamaño · El <strong>ancho</strong> define cuántos paños. Cada paño mide 130cm de ancho.</p></div>';
    var pillsHtml=filtros.map(function(f){return '<button class="ph-co-pill'+(f.key==='todos'?' active':'')+(f.extraClass?' '+f.extraClass:'')+'" data-key="'+f.key+'" data-url="'+(f.url||'')+'"><span class="ph-co-label">'+f.label+'</span><span class="ph-co-sub">'+f.sub+'</span></button>';}).join('');
    var filtrosEl=document.createElement('div');filtrosEl.id='ph-cortinas-filtros';
    filtrosEl.innerHTML='<h3>¿Qué alto tiene tu ventana?</h3><p>Seleccioná y te mostramos exactamente las que te quedan</p><div id="ph-cortinas-pills">'+pillsHtml+'</div><div id="ph-cortinas-result"></div>';
    var ref=document.querySelector('.js-product-table,.products-grid,.js-products-container,#products');if(!ref)return;
    ref.parentNode.insertBefore(hero,ref);ref.parentNode.insertBefore(filtrosEl,ref);
    document.querySelectorAll('.ph-co-pill').forEach(function(btn){btn.addEventListener('click',function(){aplicarFiltro(this.dataset.key,this.dataset.url||null);});});
    aplicarFiltro('todos');
    new MutationObserver(function(){if(activoKey!=='todos')aplicarFiltro(activoKey);}).observe(ref,{childList:true,subtree:true});
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',insertarHero);}else{setTimeout(insertarHero,400);}
})();
