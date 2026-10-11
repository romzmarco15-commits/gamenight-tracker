/* Independent Filipino Mahjong rules engine. No Tongits globals used. */
(function(){
 const L=window.GameNightLedger;
 const defaults=()=>({base:10,payment:'both',potEnabled:false,initial:4,perRound:2,potAward:'manual',bonuses:[{id:'special',name:'Special Hand',amount:5,scope:'all'}]});
 function start(names,rules,currency){
   if(names.length<2||names.length>4||names.some(n=>!n.trim()))throw Error('Enter names for 2–4 players.');
   const s={type:'mahjong',version:1,currency,players:names.map(n=>({name:n.trim(),balance:0})),rules:structuredClone(rules),pot:0,round:0,history:[],finished:false};
   if(s.rules.potEnabled&&s.rules.initial>0){const entries=[];s.players.forEach((p,i)=>{s.pot=L.contribute(s.players,s.pot,i,s.rules.initial);entries.push({i,amount:s.rules.initial})});s.history.push({type:'initial',entries,pot:s.pot})}
   return s;
 }
 function round(s,params){
   if(s.finished)throw Error('Game already finished');
   const {winner,payment,payer,base,bonusIds=[]}=params;
   if(!s.players[winner])throw Error('Choose a winner');
   const payers=payment==='all'?s.players.map((_,i)=>i).filter(i=>i!==winner):[Number(payer)];
   if(payers.some(i=>!Number.isInteger(i)||i===winner||!s.players[i]))throw Error('Choose a valid paying player');
   const amount=L.round(base);if(amount<0)throw Error('Invalid amount');
   const bonuses=s.rules.bonuses.filter(b=>bonusIds.includes(b.id));
   if(bonuses.some(b=>b.scope==='one'&&(!Number.isInteger(Number(payer))||Number(payer)===winner||!s.players[Number(payer)])))throw Error('Select a valid payer for one-payer bonuses');
   const before=s.players.map(p=>p.balance),potBefore=s.pot;
   const transfers=[];
   for(const i of payers){if(amount>0)transfers.push({...L.transfer(s.players,i,winner,amount),reason:'win'});}
   for(const b of bonuses){const targets=b.scope==='one'?[Number(payer)]:payers;if(targets.some(i=>i===winner||!s.players[i]))throw Error('This bonus requires a selected paying player');for(const i of targets){if(b.amount>0)transfers.push({...L.transfer(s.players,i,winner,b.amount),reason:b.name})}}
   const contributions=[];
   if(s.rules.potEnabled&&s.rules.perRound>0){s.players.forEach((p,i)=>{s.pot=L.contribute(s.players,s.pot,i,s.rules.perRound);contributions.push({i,amount:s.rules.perRound})})}
   s.round++;
   s.history.push({type:'round',round:s.round,winner,payment,payer,base:amount,bonuses:bonuses.map(b=>({...b})),transfers,contributions,before,potBefore,at:Date.now()});
   return transfers;
 }
 function awardPot(s,winner){if(!s.rules.potEnabled||s.pot<=0||!s.players[winner])throw Error('No pot available to award');const before=s.players.map(p=>p.balance),amount=s.pot;s.pot=L.award(s.players,s.pot,winner);s.history.push({type:'potAward',winner,amount,before,potBefore:amount,at:Date.now()});return amount;}
 function quickPay(s,from,to,amount){const before=s.players.map(p=>p.balance),t=L.transfer(s.players,from,to,amount);s.history.push({type:'quickPay',transfers:[t],before,potBefore:s.pot,at:Date.now()});return t;}
 function undo(s){const last=s.history[s.history.length-1];if(!last||last.type==='initial')throw Error('Nothing to undo');s.history.pop();s.players.forEach((p,i)=>p.balance=last.before[i]);s.pot=last.potBefore;if(last.type==='round')s.round--;s.finished=false;return last;}
 window.MahjongEngine=Object.freeze({defaults,start,round,awardPot,quickPay,undo});
})();
