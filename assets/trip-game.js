/* Japan 2026 — playful layer:
   wishlist hearts + drawer, omikuji fortune draw, city stamp passport,
   confetti, worry→brave flip cards */
(function(){
  'use strict';
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded',fn); }
  function el(t,c,h){ var e=document.createElement(t); if(c)e.className=c; if(h!=null)e.innerHTML=h; return e; }
  function store(k,v){ try{ if(v===undefined) return JSON.parse(localStorage.getItem(k)||'null'); localStorage.setItem(k,JSON.stringify(v)); }catch(e){ return null; } }
  function slug(s){ return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60); }

  /* ================= confetti ================= */
  var confettiCv=null;
  function confetti(n,origin){
    if(!confettiCv){ confettiCv=document.createElement('canvas'); confettiCv.id='confetti-canvas'; document.body.appendChild(confettiCv); }
    var cv=confettiCv, ctx=cv.getContext('2d');
    cv.width=innerWidth; cv.height=innerHeight;
    var colors=['#e0483e','#ffb7c5','#f59e0b','#34d399','#60a5fa','#a78bfa','#fff0f4'];
    var ox=origin?origin[0]:innerWidth/2, oy=origin?origin[1]:innerHeight*0.3;
    var ps=[];
    for(var i=0;i<n;i++){
      var a=Math.random()*Math.PI*2, v=4+Math.random()*7;
      ps.push({x:ox,y:oy,vx:Math.cos(a)*v,vy:Math.sin(a)*v-4,r:3+Math.random()*4,
        c:colors[i%colors.length],rot:Math.random()*6,vr:(Math.random()-.5)*.3,life:70+Math.random()*40});
    }
    var t=0;
    (function frame(){
      t++; ctx.clearRect(0,0,cv.width,cv.height);
      var alive=false;
      ps.forEach(function(p){
        if(p.life<=0) return; alive=true;
        p.x+=p.vx; p.y+=p.vy; p.vy+=.25; p.vx*=.99; p.rot+=p.vr; p.life--;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
        ctx.globalAlpha=Math.min(1,p.life/30);
        ctx.fillStyle=p.c; ctx.fillRect(-p.r,-p.r/2,p.r*2,p.r);
        ctx.restore();
      });
      if(alive) requestAnimationFrame(frame); else ctx.clearRect(0,0,cv.width,cv.height);
    })();
  }

  /* ================= wishlist hearts ================= */
  var WISH_KEY='jp_wish';
  var wishes=store(WISH_KEY)||{};   // {id:{t:title,sec:sectionId}}
  var fab,drawer;

  function heartTargets(){
    var out=[];
    [['food','.grid2 .card'],['tours','.grid2 .card'],['bars','.card'],['brew','.card'],['plans','.day']].forEach(function(d){
      var sec=document.getElementById(d[0]); if(!sec) return;
      [].forEach.call(sec.querySelectorAll(d[1]),function(card){
        var h=card.querySelector('h3,.t'); if(!h) return;
        var title=h.textContent.replace(/\s+/g,' ').trim(); if(!title) return;
        out.push({card:card,title:title,sec:d[0],id:d[0]+':'+slug(title)});
      });
    });
    return out;
  }
  function buildHearts(){
    heartTargets().forEach(function(t){
      if(t.card.querySelector('.heartbtn')) return;
      t.card.classList.add('has-heart');
      if(!t.card.id) t.card.id='w-'+slug(t.id);
      var b=el('button','heartbtn'+(wishes[t.id]?' on':''),wishes[t.id]?'♥':'♡');
      b.type='button'; b.title='Save to wishlist'; b.setAttribute('aria-label','Save to wishlist');
      b.addEventListener('click',function(ev){
        ev.stopPropagation();
        if(wishes[t.id]){ delete wishes[t.id]; b.classList.remove('on'); b.textContent='♡'; }
        else{
          wishes[t.id]={t:t.title,sec:t.sec,el:undefined,anchor:t.card.id};
          delete wishes[t.id].el;
          b.classList.add('on'); b.textContent='♥';
          b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
          var r=b.getBoundingClientRect();
          confetti(18,[r.left+r.width/2,r.top+r.height/2]);
        }
        store(WISH_KEY,wishes); renderDrawer();
      });
      t.card.appendChild(b);
    });
    buildFab();
  }
  function buildFab(){
    if(fab) return;
    fab=el('button','wishfab'); fab.type='button';
    fab.innerHTML='♥ Wishlist <span class="wf-n">0</span>';
    drawer=el('div','wishdrawer');
    document.body.appendChild(drawer); document.body.appendChild(fab);
    fab.addEventListener('click',function(){ drawer.classList.toggle('open'); });
    document.addEventListener('click',function(e){
      if(drawer.classList.contains('open') && !drawer.contains(e.target) && e.target!==fab && !fab.contains(e.target))
        drawer.classList.remove('open');
    });
    renderDrawer();
  }
  var SECLBL={food:'Food',tours:'Tours',bars:'Bars',brew:'Breweries',plans:'Day plan'};
  function renderDrawer(){
    var ids=Object.keys(wishes);
    fab.querySelector('.wf-n').textContent=ids.length;
    drawer.innerHTML='<h3>♥ Our wishlist</h3>';
    if(!ids.length){ drawer.appendChild(el('div','wd-empty','Tap the ♡ on anything that looks fun — food, bars, tours, day plans. It all collects here.')); return; }
    ids.forEach(function(id){
      var w=wishes[id];
      var row=el('div','wishrow');
      row.innerHTML='<span>♥</span><a href="#'+(w.anchor||w.sec)+'">'+w.t+'<br><span class="wr-sec">'+(SECLBL[w.sec]||w.sec)+'</span></a><button type="button" title="Remove">✕</button>';
      row.querySelector('a').addEventListener('click',function(){ drawer.classList.remove('open'); });
      row.querySelector('button').addEventListener('click',function(){ delete wishes[id]; store(WISH_KEY,wishes); renderDrawer();
        var btn=document.querySelector('#'+(w.anchor||'')+' .heartbtn'); if(btn){ btn.classList.remove('on'); btn.textContent='♡'; } });
      drawer.appendChild(row);
    });
  }

  /* ================= omikuji ================= */
  var RANKS=[
    {r:'大吉',e:'Daikichi · GREAT blessing',m:'The travel gods are fully on your side today. Say yes to everything.',w:1},
    {r:'吉',e:'Kichi · Blessing',m:'A solid, lucky day. Trains will be on time and the food will be excellent.',w:3},
    {r:'中吉',e:'Chūkichi · Middle blessing',m:'Good fortune hides in side streets today. Take the detour.',w:3},
    {r:'小吉',e:'Shōkichi · Small blessing',m:'Small joys: a perfect onigiri, a vending-machine surprise, a quiet shrine.',w:2},
    {r:'末吉',e:'Suekichi · Future blessing',m:'Luck arrives later — book that thing you keep postponing.',w:1}
  ];
  function pickRank(){
    var tot=RANKS.reduce(function(s,r){return s+r.w;},0), x=Math.random()*tot;
    for(var i=0;i<RANKS.length;i++){ x-=RANKS[i].w; if(x<=0) return RANKS[i]; }
    return RANKS[1];
  }
  function darePool(){
    var pool=[];
    var md=document.getElementById('mustdo');
    if(md) [].forEach.call(md.querySelectorAll('.hubrow .label'),function(n){ pool.push(n.textContent.trim()); });
    heartTargets().forEach(function(t){ pool.push(t.title); });
    return pool.filter(function(s){return s && s.length<70;});
  }
  function buildOmikuji(){
    var md=document.getElementById('mustdo'); if(!md) return;
    var lead=md.querySelector('.lead'); if(!lead) return;
    var box=el('div','omikuji');
    box.innerHTML='<h3>⛩️ Omikuji — draw your trip fortune</h3>'+
      '<div class="om-sub">Shake the box like at a real shrine. Your fortune comes with a dare from this very page.</div>'+
      '<button type="button" class="om-draw">🥢 Draw a fortune</button>'+
      '<div class="om-result"><div class="om-rank"></div><div class="om-msg"></div><div class="om-dare"></div></div>';
    lead.parentNode.insertBefore(box,lead.nextSibling);
    var btn=box.querySelector('.om-draw'), res=box.querySelector('.om-result');
    btn.addEventListener('click',function(){
      if(btn.classList.contains('shaking')) return;
      btn.classList.add('shaking'); res.classList.remove('show');
      setTimeout(function(){
        btn.classList.remove('shaking');
        var rank=pickRank(), pool=darePool();
        var dare=pool.length?pool[Math.floor(Math.random()*pool.length)]:'Find the nearest konbini and try one mystery snack.';
        box.querySelector('.om-rank').innerHTML=rank.r+'<small>'+rank.e+'</small>';
        box.querySelector('.om-msg').textContent=rank.m;
        box.querySelector('.om-dare').innerHTML='Your dare: <b>'+dare+'</b>';
        res.classList.add('show');
        if(rank.r==='大吉'){ var r=btn.getBoundingClientRect(); confetti(90,[r.left+r.width/2,r.top]); }
        btn.textContent='🥢 Draw again';
      },650);
    });
  }

  /* ================= stamp passport ================= */
  var CITY_STAMPS=[
    {n:'Kanazawa',e:'🏯',c:'#a78bfa'},{n:'Nagano',e:'🐒',c:'#34d399'},{n:'Tokyo',e:'🗼',c:'#f472b6'},
    {n:'Osaka',e:'🐙',c:'#fb923c'},{n:'Kyoto',e:'⛩️',c:'#60a5fa'}
  ];
  function buildPassport(){
    var md=document.getElementById('mustdo'); if(!md) return;
    var hub=md.querySelector('.hub'); if(!hub) return;
    var pp=el('div','passport');
    pp.innerHTML='<div class="pp-label">🛂 Stamp passport — tick every must-do in a city to earn its stamp</div>';
    var stamps={};
    CITY_STAMPS.forEach(function(c){
      var s=el('div','stamp'); s.style.setProperty('--c',c.c);
      s.innerHTML='<span class="st-ico">'+c.e+'</span><span>'+c.n+'</span>';
      pp.appendChild(s); stamps[c.n]=s;
    });
    hub.parentNode.insertBefore(pp,hub);
    function cardCity(card){
      var h=(card.querySelector('h3')||{}).textContent||'';
      for(var i=0;i<CITY_STAMPS.length;i++) if(h.indexOf(CITY_STAMPS[i].n)>-1) return CITY_STAMPS[i].n;
      return null;
    }
    function refresh(burst){
      [].forEach.call(hub.querySelectorAll('.hubcard'),function(card){
        var city=cardCity(card); if(!city||!stamps[city]) return;
        var boxes=card.querySelectorAll('.mchk'); if(!boxes.length) return;
        var done=0; [].forEach.call(boxes,function(b){ if(b.classList.contains('done')) done++; });
        var got=done===boxes.length;
        var had=stamps[city].classList.contains('got');
        stamps[city].classList.toggle('got',got);
        if(got&&!had&&burst){ var r=stamps[city].getBoundingClientRect(); confetti(70,[r.left+r.width/2,r.top+r.height/2]); }
      });
    }
    refresh(false);
    document.addEventListener('click',function(e){
      if(e.target&&e.target.classList&&e.target.classList.contains('mchk')) setTimeout(function(){refresh(true);},0);
    });
  }

  /* ================= worry → brave flip cards ================= */
  var BRAVE_KEY='jp_brave';
  function buildBrave(){
    var sec=document.getElementById('brave'); if(!sec) return;
    var got=store(BRAVE_KEY)||[];
    var cards=sec.querySelectorAll('.flipcard');
    var fill=sec.querySelector('.bb-fill'), label=sec.querySelector('.bb-label');
    function meter(){
      var n=sec.querySelectorAll('.flipcard.conquered').length, tot=cards.length;
      if(fill) fill.style.width=(tot?Math.round(n/tot*100):0)+'%';
      if(label) label.textContent=n+' / '+tot+' conquered';
      if(n===tot&&tot>0) confetti(120);
    }
    [].forEach.call(cards,function(card,i){
      if(got.indexOf(i)>-1) card.classList.add('conquered');
      card.addEventListener('click',function(e){
        if(e.target.classList.contains('fc-got')) return;
        card.classList.toggle('flipped');
      });
      var btn=card.querySelector('.fc-got');
      if(btn){
        if(got.indexOf(i)>-1){ btn.classList.add('on'); btn.textContent='💪 Got this!'; }
        btn.addEventListener('click',function(){
          var on=card.classList.toggle('conquered');
          btn.classList.toggle('on',on);
          btn.textContent=on?'💪 Got this!':'I’ve got this';
          got=[]; [].forEach.call(cards,function(c,j){ if(c.classList.contains('conquered')) got.push(j); });
          store(BRAVE_KEY,got);
          if(on){ var r=btn.getBoundingClientRect(); confetti(35,[r.left+r.width/2,r.top]); }
          meter();
        });
      }
    });
    meter();
  }

  ready(function(){
    setTimeout(function(){
      try{ buildHearts(); }catch(e){ console.warn('hearts',e); }
      try{ buildOmikuji(); }catch(e){ console.warn('omikuji',e); }
      try{ buildPassport(); }catch(e){ console.warn('passport',e); }
      try{ buildBrave(); }catch(e){ console.warn('brave',e); }
    },0);
  });
})();
