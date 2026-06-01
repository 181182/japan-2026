/* Japan 2026 — live & playful widgets:
   countdown + dual clock, heat-of-the-day gauge, IC-card tap demo, phrase flip-cards */
(function(){
  'use strict';
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded',fn); }
  function el(t,c,h){ var e=document.createElement(t); if(c)e.className=c; if(h!=null)e.innerHTML=h; return e; }
  function pad(n){ return (n<10?'0':'')+n; }

  /* ---------- 1. countdown + dual clock ---------- */
  function buildClock(){
    var hero=document.querySelector('.hero'); if(!hero) return;
    var anchor=hero.querySelector('.journey')||hero.querySelector('.metrics'); if(!anchor) return;
    var box=el('div','tripclock');
    box.innerHTML=
      '<div class="tc-count"><span class="lab">Countdown to KIX touchdown</span>'+
        '<div class="tc-units">'+
          '<div class="tc-u"><b id="cd-d">–</b><span>days</span></div>'+
          '<div class="tc-u"><b id="cd-h">–</b><span>hrs</span></div>'+
          '<div class="tc-u"><b id="cd-m">–</b><span>min</span></div>'+
          '<div class="tc-u"><b id="cd-s">–</b><span>sec</span></div>'+
        '</div></div>'+
      '<div class="tc-clocks">'+
        '<div class="tc-clk"><span class="ct" id="ck-jp">–</span><span class="cz">🗼 Japan · JST</span></div>'+
        '<div class="tc-clk"><span class="ct" id="ck-no">–</span><span class="cz">🏠 Home · Oslo</span></div>'+
      '</div>';
    anchor.parentNode.insertBefore(box,anchor.nextSibling);
    var target=new Date('2026-07-02T12:35:00+09:00'); // landing
    function fmtTZ(tz){ try{ return new Date().toLocaleTimeString('en-GB',{timeZone:tz,hour:'2-digit',minute:'2-digit'}); }catch(e){ return '--:--'; } }
    function tick(){
      var now=new Date(), diff=Math.max(0,target-now), s=Math.floor(diff/1000);
      var d=Math.floor(s/86400), h=Math.floor(s%86400/3600), m=Math.floor(s%3600/60), sec=s%60;
      var set=function(id,v){ var n=document.getElementById(id); if(n)n.textContent=v; };
      set('cd-d',d); set('cd-h',pad(h)); set('cd-m',pad(m)); set('cd-s',pad(sec));
      set('ck-jp',fmtTZ('Asia/Tokyo')); set('ck-no',fmtTZ('Europe/Oslo'));
    }
    tick(); var iv=setInterval(tick,1000);
    document.addEventListener('visibilitychange',function(){ if(document.hidden){clearInterval(iv);} else { tick(); iv=setInterval(tick,1000);} });
  }

  /* ---------- 2. heat-of-the-day gauge ---------- */
  function buildHeat(){
    var sec=document.getElementById('essentials'); if(!sec) return;
    var warn=sec.querySelector('.warn'); if(!warn) return;
    // Kansai July hourly feels-like (°C)
    var T={6:27,7:28,8:30,9:32,10:33,11:34,12:35,13:35,14:36,15:35,16:34,17:32,18:31,19:30,20:29,21:28,22:28,23:27};
    function verdict(hr){
      if(hr<=10) return {ic:'☀️',m:'Prime time — go big outdoors',s:'Cool(ish) and bright. Hit gardens, shrines, castles and markets now.',c:'#34d399'};
      if(hr<=12) return {ic:'🌤',m:'Heating up — wrap outdoor soon',s:'Finish the big walking sights and start drifting toward shade.',c:'#fbbf24'};
      if(hr<=16) return {ic:'🥵',m:'Peak heat — seek A/C',s:'Museum, aquarium, depachika food hall or a long iced-coffee. This is the danger window.',c:'#f87171'};
      if(hr<=19) return {ic:'🌆',m:'Cooling — back outside',s:'Golden-hour views, riverside strolls, and the start of dinner crawls.',c:'#60a5fa'};
      return {ic:'🌙',m:'Night mode — neon & izakaya',s:'Dotonbori, Golden Gai, night markets and skyline bars. Comfortable at last.',c:'#a78bfa'};
    }
    var g=el('div','heatgauge');
    g.innerHTML=
      '<div class="hg-top">'+
        '<div class="hg-tube"><div class="hg-merc" id="hg-merc"></div></div>'+
        '<div class="hg-read"><div class="hg-temp"><span id="hg-t">35</span><small>°C</small></div><div class="hg-hour" id="hg-hr">12:00</div></div>'+
        '<div class="hg-verdict"><div class="vmain" id="hg-vm"></div><div class="vsub" id="hg-vs"></div></div>'+
      '</div>'+
      '<div class="hg-slider"><input type="range" min="6" max="23" value="12" id="hg-range" aria-label="Hour of day">'+
        '<div class="hg-scale"><span>6am</span><span>noon</span><span>3pm</span><span>6pm</span><span>11pm</span></div></div>';
    warn.parentNode.insertBefore(g,warn.nextSibling);
    var range=g.querySelector('#hg-range');
    function render(){
      var hr=+range.value, t=T[hr], v=verdict(hr);
      g.querySelector('#hg-t').textContent=t;
      g.querySelector('#hg-merc').style.height=Math.round((t-24)/(37-24)*100)+'%';
      g.querySelector('#hg-merc').style.background='linear-gradient(0deg,#fbbf24,'+v.c+')';
      g.querySelector('#hg-hr').textContent=pad(hr)+':00';
      g.querySelector('#hg-vm').textContent=v.ic+'  '+v.m;
      g.querySelector('#hg-vs').textContent=v.s;
    }
    range.addEventListener('input',render); render();
  }

  /* ---------- 3. IC-card tap demo ---------- */
  function buildIC(){
    var sec=document.getElementById('transit'); if(!sec) return;
    var first=sec.querySelector('.card'); if(!first) return;
    var taps=[
      {f:170,p:'Namba → Shinsaibashi'},{f:200,p:'Ueno → Shibuya'},{f:230,p:'Kyoto Stn → Gion-Shijo'},
      {f:160,p:'subway one stop'},{f:320,p:'Shin-Osaka → Namba'},{f:150,p:'konbini onigiri + tea'},
      {f:260,p:'Asakusa → Shinjuku'},{f:180,p:'bus to Kenroku-en'}
    ];
    var bal=3000, i=0;
    var d=el('div','icdemo');
    d.innerHTML=
      '<div class="iccard" id="ic-card" role="button" tabindex="0" aria-label="Tap the IC card">'+
        '<div class="icname">ICOCA</div><div class="icsub">IC · SUICA-COMPATIBLE</div>'+
        '<div class="icwave">🌊</div>'+
        '<div class="icbal">¥<span id="ic-bal">3,000</span></div>'+
        '<div class="ic-pi" id="ic-pi">ピッ!</div>'+
      '</div>'+
      '<div class="ic-info"><div class="ihint">This is how you ride: load yen once, then <strong>tap</strong> at every gate, bus, konbini and vending machine. Give it a go 👉</div>'+
        '<div class="ic-log" id="ic-log">¥3,000 loaded — tap to ride.</div>'+
        '<button class="ic-btn" id="ic-top" type="button">+ Top up ¥3,000</button></div>';
    first.parentNode.insertBefore(d,first.nextSibling);
    var card=d.querySelector('#ic-card'), pi=d.querySelector('#ic-pi'), balEl=d.querySelector('#ic-bal'), log=d.querySelector('#ic-log');
    function fmt(n){ return n.toLocaleString('en-US'); }
    function tap(){
      var t=taps[i%taps.length]; i++;
      if(bal<t.f){ log.textContent='✗ Not enough balance — top up!'; log.classList.add('warn'); card.classList.add('flash'); setTimeout(function(){card.classList.remove('flash');},500); return; }
      bal-=t.f; balEl.textContent=fmt(bal);
      pi.classList.remove('go'); void pi.offsetWidth; pi.classList.add('go');
      card.classList.add('flash'); setTimeout(function(){card.classList.remove('flash');},500);
      log.classList.remove('warn'); log.textContent='✓ Tapped · −¥'+t.f+' · '+t.p+'  →  ¥'+fmt(bal)+' left';
    }
    card.addEventListener('click',tap);
    card.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); tap(); } });
    d.querySelector('#ic-top').addEventListener('click',function(){ bal+=3000; balEl.textContent=fmt(bal); log.classList.remove('warn'); log.textContent='+¥3,000 topped up  →  ¥'+fmt(bal); });
  }

  /* ---------- 4. phrase flip-cards ---------- */
  function buildPhrases(){
    var mount=document.getElementById('phrasebook'); if(!mount) return;
    var P=[
      {e:'👋',en:'Hello',jp:'こんにちは',ro:'konnichiwa',lit:'good day'},
      {e:'🙏',en:'Thank you',jp:'ありがとうございます',ro:'arigatō gozaimasu',lit:'thank you (polite)'},
      {e:'🙇',en:'Excuse me / sorry',jp:'すみません',ro:'sumimasen',lit:'also gets attention'},
      {e:'💴',en:'How much?',jp:'いくらですか',ro:'ikura desu ka',lit:'what is the price?'},
      {e:'💳',en:'Cash only?',jp:'現金のみですか',ro:'genkin nomi desu ka',lit:'cash-only?'},
      {e:'😋',en:'Delicious!',jp:'おいしい！',ro:'oishii!',lit:'tasty'},
      {e:'🍻',en:'Cheers!',jp:'乾杯',ro:'kanpai',lit:'dry the cup'},
      {e:'🧾',en:'Check, please',jp:'お会計お願いします',ro:'okaikei onegai shimasu',lit:'the bill, please'},
      {e:'🚉',en:'Where is the station?',jp:'駅はどこですか',ro:'eki wa doko desu ka',lit:'station where is?'},
      {e:'🇬🇧',en:'English OK?',jp:'英語大丈夫ですか',ro:'eigo daijōbu desu ka',lit:'English alright?'},
      {e:'📸',en:'May I take a photo?',jp:'写真いいですか',ro:'shashin ii desu ka',lit:'photo okay?'},
      {e:'👌',en:'No problem / I’m fine',jp:'大丈夫です',ro:'daijōbu desu',lit:'it’s alright'}
    ];
    P.forEach(function(p){
      var c=el('div','phrase'); c.tabIndex=0; c.setAttribute('role','button');
      c.innerHTML='<div class="phrase-in">'+
        '<div class="phrase-f"><div class="pe">'+p.e+'</div><div class="pen">'+p.en+'</div><div class="ptap">tap to flip</div></div>'+
        '<div class="phrase-b"><div class="pjp">'+p.jp+'</div><div class="pro">'+p.ro+'</div><div class="plit">'+p.lit+'</div></div>'+
      '</div>';
      function flip(){ c.classList.toggle('flip'); }
      c.addEventListener('click',flip);
      c.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); flip(); } });
      mount.appendChild(c);
    });
  }

  ready(function(){
    try{ buildClock(); }catch(e){ console.warn('clock',e); }
    try{ buildHeat(); }catch(e){ console.warn('heat',e); }
    try{ buildIC(); }catch(e){ console.warn('ic',e); }
    try{ buildPhrases(); }catch(e){ console.warn('phrases',e); }
  });
})();
