/* ============================================================
   ConvertAR · Badge Cuotas v3
   convertar-app-production.up.railway.app/static/badge-cuotas.js
   ============================================================ */
(function () {
  var CUOTAS_N = 6;
  function ars(n) { return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function parsePrecio(txt) { if (!txt) return 0; var n = txt.replace(/[^0-9]/g, ''); return n ? parseInt(n, 10) : 0; }
  function s(el, obj) { Object.keys(obj).forEach(function(p) { el.style.setProperty(p, obj[p], 'important'); }); }

  function getCuotas() {
    var sels = ['.js-max-installments-container','.js-max-installments','.product-detail-installments','[data-store="installments"]'];
    for (var i = 0; i < sels.length; i++) {
      var el = document.querySelector(sels[i]);
      if (el) { var m = el.textContent.match(/(\d+)\s*cuotas/i); if (m) return parseInt(m[1], 10); }
    }
    return CUOTAS_N;
  }

  function crearBadgeCuotas(cant, precio, small) {
    var wrap = document.createElement('div');
    wrap.setAttribute('data-pintos-badge', 'cuotas');
    s(wrap, {'display':'flex','align-items':'center','gap':small?'5px':'10px','border':'2px solid #228b3a','border-radius':'6px','padding':small?'3px 6px 3px 3px':'6px 12px 6px 6px','margin':'4px 0 2px','background':'#f0fff4','width':'fit-content','max-width':'100%','box-sizing':'border-box','float':'none','clear':'both'});
    var chip = document.createElement('div');
    s(chip, {'background':'#228b3a','border-radius':'4px','padding':small?'3px 6px':'4px 9px','display':'flex','flex-direction':'column','align-items':'center','flex-shrink':'0'});
    var t1 = document.createElement('span');
    s(t1, {'display':'block','font-size':small?'8px':'10px','font-weight':'800','letter-spacing':'0.5px','text-transform':'uppercase','line-height':'1.3','white-space':'nowrap','color':'#fff'});
    t1.textContent = cant + ' cuotas';
    var t2 = document.createElement('span');
    s(t2, {'display':'block','font-size':small?'7px':'9px','font-weight':'600','color':'rgba(255,255,255,0.85)','white-space':'nowrap'});
    t2.textContent = 'sin interés ✓';
    chip.appendChild(t1); chip.appendChild(t2);
    var price = document.createElement('span');
    s(price, {'display':'inline-block','font-size':small?'12px':'20px','font-weight':'800','color':'#111','white-space':'nowrap','line-height':'1'});
    price.textContent = cant + ' x ' + ars(precio / cant);
    wrap.appendChild(chip); wrap.appendChild(price);
    return wrap;
  }

  function inyectarEnProducto() {
    var old = document.getElementById('cva-cuotas-badge'); if (old) old.remove();
    var priceEl = document.getElementById('price_display') || document.querySelector('.js-price-display');
    if (!priceEl) return;
    var precio = 0;
    var datEl = document.querySelector('[data-product-price]');
    if (datEl) precio = (parseFloat(datEl.getAttribute('data-product-price')) || 0) / 100;
    if (!precio) precio = parsePrecio(priceEl.textContent);
    if (!precio) return;
    var cant = getCuotas();
    var badge = crearBadgeCuotas(cant, precio, false);
    badge.id = 'cva-cuotas-badge';
    var ancla = document.getElementById('pintos-mp-prod') || priceEl.parentNode;
    ancla.insertAdjacentElement('afterend', badge);
    var nativo = document.querySelector('.js-max-installments-container,.js-max-installments,.product-detail-installments,[data-store="installments"]');
    if (nativo) nativo.style.setProperty('display', 'none', 'important');
  }

  function inyectarEnListado() {
    document.querySelectorAll('.js-item-product, .item-product').forEach(function(card) {
      if (card.dataset.pintoscuotas) return;
      var pEl = card.querySelector('.js-price-display') || card.querySelector('.item-price') || card.querySelector('.js-price');
      if (!pEl) return;
      var precio = parsePrecio(pEl.textContent); if (precio <= 0) return;
      var badge = crearBadgeCuotas(CUOTAS_N, precio, true);
      card.dataset.pintoscuotas = '1';
      var xfer = card.querySelector('[data-pintos-badge="transfer"]');
      var ancla = xfer || pEl.parentNode;
      ancla.insertAdjacentElement('afterend', badge);
      card.querySelectorAll('.js-max-installments-container,.js-max-installments,.item-installments,.product-installments').forEach(function(el){ el.style.setProperty('display','none','important'); });
    });
  }

  function init() {
    if (window.LS && window.LS.product) {
      var e1 = 0;
      var iv1 = setInterval(function() {
        if (document.getElementById('price_display') || document.querySelector('.js-price-display')) { clearInterval(iv1); inyectarEnProducto(); return; }
        e1 += 100; if (e1 >= 8000) clearInterval(iv1);
      }, 100);
      document.addEventListener('change', function(e) {
        if (e.target.matches('select,input[type="radio"]')) { clearTimeout(window._cvaCuotasT); window._cvaCuotasT = setTimeout(inyectarEnProducto, 450); }
      });
    } else {
      var e2 = 0;
      var iv2 = setInterval(function() {
        if (document.querySelector('.js-item-product, .item-product')) {
          clearInterval(iv2); inyectarEnListado();
          var root = document.querySelector('.js-product-table,.js-products-container,#products,.products-grid');
          if (root) new MutationObserver(function() { setTimeout(inyectarEnListado, 300); }).observe(root, {childList:true,subtree:true});
          return;
        }
        e2 += 100; if (e2 >= 8000) clearInterval(iv2);
      }, 100);
    }
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { setTimeout(init, 400); }
})();
