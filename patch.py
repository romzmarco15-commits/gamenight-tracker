from pathlib import Path
p=Path('/mnt/data/gn_polish'); h=p/'index.html'; s=h.read_text()
s=s.replace('<span id="mjRound">Round 1</span></header>','<span id="mjRound">Round 1</span><div class="mj-header-tools"><button id="mjHeaderRules" class="icon-button" type="button" aria-label="Mahjong rules">?</button><button id="mjHeaderSettings" class="icon-button" type="button" aria-label="Mahjong settings">⚙️</button></div></header>')
s=s.replace('<div class="mj-main-actions"><button id="mjOpenWin" class="primary-button">🀄 Record Win</button><button id="mjOpenQuick" class="gn-sub-button">💸 Quick Pay</button></div>','<div class="mj-main-actions"><button id="mjOpenQuick" class="gn-sub-button">💸 Quick Pay</button><button id="mjOpenHistory" class="gn-sub-button">📜 History</button><button id="mjUndo" class="gn-sub-button">↶ Undo</button><button id="mjSettlement" class="gn-sub-button">💰 Settlement</button></div>')
s=s.replace('<button id="mjOpenHistory" class="gn-sub-button">📜 History</button><button id="mjUndo" class="gn-sub-button">↶ Undo</button><button id="mjSettlement" class="gn-sub-button">💰 Final Settlement</button><button id="mjToggleSettings" class="gn-sub-button">⚙️ Rules</button>','')
s=s.replace('<div class="mj-panel"><h3>Game actions</h3><div class="mj-actions">','<div class="mj-panel mj-game-settings-host"><h3>Game actions</h3><div class="mj-actions">')
s=s.replace('<div id="mjActionDialog"', '''<div id="mjRulesDialog" class="mj-dialog hidden" role="dialog" aria-modal="true" aria-label="Mahjong rules"><div class="mj-dialog-card mj-action-card"><div class="mj-dialog-head"><strong>🀄 Mahjong Rules</strong><button type="button" class="mj-dialog-close" data-mj-dismiss="mjRulesDialog" aria-label="Close">✕</button></div><div id="mjRulesContent"></div></div></div>
<div id="mjSettingsDialog" class="mj-dialog hidden" role="dialog" aria-modal="true" aria-label="Mahjong settings"><div class="mj-dialog-card mj-action-card"><div class="mj-dialog-head"><strong>⚙️ Mahjong Settings</strong><button type="button" class="mj-dialog-close" data-mj-dismiss="mjSettingsDialog" aria-label="Close">✕</button></div><div class="mj-settings-group"><h4>Appearance</h4><label class="mj-field">Theme<select id="mjTheme"><option value="light">☀️ Light</option><option value="dark">🌙 Dark</option></select></label></div><div class="mj-settings-group"><h4>🎭 Fun Mode</h4><label class="mj-switch"><span><strong>Enable Fun Mode</strong><small>Shared with Tongits</small></span><input id="mjFunEnabled" type="checkbox"><span class="mj-track"></span></label><div id="mjFunOptions" class="hidden"><label class="mj-field">Commentator language<select id="mjFunLanguage"><option value="taglish">Taglish</option><option value="english">English</option><option value="tagalog">Tagalog</option></select></label><label class="mj-field">Roast level<select id="mjFunIntensity"><option value="friendly">Friendly</option><option value="savage">Savage but funny</option><option value="extra">Extra savage</option></select></label><label class="mj-switch"><span>Spoken commentary</span><input id="mjFunVoice" type="checkbox"><span class="mj-track"></span></label><label class="mj-switch"><span>Occasional reactions</span><input id="mjFunRandom" type="checkbox"><span class="mj-track"></span></label><label class="mj-field">Voice<select id="mjFunVoiceChoice"><option value="auto">Automatic</option></select></label><button id="mjFunTest" class="gn-sub-button" type="button">🔊 Test voice</button></div></div><div class="mj-settings-group"><h4>Mahjong house rules</h4><div id="mjSettingsSlot"></div></div><div class="mj-settings-group"><h4>Game data</h4><button id="mjClearGame" class="gn-sub-button mj-danger" type="button">🗑 Clear Mahjong Game</button><p class="mj-muted">Only Mahjong session data is deleted. Tongits remains saved.</p></div></div></div>
<div id="mjActionDialog"''')
h.write_text(s)
js=p/'js/ui/mahjong-ui.js'; t=js.read_text()
t=t.replace('function renderGame(){if(actionOpen)closeAction();','function renderGame(){if(actionOpen)closeAction();')
t=t.replace('<div class="mj-face">${[\'😎\',\'👩\',\'🧑\',\'😺\'][i]}</div><strong>${esc(x.name)}</strong><b class="${x.balance<0?\'mj-negative\':\'mj-positive\'}">${x.balance>0?\'+\':\'\'}${fmt(x.balance)}</b>','<div class="mj-face">${[\'😎\',\'👩\',\'🧑\',\'😺\'][i]}</div><strong>${esc(x.name)}</strong><b class="${x.balance<0?\'mj-negative\':\'mj-positive\'}">${x.balance>0?\'+\':\'\'}${fmt(x.balance)}</b><button class="mj-player-win" type="button" data-mj-winner="${i}">🀄 WIN</button>')
t=t.replace("$('mjOpenWin').onclick=()=>openAction('win');", "$('mjCards').addEventListener('click',e=>{const btn=e.target.closest('[data-mj-winner]');if(!btn)return;$('mjWinner').value=btn.dataset.mjWinner;refreshPayer();preview();openAction('win')});")
t=t.replace("$('mjToggleSettings').onclick=()=>{const panel=$('mjSettings');panel.classList.toggle('hidden');", "function prepareMahjongRules(){const panel=$('mjSettings');panel.classList.remove('hidden');")
t=t.replace("renderBonusEditor('mjSettingsBonusEditor')};$('mjSettingsAddBonus')", "renderBonusEditor('mjSettingsBonusEditor')};$('mjSettingsAddBonus')")
# move settings panel into dialog, preserving form handlers
insert='''
 // Mahjong rules and settings use the same iOS-style header controls as Tongits.
 const mjSettingsHome={parent:$('mjSettings').parentNode,next:$('mjSettings').nextSibling};
 $('mjSettingsSlot').appendChild($('mjSettings'));
 const openMjDialog=id=>$(id).classList.remove('hidden');
 const closeMjDialog=id=>$(id).classList.add('hidden');
 document.querySelectorAll('[data-mj-dismiss]').forEach(b=>b.addEventListener('click',()=>closeMjDialog(b.dataset.mjDismiss)));
 ['mjRulesDialog','mjSettingsDialog'].forEach(id=>$(id).addEventListener('click',e=>{if(e.target===$(id))closeMjDialog(id)}));
 $('mjHeaderRules').onclick=()=>{
  const r=state.rules;
  $('mjRulesContent').innerHTML=`<div class="mj-rule-line"><strong>Players</strong><span>${state.players.length}</span></div><div class="mj-rule-line"><strong>Payment methods</strong><span>${r.payment==='both'?'Everyone or one payer':r.payment==='all'?'Everyone pays':'One payer'}</span></div><div class="mj-rule-line"><strong>Default win</strong><span>${fmt(r.base)} per payer</span></div><div class="mj-rule-line"><strong>Pot</strong><span>${r.potEnabled?'Enabled · '+fmt(r.perRound)+' per player per round':'Disabled'}</span></div><h4>Special bonuses</h4>${r.bonuses.map(b=>`<div class="mj-rule-line"><span>${esc(b.name)}</span><span>${fmt(b.amount)} · ${b.scope==='one'?'one payer':'each payer'}</span></div>`).join('')||'<p class="mj-muted">No bonuses configured</p>'}<p class="mj-muted">Choose the winner from their player card. Rules changes affect future rounds only.</p>`;
  openMjDialog('mjRulesDialog');
 };
 function syncMjFun(){
  if(typeof funMode==='undefined')return;
  $('mjFunEnabled').checked=!!funMode.enabled;
  $('mjFunLanguage').value=funMode.language;
  $('mjFunIntensity').value=funMode.intensity;
  $('mjFunVoice').checked=!!funMode.voice;
  $('mjFunRandom').checked=!!funMode.random;
  $('mjFunOptions').classList.toggle('hidden',!funMode.enabled);
  const select=$('mjFunVoiceChoice');select.innerHTML='<option value="auto">Automatic</option>';
  if(typeof funAvailableVoices==='function')funAvailableVoices().forEach(v=>select.add(new Option(`${v.name} (${v.lang})`,v.voiceURI)));
  select.value=[...select.options].some(o=>o.value===funMode.voiceChoice)?funMode.voiceChoice:'auto';
 }
 $('mjHeaderSettings').onclick=()=>{
  prepareMahjongRules();
  $('mjTheme').value=document.body.dataset.theme==='dark'?'dark':'light';
  syncMjFun();openMjDialog('mjSettingsDialog');
 };
 $('mjTheme').onchange=e=>{
  document.body.dataset.theme=e.target.value;
  try{localStorage.setItem('gameNightTheme',e.target.value)}catch(_){}
 };
 for(const [id,key] of Object.entries({mjFunEnabled:'enabled',mjFunLanguage:'language',mjFunIntensity:'intensity',mjFunVoice:'voice',mjFunRandom:'random',mjFunVoiceChoice:'voiceChoice'})){
  $(id).addEventListener('change',e=>{
   if(typeof funMode==='undefined')return;
   funMode[key]=e.target.type==='checkbox'?e.target.checked:e.target.value;
   funSave();funSync();syncMjFun();
  });
 }
 $('mjFunTest').onclick=()=>{if(typeof funSpeak==='function')funSpeak('Hoy, welcome to Mahjong! Bilisan mo, please!')};
 $('mjClearGame').onclick=()=>{
  if(!confirm('Delete this Mahjong session and its history? Tongits data will not be affected.'))return;
  state=null;localStorage.removeItem('gameNightMahjongV1');closeMjDialog('mjSettingsDialog');window.GameNightHome();
 };
'''
t=t.replace(" $('mjCloseSettlement').onclick=()=>$('mjSettlementDialog').classList.add('hidden');", " $('mjCloseSettlement').onclick=()=>$('mjSettlementDialog').classList.add('hidden');\n"+insert)
t=t.replace("state.rules=structuredClone(rules);save();renderGame()", "state.rules=structuredClone(rules);save();closeMjDialog('mjSettingsDialog');renderGame()")
js.write_text(t)
css=p/'style.css'; css.write_text(css.read_text()+'''
/* Mahjong: consistent Tongits-style player actions and top-right controls */
.mj-header-tools{display:flex;gap:8px;align-items:center}.mj-header-tools .icon-button{flex:none;width:42px;height:42px;border-radius:14px;background:var(--surface);color:var(--text);border:1px solid var(--border);font-size:20px}
.mj-player{border:1px solid var(--border);box-shadow:var(--shadow);padding:15px 12px;gap:9px}.mj-player-win{border:0;border-radius:14px;background:#34a853;color:white;font-size:14px;font-weight:800;min-height:45px;margin-top:4px;cursor:pointer}.mj-player-win:active{transform:scale(.97)}
.mj-main-actions{grid-template-columns:repeat(2,minmax(0,1fr))}.mj-main-actions button{min-height:52px}
.mj-game-settings-host{display:none!important}.mj-settings-group{padding:14px 0;border-top:1px solid var(--border)}.mj-settings-group:first-of-type{border:0}.mj-settings-group h4{margin:0 0 12px}.mj-settings-group .mj-switch{padding:10px 0}.mj-settings-group .mj-field{margin:12px 0}.mj-settings-group #mjSettings{display:block!important}.mj-settings-group #mjSettings>.mj-panel{padding:0;border:0;box-shadow:none;background:transparent}.mj-rule-line{display:flex;justify-content:space-between;gap:15px;padding:12px 0;border-bottom:1px solid var(--border);font-size:14px}.mj-rule-line span{text-align:right}.mj-danger{color:#ff453a!important}.mj-action-card{max-height:85dvh;overflow:auto}.mj-dialog-card{color:var(--text)}
@media(max-width:480px){.mj-header{gap:7px}.mj-header h1{font-size:17px}.mj-header-tools .icon-button{width:39px;height:39px}.mj-player-win{font-size:13px}}
''')
