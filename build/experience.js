(()=>{
  const services={
    management:{label:'DVP Football Management',kicker:'Representación',title:'Tu carrera, con dirección.',summary:'Representación y estrategia deportiva para acompañar decisiones clave de tu carrera con una visión de largo plazo.'},
    wealth:{label:'DVP Wealth Consulting',kicker:'Patrimonio',title:'Lo que construyes también juega.',summary:'Orden, visión y acompañamiento para proyectar el patrimonio que construyes durante tu carrera.'},
    publicity:{label:'DVP Publicity',kicker:'Marca',title:'Tu juego también se ve fuera.',summary:'Posicionamiento, imagen y oportunidades comerciales alineadas con tu identidad y tu carrera.'},
    analytics:{label:'DVP Analytics',kicker:'Rendimiento',title:'Entender para evolucionar.',summary:'Una lectura independiente de tu juego para comprender mejor tu rendimiento y orientar tu evolución.'},
    wellness:{label:'DVP Wellness',kicker:'Bienestar',title:'Cuerpo. Cabeza. Fútbol.',summary:'Un enfoque integral de bienestar y rendimiento, adaptado a tu momento y a tus necesidades.'}
  };
  const selectors={
    management:['#management .management-photo','#management .m-photo-block'],
    wealth:['#wealth .wealth-photo','#wealth .organic-wealth'],
    publicity:['#publicity .publicity-one','#publicity .m-pub-one'],
    analytics:['#analytics .analysis-film','#analytics .m-pitch-photo'],
    wellness:['#wellness .wellness-photo','#wellness .organic-wellness']
  };
  function openService(branch){
    const trigger=document.querySelector(`.service-open[data-service-open="${branch}"]`);
    const dialog=document.getElementById(`service-${branch}`);
    if(dialog&&typeof dialog.showModal==='function'){if(!dialog.open)dialog.showModal();return;}
    if(trigger)trigger.click();
  }
  function decorate(el,branch,i){
    if(!el||el.dataset.dvpServiceVisual)return;
    const c=services[branch];
    el.dataset.dvpServiceVisual='1';
    el.classList.add('service-visual',`service-visual--${branch}`);
    if(i===1)el.classList.add('service-visual-mobile');
    el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label',`Abrir información de ${c.label}`);
    const back=document.createElement('div');back.className='service-info-back';back.setAttribute('aria-hidden','true');
    back.innerHTML=`<p class="service-info-kicker">${c.kicker}</p><h3>${c.title}</h3><p>${c.summary}</p><p class="service-info-cta">Abrir información ↗</p>`;
    el.appendChild(back);
    el.addEventListener('click',()=>openService(branch));
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openService(branch);}});
  }
  Object.entries(selectors).forEach(([branch,list])=>list.forEach((sel,i)=>decorate(document.querySelector(sel),branch,i)));
  const toggle=document.getElementById('motion-toggle');if(toggle){toggle.setAttribute('aria-hidden','true');toggle.tabIndex=-1;}
})();
