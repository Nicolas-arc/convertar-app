/* ============================================================
   ConvertAR \u00B7 Llev\u00E1 m\u00E1s & Ahorr\u00E1 v3
   convertar-app-production.up.railway.app/static/llevas-mas.js
   ============================================================ */
(function () {
  if (!window.LS || !window.LS.product) return;

  /* CSS injection: ocultar tabla nativa apenas carga el script */
  var HIDE_CSS = '.js-bulk-discount-table,.js-bulk-discount-container,[data-store="product-bulk-discount"],.bulk-discount,.product-bulk-discount,.js-product-promotions,.product-promotions-bulk,.bulk-discount-table{display:none!important}';
  if (!document.getElementById('ph-ma-hide')) {
    var hs = document.createElement('style'); hs.id = 'ph-ma-hide';
    hs.textContent = HIDE_CSS; document.head.appendChild(hs);
  }

  /* Estilos del widget */
  if (!document.getElementById('ph-ma-styles')) {
    var st = document.createElement('style'); st.id = 'ph-ma-styles';
    st.textContent = '#ph-mas-ahorra{margin:12px 0 0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.ph-ma-titulo{text-align:center;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#aaa;margin-bottom:10px;display:flex;align-items:center;gap:8px}.ph-ma-titulo::before,.ph-ma-titulo::after{content:"";flex:1;height:1px;background:#e8e8e8}.ph-ma-cards{display:flex;flex-direction:column;gap:8px}.ph-ma-card{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1.5px solid #e0e0e0;border-radius:10px;cursor:pointer;transition:border-color .15s,background .15s;background:#fff;user-select:none}.ph-ma-card:hover{border-color:#aaa}.ph-ma-card.ph-ma-sel{border-color:#111;background:#fafafa}.ph-ma-radio{width:18px;height:18px;border-radius:50%;border:2px solid #ccc;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:border-color .15s}.ph-ma-card.ph-ma-sel .ph-ma-radio{border-color:#111}.ph-ma-dot{width:8px;height:8px;border-radius:50%;background:#111;opacity:0;transition:opacity .15s}.ph-ma-card.ph-ma-sel .ph-ma-dot{opacity:1}.ph-ma-info{flex:1;min-width:0}.ph-ma-r1{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.ph-ma-lbl{font-size:13px;font-weight:700;color:#111}.ph-ma-pct{font-size:11px;font-weight:700;color:#c0392b;background:#fff5f5;border:1px solid rgba(192,57,43,.2);border-radius:4px;padding:1px 6px;white-space:nowrap}.ph-ma-best{font-size:10px;font-weight:800;color:#fff;background:#111;border-radius:4px;padding:2px 7px;letter-spacing:.5px;text-transform:uppercase;margin-left:auto;white-space:nowrap}.ph-ma-r2{display:flex;align-items:center;gap:8px;margin-top:3px;flex-wrap:wrap}.ph-ma-ahorra{font-size:11px;color:#228b3a;font-weight:600}.ph-ma-unit{font-size:11px;color:#999}.ph-ma-precio{text-align:right;flex-shrink:0}.ph-ma-total{font-size:16px;font-weight:800;color:#111;display:block;white-space:nowrap}.ph-ma-tach{font-size:11px;color:#ccc;text-decoration:line-through;display:block;text-align:right;white-space:nowrap}';
    document.head.appendChild(st);
  }

  function ars(n) { return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  function getTiersFromLS() {
    var promos = window.LS && window.LS.product && window.LS.product.promotions;
    if (!Array.isArray(promos) || !promos.length) return [];
    var t = promos.map(function(p) {
      var qty = parseInt(p.min_quantity || p.quantity || p.min_qty || 0);
      var pct = parseFloat(p.discount_percentage || p.percentage || p.discount || 0);
      return {qty: qty, pct: pct};
    }).filter(function(x) { return x.qty > 1 && x.pct > 0; })
      .sort(function(a,b){return a.qty-b.qty;});
    return t;
  }

  /* TN pone pct en col0 ("5% OFF") y qty en col1 ("comprando 3 unidades") */
  function parseTNRow(c0, c1) {
    var pct = 0, qty = 0;
    if (c0.includes('%')) {
      var pm = c0.match(/(\d+)\s*%/); var qm = c1.match(/(\d+)/);
      if (pm) pct = parseInt(pm[1]); if (qm) qty = parseInt(qm[1]);
    } else {
      var qm2 = c0.match(/(\d+)/); var pm2 = c1.match(/(\d+)\s*%/) || c1.match(/(\d+)/);
      if (qm2) qty = parseInt(qm2[1]); if (pm2) pct = parseInt(pm2[1]);
    }
    return (qty > 1 && pct > 0 && pct < 100) ? {qty:qty, pct:pct} : null;
  }

  function getTiersFromDOM() {
    /* Primero intentar con visibility: hidden para leer antes de ocultar */
    var sels = ['[data-store="product-bulk-discount"] table','.js-bulk-discount-table','.bulk-discount-table','.product-bulk-discount table','.js-bulk-discount-container table'];
    for (var i = 0; i < sels.length; i++) {
      var tbl = document.querySelector(sels[i]); if (!tbl) continue;
      var t = [];
      tbl.querySelectorAll('tr').forEach(function(row) {
        var celdas = row.querySelectorAll('td'); if (celdas.length < 2) return;
        var r = parseTNRow(celdas[0].textContent.trim(), celdas[1].textContent.trim());
        if (r) t.push(r);
      });
      if (t.length) return t.sort(function(a,b){return a.qty-b.qty;});
    }
    /* Fallback: buscar cualquier contenedor con texto de descuento */
    var containers = document.querySelectorAll('[data-store="product-bulk-discount"],[class*="bulk"],[class*="discount"]');
    for (var j = 0; j < containers.length; j++) {
      var rows = containers[j].querySelectorAll('tr'); if (!rows.length) continue;
      var t2 = [];
      rows.forEach(function(row) {
        var celdas = row.querySelectorAll('td'); if (celdas.length < 2) return;
        var r = parseTNRow(celdas[0].textContent.trim(), celdas[1].textContent.trim());
        if (r) t2.push(r);
      });
      if (t2.length) return t2.sort(function(a,b){return a.qty-b.qty;});
    }
    return [];
  }

  function getTiers() {
    var t = getTiersFromLS();
    if (t.length) return t;
    /* Desactivar temporalmente el hide CSS para leer el DOM */
    var hideEl = document.getElementById('ph-ma-hide');
    if (hideEl) hideEl.disabled = true;
    var result = getTiersFromDOM();
    if (hideEl) hideEl.disabled = false;
    return result;
  }

  function renderWidget(precio) {
    var tiers = getTiers();
    if (!tiers.length) return;
    var old = document.getElementById('ph-mas-ahorra'); if (old) old.remove();
    var opciones = [{qty:1,pct:0}].concat(tiers);
    var bestPct = Math.max.apply(null, tiers.map(function(t){return t.pct;}));
    var wrap = document.createElement('div'); wrap.id = 'ph-mas-ahorra';
    var titulo = document.createElement('div'); titulo.className = 'ph-ma-titulo'; titulo.textContent = 'Llev\u00e1 m\u00e1s & Ahorr\u00e1';
    wrap.appendChild(titulo);
    var cardsEl = document.createElement('div'); cardsEl.className = 'ph-ma-cards';
    opciones.forEach(function(op, idx) {
      var pUnit=precio*(1-op.pct/100), total=pUnit*op.qty, totalSin=precio*op.qty, ahorro=totalSin-total, esBest=op.pct>0&&op.pct===bestPct;
      var card=document.createElement('div'); card.className='ph-ma-card'+(idx===0?' ph-ma-sel':''); card.dataset.qty=op.qty;
      var radio=document.createElement('div'); radio.className='ph-ma-radio';
      var dot=document.createElement('div'); dot.className='ph-ma-dot'; radio.appendChild(dot);
      var info=document.createElement('div'); info.className='ph-ma-info';
      var r1=document.createElement('div'); r1.className='ph-ma-r1';
      var lbl=document.createElement('span'); lbl.className='ph-ma-lbl'; lbl.textContent='Llev\u00e1 '+op.qty; r1.appendChild(lbl);
      if(op.pct>0){var pctEl=document.createElement('span');pctEl.className='ph-ma-pct';pctEl.textContent=op.pct+'% OFF \uD83D\uDD25';r1.appendChild(pctEl);}
      if(esBest){var best=document.createElement('span');best.className='ph-ma-best';best.textContent='Mayor ahorro';r1.appendChild(best);}
      info.appendChild(r1);
      if(ahorro>0||op.qty>1){var r2=document.createElement('div');r2.className='ph-ma-r2';if(ahorro>0){var ahorraEl=document.createElement('span');ahorraEl.className='ph-ma-ahorra';ahorraEl.textContent='Ahorr\u00e1s '+ars(ahorro);r2.appendChild(ahorraEl);}if(op.qty>1){var unitEl=document.createElement('span');unitEl.className='ph-ma-unit';unitEl.textContent=ars(pUnit)+' c/u';r2.appendChild(unitEl);}info.appendChild(r2);}
      var precioWrap=document.createElement('div'); precioWrap.className='ph-ma-precio';
      var totalEl=document.createElement('span'); totalEl.className='ph-ma-total'; totalEl.textContent=ars(total); precioWrap.appendChild(totalEl);
      if(ahorro>0){var tachEl=document.createElement('span');tachEl.className='ph-ma-tach';tachEl.textContent=ars(totalSin);precioWrap.appendChild(tachEl);}
      card.appendChild(radio); card.appendChild(info); card.appendChild(precioWrap);
      card.addEventListener('click', function() {
        cardsEl.querySelectorAll('.ph-ma-card').forEach(function(c){c.classList.remove('ph-ma-sel');});
        card.classList.add('ph-ma-sel');
        var qtyInput=document.querySelector('input[name="quantity"],.js-product-quantity-input,#product-quantity');
        if(qtyInput){qtyInput.value=op.qty;qtyInput.dispatchEvent(new Event('change',{bubbles:true}));}
      });
      cardsEl.appendChild(card);
    });
    wrap.appendChild(cardsEl);
    var ancla = document.getElementById('cva-cuotas-badge') ||
                document.querySelector('[data-pintos-badge="cuotas"]') ||
                document.querySelector('[data-pintos-badge="transfer"]') ||
                document.querySelector('[data-pintos-badge="envios"]') ||
                document.getElementById('price_display') ||
                document.querySelector('.js-price-display');
    if (ancla) {
      ancla.insertAdjacentElement('afterend', wrap);
    } else {
      var btn = document.querySelector('.js-add-to-cart,[data-store="buy-button"],.buy-now,.js-buy-button');
      if (btn && btn.parentNode) btn.parentNode.insertBefore(wrap, btn);
    }
  }

  function init() {
    var elapsed=0;
    var iv=setInterval(function(){
      var el=document.querySelector('[data-product-price]');
      if(el){clearInterval(iv);var precio=parseFloat(el.getAttribute('data-product-price'))/100;if(precio>0)setTimeout(function(){renderWidget(precio);},800);return;}
      elapsed+=100;if(elapsed>=8000)clearInterval(iv);
    },100);
    if(LS.registerOnChangeVariant){LS.registerOnChangeVariant(function(variant){var p=variant&&variant.price?variant.price/100:0;if(p>0)setTimeout(function(){renderWidget(p);},450);});}
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{setTimeout(init,400);}
})();
