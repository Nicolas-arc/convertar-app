/* ConvertAR - Badge WhatsApp Consulta */
(function(){
  if(!window.LS||!window.LS.product)return;
  if(document.getElementById('ph-wp-btn'))return;

  var WA_NUMBER='5492235551148';

  if(!document.getElementById('ph-wp-style')){
    var st=document.createElement('style');st.id='ph-wp-style';
    st.textContent='#ph-wp-btn{display:inline-flex;align-items:center;gap:9px;padding:11px 20px;border:2px solid #25d366;border-radius:8px;background:#fff;color:#128c4e;font-size:14px;font-weight:700;text-decoration:none;cursor:pointer;margin:10px 0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;transition:background .2s,color .2s;}#ph-wp-btn:hover{background:#25d366;color:#fff;}#ph-wp-btn svg{flex-shrink:0;}';
    document.head.appendChild(st);
  }

  function buildBtn(){
    var nombre='';
    var nameEl=document.querySelector('.js-item-name,.product-title,h1[itemprop="name"],h1');
    if(nameEl)nombre=nameEl.textContent.trim();
    var url=window.location.href;
    var msg='Hola! Tengo una consulta sobre este producto:\n'+nombre+'\n'+url;
    var waUrl='https://wa.me/'+WA_NUMBER+'?text='+encodeURIComponent(msg);
    var btn=document.createElement('a');
    btn.id='ph-wp-btn';
    btn.href=waUrl;
    btn.target='_blank';
    btn.rel='noopener';
    btn.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>'
    +'Ten\u00e9s una consulta? Escrib\u00ednos';
    return btn;
  }

  function init(){
    var elapsed=0;
    var iv=setInterval(function(){
      var ancla=document.getElementById('cva-cuotas-badge')
        ||document.querySelector('[data-pintos-badge="transfer"]')
        ||document.querySelector('[data-pintos-badge="cuotas"]')
        ||document.querySelector('#price_display,.js-price-display');
      if(ancla){
        clearInterval(iv);
        var btn=buildBtn();
        ancla.insertAdjacentElement('afterend',btn);
        return;
      }
      elapsed+=100;if(elapsed>=8000)clearInterval(iv);
    },100);
  }

  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}
  else{setTimeout(init,400);}
})();
