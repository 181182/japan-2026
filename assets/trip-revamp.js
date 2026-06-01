/* Japan 2026 — full interactive revamp of the remaining sections.
   Reads existing DOM content (no hard-coded copy) and upgrades:
   filters (city / drink), live index search, connectivity decision,
   journey-time bars, baggage route, emergency call tiles, hide-done. */
(function(){
  'use strict';
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded',fn); }
  function el(tag,cls,html){ var e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }

  var CITYCAT=[
    {key:'kanazawa',label:'Kanazawa',color:'#a78bfa'},
    {key:'nagano',  label:'Nagano',  color:'#34d399'},
    {key:'tokyo',   label:'Tokyo',   color:'#f472b6'},
    {key:'osaka',   label:'Osaka',   color:'#fb923c'},
    {key:'kyoto',   label:'Kyoto',   color:'#60a5fa'},
    {key:'daytrips',label:'Day trips',color:'#f87171'}
  ];
  var ALIAS={tokyo:['shinjuku','ginza','asakusa','shibuya','harajuku','ueno','toyosu','tsukiji','ryogoku','nakameguro','ebisu'],
             osaka:['namba','dotonbori','umeda','kitashinchi','shinsaibashi'],
             kyoto:['pontocho','arashiyama','fushimi','gion','kiyamachi'],
             daytrips:['hiroshima','nara','miyajima','saijo','nada','kobe']};

  function cityOf(node){
    var style=node.getAttribute&&node.getAttribute('style')||'';
    var m=style.match(/var\(--(kanazawa|nagano|tokyo|osaka|kyoto)\)/);
    if(m) return m[1];
    if(/#f87171/.test(style)) return 'daytrips';
    var h=node.querySelector?node.querySelector('h3'):null;
    var t=((h?h.textContent:node.textContent)||'').toLowerCase();
    var canon={kanazawa:'kanazawa',nagano:'nagano',tokyo:'tokyo',osaka:'osaka',kyoto:'kyoto'};
    for(var k in canon){ if(t.indexOf(k)>-1) return k; }
    for(var c in ALIAS){ for(var i=0;i<ALIAS[c].length;i++){ if(t.indexOf(ALIAS[c][i])>-1) return c; } }
    return null;
  }

  /* generic chip bar */
  function mountChips(o){
    var bar=el('div','chips'); bar.setAttribute('role','tablist');
    var present={}; o.items.forEach(function(it){ if(it.key) present[it.key]=true; });
    var cats=[{key:'all',label:o.allLabel||'All'}].concat(o.cats.filter(function(c){return present[c.key];}));
    if(cats.length<=2) return null; // nothing to filter
    cats.forEach(function(c){
      var b=el('button','chip'); b.type='button'; b.dataset.key=c.key;
      b.setAttribute('aria-pressed', c.key==='all'?'true':'false');
      if(c.color){ var d=el('span','cdot'); d.style.background=c.color; b.appendChild(d); }
      b.appendChild(document.createTextNode(c.label)); bar.appendChild(b);
    });
    bar.addEventListener('click',function(e){
      var b=e.target.closest('.chip'); if(!b) return;
      [].forEach.call(bar.children,function(x){x.setAttribute('aria-pressed','false');});
      b.setAttribute('aria-pressed','true');
      var key=b.dataset.key;
      if(!o.manual){ o.items.forEach(function(it){ it.el.classList.toggle('is-hidden', !(key==='all'||it.key===key)); }); }
      if(o.onChange) o.onChange(key);
    });
    o.insert(bar);
    return bar;
  }

  /* simple section filter by city for a flat set of cards */
  function cityFilter(secId,cardSel,cats){
    var sec=document.getElementById(secId); if(!sec) return;
    var cards=[].slice.call(sec.querySelectorAll(cardSel)); if(!cards.length) return;
    var items=cards.map(function(c){return {el:c,key:cityOf(c)};});
    var anchor=cards[0].parentNode; // insert chips before the grid containing first card
    mountChips({items:items,cats:cats||CITYCAT,insert:function(bar){ anchor.parentNode.insertBefore(bar,anchor); }});
  }

  ready(function(){
    /* ---- city filters on clean card grids ---- */
    cityFilter('food','.grid2 .card');
    cityFilter('tours','.grid2 .card');
    cityFilter('transit','.grid2 .card');
    try{ // must-do: hubcards
      var md=document.getElementById('mustdo'); var hub=md&&md.querySelector('.hub');
      if(hub){ var cards=[].slice.call(hub.querySelectorAll('.hubcard')).map(function(c){return {el:c,key:cityOf(c)};});
        mountChips({items:cards,cats:CITYCAT,insert:function(bar){ hub.parentNode.insertBefore(bar,hub); }}); }
    }catch(e){}
    try{ // bars: all place cards across both grids
      var bs=document.getElementById('bars');
      var cards=[].slice.call(bs.querySelectorAll('.card')).map(function(c){return {el:c,key:cityOf(c)};});
      var win=bs.querySelector('.win');
      mountChips({items:cards,cats:CITYCAT,insert:function(bar){ win.parentNode.insertBefore(bar,win.nextSibling); }});
    }catch(e){}

    /* ---- breweries: drink-type filter ---- */
    try{
      var brew=document.getElementById('brew');
      var dcats=[{key:'sake',label:'Sake',color:'#34d399'},{key:'whisky',label:'Whisky',color:'#fbbf24'},{key:'beer',label:'Beer',color:'#60a5fa'},{key:'gin',label:'Gin',color:'#a78bfa'}];
      function drinkOf(c){ var t=c.textContent.toLowerCase();
        if(t.indexOf('gin')>-1||t.indexOf('ki no bi')>-1) return 'gin';
        if(t.indexOf('whisk')>-1||t.indexOf('malt')>-1) return 'whisky';
        if(t.indexOf('beer')>-1||t.indexOf('asahi')>-1||t.indexOf('super dry')>-1) return 'beer';
        if(t.indexOf('sake')>-1) return 'sake'; return null; }
      var bcards=[].slice.call(brew.querySelectorAll('.card')).map(function(c){return {el:c,key:drinkOf(c)};});
      var firstCard=brew.querySelector('.card');
      mountChips({items:bcards,cats:dcats,insert:function(bar){ firstCard.parentNode.insertBefore(bar,firstCard); }});
    }catch(e){}

    /* ---- day plans: filter .day cards, hide empty groups ---- */
    try{
      var plans=document.getElementById('plans');
      var dayCards=[].slice.call(plans.querySelectorAll('.day')).map(function(d){return {el:d,key:cityOf(d)};});
      var lead=plans.querySelector('.lead');
      function cleanGroups(){
        [].forEach.call(plans.querySelectorAll('.daygrid'),function(g){
          var any=[].some.call(g.querySelectorAll('.day'),function(d){return !d.classList.contains('is-hidden');});
          g.classList.toggle('is-hidden',!any);
          var h=g.previousElementSibling; while(h&&h.tagName!=='H3'){h=h.previousElementSibling;}
          if(h){ // a single h3 may precede multiple grids; show if any of its grids visible
            // determine grids until next h3
            var vis=false, n=h.nextElementSibling;
            while(n&&n.tagName!=='H3'){ if(n.classList.contains('daygrid')&&!n.classList.contains('is-hidden')) vis=true; n=n.nextElementSibling; }
            h.classList.toggle('is-hidden',!vis);
          }
        });
      }
      mountChips({items:dayCards,cats:CITYCAT,insert:function(bar){ lead.parentNode.insertBefore(bar,lead.nextSibling); },onChange:cleanGroups});
    }catch(e){}

    /* ---- INDEX: search + city filter ---- */
    try{ buildIndex(); }catch(e){ console.warn('index',e); }
    /* ---- connectivity decision ---- */
    try{ buildConnect(); }catch(e){ console.warn('connect',e); }
    /* ---- frequency journey bars ---- */
    try{ buildFrequency(); }catch(e){ console.warn('freq',e); }
    /* ---- baggage route ---- */
    try{ buildBaggage(); }catch(e){ console.warn('baggage',e); }
    /* ---- emergency call tiles ---- */
    try{ buildEmergency(); }catch(e){ console.warn('emergency',e); }
    /* ---- hide-done toggles ---- */
    try{ hideDone(); }catch(e){ console.warn('hidedone',e); }
  });

  function buildIndex(){
    var idx=document.getElementById('index'); if(!idx) return;
    var hubEl=idx.querySelector('.hub'); if(!hubEl) return;
    var cards=[].slice.call(idx.querySelectorAll('.idxcard'));
    cards.forEach(function(c){ c.dataset.city=cityOf(c)||''; });
    var state={q:'',city:'all'};

    var search=el('div','searchbar',
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>'+
      '<input type="search" placeholder="Search all places & links\u2026" aria-label="Search places">'+
      '<button class="clr" type="button">clear</button>');
    hubEl.parentNode.insertBefore(search,hubEl);
    var input=search.querySelector('input'), clr=search.querySelector('.clr');

    var chips=el('div','chips');
    [{key:'all',label:'All'}].concat(CITYCAT).filter(function(c){ return c.key==='all'||cards.some(function(card){return card.dataset.city===c.key;}); })
      .forEach(function(c){
        var b=el('button','chip'); b.type='button'; b.dataset.key=c.key; b.setAttribute('aria-pressed',c.key==='all'?'true':'false');
        if(c.color){ var d=el('span','cdot'); d.style.background=c.color; b.appendChild(d); }
        b.appendChild(document.createTextNode(c.label)); chips.appendChild(b);
      });
    hubEl.parentNode.insertBefore(chips,hubEl);

    var empty=el('div','idx-empty','No places match — try another search.'); empty.style.display='none';
    hubEl.parentNode.insertBefore(empty,hubEl.nextSibling);

    function apply(){
      var q=state.q.toLowerCase(), shownCards=0;
      cards.forEach(function(card){
        var cityOk = state.city==='all' || card.dataset.city===state.city;
        var anyLink=false;
        [].forEach.call(card.querySelectorAll('.linkbtn'),function(a){
          var hit = !q || a.textContent.toLowerCase().indexOf(q)>-1;
          a.classList.toggle('is-hidden',!hit); if(hit) anyLink=true;
        });
        var show = cityOk && anyLink;
        card.classList.toggle('is-hidden',!show); if(show) shownCards++;
      });
      empty.style.display=shownCards?'none':'block';
      clr.style.display=q?'inline':'none';
    }
    input.addEventListener('input',function(){ state.q=input.value; apply(); });
    clr.addEventListener('click',function(){ input.value=''; state.q=''; apply(); input.focus(); });
    chips.addEventListener('click',function(e){ var b=e.target.closest('.chip'); if(!b) return;
      [].forEach.call(chips.children,function(x){x.setAttribute('aria-pressed','false');}); b.setAttribute('aria-pressed','true');
      state.city=b.dataset.key; apply(); });
  }

  function buildConnect(){
    var sec=document.getElementById('connect'); if(!sec) return;
    var grid=sec.querySelector('.grid2'); if(!grid) return;
    var cards=[].slice.call(grid.querySelectorAll('.card'));
    var esim=cards.filter(function(c){return /esim/i.test(c.textContent);})[0];
    var wifi=cards.filter(function(c){return /pocket wifi/i.test(c.textContent);})[0];
    if(!esim||!wifi) return;
    [esim,wifi].forEach(function(c){ var h=c.querySelector('h3'); if(h&&!h.querySelector('.rec-flag')) h.insertAdjacentHTML('beforeend',' <span class="rec-flag">recommended</span>'); });
    var q=el('div','decide-q','<span>Which is right for you?</span>'+
      '<div class="seg" id="cn-seg"><button type="button" data-v="esim" aria-pressed="true">Just our phones</button><button type="button" data-v="wifi">Shared / many devices</button></div>');
    grid.parentNode.insertBefore(q,grid);
    function set(v){ esim.classList.toggle('recommended',v==='esim'); wifi.classList.toggle('recommended',v==='wifi'); }
    q.querySelector('#cn-seg').addEventListener('click',function(e){ var b=e.target.closest('button'); if(!b) return;
      [].forEach.call(this.children,function(x){x.setAttribute('aria-pressed','false');}); b.setAttribute('aria-pressed','true'); set(b.dataset.v); });
    set('esim');
  }

  function parseMin(s){ var h=s.match(/(\d+)\s*h\s*(\d+)?/); if(h) return (+h[1])*60+(h[2]?+h[2]:0); var m=s.match(/(\d+)\s*m/); return m?+m[1]:30; }
  function buildFrequency(){
    var sec=document.getElementById('frequency'); if(!sec) return;
    var table=sec.querySelector('table'); if(!table) return;
    var rows=[].slice.call(table.querySelectorAll('tr')).slice(1).map(function(tr){
      var td=tr.querySelectorAll('td'); return {leg:td[0].textContent,train:td[1].textContent,time:td[2].textContent,freq:td[3].textContent}; });
    var max=Math.max.apply(null,rows.map(function(r){return parseMin(r.time);}));
    var wrap=el('div','legbars');
    rows.forEach(function(r){
      var row=el('div','legrow');
      row.innerHTML='<div class="lhead"><span class="lname">'+r.leg+'</span><span class="ltime">'+r.time.replace(/^~/,'~ ')+'</span></div>'+
        '<div class="ltrack"><div class="lfill"></div></div>'+
        '<div class="lmeta"><span class="lchip">🚆 '+r.train+'</span><span class="lchip">⏱ '+r.freq+'</span></div>';
      row.addEventListener('click',function(){ row.classList.toggle('open'); });
      wrap.appendChild(row);
      requestAnimationFrame(function(){ row.querySelector('.lfill').style.width=(parseMin(r.time)/max*100)+'%'; });
    });
    table.replaceWith(wrap);
  }

  function buildBaggage(){
    var sec=document.getElementById('baggage'); if(!sec) return;
    var table=sec.querySelector('table'); if(!table) return;
    var rows=[].slice.call(table.querySelectorAll('tr')).slice(1).map(function(tr){
      var td=tr.querySelectorAll('td'); var badge=td[1].querySelector('.badge');
      return {move:td[0].innerHTML,level:(badge?badge.textContent:'').toLowerCase().trim(),note:td[2].innerHTML}; });
    var wrap=el('div','hoproute');
    rows.forEach(function(r){
      var cls={essential:'hb-essential',recommended:'hb-recommended',optional:'hb-optional',skip:'hb-skip'}[r.level]||'hb-optional';
      var send=(r.note.match(/Send\s+<strong>?[^<.]+/i)||r.note.match(/Send\s+Jul\s*\d+/i)||[])[0]||'';
      var hop=el('div','hop');
      hop.innerHTML='<div class="hop-head"><span class="hop-move">'+r.move+'</span>'+
        (send?'<span class="hop-when">'+send.replace(/<\/?strong>/g,'')+'</span>':'')+
        '<span class="hop-badge '+cls+'">'+(r.level||'')+'</span></div>'+
        '<div class="hop-note">'+r.note+'</div>';
      hop.addEventListener('click',function(){ hop.classList.toggle('open'); });
      wrap.appendChild(hop);
    });
    table.replaceWith(wrap);
  }

  function buildEmergency(){
    var sec=document.getElementById('essentials'); if(!sec) return;
    var card=[].slice.call(sec.querySelectorAll('.card')).filter(function(c){return /emergency/i.test(c.textContent);})[0];
    if(!card) return;
    var table=card.querySelector('table'); if(!table) return;
    var rows=[].slice.call(table.querySelectorAll('tr')).slice(1).map(function(tr){
      var td=tr.querySelectorAll('td'); return {label:td[0].textContent,num:td[1].textContent.trim()}; });
    var grid=el('div','calltiles');
    rows.forEach(function(r){
      var tel=r.num.replace(/[^\d+]/g,'');
      var a=el('a','calltile'); a.href='tel:'+tel;
      a.innerHTML='<span class="cn">'+r.num+'</span><span class="cl">'+r.label+'</span><span class="cgo">tap to call →</span>';
      grid.appendChild(a);
    });
    table.replaceWith(grid);
  }

  function hideDone(){
    ['mustdo','konbini','packing'].forEach(function(id){
      var sec=document.getElementById(id); if(!sec) return;
      var prog=sec.querySelector('.progress'); if(!prog) return;
      var btn=el('button','hidedone','Hide done'); btn.type='button'; btn.setAttribute('aria-pressed','false');
      btn.addEventListener('click',function(){
        var on=sec.classList.toggle('hide-done'); btn.setAttribute('aria-pressed',on?'true':'false');
      });
      prog.appendChild(btn);
    });
  }
})();
