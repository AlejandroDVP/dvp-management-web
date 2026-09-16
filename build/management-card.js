(()=>{
  const scene=document.getElementById('management');
  if(!scene)return;
  const imageSrc='assets/management-motion-approved.webp';
  const desktop=scene.querySelector('.management-photo');
  const mobile=scene.querySelector('.m-photo-block');
  const dialog=document.getElementById('service-management');

  [desktop,mobile].forEach(card=>{
    if(!card)return;
    const img=card.querySelector('img');
    if(img){img.src=imageSrc;img.removeAttribute('srcset');img.alt='Fotografía editorial de un futbolista en movimiento durante un partido';}
    card.setAttribute('role','button');
    card.setAttribute('tabindex','0');
    card.setAttribute('aria-label','Ver información de DVP Football Management');
    const open=()=>{if(dialog&&typeof dialog.showModal==='function'&&!dialog.open)dialog.showModal();};
    card.addEventListener('click',open);
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
  });

  if(desktop&&!desktop.querySelector('.management-card-back')){
    const back=document.createElement('div');
    back.className='management-card-back';
    back.setAttribute('aria-hidden','true');
    back.innerHTML='<small>DVP Football Management</small><strong>Tu carrera, acompañada.</strong><p>Representación y estrategia deportiva para acompañar las decisiones que marcan cada etapa de tu carrera.</p><span>Haz clic para conocer más ↗</span>';
    desktop.appendChild(back);
  }
})();
