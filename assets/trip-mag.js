/* Japan 2026 — magazine layout behaviours: mobile nav drawer */
(function(){
  'use strict';
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded',fn); }
  ready(function(){
    var nav=document.querySelector('nav'), burger=document.querySelector('.navburger');
    if(!nav||!burger) return;
    burger.addEventListener('click',function(){
      var open=nav.classList.toggle('open');
      burger.textContent=open?'✕':'☰';
      burger.setAttribute('aria-expanded',open?'true':'false');
    });
    nav.addEventListener('click',function(e){
      if(e.target.tagName==='A'&&nav.classList.contains('open')){
        nav.classList.remove('open'); burger.textContent='☰'; burger.setAttribute('aria-expanded','false');
      }
    });
  });
})();
