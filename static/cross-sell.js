/* ConvertAR - Cross-Sell Popup v1 */
(function(){
  var API  = 'https://convertar-app-production.up.railway.app';
  var SHOP = 'pintoshogar';

  window.__CVA_CFG_P = window.__CVA_CFG_P ||
    fetch(API+'/config/'+SHOP).then(function(r){return r.json();}).catch(function(){return{};});

  var _cfg = null;
  var _rule = null;
  var _pendingForm = null;
  var _timerIv = null;

  /* ════════════════════════════════════════
     ESTILOS
  ════════════════════════════════════════ */
  function injectCSS() {
    if (document.getElementById('cva-cs-css')) return;
    var css = [
      '#cva-cs-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:999999;display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity .3s}',
      '#cva-cs-overlay.cva-show{opacity:1;pointer-events:all}',
      '#cva-cs-sheet{width:100%;max-width:480px;background:#fff;border-radius:20px 20px 0 0;max-height:90vh;overflow-y:auto;transform:translateY(100%);transition:transform .35s cubic-bezier(.2,.8,.3,1)}',
      '#cva-cs-overlay.cva-show #cva-cs-sheet{transform:translateY(0)}',
      '.cva-cs-handle{width:36px;height:4px;background:#e0e0e0;border-radius:2px;margin:12px auto 14px}',
      '.cva-cs-head{padding:0 20px 12px;position:sticky;top:0;background:#fff;z-index:2;border-bottom:1px solid #f0f0f0}',
      '.cva-cs-headline{font-size:15px;font-weight:800;color:#111;line-height:1.3;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.cva-cs-sub{font-size:12px;color:#888;margin-top:3px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.cva-cs-timer{display:flex;align-items:center;gap:8px;background:#fff5f0;border:1px solid #ffe0d0;border-radius:8px;padding:8px 12px;margin:10px 20px 0}',
      '.cva-cs-timer-txt{font-size:11px;font-weight:700;color:#c0392b;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.cva-cs-timer-count{font-size:15px;font-weight:900;color:#c0392b;font-variant-numeric:tabular-nums;letter-spacing:.5px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.cva-cs-products{padding:14px 20px;display:flex;flex-direction:column;gap:12px}',
      '.cva-cs-card{border:1.5px solid #eee;border-radius:14px;overflow:hidden;transition:border-color .2s}',
      '.cva-cs-card-top{display:flex;gap:12px;padding:12px;align-items:flex-start}',
      '.cva-cs-img-wrap{position:relative;flex-shrink:0}',
      '.cva-cs-img{width:80px;height:80px;object-fit:cover;border-radius:10px;background:#f0ece6;display:block;transition:opacity .15s}',
      '.cva-cs-fire{position:absolute;top:-6px;right:-6px;background:#c0392b;color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow:0 2px 6px rgba(192,57,43,.4)}',
      '.cva-cs-info{flex:1;min-width:0}',
      '.cva-cs-badge{display:inline-block;background:#fff0e8;color:#c0392b;font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px;margin-bottom:6px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.cva-cs-name{font-size:13px;font-weight:700;color:#111;line-height:1.3;margin-bottom:5px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.cva-cs-prices{display:flex;align-items:baseline;gap:7px;margin-bottom:4px;flex-wrap:wrap}',
      '.cva-cs-price-new{font-size:18px;font-weight:900;color:#111;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.cva-cs-price-old{font-size:13px;color:#bbb;text-decoration:line-through;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.cva-cs-disc{background:#22c55e;color:#fff;font-size:10px;font-weight:800;padding:2px 6px;border-radius:4px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.cva-cs-vars{padding:0 12px 10px}',
      '.cva-cs-vars-lbl{font-size:10px;color:#888;font-weight:600;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.cva-cs-pills{display:flex;flex-wrap:wrap;gap:6px}',
      '.cva-cs-pill{padding:5px 12px;border-radius:20px;border:1.5px solid #ddd;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;color:#444;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.cva-cs-pill:hover{border-color:#c0392b;color:#c0392b}',
      '.cva-cs-pill.cva-active{border-color:#c0392b;background:#c0392b;color:#fff}',
      '.cva-cs-add{width:calc(100% - 24px);margin:0 12px 12px;background:#111;color:#fff;border:none;padding:13px;border-radius:10px;font-size:14px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:background .2s;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.cva-cs-add:hover{background:#c0392b}',
      '.cva-cs-add.cva-added{background:#22c55e;pointer-events:none}',
      '.cva-cs-footer{padding:8px 20px 28px;text-align:center}',
      '.cva-cs-skip{font-size:13px;color:#aaa;cursor:pointer;text-decoration:underline;text-underline-offset:3px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:none;border:none}',
      '.cva-cs-skip:hover{color:#666}',
      /* Sección en página de producto */
      '#cva-cs-section{margin:12px 0;border:1.5px solid #e8e0d4;border-radius:14px;overflow:hidden}',
      '.cva-cs-sec-head{background:#f9f5f0;padding:11px 14px;display:flex;align-items:center;gap:8px}',
      '.cva-cs-sec-title{font-size:13px;font-weight:800;color:#111;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.cva-cs-sec-sub{font-size:11px;color:#888;margin-top:1px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.cva-cs-sec-card{display:flex;align-items:center;gap:12px;padding:11px 14px;border-top:1px solid #f0f0f0}',
      '.cva-cs-sec-img{width:54px;height:54px;border-radius:8px;object-fit:cover;background:#f0ece6;flex-shrink:0}',
      '.cva-cs-sec-info{flex:1;min-width:0}',
      '.cva-cs-sec-name{font-size:13px;font-weight:700;color:#111;margin-bottom:3px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.cva-cs-sec-price{font-size:12px;color:#888;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.cva-cs-sec-price strong{color:#111;font-weight:800}',
      '.cva-cs-sec-btn{background:#111;color:#fff;border:none;padding:8px 13px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;transition:background .2s}',
      '.cva-cs-sec-btn:hover{background:#c0392b}'
    ].join('');
    var el = document.createElement('style');
    el.id = 'cva-cs-css';
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ════════════════════════════════════════
     HELPERS
  ════════════════════════════════════════ */
  function ars(n) {
    return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  }

  function discountedPrice(price, pct) {
    return price * (1 - pct / 100);
  }

  /* ════════════════════════════════════════
     POPUP
  ════════════════════════════════════════ */
  function buildPopup(cfg, rule) {
    var cs   = cfg.crosssell || {};
    var urg  = cs.urgency   || {};

    var overlay = document.createElement('div');
    overlay.id  = 'cva-cs-overlay';
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closePopup(true);
    });

    var sheet = document.createElement('div');
    sheet.id  = 'cva-cs-sheet';

    /* handle + header */
    var head = document.createElement('div');
    head.className = 'cva-cs-head';
    head.innerHTML =
      '<div class="cva-cs-handle"></div>' +
      '<div class="cva-cs-headline">'+(cs.popup_headline||'🔥 ¡Completá tu combo antes de pagar!')+'</div>' +
      '<div class="cva-cs-sub">Clientes que compraron esto también agregaron:</div>';

    sheet.appendChild(head);

    /* timer */
    if (urg.show_timer && urg.timer_minutes) {
      var timerDiv = document.createElement('div');
      timerDiv.className = 'cva-cs-timer';
      timerDiv.innerHTML =
        '<span style="font-size:16px">⏱</span>' +
        '<span class="cva-cs-timer-txt">Precio especial expira en </span>' +
        '<span class="cva-cs-timer-count" id="cva-cs-timer-count">--:--</span>';
      sheet.appendChild(timerDiv);
      startTimer(urg.timer_minutes);
    }

    /* products */
    var prods = document.createElement('div');
    prods.className = 'cva-cs-products';

    (rule.offers || []).forEach(function(offer, idx) {
      prods.appendChild(buildCard(offer, idx, urg));
    });

    sheet.appendChild(prods);

    /* footer */
    var footer = document.createElement('div');
    footer.className = 'cva-cs-footer';
    var skipBtn = document.createElement('button');
    skipBtn.className = 'cva-cs-skip';
    skipBtn.textContent = 'No gracias, solo quiero agregar mi producto →';
    skipBtn.onclick = function() { closePopup(true); };
    footer.appendChild(skipBtn);
    sheet.appendChild(footer);

    overlay.appendChild(sheet);
    document.body.appendChild(overlay);

    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        overlay.classList.add('cva-show');
      });
    });
  }

  function buildCard(offer, idx, urg) {
    var card = document.createElement('div');
    card.className = 'cva-cs-card';
    card.dataset.cvaCsIdx = idx;

    var hasVariants = offer.variants && offer.variants.length > 1;
    var selVariant  = hasVariants ? offer.variants[0] : null;
    var price       = selVariant ? selVariant.price : offer.price;
    var img         = selVariant ? (selVariant.img || offer.img) : offer.img;
    var variantId   = selVariant ? selVariant.id : offer.variant_id;
    var discPct     = offer.discount_pct || 0;
    var finalPrice  = discountedPrice(price, discPct);

    /* top row */
    var top = document.createElement('div');
    top.className = 'cva-cs-card-top';

    var imgWrap = document.createElement('div');
    imgWrap.className = 'cva-cs-img-wrap';

    var imgEl = document.createElement('img');
    imgEl.className = 'cva-cs-img';
    imgEl.id = 'cva-cs-img-'+idx;
    imgEl.src = img || '';
    imgEl.alt = offer.name || '';
    imgWrap.appendChild(imgEl);

    if (urg && urg.show_fire) {
      var fire = document.createElement('div');
      fire.className = 'cva-cs-fire';
      fire.textContent = '🔥';
      imgWrap.appendChild(fire);
    }
    top.appendChild(imgWrap);

    var info = document.createElement('div');
    info.className = 'cva-cs-info';
    if (offer.badge) {
      var badge = document.createElement('div');
      badge.className = 'cva-cs-badge';
      badge.textContent = offer.badge;
      info.appendChild(badge);
    }
    var nameEl = document.createElement('div');
    nameEl.className = 'cva-cs-name';
    nameEl.textContent = offer.name || '';
    info.appendChild(nameEl);

    var pricesEl = document.createElement('div');
    pricesEl.className = 'cva-cs-prices';
    var priceNew = document.createElement('span');
    priceNew.className = 'cva-cs-price-new';
    priceNew.id = 'cva-cs-pnew-'+idx;
    priceNew.textContent = ars(finalPrice);
    pricesEl.appendChild(priceNew);
    if (discPct > 0) {
      var priceOld = document.createElement('span');
      priceOld.className = 'cva-cs-price-old';
      priceOld.id = 'cva-cs-pold-'+idx;
      priceOld.textContent = ars(price);
      pricesEl.appendChild(priceOld);
      var discEl = document.createElement('span');
      discEl.className = 'cva-cs-disc';
      discEl.textContent = '-'+discPct+'%';
      pricesEl.appendChild(discEl);
    }
    info.appendChild(pricesEl);
    top.appendChild(info);
    card.appendChild(top);

    /* variantes */
    if (hasVariants) {
      var varsWrap = document.createElement('div');
      varsWrap.className = 'cva-cs-vars';
      var varsLbl = document.createElement('div');
      varsLbl.className = 'cva-cs-vars-lbl';
      varsLbl.textContent = 'Elegí la variante:';
      varsWrap.appendChild(varsLbl);
      var pills = document.createElement('div');
      pills.className = 'cva-cs-pills';
      offer.variants.forEach(function(v, vi) {
        var pill = document.createElement('div');
        pill.className = 'cva-cs-pill' + (vi===0?' cva-active':'');
        pill.textContent = v.label || ('Variante '+(vi+1));
        pill.dataset.vid   = v.id;
        pill.dataset.vimg  = v.img || offer.img || '';
        pill.dataset.vprice= v.price || offer.price;
        pill.onclick = function() {
          pills.querySelectorAll('.cva-cs-pill').forEach(function(p){p.classList.remove('cva-active');});
          pill.classList.add('cva-active');
          var newImg = pill.dataset.vimg;
          var newP   = parseFloat(pill.dataset.vprice);
          var imgTarget = document.getElementById('cva-cs-img-'+idx);
          if (imgTarget && newImg) {
            imgTarget.style.opacity = '.4';
            setTimeout(function(){ imgTarget.src = newImg; imgTarget.style.opacity = '1'; }, 150);
          }
          var pnEl = document.getElementById('cva-cs-pnew-'+idx);
          var poEl = document.getElementById('cva-cs-pold-'+idx);
          if (pnEl) pnEl.textContent = ars(discountedPrice(newP, discPct));
          if (poEl) poEl.textContent = ars(newP);
          card.dataset.cvaVid = pill.dataset.vid;
        };
        pills.appendChild(pill);
      });
      varsWrap.appendChild(pills);
      card.appendChild(varsWrap);
      card.dataset.cvaVid = offer.variants[0].id;
    } else {
      card.dataset.cvaVid = offer.variant_id || '';
    }
    card.dataset.cvaPid = offer.product_id || '';

    /* add button */
    var addBtn = document.createElement('button');
    addBtn.className = 'cva-cs-add';
    addBtn.id = 'cva-cs-addbtn-'+idx;
    addBtn.innerHTML = '<span>🛒</span> Agregar '+(offer.name||'')+'';
    addBtn.onclick = function() {
      var pid = card.dataset.cvaPid;
      var vid = card.dataset.cvaVid;
      addBtn.innerHTML = '<span>⏳</span> Agregando...';
      addBtn.disabled = true;
      addCrossSell(pid, vid, function() {
        addBtn.innerHTML = '✓ ¡Agregado al carrito!';
        addBtn.classList.add('cva-added');
        setTimeout(function() {
          closePopup(false);
          submitOriginal();
        }, 700);
      }, function() {
        addBtn.innerHTML = '🛒 Agregar '+(offer.name||'');
        addBtn.disabled = false;
      });
    };
    card.appendChild(addBtn);

    return card;
  }

  function startTimer(minutes) {
    if (_timerIv) clearInterval(_timerIv);
    var secs = minutes * 60;
    function render() {
      var el = document.getElementById('cva-cs-timer-count');
      if (!el) return;
      var m = Math.floor(secs/60), s = secs%60;
      el.textContent = (m<10?'0':'')+m+':'+(s<10?'0':'')+s;
    }
    render();
    _timerIv = setInterval(function() {
      if (secs <= 0) { clearInterval(_timerIv); return; }
      secs--;
      render();
    }, 1000);
  }

  function closePopup(submitOrig) {
    var ov = document.getElementById('cva-cs-overlay');
    if (!ov) return;
    if (_timerIv) clearInterval(_timerIv);
    ov.classList.remove('cva-show');
    setTimeout(function() { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 400);
    if (submitOrig) submitOriginal();
  }

  /* ════════════════════════════════════════
     CART
  ════════════════════════════════════════ */
  /* Abre el drawer del carrito de TN sin redirigir */
  function openCartDrawer() {
    /* Evolución: dispara el evento nativo de TN para abrir el mini-cart */
    document.dispatchEvent(new CustomEvent('cart:open', { bubbles: true }));
    /* Fallback: click en el ícono del carrito */
    setTimeout(function() {
      var btn = document.querySelector(
        '[data-js="cart-widget"] a, [data-store="cart"] a, ' +
        '.js-cart-widget a, a[href*="carrito"], a[href*="/cart"]'
      );
      if (btn) btn.click();
    }, 150);
  }

  function tnCartAdd(pid, vid, qty, onOk, onErr) {
    if (!pid) { if (onOk) onOk(); return; }
    qty = qty || '1';
    var body = 'add_to_cart=' + pid + (vid ? '&variation_id=' + vid : '') + '&quantity=' + qty;
    var urls = ['/carrito/agregar', '/cart/add'];
    function tryNext(i) {
      if (i >= urls.length) { if (onErr) onErr(); return; }
      fetch(urls[i], {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
        body: body
      }).then(function(r) {
        console.log('[CVA-CS] tnCartAdd', urls[i], 'status:', r.status);
        if (r.ok || r.status === 200 || r.status === 302) { if (onOk) onOk(); }
        else { tryNext(i + 1); }
      }).catch(function(e) {
        console.log('[CVA-CS] tnCartAdd error at', urls[i], e);
        tryNext(i + 1);
      });
    }
    tryNext(0);
  }

  function addCrossSell(pid, vid, onOk, onErr) {
    tnCartAdd(pid, vid, '1', onOk, onErr);
  }

  function submitOriginal() {
    /* Leer producto original desde LS (lo más confiable en TN) */
    var pid = null, vid = null, qty = '1';
    if (window.LS && window.LS.product) {
      pid = window.LS.product.id;
      vid = window.LS.selectedVariation ? window.LS.selectedVariation.id : null;
    }
    if (!pid && _pendingForm) {
      var fd = new FormData(_pendingForm);
      pid = fd.get('product_id') || fd.get('add_to_cart') || fd.get('id');
      vid = fd.get('variation_id') || fd.get('variant_id');
      qty = fd.get('quantity') || '1';
    }
    _pendingForm = null;
    if (!pid) { console.log('[CVA-CS] submitOriginal: no pid'); openCartDrawer(); return; }
    console.log('[CVA-CS] adding original: pid=', pid, 'vid=', vid);
    tnCartAdd(pid, vid, qty, function() {
      openCartDrawer();
    }, function() {
      openCartDrawer();
    });
  }

  /* ════════════════════════════════════════
     INTERCEPTAR ADD TO CART
  ════════════════════════════════════════ */
  function interceptCart() {
    document.addEventListener('click', function(e) {
      if (!_rule) return;

      /* TN Evolución usa [data-store="add-to-cart"] con type="button" —
         NO requiere form ni type="submit"                               */
      var btn = e.target.closest(
        '[data-store="add-to-cart"], .js-add-to-cart-btn, .js-add-to-cart, ' +
        'button[name="add"], button[type="submit"], input[type="submit"]'
      );
      if (!btn) return;

      console.log('[CVA-CS] btn matched:', btn.tagName, btn.getAttribute('data-store'), btn.className);

      /* Intentar encontrar el form, pero no es obligatorio */
      var form = btn.closest('form');
      if (form) {
        var action = (form.action || form.getAttribute('action') || '').toLowerCase();
        /* Rechazar solo si es claramente un form de otra cosa (búsqueda, login, etc.) */
        if (action && action.indexOf('cart') === -1 && action.indexOf('carrito') === -1 && action.indexOf('buy') === -1 && action.indexOf('comprar') === -1) {
          console.log('[CVA-CS] form action irrelevant:', action, '— skip');
          return;
        }
      }

      e.preventDefault();
      e.stopImmediatePropagation();
      _pendingForm = form || null;
      console.log('[CVA-CS] showing popup');
      buildPopup(_cfg, _rule);
    }, true);
  }

  /* ════════════════════════════════════════
     SECCIÓN EN PÁGINA DE PRODUCTO
  ════════════════════════════════════════ */
  function injectProductSection(cfg, rule) {
    var cs = cfg.crosssell || {};
    if (!cs.show_on_product_page) return;
    if (document.getElementById('cva-cs-section')) return;

    var section = document.createElement('div');
    section.id  = 'cva-cs-section';

    var head = document.createElement('div');
    head.className = 'cva-cs-sec-head';
    head.innerHTML =
      '<span style="font-size:20px">🎁</span>' +
      '<div>' +
        '<div class="cva-cs-sec-title">'+(cs.product_page_title||'Completá tu combo y ahorrá')+'</div>' +
        '<div class="cva-cs-sec-sub">Productos que combinan perfecto</div>' +
      '</div>';
    section.appendChild(head);

    (rule.offers || []).forEach(function(offer) {
      var discPct = offer.discount_pct || 0;
      var price   = offer.price || 0;
      var final   = discountedPrice(price, discPct);
      var card    = document.createElement('div');
      card.className = 'cva-cs-sec-card';
      var img = document.createElement('img');
      img.className = 'cva-cs-sec-img';
      img.src = offer.img || '';
      img.alt = offer.name || '';
      card.appendChild(img);
      var info = document.createElement('div');
      info.className = 'cva-cs-sec-info';
      info.innerHTML =
        '<div class="cva-cs-sec-name">'+escHtml(offer.name||'')+'</div>' +
        '<div class="cva-cs-sec-price"><strong>'+ars(final)+'</strong>'+
        (discPct>0 ? ' <span style="text-decoration:line-through;font-size:11px">'+ars(price)+'</span> &middot; '+discPct+'% OFF' : '')+
        '</div>';
      card.appendChild(info);
      var btn = document.createElement('button');
      btn.className = 'cva-cs-sec-btn';
      btn.textContent = '+ Agregar';
      btn.onclick = function() {
        btn.textContent = '⏳';
        btn.disabled = true;
        addCrossSell(offer.product_id, offer.variant_id, function() {
          btn.textContent = '✓ Agregado';
          btn.style.background = '#22c55e';
        }, function() {
          btn.textContent = '+ Agregar';
          btn.disabled = false;
        });
      };
      card.appendChild(btn);
      section.appendChild(card);
    });

    /* insertar antes del botón de compra */
    var elapsed = 0;
    var iv = setInterval(function() {
      elapsed += 100;
      var anchor =
        document.getElementById('cva-cuotas-badge') ||
        document.getElementById('pintos-mp-prod') ||
        document.querySelector('[data-pintos-badge]') ||
        document.querySelector('.js-buy-form') ||
        document.querySelector('form[action*="/cart/add"]');
      if (anchor) {
        clearInterval(iv);
        anchor.insertAdjacentElement('beforebegin', section);
      }
      if (elapsed >= 8000) clearInterval(iv);
    }, 100);
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* ════════════════════════════════════════
     AUTO-FETCH VARIANTES DE TN
  ════════════════════════════════════════ */
  function fetchOfferVariants(offers, onDone) {
    /* Solo busca los offers sin variantes configuradas */
    var pids = offers
      .filter(function(o) { return !o.variants || o.variants.length <= 1; })
      .map(function(o) { return o.product_id; })
      .filter(Boolean);

    if (!pids.length) { onDone(); return; }

    console.log('[CVA-CS] fetching variants for pids:', pids);
    fetch('/api/catalog/products?ids=' + pids.join(','))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var prods = data.products || (Array.isArray(data) ? data : []);
        prods.forEach(function(prod) {
          offers.forEach(function(offer) {
            if (String(offer.product_id) !== String(prod.id)) return;
            var vars = prod.variants || [];
            console.log('[CVA-CS] product', prod.id, 'variants:', vars.length);
            if (vars.length > 1) {
              offer.variants = vars.map(function(v) {
                return {
                  id:    v.id,
                  label: v.name || v.label || ('Variante ' + v.id),
                  price: v.price || offer.price || 0,
                  img:   (v.image && (v.image.src || v.image)) || offer.img || ''
                };
              });
            }
            /* Actualizar imagen y precio del offer con los del primer variant */
            if (vars.length && !offer.img) {
              var firstImg = vars[0].image;
              offer.img = (firstImg && (firstImg.src || firstImg)) || '';
            }
            if (vars.length && !offer.price) {
              offer.price = vars[0].price || 0;
            }
          });
        });
        onDone();
      })
      .catch(function(e) {
        console.log('[CVA-CS] fetchOfferVariants error:', e, '— continuando sin variantes');
        onDone();
      });
  }

  /* ════════════════════════════════════════
     INIT
  ════════════════════════════════════════ */
  function init() {
    console.log('[CVA-CS] init start, LS.product=', !!(window.LS && window.LS.product));
    if (!window.LS || !window.LS.product) { console.log('[CVA-CS] no LS.product, abort'); return; }
    window.__CVA_CFG_P.then(function(cfg) {
      var f  = (cfg && cfg.features) || {};
      console.log('[CVA-CS] config loaded, features.crosssell=', f.crosssell);
      if (f.crosssell === false) { console.log('[CVA-CS] feature disabled'); return; }
      var cs = cfg && cfg.crosssell;
      console.log('[CVA-CS] crosssell.enabled=', cs && cs.enabled, '| rules=', cs && cs.rules && cs.rules.length);
      if (!cs || !cs.enabled) { console.log('[CVA-CS] not enabled — activalo en el panel'); return; }
      var pid = String(window.LS.product.id);
      console.log('[CVA-CS] product id=', pid);
      var rules = cs.rules || [];
      var matched = null;
      for (var i = 0; i < rules.length; i++) {
        var triggers = rules[i].trigger_ids || [rules[i].trigger_id];
        for (var j = 0; j < triggers.length; j++) {
          if (String(triggers[j]) === pid) { matched = rules[i]; break; }
        }
        if (matched) break;
      }
      console.log('[CVA-CS] matched rule=', matched ? 'YES ('+matched.offers.length+' offers)' : 'NO');
      if (!matched || !matched.offers || !matched.offers.length) return;
      _cfg  = cfg;
      _rule = matched;
      /* Buscar variantes automáticamente antes de armar el popup */
      fetchOfferVariants(matched.offers, function() {
        injectCSS();
        interceptCart();
        injectProductSection(cfg, matched);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 300);
  }
})();
