// ═══════════════════════════════════════════════════
//  ConvertAR — Snippet Universal v2.0
//  Pegá esto en TN → Configuración → Códigos externos → Para la tienda
//  Reemplaza TODO el código anterior
// ═══════════════════════════════════════════════════
(function () {
  'use strict';

  var SHOP_ID = 'pintoshogar';
  var API_URL = 'https://convertar-app-production.up.railway.app';

  // ── Session ID ───────────────────────────────────
  var sid = sessionStorage.getItem('cva_sid');
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('cva_sid', sid);
  }

  // ── Helpers ──────────────────────────────────────
  function ars(n) {
    return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function parsePrecio(txt) {
    if (!txt) return 0;
    return parseFloat(txt.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  }
  function s(el, styles) {
    Object.keys(styles).forEach(function (k) {
      el.style.setProperty(k, styles[k], 'important');
    });
  }
  function css(txt) {
    var st = document.createElement('style');
    st.textContent = txt;
    document.head.appendChild(st);
  }
  function track(event, productId, productName) {
    try {
      fetch(API_URL + '/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: SHOP_ID, product_id: productId || null, product_name: productName || null, event: event, session_id: sid })
      });
    } catch (e) {}
  }

  // ── CSS Global ───────────────────────────────────
  css([
    '.js-free-shipping-progress,.js-cart-free-shipping,.cart-free-shipping,',
    '[class*="free-shipping-bar"],[class*="free-shipping-progress"],',
    '[data-store="free-shipping-bar"],[data-store="cart-free-shipping"]',
    '{display:none!important;}'
  ].join(''));

  // ── Tracking auto ────────────────────────────────
  if (window.LS && window.LS.product) {
    var pid = String(window.LS.product.id);
    var pname = window.LS.product.name;
    track('productView', pid, pname);
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-store="buy-button"],[name="add_to_cart"],.js-add-to-cart,.js-buy-button');
      if (btn) track('addToCart', pid, pname);
    }, true);
  }
  var path = window.location.pathname;
  if (path.indexOf('/checkout/done') > -1 || path.indexOf('/pedido/') > -1) {
    track('purchase', null, null);
  }

  // ── Cargar config y ejecutar ─────────────────────
  fetch(API_URL + '/config/' + SHOP_ID)
    .then(function (r) { return r.json(); })
    .then(function (cfg) { runAll(cfg); })
    .catch(function () { runAll(null); });

  function runAll(cfg) {
    cfg = cfg || {};
    var f = cfg.features || {};
    var esProducto = !!(window.LS && window.LS.product);
    var pathActual = window.location.pathname;

    // Producto
    if (esProducto) {
      if (f.precio_tachado !== false) runTachado(cfg);
      if (f.mejor_precio_badge !== false) runMejorPrecio(cfg);
      if (f.cuotas !== false) runCuotas(cfg);
      if (f.envio_badge !== false) runEnvioBadge(cfg);
      if (f.tags) runTags(cfg);
      if (f.countdown) runCountdown(cfg);
      if (f.faq !== false) runFAQ(cfg);
      if (f.sticky_bar) runStickyBar(cfg);
      if (f.reviews && cfg.reviews && cfg.reviews.length) runReviews(cfg);
    }

    // Categorías
    if (f.hero_categorias !== false && cfg.categorias) {
      Object.keys(cfg.categorias).forEach(function (catPath) {
        if (pathActual.includes(catPath)) {
          var catCfg = cfg.categorias[catPath];
          if (catCfg.tipo === 'cuadros') runHeroCuadros(catCfg);
          else if (catCfg.tipo === 'cortinas') runHeroCortinas(catCfg);
          else runHeroGenerico(catCfg);
        }
      });
    }

    // Listado (fuera de producto y categoría especial)
    if (!esProducto) {
      if (f.precio_tachado !== false) runTachadoListado(cfg);
      if (f.mejor_precio_badge !== false) runMejorPrecioListado(cfg);
      if (f.cuotas !== false) runCuotasListado(cfg);
    }
  }

  // ════════════════════════════════════════════════
  //  FEATURE 1 — PRECIO TACHADO + % OFF
  // ════════════════════════════════════════════════
  var _priceObs = null;

  function runTachado(cfg) {
    clearTimeout(window._cvaTachadoT);
    var viejoBadge = document.getElementById('cva-tachado-prod');
    if (viejoBadge) viejoBadge.remove();
    var viejoOff = document.getElementById('cva-off-pill');
    if (viejoOff) viejoOff.remove();

    var scope = document.getElementById('single-product');
    if (!scope) return;
    var priceEl = document.getElementById('price_display') || scope.querySelector('.js-price-display,[data-store="price"]');
    if (!priceEl) return;

    var precio = (parseFloat((priceEl.getAttribute('data-product-price') || '').replace(',', '.')) || 0) / 100;
    if (!precio) precio = parsePrecio(priceEl.textContent);

    var cmpAttr = scope.querySelector('[data-compare-price]');
    var precioLista = cmpAttr ? (parseFloat(cmpAttr.getAttribute('data-compare-price')) || 0) / 100 : 0;
    if (!precioLista) {
      var cmpEl = scope.querySelector('.js-compare-price-display,.price-compare');
      if (cmpEl) precioLista = parsePrecio(cmpEl.textContent);
    }

    if (precioLista > precio) {
      var cmpNativo = scope.querySelector('.js-compare-price-display,.price-compare,[data-store="compare-price"]');
      if (cmpNativo) cmpNativo.style.setProperty('display', 'none', 'important');

      s(priceEl, { 'display': 'inline-block', 'width': 'auto', 'max-width': 'none', 'flex-shrink': '0' });
      s(priceEl.parentNode, { 'display': 'flex', 'align-items': 'baseline', 'gap': '8px', 'flex-wrap': 'wrap' });

      var tachado = document.createElement('span');
      tachado.id = 'cva-tachado-prod';
      s(tachado, { 'font-size': '0.72em', 'font-weight': '500', 'color': '#bbb', 'text-decoration': 'line-through', 'white-space': 'nowrap', 'flex-shrink': '0' });
      tachado.textContent = ars(precioLista);
      priceEl.insertAdjacentElement('afterend', tachado);

      var off = Math.round((1 - precio / precioLista) * 100);
      var pill = document.createElement('span');
      pill.id = 'cva-off-pill';
      s(pill, { 'font-size': '0.65em', 'font-weight': '700', 'background': '#e8f5e9', 'color': '#2e7d32', 'padding': '2px 8px', 'border-radius': '20px', 'flex-shrink': '0' });
      pill.textContent = off + '% OFF';
      tachado.insertAdjacentElement('afterend', pill);
    }

    // Observer para variantes
    if (_priceObs) _priceObs.disconnect();
    var obsTarget = priceEl.parentNode || priceEl;
    _priceObs = new MutationObserver(function () {
      clearTimeout(window._cvaTachadoT);
      window._cvaTachadoT = setTimeout(function () { runTachado(cfg); }, 350);
    });
    _priceObs.observe(obsTarget, { childList: true, subtree: true, characterData: true });
  }

  function runTachadoListado(cfg) {
    document.querySelectorAll('.js-item-product,.item-product,[data-product]').forEach(function (card) {
      var pEl = card.querySelector('.js-price-display,.item-price');
      if (!pEl) return;
      var precio = parsePrecio(pEl.textContent);
      var cmpEl = card.querySelector('.js-compare-price-display,.price-compare');
      var lista = cmpEl ? parsePrecio(cmpEl.textContent) : 0;
      if (lista > precio) {
        if (cmpEl) cmpEl.style.setProperty('display', 'none', 'important');
        if (!pEl.parentNode.querySelector('.cva-tachado-list')) {
          var t = document.createElement('span');
          t.className = 'cva-tachado-list';
          s(t, { 'font-size': '11px', 'color': '#bbb', 'text-decoration': 'line-through', 'margin-left': '5px' });
          t.textContent = ars(lista);
          pEl.insertAdjacentElement('afterend', t);
        }
      }
    });
  }

  // ════════════════════════════════════════════════
  //  FEATURE 2 — MEJOR PRECIO (TRANSFERENCIA) BADGE
  // ════════════════════════════════════════════════
  function runMejorPrecio(cfg) {
    if (document.getElementById('cva-mp-prod')) return;
    var mp = cfg.mejor_precio || {};
    var desc = (mp.descuento_pct || 10) / 100;
    var line1 = mp.chip_line1 || 'Mejor Precio';
    var line2 = mp.chip_line2 || 'Transferencia';

    var scope = document.getElementById('single-product');
    if (!scope) return;
    var priceEl = document.getElementById('price_display') || scope.querySelector('.js-price-display');
    if (!priceEl) return;
    var precio = (parseFloat((priceEl.getAttribute('data-product-price') || '').replace(',', '.')) || 0) / 100;
    if (!precio) precio = parsePrecio(priceEl.textContent);
    if (!precio) return;

    var badge = _crearMPBadge(precio * (1 - desc), line1, line2, false);
    badge.id = 'cva-mp-prod';
    priceEl.parentNode.insertAdjacentElement('afterend', badge);

    // Cards de tarjetas
    _inyectarTarjetas(scope);

    // Re-render en cambio de variante
    document.addEventListener('change', function (e) {
      if (e.target.matches('select,input[type="radio"]')) {
        clearTimeout(window._cvaMpT);
        window._cvaMpT = setTimeout(function () {
          var viejo = document.getElementById('cva-mp-prod');
          if (viejo) viejo.remove();
          runMejorPrecio(cfg);
        }, 400);
      }
    });
  }

  function runMejorPrecioListado(cfg) {
    var mp = cfg.mejor_precio || {};
    var desc = (mp.descuento_pct || 10) / 100;
    var line1 = mp.chip_line1 || 'Mejor Precio';
    var line2 = mp.chip_line2 || 'Transferencia';

    document.querySelectorAll('.js-item-product,.item-product').forEach(function (card) {
      if (card.dataset.cvamp) return;
      var pEl = card.querySelector('.js-price-display,.item-price,.js-price');
      if (!pEl) return;
      var precio = parsePrecio(pEl.textContent);
      if (precio <= 0) return;
      var badge = _crearMPBadge(precio * (1 - desc), line1, line2, true);
      card.dataset.cvamp = '1';
      pEl.parentNode.insertAdjacentElement('afterend', badge);

      // Ocultar textos NxM
      card.querySelectorAll('span,div,p').forEach(function (el) {
        if (el.children.length > 0) return;
        var t = el.textContent.trim().toLowerCase();
        if (t.length > 0 && t.length < 80 && ((t.includes('lleva') && t.includes('paga')) || /comprando \d+ o m/.test(t))) {
          el.style.setProperty('display', 'none', 'important');
        }
      });
    });
  }

  function _crearMPBadge(precioFinal, line1, line2, small) {
    var wrap = document.createElement('div');
    s(wrap, {
      'display': 'flex', 'align-items': 'center', 'gap': small ? '6px' : '10px',
      'border': '2px solid #c0392b', 'border-radius': '6px',
      'padding': small ? '4px 8px 4px 4px' : '6px 12px 6px 6px',
      'margin': '6px 0 4px', 'background': '#fff5f5',
      'width': 'fit-content', 'box-sizing': 'border-box'
    });
    var chip = document.createElement('div');
    s(chip, { 'background': '#c0392b', 'color': '#fff', 'border-radius': '4px', 'padding': small ? '3px 6px' : '4px 9px', 'display': 'flex', 'flex-direction': 'column', 'align-items': 'center', 'flex-shrink': '0' });
    var t1 = document.createElement('span');
    s(t1, { 'display': 'block', 'font-size': small ? '8px' : '10px', 'font-weight': '800', 'letter-spacing': '0.5px', 'text-transform': 'uppercase', 'line-height': '1.3', 'white-space': 'nowrap', 'color': '#fff' });
    t1.textContent = line1;
    var t2 = document.createElement('span');
    s(t2, { 'display': 'block', 'font-size': small ? '7px' : '9px', 'font-weight': '600', 'color': 'rgba(255,255,255,0.85)', 'white-space': 'nowrap' });
    t2.textContent = line2;
    chip.appendChild(t1); chip.appendChild(t2);
    var price = document.createElement('span');
    s(price, { 'display': 'inline-block', 'font-size': small ? '14px' : '20px', 'font-weight': '800', 'color': '#111', 'white-space': 'nowrap', 'line-height': '1' });
    price.textContent = ars(precioFinal);
    wrap.appendChild(chip); wrap.appendChild(price);
    return wrap;
  }

  function _inyectarTarjetas(scope) {
    if (document.getElementById('cva-tarjetas')) return;
    var ancla = scope.querySelector('.js-max-installments-container,.product-detail-installments,.js-max-installments');
    if (!ancla) return;
    var div = document.createElement('div');
    div.id = 'cva-tarjetas';
    s(div, { 'margin': '10px 0 4px', 'display': 'block' });
    var titulo = document.createElement('span');
    s(titulo, { 'display': 'block', 'font-size': '11px', 'color': '#888', 'margin-bottom': '8px' });
    titulo.textContent = 'Tarjetas aceptadas';
    var grid = document.createElement('div');
    s(grid, { 'display': 'flex', 'flex-wrap': 'wrap', 'gap': '7px', 'align-items': 'center' });
    function imgCard(src, alt) {
      var el = document.createElement('img'); el.src = src; el.alt = alt;
      s(el, { 'height': '32px', 'width': '52px', 'border-radius': '5px', 'border': '1px solid #ddd', 'background': '#fff', 'display': 'block' });
      return el;
    }
    function spanCard(css2, html) { var el = document.createElement('span'); el.style.cssText = css2; el.innerHTML = html; return el; }
    grid.appendChild(imgCard('https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons@main/flat/visa.svg', 'Visa'));
    grid.appendChild(imgCard('https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons@main/flat/mastercard.svg', 'Mastercard'));
    grid.appendChild(imgCard('https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons@main/flat/amex.svg', 'Amex'));
    grid.appendChild(spanCard('height:32px;width:52px;border-radius:5px;border:1px solid #f47c20;background:#fff;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px;font-weight:900;font-style:italic;color:#f47c20;font-family:Arial Black,Arial', 'N'));
    grid.appendChild(spanCard('height:32px;width:52px;border-radius:5px;border:1px solid #003087;background:#003087;color:#fff;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;font-weight:800', 'CABAL'));
    div.appendChild(titulo); div.appendChild(grid);
    ancla.parentNode.insertBefore(div, ancla.nextSibling);
  }

  // ════════════════════════════════════════════════
  //  FEATURE 3 — CUOTAS SIN INTERÉS
  // ════════════════════════════════════════════════
  function _fmtCuotas(precio, cant) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(precio / cant);
  }
  function _cuotasHTML(cant, monto) {
    return '<span>' + cant + '</span> cuotas sin interés de <span>' + monto + '</span>';
  }

  function runCuotas(cfg) {
    var cant = (cfg.cuotas && cfg.cuotas.cantidad) || 6;
    try {
      var scope = document.querySelector('#single-product');
      var cont = scope && (scope.querySelector('.js-max-installments .js-max-installments') || scope.querySelector('.js-max-installments-container'));
      var priceEl = scope && (document.getElementById('price_display') || scope.querySelector('.js-price-display'));
      if (!cont || !priceEl) return;
      var precio = parsePrecio(priceEl.textContent);
      if (!precio) return;
      cont.innerHTML = _cuotasHTML(cant, _fmtCuotas(precio, cant));
    } catch (e) {}

    // Re-render en variante
    if (window.LS && window.LS.registerOnChangeVariant) {
      LS.registerOnChangeVariant(function () { setTimeout(function () { runCuotas(cfg); }, 300); });
    }
  }

  function runCuotasListado(cfg) {
    var cant = (cfg.cuotas && cfg.cuotas.cantidad) || 6;
    try {
      document.querySelectorAll('.js-item-product').forEach(function (card) {
        var cont = card.querySelector('.js-max-installments.product-installments.installment-no-interest') ||
                   card.querySelector('.js-max-installments-container.js-max-installments.item-installments');
        var pEl = card.querySelector('.js-price-display.item-price');
        if (!cont || !pEl) return;
        var precio = parsePrecio(pEl.textContent);
        if (!precio) return;
        cont.innerHTML = _cuotasHTML(cant, _fmtCuotas(precio, cant));
      });
    } catch (e) {}
  }

  // ════════════════════════════════════════════════
  //  FEATURE 4 — ENVÍO BADGE
  // ════════════════════════════════════════════════
  function runEnvioBadge(cfg) {
    if (document.getElementById('cva-envio-badge')) return;
    var scope = document.getElementById('single-product');
    if (!scope) return;

    var envioTxt = (cfg.envio && cfg.envio.texto) || 'Medio de envío: presioná y poné tu código postal para saber cuándo llega.';
    var tipo = (cfg.envio && cfg.envio.tipo) || 'calcular';

    var shippingEl = scope.querySelector('.js-shipping-calculator,.shipping-calculator,[data-store="shipping-estimator"],.product-shipping,.js-product-shipping');
    if (!shippingEl) {
      var divs = scope.querySelectorAll('div,section');
      for (var i = 0; i < divs.length; i++) {
        var d = divs[i];
        if (d.children.length >= 1 && d.children.length <= 5 && /Medios de env/i.test(d.textContent) && d.textContent.trim().length < 200) {
          shippingEl = d; break;
        }
      }
    }

    var wrap = document.createElement('div');
    wrap.id = 'cva-envio-badge';

    if (tipo === 'gratis') {
      // Badge glassmorphism para envío gratis
      s(wrap, {
        'background': 'rgba(255,255,255,.65)', 'backdrop-filter': 'blur(14px)',
        '-webkit-backdrop-filter': 'blur(14px)', 'border': '1px solid rgba(255,255,255,.85)',
        'border-radius': '14px', 'padding': '14px 18px', 'display': 'flex',
        'align-items': 'center', 'gap': '14px', 'box-shadow': '0 4px 24px rgba(0,0,0,.07)', 'margin-top': '10px'
      });
      wrap.innerHTML = '<div style="width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,#1a1a1a,#3a3a3a);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">🚚</div><div><div style="font-size:13px;font-weight:700;color:#1a1a1a;margin-bottom:2px;">' + envioTxt + '</div><div style="font-size:11px;color:#777;">Ingresá tu código postal para saber cuándo llega</div></div>';
      var anchor = scope.querySelector('.js-shipping-calculator,[data-store="shipping"],[data-store="buy-button"]');
      if (anchor) anchor.insertAdjacentElement('afterend', wrap);
      else scope.appendChild(wrap);
    } else {
      // Luxury badge para calcular envío
      wrap.style.cssText = 'background:rgba(250,250,248,0.88);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(0,0,0,0.07);border-radius:18px;padding:16px 22px 14px;box-shadow:0 3px 22px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.95);margin:10px 0 8px;';
      var mainText = document.createElement('span');
      mainText.style.cssText = 'display:block;font-size:15px;font-weight:400;color:#1a1a1a;font-family:Georgia,"Times New Roman",serif;font-style:italic;line-height:1.5;' + (shippingEl ? 'margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(0,0,0,0.06);' : '');
      mainText.textContent = envioTxt;
      wrap.appendChild(mainText);
      if (shippingEl) {
        shippingEl.parentNode.insertBefore(wrap, shippingEl);
        wrap.appendChild(shippingEl);
        return;
      }
      var anchor2 = scope.querySelector('.js-buy-form,#buy-form,.product-buy,.js-add-to-cart');
      if (anchor2) anchor2.insertAdjacentElement('afterend', wrap);
      else scope.appendChild(wrap);
    }
  }

  // ════════════════════════════════════════════════
  //  FEATURE 5 — TAGS
  // ════════════════════════════════════════════════
  function runTags(cfg) {
    if (!window.LS || !window.LS.product) return;
    var pid = String(window.LS.product.id);
    var tags = (cfg.tags && cfg.tags[pid]) || [];
    if (!tags.length) return;
    var scope = document.getElementById('single-product');
    if (!scope || document.getElementById('cva-tags-wrap')) return;
    var tagDefs = {
      mas_vendido: { txt: '🔥 Más vendido', bg: '#1a1a1a', color: '#d4a85a' },
      hot_days:    { txt: '⚡ Hot Days',    bg: 'linear-gradient(135deg,#c62828,#e53935)', color: '#fff' },
      nuevo:       { txt: '✨ Nuevo',        bg: '#0d47a1', color: '#fff' },
      envio_free:  { txt: '🚚 Envío gratis', bg: '#1b5e20', color: '#fff' }
    };
    var wrap = document.createElement('div');
    wrap.id = 'cva-tags-wrap';
    s(wrap, { 'display': 'flex', 'gap': '8px', 'flex-wrap': 'wrap', 'margin-bottom': '12px' });
    tags.forEach(function (key) {
      var def = tagDefs[key]; if (!def) return;
      var tag = document.createElement('span');
      s(tag, { 'display': 'inline-flex', 'align-items': 'center', 'padding': '5px 12px', 'border-radius': '4px', 'font-size': '11px', 'font-weight': '700', 'letter-spacing': '1.2px', 'text-transform': 'uppercase', 'background': def.bg, 'color': def.color });
      tag.textContent = def.txt;
      wrap.appendChild(tag);
    });
    var titleEl = scope.querySelector('h1,.product-title,[itemprop="name"]');
    if (titleEl) titleEl.insertAdjacentElement('beforebegin', wrap);
  }

  // ════════════════════════════════════════════════
  //  FEATURE 6 — COUNTDOWN
  // ════════════════════════════════════════════════
  function runCountdown(cfg) {
    var cdCfg = cfg.countdown;
    if (!cdCfg || !cdCfg.enabled || !cdCfg.end_date) return;
    var scope = document.getElementById('single-product');
    if (!scope || document.getElementById('cva-countdown')) return;
    var endTime = new Date(cdCfg.end_date).getTime();
    if (Date.now() > endTime) return;
    var wrap = document.createElement('div');
    wrap.id = 'cva-countdown';
    s(wrap, { 'background': 'linear-gradient(135deg,#1a0a0a,#2d1515)', 'border': '1px solid rgba(198,40,40,.4)', 'border-radius': '10px', 'padding': '12px 16px', 'display': 'flex', 'align-items': 'center', 'gap': '12px', 'margin': '12px 0' });
    wrap.innerHTML = '<div style="color:#ef9a9a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;white-space:nowrap;">⚡ ' + (cdCfg.texto || 'Oferta termina en') + '</div><div id="cva-cd-timer" style="display:flex;gap:8px;"></div>';
    function unit(id, lbl) { return '<div style="background:rgba(198,40,40,.25);border:1px solid rgba(198,40,40,.35);border-radius:6px;padding:6px 10px;text-align:center;min-width:44px;"><div id="' + id + '" style="font-size:20px;font-weight:800;color:white;line-height:1;">00</div><div style="font-size:9px;color:rgba(255,255,255,.5);text-transform:uppercase;">' + lbl + '</div></div>'; }
    var timerEl = document.getElementById('cva-cd-timer');
    if (timerEl) timerEl.innerHTML = unit('cva-h', 'Hs') + '<div style="font-size:18px;font-weight:800;color:rgba(198,40,40,.6);align-self:center;">:</div>' + unit('cva-m', 'Min') + '<div style="font-size:18px;font-weight:800;color:rgba(198,40,40,.6);align-self:center;">:</div>' + unit('cva-s', 'Seg');
    function tick() {
      var rem = Math.max(0, endTime - Date.now());
      var h = Math.floor(rem / 3600000), m = Math.floor((rem % 3600000) / 60000), sec = Math.floor((rem % 60000) / 1000);
      var hEl = document.getElementById('cva-h'), mEl = document.getElementById('cva-m'), sEl = document.getElementById('cva-s');
      if (hEl) hEl.textContent = String(h).padStart(2, '0');
      if (mEl) mEl.textContent = String(m).padStart(2, '0');
      if (sEl) sEl.textContent = String(sec).padStart(2, '0');
      if (rem === 0) wrap.remove();
    }
    tick(); setInterval(tick, 1000);
    var priceEl = scope.querySelector('.js-price-display,#price_display');
    if (priceEl) priceEl.insertAdjacentElement('beforebegin', wrap);
    else scope.prepend(wrap);
  }

  // ════════════════════════════════════════════════
  //  FEATURE 7 — FAQ
  // ════════════════════════════════════════════════
  function runFAQ(cfg) {
    var faqItems = (cfg.faq && cfg.faq.length) ? cfg.faq : null;
    if (!faqItems) return;
    var descEl = document.querySelector('.product-description,[itemprop="description"],.js-product-description');
    if (!descEl || document.getElementById('cva-faq')) return;
    css('.cva-faq-item{border:1px solid #e0dcd6;border-radius:10px;overflow:hidden;margin-bottom:8px;}.cva-faq-q{padding:14px 18px;background:#f7f5f2;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-size:14px;font-weight:600;color:#1a1a1a;}.cva-faq-q:hover{background:#ede9e2;}.cva-faq-arr{font-size:12px;color:#b8954a;transition:transform .25s;}.cva-faq-a{display:none;padding:14px 18px;font-size:13px;color:#555;line-height:1.6;background:white;border-top:1px solid #e0dcd6;}.cva-faq-item.open .cva-faq-a{display:block;}.cva-faq-item.open .cva-faq-arr{transform:rotate(180deg);}');
    var wrap = document.createElement('div');
    wrap.id = 'cva-faq';
    s(wrap, { 'margin-top': '28px' });
    var title = document.createElement('h3');
    s(title, { 'font-size': '16px', 'font-weight': '700', 'color': '#1a1a1a', 'margin-bottom': '14px' });
    title.textContent = '❓ Preguntas frecuentes';
    wrap.appendChild(title);
    faqItems.forEach(function (item) {
      var div = document.createElement('div');
      div.className = 'cva-faq-item';
      div.innerHTML = '<div class="cva-faq-q" onclick="this.parentElement.classList.toggle(\'open\')">' + item.q + '<span class="cva-faq-arr">▼</span></div><div class="cva-faq-a">' + item.a + '</div>';
      wrap.appendChild(div);
    });
    descEl.insertAdjacentElement('afterend', wrap);
  }

  // ════════════════════════════════════════════════
  //  FEATURE 8 — STICKY BAR (mobile)
  // ════════════════════════════════════════════════
  function runStickyBar(cfg) {
    if (!/Mobi|Android/i.test(navigator.userAgent)) return;
    var scope = document.getElementById('single-product');
    if (!scope || document.getElementById('cva-sticky-bar')) return;
    var priceEl = scope.querySelector('.js-price-display,#price_display');
    if (!priceEl) return;
    var bar = document.createElement('div');
    bar.id = 'cva-sticky-bar';
    s(bar, { 'position': 'fixed', 'bottom': '0', 'left': '0', 'right': '0', 'background': 'white', 'border-top': '1px solid #e0dcd6', 'padding': '12px 16px', 'display': 'flex', 'align-items': 'center', 'justify-content': 'space-between', 'gap': '12px', 'z-index': '9999', 'box-shadow': '0 -4px 20px rgba(0,0,0,.1)' });
    var priceClone = document.createElement('div');
    s(priceClone, { 'font-size': '18px', 'font-weight': '800', 'color': '#1a1a1a' });
    priceClone.textContent = priceEl.textContent.trim();
    var btn = document.createElement('button');
    s(btn, { 'background': '#1a1a1a', 'color': 'white', 'padding': '12px 24px', 'border-radius': '8px', 'border': 'none', 'font-size': '14px', 'font-weight': '700', 'cursor': 'pointer', 'flex-shrink': '0' });
    btn.textContent = 'Comprar ahora';
    btn.addEventListener('click', function () {
      var buyBtn = scope.querySelector('[data-store="buy-button"],[name="add_to_cart"]');
      if (buyBtn) buyBtn.click();
    });
    bar.appendChild(priceClone); bar.appendChild(btn);
    document.body.appendChild(bar);
  }

  // ════════════════════════════════════════════════
  //  FEATURE 9 — REVIEWS
  // ════════════════════════════════════════════════
  function runReviews(cfg) {
    var reviews = cfg.reviews;
    if (!reviews || !reviews.length) return;
    var descEl = document.querySelector('.product-description,[itemprop="description"]');
    if (!descEl || document.getElementById('cva-reviews')) return;
    var wrap = document.createElement('div');
    wrap.id = 'cva-reviews';
    s(wrap, { 'margin-top': '28px' });
    var title = document.createElement('h3');
    s(title, { 'font-size': '16px', 'font-weight': '700', 'color': '#1a1a1a', 'margin-bottom': '14px' });
    title.textContent = '⭐ Opiniones de compradores';
    wrap.appendChild(title);
    reviews.forEach(function (r) {
      var card = document.createElement('div');
      s(card, { 'background': '#f7f5f2', 'border-radius': '10px', 'padding': '14px', 'margin-bottom': '10px' });
      var stars = '★'.repeat(r.rating || 5) + '☆'.repeat(5 - (r.rating || 5));
      card.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><div style="width:32px;height:32px;border-radius:50%;background:#1a1a1a;color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">' + r.name.slice(0, 2).toUpperCase() + '</div><div><div style="font-size:13px;font-weight:600;">' + r.name + '</div><div style="color:#f5a623;font-size:12px;">' + stars + '</div></div></div><div style="font-size:13px;color:#555;line-height:1.5;">' + r.text + '</div><div style="font-size:11px;color:#2e7d32;margin-top:6px;">✅ Compra verificada</div>';
      wrap.appendChild(card);
    });
    descEl.insertAdjacentElement('afterend', wrap);
  }

  // ════════════════════════════════════════════════
  //  FEATURE 10 — HERO CUADROS
  // ════════════════════════════════════════════════
  function runHeroCuadros(catCfg) {
    if (document.getElementById('cva-hero-cuadros')) return;
    var filtros = catCfg.filtros || [];
    var IMG = catCfg.hero_imagen || '';
    var titulo = catCfg.hero_titulo || 'Elegí cómo querés transformar tu hogar';

    css([
      '#cva-hero-cuadros{width:100%;position:relative;overflow:hidden;}',
      '#cva-hero-cuadros img{width:100%;display:block;max-height:420px;object-fit:cover;object-position:center;}',
      '#cva-filtros-cuadros{background:#fafaf9;padding:28px 16px 24px;text-align:center;border-bottom:1px solid #efefed;margin-bottom:8px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',
      '#cva-filtros-cuadros h3{font-size:clamp(14px,2.5vw,18px);font-weight:700;color:#111;margin:0 0 18px;letter-spacing:-.2px;}',
      '.cva-cuad-pills{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;}',
      '.cva-cuad-pill{display:inline-flex;flex-direction:column;align-items:center;gap:2px;padding:10px 20px;border-radius:999px;border:1.5px solid rgba(0,0,0,.12);background:rgba(255,255,255,.8);backdrop-filter:blur(8px);cursor:pointer;transition:all .2s;box-shadow:0 2px 8px rgba(0,0,0,.06);min-width:110px;font-family:inherit;}',
      '.cva-cuad-pill:hover{border-color:#111;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,.1);transform:translateY(-1px);}',
      '.cva-cuad-pill.active{background:#111;border-color:#111;}',
      '.cva-cuad-pill.active .cpl{color:#fff;} .cva-cuad-pill.active .cps{color:rgba(255,255,255,.7);}',
      '.cpl{font-size:14px;font-weight:700;color:#111;white-space:nowrap;}',
      '.cps{font-size:11px;color:#888;white-space:nowrap;}',
      '#cva-cuad-result{font-size:12px;color:#aaa;margin-top:14px;}'
    ].join(''));

    var hero = document.createElement('div');
    hero.id = 'cva-hero-cuadros';
    if (IMG) hero.innerHTML = '<img src="' + IMG + '" alt="' + titulo + '">';

    var pillsHtml = filtros.map(function (f) {
      return '<button class="cva-cuad-pill' + (f.key === 'todos' ? ' active' : '') + '" data-key="' + f.key + '"><span class="cpl">' + f.label + '</span><span class="cps">' + (f.sub || '') + '</span></button>';
    }).join('');

    var filtrosEl = document.createElement('div');
    filtrosEl.id = 'cva-filtros-cuadros';
    filtrosEl.innerHTML = '<h3>' + titulo + '</h3><div class="cva-cuad-pills">' + pillsHtml + '</div><div id="cva-cuad-result"></div>';

    var ref = document.querySelector('.js-product-table,.products-grid,.js-products-container,#products');
    if (!ref) return;
    ref.parentNode.insertBefore(hero, ref);
    ref.parentNode.insertBefore(filtrosEl, ref);

    var activoKey = 'todos';
    function aplicar(key) {
      activoKey = key;
      var cards = document.querySelectorAll('.js-item-product,.item-product');
      var vis = 0;
      cards.forEach(function (card) {
        var n = (card.querySelector('.js-item-name,.item-name') || {}).innerText || '';
        n = n.toLowerCase();
        var ok = false;
        if (key === 'todos') ok = true;
        else if (key === 'x3') ok = /set\s*x3|x3[\s,]/i.test(n) && !/x6/i.test(n);
        else if (key === 'x6') ok = /set\s*x6|x6[\s,]/i.test(n);
        else if (key === 'personalizado') ok = /personalizado/i.test(n);
        card.style.display = ok ? '' : 'none';
        if (ok) vis++;
      });
      document.querySelectorAll('.cva-cuad-pill').forEach(function (p) { p.classList.toggle('active', p.dataset.key === key); });
      var res = document.getElementById('cva-cuad-result');
      if (res) res.textContent = vis + ' producto' + (vis !== 1 ? 's' : '');
    }

    filtrosEl.addEventListener('click', function (e) {
      var pill = e.target.closest('.cva-cuad-pill');
      if (pill) aplicar(pill.dataset.key);
    });
    aplicar('todos');
    new MutationObserver(function () { if (activoKey !== 'todos') aplicar(activoKey); }).observe(ref, { childList: true, subtree: true });
  }

  // ════════════════════════════════════════════════
  //  FEATURE 11 — HERO CORTINAS BLACK OUT
  // ════════════════════════════════════════════════
  function runHeroCortinas(catCfg) {
    if (document.getElementById('cva-hero-cortinas')) return;
    var filtros = catCfg.filtros || [];
    var titulo = catCfg.hero_titulo || '¿Cuál es la cortina perfecta para tu ventana?';

    css([
      '#cva-hero-cortinas{width:100%;background:linear-gradient(135deg,#0a0a0a 0%,#1a1a1a 50%,#2a2a2a 100%);display:flex;align-items:center;justify-content:center;padding:40px 24px;min-height:260px;}',
      '#cva-hc-inner{max-width:680px;width:100%;text-align:center;}',
      '#cva-hc-inner .hc-tag{display:inline-block;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:14px;}',
      '#cva-hc-inner h1{font-size:clamp(20px,3.5vw,32px);font-weight:800;color:#fff;line-height:1.2;margin-bottom:18px;letter-spacing:-0.5px;}',
      '.hc-formula{display:inline-flex;align-items:center;gap:12px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:14px 22px;margin-bottom:18px;flex-wrap:wrap;justify-content:center;}',
      '.hc-fbox{display:flex;flex-direction:column;align-items:center;gap:2px;}',
      '.hc-fbox .fl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.4);}',
      '.hc-fbox .fv{font-size:13px;font-weight:700;color:#fff;white-space:nowrap;}',
      '.hc-fsep{font-size:20px;color:rgba(255,255,255,0.25);font-weight:200;}',
      '.hc-note{font-size:12px;color:rgba(255,255,255,0.45);line-height:1.6;max-width:400px;margin:0 auto;}',
      '.hc-note strong{color:rgba(255,255,255,0.8);}',
      '#cva-filtros-cortinas{background:#fafaf9;padding:28px 16px 22px;text-align:center;border-bottom:1px solid #efefed;margin-bottom:8px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',
      '#cva-filtros-cortinas h3{font-size:clamp(13px,2.2vw,16px);font-weight:700;color:#111;margin:0 0 6px;}',
      '#cva-filtros-cortinas p{font-size:12px;color:#888;margin:0 0 18px;}',
      '.cva-co-pills{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;}',
      '.cva-co-pill{display:inline-flex;flex-direction:column;align-items:center;gap:3px;padding:10px 18px;border-radius:999px;border:1.5px solid rgba(0,0,0,.12);background:rgba(255,255,255,.85);backdrop-filter:blur(8px);cursor:pointer;transition:all .2s;box-shadow:0 2px 8px rgba(0,0,0,.06);min-width:100px;font-family:inherit;}',
      '.cva-co-pill:hover{border-color:#111;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,.1);transform:translateY(-1px);}',
      '.cva-co-pill.active{background:#111;border-color:#111;}',
      '.cva-co-pill.active .col{color:#fff;} .cva-co-pill.active .cos{color:rgba(255,255,255,.6);}',
      '.col{font-size:14px;font-weight:700;color:#111;white-space:nowrap;}',
      '.cos{font-size:10px;color:#999;white-space:nowrap;text-align:center;line-height:1.3;}',
      '#cva-co-result{font-size:12px;color:#aaa;margin-top:14px;}'
    ].join(''));

    var hero = document.createElement('div');
    hero.id = 'cva-hero-cortinas';
    hero.innerHTML = '<div id="cva-hc-inner"><span class="hc-tag">Cortinas Black Out</span><h1>' + titulo + '</h1><div class="hc-formula"><div class="hc-fbox"><span class="fl">Alto</span><span class="fv">Tu ventana</span></div><span class="hc-fsep">×</span><div class="hc-fbox"><span class="fl">Ancho</span><span class="fv">Cantidad de paños</span></div><span class="hc-fsep">=</span><div class="hc-fbox"><span class="fl">Tu cortina</span><span class="fv">Perfecta</span></div></div><p class="hc-note">El <strong>alto</strong> define el tamaño de la cortina · El <strong>ancho</strong> define cuántos paños necesitás. Cada paño mide 130cm de ancho.</p></div>';

    var pillsHtml = filtros.map(function (f) {
      return '<button class="cva-co-pill' + (f.key === 'todos' ? ' active' : '') + '" data-key="' + f.key + '"><span class="col">' + f.label + '</span><span class="cos">' + (f.sub || '') + '</span></button>';
    }).join('');

    var filtrosEl = document.createElement('div');
    filtrosEl.id = 'cva-filtros-cortinas';
    filtrosEl.innerHTML = '<h3>¿Qué alto tiene tu ventana?</h3><p>Seleccioná y te mostramos exactamente las cortinas que te quedan</p><div class="cva-co-pills">' + pillsHtml + '</div><div id="cva-co-result"></div>';

    var ref = document.querySelector('.js-product-table,.products-grid,.js-products-container,#products');
    if (!ref) return;
    ref.parentNode.insertBefore(hero, ref);
    ref.parentNode.insertBefore(filtrosEl, ref);

    var activoKey = 'todos';
    function matchFiltro(nombre, key) {
      if (key === 'todos') return true;
      if (key === 'h150') return /\b(120|130|140|150)\s*cm\s*x/i.test(nombre);
      if (key === 'h210') return /\b210\s*cm\s*x/i.test(nombre);
      if (key === 'h240') return /\b(220|230|240)\s*cm\s*x/i.test(nombre);
      if (key === 'h260') return /\b(250|260)\s*cm\s*x/i.test(nombre);
      if (key === 'h300') return /\b(270|280|290|300)\s*cm\s*x/i.test(nombre) || /\b3\s*m\b/i.test(nombre);
      return true;
    }
    function aplicar(key) {
      activoKey = key;
      var cards = document.querySelectorAll('.js-item-product,.item-product');
      var vis = 0;
      cards.forEach(function (card) {
        var n = ((card.querySelector('.js-item-name,.item-name') || {}).innerText || '').toLowerCase();
        var ok = matchFiltro(n, key);
        card.style.display = ok ? '' : 'none';
        if (ok) vis++;
      });
      document.querySelectorAll('.cva-co-pill').forEach(function (p) { p.classList.toggle('active', p.dataset.key === key); });
      var res = document.getElementById('cva-co-result');
      if (res) res.textContent = vis + ' producto' + (vis !== 1 ? 's' : '');
    }
    filtrosEl.addEventListener('click', function (e) {
      var pill = e.target.closest('.cva-co-pill');
      if (pill) aplicar(pill.dataset.key);
    });
    aplicar('todos');
    new MutationObserver(function () { if (activoKey !== 'todos') aplicar(activoKey); }).observe(ref, { childList: true, subtree: true });
  }

  // ════════════════════════════════════════════════
  //  FEATURE 12 — HERO GENÉRICO (para nuevas categorías)
  // ════════════════════════════════════════════════
  function runHeroGenerico(catCfg) {
    if (document.getElementById('cva-hero-gen')) return;
    if (!catCfg.hero_imagen && !catCfg.hero_titulo) return;
    var ref = document.querySelector('.js-product-table,.products-grid,.js-products-container,#products');
    if (!ref) return;
    if (catCfg.hero_imagen) {
      var hero = document.createElement('div');
      hero.id = 'cva-hero-gen';
      hero.innerHTML = '<img src="' + catCfg.hero_imagen + '" alt="' + (catCfg.hero_titulo || '') + '" style="width:100%;display:block;max-height:400px;object-fit:cover;">';
      ref.parentNode.insertBefore(hero, ref);
    }
  }

  // ════════════════════════════════════════════════
  //  INIT con DOMContentLoaded
  // ════════════════════════════════════════════════
  // Ya ejecutado arriba con fetch. Este bloque es un fallback.

})();
