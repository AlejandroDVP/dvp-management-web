/* DVP home page script. Sections are the former separate files, in execution order.
   Edit, then run: sh tools/rehash.sh */

/* ===== Cinematic camera (was build/app.4238fef680eb.js) ===== */
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
  // The timeline is keyed by scene id (like the globe poses below), so adding,
  // removing or reordering a <section class="scene"> never desynchronises the camera.
  // pos: atlas cell [column,row]; hold: frames the camera rests on the scene;
  // travel: frames spent flying to the next scene (phones override both, see buildTimeline).
  const timelineById={
    inicio:{pos:[0,0],hold:.18,travel:.95},
    dvp:{pos:[0,1],hold:.55,travel:.92},
    representacion:{pos:[1,1],hold:.52,travel:.92},
    performance:{pos:[1,2],hold:.60,travel:.96},
    brand:{pos:[2,2],hold:.55,travel:.94},
    future:{pos:[2,1],hold:.55,travel:.96},
    prueba:{pos:[3,1],hold:.55,travel:.96},
    mundo:{pos:[3,2],hold:.50,travel:.98},
    equipo:{pos:[4,2],hold:.55,travel:1.02},
    contacto:{pos:[4,1],hold:0,travel:0}
  };
  scenes.forEach(s=>{if(!timelineById[s.id])console.error('DVP: la escena "'+s.id+'" no tiene entrada en timelineById; la cámara no la conoce.');});
  const timeline=scenes.map(s=>timelineById[s.id] || {pos:[0,0],hold:.5,travel:.95});
  const positions = timeline.map(t=>t.pos);
  const holds = timeline.map(t=>t.hold);
  const travels = timeline.map(t=>t.travel);
  // Poses are keyed by scene, so changing editorial order never changes a destination.
  const desktopGlobeById={inicio:[.923,.34,98,0],dvp:[.88,.28,93,1],representacion:[.88,.28,93,1],performance:[.37,.66,83,1],brand:[.87,.72,108,0],future:[.28,.55,145,0],prueba:[.87,.72,100,0],mundo:[.417,.73,115,1],equipo:[.236,.50,113,1],contacto:[.87,.32,120,0]};
  const globeDesktop=scenes.map(s=>desktopGlobeById[s.id]);
  const globeTablet=globeDesktop.map(p=>[p[0],p[1],p[2]*.73,p[3]]);
  const primaryLogoHome = document.querySelector('[data-primary-logo-home]');
  let cinematic = false;
  let userCalm = false;   // "Leer sin movimiento": whole page as a plain document.
  let userPaused = false; // "Pausar": decorative animations off, camera stays.
  // Phones: the camera stays, the flying vectors (bouncing wordmark, globe and
  // brand travelers, transition line) are skipped and the frame is locked to the
  // small viewport so browser toolbars never rebuild the journey mid-scroll.
  const PHONE_MAX_W = 760;
  const phone = () => frameW <= PHONE_MAX_W;
  let settleRaf = 0, scrollEndTimer = 0, touching = false, lastScrollAt = 0;
  let calmReason = ''; // Why reading mode was chosen; visible in dvpExperience.status().
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
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Older builds stored 'calm' when "Pausar" was pressed, which silently
    // removed the camera on every later visit. That value now only pauses.
    userPaused = stored === 'paused' || stored === 'calm';
    userCalm = stored === 'reader';
  } catch (_) {}

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
      if(!slot)return [.5,.5,60,Number(scene.classList.contains('dark'))]; // Scenes without a globe slot.
      const b=localBox(slot,scene);
      return [(b.x+b.w/2)/frameW,(b.y+b.h/2)/frameH,b.w,Number(slot.dataset.light)];
    }) : frameW<=900 ? globeTablet : globeDesktop;
  }
  function renderBrand(p){
    if(phone())return;
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
    if(document.hidden||userCalm||userPaused||phone()||reduceMotion.matches||body.classList.contains('service-reading'))return;
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
    if(!document.hidden&&!userCalm&&!userPaused&&!phone()&&!reduceMotion.matches)dvdRaf=requestAnimationFrame(dvdFrame);
  }

  function measureViewport() {
    const probe = document.createElement('div');
    probe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;height:100svh;top:0;width:1px';
    body.appendChild(probe);
    const smallH = probe.getBoundingClientRect().height || window.innerHeight;
    probe.style.height='100dvh';
    const h = probe.getBoundingClientRect().height || smallH;
    probe.remove();
    return [document.documentElement.clientWidth,h,smallH];
  }

  // Phones rarely have the condensed display font (the stack falls back to Arial or
  // Roboto), so a headline can need heavy compression. Past this much horizontal
  // squeeze the glyphs distort; the remainder is applied as a uniform shrink instead.
  const MAX_SQUEEZE=.88;
  function fitHeadlines() {
    // The measurement is independent of glyph width, browser zoom and the camera transform.
    // All headings have constrained containers in CSS. Reads and writes are batched so
    // the browser lays the page out once, not once per line.
    const lines=[...document.querySelectorAll('[data-fit]')];
    const ratios=lines.map(line => {
      if(!line.getClientRects().length)return null;
      const parent=line.parentElement;
      const style=getComputedStyle(parent);
      const available=Math.max(1,Math.min(frameW-40,parent.clientWidth)-
        (parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0)-3);
      const natural=line.scrollWidth || line.offsetWidth;
      return natural>0 ? Math.min(1,available/natural) : null;
    });
    lines.forEach((line,i) => {
      const ratio=ratios[i];
      if(ratio===null)return;
      if(phone() && ratio<MAX_SQUEEZE){
        line.style.setProperty('--fit',String(MAX_SQUEEZE));
        line.style.setProperty('--fit-shrink',(ratio/MAX_SQUEEZE).toFixed(4));
      }else{
        line.style.setProperty('--fit',String(ratio));
        line.style.setProperty('--fit-shrink','1');
      }
    });
  }

  // Phones: a finger expects the page to follow it. Rest zones shrink to a short
  // slack (the settle needs one) and every travel is exactly one frame of scroll,
  // so the camera tracks the thumb 1:1 instead of pausing and then rushing.
  const PHONE_HOLD_SCALE=.4, PHONE_TRAVEL=1;
  function buildTimeline() {
    let t = 0;
    segments = []; stops = [];
    scenes.forEach((scene,i) => {
      const hold=phone() ? holds[i]*PHONE_HOLD_SCALE : holds[i];
      const travel=phone() ? (travels[i] ? PHONE_TRAVEL : 0) : travels[i];
      stops.push(t + (i === 0 ? 0 : hold*.35));
      segments.push({kind:'hold',start:t,end:t+hold,from:i,to:i});
      t += hold;
      if (i < scenes.length-1) {
        segments.push({kind:'travel',start:t,end:t+travel,from:i,to:i+1});
        t += travel;
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
    // Phones keep only the current and next scene's images decoded; the rest may be evicted.
    if(phone())scenes.forEach((scene,i)=>{if(Math.abs(i-index)>1)scene.querySelectorAll('img[loading="eager"]:not([fetchpriority])').forEach(img=>{img.loading='lazy';});});
    const scene = scenes[index];
    body.classList.toggle('ui-dark',scene.dataset.color === 'dark');
    body.dataset.scene=scene.id; // Phones hide the header wordmark once a scene shows its own.
    // Colour of the strip a collapsing phone toolbar reveals under the frame.
    if(phone()){
      const bg=getComputedStyle(scene);
      viewport.style.background=bg.backgroundImage!=='none' ? bg.background : (scene.dataset.color === 'dark' ? '#0f1a14' : '#dedfcc');
    }
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
    // Desktop eases each travel (the wheel is stepped and the lerp smooths it).
    // Phones map the travel linearly: native touch scrolling already has inertia.
    const t = seg.kind==='travel' ? (phone() ? local : ease(local)) : 0;
    const a=positions[seg.from], b=positions[seg.to];
    const wave=seg.kind==='travel' ? Math.sin(local*Math.PI) : 0;
    return {
      from:seg.from,to:seg.to,t,local,wave,
      x:lerp(a[0],b[0],t),y:lerp(a[1],b[1],t),
      scale:phone() ? 1 : 1-wave*wave*.034,
      index:seg.kind==='travel'&&t>.5 ? seg.to : seg.from,
      direction:Math.atan2((b[1]-a[1])*frameH,(b[0]-a[0])*frameW)
    };
  }

  function render() {
    if (!cinematic) return;
    const p=poseAt(currentY);
    const cx=(p.x+.5)*frameW,cy=(p.y+.5)*frameH;
    const tx=frameW*.5-cx*p.scale,ty=frameH*.5-cy*p.scale;
    if(phone()){
      // Phones: the atlas is never transformed (a 4x3-frame layer is too large for a
      // phone GPU and Safari rasterises its tiles mid-scroll). Only the one or two
      // scenes that intersect the frame move, each as its own frame-sized layer.
      const move=`translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0)`;
      // Keep three layers warm: at rest the previous, current and next scene; while
      // travelling, the two in flight plus the one after. A layer that already exists
      // costs nothing when it enters the frame; one created mid-travel drops frames.
      const warm = p.from===p.to ? [p.from-1,p.from,p.from+1] : [p.from,p.to,p.to+1];
      scenes.forEach((scene,i) => {
        const inFrame = Math.abs(positions[i][0]-p.x)<1 && Math.abs(positions[i][1]-p.y)<1;
        const visible = inFrame || warm.includes(i);
        scene.classList.toggle('is-near',visible);
        if(visible)scene.style.transform=move;
      });
      activate(p.index);
      return; // Static logos and globes on phones: nothing else moves.
    }
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
    // While a sheet is open, touch scrolling that leaks through the backdrop must not move the camera.
    if (ignoreScroll || body.classList.contains('dialog-open')) return;
    lastScrollAt=performance.now();
    if(cinematic){
      targetY=clamp(window.scrollY-journey.offsetTop,0,total*frameH);
      requestFrame();
      if(phone())scheduleSettle();
    }
    else syncCalmPosition();
  }

  /* Phones have no wheel and no lerp: a flick can stop with two scenes half
     visible. Once the native scroll has ended, glide to the nearest checkpoint. */
  function cancelSettle(){
    if(settleRaf)cancelAnimationFrame(settleRaf);settleRaf=0;
    clearTimeout(scrollEndTimer);scrollEndTimer=0;
  }
  function scheduleSettle(){
    clearTimeout(scrollEndTimer);
    if(settleRaf)return;
    scrollEndTimer=setTimeout(settleIfIdle,90);
  }
  function settleIfIdle(){
    scrollEndTimer=0;
    if(!cinematic||!phone()||touching||document.hidden)return;
    if(performance.now()-lastScrollAt<80){scheduleSettle();return;}
    const p=poseAt(targetY);
    if(p.from===p.to||p.local<.03||p.local>.97)return;
    settleTo(p.local<.5?p.from:p.to);
  }
  function settleTo(index){
    const startY=window.scrollY, endY=journey.offsetTop+stops[index]*frameH;
    const distance=endY-startY;
    if(Math.abs(distance)<1)return;
    const duration=clamp(Math.abs(distance)*.7,180,360);
    const t0=performance.now();
    const easeOut=k=>1-Math.pow(1-k,3); // Starts at full speed: continues the fling, never restarts it.
    const step=now=>{
      settleRaf=0;
      if(touching){return;}
      const k=easeOut(clamp((now-t0)/duration,0,1));
      window.scrollTo(0,startY+distance*k);
      if(k<1)settleRaf=requestAnimationFrame(step);
    };
    settleRaf=requestAnimationFrame(step);
  }

  function mobileFitRatio(height) {
    // Smallest (available / required) height across the phone layouts; 1 means every scene fits.
    let ratio=1;
    scenes.forEach(scene=>{
      const layout=scene.querySelector('.mobile-layout') || scene.querySelector('.hero-unified');
      if(!layout || getComputedStyle(layout).display!=='grid')return;
      const style=getComputedStyle(layout);
      const rows=style.gridTemplateRows.split(' ').map(Number.parseFloat);
      const required=rows.reduce((sum,row)=>sum+row,0)+
        (parseFloat(style.rowGap)||0)*(rows.length-1)+
        (parseFloat(style.paddingTop)||0)+(parseFloat(style.paddingBottom)||0);
      if(required>height+1)ratio=Math.min(ratio,height/required);
    });
    return ratio;
  }
  const MIN_LAYOUT_SCALE=.8;
  function applyLayoutScale(height){
    // Instead of abandoning the camera when a phone is short, shrink the scene
    // content a little. Only absurdly short frames still fall back to reading mode.
    body.style.setProperty('--layout-scale','1');
    const ratio=mobileFitRatio(height);
    if(ratio>=1)return true;
    if(ratio<MIN_LAYOUT_SCALE)return false;
    body.style.setProperty('--layout-scale',ratio.toFixed(3));
    return true;
  }

  function refitLayout() {
    fitHeadlines();
    if(cinematic && phone() && !applyLayoutScale(frameH)){
      setMode(true);return;
    }
    cacheAnchors();
    if(cinematic)render();
  }

  function setMode(preserve=true, preserveProgress=false) {
    const wasCinematic=cinematic;
    const previousScrollY=window.scrollY;
    const previousIndex=Math.max(0,activeIndex);
    const previousProgress=cinematic && frameH>0 ? currentY/frameH : null;
    const [w,h,smallH]=measureViewport();
    cancelSettle();
    frameW=w;
    // Phones use the small viewport (toolbars visible) as the fixed frame: the
    // camera then never rebuilds when Safari or Chrome collapse their bars.
    frameH=phone() ? smallH : h;
    const minPhoneH=phone() ? 500 : 620;
    cinematic=!userCalm && !reduceMotion.matches && w>=320 && smallH>=minPhoneH;
    calmReason=userCalm?'reader':reduceMotion.matches?'reduced-motion':w<320?'narrow':smallH<minPhoneH?'short':'';
    body.classList.toggle('frame-phone',phone());
    body.classList.toggle('frame-compact',phone() && smallH<700);
    body.classList.toggle('frame-tight',phone() && smallH<600);
    if(cinematic && phone()){
      ignoreScroll=true;
      body.classList.add('cinematic');
      buildTimeline();fitHeadlines();
      cinematic=applyLayoutScale(frameH);
      if(!cinematic){calmReason='overflow';console.warn('DVP: vista de lectura porque una escena no cabe en',frameW+'x'+frameH);}
    }
    body.classList.toggle('cinematic',cinematic);
    body.classList.toggle('calm',!cinematic);
    syncMotionButton();
    if(cinematic){
      buildTimeline();
      cacheAnchors();
      if(phone())atlas.style.removeProperty('transform');
      else scenes.forEach(scene=>scene.style.removeProperty('transform'));
      body.classList.toggle('brand-travel-ready',!phone());
      currentY=preserve ? (preserveProgress && previousProgress!==null ? clamp(previousProgress,0,total) : stops[previousIndex])*frameH : 0;
      targetY=currentY;
      ignoreScroll=true;
      window.scrollTo(0,journey.offsetTop+currentY);
      activeIndex=-1;
      render();
      releaseScrollLock();
    }else{
      body.classList.remove('brand-travel-ready');
      body.style.setProperty('--secondary-logo-opacity','0');
      if(raf)cancelAnimationFrame(raf);raf=0;
      atlas.style.removeProperty('transform');
      journey.style.removeProperty('--journey-height');
      viewport.style.removeProperty('background');
      scenes.forEach(scene=>{scene.inert=false;scene.classList.add('is-near');scene.style.removeProperty('--parallax');scene.style.removeProperty('transform');});
      activeIndex=-1;activate(previousIndex);
      if(preserve)requestAnimationFrame(()=>window.scrollTo(0,
        preserveProgress && !wasCinematic ? previousScrollY : scenes[previousIndex].offsetTop+journey.offsetTop));
      releaseScrollLock();
    }
    fitHeadlines();
    cacheAnchors();
    syncDvd();
    scenes.forEach(scene=>{const h=scene.querySelector('#hero-title') || scene.querySelector((frameW<=760?'.mobile-layout':'.desktop-layout')+' h1, '+(frameW<=760?'.mobile-layout':'.desktop-layout')+' h2');if(h)scene.setAttribute('aria-labelledby',h.id);});
    if(cinematic)render();
  }

  function releaseScrollLock() {
    // rAF does not run in a background tab; the timer guarantees the release.
    requestAnimationFrame(()=>{ignoreScroll=false;});
    setTimeout(()=>{ignoreScroll=false;},120);
  }
  function syncMotionButton() {
    const paused = userPaused || reduceMotion.matches;
    body.classList.toggle('motion-paused', paused);
    if(!motionButton||!motionLabel)return; // The HUD no longer ships a pause button.
    motionButton.setAttribute('aria-pressed',String(paused));
    motionButton.title=paused?'Activar las animaciones':'Pausar las animaciones';
    motionButton.setAttribute('aria-label',motionButton.title);
    motionLabel.textContent=paused?'Activar':'Pausar';
    motionButton.disabled=reduceMotion.matches;
    if (reduceMotion.matches) {
      motionLabel.textContent='Reducido';
      motionButton.title='Tu dispositivo solicita reducir el movimiento';
    }
  }

  function markDialogOpen() {
    body.classList.add('dialog-open');cancelSettle();
  }
  function closeDialogs() {
    if(indexDialog.open)indexDialog.close();
    if(infoDialog.open)infoDialog.close();
    document.querySelectorAll('.service-dialog[open]').forEach(d=>d.close());
  }
  function goTo(id,{focus=false,hash=true,smooth=false}={}) {
    const clean=String(id).replace(/^#/,'');
    const index=scenes.findIndex(s=>s.id===clean);
    if(index<0)return;
    closeDialogs();
    cancelSettle();
    if(cinematic && smooth && phone()){
      // Phones have no camera easing, so a tap on a link glides instead of cutting.
      settleTo(index);
    }else if(cinematic){
      currentY=targetY=stops[index]*frameH;
      ignoreScroll=true;
      render();
      window.scrollTo(0,journey.offsetTop+targetY);
      releaseScrollLock();
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
      const [w,h,smallH]=measureViewport();
      const sameWidth=Math.abs(w-frameW)<=2;
      if(cinematic && phone() && sameWidth){
        // A phone toolbar collapsing or the keyboard opening only changes the
        // large viewport. The frame is the small viewport, so nothing rebuilds.
        if(Math.abs(smallH-frameH)>4)setMode(true,true);
        else fitHeadlines();
        return;
      }
      // Desktop windows and orientation changes keep the same point in the journey.
      if(!sameWidth || Math.abs(h-frameH)>4)setMode(true,sameWidth);
      else fitHeadlines();
    },160);
  }

  function init() {
    body.classList.add('js-ready');dvdX=window.innerWidth*.75;dvdY=window.innerHeight*.73;
    // The journey position is derived from the hash, not from the browser's restored scroll.
    if('scrollRestoration' in history){try{history.scrollRestoration='manual';}catch(_){}}
    // A direct ?view=calm preview works without changing the stored preference.
    if(new URLSearchParams(location.search).get('view')==='calm')userCalm=true;
    setMode(false);
    listen(window,'scroll',onScroll,{passive:true});
    listen(window,'touchstart',()=>{touching=true;cancelSettle();},{passive:true});
    listen(window,'touchend',()=>{touching=false;if(cinematic&&phone())scheduleSettle();},{passive:true});
    listen(window,'touchcancel',()=>{touching=false;},{passive:true});
    if('onscrollend' in window)listen(window,'scrollend',()=>{if(cinematic&&phone())settleIfIdle();},{passive:true});
    listen(window,'resize',onResize,{passive:true});
    if(window.visualViewport)listen(window.visualViewport,'resize',onResize,{passive:true});
    if(window.ResizeObserver){
      layoutObserver=new ResizeObserver(()=>{
        if(refitFrame)cancelAnimationFrame(refitFrame);
        refitFrame=requestAnimationFrame(()=>{refitFrame=0;refitLayout();});
      });
      document.querySelectorAll('.scene h1,.scene h2,.branch-logo-slot,.site-header .brand,.m-body,.m-contact-body,.hero-copy').forEach(el=>layoutObserver.observe(el));
    }
    listen(document,'visibilitychange',visibility);
    document.querySelectorAll('[data-scene-link]').forEach(link=>link.addEventListener('click',event=>{
      if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      event.preventDefault();goTo(link.getAttribute('href'),{focus:true,smooth:true});
    }));
    document.getElementById('read-story').addEventListener('click',event=>{
      event.preventDefault();userCalm=true;safeStore('reader');setMode(true);
      requestAnimationFrame(()=>scenes[Math.max(0,activeIndex)].focus({preventScroll:true}));
    });
    // "Pausar" only stops the decorative animations. The camera is the site.
    if(motionButton)motionButton.addEventListener('click',()=>{
      userPaused=!userPaused;safeStore(userPaused?'paused':'auto');
      syncMotionButton();syncDvd();
    });
    indexButton.addEventListener('click',()=>{
      if(typeof indexDialog.showModal==='function'){
        indexDialog.showModal();markDialogOpen();indexButton.setAttribute('aria-expanded','true');
      }
    });
    document.querySelectorAll('#open-info, [data-open-info]').forEach(button=>button.addEventListener('click',()=>{
      if(typeof infoDialog.showModal==='function'){infoDialog.showModal();markDialogOpen();}
    }));
    // Touch scrolling is not stopped by body{overflow:hidden} on iOS: a drag on the
    // backdrop scrolls the page behind the sheet. Block it and re-sync the camera on close.
    document.querySelectorAll('dialog').forEach(dialog=>{
      listen(dialog,'touchmove',event=>{if(event.target===dialog)event.preventDefault();},{passive:false});
      listen(dialog,'close',()=>{
        if(document.querySelector('dialog[open]'))return;
        body.classList.remove('dialog-open');
        if(cinematic && Math.abs(window.scrollY-(journey.offsetTop+currentY))>1){
          ignoreScroll=true;window.scrollTo(0,journey.offsetTop+currentY);releaseScrollLock();
        }
      });
    });
    document.getElementById('next-scene').addEventListener('click',()=>goTo(scenes[(Math.max(0,activeIndex)+1)%scenes.length].id,{smooth:true}));
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
        dialog.showModal();dialog.scrollTop=0;markDialogOpen();
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
    if(document.fonts && document.fonts.ready)document.fonts.ready.then(refitLayout);
    if(document.fonts && document.fonts.addEventListener)listen(document.fonts,'loadingdone',refitLayout);
    if(location.hash)requestAnimationFrame(()=>goTo(location.hash,{hash:false}));
    started=true;
    // Small documented API for maintenance / visual review. No private data.
    window.dvpExperience=Object.freeze({
      goTo:id=>goTo(id,{hash:false}),
      refresh:()=>setMode(true),
      status:()=>({mode:cinematic?'cinematic':'calm',calmReason,motion:!userPaused && !reduceMotion.matches,phone:phone(),layoutScale:body.style.getPropertyValue('--layout-scale')||'1',scene:scenes[Math.max(activeIndex,0)].id,frame:[frameW,frameH],checkpoints:stops.map((t,i)=>({id:scenes[i].id,y:t*frameH})),scrollLength:total*frameH,brand:lastBrandPose,dvd:{x:dvdX,y:dvdY,reflections:dvdHits}})
    });
  }
  try{init();}catch(error){
    // A failed enhancement must never result in a blank website.
    body.classList.remove('cinematic','js-ready','brand-travel-ready');body.classList.add('calm');
    if(atlas)atlas.style.removeProperty('transform');if(journey)journey.style.removeProperty('--journey-height');
    scenes.forEach(scene=>{scene.inert=false;scene.classList.add('is-near');});
    console.error('DVP: la vista con movimiento no pudo iniciarse; se mantiene la vista de lectura.',error);
  }
  return () => {
    listeners.forEach(remove=>remove());
    if(raf) cancelAnimationFrame(raf);
    cancelSettle();
    clearTimeout(resizeTimer);
    if(dvdRaf)cancelAnimationFrame(dvdRaf);
    if(mediaRaf)cancelAnimationFrame(mediaRaf);
    if(layoutObserver)layoutObserver.disconnect();if(refitFrame)cancelAnimationFrame(refitFrame);
    delete window.dvpExperience;
    body.classList.remove('cinematic','js-ready','calm','motion-paused','page-hidden','ui-dark','brand-travel-ready');
  };
};

/* The page is fully rendered HTML. This script is deferred, so the document is
   parsed by now and the motion layer can mount directly (no framework needed). */
window.dvpUnmount = window.mountDvpMobile();

/* ===== Service cards (runs after the camera has wired the dialogs) (was build/service-cards.016f4a5fee28.js) ===== */
(()=>{
  'use strict';
  const configs=[
    {key:'management',scene:'representacion',desktop:'.management-photo',mobile:'.m-photo-block',title:'Representación · DVP Football Management',headline:'Primero, el fútbol.',summary:'Contratos, renovaciones, transferencias y plan de carrera: el núcleo alrededor del que se coordina todo lo demás.'},
    {key:'wealth',scene:'future',desktop:'.wealth-photo',mobile:'.organic-wealth',title:'Future · DVP Wealth Consulting',headline:'Construye también fuera del campo.',summary:'Una visión ordenada para proteger y proyectar el patrimonio que construyes durante tu carrera.'},
    {key:'publicity',scene:'brand',desktop:'.publicity-one',mobile:'.m-pub-one',title:'Brand · DVP Publicity',headline:'Tu imagen también juega.',summary:'Posicionamiento, imagen y oportunidades comerciales alineadas con tu identidad y tu carrera.'},
    {key:'performance',scene:'performance',desktop:'.analysis-storyboard',mobile:'.m-storyboard',title:'Performance · DVP Analytics + DVP Wellness',headline:'Tu equipo fuera del campo.',summary:'Análisis de tus partidos y especialistas coordinados alrededor de una única prioridad: que estés preparado para rendir.'}
  ];

  const openService=(key,scene)=>{
    const trigger=scene?.querySelector(`.service-open[data-service-open="${key}"]`);
    if(trigger){trigger.click();return;}
    const dialog=document.getElementById(`service-${key}`);
    if(dialog && typeof dialog.showModal==='function' && !dialog.open){dialog.showModal();return;}
    const fallback={management:'representacion-futbolistas/',wealth:'patrimonio-futbolistas/',publicity:'marca-personal-futbolistas/',performance:'videoanalisis-futbolistas/'}[key];
    if(fallback) location.href=fallback;
  };

  const prepareCard=(card,cfg,scene,isMobile=false)=>{
    if(!card || card.dataset.dvpCardReady==='1') return;
    card.dataset.dvpCardReady='1';
    card.classList.add('dvp-service-card',`dvp-card-${cfg.key}`);
    if(getComputedStyle(card).position==='static') card.style.position='relative';
    card.removeAttribute('aria-hidden');
    card.setAttribute('role','button');
    card.setAttribute('tabindex','0');
    card.setAttribute('aria-label',`Abrir información de ${cfg.title}`);

    if(!isMobile){
      const back=document.createElement('div');
      back.className='dvp-card-back';
      back.setAttribute('aria-hidden','true');
      back.innerHTML=`<small>${cfg.title}</small><strong>${cfg.headline}</strong><p>${cfg.summary}</p><span>Haz clic para conocer más ↗</span>`;
      card.appendChild(back);
    }

    const open=()=>openService(cfg.key,scene);
    card.addEventListener('click',open);
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
  };

  configs.forEach(cfg=>{
    const scene=document.getElementById(cfg.scene||cfg.key);
    if(!scene) return;
    prepareCard(scene.querySelector(cfg.desktop),cfg,scene,false);
    prepareCard(scene.querySelector(cfg.mobile),cfg,scene,true);
  });
})();
