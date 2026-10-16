/* Mahjong app controller: interactions, navigation, persistence and engine calls. */
(function(){
 const E=window.MahjongEngine,L=window.GameNightLedger;
 const $=id=>document.getElementById(id),esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let state=null, count=4, rules=E.defaults(), selectedBonuses=[], setupPlayers=[];
 const view=window.MahjongUI.create({getState:()=>state,getRules:()=>rules,getSetupPlayers:()=>setupPlayers,getCount:()=>count,getSelectedBonuses:()=>selectedBonuses,fmt:n=>fmt(n)});
 const fmt=n=>`${state?.currency||$('mjCurrency').value}${L.round(n)}`;
 function status(msg){$('mjStatus').textContent=msg||''}
 function navigate(screen){if(actionOpen)closeAction();['homeScreen','setupScreen','gameScreen','mahjongSetupScreen','mahjongGameScreen','l9Setup','l9Game','pkSetup','pkGame'].forEach(id=>$(id).classList.toggle('hidden',id!==screen));window.scrollTo(0,0)}
 window.GameNightHome=()=>{navigate('homeScreen');$('homeTongitsResume').classList.toggle('hidden',!(typeof game!=="undefined"&&game));$('homeMahjongResume').classList.toggle('hidden',!state)};
 function save(){try{localStorage.setItem('gameNightMahjongV1',JSON.stringify(state))}catch(e){status('Unable to save Mahjong game. Check available device storage.')}}
 try{const raw=localStorage.getItem('gameNightMahjongV1');if(raw){const data=JSON.parse(raw);if(data?.type==='mahjong'&&Array.isArray(data.players))state=data;}}catch(e){console.warn('Mahjong save unavailable',e)}
 function setup(){count=4;setupPlayers=Array.from({length:4},(_,i)=>({name:`Player ${i+1}`,avatar:GameNightAvatar.emoji(GameNightAvatar.defaults[i])}));rules=structuredClone(E.defaults());$('mjPlayerCount').textContent=count;renderNames();renderRules();navigate('mahjongSetupScreen')}
 function renderNames() { return view.renderNames(); }

 function renderRules(){ $('mjBase').value=rules.base;$('mjPayment').value=rules.payment;$('mjPotEnabled').checked=!!rules.potEnabled;$('mjInitial').value=rules.initial;$('mjPerRound').value=rules.perRound;$('mjPotAward').value=rules.potAward;$('mjPotOptions').hidden=!rules.potEnabled;renderBonusEditor()}
 function readRules(){rules.base=Math.max(0,L.round($('mjBase').value));rules.payment=$('mjPayment').value;rules.potEnabled=$('mjPotEnabled').checked;rules.initial=Math.max(0,L.round($('mjInitial').value));rules.perRound=Math.max(0,L.round($('mjPerRound').value));rules.potAward=$('mjPotAward').value}
 function renderBonusEditor(target='mjBonusEditor') { return view.renderBonusEditor(target); }

 function editBonus(e){const b=e.target.closest('[data-i]');if(b){const item=rules.bonuses[+b.dataset.i];if(item)item[b.dataset.field]=b.dataset.field==='amount'?Math.max(0,L.round(b.value)):b.value;}const remove=e.target.closest('[data-remove]');if(remove){rules.bonuses.splice(+remove.dataset.remove,1);renderBonusEditor(e.currentTarget.id)}}
 function showGame(){if(!state)return setup();navigate('mahjongGameScreen');renderGame()}
 function renderGame(){if(actionOpen)closeAction();const p=state.players;$('mjRound').textContent=`Round ${state.round+1}`;$('mjPotDisplay').textContent=state.rules.potEnabled?`🪙 Pot ${fmt(state.pot)}`:'No pot';$('mjPotPanel').hidden=!state.rules.potEnabled;$('mjCards').innerHTML=view.playerCards(p);$('mjWinner').innerHTML=p.map((x,i)=>`<option value="${i}">${esc(x.name)}</option>`).join('');$('mjPayer').innerHTML=p.map((x,i)=>`<option value="${i}">${esc(x.name)}</option>`).join('');$('mjPayFrom').innerHTML=$('mjPayer').innerHTML;$('mjPayTo').innerHTML=$('mjPayer').innerHTML;$('mjPotWinner').innerHTML=$('mjPayer').innerHTML;$('mjPaymentMode').value=state.rules.payment==='one'?'one':'all';$('mjPaymentMode').querySelectorAll('option').forEach(o=>o.disabled=state.rules.payment!=='both'&&o.value!==state.rules.payment);$('mjWinBase').value=state.rules.base;selectedBonuses=[];renderWinBonuses();refreshPayer();preview();renderHistory();$('mjSettings').classList.add('hidden');status('')}
 function renderWinBonuses() { return view.renderWinBonuses(); }

 function refreshPayer(){const winner=+$('mjWinner').value,one=$('mjPaymentMode').value==='one';$('mjPayerWrap').hidden=!one&&!state.rules.bonuses.some(b=>selectedBonuses.includes(b.id)&&b.scope==='one');const options=[...$('mjPayer').options];options.forEach(o=>o.disabled=+o.value===winner);if(+$('mjPayer').value===winner)$('mjPayer').value=String(state.players.findIndex((_,i)=>i!==winner));}
 function preview(){const w=+$('mjWinner').value,p=+$('mjPayer').value,mode=$('mjPaymentMode').value,base=Math.max(0,L.round($('mjWinBase').value));const payers=mode==='all'?state.players.map((_,i)=>i).filter(i=>i!==w):[p];const sums=new Map();payers.forEach(i=>sums.set(i,base));for(const b of state.rules.bonuses.filter(b=>selectedBonuses.includes(b.id))){(b.scope==='one'?[p]:payers).forEach(i=>sums.set(i,L.round((sums.get(i)||0)+b.amount)))}$('mjPreview').innerHTML=[...sums].filter(([i])=>i!==w).map(([i,a])=>`<div>${esc(state.players[i].name)} → ${esc(state.players[w].name)} <b>${fmt(a)}</b></div>`).join('')||'No payment';}
 function renderHistory() { return view.renderHistory(); }

 let actionOpen=null;
 const actionHome={win:null,quick:null,history:null};
 function openAction(which){
  const id=which==='win'?'mjWinPanel':which==='quick'?'mjQuickPanel':'mjHistoryPanel', panel=$(id), slot=$('mjActionSlot');
  if(actionOpen)closeAction();
  actionHome[which]={parent:panel.parentNode,next:panel.nextSibling};
  slot.appendChild(panel);
  $('mjActionTitle').textContent=which==='win'?'🀄 Record Mahjong Win':which==='quick'?'💸 Quick Pay':'📜 Game History';
  $('mjActionDialog').classList.remove('hidden');
  actionOpen=which;
  if(which==='win'){refreshPayer();preview()}
 }
 function closeAction(){
  if(!actionOpen)return;
  const which=actionOpen, panel=$(which==='win'?'mjWinPanel':which==='quick'?'mjQuickPanel':'mjHistoryPanel'),home=actionHome[which];
  if(home?.parent)home.parent.insertBefore(panel,home.next&&home.next.parentNode===home.parent?home.next:null);
  $('mjActionDialog').classList.add('hidden');actionOpen=null;
 }
 $('mjCards').addEventListener('click',e=>{const btn=e.target.closest('[data-mj-winner]');if(!btn)return;$('mjWinner').value=btn.dataset.mjWinner;$('mjWinnerName').textContent=state.players[+btn.dataset.mjWinner].name;refreshPayer();preview();openAction('win')});
 $('mjOpenQuick').onclick=()=>openAction('quick');
 $('mjOpenHistory').onclick=()=>{renderHistory();openAction('history')};
 $('mjCloseAction').onclick=closeAction;
 $('mjActionDialog').addEventListener('click',e=>{if(e.target===$('mjActionDialog'))closeAction()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAction()});
 function animate(transfers){for(const t of transfers){const from=$('mjCards').children[t.from],to=$('mjCards').children[t.to];if(!from||!to)continue;const a=from.getBoundingClientRect(),b=to.getBoundingClientRect(),el=document.createElement('span');el.className='mj-flying-money';el.textContent='💸';el.style.left=`${a.left+a.width/2}px`;el.style.top=`${a.top+a.height/2}px`;el.style.setProperty('--dx',`${b.left+b.width/2-a.left-a.width/2}px`);el.style.setProperty('--dy',`${b.top+b.height/2-a.top-a.height/2}px`);document.body.append(el);setTimeout(()=>el.remove(),850)}}
 $('homeTongits').onclick=()=>{if(typeof game!=="undefined"&&game){navigate('gameScreen');renderGame()}else{showFreshSetup();navigate('setupScreen');$('setupScreen').querySelector('h1').textContent='Tongits'}};
 $('homeTongitsResume').onclick=()=>{navigate('gameScreen');renderGame()};
 $('homeMahjong').onclick=async()=>{if(state){if(!await window.GameNightUI.confirm('Replace the current Mahjong session?','New Mahjong Game','New Game',true))return;state=null}rules=E.defaults();count=4;setup()};
 $('homeMahjongResume').onclick=showGame;
 $('mjBackHome').onclick=window.GameNightHome;$('mjGameHome').onclick=window.GameNightHome;
 $('tongitsSetupHome').onclick=window.GameNightHome;$('tongitsGameHome').onclick=window.GameNightHome;
 $('mjMinus').onclick=()=>{count=Math.max(2,count-1);$('mjPlayerCount').textContent=count;renderNames()};$('mjPlus').onclick=()=>{count=Math.min(4,count+1);$('mjPlayerCount').textContent=count;renderNames()};$('mjNames').addEventListener('input',e=>{if(e.target.matches('[data-mj-name]'))setupPlayers[+e.target.dataset.mjName].name=e.target.value});
 $('mjPotEnabled').onchange=()=>{$('mjPotOptions').hidden=!$('mjPotEnabled').checked};
 $('mjBonusEditor').addEventListener('input',editBonus);$('mjBonusEditor').addEventListener('change',editBonus);$('mjBonusEditor').addEventListener('click',editBonus);['input','change','click'].forEach(evt=>$('mjSettingsBonusEditor').addEventListener(evt,editBonus));
 $('mjAddBonus').onclick=()=>{rules.bonuses.push({id:'b'+Date.now(),name:'New Bonus',amount:2,scope:'all'});renderBonusEditor()};
 $('mjStart').onclick=()=>{try{readRules();state=E.start(setupPlayers.slice(0,count).map(x=>x.name),rules,$('mjCurrency').value);state.players.forEach((p,i)=>p.avatar=structuredClone(setupPlayers[i].avatar));save();showGame()}catch(e){window.GameNightUI.notice(e.message)}};
 $('mjWinner').onchange=()=>{refreshPayer();preview()};$('mjPaymentMode').onchange=()=>{refreshPayer();preview()};$('mjPayer').onchange=preview;$('mjWinBase').oninput=preview;
 $('mjWinBonuses').onchange=e=>{if(e.target.dataset.bonus){selectedBonuses=[...$('mjWinBonuses').querySelectorAll('input:checked')].map(x=>x.dataset.bonus);renderWinBonuses();refreshPayer();preview()}};
 $('mjRecord').onclick=()=>{try{const winner=+$('mjWinner').value, payer=+$('mjPayer').value;const transfers=E.round(state,{winner,payer,payment:$('mjPaymentMode').value,base:$('mjWinBase').value,bonusIds:selectedBonuses});animate(transfers);save();closeAction();setTimeout(renderGame,520)}catch(e){window.GameNightUI.notice(e.message)}};
 $('mjAward').onclick=async()=>{try{const winner=+$('mjPotWinner').value;if(!await window.GameNightUI.confirm(`Award ${fmt(state.pot)} to ${state.players[winner].name}?`,'Award Mahjong Pot','Award Pot'))return;E.awardPot(state,winner);if(typeof playSoundEffect==='function')playSoundEffect('potwin');save();renderGame()}catch(e){window.GameNightUI.notice(e.message)}};
 $('mjQuickPay').onclick=()=>{try{const t=E.quickPay(state,+$('mjPayFrom').value,+$('mjPayTo').value,$('mjPayAmount').value);animate([t]);save();closeAction();setTimeout(renderGame,520)}catch(e){window.GameNightUI.notice(e.message)}};
 $('mjUndo').onclick=async()=>{if(!await window.GameNightUI.confirm('Undo the last Mahjong action?','Undo Action','Undo'))return;try{E.undo(state);save();renderGame()}catch(e){window.GameNightUI.notice(e.message)}};
 function prepareMahjongRules(){const panel=$('mjSettings');panel.classList.remove('hidden');rules=structuredClone(state.rules);$('mjSettingsBase').value=rules.base;$('mjSettingsPayment').value=rules.payment;$('mjSettingsPotEnabled').checked=rules.potEnabled;$('mjSettingsPerRound').value=rules.perRound;renderBonusEditor('mjSettingsBonusEditor')};$('mjSettingsAddBonus').onclick=()=>{rules.bonuses.push({id:'b'+Date.now(),name:'New Bonus',amount:2,scope:'all'});renderBonusEditor('mjSettingsBonusEditor')};
 $('mjSaveSettings').onclick=()=>{rules.base=Math.max(0,L.round($('mjSettingsBase').value));rules.payment=$('mjSettingsPayment').value;rules.potEnabled=$('mjSettingsPotEnabled').checked;rules.perRound=Math.max(0,L.round($('mjSettingsPerRound').value));if(state.rules.potEnabled&&!rules.potEnabled&&state.pot>0){window.GameNightUI.notice('Award the remaining pot before disabling it.');return}if(!state.rules.potEnabled&&rules.potEnabled){rules.initial=0;window.GameNightUI.notice('Pot enabled. Initial contributions are not retroactively collected; future round contributions will apply.')}state.rules=structuredClone(rules);save();closeMjDialog('mjSettingsDialog');renderGame()};
 $('mjSettlement').onclick=()=>{if(state.pot>0){window.GameNightUI.notice(`There is still ${fmt(state.pot)} in the pot. Award it before final settlement.`);return}const payments=L.settlement(state.players);$('mjSettlementList').innerHTML=payments.map(t=>`<div>${esc(state.players[t.from].name)} → ${esc(state.players[t.to].name)} <b>${fmt(t.amount)}</b></div>`).join('')||'Everyone is settled.';$('mjSettlementDialog').classList.remove('hidden')};
 $('mjCloseSettlement').onclick=()=>$('mjSettlementDialog').classList.add('hidden');

 // Mahjong rules and settings use the same iOS-style header controls as Tongits.
 const mjSettingsHome={parent:$('mjSettings').parentNode,next:$('mjSettings').nextSibling};
 $('mjSettingsSlot').appendChild($('mjSettings'));
 const openMjDialog=id=>$(id).classList.remove('hidden');
 const closeMjDialog=id=>$(id).classList.add('hidden');
 document.querySelectorAll('[data-mj-dismiss]').forEach(b=>b.addEventListener('click',()=>closeMjDialog(b.dataset.mjDismiss)));
 ['mjRulesDialog','mjSettingsDialog','mjFunDialog','mjAvatarDialog'].forEach(id=>$(id).addEventListener('click',e=>{if(e.target===$(id))closeMjDialog(id)}));
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
 $('mjTheme').onchange=e=>{if(typeof applyTheme==='function')applyTheme(e.target.value);else document.body.dataset.theme=e.target.value;};
 for(const [id,key] of Object.entries({mjFunEnabled:'enabled',mjFunLanguage:'language',mjFunIntensity:'intensity',mjFunVoice:'voice',mjFunRandom:'random',mjFunVoiceChoice:'voiceChoice'})){
  $(id).addEventListener('change',e=>{
   if(typeof funMode==='undefined')return;
   funMode[key]=e.target.type==='checkbox'?e.target.checked:e.target.value;
   funSave();funSync();syncMjFun();
  });
 }
 let mjFunTarget=-1;
 $('mjCards').addEventListener('click',e=>{const avatar=e.target.closest('[data-mj-soundboard]');if(!avatar||typeof funMode==='undefined'||!funMode.enabled)return;mjFunTarget=+avatar.dataset.mjSoundboard;const name=state.players[mjFunTarget].name;$('mjFunTitle').textContent=`🎭 ${name}`;$('mjFunCustomLine').value=funMode.playerLines[`mahjong:${mjFunTarget}:${name}`]||'';openMjDialog('mjFunDialog')});
 // Shared player avatar picker is available ONLY in New Mahjong Game setup.
 let mjAvatarTarget=-1;
 $('mjNames').addEventListener('click',e=>{
  const button=e.target.closest('[data-mj-setup-avatar]');if(!button)return;
  mjAvatarTarget=Number(button.dataset.mjSetupAvatar);
  $('mjAvatarTitle').textContent=`Player ${mjAvatarTarget+1} · Avatar`;
  GameNightAvatar.renderChoices($('mjAvatarEmojis'),setupPlayers[mjAvatarTarget].avatar,avatar=>{
   setupPlayers[mjAvatarTarget].avatar=avatar;closeMjDialog('mjAvatarDialog');renderNames();
  });
  $('mjAvatarFile').value='';openMjDialog('mjAvatarDialog');
 });
 $('mjAvatarReset').onclick=()=>{if(mjAvatarTarget<0)return;setupPlayers[mjAvatarTarget].avatar=GameNightAvatar.emoji(GameNightAvatar.defaults[mjAvatarTarget%4]);closeMjDialog('mjAvatarDialog');renderNames()};
 $('mjAvatarFile').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file||mjAvatarTarget<0)return;
  try{const data=await GameNightAvatar.resizePhoto(file);setupPlayers[mjAvatarTarget].avatar={type:'photo',value:data};closeMjDialog('mjAvatarDialog');renderNames()}
  catch(err){window.GameNightUI.notice(err.message||'Unable to load photo.')}finally{e.target.value=''}
 });
 $('mjFunCustomLine').oninput=e=>{if(mjFunTarget<0)return;funMode.playerLines[`mahjong:${mjFunTarget}:${state.players[mjFunTarget].name}`]=e.target.value;funSave()};
 $('mjClipGrid').addEventListener('click',e=>{const btn=e.target.closest('[data-mj-clip]');if(btn && typeof funMode!=='undefined' && funMode.enabled)gnPlayClip(btn.dataset.mjClip,{manual:true});});
 document.querySelectorAll('[data-mj-fun]').forEach(btn=>btn.onclick=()=>{if(mjFunTarget<0)return;const type=btn.dataset.mjFun,name=state.players[mjFunTarget].name;if(type==='stop'){if('speechSynthesis' in window)speechSynthesis.cancel();gnStopClip();return}if(['crickets','laugh','clap','hype'].includes(type))funEffects(type);let line='';if(type==='custom')line=($('mjFunCustomLine').value||'Hey {name}, hurry up!').replaceAll('{name}',name);else if(['hurry','roast','hype'].includes(type))line=funLine(type,name);if(line)funSpeak(line)});
 $('mjFunTest').onclick=()=>{if(typeof funSpeak==='function')funSpeak('Hoy, welcome to Mahjong! Bilisan mo, please!')};
 $('mjNewGame').onclick=async()=>{if(state&&!await window.GameNightUI.confirm('Your current Mahjong game and history will be replaced when you start a new game.','New Mahjong Game','New Game',true))return;closeMjDialog('mjSettingsDialog');setup()};
 $('mjClearGame').onclick=async()=>{
  if(!await window.GameNightUI.confirm('Delete the Mahjong session and history? Other games and shared preferences remain saved.','Clear Mahjong Data','Delete Mahjong',true))return;
  try{localStorage.removeItem('gameNightMahjongV1')}catch(error){window.GameNightUI.notice('Unable to clear Mahjong data from this device.');return}
  state=null;closeMjDialog('mjSettingsDialog');window.GameNightSharedSettings?.restore();window.GameNightHome();
 };

 
})();
