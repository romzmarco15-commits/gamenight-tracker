/* Interactive, visual-only jackpot selector; scoring is owned by Tongits engine. */
(function(){
"use strict";
const KEY="gameNightPotDesignV1";
const designs=[{id:"pot",name:"Classic Pot"},{id:"chest",name:"Treasure Chest"},{id:"bag",name:"Money Bag"},{id:"vault",name:"Jackpot Vault"},{id:"cash",name:"Cash Money Stack"}];
let index=0;
try{const saved=localStorage.getItem(KEY);const i=designs.findIndex(d=>d.id===saved);if(i>=0)index=i;}catch(_){}
function apply(){
 const visual=document.getElementById("jackpotVisual");
 if(visual){
  const design=designs[index].id;
  visual.dataset.design=design;
  const shell=visual.querySelector(".gn-art-shell");
  if(shell)shell.src="assets/jackpots/"+design+"-"+(visual.dataset.stage||"empty")+".svg?v=layered1";
 }
}
function set(id){const i=designs.findIndex(d=>d.id===id);if(i<0)return;index=i;try{localStorage.setItem(KEY,id)}catch(_){}apply();}
function cycle(delta){set(designs[(index+delta+designs.length)%designs.length].id);}
function shower(v,type){
 if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 v.classList.remove('gn-tap-bounce');void v.offsetWidth;v.classList.add('gn-tap-bounce');
 const cash=v.dataset.design==='cash';const count=type==='shower'?16:9;
 for(let i=0;i<count;i++){
  const coin=document.createElement('span');coin.className='gn-tap-coin';coin.classList.add(cash?'gn-particle-cash':v.dataset.design==='vault'?'gn-particle-bar':'gn-particle-coin');
  coin.style.setProperty('--x',`${Math.round((Math.random()-.5)*210)}px`);
  coin.style.setProperty('--y',`${Math.round(Math.random()*50)}px`);
  coin.style.setProperty('--spin',`${Math.round((Math.random()-.5)*550)}deg`);
  coin.style.setProperty('--delay',`${i*27}ms`);
  v.appendChild(coin);setTimeout(()=>coin.remove(),1450);
 }
 setTimeout(()=>v.classList.remove('gn-tap-bounce'),650);
}
function animate(type){const v=document.getElementById("jackpotVisual");if(!v)return;shower(v,type);v.classList.remove("gn-pot-jiggle","gn-pot-shower");void v.offsetWidth;v.classList.add(type==="shower"?"gn-pot-shower":"gn-pot-jiggle");clearTimeout(v._gnInteractTimer);v._gnInteractTimer=setTimeout(()=>v.classList.remove("gn-pot-jiggle","gn-pot-shower"),900);}
function init(){
 apply();
 const swipe=document.getElementById("gnPotSwipe");
 if(!swipe)return;
 let start=null,dragged=false,lastTap=0;
 swipe.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse"&&e.button!==0)return;start={x:e.clientX,y:e.clientY};dragged=false;});
 swipe.addEventListener("pointerup",e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.abs(dx)>38&&Math.abs(dx)>Math.abs(dy)*1.2){dragged=true;cycle(dx<0?1:-1);swipe.dataset.swiped="yes";setTimeout(()=>delete swipe.dataset.swiped,120);}});
 swipe.addEventListener("pointercancel",()=>{start=null});
 swipe.addEventListener("click",()=>{if(dragged||swipe.dataset.swiped==="yes"){dragged=false;return;}const now=Date.now();animate(now-lastTap<360?"shower":"jiggle");lastTap=now;});
 swipe.addEventListener("keydown",e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();cycle(e.key==="ArrowLeft"?-1:1);}else if(e.key==="Enter"||e.key===" "){e.preventDefault();animate("jiggle");}});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
window.GameNightPotDesign={get:()=>designs[index].id,set,apply,cycle,animate};
})();
