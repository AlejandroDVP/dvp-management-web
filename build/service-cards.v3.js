(()=>{
  'use strict';
  const configs=[
    {key:'management',desktop:'.management-photo',mobile:'.m-photo-block',title:'DVP Football Management',headline:'Tu carrera, acompañada.',summary:'Representación y estrategia deportiva para acompañar las decisiones que marcan cada etapa de tu carrera.'},
    {key:'wealth',desktop:'.wealth-photo',mobile:'.organic-wealth',title:'DVP Wealth Consulting',headline:'Construye también fuera del campo.',summary:'Una visión ordenada para proteger y proyectar el patrimonio que construyes durante tu carrera.'},
    {key:'publicity',desktop:'.publicity-one',mobile:'.m-pub-one',title:'DVP Publicity',headline:'Tu imagen también juega.',summary:'Posicionamiento, imagen y oportunidades comerciales alineadas con tu identidad y tu carrera.'},
    {key:'analytics',desktop:'.analysis-visual',mobile:'.m-analytics-art',title:'DVP Analytics',headline:'Entender para evolucionar.',summary:'Una lectura independiente de tu juego para aportar contexto a tu rendimiento y a tu evolución.'},
    {key:'wellness',desktop:'.wellness-photo',mobile:'.organic-wellness',title:'DVP Wellness',headline:'Cuerpo. Cabeza. Fútbol.',summary:'Un enfoque integral de bienestar y rendimiento alrededor del jugador y de sus necesidades.'}
  ];

  const openService=(key,scene)=>{
    const trigger=scene?.querySelector(`.service-open[data-service-open="${key}"]`);
    if(trigger){trigger.click();return;}
    const dialog=document.getElementById(`service-${key}`);
    if(dialog && typeof dialog.showModal==='function' && !dialog.open){dialog.showModal();return;}
    const fallback={management:'representacion-futbolistas/',wealth:'patrimonio-futbolistas/',publicity:'marca-personal-futbolistas/',analytics:'videoanalisis-futbolistas/',wellness:'bienestar-futbolistas/'}[key];
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
    const scene=document.getElementById(cfg.key);
    if(!scene) return;
    prepareCard(scene.querySelector(cfg.desktop),cfg,scene,false);
    prepareCard(scene.querySelector(cfg.mobile),cfg,scene,true);
  });
})();
