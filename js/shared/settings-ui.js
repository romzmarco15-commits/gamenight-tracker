/* One mounted set of settings controls for every playable game. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const tongits=$('settingsOverlay')?.querySelector('.modal');
 if(!tongits)return;
 const rules=$('tongitsRulesDisclosure');
 const appearance=$('darkThemeButton')?.closest('.theme-selector');
 const soundHeader=$('gnSoundSettingsHeader');
 const soundPanel=$('gnSoundSettingsPanel');
 const soundGrid=$('soundEffectsToggle')?.closest('.sound-settings-grid');
 const fun=$('funEnabled')?.closest('.fun-settings');
 if(!rules||!appearance||!soundGrid||!fun)return;
 const parts=[
  {name:'🎨 Appearance',nodes:[appearance]},
  {name:'🔊 Sound Effects',nodes:[soundGrid]},
  {name:'🎭 Fun Mode',nodes:[fun]}
 ];
 const host=document.createElement('div');host.id='gnTongitsSharedSettings';host.className='gn-common-settings';
 const gameControls=document.createElement('details');gameControls.className='gn-settings-accordion';
 gameControls.innerHTML='<summary>📜 History & Game Controls</summary><div class="gn-settings-content"></div>';
 ['editPlayersButton','restartGameButton'].forEach(id=>{const el=$(id);if(el)gameControls.querySelector('.gn-settings-content').append(el)});
 const data=document.createElement('details');data.className='gn-settings-accordion';
 data.innerHTML='<summary>🗂️ Data Management</summary><div class="gn-settings-content"></div>';
 ['storageStatus','clearAllDataButton'].forEach(id=>{const el=$(id);if(el)data.querySelector('.gn-settings-content').append(el)});
 const warning=tongits.querySelector('.data-warning-text');if(warning)data.querySelector('.gn-settings-content').append(warning);
 if(soundHeader)soundHeader.style.display='none';
 if(soundPanel)soundPanel.style.display='none';
 const subtitle=tongits.querySelector('.modal-subtitle');
 // The order is deliberately identical: Rules → Appearance → Sounds → Fun → Animations → Controls → Data.
 subtitle.after(rules,host,gameControls,data);
 // Delete obsolete headings and separators; their live inputs were moved, not recreated.
 [...tongits.children].forEach(el=>{if(el.classList.contains('settings-section-title')||el.classList.contains('settings-divider'))el.remove()});
 const make=(title,content)=>{const d=document.createElement('details');d.className='gn-settings-accordion';const summary=document.createElement('summary');summary.textContent=title;const slot=document.createElement('div');slot.className='gn-settings-content';d.append(summary,slot);if(typeof content==='string')slot.innerHTML=content;else content.forEach(el=>slot.append(el));return d};
 function mountInto(container){if(!container)return;container.replaceChildren();container.classList.add('gn-common-settings');for(const part of parts)container.append(make(part.name,part.nodes));const animation=make('✨ Animations',`<label class="gn-unified-switch"><span><strong>Enable animations</strong><small>Money movements and celebrations across all games</small></span><input type="checkbox" role="switch" data-gn-animations ${window.GameNightUI?.animationsEnabled()?'checked':''}><span class="gn-unified-track"></span></label>`);container.append(animation);
  if(typeof updateThemeButtons==='function')updateThemeButtons();if(typeof funSync==='function')funSync();if(typeof updateSoundSettingButtons==='function')updateSoundSettingButtons();
 }
 function restore(){mountInto(host)}
 window.GameNightSharedSettings={mountInto,restore};
 restore();
 $('settingsButton')?.addEventListener('click',restore,true);
 $('mjHeaderSettings')?.addEventListener('click',()=>{const c=$('mjSharedSettings');if(c)mountInto(c)},true);
 $('mjSettingsDialog')?.addEventListener('click',e=>{if(e.target===$('mjSettingsDialog')||e.target.closest('[data-mj-dismiss="mjSettingsDialog"]'))restore()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('mjSettingsDialog')&&!$('mjSettingsDialog').classList.contains('hidden'))restore()});
})();
