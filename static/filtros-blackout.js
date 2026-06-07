/* ============================================================
   ConvertAR · Hero + Filtros de Categorías v2 (CLS ≤ 0.1)
   Estrategia anti-CLS:
     1. Hero se renderiza INMEDIATAMENTE (sin esperar config)
     2. Contenedor de pills se crea vacío con espacio reservado
     3. Cuando config carga, solo se pueblan los pills in-place
     → Cero layout shifts después del primer render
   ============================================================ */
(function () {
  var API  = 'https://convertar-app-production.up.railway.app';
  var SHOP = 'pintoshogar';

  /* ── CSS ────────────────────────────────────────────────── */
  var CSS_PILLS = [
    '#ph-cat-filtros{background:#fafaf9;padding:28px 16px 24px;text-align:center;border-bottom:1px solid #efefed;margin-bottom:8px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
    '#ph-cat-filtros h3{font-size:clamp(14px,2.5vw,18px);font-weight:700;color:#111;margin:0 0 18px;letter-spacing:-.2px}',
    '#ph-cat-pills{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;min-height:44px}',
    '.ph-cat-pill{display:inline-flex;flex-direction:column;align-items:center;gap:3px;padding:10px 20px;border-radius:999px;border:1.5px solid rgba(0,0,0,.12);background:rgba(255,255,255,.85);cursor:pointer;transition:all .2s ease;box-shadow:0 2px 8px rgba(0,0,0,.06);min-width:100px;font-family:inherit}',
    '.ph-cat-pill:hover{border-color:#111;background:#fff;transform:translateY(-1px)}',
    '.ph-cat-pill.active{background:#111;border-color:#111}',
    '.ph-cat-pill.active .phl{color:#fff}.ph-cat-pill.active .phs{color:rgba(255,255,255,.65)}',
    '.ph-cat-pill.pill-combos{border-color:rgba(180,130,60,.4);background:linear-gradient(135deg,rgba(212,168,90,.12),rgba(180,130,60,.08))}',
    '.ph-cat-pill.pill-combos .phl{color:#8a6020}.ph-cat-pill.pill-combos .phs{color:#b8954a}',
    '.phl{font-size:14px;font-weight:700;color:#111;white-space:nowrap}',
    '.phs{font-size:10px;color:#999;white-space:nowrap;text-align:center;line-height:1.3}',
    '#ph-cat-result{font-size:12px;color:#aaa;margin-top:14px}',
    '@media(max-width:480px){.ph-cat-pill{min-width:80px;padding:9px 12px}.phl{font-size:13px}.phs{font-size:9px}}'
  ].join('');

  var CSS_HERO = [
    '#ph-cortinas-hero{width:100%;overflow:hidden;background:linear-gradient(135deg,#0a0a0a 0%,#1a1a1a 50%,#2a2a2a 100%);display:flex;align-items:center;justify-content:center;padding:40px 24px;min-height:260px}',
    '#ph-cortinas-hero-inner{max-width:680px;width:100%;text-align:center}',
    '#ph-cortinas-hero-inner .hero-tag{display:inline-block;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:14px}',
    '#ph-cortinas-hero-inner h1{font-size:clamp(20px,3.5vw,32px);font-weight:800;color:#fff;line-height:1.2;margin-bottom:18px}',
    '.ph-cor-formula{display:inline-flex;align-items:center;gap:12px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:14px 22px;margin-bottom:18px;flex-wrap:wrap;justify-content:center}',
    '.ph-cor-fbox{display:flex;flex-direction:column;align-items:center;gap:2px}',
    '.ph-cor-fbox .fl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.4)}',
    '.ph-cor-fbox .fv{font-size:13px;font-weight:700;color:#fff;white-space:nowrap}',
    '.ph-cor-fsep{font-size:20px;color:rgba(255,255,255,0.25)}',
    '.ph-cor-note{font-size:12px;color:rgba(255,255,255,0.45);line-height:1.6;max-width:400px;margin:0 auto}',
    '.ph-cor-note strong{color:rgba(255,255,255,0.8)}',
    '.ph-cor-tip{font-size:11px;color:rgba(255,255,255,0.35);line-height:1.7;max-width:420px;margin:10px auto 0;border-top:1px solid rgba(255,255,255,0.08);padding-top:10px}',
    '.ph-cor-tip strong{color:rgba(255,255,255,0.65)}'
  ].join('');

  function injectCSS(id, css) {
    if (document.getElementById(id)) return;
    var el = document.createElement('style'); el.id = id; el.textContent = css;
    document.head.appendChild(el);
  }

  /* ── HTML del hero (siempre igual para cortinas) ────────── */
  var HERO_HTML =
    '<div id="ph-cortinas-hero-inner">'
    + '<span class="hero-tag">Cortinas Black Out</span>'
    + '<h1>¿Cuál es la cortina perfecta para tu ventana?</h1>'
    + '<div class="ph-cor-formula">'
    +   '<div class="ph-cor-fbox"><span class="fl">Alto</span><span class="fv">Tu ventana</span></div>'
    +   '<span class="ph-cor-fsep">×</span>'
    +   '<div class="ph-cor-fbox"><span class="fl">Ancho</span><span class="fv">Cantidad de paños</span></div>'
    +   '<span class="ph-cor-fsep">=</span>'
    +   '<div class="ph-cor-fbox"><span class="fl">Tu cortina</span><span class="fv">Perfecta</span></div>'
    + '</div>'
    + '<p class="ph-cor-note">El <strong>alto</strong> define el tamaño · El <strong>ancho</strong> define cuántos paños. Cada paño mide 130cm de ancho.</p>'
    + '<p class="ph-cor-tip">Podés medir con la cámara de tu cel 📱 · Si tenés <strong>iPhone</strong> usá la app <em>Medición</em> · Si tenés <strong>Android</strong> cualquier app de medición · o con un metro si tenés en casa</p>'
    + '</div>';

  /* ── FASE 1: Renderizado inmediato (anti-CLS) ───────────────
     Se ejecuta ANTES del fetch del config.
     Inyecta hero completo + contenedor de pills vacío con altura
     reservada. Así el layout queda fijo desde el primer render.  */
  (function renderInmediato() {
    var path = window.location.pathname.replace(/\/$/, '');
    var esCortinas = path.indexOf('black-out') > -1 && path.indexOf('combos-home') === -1;
    if (!esCortinas) return;
    if (document.getElementById('ph-cortinas-hero')) return; /* ya renderizado */

    /* Inyectar CSS antes de crear los nodos */
    injectCSS('ph-cor-hero-css', CSS_HERO);
    injectCSS('ph-cat-css', CSS_PILLS);

    /* Hero con contenido real */
    var hero = document.createElement('div');
    hero.id = 'ph-cortinas-hero';
    hero.innerHTML = HERO_HTML;

    /* Contenedor de pills: vacío pero con altura reservada */
    var pillsWrap = document.createElement('div');
    pillsWrap.id = 'ph-cat-filtros';
    /* Esqueleto de pills para reservar espacio visualmente */
    pillsWrap.innerHTML =
      '<div id="ph-cat-pills" style="min-height:44px">'
      + '<div style="display:inline-flex;gap:10px;flex-wrap:wrap;justify-content:center;pointer-events:none">'
      + ['Todas','110–150cm','210cm','220–240cm','250–260cm','270–300cm'].map(function(l){
          return '<div style="padding:10px 20px;border-radius:999px;border:1.5px solid rgba(0,0,0,.08);background:rgba(0,0,0,.04);min-width:80px;height:42px;box-sizing:border-box"></div>';
        }).join('')
      + '</div></div>'
      + '<div id="ph-cat-result"></div>';

    /* Insertar antes del grid */
    function doInsert() {
      if (document.getElementById('ph-cortinas-hero')) return;
      var ref = document.querySelector('.js-product-table,.products-grid,.js-products-container,#products');
      if (!ref || !ref.parentNode) return false;
      ref.parentNode.insertBefore(hero, ref);
      ref.parentNode.insertBefore(pillsWrap, ref);
      return true;
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function tryDOM() {
        if (!doInsert()) {
          var t = 0, iv = setInterval(function() {
            if (doInsert() || (t += 100) > 3000) clearInterval(iv);
          }, 100);
        }
      });
    } else {
      if (!doInsert()) {
        var t = 0, iv = setInterval(function() {
          if (doInsert() || (t += 100) > 3000) clearInterval(iv);
        }, 100);
      }
    }
  })();

  /* ── Helpers ── */
  function getCards() { return document.querySelectorAll('.js-item-product,.item-product'); }
  function getNombre(card) {
    var el = card.querySelector('.js-item-name,.item-name');
    return el ? el.textContent.toLowerCase() : '';
  }

  /* ── Matching por tipo ── */
  function matchCortina(nombre, key) {
    if (key === 'todos') return true;
    if (key === 'h150')  return /\b(110|120|130|140|150)(?:cm)?\s*[x×]/i.test(nombre);
    if (key === 'h210')  return /\b210(?!\d)/i.test(nombre);
    if (key === 'h240')  return /\b(220|230|240)(?!\d)/i.test(nombre);
    if (key === 'h260')  return /\b(250|260)(?!\d)/i.test(nombre);
    if (key === 'h300')  return /\b(270|280|290|300)(?!\d)/i.test(nombre) || /\b3\s*m\b/i.test(nombre);
    if (key === 'h3m')   return /\b(270|280|290|300)(?!\d)/i.test(nombre) || /\b3\s*m\b/i.test(nombre);
    var m = key.match(/h(\d+)/);
    if (m) return new RegExp('\\b' + m[1] + '(?!\\d)').test(nombre);
    return true;
  }

  function matchCuadro(nombre, key) {
    if (key === 'todos')         return true;
    if (key === 'x3')            return /set\s*x3|x3[\s,]/i.test(nombre) && !/x6/i.test(nombre);
    if (key === 'x6')            return /set\s*x6|x6[\s,]/i.test(nombre);
    if (key === 'personalizado') return /personalizado/i.test(nombre);
    return nombre.indexOf(key.toLowerCase()) > -1;
  }

  function matchGenerico(nombre, key) {
    if (key === 'todos') return true;
    return nombre.indexOf(key.toLowerCase()) > -1;
  }

  /* ── Aplicar filtro ── */
  function aplicarFiltro(key, matchFn, url) {
    if (url) { window.location.href = url; return; }
    var visibles = 0;
    getCards().forEach(function(card) {
      var ok = matchFn(getNombre(card), key);
      card.style.display = ok ? '' : 'none';
      if (ok) visibles++;
    });
    document.querySelectorAll('.ph-cat-pill').forEach(function(p) {
      p.classList.toggle('active', p.dataset.key === key);
    });
    var res = document.getElementById('ph-cat-result');
    if (res) res.textContent = visibles + ' producto' + (visibles !== 1 ? 's' : '');
  }

  /* ── FASE 2: Poblar pills cuando llega el config ───────────
     No inserta nada nuevo en el DOM — solo actualiza #ph-cat-pills
     que ya existe con el espacio reservado.                    */
  function poblarPills(filtros, matchFn) {
    var pillsEl = document.getElementById('ph-cat-pills');
    if (!pillsEl) return;

    var html = (filtros || []).map(function(f) {
      return '<button class="ph-cat-pill'
        + (f.key === 'todos' ? ' active' : '')
        + (f.extraClass ? ' ' + f.extraClass : '') + '"'
        + ' data-key="' + f.key + '" data-url="' + (f.url || '') + '">'
        + '<span class="phl">' + (f.label || f.key) + '</span>'
        + '<span class="phs">' + (f.sub || '') + '</span>'
        + '</button>';
    }).join('');

    pillsEl.style.minHeight = '';
    pillsEl.innerHTML = html;

    /* Listener en el contenedor padre (ya existente) */
    var wrap = document.getElementById('ph-cat-filtros');
    if (wrap && !wrap._cvaListener) {
      wrap._cvaListener = true;
      wrap.addEventListener('click', function(e) {
        var pill = e.target.closest('.ph-cat-pill');
        if (!pill) return;
        aplicarFiltro(pill.dataset.key, matchFn, pill.dataset.url || null);
      });
    }

    aplicarFiltro('todos', matchFn, null);
  }

  /* ── Insertar para tipos NO-cortinas (cuadros, genérico) ── */
  function insertarEnPagina(catCfg) {
    if (document.getElementById('ph-cat-filtros')) return;
    var tipo   = catCfg.tipo || 'generico';
    var filtros = catCfg.filtros || [];
    var titulo  = catCfg.hero_titulo || '';

    if (!filtros.length) {
      if (tipo === 'cuadros') {
        filtros = [
          {key:'todos',        label:'Todos',        sub:'Ver todo'},
          {key:'x3',           label:'Set x3',       sub:'40x35 · Envío gratis'},
          {key:'x6',           label:'Set x6',       sub:'30x20 · Envío gratis'},
          {key:'personalizado',label:'Personalizado',sub:'Creá tu galería'},
          {key:'combos',       label:'Combo Home',   sub:'Cortinas · Cuadros · Fundas', url:'https://www.pintoshogar.com.ar/black-out/combos-home/', extraClass:'pill-combos'}
        ];
      }
    }
    if (!filtros.length) return;

    var matchFn = tipo === 'cuadros' ? matchCuadro : matchGenerico;

    injectCSS('ph-cat-css', CSS_PILLS);
    var ref = document.querySelector('.js-product-table,.products-grid,.js-products-container,#products');
    if (!ref) return;

    var wrap = document.createElement('div');
    wrap.id = 'ph-cat-filtros';
    var pillsHtml = filtros.map(function(f) {
      return '<button class="ph-cat-pill' + (f.key==='todos'?' active':'') + (f.extraClass?' '+f.extraClass:'') + '"'
        + ' data-key="' + f.key + '" data-url="' + (f.url||'') + '">'
        + '<span class="phl">' + (f.label||f.key) + '</span>'
        + '<span class="phs">' + (f.sub||'') + '</span></button>';
    }).join('');
    if (titulo) wrap.innerHTML = '<h3 style="font-size:clamp(14px,2.5vw,18px);font-weight:700;color:#111;margin:0 0 18px">' + titulo + '</h3>';
    wrap.innerHTML += '<div id="ph-cat-pills">' + pillsHtml + '</div><div id="ph-cat-result"></div>';
    wrap.addEventListener('click', function(e) {
      var pill = e.target.closest('.ph-cat-pill');
      if (!pill) return;
      aplicarFiltro(pill.dataset.key, matchFn, pill.dataset.url || null);
    });
    ref.parentNode.insertBefore(wrap, ref);
    aplicarFiltro('todos', matchFn, null);

    new MutationObserver(function() {
      var active = document.querySelector('.ph-cat-pill.active');
      var key = active ? active.dataset.key : 'todos';
      if (key !== 'todos') aplicarFiltro(key, matchFn, null);
    }).observe(ref, { childList: true, subtree: true });
  }

  /* ── Init: fetch config y poblar/insertar ── */
  window.__CVA_CFG_P = window.__CVA_CFG_P ||
    fetch(API + '/config/' + SHOP).then(function(r){ return r.json(); }).catch(function(){ return {}; });

  function init() {
    window.__CVA_CFG_P.then(function(cfg) {
      var f = (cfg && cfg.features) || {};
      if (f.filtros === false && f.hero_categorias === false) return;

      var cats    = (cfg && cfg.categorias) || {};
      var path    = window.location.pathname;
      var pathNorm = path.replace(/\/$/, '');

      /* Matching: clave más larga primero */
      var matchedCfg = null;
      Object.keys(cats).sort(function(a,b){return b.length-a.length;}).forEach(function(k) {
        if (!matchedCfg && pathNorm.indexOf(k.replace(/\/$/,'')) > -1) matchedCfg = cats[k];
      });
      if (!matchedCfg || matchedCfg.tipo === 'skip') return;

      var tipo   = matchedCfg.tipo || 'generico';
      var filtros = matchedCfg.filtros || [];

      /* Defaults para cortinas */
      if (!filtros.length && tipo === 'cortinas') {
        filtros = [
          {key:'todos', label:'Todas',      sub:'Ver todo'},
          {key:'h150',  label:'150cm',      sub:'110 – 150cm'},
          {key:'h210',  label:'210cm',      sub:'Altura media'},
          {key:'h240',  label:'240cm',      sub:'220 · 230 · 240'},
          {key:'h260',  label:'260cm',      sub:'250 · 260'},
          {key:'h300',  label:'3m',         sub:'270 · 280 · 290 · 300'},
          {key:'combos',label:'Combo Home', sub:'Black Out + Voile', url:'https://www.pintoshogar.com.ar/black-out/combos-home/', extraClass:'pill-combos'}
        ];
      }

      /* Auto-agregar Combo Home para cortinas */
      if (tipo === 'cortinas') {
        var hasCombo = filtros.some(function(f2) {
          return f2.extraClass === 'pill-combos' || (f2.url && f2.url.indexOf('combos') > -1);
        });
        if (!hasCombo) filtros = filtros.concat([{key:'combos',label:'Combo Home',sub:'Black Out + Voile',url:'https://www.pintoshogar.com.ar/black-out/combos-home/',extraClass:'pill-combos'}]);
      }

      if (!filtros.length) return;

      var matchFn = tipo === 'cortinas' ? matchCortina
                  : tipo === 'cuadros'  ? matchCuadro
                  : matchGenerico;

      if (tipo === 'cortinas') {
        /* Hero ya renderizado en Fase 1 — solo poblar pills */
        var waitRef = 0;
        var iv = setInterval(function() {
          var ref = document.querySelector('.js-product-table,.products-grid,.js-products-container,#products');
          if (ref) {
            clearInterval(iv);
            poblarPills(filtros, matchFn);
            new MutationObserver(function() {
              var active = document.querySelector('.ph-cat-pill.active');
              var key = active ? active.dataset.key : 'todos';
              if (key !== 'todos') aplicarFiltro(key, matchFn, null);
            }).observe(ref, { childList: true, subtree: true });
          }
          if ((waitRef += 100) > 8000) clearInterval(iv);
        }, 100);
      } else {
        /* Cuadros y genérico: insertar normalmente */
        var waitRef2 = 0;
        var iv2 = setInterval(function() {
          var ref = document.querySelector('.js-product-table,.products-grid,.js-products-container,#products');
          if (ref) { clearInterval(iv2); insertarEnPagina(matchedCfg); }
          if ((waitRef2 += 100) > 8000) clearInterval(iv2);
        }, 100);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }
})();
