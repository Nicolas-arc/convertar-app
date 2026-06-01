/* ConvertAR - Social Proof Popup v7 */
(function(){
  if(!document.getElementById('ph-sp-styles')){var st=document.createElement('style');st.id='ph-sp-styles';
  st.textContent='#ph-sp-wrap{position:fixed;top:12px;left:12px;z-index:99999;width:310px}.ph-sp-card{position:relative;background:#fff;border-radius:11px;box-shadow:0 6px 24px rgba(0,0,0,.13);padding:10px 28px 10px 10px;display:flex;align-items:flex-start;gap:10px;border-left:3px solid #111;opacity:0;transform:translateX(-120%);transition:opacity .38s cubic-bezier(.2,.8,.3,1),transform .38s cubic-bezier(.2,.8,.3,1);user-select:none}.ph-sp-card.ph-sp-in{opacity:1;transform:translateX(0)}.ph-sp-card.ph-sp-out{opacity:0;transform:translateX(-120%);transition:opacity .3s,transform .3s}.ph-sp-close{position:absolute;top:6px;right:8px;width:16px;height:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#bbb;font-size:15px;line-height:1;border:none;background:none;padding:0}.ph-sp-close:hover{color:#555}.ph-sp-thumb{width:48px;height:48px;border-radius:8px;background:#f0ece6;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:22px}.ph-sp-thumb img{width:100%;height:100%;object-fit:cover;display:block}.ph-sp-body{flex:1;min-width:0}.ph-sp-nombre{font-size:12.5px;font-weight:700;color:#111;line-height:1.3}.ph-sp-prod{font-size:11px;font-weight:600;color:#555;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ph-sp-tiempo{font-size:10.5px;color:#aaa;margin-top:2px}.ph-sp-progress{height:2px;background:#ececec;border-radius:1px;margin-top:7px;overflow:hidden}.ph-sp-bar{height:100%;background:#111;border-radius:1px;width:100%;transform-origin:left;animation:ph-bar-shrink linear forwards}@keyframes ph-bar-shrink{from{transform:scaleX(1)}to{transform:scaleX(0)}}';
  document.head.appendChild(st);}

  var NOMBRES=['Úrsula','María','Carlos','Facundo','Valentina','Diego','Ana','Sofía','Martín','Laura','Pablo','Florencia','Nicolás','Camila','Lucía','Roberto','Jimena','Fernando','Gabriela','Santiago','Paola','Agustín','Daniela','Rodrigo','Micaela','Esteban'];
  var CIUDADES=['Buenos Aires','Córdoba','Rosario','Mendoza','La Plata','Mar del Plata','Salta','Santa Fe','Neuquén','Tucumán','Bahía Blanca','Posadas','San Juan','Resistencia','Corrientes','Paraná','Formosa','Jujuy','Catamarca','San Luis','Lomas de Zamora','Quilmes','Tigre','Vicente López','Morón'];
  var PRODUCTOS=[
    'Combo Home | Black Out Lino + Voile | 210cm x 130cm',
    'Set x3 Cuadros Decorativo Lienzo MDF',
    'Cortina Black Out x 1 Paño 240cm x 130cm',
    'Combo Black Out + Voile + 3 Cuadros Cosmopolita',
    'Agarraderas De Cortinas x2 Black',
    'Cortina Voile + 3 Cuadros (2 Paños 210cm)',
    'Cortina Black Out x 1 Paño 260cm x 130cm',
    'Set x3 Cuadros 40x35 | Trilogía Aura Azul',
    'Funda Acolchado Microfibra 120gm Premium',
    'Combo Home | Black Out Lino + Voile | 210cm x 130cm',
    'Set x3 Cuadros 40x35 | Trilogía Home Frequency',
    'Cortina Voile + 3 Cuadros (2 Paños 210cm)',
    'Set x3 Cuadros Decorativo Lienzo MDF',
    'Juego Cortinas Tropical + 3 Cuadros Aura Rosa',
    'Set x6 Cuadros 30x20 Instinto Superior',
    'Set x3 Cuadro Personalizado 40x35 Pinterest'
  ];

  /* ── Cache de imágenes de productos TN ── */
  var _imgCache = {};

  function prefetchImages() {
    fetch('/api/catalog/products?per_page=50')
      .then(function(r){ return r.json(); })
      .then(function(data){
        var prods = data.products || (Array.isArray(data) ? data : []);
        prods.forEach(function(p){
          var src = p.images && p.images[0] && (p.images[0].src || p.images[0]);
          if (!src) src = p.image && (p.image.src || p.image);
          if (src && p.name) _imgCache[p.name.toLowerCase()] = src;
        });
      })
      .catch(function(){});/* falla silenciosamente */
  }

  function getProductImg(nombre) {
    var key = nombre.toLowerCase();
    /* búsqueda exacta */
    if (_imgCache[key]) return _imgCache[key];
    /* búsqueda parcial — los primeros 25 chars suelen ser suficientes */
    var slug = key.substring(0, 25);
    for (var k in _imgCache) {
      if (k.indexOf(slug) > -1 || slug.indexOf(k.substring(0,25)) > -1) return _imgCache[k];
    }
    return null;
  }

  function rand(a){return a[Math.floor(Math.random()*a.length)];}

  var LOOP=23;
  function calcMin(i){return 3+(i%LOOP)*8;}
  function fmtMin(m){if(m<60)return 'hace '+m+' min';var h=Math.floor(m/60),rm=m%60;return 'hace '+(rm>0?h+'h '+rm+'min':h+'h');}

  var KEY='ph_sp_idx';
  function getIdx(){try{return parseInt(localStorage.getItem(KEY)||'0',10)||0;}catch(e){return 0;}}
  function saveIdx(i){try{localStorage.setItem(KEY,String(i%LOOP));}catch(e){}}

  var pageIdx=getIdx();
  saveIdx(pageIdx+1);
  var localStep=0;

  var dismissed=false;
  var DURACION = 9000;              /* cada notif visible 9 segundos  */
  var PAUSA    = 23 * 60 * 1000;   /* 23 minutos entre notificaciones */

  var wrap=document.createElement('div');wrap.id='ph-sp-wrap';document.body.appendChild(wrap);
  var cardEl=null,tVis=null,tNext=null;

  function stopAll(){dismissed=true;clearTimeout(tVis);clearTimeout(tNext);cerrar();}
  function cerrar(cb){if(!cardEl){if(cb)cb();return;}clearTimeout(tVis);cardEl.classList.remove('ph-sp-in');cardEl.classList.add('ph-sp-out');var old=cardEl;cardEl=null;setTimeout(function(){if(old.parentNode)old.remove();if(cb)cb();},360);}

  function mostrar(){
    if(dismissed)return;
    var idx=pageIdx+localStep;
    localStep++;
    saveIdx(pageIdx+localStep);
    var nombreProd=PRODUCTOS[idx%PRODUCTOS.length];
    var c={nombre:rand(NOMBRES),ciudad:rand(CIUDADES),producto:nombreProd,min:calcMin(idx)};

    var card=document.createElement('div');card.className='ph-sp-card';cardEl=card;

    /* cerrar */
    var x=document.createElement('button');x.className='ph-sp-close';x.textContent='×';x.setAttribute('aria-label','Cerrar');
    x.addEventListener('click',function(e){e.stopPropagation();stopAll();});card.appendChild(x);

    /* thumbnail — imagen del producto o emoji fallback */
    var thumb=document.createElement('div');thumb.className='ph-sp-thumb';
    var imgUrl=getProductImg(nombreProd);
    if(imgUrl){
      var im=document.createElement('img');im.src=imgUrl;im.alt='';
      im.onerror=function(){thumb.textContent='🛒';};
      thumb.appendChild(im);
    } else {
      thumb.textContent='🛒';
    }

    /* body */
    var body=document.createElement('div');body.className='ph-sp-body';
    var nom=document.createElement('div');nom.className='ph-sp-nombre';nom.textContent=c.nombre+' de '+c.ciudad+' compró';
    var prod=document.createElement('div');prod.className='ph-sp-prod';prod.textContent=c.producto;
    var tiem=document.createElement('div');tiem.className='ph-sp-tiempo';tiem.textContent=fmtMin(c.min);
    var prog=document.createElement('div');prog.className='ph-sp-progress';
    var bar=document.createElement('div');bar.className='ph-sp-bar';bar.style.animationDuration=DURACION+'ms';prog.appendChild(bar);
    body.appendChild(nom);body.appendChild(prod);body.appendChild(tiem);body.appendChild(prog);

    card.appendChild(thumb);card.appendChild(body);wrap.appendChild(card);
    card.addEventListener('click',function(){clearTimeout(tVis);clearTimeout(tNext);cerrar(function(){if(!dismissed)tNext=setTimeout(mostrar,PAUSA);});});
    requestAnimationFrame(function(){requestAnimationFrame(function(){card.classList.add('ph-sp-in');});});
    tVis=setTimeout(function(){cerrar(function(){if(!dismissed)tNext=setTimeout(mostrar,PAUSA);});},DURACION);
  }

  /* Prefetch imágenes y arrancar */
  prefetchImages();
  setTimeout(mostrar, 3000);
})();
