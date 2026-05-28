/* ============================================================
   ConvertAR - Social Proof Popup v3 (real orders)
   convertar-app-production.up.railway.app/static/social-proof.js
   ============================================================ */
(function(){
  if (!document.getElementById('ph-sp-styles')) {
    var st = document.createElement('style'); st.id = 'ph-sp-styles';
    st.textContent = '#ph-sp-wrap{position:fixed;top:12px;left:12px;z-index:99999;width:310px}.ph-sp-card{background:#fff;border-radius:11px;box-shadow:0 6px 24px rgba(0,0,0,.13);padding:10px 13px 10px 10px;display:flex;align-items:flex-start;gap:10px;cursor:pointer;border-left:3px solid #111;opacity:0;transform:translateX(-120%);transition:opacity .38s cubic-bezier(.2,.8,.3,1),transform .38s cubic-bezier(.2,.8,.3,1);user-select:none}.ph-sp-card.ph-sp-in{opacity:1;transform:translateX(0)}.ph-sp-card.ph-sp-out{opacity:0;transform:translateX(-120%);transition:opacity .3s,transform .3s}.ph-sp-thumb{width:44px;height:44px;border-radius:7px;object-fit:cover;flex-shrink:0;background:#f0f0f0}.ph-sp-thumb-icon{width:44px;height:44px;border-radius:7px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}.ph-sp-body{flex:1;min-width:0}.ph-sp-nombre{font-size:12.5px;font-weight:700;color:#111;line-height:1.3}.ph-sp-prod{font-size:11px;font-weight:600;color:#555;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ph-sp-tiempo{font-size:10.5px;color:#aaa;margin-top:2px}.ph-sp-progress{height:2px;background:#ececec;border-radius:1px;margin-top:7px;overflow:hidden}.ph-sp-bar{height:100%;background:#111;border-radius:1px;width:100%;transform-origin:left;animation:ph-bar-shrink linear forwards}@keyframes ph-bar-shrink{from{transform:scaleX(1)}to{transform:scaleX(0)}}';
    document.head.appendChild(st);
  }

  var API_URL = 'https://convertar-app-production.up.railway.app/api/recent-orders';
  var DURACION = 5000, PAUSA = 1200;
  var pool = [], idx = 0;

  var wrap = document.createElement('div'); wrap.id = 'ph-sp-wrap'; document.body.appendChild(wrap);
  var cardEl = null, tVis = null, tNext = null;

  /* --- Fallback simulado (mientras carga o si falla) --- */
  var NOMBRES_FB = ['Mar\u00eda','Carlos','Facundo','Valentina','Diego','Ana','Sof\u00eda','Mart\u00edn','Laura','Pablo','Florencia','Nicol\u00e1s','Camila','Luc\u00eda','Roberto','Jimena','Fernando','Gabriela','Santiago','Paola'];
  var CIUDADES_FB = ['Buenos Aires','C\u00f3rdoba','Rosario','Mendoza','La Plata','Mar del Plata','Salta','Santa Fe','Neuqu\u00e9n','Tucum\u00e1n','Bah\u00eda Blanca','Posadas','San Juan','Resistencia','Corrientes','Paran\u00e1','Formosa','Jujuy','Catamarca','San Luis'];
  var PRODUCTOS_FB = ['Combo Home Black Out + Voile','Cortinas Black Out 210cm','Cortinas Black Out 220cm','Cortinas Black Out 240cm','Cortinas Black Out 260cm','Cortinas Black Out 280cm','Cuadros Decorativos x3','Cortinas Voile 210cm','Set Ropa de Cama Queen','Combo Black Out 3m','Cortinas Black Out 150cm','Cuadros Decorativos x6'];
  function rand(a){return a[Math.floor(Math.random()*a.length)];}
  function buildFallback(){var p=[];for(var i=0;i<20;i++){p.push({nombre:NOMBRES_FB[i],ciudad:rand(CIUDADES_FB),producto:rand(PRODUCTOS_FB),imagen:null,min:(i+1)*3});}return p;}

  function cerrar(cb){
    if(!cardEl){if(cb)cb();return;}
    clearTimeout(tVis);
    cardEl.classList.remove('ph-sp-in'); cardEl.classList.add('ph-sp-out');
    var old=cardEl; cardEl=null;
    setTimeout(function(){if(old.parentNode)old.remove();if(cb)cb();},360);
  }

  function mostrar(){
    if(!pool.length) return;
    if(idx>=pool.length) idx=0;
    var c=pool[idx++];
    var card=document.createElement('div'); card.className='ph-sp-card'; cardEl=card;
    card.addEventListener('click',function(){clearTimeout(tVis);clearTimeout(tNext);cerrar(function(){tNext=setTimeout(mostrar,PAUSA);});});

    /* Imagen o icono */
    if(c.imagen){
      var img=document.createElement('img'); img.className='ph-sp-thumb';
      img.src=c.imagen; img.alt=''; img.onerror=function(){this.style.display='none';};
      card.appendChild(img);
    } else {
      var ico=document.createElement('div'); ico.className='ph-sp-thumb-icon'; ico.textContent='\uD83D\uDED2';
      card.appendChild(ico);
    }

    var body=document.createElement('div'); body.className='ph-sp-body';
    var nom=document.createElement('div'); nom.className='ph-sp-nombre'; nom.textContent=c.nombre+(c.ciudad?' de '+c.ciudad:'');
    var prod=document.createElement('div'); prod.className='ph-sp-prod'; prod.textContent=c.producto;
    var tiem=document.createElement('div'); tiem.className='ph-sp-tiempo';
    tiem.textContent='compr\u00f3 hace '+(c.min>=60?Math.round(c.min/60)+'h':c.min+' min');
    var prog=document.createElement('div'); prog.className='ph-sp-progress';
    var bar=document.createElement('div'); bar.className='ph-sp-bar'; bar.style.animationDuration=DURACION+'ms'; prog.appendChild(bar);
    body.appendChild(nom); body.appendChild(prod); body.appendChild(tiem); body.appendChild(prog);
    card.appendChild(body); wrap.appendChild(card);
    requestAnimationFrame(function(){requestAnimationFrame(function(){card.classList.add('ph-sp-in');});});
    tVis=setTimeout(function(){cerrar(function(){tNext=setTimeout(mostrar,PAUSA);});},DURACION);
  }

  function start(data){
    pool = data && data.length ? data : buildFallback();
    idx = 0;
    setTimeout(mostrar, 2000);
  }

  /* Intentar cargar ordenes reales */
  try {
    fetch(API_URL)
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        start(data && data.length >= 3 ? data : null);
      })
      .catch(function(){ start(null); });
  } catch(e){ start(null); }
})();
