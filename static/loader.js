/* ================================================================
   ConvertAR Loader v1 \u2014 UN SOLO TAG en GTM para controlar todo
   convertar-app-production.up.railway.app/static/loader.js
   ================================================================ */
(function(){
  var API  = 'https://convertar-app-production.up.railway.app';
  var SHOP = 'pintoshogar';

  /* Cache global del config \u2014 todos los scripts lo comparten */
  window.__CVA_CFG_P = window.__CVA_CFG_P ||
    fetch(API + '/config/' + SHOP)
      .then(function(r){ return r.json(); })
      .catch(function(){ return {}; });

  window.__CVA_CFG_P.then(function(cfg){
    var f = cfg.features || {};

    /* Mapa feature \u2192 archivo.
       Si la feature no est\u00E1 expl\u00EDcitamente en false, se carga.
       Esto garantiza compatibilidad: tiendas nuevas cargan todo por defecto. */
    var SCRIPTS = [
      { key: 'mejor_precio',    file: 'badge-transfer.js'   },
      { key: 'cuotas',          file: 'badge-cuotas.js'     },
      { key: 'whatsapp',        file: 'badge-whatsapp.js'   },
      { key: 'social_proof',    file: 'social-proof.js'     },
      { key: 'floating_buttons',file: 'floating-buttons.js' },
      { key: 'llevas_mas',      file: 'llevas-mas.js'       },
      { key: 'filtros',         file: 'filtros-blackout.js' },
      { key: 'tags',            file: 'badge-tags.js'       }
    ];

    SCRIPTS.forEach(function(s){
      /* Cargar si la feature NO est\u00E1 desactivada expl\u00EDcitamente */
      if (f[s.key] === false) return;
      var el = document.createElement('script');
      el.src = API + '/static/' + s.file;
      el.async = true;
      document.head.appendChild(el);
    });
  });
})();
