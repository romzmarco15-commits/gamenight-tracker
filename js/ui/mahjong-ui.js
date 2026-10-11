/* Mahjong view only: markup, history, player setup and bonus rendering.
   No game rules, storage, navigation or event listeners live in this module. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 window.MahjongUI={create({getState,getRules,getSetupPlayers,getCount,getSelectedBonuses,fmt}){
  const L=window.GameNightLedger;
  // Each render reads the current controller values, avoiding stale snapshots.
  let state,rules,setupPlayers,count,selectedBonuses;
  const refresh=()=>{state=getState();rules=getRules();setupPlayers=getSetupPlayers();count=getCount();selectedBonuses=getSelectedBonuses()};

 function renderNames(){
  refresh();
  $('mjNames').innerHTML=Array.from({length:count},(_,i)=>{
   const p=setupPlayers[i]||(setupPlayers[i]={name:`Player ${i+1}`,avatar:GameNightAvatar.emoji(GameNightAvatar.defaults[i%4])});
   return `<div class="setup-card mj-setup-player"><div class="setup-player-header"><div class="setup-avatar-wrapper"><button type="button" class="setup-avatar-button gn-avatar-button" data-mj-setup-avatar="${i}" aria-label="Choose Player ${i+1} photo or emoji">${GameNightAvatar.markup(p.avatar)}</button><div class="avatar-edit-badge">📷</div></div><h3>Player ${i+1}</h3></div><label class="mj-field">Name<input class="mj-name" data-mj-name="${i}" maxlength="32" value="${esc(p.name)}"></label></div>`;
  }).join('');
 }

 function renderBonusEditor(target='mjBonusEditor'){
  refresh(); $(target).innerHTML=rules.bonuses.map((b,i)=>`<div class="mj-bonus-edit"><input aria-label="Bonus name" data-field="name" data-i="${i}" value="${esc(b.name)}" maxlength="40"><input aria-label="Bonus amount" data-field="amount" data-i="${i}" type="number" min="0" step="1" value="${b.amount}"><select aria-label="Bonus payer rule" data-field="scope" data-i="${i}"><option value="all" ${b.scope==='all'?'selected':''}>Each payer</option><option value="one" ${b.scope==='one'?'selected':''}>One payer</option></select><button class="mj-remove" type="button" data-remove="${i}" aria-label="Remove bonus">−</button></div>`).join('')}

 function renderWinBonuses(){
  refresh();
  const bonuses=state.rules.bonuses||[];
  $('mjWinBonuses').innerHTML=bonuses.length?bonuses.map(b=>`<label class="mj-bonus-pick ${selectedBonuses.includes(b.id)?'is-selected':''}"><input type="checkbox" data-bonus="${esc(b.id)}" ${selectedBonuses.includes(b.id)?'checked':''}><span class="mj-bonus-check" aria-hidden="true">✓</span><span class="mj-bonus-info"><strong>${esc(b.name)}</strong><small>${fmt(b.amount)} · ${b.scope==='one'?'Selected payer':'Each payer'}</small></span></label>`).join(''):'<p class="mj-muted">No bonus types configured. Add them in Settings.</p>';
 }

 function renderHistory(){
  refresh();
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

 function playerCards(p){
  refresh();
  return p.map((x,i)=>`<div class="mj-player"><div class="mj-avatar-wrap"><span class="mj-face gn-avatar-display">${GameNightAvatar.markup(x.avatar||GameNightAvatar.emoji(GameNightAvatar.defaults[i%4]))}</span><button class="mj-avatar-fun" type="button" data-mj-soundboard="${i}" aria-label="Soundboard for ${esc(x.name)}" title="Fun Mode">🎭</button></div><strong>${esc(x.name)}</strong><b class="${x.balance<0?'mj-negative':'mj-positive'}">${x.balance>0?'+':''}${fmt(x.balance)}</b><button class="mj-player-win" type="button" data-mj-winner="${i}">🀄 WIN</button></div>`).join('');
 }
 return {renderNames,renderBonusEditor,renderWinBonuses,renderHistory,playerCards};
 }};
})();
