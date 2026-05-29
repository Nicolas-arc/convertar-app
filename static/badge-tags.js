/* ConvertAR - Badge Tags por producto */
(function(){
  var API  = 'https://convertar-app-production.up.railway.app';
  var SHOP = 'pintoshogar';

  /* Shared config promise */
  window.__CVA_CFG_P = window.__CVA_CFG_P ||
    fetch(API + '/config/' + SHOP).then(function(r){ return r.json(); }).catch(function(){ return {}; });

  var TAG_STYLES = {
    mas_vendido: { txt: '\uD83D\uDD25 M\u00E1s vendido', bg: '#1a1a1a',                                      color: '#d4a85a' },
    hot_days:    { txt: '\u26A1 Hot Days',               bg: 'linear-gradient(135deg,#c62828,#e53935)',      color: '#fff'    },
    nuevo:       { txt: '\u2728 Nuevo',                  bg: '#0d47a1',                                      color: '#fff'    },
    envio_free:  { txt: '\uD83D\uDE9A Env\u00EDo gratis', bg: '#1b5e20',                                     color: '#fff'    }
  };

  function getProductId() {
    if (window.LS && window.LS.product) {
      if (window.LS.product.id)     return String(window.LS.product.id);
      if (window.LS.product.handle) return window.LS.product.handle;
    }
    return null;
  }

  function findAnchor() {
    return document.querySelector('.js-item-name') ||
           document.querySelector('h1[itemprop="name"]') ||
           document.querySelector('.product-title') ||
           document.querySelector('h1');
  }

  function inject(cfg) {
    if (!window.LS || !window.LS.product) return;
    if (document.getElementById('cva-tags-wrap')) return;

    var pid = getProductId();
    if (!pid) return;

    var tagsMap = cfg.tags || {};
    var activeTags = tagsMap[pid] || [];
    if (!activeTags.length) return;

    var wrap = document.createElement('div');
    wrap.id = 'cva-tags-wrap';
    wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px;';

    activeTags.forEach(function(key) {
      var def = TAG_STYLES[key];
      if (!def) return;
      var chip = document.createElement('span');
      chip.style.cssText = 'display:inline-flex;align-items:center;padding:4px 10px;border-radius:4px;font-size:10px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;background:' + def.bg + ';color:' + def.color + ';';
      chip.textContent = def.txt;
      wrap.appendChild(chip);
    });

    if (!wrap.children.length) return;

    /* Anclar con reintentos: espera hasta 8s a que el t\u00EDtulo est\u00E9 en el DOM */
    var anchor = findAnchor();
    if (anchor) {
      anchor.insertAdjacentElement('beforebegin', wrap);
      return;
    }
    var elapsed = 0;
    var iv = setInterval(function() {
      anchor = findAnchor();
      elapsed += 100;
      if (anchor) {
        clearInterval(iv);
        if (!document.getElementById('cva-tags-wrap')) {
          anchor.insertAdjacentElement('beforebegin', wrap);
        }
      } else if (elapsed >= 8000) {
        clearInterval(iv);
      }
    }, 100);
  }

  function init() {
    window.__CVA_CFG_P.then(function(cfg) {
      var f = (cfg && cfg.features) || {};
      if (f.tags === false) return; /* feature desactivada */
      inject(cfg);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 200);
  }
})();
