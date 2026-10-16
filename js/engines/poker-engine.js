/* Game Night Poker — isolated zero-start, action-by-action ledger. */
(function(){'use strict';
const clone=o=>JSON.parse(JSON.stringify(o));
const cash=n=>Math.round((Number(n)||0)*100)/100;
function start(names,opts={}){if(names.length<2||names.length>8)throw Error('Choose 2–8 players.');return {type:'poker',players:names.map((p,i)=>({name:p.name||`Player ${i+1}`,avatar:p.avatar||{type:'emoji',value:'😎'},balance:0})),currency:opts.currency||'S$',small:cash(opts.small||1),big:cash(opts.big||2),dealer:0,hand:0,street:0,handState:null,history:[],undo:[],prefs:{table:false,confirm:true,autoTurn:true,rotate:true,locked:false,animation:true,actionSounds:true},seats:names.map((_,i)=>i)};}
const stages=['Pre-flop','Flop','Turn','River'];
// Compact undo snapshots: never copy history or earlier undo entries.
// Store only the gameplay state plus the previous history length.
function savepoint(s){
 const snapshot={_compactUndo:2,players:s.players.map(p=>({...p})),dealer:s.dealer,hand:s.hand,street:s.street,handState:clone(s.handState),historyLength:s.history.length};
 s.undo.push(snapshot);
 if(s.undo.length>30)s.undo.shift();
}
function undo(s){
 if(!s.undo.length)throw Error('Nothing to undo.');
 const snapshot=s.undo.pop();
 const old=typeof snapshot==='string'?JSON.parse(snapshot):snapshot;
 if(old._compactUndo===2){
   s.players=old.players;s.dealer=old.dealer;s.hand=old.hand;s.street=old.street;s.handState=old.handState;
   s.history.length=Math.min(s.history.length,old.historyLength);
 }else{
   // Compatibility with saved undo entries from previous Poker builds.
   const stack=s.undo;Object.assign(s,old);s.undo=stack;
 }
 return s;
}
function next(s,from){const h=s.handState;for(let k=1;k<=s.players.length;k++){const i=(from+k)%s.players.length;if(!h.folded[i]&&!h.allin[i])return i}return -1;}
function begin(s){if(s.handState)throw Error('Finish the current hand first.');savepoint(s);const n=s.players.length;const small=n===2?s.dealer:(s.dealer+1)%n,big=n===2?(s.dealer+1)%n:(s.dealer+2)%n;const h={contrib:Array(n).fill(0),streetContrib:Array(n).fill(0),folded:Array(n).fill(false),allin:Array(n).fill(false),current:0,turn:0,actions:[],street:0,acted:Array(n).fill(false)};s.hand++;s.street=0;s.handState=h;const post=(i,amount,label)=>{h.contrib[i]=cash(h.contrib[i]+amount);h.streetContrib[i]=cash(h.streetContrib[i]+amount);h.actions.push({player:i,type:label,amount,street:0})};post(small,s.small,'Small blind');post(big,s.big,'Big blind');h.current=s.big;h.turn=next(s,big);return h;}
function action(s,i,type,amount=0){const h=s.handState;if(!h)throw Error('Start a hand first.');if(!Number.isInteger(i)||i<0||i>=s.players.length)throw Error('Invalid player.');if(h.folded[i]||h.allin[i])throw Error('Player is folded or all-in.');if(!['check','call','bet','raise','fold','allin'].includes(type))throw Error('Invalid action.');const owing=cash(Math.max(0,h.current-h.streetContrib[i]));let add=0;
if(type==='check'&&owing>0)throw Error('Cannot check while a call is due.');
if(type==='call')add=owing;
if(type==='bet'||type==='raise'){add=cash(amount);if(add<=0)throw Error('Enter a positive amount.');if(type==='bet'&&h.current>0)throw Error('Use Raise when there is already a bet.');if(type==='raise'&&add<=owing)throw Error('Raise must exceed the call amount.');}
if(type==='allin'){add=cash(amount);if(add<=0)throw Error('Enter the amount of chips going all-in.');}
if(!Number.isFinite(add)||add<0||add>100000000)throw Error('Invalid amount.');savepoint(s);
if(type==='fold')h.folded[i]=true;else{h.contrib[i]=cash(h.contrib[i]+add);h.streetContrib[i]=cash(h.streetContrib[i]+add);if(type==='allin')h.allin[i]=true;if(h.streetContrib[i]>h.current)h.current=h.streetContrib[i];}
h.actions.push({player:i,type,amount:add,street:h.street});
if(!h.acted)h.acted=Array(s.players.length).fill(false);
h.acted[i]=true;
if((type==='raise'||type==='bet'||(type==='allin'&&h.streetContrib[i]>owing))&&h.streetContrib[i]>=h.current){h.acted=h.acted.map((v,j)=>j===i);}
h.turn=next(s,i);return add;}
function street(s){const h=s.handState;if(!h)throw Error('No hand in progress.');if(h.street>=3)throw Error('Already at River.');savepoint(s);h.street++;s.street=h.street;h.streetContrib=h.streetContrib.map(()=>0);h.current=0;h.acted=Array(s.players.length).fill(false);h.turn=next(s,s.dealer);h.actions.push({type:'street',street:h.street});}
function status(s){const h=s.handState;if(!h)return 'idle';const eligible=h.folded.map((f,i)=>!f?i:-1).filter(i=>i>=0);if(eligible.length<=1)return 'winner';const canAct=eligible.filter(i=>!h.allin[i]);if(canAct.length===0)return 'showdown';if(canAct.length===1 && eligible.some(i=>h.allin[i]) && h.streetContrib[canAct[0]]>=h.current)return 'showdown';const acted=h.acted||[];if(canAct.every(i=>acted[i]&&h.streetContrib[i]>=h.current))return h.street===3?'showdown':'street';return 'playing';}
function pots(s){const h=s.handState;if(!h)return[];const levels=[...new Set(h.contrib.filter(x=>x>0))].sort((a,b)=>a-b);let previous=0;return levels.map(level=>{const contributors=h.contrib.map((x,i)=>x>=level?i:-1).filter(i=>i>=0);const eligible=contributors.filter(i=>!h.folded[i]);const amount=cash((level-previous)*contributors.length);previous=level;return {amount,eligible,contributors};}).filter(p=>p.amount>0);}
function award(s,winners){const h=s.handState;if(!h)throw Error('No hand in progress.');const ps=pots(s),paid=Array(s.players.length).fill(0),assignments=[];for(let j=0;j<ps.length;j++){const p=ps[j];if(!p.eligible.length){if(p.contributors.length===1){paid[p.contributors[0]]=cash(paid[p.contributors[0]]+p.amount);assignments.push({amount:p.amount,winners:[p.contributors[0]],refund:true});continue;}throw Error('No eligible player for pot '+(j+1));}let ws=winners[j]||[];if(p.eligible.length===1)ws=[p.eligible[0]];if(!ws.length||ws.some(i=>!p.eligible.includes(i))||new Set(ws).size!==ws.length)throw Error('Choose valid winner(s) for pot '+(j+1));const cents=Math.round(p.amount*100),share=Math.floor(cents/ws.length),extra=cents%ws.length;ws.forEach((i,k)=>paid[i]=cash(paid[i]+(share+(k<extra?1:0))/100));assignments.push({amount:p.amount,winners:ws});}savepoint(s);h.contrib.forEach((x,i)=>s.players[i].balance=cash(s.players[i].balance-x+paid[i]));const entry={type:'hand',hand:s.hand,contributions:[...h.contrib],payouts:paid,assignments,actions:clone(h.actions),street:h.street};s.history.push(entry);s.handState=null;s.dealer=(s.dealer+1)%s.players.length;return entry;}
function quick(s,from,to,amount){amount=cash(amount);if(from===to||amount<=0||!s.players[from]||!s.players[to])throw Error('Select different players and a positive amount.');savepoint(s);s.players[from].balance=cash(s.players[from].balance-amount);s.players[to].balance=cash(s.players[to].balance+amount);s.history.push({type:'quick',from,to,amount});}
function settle(s){const owes=s.players.map((p,i)=>({i,b:cash(p.balance)})),debt=owes.filter(x=>x.b<0),credit=owes.filter(x=>x.b>0),out=[];let a=0,b=0;while(a<debt.length&&b<credit.length){const amt=cash(Math.min(-debt[a].b,credit[b].b));if(amt>0)out.push({from:debt[a].i,to:credit[b].i,amount:amt});debt[a].b=cash(debt[a].b+amt);credit[b].b=cash(credit[b].b-amt);if(debt[a].b>=0)a++;if(credit[b].b<=0)b++;}return out;}
window.GameNightPokerEngine={start,begin,action,street,pots,award,quick,undo,settle,stages,next,status};
})();
