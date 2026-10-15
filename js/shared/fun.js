/* Optional Fun Mode: no external services, no changes to scores or game state. */
const FUN_KEY = 'tongitsFunModeV1';
const funDefaults = {enabled:false,language:'taglish',intensity:'savage',random:false,voice:true,custom:'',voiceChoice:'auto',playerLines:{}};
let funMode = {...funDefaults};
try { const saved=JSON.parse(localStorage.getItem(FUN_KEY)||'null'); if(saved && typeof saved==='object') funMode={...funDefaults,...saved}; } catch(_){}
if(!funMode.playerLines || typeof funMode.playerLines!=='object') funMode.playerLines={};
let funTarget=-1;
let funLastReaction=0;
let funRoundObserved=null;
function funSave(){try{localStorage.setItem(FUN_KEY,JSON.stringify(funMode));}catch(_){}}
function funSync(){
  const controls={funEnabled:'enabled',funLanguage:'language',funIntensity:'intensity',funRandom:'random',funVoice:'voice',funVoiceChoice:'voiceChoice'};
  Object.entries(controls).forEach(([id,key])=>{const el=document.getElementById(id);if(!el)return;if(el.type==='checkbox')el.checked=!!funMode[key];else el.value=funMode[key];if(key!=='enabled')el.disabled=!funMode.enabled;});
  const advanced=document.getElementById('funAdvanced');
  const toggle=document.getElementById('funEnabled');
  if(advanced){advanced.classList.toggle('is-open',funMode.enabled);advanced.setAttribute('aria-hidden',String(!funMode.enabled));}
  if(toggle)toggle.setAttribute('aria-expanded',String(funMode.enabled));
  document.querySelectorAll('[data-fun-avatar]').forEach(el=>el.classList.toggle('fun-avatar-active',funMode.enabled));
}
function funAvailableVoices(){
  if(!('speechSynthesis' in window))return [];
  return speechSynthesis.getVoices().filter(v=>/^(en|fil|tl)(-|$)/i.test(v.lang));
}
function funPopulateVoices(){
  const select=document.getElementById('funVoiceChoice');if(!select)return;
  const current=funMode.voiceChoice||'auto';
  select.replaceChildren(new Option('Automatic (English / Filipino)','auto'));
  funAvailableVoices().forEach(v=>select.add(new Option(`${v.name} (${v.lang})`,v.voiceURI)));
  if([...select.options].some(o=>o.value===current))select.value=current;
  else {select.value='auto';if(current!=='auto'){funMode.voiceChoice='auto';funSave();}}
  const help=document.getElementById('funVoiceHelp');
  if(help)help.textContent=funAvailableVoices().some(v=>/^(fil|tl)/i.test(v.lang))
    ? 'Filipino and English voices are available. You can select a specific voice above.'
    : 'No Filipino voice is installed on this device. English fallback is available; Tagalog pronunciation may vary.';
}
function funSpeak(line){
  if(!('speechSynthesis' in window))return;
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(line);
    const voices=funAvailableVoices();
    const explicit=voices.find(v=>v.voiceURI===funMode.voiceChoice);
    const preferred=funMode.language==='english'?'en':funMode.language==='tagalog'?'fil':'fil';
    const voice=explicit||voices.find(v=>v.lang.toLowerCase().startsWith(preferred))
      ||voices.find(v=>/^(tl|fil)/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang));
    if(voice){u.voice=voice;u.lang=voice.lang;}
    else u.lang=funMode.language==='english'?'en-US':'fil-PH';
    u.rate=1.02;u.pitch=1.09;u.volume=1;
    speechSynthesis.speak(u);
  }catch(_){}
}
// WebAudio sound effects with short, punchy envelopes; no external files or network.
function funSoundTone(ctx,freq,when,duration,volume=.18,type='triangle',endFreq){
  const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;
  o.frequency.setValueAtTime(freq,when);
  if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,when+duration);
  g.gain.setValueAtTime(.0001,when);
  g.gain.exponentialRampToValueAtTime(volume,when+.014);
  g.gain.exponentialRampToValueAtTime(.0001,when+duration);
  o.connect(g);g.connect(ctx.destination);o.start(when);o.stop(when+duration+.025);
}
function funEffects(type){
  try{
    if(type==='hype'){playSoundEffect('win');return;}
    const ctx=audioContext(),t=ctx.currentTime+.015;
    if(type==='crickets'){
      // Loud alternating cricket chirps with a repeating double-pulse pattern.
      for(let group=0;group<4;group++)for(let pulse=0;pulse<3;pulse++){
        const at=t+group*.48+pulse*.105;
        funSoundTone(ctx,2900,at,.095,.17,'square',3900);
        funSoundTone(ctx,4300,at+.018,.07,.095,'sine',3400);
      }
    }else if(type==='laugh'){
      // Cartoonish HA-HA-HA: falling voice-like pitches, rhythmic and louder.
      [0,.22,.44,.69,.91].forEach((d,i)=>{
        const base=[470,390,440,345,300][i];
        funSoundTone(ctx,base,t+d,.19,.27,'sawtooth',base*.72);
        funSoundTone(ctx,base*.52,t+d+.018,.14,.13,'triangle',base*.39);
      });
    }else if(type==='clap'){
      for(let i=0;i<4;i++){
        const at=t+i*.38;
        funSoundTone(ctx,220,at,.085,.25,'sawtooth',90);
        funSoundTone(ctx,840,at,.055,.12,'square',300);
      }
    }
  }catch(_){}
}
function funPlayerKey(index){
  const player=game?.players?.[index];return player?`${index}:${player.name}`:'';
}
function funLine(type,name){
  const lang=funMode.language;
  const lines={
    english:{hurry:`Hey ${name}, you're taking too long!`,hype:`Let's go ${name}! What a legend!`,roast:{friendly:`${name}, better luck next round!`,savage:`${name}, that's a skill issue!`,extra:`${name}, even the cards are disappointed in you!`}},
    taglish:{hurry:`Hoy ${name}, please hurry up! Ang tagal mo!`,hype:`Grabe ${name}, champion na champion!`,roast:{friendly:`${name}, bawi next round!`,savage:`${name}, skill issue yata yan!`,extra:`${name}, pati baraha napapagod na sa'yo!`}},
    tagalog:{hurry:`Hoy ${name}, bilisan mo naman!`,hype:`Ang galing mo ${name}!`,roast:{friendly:`${name}, bawi sa susunod!`,savage:`${name}, ensayo pa tayo!`,extra:`${name}, pati baraha sumusuko na sa'yo!`}}
  };
  if(type==='custom')return (funMode.playerLines[funPlayerKey(funTarget)]||funMode.custom||`Hey {name}, let's play!`).replaceAll('{name}',name);
  const group=lines[lang]||lines.taglish;
  return type==='roast'?group.roast[funMode.intensity]||group.roast.savage:group[type]||'';
}
function funPlay(type,index=funTarget){
  if(!funMode.enabled)return;
  if(type==='stop'){if('speechSynthesis' in window)speechSynthesis.cancel();gnStopClip();return;}
  const player=game?.players?.[index];if(!player)return;
  if(['crickets','laugh','clap','hype'].includes(type))funEffects(type);
  const line=funLine(type,player.name);
  if(line)funSpeak(line);
}
function funOpen(index){
  if(!funMode.enabled||!game?.players?.[index])return;
  funTarget=index;
  document.getElementById('funPlayerTitle').textContent=`🎭 ${game.players[index].name}`;
  document.getElementById('funPlayerCustom').value=funMode.playerLines[funPlayerKey(index)]||'';
  openOverlay('funOverlay');
}
document.querySelectorAll('#funEnabled,#funLanguage,#funIntensity,#funRandom,#funVoice,#funVoiceChoice').forEach(el=>el.addEventListener(el.type==='checkbox'?'change':'input',()=>{
  const key={funEnabled:'enabled',funLanguage:'language',funIntensity:'intensity',funRandom:'random',funVoice:'voice',funVoiceChoice:'voiceChoice'}[el.id];
  funMode[key]=el.type==='checkbox'?el.checked:el.value;
  funSave();funSync();
  if(!funMode.enabled && 'speechSynthesis' in window)speechSynthesis.cancel();
}));
document.getElementById('funPlayerCustom').addEventListener('input',e=>{if(funTarget<0)return;funMode.playerLines[funPlayerKey(funTarget)]=e.target.value;funSave();});
document.getElementById('funTestVoice').addEventListener('click',()=>funSpeak(funMode.language==='english'?'Hello! Welcome to Tongits Fun Mode!':funMode.language==='tagalog'?'Kamusta! Tara, laro na tayo!':'Hello! Tara na, game na tayo!'));
if('speechSynthesis' in window)speechSynthesis.addEventListener?.('voiceschanged',funPopulateVoices);
funPopulateVoices();
document.getElementById('funClose').addEventListener('click',()=>closeOverlay('funOverlay'));
document.getElementById('funOverlay').addEventListener('click',e=>{if(e.target.id==='funOverlay')closeOverlay('funOverlay');});
document.getElementById('funClipGrid').addEventListener('click',e=>{const btn=e.target.closest('[data-fun-clip]');if(btn && funMode.enabled)gnPlayClip(btn.dataset.funClip,{manual:true});});
document.querySelector('#funOverlay .gn-custom-line').addEventListener('click',e=>{const button=e.target.closest('[data-fun]');if(button)funPlay(button.dataset.fun);});
document.addEventListener('click',e=>{const avatar=e.target.closest('[data-fun-avatar]');if(avatar&&funMode.enabled)funOpen(Number(avatar.dataset.funAvatar));});
document.addEventListener('keydown',e=>{const avatar=e.target.closest?.('[data-fun-avatar]');if(avatar&&funMode.enabled&&(e.key==='Enter'||e.key===' ')){e.preventDefault();funOpen(Number(avatar.dataset.funAvatar));}});
// Occasional reactions after a completed round. No timers, polling, or background audio.
document.addEventListener('click',e=>{
  if(!funMode.enabled||!funMode.random||!game?.players?.length)return;
  if(!e.target.closest('[data-win-player],.win-button'))return;
  const now=Date.now();if(now-funLastReaction<90000||Math.random()>.13)return;
  funLastReaction=now;
  const idx=Math.floor(Math.random()*game.players.length);
  // Browser voice can be restricted when a modal interrupts a click; short sound only.
  funEffects(['crickets','laugh','clap'][Math.floor(Math.random()*3)]);
},true);
funSync();
