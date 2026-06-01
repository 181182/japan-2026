/* Japan 2026 — interactive data widgets
   - Day-by-day filterable timeline (parsed from existing DOM)
   - Live budget estimator
   - JR pass cost comparison
   - Checklist progress meters
*/
(function(){
  'use strict';
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded',fn); }

  var CITY={
    Kanazawa:{key:'kanazawa',c:'#a78bfa'},
    Nagano:{key:'nagano',c:'#34d399'},
    Tokyo:{key:'tokyo',c:'#f472b6'},
    Osaka:{key:'osaka',c:'#fb923c'},
    Kyoto:{key:'kyoto',c:'#60a5fa'}
  };
  var WK=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  /* ---------- currency ---------- */
  var RATE=17.2; // ¥17.2 ≈ 1 kr
  function yen(n){ return '¥'+Math.round(n).toLocaleString('en-US'); }
  function nok(n){ var k=Math.round(n/RATE/10)*10; return '≈'+k.toLocaleString('en-US')+' kr'; }
  function money(n,cur){ return cur==='nok'?nok(n):yen(n); }

  /* ========================================================
     1. DAY-BY-DAY TIMELINE
     ======================================================== */
  function buildTimeline(){
    var sec=document.getElementById('days'); if(!sec) return;
    // parse existing structure: <h3>City…</h3><div class="daygrid">…</div>
    var days=[], curCity=null;
    [].forEach.call(sec.children,function(node){
      if(node.tagName==='H3'){
        var t=node.textContent;
        curCity=null;
        Object.keys(CITY).forEach(function(name){ if(t.indexOf(name)>-1 && !curCity) curCity=name; });
      } else if(node.classList && node.classList.contains('daygrid')){
        [].forEach.call(node.querySelectorAll('.day'),function(d){
          var dlab=(d.querySelector('.d')||{}).textContent||'';
          var num=parseInt((dlab.match(/(\d+)/)||[])[1],10);
          var title=(d.querySelector('.t')||{}).textContent||'';
          var items=[].map.call(d.querySelectorAll('li'),function(li){return li.innerHTML;});
          var tags=[].map.call(d.querySelectorAll('.tag'),function(t){return t.textContent;});
          if(num) days.push({n:num,city:curCity,title:title,items:items,tags:tags});
        });
      }
    });
    if(!days.length) return;
    days.sort(function(a,b){return a.n-b.n;});

    // remove old markup (keep h2 + lead)
    [].slice.call(sec.querySelectorAll('h3, .daygrid, .legend')).forEach(function(el){el.remove();});

    // build filter chips
    var chips=document.createElement('div'); chips.className='chips'; chips.setAttribute('role','tablist');
    var order=['All'].concat(Object.keys(CITY));
    order.forEach(function(name){
      var b=document.createElement('button'); b.className='chip'; b.type='button';
      b.setAttribute('aria-pressed', name==='All'?'true':'false');
      b.dataset.city=name;
      if(name!=='All'){ var dot=document.createElement('span'); dot.className='cdot'; dot.style.background=CITY[name].c; b.appendChild(dot); }
      b.appendChild(document.createTextNode(name));
      chips.appendChild(b);
    });
    sec.appendChild(chips);

    // build timeline
    var tl=document.createElement('div'); tl.className='timeline';
    days.forEach(function(d,i){
      var ci=CITY[d.city]||{c:'#9aa3b0'};
      var parents=d.n>=7 && d.n<=16;
      var wd=WK[new Date(2026,6,d.n).getDay()];
      var row=document.createElement('div'); row.className='tl-day'+(i===0?' open':''); row.dataset.city=d.city; row.style.setProperty('--c',ci.c);
      var when=document.createElement('div'); when.className='tl-when';
      when.innerHTML='<div class="dnum">JUL '+d.n+'</div><div class="dwk">'+wd+'</div>';
      var body=document.createElement('div'); body.className='tl-body'; body.tabIndex=0; body.setAttribute('role','button');
      var head=document.createElement('div'); head.className='tl-head';
      head.innerHTML='<span class="tl-city">'+(d.city||'')+'</span><span class="tl-title">'+d.title+'</span>'+
        (parents?'<span class="tl-parents">with parents</span>':'')+'<span class="tl-chev">›</span>';
      var det=document.createElement('div'); det.className='tl-detail';
      var ul=document.createElement('ul'); d.items.forEach(function(it){ var li=document.createElement('li'); li.innerHTML=it; ul.appendChild(li); });
      det.appendChild(ul);
      if(d.tags.length){ var tg=document.createElement('div'); tg.className='tl-tags'; d.tags.forEach(function(t){ var s=document.createElement('span'); s.className='tag'; s.textContent=t; tg.appendChild(s); }); det.appendChild(tg); }
      body.appendChild(head); body.appendChild(det);
      function toggle(){ row.classList.toggle('open'); }
      body.addEventListener('click',toggle);
      body.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggle(); } });
      row.appendChild(when); row.appendChild(body); tl.appendChild(row);
    });
    sec.appendChild(tl);

    // filter behaviour
    chips.addEventListener('click',function(e){
      var btn=e.target.closest('.chip'); if(!btn) return;
      [].forEach.call(chips.children,function(c){c.setAttribute('aria-pressed','false');});
      btn.setAttribute('aria-pressed','true');
      var city=btn.dataset.city, first=null;
      [].forEach.call(tl.children,function(row){
        var show = city==='All' || row.dataset.city===city;
        row.classList.toggle('is-hidden',!show);
        if(show && !first){ first=row; }
        row.classList.remove('open');
      });
      if(first) first.classList.add('open');
    });
  }

  /* ========================================================
     2. BUDGET ESTIMATOR
     ======================================================== */
  function buildEstimator(){
    var mount=document.getElementById('budget'); if(!mount) return;
    var CATS=[
      {name:'Food & drink',        c:'#34d399', v:{budget:3000,comfortable:5500,splurge:9000}},
      {name:'Local transport',     c:'#60a5fa', v:{budget:800, comfortable:1200,splurge:1800}},
      {name:'Sights & entries',    c:'#fbbf24', v:{budget:1000,comfortable:2500,splurge:4500}},
      {name:'Lodging',             c:'#a78bfa', v:{budget:7000,comfortable:9000,splurge:16000}}
    ];
    var state={level:'comfortable',cur:'yen',days:18};

    var el=document.createElement('div'); el.className='estimator';
    el.innerHTML=
      '<div class="est-controls">'+
        '<div class="est-ctrl"><label>Style</label><div class="seg" id="bd-level">'+
          '<button type="button" data-v="budget">Budget</button>'+
          '<button type="button" data-v="comfortable" aria-pressed="true">Comfortable</button>'+
          '<button type="button" data-v="splurge">Splurge</button></div></div>'+
        '<div class="est-ctrl"><label>Currency</label><div class="seg" id="bd-cur">'+
          '<button type="button" data-v="yen" aria-pressed="true">¥ JPY</button>'+
          '<button type="button" data-v="nok">kr NOK</button></div></div>'+
        '<div class="est-ctrl"><label>Days on the ground</label><div class="est-days">'+
          '<input type="range" id="bd-days" min="1" max="18" value="18"><span class="dval" id="bd-dval">18</span></div></div>'+
      '</div>'+
      '<div class="est-bars" id="bd-bars"></div>'+
      '<div class="est-total"><span class="tlabel">Trip total · per person · on the ground</span><span class="tval" id="bd-total"></span></div>'+
      '<p class="est-foot">Lodging is already booked (mid-range). Excludes long-distance rail (≈'+yen(62000)+' / '+nok(62000)+') and your flights. Rates locked to 31 May 2026: ¥1,000 ≈ 58 kr.</p>';
    mount.replaceWith(el);

    var bars=el.querySelector('#bd-bars');
    CATS.forEach(function(cat,i){
      var row=document.createElement('div'); row.className='est-row';
      row.innerHTML='<span class="ename">'+cat.name+'</span><div class="est-track"><div class="est-fill" id="bf'+i+'" style="background:'+cat.c+'"></div></div><span class="est-amt" id="ba'+i+'"></span>';
      bars.appendChild(row);
    });

    function render(){
      var max=Math.max.apply(null,CATS.map(function(c){return c.v[state.level];}));
      var dayTotal=0;
      CATS.forEach(function(cat,i){
        var per=cat.v[state.level]; dayTotal+=per;
        el.querySelector('#bf'+i).style.width=(per/max*100)+'%';
        el.querySelector('#ba'+i).textContent=money(per,state.cur)+'/day';
      });
      el.querySelector('#bd-total').textContent=money(dayTotal*state.days,state.cur);
    }
    function segWire(id,key){
      el.querySelector(id).addEventListener('click',function(e){
        var b=e.target.closest('button'); if(!b) return;
        [].forEach.call(this.children,function(x){x.setAttribute('aria-pressed','false');});
        b.setAttribute('aria-pressed','true'); state[key]=b.dataset.v; render();
      });
    }
    segWire('#bd-level','level'); segWire('#bd-cur','cur');
    var days=el.querySelector('#bd-days'), dval=el.querySelector('#bd-dval');
    days.addEventListener('input',function(){ state.days=+days.value; dval.textContent=days.value; render(); });
    requestAnimationFrame(render);
  }

  /* ========================================================
     3. JR PASS COST COMPARISON
     ======================================================== */
  function buildCompare(){
    var mount=document.getElementById('pass-compare'); if(!mount) return;
    var OPTS=[
      {name:'Recommended mix',tag:'individual + Kansai-Hiroshima pass',yen:62000,c:'#34d399',best:true,
       note:'3 Hokuriku legs (individual) + Tokyo→Osaka Hikari + 5-day Kansai-Hiroshima Area Pass + Kyoto→KIX Haruka. Best value for your route.'},
      {name:'All tickets à la carte',tag:'no passes',yen:64700,c:'#60a5fa',
       note:'Buying every single leg individually with no pass at all — still beats the nationwide pass for an 18-day, one-direction trip.'},
      {name:'Nationwide JR Pass',tag:'21-day · avoid',yen:100000,c:'#f87171',
       note:'Built for criss-crossing the whole country in one week. For your spread-out, mostly one-way route it never pays off.'}
    ];
    var max=Math.max.apply(null,OPTS.map(function(o){return o.yen;}));
    var save=max-OPTS[0].yen;

    var el=document.createElement('div'); el.className='compare';
    var head=document.createElement('div');
    head.innerHTML='<div class="cmp-head"><span class="cmp-name">Cost per person · tap a bar for detail</span>'+
      '<span class="cmp-val" style="color:#34d399">saves '+yen(save)+'<span class="kr">'+nok(save)+'</span></span></div>';
    el.appendChild(head);
    mount.replaceWith(el);
    OPTS.forEach(function(o,i){
      var row=document.createElement('div'); row.className='cmp-row'+(o.best?' open':'');
      row.innerHTML=
        '<div class="cmp-head"><span class="cmp-name">'+o.name+'<span class="tagi">'+o.tag+'</span><span class="chev">›</span></span>'+
        '<span class="cmp-val">'+yen(o.yen)+'<span class="kr">'+nok(o.yen)+'</span></span></div>'+
        '<div class="cmp-track"><div class="cmp-fill" id="cf'+i+'" style="background:'+o.c+'"></div></div>'+
        '<div class="cmp-note">'+o.note+'</div>';
      row.addEventListener('click',function(){ row.classList.toggle('open'); });
      el.appendChild(row);
      requestAnimationFrame(function(){ el.querySelector('#cf'+i).style.width=(o.yen/max*100)+'%'; });
    });
  }

  /* ========================================================
     4. CHECKLIST PROGRESS METERS
     ======================================================== */
  var meters=[];
  function buildProgress(){
    var targets=[
      {id:'mustdo',sel:'.mchk'},
      {id:'hub',sel:'.chk'},
      {id:'konbini',sel:'.chk'},
      {id:'packing',sel:'.chk'}
    ];
    targets.forEach(function(t){
      var sec=document.getElementById(t.id); if(!sec) return;
      var boxes=sec.querySelectorAll(t.sel); if(!boxes.length) return;
      var lead=sec.querySelector('.lead');
      var p=document.createElement('div'); p.className='progress';
      p.innerHTML='<span>Checked</span><span class="pbar"><span class="pfill"></span></span><span class="pcount"></span>';
      if(lead && lead.nextSibling) sec.insertBefore(p,lead.nextSibling); else sec.appendChild(p);
      meters.push({boxes:boxes,fill:p.querySelector('.pfill'),count:p.querySelector('.pcount')});
    });
    update();
    document.addEventListener('click',function(e){
      if(e.target && e.target.matches && e.target.matches('.chk,.mchk')) update();
    });
  }
  function update(){
    meters.forEach(function(m){
      var done=0; [].forEach.call(m.boxes,function(b){ if(b.classList.contains('done')) done++; });
      var tot=m.boxes.length, pct=tot?Math.round(done/tot*100):0;
      m.fill.style.width=pct+'%';
      m.count.textContent=done+' / '+tot+' done';
    });
  }

  ready(function(){
    try{ buildTimeline(); }catch(e){ console.warn('timeline',e); }
    try{ buildEstimator(); }catch(e){ console.warn('estimator',e); }
    try{ buildCompare(); }catch(e){ console.warn('compare',e); }
    try{ buildProgress(); }catch(e){ console.warn('progress',e); }
  });
})();
