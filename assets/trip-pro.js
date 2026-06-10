/* Japan 2026 — professional layer: light/dark theme toggle,
   scroll progress bar, back-to-top */
(function(){
  'use strict';
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded',fn); }

  /* theme — light is the default, choice persists */
  var KEY='jp_theme';
  function apply(t){ document.body.classList.toggle('light',t==='light'); }
  var saved=null; try{ saved=localStorage.getItem(KEY); }catch(e){}
  var theme=saved||'light';

  ready(function(){
    apply(theme);

    var nav=document.querySelector('nav .inner');
    if(nav){
      var btn=document.createElement('button');
      btn.type='button'; btn.className='themetoggle';
      function label(){ btn.innerHTML=document.body.classList.contains('light')?'☾&nbsp;dark':'☀&nbsp;light'; }
      label();
      btn.addEventListener('click',function(){
        theme=document.body.classList.contains('light')?'dark':'light';
        apply(theme); label();
        try{ localStorage.setItem(KEY,theme); }catch(e){}
      });
      nav.appendChild(btn);
    }

    var bar=document.createElement('div'); bar.id='scrollbar'; document.body.appendChild(bar);
    var top=document.createElement('button'); top.id='totop'; top.type='button';
    top.title='Back to top'; top.textContent='↑'; document.body.appendChild(top);
    top.addEventListener('click',function(){ window.scrollTo({top:0,behavior:'smooth'}); });

    var ticking=false;
    function onScroll(){
      if(ticking) return; ticking=true;
      requestAnimationFrame(function(){
        var h=document.documentElement;
        var max=h.scrollHeight-h.clientHeight;
        bar.style.width=(max>0?(h.scrollTop/max*100):0)+'%';
        top.classList.toggle('show',h.scrollTop>800);
        ticking=false;
      });
    }
    window.addEventListener('scroll',onScroll,{passive:true});
    onScroll();
  });
})();
