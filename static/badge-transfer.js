/* ============================================================
   ConvertAR \u00B7 Badge Transferencia (Mejor Precio)
   convertar-app-production.up.railway.app/static/badge-transfer.js
   ============================================================ */
(function () {
  var DESC = 0.10;
  var _priceObs = null;
  function ars(n) { return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function parsePrecio(txt) { if (!txt) return 0; var n = txt.replace(/[^0-9]/g, ''); return n ? parseInt(n, 10) : 0; }
  function s(el, obj) { Object.keys(obj).forEach(function(p) { el.style.setProperty(p, obj[p], 'important'); }); }

  function crearBadge(precioFinal, small) {
    var wrap = document.createElement('div');
    wrap.setAttribute('data-pintos-badge', 'transfer');
    s(wrap, {'display':'flex','align-items':'center','gap':small?'6px':'10px','border':'2px solid #c0392b','border-radius':'6px','padding':small?'4px 8px 4px 4px':'6px 12px 6px 6px','margin':'6px 0 4px','background':'#fff5f5','width':'fit-content','max-width':'100%','box-sizing':'border-box','float':'none','clear':'both'});
    var chip = document.createElement('div');
    s(chip, {'background':'#c0392b','color':'#fff','border-radius':'4px','padding':small?'3px 6px':'4px 9px','display':'flex','flex-direction':'column','align-items':'center','flex-shrink':'0'});
    var t1 = document.createElement('span');
    s(t1, {'display':'block','font-size':small?'8px':'10px','font-weight':'800','letter-spacing':'0.5px','text-transform':'uppercase','line-height':'1.3','white-space':'nowrap','color':'#fff'});
    t1.textContent = 'Mejor Precio';
    var t2 = document.createElement('span');
    s(t2, {'display':'block','font-size':small?'7px':'9px','font-weight':'600','color':'rgba(255,255,255,0.85)','white-space':'nowrap'});
    t2.textContent = 'Transferencia';
    chip.appendChild(t1); chip.appendChild(t2);
    var price = document.createElement('span');
    s(price, {'display':'inline-block','font-size':small?'14px':'20px','font-weight':'800','color':'#111','white-space':'nowrap','line-height':'1'});
    price.textContent = ars(precioFinal);
    wrap.appendChild(chip); wrap.appendChild(price);
    return wrap;
  }

  /* Ocultar elementos nativos de TN por selector CSS (cubre themes conocidos) */
  function ocultarNativosCSS() {
    if (document.getElementById('ph-tr-hide')) return;
    var s2 = document.createElement('style'); s2.id = 'ph-tr-hide';
    s2.textContent = '.js-product-payment-info,.product-payment-info,[data-store="product-payment-methods"],[data-store="product-payment-info"],.js-payment-discount,.payment-discount,.js-product-promotions-legend,.product-promotions-legend,.payment-discount-price-product-container{display:none!important}';
    document.head.appendChild(s2);
  }

  /* Fallback: buscar por contenido de texto cuando el selector no matchea */
  function ocultarNativosPorTexto() {
    var nodo = document.getElementById('single-product') ||
               document.querySelector('.js-product-detail,[data-store="product"],main') ||
               document.body;
    nodo.querySelectorAll('p,span,div,li,small').forEach(function(el) {
      if (el.children.length > 0) return;
      if (el.closest('[data-pintos-badge]') || el.id === 'pintos-mp-prod' || el.id === 'cva-cuotas-badge') return;
      var t = el.textContent.trim();
      if (!t) return;
      if (/con Transferencia/i.test(t) ||
          /con Dep\u00F3sito/i.test(t) ||
          /lleva m.+s y paga menos/i.test(t)) {
        el.style.setProperty('display','none','important');
      }
    });
  }

  function ocultarNativosProducto() {
    ocultarNativosCSS();
    setTimeout(ocultarNativosPorTexto, 600);
    setTimeout(ocultarNativosPorTexto, 1500); /* segunda pasada por si TN los agrega tarde */
  }

  function inyectarEnProducto() {
    if (_priceObs) _priceObs.disconnect();
    clearTimeout(window._pintosT);
    ocultarNativosProducto();
    var viejoBadge = document.getElementById('pintos-mp-prod'); if (viejoBadge) viejoBadge.remove();
    var viejoTachado = document.getElementById('pintos-tachado-prod'); if (viejoTachado) viejoTachado.remove();
    var precio = 0;
    var datEl = document.querySelector('[data-product-price]');
    if (datEl) precio = (parseFloat(datEl.getAttribute('data-product-price')) || 0) / 100;
    var priceEl = document.querySelector('#price_display');
    if (!precio && priceEl) precio = parsePrecio(priceEl.textContent);
    var precioLista = 0;
    var cmpAttr = document.querySelector('[data-compare-price]');
    if (cmpAttr) precioLista = (parseFloat(cmpAttr.getAttribute('data-compare-price')) || 0) / 100;
    if (!precioLista) { var cmpEl = document.querySelector('.js-compare-price-display') || document.querySelector('.price-compare'); if (cmpEl) precioLista = parsePrecio(cmpEl.textContent); }
    if (precioLista > precio) { var cmpNativo = document.querySelector('.js-compare-price-display, .price-compare, [data-store="compare-price"]'); if (cmpNativo) cmpNativo.style.setProperty('display', 'none', 'important'); }
    if (precio && priceEl) {
      s(priceEl, {'display':'inline-block','width':'auto','max-width':'none','flex-shrink':'0'});
      s(priceEl.parentNode, {'display':'flex','align-items':'baseline','gap':'10px','flex-wrap':'nowrap'});
      if (precioLista > precio) {
        var tachado = document.createElement('span'); tachado.id = 'pintos-tachado-prod';
        s(tachado, {'font-size':'0.72em','font-weight':'500','color':'#bbb','text-decoration':'line-through','white-space':'nowrap','line-height':'1','display':'inline-block','flex-shrink':'0'});
        tachado.textContent = ars(precioLista); priceEl.insertAdjacentElement('afterend', tachado);
      }
      var badge = crearBadge(precio * (1 - DESC), false); badge.id = 'pintos-mp-prod';
      s(badge, {'display':'flex','clear':'both'}); priceEl.parentNode.insertAdjacentElement('afterend', badge);
    }
    setTimeout(function() { var root = document.querySelector('#price_display'); if (_priceObs && root) _priceObs.observe(root.parentNode || root, {childList:true,subtree:true,characterData:true}); }, 300);
  }

  function inyectarEnListado() {
    document.querySelectorAll('.js-item-product, .item-product').forEach(function(card) {
      if (card.dataset.pintosmp) return;
      var pEl = card.querySelector('.js-price-display') || card.querySelector('.item-price') || card.querySelector('.js-price');
      if (!pEl) return;
      var precio = parsePrecio(pEl.textContent); if (precio <= 0) return;
      var cmpElCard = card.querySelector('.js-compare-price-display') || card.querySelector('.price-compare');
      var precioListaCard = cmpElCard ? parsePrecio(cmpElCard.textContent) : 0;
      if (cmpElCard && precioListaCard > precio) cmpElCard.style.setProperty('display', 'none', 'important');
      s(pEl, {'display':'inline-block','width':'auto','flex-shrink':'0'});
      s(pEl.parentNode, {'display':'flex','align-items':'baseline','gap':'6px','flex-wrap':'nowrap'});
      if (precioListaCard > precio) {
        var tachado = document.createElement('span');
        s(tachado, {'font-size':'11px','font-weight':'500','color':'#bbb','text-decoration':'line-through','white-space':'nowrap','display':'inline-block','flex-shrink':'0'});
        tachado.textContent = ars(precioListaCard); pEl.insertAdjacentElement('afterend', tachado);
      }
      var badge = crearBadge(precio * (1 - DESC), true); card.dataset.pintosmp = '1';
      s(badge, {'display':'flex','clear':'both'}); pEl.parentNode.insertAdjacentElement('afterend', badge);
      card.querySelectorAll('span,div,p').forEach(function(el) {
        if (el.children.length > 0) return;
        var t = el.textContent.trim().toLowerCase();
        if (t.length > 0 && t.length < 80 && ((t.includes('lleva') && t.includes('paga')) || /comprando \d+ o m/.test(t))) el.style.setProperty('display', 'none', 'important');
      });
    });
  }

  function init() {
    var esProducto = !!(window.LS && LS.product);
    if (esProducto) {
      inyectarEnProducto();
      var root = document.querySelector('#price_display');
      if (root) { _priceObs = new MutationObserver(function() { clearTimeout(window._pintosT); window._pintosT = setTimeout(inyectarEnProducto, 350); }); }
      document.addEventListener('change', function(e) { if (e.target.matches('select,input[type="radio"]')) { clearTimeout(window._pintosT); window._pintosT = setTimeout(inyectarEnProducto, 400); } });
    } else {
      inyectarEnListado();
      var listRoot = document.querySelector('.js-product-table,.js-products-container,#products,.products-grid');
      if (listRoot) { new MutationObserver(function() { clearTimeout(window._pintosT); window._pintosT = setTimeout(inyectarEnListado, 400); }).observe(listRoot, {childList:true,subtree:true}); }
    }
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { setTimeout(init, 300); }
})();
