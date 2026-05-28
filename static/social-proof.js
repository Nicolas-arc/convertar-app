/* ============================================================
   ConvertAR - Social Proof Popup v2
   convertar-app-production.up.railway.app/static/social-proof.js
   ============================================================ */
(function(){
  if (!document.getElementById('ph-sp-styles')) {
    var st = document.createElement('style'); st.id = 'ph-sp-styles';
    st.textContent = '#ph-sp-wrap{position:fixed;top:12px;left:12px;z-index:99999;width:300px}.ph-sp-card{background:#fff;border-radius:11px;box-shadow:0 6px 24px rgba(0,0,0,.13);padding:12px 13px 10px;display:flex;align-items:flex-start;gap:10px;cursor:pointer;border-left:3px solid #111;opacity:0;transform:translateX(-120%);transition:opacity .38s cubic-bezier(.2,.8,.3,1),transform .38s cubic-bezier(.2,.8,.3,1);user-select:none}.ph-sp-card.ph-sp-in{opacity:1;transform:translateX(0)}.ph-sp-card.ph-sp-out{opacity:0;transform:translateX(-120%);transition:opacity .3s,transform .3s}.ph-sp-icon{font-size:19px;flex-shrink:0;margin-top:1px;line-height:1}.ph-sp-body{flex:1;min-width:0}.ph-sp-nombre{font-size:13px;font-weight:700;color:#111;line-height:1.3}.ph-sp-prod{font-size:11.5px;font-weight:600;color:#555;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ph-sp-tiempo{font-size:11px;color:#aaa;margin-top:2px}.ph-sp-progress{height:2px;background:#ececec;border-radius:1px;margin-top:8px;overflow:hidden}.ph-sp-bar{height:100%;background:#111;border-radius:1px;width:100%;transform-origin:left;animation:ph-bar-shrink linear forwards}@keyframes ph-bar-shrink{from{transform:scaleX(1)}to{transform:scaleX(0)}}';
    document.head.appendChild(st);
  }

  var NOMBRES=[
    'Mar\u00eda','Carlos','Facundo','Valentina','Diego',
    'Ana','Sof\u00eda','Mart\u00edn','Laura','Pablo',
    'Florencia','Nicol\u00e1s','Camila','Luc\u00eda','Roberto',
    'Jimena','Fernando','Gabriela','Santiago','Paola'
  ];
  var CIUDADES=[
    'Buenos Aires','C\u00f3rdoba','Rosario','Mendoza','La Plata',
    'Mar del Plata','Salta','Santa Fe','Neuqu\u00e9n','Tucum\u00e1n',
    'Bah\u00eda Blanca','Posadas','San Juan','Resistencia','Corrientes',
    'Paran\u00e1','Formosa','Jujuy','Catamarca','San Luis'
  ];

  /* TODO Fase 3: reemplazar PRODUCTOS con fetch a /api/recent-orders?shop=pintoshogar */
  var PRODUCTOS=[
    'Combo Home Black Out + Voile',
    'Cortinas Black Out 210cm',
    'Cortinas Black Out 220cm',
    'Cortinas Black Out 240cm',
    'Cortinas Black Out 260cm',
    'Cortinas Black Out 280cm',
    'Cuadros Decorativos x3',
    'Cortinas Voile 210cm',
    'Set Ropa de Cama Queen',
    'Combo Black Out 3m',
    'Cortinas Black Out 150cm',
    'Cuadros Decorativos x6'
  ];

  function rand(a){return a[Math.floor(Math.random()*a.length)];}

  /* 20 compras - tiempos de 3 en 3: 3, 6, 9 ... 60 min */
  var pool=[];
  for(var i=0;i<20;i++){pool.push({nombre:NOMBRES[i],ciudad:rand(CIUDADES),producto:rand(PRODUCTOS),min:(i+1)*3});}

  var idx=0, DURACION=5000, PAUSA=1200;
  var wrap=document.createElement('div'); wrap.id='ph-sp-wrap'; document.body.appendChild(wrap);
  var cardEl=null, tVis=null, tNext=null;

  function cerrar(cb){
    if(!cardEl){if(cb)cb();return;}
    clearTimeout(tVis);
    cardEl.classList.remove('ph-sp-in'); cardEl.classList.add('ph-sp-out');
    var old=cardEl; cardEl=null;
    setTimeout(function(){if(old.parentNode)old.remove();if(cb)cb();},360);
  }

  function mostrar(){
    if(idx>=pool.length)idx=0;
    var c=pool[idx++];
    var card=document.createElement('div'); card.className='ph-sp-card'; cardEl=card;
    card.addEventListener('click',function(){clearTimeout(tVis);clearTimeout(tNext);cerrar(function(){tNext=setTimeout(mostrar,PAUSA);});});
    var icon=document.createElement('span'); icon.className='ph-sp-icon'; icon.textContent='\uD83D\uDED2';
    var body=document.createElement('div'); body.className='ph-sp-body';
    var nom=document.createElement('div'); nom.className='ph-sp-nombre'; nom.textContent=c.nombre+' de '+c.ciudad;
    var prod=document.createElement('div'); prod.className='ph-sp-prod'; prod.textContent=c.producto;
    var tiem=document.createElement('div'); tiem.className='ph-sp-tiempo'; tiem.textContent='compr\u00f3 hace '+c.min+' min';
    var prog=document.createElement('div'); prog.className='ph-sp-progress';
    var bar=document.createElement('div'); bar.className='ph-sp-bar'; bar.style.animationDuration=DURACION+'ms'; prog.appendChild(bar);
    body.appendChild(nom); body.appendChild(prod); body.appendChild(tiem); body.appendChild(prog);
    card.appendChild(icon); card.appendChild(body); wrap.appendChild(card);
    requestAnimationFrame(function(){requestAnimationFrame(function(){card.classList.add('ph-sp-in');});});
    tVis=setTimeout(function(){cerrar(function(){tNext=setTimeout(mostrar,PAUSA);});},DURACION);
  }

  setTimeout(mostrar, 2000);
})();
