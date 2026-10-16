/* Unified Game Night interaction kit. Does not own any game rules or game saves. */
(()=>{'use strict';
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const KEY='gameNightAnimationsV1';
 let animations=true;
 try{animations=localStorage.getItem(KEY)!=='false'}catch(_){}
 const sync=()=>{document.body.classList.toggle('gn-animations-off',!animations);document.querySelectorAll('[data-gn-animations]').forEach(el=>el.checked=animations)};
 function setAnimations(value){animations=!!value;try{localStorage.setItem(KEY,String(animations))}catch(_){}sync()}
 function animationsEnabled(){return animations&&!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches}
 let active=null;
 function dismiss(value){if(!active)return;const {element,resolve,focus}=active;active=null;element.remove();if(focus&&focus.isConnected)focus.focus();resolve(value)}
 function dialog({title='Game Night',message='',confirmLabel='OK',cancelLabel='Cancel',danger=false,notice=false}={}){
  if(active)dismiss(false);
  return new Promise(resolve=>{
   const el=document.createElement('div');el.className='gn-ui-modal';el.setAttribute('role','presentation');
   el.innerHTML=`<div class="gn-ui-card" role="alertdialog" aria-modal="true" aria-labelledby="gnUiTitle" aria-describedby="gnUiMessage"><div class="gn-ui-header"><h2 id="gnUiTitle">${escape(title)}</h2><button type="button" class="gn-ui-close" data-gn-decision="false" aria-label="Close">✕</button></div><p id="gnUiMessage">${escape(message)}</p><div class="gn-ui-actions">${notice?'':`<button type="button" class="gn-sub-button" data-gn-decision="false">${escape(cancelLabel)}</button>`}<button type="button" class="${danger?'gn-ui-danger':'primary-button'}" data-gn-decision="true">${escape(confirmLabel)}</button></div></div>`;
   document.body.append(el);
   active={element:el,resolve,focus:document.activeElement};
   el.addEventListener('click',e=>{const button=e.target.closest('[data-gn-decision]');if(button){dismiss(button.dataset.gnDecision==='true');return}if(e.target===el)dismiss(false)});
   el.querySelector('[data-gn-decision="true"]')?.focus();
  });
 }
 document.addEventListener('keydown',e=>{if(!active)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();dismiss(false)}else if(e.key==='Tab'){
  const buttons=[...active.element.querySelectorAll('button:not([disabled])')];if(!buttons.length)return;
  if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1).focus()}
  else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus()}
 }},true);
 document.addEventListener('change',e=>{if(e.target.matches('[data-gn-animations]'))setAnimations(e.target.checked)});
 window.GameNightUI={confirm:(message,title='Confirm Action',confirmLabel='Confirm',danger=false)=>dialog({title,message,confirmLabel,danger}),notice:(message,title='Game Night')=>dialog({title,message,confirmLabel:'OK',notice:true}),setAnimations,animationsEnabled,escape};
 sync();
})();
