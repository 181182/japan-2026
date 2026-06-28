/* Japan 2026 — live "Top sights" highlights from Wikivoyage (no API key).
   Enriches each #toprated city card with real attraction listings + descriptions,
   fetched client-side from the MediaWiki API (CORS via origin=*).
   The curated shortlist + TripAdvisor/Google deep-links remain the stable base;
   this only adds a collapsible live block when good data is found. */
(function(){
  'use strict';
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded',fn); }

  var API='https://en.wikivoyage.org/w/api.php';
  var MAX_PER_CITY=6;
  // names that are clearly not "top sights"
  var BLACK=/informa|rent[- ]?a[- ]?car|tourist info|\blobby\b|cycling tour|post office|\bATM\b|consulate|embassy|hospital|clinic|\bpolice\b|agency|rent-a|car rental|baggage|locker|\bwi-?fi\b|currency|exchange office|bus terminal|^from\b|station,?\s*$/i;

  function decode(s){
    var t=document.createElement('textarea'); t.innerHTML=s; return t.value;
  }
  function clean(s){
    if(!s) return '';
    s=s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi,'').replace(/<ref[^>]*\/>/gi,'');
    s=s.replace(/\{\{[^{}]*\}\}/g,'');                 // strip simple templates
    s=s.replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g,'$1');    // [[a|b]] -> b
    s=s.replace(/\[\[([^\]]*)\]\]/g,'$1');             // [[a]] -> a
    s=s.replace(/'''?/g,'').replace(/<[^>]+>/g,'');    // bold/italic, html tags
    s=s.replace(/\s+/g,' ').trim();
    return decode(s);
  }
  function field(block,key){
    var m=block.match(new RegExp('\\|\\s*'+key+'\\s*=\\s*([^|\\n}]*)'));
    return m?clean(m[1]):'';
  }
  function contentField(block){
    var m=block.match(/\|\s*content\s*=\s*([\s\S]*?)\}\}/);
    return m?clean(m[1]):'';
  }
  function truncate(s,n){
    if(s.length<=n) return s;
    var cut=s.slice(0,n); var sp=cut.lastIndexOf(' ');
    return (sp>40?cut.slice(0,sp):cut).replace(/[.,;:]$/,'')+'…';
  }

  function parseListings(wikitext){
    var out=[], re=/\{\{\s*(see|listing)\b/gi, m, starts=[];
    while((m=re.exec(wikitext))){ starts.push({i:m.index,type:m[1].toLowerCase()}); }
    starts.forEach(function(s,k){
      var end=(k+1<starts.length)?starts[k+1].i:Math.min(wikitext.length,s.i+900);
      var block=wikitext.slice(s.i, Math.min(end, s.i+900));
      var name=field(block,'name'); if(!name) return;
      // only real sights: {{see}} always; {{listing}} only when explicitly a sight type
      // (empty-type listings on big-city pages are practical info: IC cards, hotlines, etc.)
      if(s.type==='listing'){
        var ty=field(block,'type').toLowerCase();
        if(!/see|view|landmark|temple|shrine|museum|garden|castle|park|monument|gallery|sight/.test(ty)) return;
      }
      if(BLACK.test(name)) return;
      if(name.length<2||name.length>64) return;
      out.push({ name:name, url:field(block,'url'), desc:contentField(block) });
    });
    // dedupe by name
    var seen={}, uniq=[];
    out.forEach(function(o){ var k=o.name.toLowerCase(); if(!seen[k]){ seen[k]=1; uniq.push(o); } });
    return uniq;
  }

  function fetchCity(page){
    var url=API+'?action=parse&prop=wikitext&format=json&formatversion=2&redirects=1&origin=*&page='+encodeURIComponent(page);
    return fetch(url).then(function(r){ return r.ok?r.json():null; }).then(function(j){
      if(!j||!j.parse||!j.parse.wikitext) return [];
      return parseListings(j.parse.wikitext);
    }).catch(function(){ return []; });
  }

  function render(card, items){
    if(!items.length) return;
    items=items.slice(0,MAX_PER_CITY);
    var box=document.createElement('details'); box.className='wv';
    var sum=document.createElement('summary');
    sum.innerHTML='🌐 Live highlights from Wikivoyage <span class="wv-n">'+items.length+'</span>';
    box.appendChild(sum);
    var list=document.createElement('div'); list.className='wv-list';
    items.forEach(function(it){
      var row=document.createElement('div'); row.className='wv-item';
      var html='<b>'+it.name+'</b>';
      if(it.desc) html+=' <span class="wv-d">'+truncate(it.desc,150)+'</span>';
      html+='<span class="wv-links">';
      if(it.url) html+='<a href="'+it.url+'" target="_blank" rel="noopener">site ↗</a>';
      html+='<a href="https://www.google.com/maps/search/'+encodeURIComponent(it.name+' Japan')+'" target="_blank" rel="noopener">map</a>';
      html+='</span>';
      row.innerHTML=html;
      list.appendChild(row);
    });
    box.appendChild(list);
    card.appendChild(box);
  }

  ready(function(){
    var sec=document.getElementById('toprated'); if(!sec) return;
    [].forEach.call(sec.querySelectorAll('.card[data-wv]'),function(card){
      var pages=card.getAttribute('data-wv').split(',').map(function(s){return s.trim();}).filter(Boolean);
      Promise.all(pages.map(fetchCity)).then(function(lists){
        var all=[].concat.apply([],lists);
        // dedupe across merged pages
        var seen={}, merged=[];
        all.forEach(function(o){ var k=o.name.toLowerCase(); if(!seen[k]){ seen[k]=1; merged.push(o); } });
        // prefer items that have a description
        merged.sort(function(a,b){ return (b.desc?1:0)-(a.desc?1:0); });
        try{ render(card, merged); }catch(e){ /* silent */ }
      });
    });
  });
})();
