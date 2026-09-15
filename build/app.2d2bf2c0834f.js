/* DVP V3 — native vertical scrolling drives a two-axis editorial camera.
   No wheel/touch interception, no required horizontal gesture, no dependencies. */
window.mountDvpMobile = function mountDvpMobile() {
  'use strict';
  const body = document.body;
  const journey = document.getElementById('journey');
  const viewport = document.getElementById('viewport');
  const atlas = document.getElementById('atlas');
  const scenes = [...document.querySelectorAll('.scene')];
  const traveler = document.getElementById('traveler');
  const progressLinks = [...document.querySelectorAll('#progress-nav a')];
  const motionButton = document.getElementById('motion-toggle');
  const motionLabel = document.getElementById('motion-label');
  const numberLabel = document.getElementById('current-number');
  const sceneLabel = document.getElementById('current-label');
  const transitionLine = document.getElementById('transition-line');
  const indexDialog = document.getElementById('story-index');
  const infoDialog = document.getElementById('site-info');
  const indexButton = document.getElementById('open-index');
  let reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const STORAGE_KEY = 'dvp-v7-motion';
  const positions = [[0,0],[0,1],[1,1],[1,2],[2,2],[2,1],[3,1],[3,2]];
  const holds = [.18,.52,.60,.55,.48,.67,.50,0];
  const travels = [.95,.92,.96,.94,.97,.96,1.02,0];
  // Poses are keyed by scene, so changing editorial order never changes a destination.
  const desktopGlobeById={inicio:[.923,.34,98,0],management:[.88,.28,93,1],wealth:[.28,.55,145,0],publicity:[.87,.72,108,0],analytics:[.37,.66,83,1],wellness:[.236,.50,113,1],mundo:[.417,.73,115,1],contacto:[.87,.32,120,0]};
  const globeDesktop=scenes.map(s=>desktopGlobeById[s.id]);
  const globeTablet=globeDesktop.map(p=>[p[0],p[1],p[2]*.73,p[3]]);
  const primaryLogoHome = document.querySelector('[data-primary-logo-home]');
  let cinematic = false;
  let userCalm = false;
  let frameW = 0;
  let frameH = 0;
  let targetY = 0;
  let currentY = 0;
  let total = 0;
  let activeIndex = -1;
  let segments = [];
  let stops = [];
  let raf = 0;
  let resizeTimer = 0, mediaRaf = 0;
  let layoutObserver=null,refitFrame=0;
  let ignoreScroll = false;
  let started = false;
  const listeners=[];
  const listen=(el,name,fn,options)=>{el.addEventListener(name,fn,options);listeners.push(()=>el.removeEventListener(name,fn,options));};
  const visibility=()=>{body.classList.toggle('page-hidden',document.hidden);if(!document.hidden){onScroll();requestFrame();}syncDvd();};


  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const lerp = (a,b,t) => a+(b-a)*t;
  const ease = t => t*t*(3-2*t);
  const safeStore = v => {try {localStorage.setItem(STORAGE_KEY,v);} catch (_) { /* Private mode remains usable. */ }};
  try {userCalm = localStorage.getItem(STORAGE_KEY) === 'calm';} catch (_) {}

  const brandLayer=document.getElementById('brand-traveler');
  const brandFrom=document.getElementById('brand-from');
  const brandTo=document.getElementById('brand-to');
  const dvd=document.getElementById('dvd-ambient');
  let brandAnchors=[],globeAnchors=[],brandPair='',lastBrandPose=null;
  let dvdWidth=0,dvdHeight=0;
  let dvdRaf=0,dvdLast=0,dvdX=20,dvdY=150,dvdVX=23,dvdVY=16,dvdHits=0;

  function localBox(el,scene) {
    let x=0,y=0,n=el;
    while(n && n!==scene){x+=n.offsetLeft;y+=n.offsetTop;n=n.offsetParent;}
    const padding=parseFloat(getComputedStyle(el).paddingLeft)||0;
    return {x:x+padding,y:y+padding,w:el.clientWidth-padding*2,h:el.clientHeight-padding*2};
  }
  function cacheAnchors(){
    dvdWidth=dvd.offsetWidth;dvdHeight=dvd.offsetHeight;
    brandAnchors=scenes.map(scene=>{
      const mobile=scene.querySelector('.mobile-layout');
      const layout=mobile && getComputedStyle(mobile).display!=='none'?mobile:(scene.querySelector('.desktop-layout') || scene.querySelector('.hero-unified'));
      if(scene.id==='inicio'){
        const b=primaryLogoHome.getBoundingClientRect();
        return {x:b.left,y:b.top,w:b.width,h:b.height,src:primaryLogoHome.querySelector('img').getAttribute('src'),branch:'management'};
      }
      const slot=layout.querySelector('.branch-logo-slot');
      if(!slot)return {x:frameW*.06,y:110,w:180,h:56,src:'assets/management-black-hd.webp'};
      const box=localBox(slot,scene);
      return {...box,src:slot.querySelector('img').getAttribute('src'),branch:slot.dataset.branch};
    });
    globeAnchors=frameW<=760 ? scenes.map(scene=>{
      const slot=scene.querySelector('.m-globe-slot');
      const b=localBox(slot,scene);
      return [(b.x+b.w/2)/frameW,(b.y+b.h/2)/frameH,b.w,Number(slot.dataset.light)];
    }) : frameW<=900 ? globeTablet : globeDesktop;
  }
  function renderBrand(p){
    const a=brandAnchors[p.from],b=brandAnchors[p.to];
    if(!a||!b)return;
    const key=a.src+'|'+b.src;
    if(key!==brandPair){brandFrom.src=a.src;brandTo.src=b.src;brandPair=key;}
    // The very same element travels between anchors. Real supplied lockups crossfade
    // during the middle of the flight; they are not replaced with typed approximations.
    const mix=a.src===b.src?0:ease(clamp((p.t-.24)/.52,0,1));
    const x=lerp(a.x,b.x,p.t)+p.wave*frameW*(frameW<=760?.055:.025);
    const y=lerp(a.y,b.y,p.t)-p.wave*(frameW<=760?12:22);
    const w=lerp(a.w,b.w,p.t), h=lerp(a.h,b.h,p.t);
    brandLayer.style.width=w.toFixed(2)+'px';brandLayer.style.height=h.toFixed(2)+'px';
    brandLayer.style.transform=`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
    const secondary=p.from===0?(p.to===0?1:1-ease(clamp(p.local/.5,0,1))):0;
    body.style.setProperty('--secondary-logo-opacity',String(secondary));
    brandFrom.style.opacity=String(1-mix);brandTo.style.opacity=String(mix);
    lastBrandPose={from:a.branch,to:b.branch,progress:p.t,x,y,width:w};
  }
  function dvdFrame(now){
    dvdRaf=0;
    // Honor a preference change on the next animation frame even when an
    // embedded browser does not dispatch MediaQueryList.change reliably.
    if(reduceMotion.matches && cinematic){setMode(true);return;}
    if(document.hidden||userCalm||reduceMotion.matches||body.classList.contains('service-reading'))return;
    const dt=dvdLast?Math.min((now-dvdLast)/1000,.055):0;dvdLast=now;
    const minX=16,maxX=Math.max(minX,frameW-dvdWidth-16);
    const minY=(frameW<=760?78:100),maxY=Math.max(minY,frameH-dvdHeight-78);
    dvdX+=dvdVX*dt;dvdY+=dvdVY*dt;
    if(dvdX<minX){dvdX=minX;dvdVX=Math.abs(dvdVX);dvdHits++;}
    if(dvdX>maxX){dvdX=maxX;dvdVX=-Math.abs(dvdVX);dvdHits++;}
    if(dvdY<minY){dvdY=minY;dvdVY=Math.abs(dvdVY);dvdHits++;}
    if(dvdY>maxY){dvdY=maxY;dvdVY=-Math.abs(dvdVY);dvdHits++;}
    dvd.style.transform=`translate3d(${dvdX.toFixed(2)}px,${dvdY.toFixed(2)}px,0)`;
    dvdRaf=requestAnimationFrame(dvdFrame);
  }
  function syncDvd(){
    if(dvdRaf)cancelAnimationFrame(dvdRaf);dvdRaf=0;dvdLast=0;
    if(!document.hidden&&!userCalm&&!reduceMotion.matches)dvdRaf=requestAnimationFrame(dvdFrame);
  }

  function measureViewport() {
    const probe = document.createElement('div');
    probe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;height:100svh;top:0;width:1px';
    body.appendChild(probe);
    const h = probe.getBoundingClientRect().height || window.innerHeight;
    probe.remove();
    return [document.documentElement.clientWidth,h];
  }

  function fitHeadlines() {
    // The measurement is independent of glyph width, browser zoom and the camera transform.
    // All headings have constrained containers in CSS even before React initializes.
    document.querySelectorAll('[data-fit]').forEach(line => {
      if(!line.getClientRects().length)return;
      const parent=line.parentElement;
      const style=getComputedStyle(parent);
      const available=Math.max(1,Math.min(frameW-40,parent.clientWidth)-
        (parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0)-3);
      const natural=line.scrollWidth || line.offsetWidth;
      if(natural>0){line.style.setProperty('--fit',String(Math.min(1,available/natural)));}
    });
  }

  function buildTimeline() {
    let t = 0;
    segments = []; stops = [];
    scenes.forEach((scene,i) => {
      stops.push(t + (i === 0 ? 0 : holds[i]*.35));
      segments.push({kind:'hold',start:t,end:t+holds[i],from:i,to:i});
      t += holds[i];
      if (i < scenes.length-1) {
        segments.push({kind:'travel',start:t,end:t+travels[i],from:i,to:i+1});
        t += travels[i];
      }
      scene.style.setProperty('--scene-x',`${positions[i][0]*frameW}px`);
      scene.style.setProperty('--scene-y',`${positions[i][1]*frameH}px`);
    });
    total=t;
    journey.style.setProperty('--journey-height',`${Math.ceil((total+1)*frameH)}px`);
    journey.style.setProperty('--frame-w',`${frameW}px`);
    journey.style.setProperty('--frame-h',`${frameH}px`);
  }

  function activate(index) {
    if (activeIndex === index) return;
    activeIndex = index;
    // Decode the next composition before it enters the touch viewport.
    [index,Math.min(index+1,scenes.length-1)].forEach(i=>{
      scenes[i].querySelectorAll('img[loading="lazy"]').forEach(img=>{img.loading='eager';if(img.decode)img.decode().catch(()=>{});});
    });
    const scene = scenes[index];
    body.classList.toggle('ui-dark',scene.dataset.color === 'dark');
    numberLabel.textContent = String(index+1).padStart(2,'0');
    sceneLabel.textContent = scene.dataset.label;
    const next=document.getElementById('next-scene'); if(next){next.setAttribute('aria-label',index<scenes.length-1?'Ir a la siguiente sección':'Volver al inicio');next.innerHTML=index<scenes.length-1?'↓':'↑';}
    document.documentElement.style.setProperty('--chapter-progress',String((index+1)/scenes.length));
    scenes.forEach((item,i) => {
      item.classList.toggle('is-active',i===index);
      // Off-screen controls cannot steal focus. Calm view exposes the entire document.
      item.inert = cinematic && i!==index;
    });
    progressLinks.forEach((link,i) => {
      if (i===index) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
      link.classList.toggle('is-past',i<index);
    });
  }

  function poseAt(scrollY) {
    const p = clamp(scrollY/frameH,0,total);
    const seg = segments.find(s => p >= s.start && p < s.end) || segments[segments.length-1];
    const local = seg.end>seg.start ? clamp((p-seg.start)/(seg.end-seg.start),0,1) : 1;
    const t = seg.kind==='travel' ? ease(local) : 0;
    const a=positions[seg.from], b=positions[seg.to];
    const wave=seg.kind==='travel' ? Math.sin(local*Math.PI) : 0;
    return {
      from:seg.from,to:seg.to,t,local,wave,
      x:lerp(a[0],b[0],t),y:lerp(a[1],b[1],t),
      scale:1-wave*wave*.034,
      index:seg.kind==='travel'&&t>.5 ? seg.to : seg.from,
      direction:Math.atan2((b[1]-a[1])*frameH,(b[0]-a[0])*frameW)
    };
  }

  function render() {
    if (!cinematic) return;
    const p=poseAt(currentY);
    const cx=(p.x+.5)*frameW,cy=(p.y+.5)*frameH;
    const tx=frameW*.5-cx*p.scale,ty=frameH*.5-cy*p.scale;
    atlas.style.transform=`translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) scale(${p.scale.toFixed(5)})`;
    scenes.forEach((scene,i) => {
      const visible = Math.abs(positions[i][0]-p.x)<1.08 && Math.abs(positions[i][1]-p.y)<1.08;
      scene.classList.toggle('is-near',visible);
      if (visible) scene.style.setProperty('--parallax',String(clamp((currentY/frameH-stops[i])*.8,-1,1)));
    });
    activate(p.index);
    renderBrand(p);
    const a=globeAnchors[0];
    if(a){
      const x=a[0]*frameW,y=a[1]*frameH,size=a[2];
      traveler.style.transform=`translate3d(${(x-90).toFixed(2)}px,${(y-93).toFixed(2)}px,0) scale(${(size/180).toFixed(4)})`;
      traveler.classList.toggle('is-light',Boolean(a[3]));
    }
    transitionLine.style.opacity=(p.wave*.50).toFixed(3);
    transitionLine.style.transform=`rotate(${p.direction}rad) scaleX(${1+p.wave*2})`;
  }

  function frame() {
    raf=0;
    if (!cinematic || document.hidden) return;
    const difference=targetY-currentY;
    currentY = Math.abs(difference)<.4 ? targetY : currentY+difference*(frameW<=760 ? 1 : .26);
    render();
    if (Math.abs(targetY-currentY)>.4) raf=requestAnimationFrame(frame);
  }
  function requestFrame() {
    if (!raf && cinematic && !document.hidden) raf=requestAnimationFrame(frame);
  }
  function syncCalmPosition() {
    const eye=window.innerHeight*.4;
    let index=0;
    scenes.forEach((scene,i) => {if(scene.getBoundingClientRect().top <= eye) index=i;});
    activate(index);
  }
  function onScroll() {
    if (ignoreScroll) return;
    if(cinematic){targetY=clamp(window.scrollY-journey.offsetTop,0,total*frameH);requestFrame();}
    else syncCalmPosition();
  }

  function setMode(preserve=true) {
    const previousIndex=Math.max(0,activeIndex);
    const [w,h]=measureViewport();
    frameW=w;frameH=h;
    cinematic=!userCalm && !reduceMotion.matches && w>=320 && h>=620;
    body.classList.toggle('cinematic',cinematic);
    body.classList.toggle('calm',!cinematic);
    const paused = userCalm || reduceMotion.matches;
    body.classList.toggle('motion-paused', paused);
    motionButton.setAttribute('aria-pressed',String(paused));
    motionButton.title=paused?'Activar las animaciones':'Pausar las animaciones';
    motionButton.setAttribute('aria-label',motionButton.title);
    motionLabel.textContent=paused?'Activar':'Pausar';
    motionButton.disabled=reduceMotion.matches;
    if (reduceMotion.matches) {
      motionLabel.textContent='Reducido';
      motionButton.title='Tu dispositivo solicita reducir el movimiento';
    }
    if(cinematic){
      buildTimeline();
      cacheAnchors();
      body.classList.add('brand-travel-ready');
      currentY=preserve ? stops[previousIndex]*h : 0;
      targetY=currentY;
      ignoreScroll=true;
      window.scrollTo(0,journey.offsetTop+currentY);
      activeIndex=-1;
      render();
      requestAnimationFrame(()=>{ignoreScroll=false;});
    }else{
      body.classList.remove('brand-travel-ready');
      body.style.setProperty('--secondary-logo-opacity','0');
      if(raf)cancelAnimationFrame(raf);raf=0;
      atlas.style.removeProperty('transform');
      journey.style.removeProperty('--journey-height');
      scenes.forEach(scene=>{scene.inert=false;scene.classList.add('is-near');scene.style.removeProperty('--parallax');});
      activeIndex=-1;activate(previousIndex);
      if(preserve)requestAnimationFrame(()=>window.scrollTo(0,scenes[previousIndex].offsetTop+journey.offsetTop));
    }
    fitHeadlines();
    cacheAnchors();
    syncDvd();
    scenes.forEach(scene=>{const h=scene.querySelector('#hero-title') || scene.querySelector((frameW<=760?'.mobile-layout':'.desktop-layout')+' h1, '+(frameW<=760?'.mobile-layout':'.desktop-layout')+' h2');if(h)scene.setAttribute('aria-labelledby',h.id);});
    if(cinematic)render();
  }

  function closeDialogs() {
    if(indexDialog.open)indexDialog.close();
    if(infoDialog.open)infoDialog.close();
    document.querySelectorAll('.service-dialog[open]').forEach(d=>d.close());
  }
  function goTo(id,{focus=false,hash=true}={}) {
    const clean=String(id).replace(/^#/,'');
    const index=scenes.findIndex(s=>s.id===clean);
    if(index<0)return;
    closeDialogs();
    if(cinematic){
      currentY=targetY=stops[index]*frameH;
      ignoreScroll=true;
      render();
      window.scrollTo(0,journey.offsetTop+targetY);
      requestAnimationFrame(()=>{ignoreScroll=false;});
    }else{
      scenes[index].scrollIntoView({block:'start',behavior:'auto'});
      activate(index);
    }
    if(hash){try{history.pushState(null,'',`#${clean}`);}catch(_) {}}
    if(focus)requestAnimationFrame(()=>scenes[index].focus({preventScroll:true}));
  }

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{
      const [w,h]=measureViewport();
      // svh keeps iOS toolbar appearance from continuously rebuilding the route.
      if(Math.abs(w-frameW)>2 || Math.abs(h-frameH)>4)setMode(true);
      else fitHeadlines();
    },160);
  }

  function init() {
    body.classList.add('js-ready');dvdX=window.innerWidth*.75;dvdY=window.innerHeight*.73;
    // A direct ?view=calm preview works without changing the stored preference.
    if(new URLSearchParams(location.search).get('view')==='calm')userCalm=true;
    setMode(false);
    listen(window,'scroll',onScroll,{passive:true});
    listen(window,'resize',onResize,{passive:true});
    if(window.visualViewport)listen(window.visualViewport,'resize',onResize,{passive:true});
    if(window.ResizeObserver){
      layoutObserver=new ResizeObserver(()=>{
        if(refitFrame)cancelAnimationFrame(refitFrame);
        refitFrame=requestAnimationFrame(()=>{refitFrame=0;fitHeadlines();cacheAnchors();if(cinematic)render();});
      });
      document.querySelectorAll('.scene h1,.scene h2,.branch-logo-slot,.site-header .brand').forEach(el=>layoutObserver.observe(el));
    }
    listen(document,'visibilitychange',visibility);
    document.querySelectorAll('[data-scene-link]').forEach(link=>link.addEventListener('click',event=>{
      if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      event.preventDefault();goTo(link.getAttribute('href'),{focus:true});
    }));
    document.getElementById('read-story').addEventListener('click',event=>{
      event.preventDefault();userCalm=true;safeStore('calm');setMode(true);
      requestAnimationFrame(()=>scenes[Math.max(0,activeIndex)].focus({preventScroll:true}));
    });
    motionButton.addEventListener('click',()=>{
      userCalm=!userCalm;safeStore(userCalm?'calm':'auto');setMode(true);
    });
    indexButton.addEventListener('click',()=>{
      if(typeof indexDialog.showModal==='function'){
        indexDialog.showModal();indexButton.setAttribute('aria-expanded','true');
      }
    });
    document.querySelectorAll('#open-info, [data-open-info]').forEach(button=>button.addEventListener('click',()=>{
      if(typeof infoDialog.showModal==='function')infoDialog.showModal();
    }));
    document.getElementById('next-scene').addEventListener('click',()=>goTo(scenes[(Math.max(0,activeIndex)+1)%scenes.length].id));
    document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
    indexDialog.addEventListener('close',()=>indexButton.setAttribute('aria-expanded','false'));
    [indexDialog,infoDialog].forEach(dialog=>dialog.addEventListener('click',event=>{
      if(event.target===dialog){
        const rect=dialog.getBoundingClientRect();
        if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();
      }
    }));

    document.querySelectorAll('[data-service-open]').forEach(button=>{
      listen(button,'click',event=>{
        if(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return;
        const dialog=document.getElementById('service-'+button.dataset.serviceOpen);
        if(!dialog || typeof dialog.showModal!=='function')return;
        event.preventDefault();
        closeDialogs();
        dialog.showModal();dialog.scrollTop=0;
        body.classList.add('service-reading');syncDvd();
        button.setAttribute('aria-expanded','true');
      });
    });
    document.querySelectorAll('.service-dialog').forEach(dialog=>{
      listen(dialog,'close',()=>{
        body.classList.remove('service-reading');syncDvd();
        document.querySelectorAll('[data-service-open]').forEach(b=>b.setAttribute('aria-expanded','false'));
      });
      listen(dialog,'click',event=>{
        if(event.target!==dialog)return;
        const rect=dialog.getBoundingClientRect();
        if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();
      });
      dialog.querySelectorAll('[data-service-close]').forEach(b=>listen(b,'click',()=>dialog.close()));
    });

    // Subscribe after the document's first frame: a media object created while
    // an embedded preview is still parsing may not dispatch later changes.
    mediaRaf=requestAnimationFrame(()=>{
      mediaRaf=0;
      const initial=reduceMotion.matches;
      reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
      if(reduceMotion.addEventListener)listen(reduceMotion,'change',()=>setMode(true));
      else {const change=()=>setMode(true);reduceMotion.addListener(change);listeners.push(()=>reduceMotion.removeListener(change));}
      if(reduceMotion.matches!==initial)setMode(true);
    });
    listen(window,'hashchange',()=>goTo(location.hash,{hash:false}));
    listen(window,'popstate',()=>goTo(location.hash||'inicio',{hash:false}));
    if(document.fonts && document.fonts.ready)document.fonts.ready.then(()=>{fitHeadlines();cacheAnchors();if(cinematic)render();});
    if(document.fonts && document.fonts.addEventListener)listen(document.fonts,'loadingdone',()=>{fitHeadlines();cacheAnchors();if(cinematic)render();});
    if(location.hash)requestAnimationFrame(()=>goTo(location.hash,{hash:false}));
    started=true;
    // Small documented API for maintenance / visual review. No private data.
    window.dvpExperience=Object.freeze({
      goTo:id=>goTo(id,{hash:false}),
      refresh:()=>setMode(true),
      status:()=>({mode:cinematic?'cinematic':'calm',motion:!userCalm && !reduceMotion.matches,scene:scenes[Math.max(activeIndex,0)].id,frame:[frameW,frameH],checkpoints:stops.map((t,i)=>({id:scenes[i].id,y:t*frameH})),scrollLength:total*frameH,brand:lastBrandPose,dvd:{x:dvdX,y:dvdY,reflections:dvdHits}})
    });
  }
  try{init();}catch(error){
    // A failed enhancement must never result in a blank website.
    body.classList.remove('cinematic','js-ready','brand-travel-ready');body.classList.add('calm');
    atlas.style.removeProperty('transform');journey.style.removeProperty('--journey-height');
    scenes.forEach(scene=>{scene.inert=false;scene.classList.add('is-near');});
    console.error('DVP: la vista con movimiento no pudo iniciarse; se mantiene la vista de lectura.',error);
  }
  return () => {
    listeners.forEach(remove=>remove());
    if(raf) cancelAnimationFrame(raf);
    clearTimeout(resizeTimer);
    if(dvdRaf)cancelAnimationFrame(dvdRaf);
    if(mediaRaf)cancelAnimationFrame(mediaRaf);
    if(layoutObserver)layoutObserver.disconnect();if(refitFrame)cancelAnimationFrame(refitFrame);
    delete window.dvpExperience;
    body.classList.remove('cinematic','js-ready','calm','motion-paused','page-hidden','ui-dark','brand-travel-ready');
  };
};

/* V10: the page is fully rendered by the build. React manages only progressive
   motion enhancement; it never clears or duplicates the readable HTML tree. */
(()=>{
 'use strict';
 function DvpMotion(){
   React.useLayoutEffect(()=>{
     const clean=window.mountDvpMobile();
     return ()=>{if(typeof clean==='function')clean();};
   },[]);
   return null;
 }
 const mount=document.getElementById('dvp-enhancements');
 if(mount && window.React && window.ReactDOM){
   ReactDOM.createRoot(mount).render(React.createElement(DvpMotion));
 }
})();
