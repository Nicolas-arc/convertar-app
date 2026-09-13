/* ConvertAR - Widget WhatsApp Respuestas Rápidas v4 */
(function(){
  var API  = 'https://convertar-app-production.up.railway.app';
  var SHOP = 'pintoshogar';
  var WA_NUMBER = '5492235551148';

  if (document.getElementById('cva-wa-btn')) return;

  var ICON = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="display:block;flex-shrink:0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.529 5.843L0 24l6.302-1.512A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.793 9.793 0 01-5.017-1.376l-.36-.213-3.732.895.938-3.63-.234-.374A9.778 9.778 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/></svg>';

  var DEFAULT_PROMOS = [
    { icon: '💳', titulo: '6 cuotas sin interés',        detalle: 'Con todas las tarjetas de crédito' },
    { icon: '🏦', titulo: '15% OFF con transferencia',   detalle: 'Mejor precio' },
    { icon: '🚚', titulo: 'Envío gratis',                detalle: 'En compras desde $99.999' }
  ];

  var QS = [
    {
      id: 'promos', label: '🔥 Promos hoy', tipo: 'promos'
    },
    {
      id: 'envios', label: '🚚 ¿Hacen envíos a todo el país?', tipo: 'resp',
      resp: 'Sí, a <strong>todo el país</strong> 🙌<br><br>Ingresá tu código postal al comprar para calcular el costo.<br><br>Compras mayores a <strong>$99.999</strong> → envío <strong>gratis</strong>. Podés pagar en <strong>6 cuotas sin interés</strong> 🎉'
    },
    {
      id: 'cuadros', label: '🖼️ Cuadros', tipo: 'resp',
      resp: 'Tenemos diseños para <strong>transformar tu hogar</strong> o podés crear tus <strong>cuadros personalizados</strong>.<br><br>📐 Medidas: <strong>30×20 cm</strong> y <strong>40×35 cm</strong><br>🪵 Marco MDF 1 cm, listo para colgar<br>🎨 Vinilo impreso de alta calidad',
      link: 'https://www.pintoshogar.com.ar/home1/cuadros-pintos-home/', linkLabel: '🖼️ Ver todos los cuadros'
    },
    {
      id: 'cortinas', label: '🧵 Cortinas Black Out a medida', tipo: 'resp',
      resp: 'Necesitás el <strong>alto × ancho</strong> de tu ventana.<br><br>📅 Confeccionamos los <strong>miércoles</strong> → entrega el viernes: <strong>5 a 10 días hábiles</strong>.<br><br>Cada paño mide <strong>130 cm de ancho</strong>. Pasanos tus medidas y te asesoramos.',
      link: 'https://www.pintoshogar.com.ar/black-out/black-out-a-medida/', linkLabel: '🧵 Ver cortinas a medida'
    },
    {
      id: 'cambios', label: '🔄 ¿Hacen cambios?', tipo: 'resp',
      resp: 'Sí! Tenés <strong>10 días hábiles</strong> desde que recibís el producto.<br><br>📩 Escribí a <strong>soporte@pintoshome.com</strong> con tu número de orden.<br>📦 Producto sin usar y en su empaque original.<br><br>Si el error es nuestro, el envío va por nuestra cuenta.',
      link: 'https://www.pintoshogar.com.ar/politica-de-devolucion/', linkLabel: '📋 Ver política completa'
    }
  ];

  var st = document.createElement('style');
  st.id = 'cva-wa-css';
  st.textContent = [
    '#cva-wa-btn{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;background:#25D366;border:none;cursor:pointer;z-index:99998;box-shadow:0 4px 16px rgba(37,211,102,.45);display:flex;align-items:center;justify-content:center;padding:0;transition:transform .2s,box-shadow .2s}',
    '#cva-wa-btn:hover{transform:scale(1.08);box-shadow:0 6px 24px rgba(37,211,102,.55)}',
    '#cva-wa-btn svg{width:32px;height:32px;fill:#fff}',
    '#cva-wa-panel{position:fixed;bottom:86px;right:16px;width:320px;max-width:calc(100vw - 32px);background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.18);z-index:99997;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;opacity:0;transform:translateY(10px) scale(.97);transition:opacity .2s,transform .2s;pointer-events:none}',
    '#cva-wa-panel.open{opacity:1;transform:none;pointer-events:all}',
    '#cva-wa-hdr{background:#1a1a1a;padding:14px 16px;display:flex;align-items:center;gap:12px}',
    '#cva-wa-av{width:38px;height:38px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
    '#cva-wa-av svg{width:20px;height:20px;fill:#fff}',
    '#cva-wa-ht{flex:1;min-width:0}',
    '#cva-wa-ht strong{display:block;font-size:14px;font-weight:700;color:#fff}',
    '#cva-wa-ht span{font-size:11px;color:rgba(255,255,255,.5)}',
    '#cva-wa-x{background:none;border:none;color:rgba(255,255,255,.4);font-size:24px;line-height:1;cursor:pointer;padding:0;flex-shrink:0}',
    '#cva-wa-x:hover{color:#fff}',
    '#cva-wa-g{padding:14px;background:#ece5dd}',
    '#cva-wa-gb{background:#fff;border-radius:0 12px 12px 12px;padding:10px 14px;font-size:13px;color:#1a1a1a;line-height:1.5;box-shadow:0 1px 3px rgba(0,0,0,.08)}',
    '#cva-wa-qs{padding:10px;display:flex;flex-direction:column;gap:7px}',
    '.cva-q{background:#fff;border:1.5px solid #e0e0e0;border-radius:10px;padding:11px 14px;font-size:13px;font-weight:600;color:#1a1a1a;cursor:pointer;text-align:left;width:100%;transition:border-color .15s,background .15s;font-family:inherit}',
    '.cva-q:hover{border-color:#25D366;background:#f0fdf4}',
    '#cva-wa-rw{padding:10px 14px;background:#ece5dd;display:none}',
    '#cva-wa-bk{background:none;border:none;font-size:12px;color:#666;cursor:pointer;padding:0 0 8px;display:flex;align-items:center;gap:4px;font-family:inherit}',
    '#cva-wa-bk:hover{color:#111}',
    '#cva-wa-rb{background:#fff;border-radius:0 12px 12px 12px;padding:12px 14px;font-size:13px;color:#1a1a1a;line-height:1.6;box-shadow:0 1px 3px rgba(0,0,0,.08)}',
    '.cva-rl{display:flex;align-items:center;justify-content:center;gap:6px;border-radius:9px;padding:10px 14px;font-size:13px;font-weight:700;text-decoration:none;margin-top:8px}',
    '.cva-rl-dark{background:#1a1a1a;color:#fff}',
    '.cva-rl-green{background:#25D366;color:#fff}',
    '.cva-rl svg{width:15px;height:15px;fill:#fff;flex-shrink:0}',
    '#cva-wa-cta{padding:0 10px 10px}',
    '#cva-wa-cta a{display:flex;align-items:center;justify-content:center;gap:8px;background:#1a1a1a;color:#fff;border-radius:10px;padding:13px;font-size:14px;font-weight:700;text-decoration:none}',
    '#cva-wa-cta a:hover{background:#333}',
    '#cva-wa-cta a svg{width:18px;height:18px;fill:#25D366}',
    '#cva-wa-ft{padding:6px;text-align:center;font-size:10px;color:#ccc;border-top:1px solid #f0f0f0}'
  ].join('');
  document.head.appendChild(st);

  var btn = document.createElement('button');
  btn.id = 'cva-wa-btn';
  btn.setAttribute('aria-label', 'WhatsApp');
  btn.innerHTML = ICON;

  var panel = document.createElement('div');
  panel.id = 'cva-wa-panel';

  function buildPanel() {
    var BASE = 'https://wa.me/' + WA_NUMBER + '?text=';
    var waGen = BASE + encodeURIComponent('Hola Pintos Home! Tengo una consulta 😊');
    panel.innerHTML =
      '<div id="cva-wa-hdr"><div id="cva-wa-av">' + ICON + '</div><div id="cva-wa-ht"><strong>Pintos Home</strong><span>Respondemos enseguida ✓</span></div><button id="cva-wa-x">×</button></div>' +
      '<div id="cva-wa-g"><div id="cva-wa-gb">¡Hola! 👋 ¿En qué te podemos ayudar? Elegí una opción o escribinos directo.</div></div>' +
      '<div id="cva-wa-qs">' + QS.map(function(q){ return '<button class="cva-q" data-id="' + q.id + '">' + q.label + '</button>'; }).join('') + '</div>' +
      '<div id="cva-wa-rw"><button id="cva-wa-bk">← Volver</button><div id="cva-wa-rb"></div></div>' +
      '<div id="cva-wa-cta"><a href="' + waGen + '" target="_blank" rel="noopener">' + ICON + 'Hablar con asesora</a></div>' +
      '<div id="cva-wa-ft">Respuestas de Pintos Home</div>';

    var qsDiv = document.getElementById('cva-wa-qs');
    var rw    = document.getElementById('cva-wa-rw');
    var rb    = document.getElementById('cva-wa-rb');

    function showQs() { qsDiv.style.display = 'flex'; rw.style.display = 'none'; }

    function showPromos(promos) {
      var html = '<div style="display:flex;flex-direction:column;gap:8px">';
      promos.forEach(function(p) {
        html += '<div style="display:flex;align-items:center;gap:10px;background:#f5f5f5;border-radius:10px;padding:10px">' +
          '<span style="font-size:22px;flex-shrink:0">' + (p.icon || '✨') + '</span>' +
          '<div><strong style="display:block;font-size:13px">' + (p.titulo || '') + '</strong>' +
          '<span style="font-size:12px;color:#888">' + (p.detalle || '') + '</span></div></div>';
      });
      html += '</div>';
      rb.innerHTML = html;
      qsDiv.style.display = 'none';
      rw.style.display = 'block';
    }

    function showResp(q) {
      if (q.tipo === 'promos') {
        fetch(API + '/api/promos/' + SHOP)
          .then(function(r){ return r.ok ? r.json() : null; })
          .then(function(d){ showPromos(Array.isArray(d) && d.length ? d : DEFAULT_PROMOS); })
          .catch(function(){ showPromos(DEFAULT_PROMOS); });
        return;
      }
      var waLink = BASE + encodeURIComponent('Hola Pintos Home! Consulta sobre: ' + q.label.replace(/[^\w\s]/g, '').trim());
      var extra = q.link ? '<a class="cva-rl cva-rl-dark" href="' + q.link + '" target="_blank" rel="noopener">' + (q.linkLabel || 'Ver más') + '</a>' : '';
      rb.innerHTML = q.resp + extra + '<a class="cva-rl cva-rl-green" href="' + waLink + '" target="_blank" rel="noopener">' + ICON + 'Consultar por WhatsApp</a>';
      qsDiv.style.display = 'none';
      rw.style.display = 'block';
    }

    document.getElementById('cva-wa-x').addEventListener('click', function(){ panel.classList.remove('open'); });
    document.getElementById('cva-wa-bk').addEventListener('click', showQs);
    qsDiv.addEventListener('click', function(e){
      var q = e.target.closest('.cva-q');
      if (!q) return;
      for (var i = 0; i < QS.length; i++) { if (QS[i].id === q.dataset.id) { showResp(QS[i]); return; } }
    });
  }

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  btn.addEventListener('click', function(){ panel.classList.toggle('open'); });
  document.addEventListener('click', function(e){
    if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) panel.classList.remove('open');
  });

  function start() {
    window.__CVA_CFG_P = window.__CVA_CFG_P ||
      fetch(API + '/config/' + SHOP).then(function(r){ return r.json(); }).catch(function(){ return {}; });
    window.__CVA_CFG_P.then(function(cfg) {
      var wa = (cfg && cfg.whatsapp) || {};
      if (wa.number) WA_NUMBER = wa.number;
      else if (wa.wa_buttons && wa.wa_buttons[0] && wa.wa_buttons[0].number) WA_NUMBER = wa.wa_buttons[0].number;
      buildPanel();
    });
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', start); }
  else { start(); }
})();
