// ═══════════════════════════════════════════════════
//  ConvertAR — Snippet para Tienda Nube
//  Pegá esto en TN → Configuración → Códigos externos → Para la tienda
//  Solo cambiar SHOP_ID y API_URL con tu URL de Railway
// ═══════════════════════════════════════════════════

(function () {
  'use strict';

  var SHOP_ID = 'pintoshogar';                      // ← tu shop_id
  var API_URL = 'https://TU-APP.railway.app';        // ← URL de Railway

  // ── Session ID único por visita ──────────────────
  var sid = sessionStorage.getItem('cva_sid');
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('cva_sid', sid);
  }

  // ── Tracking: envía evento al backend ────────────
  function track(event, productId, productName) {
    try {
      fetch(API_URL + '/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id:      SHOP_ID,
          product_id:   productId   || null,
          product_name: productName || null,
          event:        event,
          session_id:   sid
        })
      });
    } catch (e) { /* silencioso — no rompe la tienda */ }
  }

  // ── Helpers CSS ──────────────────────────────────
  function s(el, styles) {
    Object.keys(styles).forEach(function (k) {
      el.style.setProperty(k, styles[k], 'important');
    });
  }
  function ars(n) {
    return '$' + Math.round(n).toLocaleString('es-AR');
  }
  function parsePrecio(txt) {
    if (!txt) return 0;
    return parseFloat(txt.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  }
  function injectCSS(css) {
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
  }

  // ── CSS global (siempre activo) ──────────────────
  injectCSS([
    // Ocultar barra progreso envío gratis en carrito
    '.js-free-shipping-progress,.js-cart-free-shipping,.cart-free-shipping,',
    '[class*="free-shipping-bar"],[class*="free-shipping-progress"],',
    '[data-store="free-shipping-bar"],[data-store="cart-free-shipping"]',
    '{ display:none!important; }',
    // Ocultar NxM "Lleva más y paga menos"
    '.js-item-quantity-discount,.item-quantity-discount,',
    '[class*="quantity-discount"],[data-quantity-discount]',
    '{ display:none!important; }'
  ].join(''));

  // ── Cargar config desde backend ──────────────────
  fetch(API_URL + '/config/' + SHOP_ID)
    .then(function (r) { return r.json(); })
    .then(function (cfg) {
      if (cfg.features.precio_tachado) runTachado(cfg);
      if (cfg.features.envio_badge)    runEnvioBadge(cfg);
      if (cfg.features.tags)           runTags(cfg);
      if (cfg.features.countdown)      runCountdown(cfg);
      if (cfg.features.faq)            runFAQ(cfg);
      if (cfg.features.video_slider)   runVideoSlider(cfg);
      if (cfg.features.sticky_bar)     runStickyBar(cfg);
      if (cfg.features.reviews)        runReviews(cfg);
    })
    .catch(function () {
      // Si el backend no responde, correr mejoras base sin config
      runTachado({});
      runEnvioBadge({ envio: { texto: 'Envío gratis a todo el país' } });
    });

  // ══════════════════════════════════════════════════
  //  AUTO-TRACKING
  // ══════════════════════════════════════════════════

  // Producto individual
  if (window.LS && window.LS.product) {
    var pid   = String(window.LS.product.id);
    var pname = window.LS.product.name;

    // Track vista
    track('productView', pid, pname);

    // Track add-to-cart
    document.addEventListener('click', function (e) {
      var btn = e.target.closest(
        '[data-store="buy-button"],[name="add_to_cart"],.js-add-to-cart,.js-buy-button'
      );
      if (btn) track('addToCart', pid, pname);
    }, true);
  }

  // Confirmación de compra
  var path = window.location.pathname;
  if (path.indexOf('/checkout/done') > -1 || path.indexOf('/pedido/') > -1) {
    track('purchase', null, null);
  }

  // ══════════════════════════════════════════════════
  //  FEATURES
  // ══════════════════════════════════════════════════

  // ── 1. PRECIO TACHADO ────────────────────────────
  function runTachado(cfg) {
    var scope = document.getElementById('single-product');

    // En página de producto
    if (scope) {
      var priceEl = document.getElementById('price_display') ||
                    scope.querySelector('.js-price-display, [data-store="price"]');
      if (!priceEl) return;

      var precio = (parseFloat((priceEl.getAttribute('data-product-price') || '').replace(',', '.')) || 0) / 100;
      if (!precio) precio = parsePrecio(priceEl.textContent);

      var cmpAttr = scope.querySelector('[data-compare-price]');
      var precioLista = cmpAttr ? (parseFloat(cmpAttr.getAttribute('data-compare-price')) || 0) / 100 : 0;
      if (!precioLista) {
        var cmpEl = scope.querySelector('.js-compare-price-display, .price-compare');
        if (cmpEl) precioLista = parsePrecio(cmpEl.textContent);
      }

      if (precioLista > precio) {
        var cmpNativo = scope.querySelector('.js-compare-price-display,.price-compare,[data-store="compare-price"]');
        if (cmpNativo) cmpNativo.style.setProperty('display', 'none', 'important');

        var tachado = document.createElement('span');
        tachado.id = 'cva-tachado-prod';
        s(tachado, {
          'font-size': '0.72em', 'font-weight': '500',
          'color': '#bbb', 'text-decoration': 'line-through',
          'margin-left': '8px', 'vertical-align': 'middle'
        });
        tachado.textContent = ars(precioLista);

        var off = Math.round((1 - precio / precioLista) * 100);
        var pill = document.createElement('span');
        pill.id = 'cva-off-pill';
        s(pill, {
          'font-size': '0.65em', 'font-weight': '700',
          'background': '#e8f5e9', 'color': '#2e7d32',
          'padding': '2px 8px', 'border-radius': '20px',
          'margin-left': '8px', 'vertical-align': 'middle'
        });
        pill.textContent = off + '% OFF';

        if (!document.getElementById('cva-tachado-prod')) {
          priceEl.insertAdjacentElement('afterend', pill);
          priceEl.insertAdjacentElement('afterend', tachado);
        }
      }
    }

    // En listing cards
    document.querySelectorAll('.js-item-product, .item-product, [data-product]').forEach(function (card) {
      var pEl = card.querySelector('.js-price-display, .item-price');
      if (!pEl) return;
      var precio = parsePrecio(pEl.textContent);
      var cmpEl = card.querySelector('.js-compare-price-display, .price-compare');
      var lista = cmpEl ? parsePrecio(cmpEl.textContent) : 0;
      if (lista > precio) {
        if (cmpEl) cmpEl.style.setProperty('display', 'none', 'important');
        var t = document.createElement('span');
        s(t, {
          'font-size': '0.78em', 'color': '#aaa',
          'text-decoration': 'line-through', 'margin-left': '5px'
        });
        t.textContent = ars(lista);
        if (!pEl.nextSibling || pEl.nextSibling.textContent !== t.textContent) {
          pEl.insertAdjacentElement('afterend', t);
        }
      }
    });
  }

  // ── 2. BADGE DE ENVÍO ────────────────────────────
  function runEnvioBadge(cfg) {
    var scope = document.getElementById('single-product');
    if (!scope || document.getElementById('cva-envio-badge')) return;

    var envioTexto = (cfg.envio && cfg.envio.texto) || 'Envío a todo el país';

    var wrap = document.createElement('div');
    wrap.id = 'cva-envio-badge';
    s(wrap, {
      'background': 'rgba(255,255,255,.65)',
      'backdrop-filter': 'blur(14px)',
      '-webkit-backdrop-filter': 'blur(14px)',
      'border': '1px solid rgba(255,255,255,.85)',
      'border-radius': '14px',
      'padding': '14px 18px',
      'display': 'flex',
      'align-items': 'center',
      'gap': '14px',
      'box-shadow': '0 4px 24px rgba(0,0,0,.07)',
      'margin-top': '16px'
    });

    wrap.innerHTML =
      '<div style="width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,#1a1a1a,#3a3a3a);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">🚚</div>' +
      '<div><div style="font-size:13px;font-weight:700;color:#1a1a1a;margin-bottom:2px;">' + envioTexto + '</div>' +
      '<div style="font-size:11px;color:#777;">Ingresá tu código postal para saber cuándo llega</div></div>';

    var anchor = scope.querySelector('.js-shipping-calculator') ||
                 scope.querySelector('[data-store="shipping"]') ||
                 scope.querySelector('.js-buy-form') ||
                 scope.querySelector('[data-store="buy-button"]');

    if (anchor) {
      anchor.insertAdjacentElement('afterend', wrap);
    } else {
      scope.appendChild(wrap);
    }
  }

  // ── 3. TAGS ──────────────────────────────────────
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
      var def = tagDefs[key];
      if (!def) return;
      var tag = document.createElement('span');
      s(tag, {
        'display': 'inline-flex', 'align-items': 'center',
        'padding': '5px 12px', 'border-radius': '4px',
        'font-size': '11px', 'font-weight': '700',
        'letter-spacing': '1.2px', 'text-transform': 'uppercase',
        'background': def.bg, 'color': def.color
      });
      tag.textContent = def.txt;
      wrap.appendChild(tag);
    });

    var titleEl = scope.querySelector('h1, .product-title, [itemprop="name"]');
    if (titleEl) titleEl.insertAdjacentElement('beforebegin', wrap);
  }

  // ── 4. COUNTDOWN ─────────────────────────────────
  function runCountdown(cfg) {
    var cdCfg = cfg.countdown;
    if (!cdCfg || !cdCfg.enabled || !cdCfg.end_date) return;

    var scope = document.getElementById('single-product');
    if (!scope || document.getElementById('cva-countdown')) return;

    var endTime = new Date(cdCfg.end_date).getTime();
    if (Date.now() > endTime) return; // ya expiró

    var wrap = document.createElement('div');
    wrap.id = 'cva-countdown';
    s(wrap, {
      'background': 'linear-gradient(135deg,#1a0a0a,#2d1515)',
      'border': '1px solid rgba(198,40,40,.4)',
      'border-radius': '10px',
      'padding': '12px 16px',
      'display': 'flex',
      'align-items': 'center',
      'gap': '12px',
      'margin': '12px 0'
    });

    var labelHTML = '<div style="color:#ef9a9a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;white-space:nowrap;">⚡ ' + (cdCfg.texto || 'Oferta termina en') + '</div>';
    var timerHTML = '<div id="cva-cd-timer" style="display:flex;gap:8px;"></div>';
    wrap.innerHTML = labelHTML + timerHTML;

    function unit(id, lbl) {
      return '<div style="background:rgba(198,40,40,.25);border:1px solid rgba(198,40,40,.35);border-radius:6px;padding:6px 10px;text-align:center;min-width:44px;">' +
        '<div id="' + id + '" style="font-size:20px;font-weight:800;color:white;line-height:1;">00</div>' +
        '<div style="font-size:9px;color:rgba(255,255,255,.5);text-transform:uppercase;">' + lbl + '</div></div>';
    }
    document.getElementById('cva-cd-timer').innerHTML =
      unit('cva-h', 'Hs') + '<div style="font-size:18px;font-weight:800;color:rgba(198,40,40,.6);align-self:center;">:</div>' +
      unit('cva-m', 'Min') + '<div style="font-size:18px;font-weight:800;color:rgba(198,40,40,.6);align-self:center;">:</div>' +
      unit('cva-s', 'Seg');

    function tick() {
      var rem = Math.max(0, endTime - Date.now());
      var h = Math.floor(rem / 3600000);
      var m = Math.floor((rem % 3600000) / 60000);
      var sec = Math.floor((rem % 60000) / 1000);
      document.getElementById('cva-h').textContent = String(h).padStart(2, '0');
      document.getElementById('cva-m').textContent = String(m).padStart(2, '0');
      document.getElementById('cva-s').textContent = String(sec).padStart(2, '0');
      if (rem === 0) wrap.remove();
    }
    tick();
    setInterval(tick, 1000);

    var priceEl = scope.querySelector('.js-price-display, #price_display');
    if (priceEl) priceEl.insertAdjacentElement('beforebegin', wrap);
    else scope.prepend(wrap);
  }

  // ── 5. FAQ ───────────────────────────────────────
  function runFAQ(cfg) {
    var faqItems = (cfg.faq && cfg.faq.length) ? cfg.faq : null;
    if (!faqItems) return;

    var descEl = document.querySelector('.product-description, [itemprop="description"], .js-product-description');
    if (!descEl || document.getElementById('cva-faq')) return;

    injectCSS([
      '.cva-faq-item{border:1px solid #e0dcd6;border-radius:10px;overflow:hidden;margin-bottom:8px;}',
      '.cva-faq-q{padding:14px 18px;background:#f7f5f2;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-size:14px;font-weight:600;color:#1a1a1a;}',
      '.cva-faq-q:hover{background:#ede9e2;}',
      '.cva-faq-arr{font-size:12px;color:#b8954a;transition:transform .25s;}',
      '.cva-faq-a{display:none;padding:14px 18px;font-size:13px;color:#555;line-height:1.6;background:white;border-top:1px solid #e0dcd6;}',
      '.cva-faq-item.open .cva-faq-a{display:block;}',
      '.cva-faq-item.open .cva-faq-arr{transform:rotate(180deg);}'
    ].join(''));

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
      div.innerHTML =
        '<div class="cva-faq-q" onclick="this.parentElement.classList.toggle(\'open\')">' +
        item.q + '<span class="cva-faq-arr">▼</span></div>' +
        '<div class="cva-faq-a">' + item.a + '</div>';
      wrap.appendChild(div);
    });

    descEl.insertAdjacentElement('afterend', wrap);
  }

  // ── 6. VIDEO SLIDER ──────────────────────────────
  function runVideoSlider(cfg) {
    // Se implementa en la próxima iteración con URLs de videos por producto
    // cfg.videos = { "product_id": ["url1.mp4", "url2.mp4"] }
    console.log('[ConvertAR] Video Slider: próximamente');
  }

  // ── 7. STICKY BAR (mobile) ───────────────────────
  function runStickyBar(cfg) {
    if (!/Mobi|Android/i.test(navigator.userAgent)) return;

    var scope = document.getElementById('single-product');
    if (!scope || document.getElementById('cva-sticky-bar')) return;

    var priceEl = scope.querySelector('.js-price-display, #price_display');
    if (!priceEl) return;

    var bar = document.createElement('div');
    bar.id = 'cva-sticky-bar';
    s(bar, {
      'position': 'fixed', 'bottom': '0', 'left': '0', 'right': '0',
      'background': 'white', 'border-top': '1px solid #e0dcd6',
      'padding': '12px 16px', 'display': 'flex',
      'align-items': 'center', 'justify-content': 'space-between', 'gap': '12px',
      'z-index': '9999', 'box-shadow': '0 -4px 20px rgba(0,0,0,.1)'
    });

    var priceClone = document.createElement('div');
    s(priceClone, { 'font-size': '18px', 'font-weight': '800', 'color': '#1a1a1a' });
    priceClone.textContent = priceEl.textContent.trim();

    var btn = document.createElement('button');
    s(btn, {
      'background': '#1a1a1a', 'color': 'white',
      'padding': '12px 24px', 'border-radius': '8px', 'border': 'none',
      'font-size': '14px', 'font-weight': '700', 'cursor': 'pointer', 'flex-shrink': '0'
    });
    btn.textContent = 'Comprar ahora';
    btn.addEventListener('click', function () {
      var buyBtn = scope.querySelector('[data-store="buy-button"], [name="add_to_cart"]');
      if (buyBtn) buyBtn.click();
    });

    bar.appendChild(priceClone);
    bar.appendChild(btn);
    document.body.appendChild(bar);
  }

  // ── 8. REVIEWS ───────────────────────────────────
  function runReviews(cfg) {
    var reviews = (cfg.reviews && cfg.reviews.length) ? cfg.reviews : null;
    if (!reviews) return;

    var descEl = document.querySelector('.product-description, [itemprop="description"]');
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
      s(card, {
        'background': '#f7f5f2', 'border-radius': '10px',
        'padding': '14px', 'margin-bottom': '10px'
      });
      var stars = '★'.repeat(r.rating || 5) + '☆'.repeat(5 - (r.rating || 5));
      card.innerHTML =
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
        '<div style="width:32px;height:32px;border-radius:50%;background:#1a1a1a;color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">' +
        r.name.slice(0, 2).toUpperCase() + '</div>' +
        '<div><div style="font-size:13px;font-weight:600;">' + r.name + '</div>' +
        '<div style="color:#f5a623;font-size:12px;">' + stars + '</div></div></div>' +
        '<div style="font-size:13px;color:#555;line-height:1.5;">' + r.text + '</div>' +
        '<div style="font-size:11px;color:#2e7d32;margin-top:6px;">✅ Compra verificada</div>';
      wrap.appendChild(card);
    });

    descEl.insertAdjacentElement('afterend', wrap);
  }

})();
