/* Mahjong controller and view. Shared ledger, independent rules + saved session. */
(function(){
 const E=window.MahjongEngine,L=window.GameNightLedger;
 const $=id=>document.getElementById(id),esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let state=null, count=4, rules=E.defaults(), selectedBonuses=[];
 const fmt=n=>`${state?.currency||$('mjCurrency').value}${L.round(n)}`;
 function status(msg){$('mjStatus').textContent=msg||''}
 function navigate(screen){if(actionOpen)closeAction();['homeScreen','setupScreen','gameScreen','mahjongSetupScreen','mahjongGameScreen'].forEach(id=>$(id).classList.toggle('hidden',id!==screen));window.scrollTo(0,0)}
 window.GameNightHome=()=>{navigate('homeScreen');$('homeTongitsResume').classList.toggle('hidden',!(typeof game!=="undefined"&&game));$('homeMahjongResume').classList.toggle('hidden',!state)};
 function save(){try{localStorage.setItem('gameNightMahjongV1',JSON.stringify(state))}catch(e){status('Unable to save Mahjong game. Check available device storage.')}}
 try{const raw=localStorage.getItem('gameNightMahjongV1');if(raw){const data=JSON.parse(raw);if(data?.type==='mahjong'&&Array.isArray(data.players))state=data;}}catch(e){console.warn('Mahjong save unavailable',e)}
 function setup(){count=state?.players?.length||4;rules=structuredClone(state?.rules||E.defaults());$('mjPlayerCount').textContent=count;renderNames();renderRules();navigate('mahjongSetupScreen')}
 function renderNames(){const old=[...document.querySelectorAll('.mj-name')].map(n=>n.value);$('mjNames').innerHTML=Array.from({length:count},(_,i)=>`<label class="mj-field">Player ${i+1}<input class="mj-name" maxlength="32" value="${esc(old[i]||state?.players?.[i]?.name||`Player ${i+1}`)}"></label>`).join('')}
 function renderRules(){ $('mjBase').value=rules.base;$('mjPayment').value=rules.payment;$('mjPotEnabled').checked=!!rules.potEnabled;$('mjInitial').value=rules.initial;$('mjPerRound').value=rules.perRound;$('mjPotAward').value=rules.potAward;$('mjPotOptions').hidden=!rules.potEnabled;renderBonusEditor()}
 function readRules(){rules.base=Math.max(0,L.round($('mjBase').value));rules.payment=$('mjPayment').value;rules.potEnabled=$('mjPotEnabled').checked;rules.initial=Math.max(0,L.round($('mjInitial').value));rules.perRound=Math.max(0,L.round($('mjPerRound').value));rules.potAward=$('mjPotAward').value}
 function renderBonusEditor(target='mjBonusEditor'){ $(target).innerHTML=rules.bonuses.map((b,i)=>`<div class="mj-bonus-edit"><input aria-label="Bonus name" data-field="name" data-i="${i}" value="${esc(b.name)}" maxlength="40"><input aria-label="Bonus amount" data-field="amount" data-i="${i}" type="number" min="0" step="1" value="${b.amount}"><select aria-label="Bonus payer rule" data-field="scope" data-i="${i}"><option value="all" ${b.scope==='all'?'selected':''}>Each payer</option><option value="one" ${b.scope==='one'?'selected':''}>One payer</option></select><button class="mj-remove" type="button" data-remove="${i}" aria-label="Remove bonus">−</button></div>`).join('')}
 function editBonus(e){const b=e.target.closest('[data-i]');if(b){const item=rules.bonuses[+b.dataset.i];if(item)item[b.dataset.field]=b.dataset.field==='amount'?Math.max(0,L.round(b.value)):b.value;}const remove=e.target.closest('[data-remove]');if(remove){rules.bonuses.splice(+remove.dataset.remove,1);renderBonusEditor(e.currentTarget.id)}}
 function showGame(){if(!state)return setup();navigate('mahjongGameScreen');renderGame()}
 function renderGame(){if(actionOpen)closeAction();const p=state.players;$('mjRound').textContent=`Round ${state.round+1}`;$('mjPotDisplay').textContent=state.rules.potEnabled?`🪙 Pot ${fmt(state.pot)}`:'No pot';$('mjPotPanel').hidden=!state.rules.potEnabled;$('mjCards').innerHTML=p.map((x,i)=>`<div class="mj-player"><div class="mj-face" data-mj-avatar="${i}" role="button" tabindex="0" aria-label="Soundboard for ${esc(x.name)}">${['😎','👩','🧑','😺'][i]}</div><strong>${esc(x.name)}</strong><b class="${x.balance<0?'mj-negative':'mj-positive'}">${x.balance>0?'+':''}${fmt(x.balance)}</b><button class="mj-player-win" type="button" data-mj-winner="${i}">🀄 WIN</button></div>`).join('');$('mjWinner').innerHTML=p.map((x,i)=>`<option value="${i}">${esc(x.name)}</option>`).join('');$('mjPayer').innerHTML=p.map((x,i)=>`<option value="${i}">${esc(x.name)}</option>`).join('');$('mjPayFrom').innerHTML=$('mjPayer').innerHTML;$('mjPayTo').innerHTML=$('mjPayer').innerHTML;$('mjPotWinner').innerHTML=$('mjPayer').innerHTML;$('mjPaymentMode').value=state.rules.payment==='one'?'one':'all';$('mjPaymentMode').querySelectorAll('option').forEach(o=>o.disabled=state.rules.payment!=='both'&&o.value!==state.rules.payment);$('mjWinBase').value=state.rules.base;selectedBonuses=[];renderWinBonuses();refreshPayer();preview();renderHistory();$('mjSettings').classList.add('hidden');status('')}
 function renderWinBonuses(){
  const bonuses=state.rules.bonuses||[];
  $('mjWinBonuses').innerHTML=bonuses.length?bonuses.map(b=>`<label class="mj-bonus-pick ${selectedBonuses.includes(b.id)?'is-selected':''}"><input type="checkbox" data-bonus="${esc(b.id)}" ${selectedBonuses.includes(b.id)?'checked':''}><span class="mj-bonus-check" aria-hidden="true">✓</span><span class="mj-bonus-info"><strong>${esc(b.name)}</strong><small>${fmt(b.amount)} · ${b.scope==='one'?'Selected payer':'Each payer'}</small></span></label>`).join(''):'<p class="mj-muted">No bonus types configured. Add them in Settings.</p>';
 }
 function refreshPayer(){const winner=+$('mjWinner').value,one=$('mjPaymentMode').value==='one';$('mjPayerWrap').hidden=!one&&!state.rules.bonuses.some(b=>selectedBonuses.includes(b.id)&&b.scope==='one');const options=[...$('mjPayer').options];options.forEach(o=>o.disabled=+o.value===winner);if(+$('mjPayer').value===winner)$('mjPayer').value=String(state.players.findIndex((_,i)=>i!==winner));}
 function preview(){const w=+$('mjWinner').value,p=+$('mjPayer').value,mode=$('mjPaymentMode').value,base=Math.max(0,L.round($('mjWinBase').value));const payers=mode==='all'?state.players.map((_,i)=>i).filter(i=>i!==w):[p];const sums=new Map();payers.forEach(i=>sums.set(i,base));for(const b of state.rules.bonuses.filter(b=>selectedBonuses.includes(b.id))){(b.scope==='one'?[p]:payers).forEach(i=>sums.set(i,L.round((sums.get(i)||0)+b.amount)))}$('mjPreview').innerHTML=[...sums].filter(([i])=>i!==w).map(([i,a])=>`<div>${esc(state.players[i].name)} → ${esc(state.players[w].name)} <b>${fmt(a)}</b></div>`).join('')||'No payment';}
 function renderHistory(){
  const name=i=>state.players[i]?.name||`Player ${Number(i)+1}`;
  const money=n=>fmt(n);
  const transferRows=transfers=>(transfers||[]).map(t=>`<div class="mj-history-transfer"><span>${esc(name(t.from))} <span aria-hidden="true">→</span> ${esc(name(t.to))}${t.reason&&t.reason!=='win'?` <small>(${esc(t.reason)})</small>`:''}</span><strong>${money(t.amount)}</strong></div>`).join('');
  const contributions=items=>items?.length?`<div class="mj-history-subtitle">Pot contributions</div>${items.map(c=>`<div class="mj-history-transfer"><span>${esc(name(c.i))} → Pot</span><strong>${money(c.amount)}</strong></div>`).join('')}`:'';
  $('mjHistory').innerHTML=state.history.slice().reverse().map(h=>{
   if(h.type==='initial')return `<article class="mj-history-entry"><div class="mj-history-heading"><strong>🪙 Initial Pot</strong><span>${money(h.pot)}</span></div>${contributions(h.entries)}</article>`;
   if(h.type==='round'){
    const total=(h.transfers||[]).reduce((sum,t)=>sum+Number(t.amount||0),0);
    const bonusText=(h.bonuses||[]).map(b=>esc(b.name)).join(', ');
    return `<article class="mj-history-entry"><div class="mj-history-heading"><strong>🀄 Round ${h.round} · ${esc(name(h.winner))} won</strong><span>+${money(total)}</span></div><div class="mj-history-meta">${h.payment==='one'?'Single payer':'Everyone pays'} · Base ${money(h.base)} per payer${bonusText?` · Bonuses: ${bonusText}`:''}</div><div class="mj-history-subtitle">Payments</div>${transferRows(h.transfers)||'<p class="mj-muted">No payments this round.</p>'}${contributions(h.contributions)}</article>`;
   }
   if(h.type==='potAward')return `<article class="mj-history-entry"><div class="mj-history-heading"><strong>🏆 Pot awarded</strong><span>${money(h.amount)}</span></div><div class="mj-history-transfer"><span>Pot → ${esc(name(h.winner))}</span><strong>${money(h.amount)}</strong></div></article>`;
   if(h.type==='quickPay')return `<article class="mj-history-entry"><div class="mj-history-heading"><strong>💸 Quick Pay</strong><span>${money((h.transfers||[]).reduce((n,t)=>n+Number(t.amount||0),0))}</span></div>${transferRows(h.transfers)}</article>`;
   return `<article class="mj-history-entry"><strong>${esc(h.type||'Event')}</strong></article>`;
  }).join('')||'<p class="mj-muted">No transactions yet. Recorded wins, bonuses, pot contributions and Quick Pay will appear here.</p>';
 }
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
 $('homeTongits').onclick=()=>{if(typeof game!=="undefined"&&game){navigate('gameScreen');renderGame()}else{showFreshSetup();$('setupScreen').querySelector('h1').textContent='Tongits'}};
 $('homeTongitsResume').onclick=()=>{navigate('gameScreen');renderGame()};
 $('homeMahjong').onclick=()=>{if(state){if(!confirm('Start a new Mahjong game? Your current Mahjong session will be replaced.'))return;state=null}rules=E.defaults();count=4;setup()};
 $('homeMahjongResume').onclick=showGame;
 $('mjBackHome').onclick=window.GameNightHome;$('mjGameHome').onclick=window.GameNightHome;
 $('tongitsSetupHome').onclick=window.GameNightHome;$('tongitsGameHome').onclick=window.GameNightHome;
 $('mjMinus').onclick=()=>{count=Math.max(2,count-1);$('mjPlayerCount').textContent=count;renderNames()};$('mjPlus').onclick=()=>{count=Math.min(4,count+1);$('mjPlayerCount').textContent=count;renderNames()};
 $('mjPotEnabled').onchange=()=>{$('mjPotOptions').hidden=!$('mjPotEnabled').checked};
 $('mjBonusEditor').addEventListener('input',editBonus);$('mjBonusEditor').addEventListener('change',editBonus);$('mjBonusEditor').addEventListener('click',editBonus);['input','change','click'].forEach(evt=>$('mjSettingsBonusEditor').addEventListener(evt,editBonus));
 $('mjAddBonus').onclick=()=>{rules.bonuses.push({id:'b'+Date.now(),name:'New Bonus',amount:2,scope:'all'});renderBonusEditor()};
 $('mjStart').onclick=()=>{try{readRules();state=E.start([...document.querySelectorAll('.mj-name')].map(x=>x.value),rules,$('mjCurrency').value);save();showGame()}catch(e){alert(e.message)}};
 $('mjWinner').onchange=()=>{refreshPayer();preview()};$('mjPaymentMode').onchange=()=>{refreshPayer();preview()};$('mjPayer').onchange=preview;$('mjWinBase').oninput=preview;
 $('mjWinBonuses').onchange=e=>{if(e.target.dataset.bonus){selectedBonuses=[...$('mjWinBonuses').querySelectorAll('input:checked')].map(x=>x.dataset.bonus);renderWinBonuses();refreshPayer();preview()}};
 $('mjRecord').onclick=()=>{try{const winner=+$('mjWinner').value, payer=+$('mjPayer').value;const transfers=E.round(state,{winner,payer,payment:$('mjPaymentMode').value,base:$('mjWinBase').value,bonusIds:selectedBonuses});animate(transfers);save();closeAction();setTimeout(renderGame,520)}catch(e){alert(e.message)}};
 $('mjAward').onclick=()=>{try{const winner=+$('mjPotWinner').value;if(!confirm(`Award ${fmt(state.pot)} to ${state.players[winner].name}?`))return;E.awardPot(state,winner);save();renderGame()}catch(e){alert(e.message)}};
 $('mjQuickPay').onclick=()=>{try{const t=E.quickPay(state,+$('mjPayFrom').value,+$('mjPayTo').value,$('mjPayAmount').value);animate([t]);save();closeAction();setTimeout(renderGame,520)}catch(e){alert(e.message)}};
 $('mjUndo').onclick=()=>{if(!confirm('Undo the last Mahjong action?'))return;try{E.undo(state);save();renderGame()}catch(e){alert(e.message)}};
 function prepareMahjongRules(){const panel=$('mjSettings');panel.classList.remove('hidden');rules=structuredClone(state.rules);$('mjSettingsBase').value=rules.base;$('mjSettingsPayment').value=rules.payment;$('mjSettingsPotEnabled').checked=rules.potEnabled;$('mjSettingsPerRound').value=rules.perRound;renderBonusEditor('mjSettingsBonusEditor')};$('mjSettingsAddBonus').onclick=()=>{rules.bonuses.push({id:'b'+Date.now(),name:'New Bonus',amount:2,scope:'all'});renderBonusEditor('mjSettingsBonusEditor')};
 $('mjSaveSettings').onclick=()=>{rules.base=Math.max(0,L.round($('mjSettingsBase').value));rules.payment=$('mjSettingsPayment').value;rules.potEnabled=$('mjSettingsPotEnabled').checked;rules.perRound=Math.max(0,L.round($('mjSettingsPerRound').value));if(state.rules.potEnabled&&!rules.potEnabled&&state.pot>0){alert('Award the remaining pot before disabling it.');return}if(!state.rules.potEnabled&&rules.potEnabled){rules.initial=0;alert('Pot enabled. Initial contributions are not retroactively collected; future round contributions will apply.')}state.rules=structuredClone(rules);save();closeMjDialog('mjSettingsDialog');renderGame()};
 $('mjSettlement').onclick=()=>{if(state.pot>0){alert(`There is still ${fmt(state.pot)} in the pot. Award it before final settlement.`);return}const payments=L.settlement(state.players);$('mjSettlementList').innerHTML=payments.map(t=>`<div>${esc(state.players[t.from].name)} → ${esc(state.players[t.to].name)} <b>${fmt(t.amount)}</b></div>`).join('')||'Everyone is settled.';$('mjSettlementDialog').classList.remove('hidden')};
 $('mjCloseSettlement').onclick=()=>$('mjSettlementDialog').classList.add('hidden');

 // Mahjong rules and settings use the same iOS-style header controls as Tongits.
 const mjSettingsHome={parent:$('mjSettings').parentNode,next:$('mjSettings').nextSibling};
 $('mjSettingsSlot').appendChild($('mjSettings'));
 const openMjDialog=id=>$(id).classList.remove('hidden');
 const closeMjDialog=id=>$(id).classList.add('hidden');
 document.querySelectorAll('[data-mj-dismiss]').forEach(b=>b.addEventListener('click',()=>closeMjDialog(b.dataset.mjDismiss)));
 ['mjRulesDialog','mjSettingsDialog','mjFunDialog'].forEach(id=>$(id).addEventListener('click',e=>{if(e.target===$(id))closeMjDialog(id)}));
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
 $('mjCards').addEventListener('click',e=>{const avatar=e.target.closest('[data-mj-avatar]');if(!avatar||typeof funMode==='undefined'||!funMode.enabled)return;mjFunTarget=+avatar.dataset.mjAvatar;const name=state.players[mjFunTarget].name;$('mjFunTitle').textContent=`🎭 ${name}`;$('mjFunCustomLine').value=funMode.playerLines[`mahjong:${mjFunTarget}:${name}`]||'';openMjDialog('mjFunDialog')});
 $('mjFunCustomLine').oninput=e=>{if(mjFunTarget<0)return;funMode.playerLines[`mahjong:${mjFunTarget}:${state.players[mjFunTarget].name}`]=e.target.value;funSave()};
 document.querySelectorAll('[data-mj-fun]').forEach(btn=>btn.onclick=()=>{if(mjFunTarget<0)return;const type=btn.dataset.mjFun,name=state.players[mjFunTarget].name;if(type==='stop'){if('speechSynthesis' in window)speechSynthesis.cancel();return}if(['crickets','laugh','clap','hype'].includes(type))funEffects(type);let line='';if(type==='custom')line=($('mjFunCustomLine').value||'Hey {name}, hurry up!').replaceAll('{name}',name);else if(['hurry','roast','hype'].includes(type))line=funLine(type,name);if(line)funSpeak(line)});
 $('mjFunTest').onclick=()=>{if(typeof funSpeak==='function')funSpeak('Hoy, welcome to Mahjong! Bilisan mo, please!')};
 $('mjClearGame').onclick=()=>{
  if(!confirm('Delete this Mahjong session and its history? Tongits data will not be affected.'))return;
  state=null;localStorage.removeItem('gameNightMahjongV1');closeMjDialog('mjSettingsDialog');window.GameNightHome();
 };

 
})();
