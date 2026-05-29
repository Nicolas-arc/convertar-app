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
           document.querySelector('.js-product-name') ||
           document.querySelector('h1[itemprop="name"]') ||
           document.querySelector('.product-title') ||
           document.querySelector('h1');
  }

  function buildWrap(activeTags) {
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
    return wrap.children.length ? wrap : null;
  }

  function doInsert(activeTags) {
    if (document.getElementById('cva-tags-wrap')) return;
    var anchor = findAnchor();
    if (!anchor) return;
    var wrap = buildWrap(activeTags);
    if (!wrap) return;
    anchor.insertAdjacentElement('beforebegin', wrap);
  }

  function inject(cfg) {
    console.log('[CVA-Tags] inject start');
    if (!window.LS || !window.LS.product) { console.log('[CVA-Tags] abort: no LS.product'); return; }

    var pid = getProductId();
    console.log('[CVA-Tags] pid:', pid);
    if (!pid) return;

    var tagsMap = cfg.tags || {};
    var activeTags = tagsMap[pid] || [];
    console.log('[CVA-Tags] activeTags:', activeTags);
    if (!activeTags.length) { console.log('[CVA-Tags] abort: no tags for this product'); return; }

    var elapsed = 0;
    var iv = setInterval(function() {
      elapsed += 100;
      var mpEl   = document.getElementById('pintos-mp-prod');
      var bdgEl  = document.querySelector('[data-pintos-badge]');
      var ready  = mpEl || bdgEl || elapsed >= 3000;
      if (ready) {
        clearInterval(iv);
        console.log('[CVA-Tags] ready! mp=', !!mpEl, 'bdg=', !!bdgEl, 'elapsed=', elapsed);
        doInsert(activeTags);
        console.log('[CVA-Tags] after doInsert, wrap in DOM:', !!document.getElementById('cva-tags-wrap'));
        var anchor = findAnchor();
        if (anchor && anchor.parentNode) {
          var obs = new MutationObserver(function() {
            if (!document.getElementById('cva-tags-wrap')) {
              console.log('[CVA-Tags] wrap removed, re-injecting');
              doInsert(activeTags);
            }
          });
          obs.observe(anchor.parentNode, { childList: true, subtree: false });
          setTimeout(function() { obs.disconnect(); }, 10000);
        }
      }
      if (elapsed >= 8000) { console.log('[CVA-Tags] timeout'); clearInterval(iv); }
    }, 100);
  }

  function init() {
    window.__CVA_CFG_P.then(function(cfg) {
      console.log('[CVA-Tags] config loaded, features.tags=', cfg && cfg.features && cfg.features.tags);
      var f = (cfg && cfg.features) || {};
      if (f.tags === false) { console.log('[CVA-Tags] feature disabled'); return; }
      inject(cfg);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 300);
  }
})();
