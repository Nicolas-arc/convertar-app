/* ============================================================
   ConvertAR - Social Proof Popup v4 (fixed products + persist)
   convertar-app-production.up.railway.app/static/social-proof.js
   ============================================================ */
(function(){
  if (!document.getElementById('ph-sp-styles')) {
    var st = document.createElement('style'); st.id = 'ph-sp-styles';
    st.textContent = '#ph-sp-wrap{position:fixed;top:12px;left:12px;z-index:99999;width:310px}.ph-sp-card{background:#fff;border-radius:11px;box-shadow:0 6px 24px rgba(0,0,0,.13);padding:10px 13px 10px 10px;display:flex;align-items:flex-start;gap:10px;cursor:pointer;border-left:3px solid #111;opacity:0;transform:translateX(-120%);transition:opacity .38s cubic-bezier(.2,.8,.3,1),transform .38s cubic-bezier(.2,.8,.3,1);user-select:none}.ph-sp-card.ph-sp-in{opacity:1;transform:translateX(0)}.ph-sp-card.ph-sp-out{opacity:0;transform:translateX(-120%);transition:opacity .3s,transform .3s}.ph-sp-thumb-icon{width:44px;height:44px;border-radius:7px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}.ph-sp-body{flex:1;min-width:0}.ph-sp-nombre{font-size:12.5px;font-weight:700;color:#111;line-height:1.3}.ph-sp-prod{font-size:11px;font-weight:600;color:#555;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ph-sp-tiempo{font-size:10.5px;color:#aaa;margin-top:2px}.ph-sp-progress{height:2px;background:#ececec;border-radius:1px;margin-top:7px;overflow:hidden}.ph-sp-bar{height:100%;background:#111;border-radius:1px;width:100%;transform-origin:left;animation:ph-bar-shrink linear forwards}@keyframes ph-bar-shrink{from{transform:scaleX(1)}to{transform:scaleX(0)}}';
    document.head.appendChild(st);
  }

  var NOMBRES=[
    'Mar\u00eda','Carlos','Facundo','Valentina','Diego',
    'Ana','Sof\u00eda','Mart\u00edn','Laura','Pablo',
    'Florencia','Nicol\u00e1s','Camila','Luc\u00eda','Roberto',
    'Jimena','Fernando','Gabriela','Santiago','Paola',
    'Agust\u00edn','Daniela','Rodrigo','Micaela','Esteban'
  ];
  var CIUDADES=[
    'Buenos Aires','C\u00f3rdoba','Rosario','Mendoza','La Plata',
    'Mar del Plata','Salta','Santa Fe','Neuqu\u00e9n','Tucum\u00e1n',
    'Bah\u00eda Blanca','Posadas','San Juan','Resistencia','Corrientes',
    'Paran\u00e1','Formosa','Jujuy','Catamarca','San Luis',
    'Lomas de Zamora','Quilmes','Tigre','Vicente L\u00f3pez','Mor\u00f3n'
  ];

  /* 16 productos reales en orden fijo */
  var PRODUCTOS=[
    'Combo Home | Black Out Lino + Voile | 210cm x 130cm',
    'Set x3 Cuadros Decorativo Lienzo Impreso Sobre Base Mdf',
    'Cortina Black Out Textil x 1 Pa\u00f1o de 240cm x 130cm',
    'Combo Black Out + Voile + 3 Cuadros Cosmopolita | 210cm',
    'Agarraderas De Cortinas x2 Black',
    'Cortina Voile + 3 Cuadros (2 Pa\u00f1os Voile Blanco 210cm)',
    'Cortina Black Out Textil x 1 Pa\u00f1o de 260cm x 130cm',
    'Set x3 Cuadros 40x35 | Trilog\u00eda Aura Azul',
    'Funda De Acolchado | Microfibra 120gm Premium',
    'Combo Home | Black Out Lino + Voile | 210cm x 130cm',
    'Set x3 Cuadros 40x35 | Trilog\u00eda Home Frequency',
    'Cortina Voile + 3 Cuadros (2 Pa\u00f1os Voile Blanco 210cm)',
    'Set x3 Cuadros Decorativo Lienzo Impreso Sobre Base Mdf',
    'Juego Cortinas Tropical Simil Lino + 3 Cuadros Aura Rosa',
    'Set x6 Cuadros 30x20 Instinto Superior',
    'Set x3 Cuadro Personalizado 40x35 | La pared Pinterest'
  ];

  /* Tiempos: 3 min, luego +8 cada uno */
  var TIEMPOS=[];
  for(var t=0;t<16;t++) TIEMPOS.push(t===0 ? 3 : 3 + t*8);
  /* = 3,11,19,27,35,43,51,59,67,75,83,91,99,107,115,123 */

  function rand(a){return a[Math.floor(Math.random()*a.length)];}
  function fmtMin(m){
    if(m<60) return 'compr\u00f3 hace '+m+' min';
    var h=Math.floor(m/60), rm=m%60;
    return 'compr\u00f3 hace '+(rm>0 ? h+'h '+rm+'min' : h+'h');
  }

  /* Persistir idx entre navegaciones */
  var STORE_KEY='ph_sp_idx';
  function getIdx(){try{return parseInt(sessionStorage.getItem(STORE_KEY)||'0',10)||0;}catch(e){return 0;}}
  function setIdx(i){try{sessionStorage.setItem(STORE_KEY,String(i));}catch(e){}}

  /* Construir pool mezclando nombres/ciudades aleatoriamente */
  function buildPool(){
    var p=[];
    for(var i=0;i<16;i++){
      p.push({
        nombre:  rand(NOMBRES),
        ciudad:  rand(CIUDADES),
        producto: PRODUCTOS[i],
        min:     TIEMPOS[i]
      });
    }
    return p;
  }

  var pool=buildPool();
  var DURACION=5000, PAUSA=1200;
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
    var idx=getIdx();
    if(idx>=pool.length) idx=0;
    var c=pool[idx];
    setIdx(idx+1);

    var card=document.createElement('div'); card.className='ph-sp-card'; cardEl=card;
    card.addEventListener('click',function(){clearTimeout(tVis);clearTimeout(tNext);cerrar(function(){tNext=setTimeout(mostrar,PAUSA);});});

    var ico=document.createElement('div'); ico.className='ph-sp-thumb-icon'; ico.textContent='\uD83D\uDED2';
    var body=document.createElement('div'); body.className='ph-sp-body';
    var nom=document.createElement('div'); nom.className='ph-sp-nombre'; nom.textContent=c.nombre+' de '+c.ciudad;
    var prod=document.createElement('div'); prod.className='ph-sp-prod'; prod.textContent=c.producto;
    var tiem=document.createElement('div'); tiem.className='ph-sp-tiempo'; tiem.textContent=fmtMin(c.min);
    var prog=document.createElement('div'); prog.className='ph-sp-progress';
    var bar=document.createElement('div'); bar.className='ph-sp-bar'; bar.style.animationDuration=DURACION+'ms'; prog.appendChild(bar);
    body.appendChild(nom); body.appendChild(prod); body.appendChild(tiem); body.appendChild(prog);
    card.appendChild(ico); card.appendChild(body); wrap.appendChild(card);
    requestAnimationFrame(function(){requestAnimationFrame(function(){card.classList.add('ph-sp-in');});});
    tVis=setTimeout(function(){cerrar(function(){tNext=setTimeout(mostrar,PAUSA);});},DURACION);
  }

  setTimeout(mostrar, 2000);
})();
