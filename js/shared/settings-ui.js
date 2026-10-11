/* Shared appearance, Fun Mode, and sound settings: one set of controls for both games.
   The original Tongits controls (and their event listeners) are moved, not cloned. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const tongits=$('settingsOverlay'), mahjong=$('mjSettingsDialog'), target=$('mjSharedSettings');
 if(!tongits||!mahjong||!target)return;
 const theme=$('darkThemeButton')?.closest('.theme-selector');
 const fun=$('funEnabled')?.closest('.fun-settings');
 const sound=$('soundEffectsToggle')?.closest('.sound-settings-grid');
 if(!theme||!fun||!sound)return;
 const parts=[
  {el:theme,title:'APPEARANCE'},
  {el:fun,title:'🎭 FUN MODE'},
  {el:sound,title:'SOUND'}
 ];
 parts.forEach(p=>{p.anchor=document.createComment('shared-'+p.title);p.el.parentNode.insertBefore(p.anchor,p.el)});
 function heading(t){const el=document.createElement('div');el.className='settings-section-title';el.textContent=t;return el}
 function mountMahjong(){
  target.replaceChildren();
  for(const part of parts){const group=document.createElement('section');group.className='mj-shared-section';group.append(heading(part.title),part.el);target.append(group)}
  if(typeof updateThemeButtons==='function')updateThemeButtons();
  if(typeof funSync==='function')funSync();
  if(typeof updateSoundSettingButtons==='function')updateSoundSettingButtons();
 }
 function mountTongits(){for(const part of parts){part.anchor.parentNode.insertBefore(part.el,part.anchor)}}
 $('mjHeaderSettings')?.addEventListener('click',mountMahjong);
 $('settingsButton')?.addEventListener('click',mountTongits,true);
 // Return controls when the Mahjong settings dialog is dismissed.
 mahjong.addEventListener('click',e=>{if(e.target===mahjong||e.target.closest('[data-mj-dismiss="mjSettingsDialog"]'))mountTongits()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mahjong&&!mahjong.classList.contains('hidden'))mountTongits()});
})();
