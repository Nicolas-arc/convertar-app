/* ConvertAR - Floating Buttons v2 (WA + Promos popup) */
(function(){
  var SHOP_ID='pintoshogar';
  var API='https://convertar-app-production.up.railway.app';
  var WA='5492235551148';
  var WA_MSG='Hola! Quiero hacer una consulta sobre sus productos.';
  var DEFAULT_PROMOS=[
    {icon:'\uD83D\uDCB3',titulo:'6 cuotas sin inter\u00e9s',detalle:'Con todas las tarjetas'},
    {icon:'\uD83C\uDFE6',titulo:'10% OFF con transferencia',detalle:'Mejor precio al momento de pagar'},
    {icon:'\uD83D\uDE9A',titulo:'Env\u00edo gratis',detalle:'En compras desde $69.999'},
    {icon:'\uD83C\uDF81',titulo:'Arm\u00e1 tu combo',detalle:'Black Out + Voile + Cuadros con descuento especial'}
  ];
  var _promos=null;

  var CSS=[
    '#ph-fb-wrap{position:fixed;bottom:20px;right:20px;z-index:99998;display:flex;flex-direction:column;align-items:flex-end;gap:10px}',
    '#ph-fb-promo{display:inline-flex;align-items:center;gap:8px;padding:11px 20px;background:#111;color:#fff;border:none;border-radius:999px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.25);transition:transform .2s,box-shadow .2s;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;white-space:nowrap}',
    '#ph-fb-promo:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.35)}',
    '#ph-fb-wa{width:56px;height:56px;border-radius:50%;background:#25d366;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(37,211,102,.4);transition:transform .2s,box-shadow .2s;text-decoration:none}',
    '#ph-fb-wa:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(37,211,102,.55)}',
    '#ph-fb-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:999999;display:flex;align-items:flex-end;justify-content:center;padding-bottom:0}',
    '@media(min-width:480px){#ph-fb-overlay{align-items:center}}',
    '#ph-fb-modal{background:#fff;width:100%;max-width:400px;border-radius:20px 20px 0 0;overflow:hidden;animation:ph-fb-up .3s cubic-bezier(.2,.8,.3,1)}',
    '@media(min-width:480px){#ph-fb-modal{border-radius:20px;max-height:90vh;overflow-y:auto}}',
    '@keyframes ph-fb-up{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}',
    '.ph-fb-mhead{background:#111;color:#fff;padding:18px 20px;display:flex;align-items:center;justify-content:space-between}',
    '.ph-fb-mhead-title{font-size:16px;font-weight:800;letter-spacing:-.2px}',
    '.ph-fb-mclose{background:rgba(255,255,255,.15);border:none;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;line-height:1}',
    '.ph-fb-mclose:hover{background:rgba(255,255,255,.25)}',
    '.ph-fb-mbody{padding:16px 20px;display:flex;flex-direction:column;gap:12px}',
    '.ph-fb-prow{display:flex;align-items:center;gap:14px;background:#f9f9f8;border-radius:12px;padding:14px}',
    '.ph-fb-picon{width:48px;height:48px;border-radius:10px;background:#fff;border:1px solid #eee;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}',
    '.ph-fb-ptext{flex:1;min-width:0}',
    '.ph-fb-ptit{font-size:14px;font-weight:700;color:#111;line-height:1.3}',
    '.ph-fb-pdet{font-size:12px;color:#888;margin-top:2px}',
    '.ph-fb-mfooter{padding:0 20px 20px}',
    '.ph-fb-wa-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:14px;background:#25d366;color:#fff;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;transition:background .2s}',
    '.ph-fb-wa-btn:hover{background:#1da851}'
  ].join('');

  if(!document.getElementById('ph-fb-css')){
    var s=document.createElement('style');s.id='ph-fb-css';s.textContent=CSS;document.head.appendChild(s);
  }

  var wrap=document.createElement('div');wrap.id='ph-fb-wrap';
  var promoBtn=document.createElement('button');promoBtn.id='ph-fb-promo';
  promoBtn.textContent='\uD83D\uDD25 Ver promos hoy';
  promoBtn.onclick=openModal;
  var waBtn=document.createElement('a');waBtn.id='ph-fb-wa';
  waBtn.href='https://wa.me/'+WA+'?text='+encodeURIComponent(WA_MSG);
  waBtn.target='_blank';waBtn.rel='noopener';
  waBtn.innerHTML='<svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';
  wrap.appendChild(promoBtn);wrap.appendChild(waBtn);

  function init(){if(!document.getElementById('ph-fb-wrap'))document.body.appendChild(wrap);}

  var overlay=null;
  function openModal(){
    if(overlay)return;
    if(_promos){renderModal(_promos);return;}
    promoBtn.disabled=true;
    fetch(API+'/api/promos/'+SHOP_ID)
      .then(function(r){return r.ok?r.json():null;})
      .then(function(d){_promos=Array.isArray(d)&&d.length?d:DEFAULT_PROMOS;renderModal(_promos);})
      .catch(function(){_promos=DEFAULT_PROMOS;renderModal(_promos);})
      .finally(function(){promoBtn.disabled=false;});
  }

  function closeModal(){if(overlay){overlay.remove();overlay=null;}}

  function renderModal(promos){
    overlay=document.createElement('div');overlay.id='ph-fb-overlay';
    overlay.addEventListener('click',function(e){if(e.target===overlay)closeModal();});
    var modal=document.createElement('div');modal.id='ph-fb-modal';
    var head=document.createElement('div');head.className='ph-fb-mhead';
    var htit=document.createElement('div');htit.className='ph-fb-mhead-title';
    htit.textContent='Promociones de hoy \uD83C\uDF89';
    var hclose=document.createElement('button');hclose.className='ph-fb-mclose';
    hclose.textContent='\u00d7';hclose.onclick=closeModal;
    head.appendChild(htit);head.appendChild(hclose);
    var body=document.createElement('div');body.className='ph-fb-mbody';
    promos.forEach(function(p){
      var row=document.createElement('div');row.className='ph-fb-prow';
      var ico=document.createElement('div');ico.className='ph-fb-picon';ico.textContent=p.icon||'\u2728';
      var txt=document.createElement('div');txt.className='ph-fb-ptext';
      var tit=document.createElement('div');tit.className='ph-fb-ptit';tit.textContent=p.titulo||'';
      var det=document.createElement('div');det.className='ph-fb-pdet';det.textContent=p.detalle||'';
      txt.appendChild(tit);txt.appendChild(det);
      row.appendChild(ico);row.appendChild(txt);body.appendChild(row);
    });
    var footer=document.createElement('div');footer.className='ph-fb-mfooter';
    var waLink=document.createElement('a');waLink.className='ph-fb-wa-btn';
    waLink.href='https://wa.me/'+WA+'?text='+encodeURIComponent(WA_MSG);
    waLink.target='_blank';waLink.rel='noopener';
    waLink.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> Consultar por WhatsApp';
    footer.appendChild(waLink);
    modal.appendChild(head);modal.appendChild(body);modal.appendChild(footer);
    overlay.appendChild(modal);document.body.appendChild(overlay);
  }

  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
})();
