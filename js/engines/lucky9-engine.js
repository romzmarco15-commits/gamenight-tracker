/* Lucky 9 rules and ledger operations. No DOM or UI dependencies. */
(function(root){
'use strict';
function assert(ok,message){if(!ok)throw new Error(message)}
function validIndex(players,i){return Number.isInteger(i)&&i>=0&&i<players.length}
function compactSnapshot(state){
 return JSON.stringify({round:state.round,pot:state.pot,streak:state.streak,lastWinner:state.lastWinner,banker:state.banker,balances:state.players.map(p=>p.balance)});
}
function compactHistory(state){
 if(!Array.isArray(state?.history))return false;let changed=false;
 for(const entry of state.history){
  if(typeof entry.before!=='string')continue;
  try{const old=JSON.parse(entry.before);if(Array.isArray(old.players)){
   entry.before=JSON.stringify({round:old.round,pot:old.pot,streak:old.streak,lastWinner:old.lastWinner,banker:old.banker,balances:old.players.map(p=>p.balance)});changed=true;
  }}catch(e){console.warn('Invalid legacy Lucky 9 undo snapshot',e)}
 }return changed;
}
function applyRound(state,draft,ledger){
 assert(state&&Array.isArray(state.players)&&state.players.length>=2,'Invalid Lucky 9 game');
 const rules=state.rules,banker=rules.bankerEnabled?Number(draft.banker):-1;
 assert(!rules.bankerEnabled||validIndex(state.players,banker),'Choose a valid banker');
 const needsWinner=rules.potEnabled||banker<0;
 const winner=needsWinner?Number(draft.winner):null;
 assert(!needsWinner||validIndex(state.players,winner),'Select the round winner');
 const bet=Number(rules.bet),potAmount=Number(rules.potAmount);
 assert(Number.isFinite(bet)&&bet>=0,'Invalid bet');
 assert(!rules.potEnabled||(Number.isFinite(potAmount)&&potAmount>=0&&Number.isInteger(rules.streakTarget)&&rules.streakTarget>=1),'Invalid jackpot rules');
 const before=compactSnapshot(state),transfers=[],contributions=[];
 if(banker>=0){
  for(let i=0;i<state.players.length;i++){
   if(i===banker)continue;
   const result=draft.results?.[i];
   assert(['win','lose','tie'].includes(result),'Choose a result for every player');
   if(result==='win')transfers.push(ledger.transfer(state.players,banker,i,bet));
   else if(result==='lose')transfers.push(ledger.transfer(state.players,i,banker,bet));
  }
  state.banker=banker;
 }else{
  state.players.forEach((p,i)=>{if(i!==winner)transfers.push(ledger.transfer(state.players,i,winner,bet))});
 }
 if(rules.potEnabled){
  state.players.forEach((p,i)=>{state.pot=ledger.contribute(state.players,state.pot,i,potAmount);contributions.push({i,amount:potAmount})});
  state.streak=state.lastWinner===winner?state.streak+1:1;
  state.lastWinner=winner;
 }else{state.streak=0;state.lastWinner=null}
 let award=0;
 if(rules.potEnabled&&state.streak>=rules.streakTarget){
  award=state.pot;state.pot=ledger.award(state.players,state.pot,winner);
  state.streak=0;state.lastWinner=null;
 }
 const round=state.round++;
 const entry={type:'round',round,winner,banker,transfers,contributions,award,before};
 state.history.push(entry);
 assert(Math.abs(state.players.reduce((s,p)=>s+p.balance,0)+state.pot)<0.011,'Lucky 9 ledger imbalance');
 return entry;
}
function quickPay(state,from,to,amount,ledger){
 assert(validIndex(state.players,from)&&validIndex(state.players,to)&&from!==to,'Choose two different players');
 assert(Number.isFinite(amount)&&amount>0,'Enter a positive amount');
 const before=compactSnapshot(state);
 const transfer=ledger.transfer(state.players,from,to,amount);
 const entry={type:'quickPay',from,to,amount,before};state.history.push(entry);
 return {entry,transfer};
}
function undo(state){
 const last=state.history.at(-1);if(!last?.before)return null;
 const before=JSON.parse(last.before);
 if(!Array.isArray(before.balances)){return before} // older saved format
 if(before.balances.length!==state.players.length)throw Error('Player count changed; cannot undo');
 const restored={...state,round:before.round,pot:before.pot,streak:before.streak,lastWinner:before.lastWinner,banker:before.banker,history:state.history.slice(0,-1),players:state.players.map((p,i)=>({...p,balance:before.balances[i]}))};
 return restored;
}
root.GameNightLucky9Engine=Object.freeze({applyRound,quickPay,undo,compactHistory});
})(window);
