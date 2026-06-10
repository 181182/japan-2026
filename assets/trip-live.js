/* Japan 2026 — live trip tracker:
   "where are we today" banner, route line + pulsing here-marker on the trip map,
   day scrubber to time-travel through the itinerary, find-me geolocation */
(function(){
  'use strict';
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded',fn); }
  function el(t,c,h){ var e=document.createElement(t); if(c)e.className=c; if(h!=null)e.innerHTML=h; return e; }

  var TRIP_START=Date.UTC(2026,6,2);   // Jul 2 — land KIX
  var TRIP_END=Date.UTC(2026,6,21);    // Jul 21 — land home
  var DAY=86400000;

  var PLACES={
    KIX:{n:'Kansai Airport',ll:[34.4342,135.2440],c:'#9aa3b0',e:'🛬'},
    Kanazawa:{n:'Kanazawa',ll:[36.5780,136.6480],c:'#a78bfa',e:'🏯'},
    Nagano:{n:'Nagano',ll:[36.6485,138.1880],c:'#34d399',e:'🐒'},
    Tokyo:{n:'Tokyo (Ueno)',ll:[35.7138,139.7770],c:'#f472b6',e:'🗼'},
    Osaka:{n:'Osaka',ll:[34.6740,135.5010],c:'#fb923c',e:'🐙'},
    Kyoto:{n:'Kyoto',ll:[34.9858,135.7588],c:'#60a5fa',e:'⛩️'},
    Hiroshima:{n:'Hiroshima + Miyajima',ll:[34.3955,132.4536],c:'#f87171',e:'🕊️'},
    Nara:{n:'Nara',ll:[34.6851,135.8048],c:'#f87171',e:'🦌'}
  };
  // base city per calendar date (Jul); day trips override
  function placeFor(jul){
    if(jul===14) return {p:PLACES.Hiroshima,base:PLACES.Osaka,trip:true};
    if(jul===16) return {p:PLACES.Nara,base:PLACES.Osaka,trip:true};
    var p= jul<2?PLACES.KIX
         : jul<4?PLACES.Kanazawa
         : jul<7?PLACES.Nagano
         : jul<12?PLACES.Tokyo
         : jul<17?PLACES.Osaka
         : jul<20?PLACES.Kyoto
         : PLACES.KIX;
    return {p:p,base:p,trip:false};
  }
  var ROUTE=['KIX','Kanazawa','Nagano','Tokyo','Osaka','Kyoto','KIX'];
  // route index reached by a given date (for progress line)
  function routeIdx(jul){
    if(jul<2) return 0;
    if(jul<4) return 1;
    if(jul<7) return 2;
    if(jul<12) return 3;
    if(jul<17) return 4;
    if(jul<20) return 5;
    return 6;
  }

  function todayJul(){
    var now=new Date();
    var utc=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
    if(utc<TRIP_START) return null;                       // pre-trip
    if(utc>TRIP_END) return 99;                           // post-trip
    return 2+Math.round((utc-TRIP_START)/DAY);            // 2..21
  }
  function dayNo(jul){ return jul-1; }                    // Jul 2 = day 1
  var WK=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  function fmtDate(jul){ var d=new Date(Date.UTC(2026,6,jul)); return WK[d.getUTCDay()]+' · Jul '+jul; }

  // day titles scraped from the timeline (built by trip-interactive.js)
  function dayTitles(){
    var map={};
    try{
      [].forEach.call(document.querySelectorAll('#days .tl-day'),function(row){
        var m=(row.textContent||'').match(/JUL\s*(\d+)/i); if(!m) return;
        var t=row.querySelector('.tl-title,.tl-t,.t,h4');
        if(t) map[+m[1]]=t.textContent.trim();
      });
    }catch(e){}
    return map;
  }

  /* ---------- 1. today banner in hero ---------- */
  function buildToday(){
    var hero=document.querySelector('.hero'); if(!hero) return;
    var dates=hero.querySelector('.dates')||hero.querySelector('h1'); if(!dates) return;
    var jul=todayJul();
    var bar=el('div','todaybar');
    if(jul===null){
      var days=Math.ceil((TRIP_START-Date.now())/DAY);
      bar.innerHTML='<span class="tb-dot" style="background:#f59e0b"></span>'+
        '<span class="tb-day">T−'+days+'</span>'+
        '<span class="tb-loc">days until <b>wheels-down at KIX</b> — scroll on, start dreaming 🌸</span>'+
        '<a href="#map">Preview the route →</a>';
    } else if(jul===99){
      bar.innerHTML='<span class="tb-dot" style="background:#34d399"></span>'+
        '<span class="tb-day">ただいま!</span>'+
        '<span class="tb-loc"><b>Trip complete.</b> 19 days, 5 cities, all the noodles. Time to plan the next one?</span>';
    } else {
      var info=placeFor(jul), titles=dayTitles(), t=titles[jul];
      bar.innerHTML='<span class="tb-dot" style="background:'+info.p.c+'"></span>'+
        '<span class="tb-day">Day '+dayNo(jul)+'<small style="font-size:12px;color:var(--muted)"> / 19</small></span>'+
        '<span class="tb-loc">'+info.p.e+' Today: <b>'+info.p.n+'</b>'+
          (info.trip?' <span style="color:var(--faint)">(day trip from '+info.base.n+')</span>':'')+
          (t?' — '+t:'')+'</span>'+
        '<a href="#map">See it on the map →</a>';
    }
    dates.parentNode.insertBefore(bar,dates.nextSibling);
  }

  /* ---------- 2. live map: route, here-marker, scrubber ---------- */
  function buildLiveMap(){
    var map=window.__tripmap;
    if(!map||typeof L==='undefined') return;

    var doneLine=L.polyline([],{color:'#e0483e',weight:4,opacity:.9}).addTo(map);
    var restLine=L.polyline([],{color:'#9aa3b0',weight:3,opacity:.55,dashArray:'7,8'}).addTo(map);
    var spurLine=L.polyline([],{color:'#f87171',weight:3,opacity:.8,dashArray:'3,6'}).addTo(map);
    var hereIcon=L.divIcon({className:'here-pin',iconSize:[34,34],html:'<div class="hp-ring"></div><div class="hp-core"></div>'});
    var hereMk=L.marker(PLACES.KIX.ll,{icon:hereIcon,zIndexOffset:900}).addTo(map);

    var titles=null;
    function render(jul){
      titles=titles||dayTitles();
      var info=placeFor(jul);
      var ri=routeIdx(jul);
      var pts=ROUTE.map(function(k){return PLACES[k].ll;});
      doneLine.setLatLngs(pts.slice(0,ri+1));
      restLine.setLatLngs(pts.slice(ri));
      spurLine.setLatLngs(info.trip?[info.base.ll,info.p.ll]:[]);
      hereMk.setLatLng(info.p.ll);
      var d=dayNo(jul);
      hereMk.bindPopup('<b>'+info.p.e+' '+info.p.n+'</b><br>'+fmtDate(jul)+' · day '+Math.min(Math.max(d,1),19)+' of 19'+
        (titles[jul]?'<br><i>'+titles[jul]+'</i>':''));
      return info;
    }

    // scrubber UI
    var mapEl=document.getElementById('tripmap');
    var sc=el('div','scrub');
    sc.innerHTML=
      '<div class="sc-head">'+
        '<span class="sc-date" id="sc-date"></span>'+
        '<span class="sc-where" id="sc-where"></span>'+
        '<button type="button" class="sc-btn" id="sc-today">⦿ Today</button>'+
        '<button type="button" class="sc-btn" id="sc-me">📍 Find me</button>'+
      '</div>'+
      '<input type="range" min="2" max="21" step="1" value="2" id="sc-range" aria-label="Trip day">'+
      '<div class="sc-ticks"><span>KIX</span><span>Kanazawa</span><span>Nagano</span><span>Tokyo</span><span>Osaka</span><span>Kyoto</span><span>Home</span></div>';
    mapEl.parentNode.insertBefore(sc,mapEl.nextSibling);

    var range=sc.querySelector('#sc-range'),
        dEl=sc.querySelector('#sc-date'),
        wEl=sc.querySelector('#sc-where'),
        tBtn=sc.querySelector('#sc-today');

    function update(jul,pan){
      var info=render(jul);
      titles=titles||dayTitles();
      dEl.textContent=fmtDate(jul);
      var d=dayNo(jul);
      wEl.innerHTML=(d>=1&&d<=19?'Day '+d+' · ':'')+info.p.e+' <b>'+info.p.n+'</b>'+
        (info.trip?' <span style="color:var(--faint)">— day trip from '+info.base.n+'</span>':'')+
        (titles[jul]?' — '+titles[jul]:'');
      var live=todayJul();
      tBtn.classList.toggle('live',live!==null&&live!==99&&+range.value===live);
      if(pan) map.panTo(placeFor(jul).p.ll,{animate:true});
    }
    range.addEventListener('input',function(){ update(+range.value,false); });
    range.addEventListener('change',function(){ update(+range.value,true); });
    tBtn.addEventListener('click',function(){
      var live=todayJul();
      var v=(live===null)?2:(live===99?21:live);
      range.value=v; update(v,true);
    });

    // geolocation
    var meMk=null;
    sc.querySelector('#sc-me').addEventListener('click',function(){
      if(!navigator.geolocation){ alert('Geolocation not available on this device.'); return; }
      navigator.geolocation.getCurrentPosition(function(pos){
        var ll=[pos.coords.latitude,pos.coords.longitude];
        var icon=L.divIcon({className:'here-pin me-pin',iconSize:[34,34],html:'<div class="hp-ring"></div><div class="hp-core"></div>'});
        if(meMk) meMk.setLatLng(ll); else meMk=L.marker(ll,{icon:icon,zIndexOffset:950}).addTo(map);
        meMk.bindPopup('<b>📍 You are here</b>').openPopup();
        map.setView(ll,12,{animate:true});
      },function(){ alert('Could not get your position — check location permissions.'); },{enableHighAccuracy:true,timeout:10000});
    });

    // initial state: today if travelling, else day 1
    var live=todayJul();
    var v=(live===null)?2:(live===99?21:live);
    range.value=v; update(v,false);
  }

  ready(function(){
    // wait a tick so trip-interactive's timeline + the inline map exist
    setTimeout(function(){
      try{ buildToday(); }catch(e){ console.warn('todaybar',e); }
      try{ buildLiveMap(); }catch(e){ console.warn('livemap',e); }
    },0);
  });
})();
