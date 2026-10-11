/* Shared, game-independent virtual payment and final settlement primitives. */
window.GameNightLedger = Object.freeze({
  round(n){return Math.round((Number(n)||0)*100)/100},
  transfer(players,from,to,amount){
    const n=this.round(amount);
    if(!Number.isInteger(from)||!Number.isInteger(to)||from===to||!players[from]||!players[to]||n<0)throw Error('Invalid transfer');
    players[from].balance=this.round(players[from].balance-n);
    players[to].balance=this.round(players[to].balance+n);
    return {from,to,amount:n};
  },
  contribute(players,pot,playerIndex,amount){
    const n=this.round(amount);
    if(!players[playerIndex]||n<0)throw Error("Invalid pot contribution");
    players[playerIndex].balance=this.round(players[playerIndex].balance-n);
    return this.round(pot+n);
  },
  award(players,pot,winner){
    if(!players[winner]||pot<0)throw Error("Invalid pot award");
    players[winner].balance=this.round(players[winner].balance+pot);
    return 0;
  },
  settlement(players){
    const debtors=players.map((p,i)=>({i,value:this.round(-p.balance)})).filter(x=>x.value>0.001);
    const creditors=players.map((p,i)=>({i,value:this.round(p.balance)})).filter(x=>x.value>0.001);
    const payments=[];let a=0,b=0;
    while(a<debtors.length&&b<creditors.length){const n=this.round(Math.min(debtors[a].value,creditors[b].value));if(n>0)payments.push({from:debtors[a].i,to:creditors[b].i,amount:n});debtors[a].value=this.round(debtors[a].value-n);creditors[b].value=this.round(creditors[b].value-n);if(debtors[a].value<0.001)a++;if(creditors[b].value<0.001)b++;}
    return payments;
  }
});
