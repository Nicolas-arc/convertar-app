/* ConvertAR - Social Proof Popup v8 — usa órdenes reales de TN */
(function(){
  if(!document.getElementById('ph-sp-styles')){var st=document.createElement('style');st.id='ph-sp-styles';
  st.textContent='#ph-sp-wrap{position:fixed;top:12px;left:12px;z-index:99999;width:310px}.ph-sp-card{position:relative;background:#fff;border-radius:11px;box-shadow:0 6px 24px rgba(0,0,0,.13);padding:10px 28px 10px 10px;display:flex;align-items:flex-start;gap:10px;border-left:3px solid #111;opacity:0;transform:translateX(-120%);transition:opacity .38s cubic-bezier(.2,.8,.3,1),transform .38s cubic-bezier(.2,.8,.3,1);user-select:none}.ph-sp-card.ph-sp-in{opacity:1;transform:translateX(0)}.ph-sp-card.ph-sp-out{opacity:0;transform:translateX(-120%);transition:opacity .3s,transform .3s}.ph-sp-close{position:absolute;top:6px;right:8px;width:16px;height:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#bbb;font-size:15px;line-height:1;border:none;background:none;padding:0}.ph-sp-close:hover{color:#555}.ph-sp-thumb{width:48px;height:48px;border-radius:8px;background:#f0ece6;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:22px}.ph-sp-thumb img{width:100%;height:100%;object-fit:cover;display:block}.ph-sp-body{flex:1;min-width:0}.ph-sp-nombre{font-size:12.5px;font-weight:700;color:#111;line-height:1.3}.ph-sp-prod{font-size:11px;font-weight:600;color:#555;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ph-sp-tiempo{font-size:10.5px;color:#aaa;margin-top:2px}.ph-sp-progress{height:2px;background:#ececec;border-radius:1px;margin-top:7px;overflow:hidden}.ph-sp-bar{height:100%;background:#111;border-radius:1px;width:100%;transform-origin:left;animation:ph-bar-shrink linear forwards}@keyframes ph-bar-shrink{from{transform:scaleX(1)}to{transform:scaleX(0)}}';
  document.head.appendChild(st);}

  var API = 'https://convertar-app-production.up.railway.app';
  var DURACION      = 9000;   /* visible 9 seg                        */
  var PAUSA         = 6000;   /* 6 seg después de cerrar → cada ~15s  */
  var DELAY_INICIAL = 10000;  /* primera: 10 seg                      */

  /* ── Fallback sintético cuando no hay órdenes reales ── */
  var NOMBRES=['Úrsula','María','Carlos','Facundo','Valentina','Diego','Ana','Sofía','Martín','Laura','Pablo','Florencia','Nicolás','Camila','Lucía','Roberto','Jimena','Fernando','Gabriela','Santiago'];
  var CIUDADES=['Buenos Aires','Córdoba','Rosario','Mendoza','La Plata','Mar del Plata','Salta','Santa Fe','Neuquén','Tucumán','Bahía Blanca','Posadas','San Juan','Resistencia','Corrientes'];
  var PRODUCTOS=[
    'Combo Home | Black Out Lino + Voile | 210cm x 130cm',
    'Set x3 Cuadros Decorativo Lienzo MDF',
    'Cortina Black Out x 1 Paño 240cm x 130cm',
    'Combo Black Out + Voile + 3 Cuadros Cosmopolita',
    'Cortina Voile + 3 Cuadros (2 Paños 210cm)',
    'Cortina Black Out x 1 Paño 260cm x 130cm',
    'Set x3 Cuadros 40x35 | Trilogía Aura Azul',
    'Funda Acolchado Microfibra 120gm Premium',
    'Set x3 Cuadros 40x35 | Trilogía Home Frequency',
    'Set x6 Cuadros 30x20 Instinto Superior'
  ];

  function rand(a){return a[Math.floor(Math.random()*a.length)];}

  /* ── Tiempo falso "hace X min" — crece de a ~8-12 min, resetea a los 55 ── */
  var _fakeMin = 5 + Math.floor(Math.random() * 8); /* empieza entre 5-12 min */
  function nextFakeMin() {
    var val = _fakeMin;
    _fakeMin += 8 + Math.floor(Math.random() * 5); /* suma 8-12 min cada vez */
    if (_fakeMin > 55) _fakeMin = 5 + Math.floor(Math.random() * 6); /* resetea */
    return val;
  }
  function fmtMin(m){ return 'hace ' + m + ' min'; }

  /* ── Pool de órdenes reales (cacheadas en memoria) ── */
  var _ordenes = null;
  var _ordenIdx = 0;

  function cargarOrdenes(cb) {
    if (_ordenes !== null) { cb(); return; }
    fetch(API + '/api/recent-orders', { cache: 'no-store' })
      .then(function(r){ return r.ok ? r.json() : []; })
      .then(function(data){
        _ordenes = Array.isArray(data) && data.length ? data : [];
        cb();
      })
      .catch(function(){ _ordenes = []; cb(); });
  }

  function getSiguiente() {
    if (_ordenes && _ordenes.length) {
      var o = _ordenes[_ordenIdx % _ordenes.length];
      _ordenIdx++;
      return { nombre: o.nombre, ciudad: o.ciudad, producto: o.producto, imagen: o.imagen, min: nextFakeMin() };
    }
    /* Fallback sintético */
    var KEY = 'ph_sp_idx', LOOP = 23, idx = 0;
    try { idx = parseInt(localStorage.getItem(KEY)||'0',10)||0; } catch(e){}
    try { localStorage.setItem(KEY, String((idx+1)%LOOP)); } catch(e){}
    return { nombre: rand(NOMBRES), ciudad: rand(CIUDADES), producto: PRODUCTOS[idx%PRODUCTOS.length], imagen: null, min: nextFakeMin() };
  }

  var dismissed = false;
  var wrap = document.createElement('div'); wrap.id='ph-sp-wrap'; document.body.appendChild(wrap);
  var cardEl = null, tVis = null, tNext = null;

  function stopAll(){dismissed=true;clearTimeout(tVis);clearTimeout(tNext);cerrar();}
  function cerrar(cb){if(!cardEl){if(cb)cb();return;}clearTimeout(tVis);cardEl.classList.remove('ph-sp-in');cardEl.classList.add('ph-sp-out');var old=cardEl;cardEl=null;setTimeout(function(){if(old.parentNode)old.remove();if(cb)cb();},360);}

  function mostrar(){
    if(dismissed)return;
    var c = getSiguiente();

    var card=document.createElement('div');card.className='ph-sp-card';cardEl=card;

    /* botón cerrar */
    var x=document.createElement('button');x.className='ph-sp-close';x.textContent='×';x.setAttribute('aria-label','Cerrar');
    x.addEventListener('click',function(e){e.stopPropagation();stopAll();});card.appendChild(x);

    /* thumbnail — imagen real o emoji */
    var thumb=document.createElement('div');thumb.className='ph-sp-thumb';
    if(c.imagen){
      var im=document.createElement('img');im.src=c.imagen;im.alt='';
      im.onerror=function(){thumb.innerHTML='';thumb.textContent='🛒';};
      thumb.appendChild(im);
    } else {
      thumb.textContent='🛒';
    }

    /* body */
    var body=document.createElement('div');body.className='ph-sp-body';
    var nom=document.createElement('div');nom.className='ph-sp-nombre';
    nom.textContent=c.nombre+(c.ciudad?' de '+c.ciudad:'')+' compró';
    var prod=document.createElement('div');prod.className='ph-sp-prod';prod.textContent=c.producto;
    var tiem=document.createElement('div');tiem.className='ph-sp-tiempo';tiem.textContent=fmtMin(c.min);
    var prog=document.createElement('div');prog.className='ph-sp-progress';
    var bar=document.createElement('div');bar.className='ph-sp-bar';bar.style.animationDuration=DURACION+'ms';
    prog.appendChild(bar);
    body.appendChild(nom);body.appendChild(prod);body.appendChild(tiem);body.appendChild(prog);

    card.appendChild(thumb);card.appendChild(body);wrap.appendChild(card);
    card.addEventListener('click',function(){
      clearTimeout(tVis);clearTimeout(tNext);
      cerrar(function(){if(!dismissed)tNext=setTimeout(mostrar,PAUSA);});
    });
    requestAnimationFrame(function(){requestAnimationFrame(function(){card.classList.add('ph-sp-in');});});
    tVis=setTimeout(function(){cerrar(function(){if(!dismissed)tNext=setTimeout(mostrar,PAUSA);});},DURACION);
  }

  /* Arrancar: cargar órdenes reales y mostrar primera después del delay inicial */
  setTimeout(function() {
    cargarOrdenes(function() { mostrar(); });
  }, DELAY_INICIAL);
})();
