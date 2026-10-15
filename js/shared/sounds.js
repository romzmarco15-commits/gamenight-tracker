/* Tongits sound system - synthesized locally with Web Audio (offline-safe). */
const SOUND_SETTINGS_KEY = "tongitsTrackerSoundSettingsV1";
let soundSettings = { soundEffects: true, clickSounds: true };
let tongitsAudioContext = null;

function loadSoundSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(SOUND_SETTINGS_KEY) || "null");
        if (saved && typeof saved === "object") {
            soundSettings.soundEffects = saved.soundEffects !== false;
            soundSettings.clickSounds = saved.clickSounds !== false;
        }
    } catch (_) {}
    return soundSettings;
}
function saveSoundSettings() {
    localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(soundSettings));
}
function setSoundEffectsEnabled(enabled) { soundSettings.soundEffects = Boolean(enabled); saveSoundSettings(); if(!enabled){if(typeof gnPotTouchAudio!=='undefined')gnPotTouchAudio.forEach(a=>{a.pause();a.currentTime=0;});if(typeof gnStopClip==='function')gnStopClip();if('speechSynthesis' in window)speechSynthesis.cancel();} }
function setClickSoundsEnabled(enabled) { soundSettings.clickSounds = Boolean(enabled); saveSoundSettings(); }
function audioContext() {
    if (!tongitsAudioContext) tongitsAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (tongitsAudioContext.state === "suspended") tongitsAudioContext.resume();
    return tongitsAudioContext;
}
function tone(freq, duration=0.08, volume=0.035, type="sine", delay=0) {
    const ctx = audioContext(); const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t + duration + 0.02);
}
function playClickSound() {
    if (!soundSettings.clickSounds || !soundSettings.soundEffects) return;
    tone(720, 0.035, 0.018, "sine"); tone(980, 0.025, 0.009, "sine", 0.012);
}
function playSoundEffect(name) {
    if (!soundSettings.soundEffects) return;
    if (name==="win" && typeof funMode!=="undefined" && funMode.enabled && typeof gnPlayRegularVictory==="function" && gnPlayRegularVictory()) return;
    if (name === "potwin" && typeof funMode!=="undefined" && funMode.enabled && typeof gnPlayPotVictory === "function" && gnPlayPotVictory()) return;
    if (name === "coin") { tone(1250,.07,.035,"sine"); tone(1750,.06,.022,"sine",.035); }
    else if (name === "coins") { [0,.07,.14].forEach((d,i)=>{tone(1050+i*180,.07,.03,"sine",d);tone(1650+i*120,.05,.016,"sine",d+.025);}); }
    else if (name === "win") { [523,659,784,1047].forEach((f,i)=>tone(f,.16,.04,"sine",i*.09)); }
    else if (name === "yehey") {
        // A playful victory fanfare, synthesized locally without external audio files.
        [523,659,784,1047,988,1175,1319,1568].forEach((f,i)=>tone(f,i<4?.19:.25,.043,i%3===0?"triangle":"sine",i*.105));
        [0,.14,.28].forEach((d,i)=>tone(220+i*110,.09,.025,"triangle",.88+d));
    }
    else if (name === "potwin") { [392,523,659,784,1047,1319].forEach((f,i)=>tone(f,.22,.045,"triangle",i*.075)); }
    else if (name === "roll") { tone(440 + Math.random()*520,.045,.022,"square"); }
    else if (name === "reveal") { [659,784,988,1319].forEach((f,i)=>tone(f,.18,.04,"sine",i*.075)); }
    else if (name === "fire") { [330,440,554,659,880].forEach((f,i)=>tone(f,.11,.03,"sawtooth",i*.055)); }
    else if (name === "magic") { [880,1175,1568].forEach((f,i)=>tone(f,.2,.025,"sine",i*.08)); }
    else if (name === "jackpot") { [523,659,784,1047,1319].forEach((f,i)=>tone(f,.2,.04,"triangle",i*.07)); setTimeout(()=>playSoundEffect("coins"),260); }
}
/* Recorded-style offline money effects; respect the Basic Sound Effects master toggle. */
const GN_POT_TOUCH_FILES = Object.freeze({
    pot: 'assets/sounds/jackpot/coin-drop.wav',
    chest: 'assets/sounds/jackpot/treasure-cascade.wav',
    bag: 'assets/sounds/jackpot/bag-jingle.wav',
    vault: 'assets/sounds/jackpot/gold-bars.wav',
    cash: 'assets/sounds/jackpot/cash-register.wav'
});
const gnPotTouchAudio = new Map();
let gnLastPotTouchAt = 0;
function playPotTouchSound(design) {
    if (!soundSettings.soundEffects) return;
    const now = Date.now();
    if (now - gnLastPotTouchAt < 180) return;
    gnLastPotTouchAt = now;
    const key = Object.prototype.hasOwnProperty.call(GN_POT_TOUCH_FILES,design) ? design : 'pot';
    try {
        let audio = gnPotTouchAudio.get(key);
        if (!audio) {
            audio = new Audio(GN_POT_TOUCH_FILES[key]);
            audio.preload = 'auto';
            audio.volume = .78;
            gnPotTouchAudio.set(key,audio);
        }
        audio.pause(); audio.currentTime = 0;
        const result = audio.play();
        if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch (_) { /* Audio is optional and never blocks the game. */ }
}
function updateSoundSettingButtons() {
    const fx = document.getElementById("soundEffectsToggle"); const clicks = document.getElementById("clickSoundsToggle");
    if (fx) { fx.classList.toggle("selected", soundSettings.soundEffects); fx.setAttribute("aria-pressed", String(soundSettings.soundEffects)); fx.textContent = soundSettings.soundEffects ? "🔊 Sound Effects  ON" : "🔇 Sound Effects  OFF"; }
    if (clicks) { clicks.classList.toggle("selected", soundSettings.clickSounds); clicks.setAttribute("aria-pressed", String(soundSettings.clickSounds)); clicks.textContent = soundSettings.clickSounds ? "👆 Click Sounds  ON" : "👆 Click Sounds  OFF"; }
}
loadSoundSettings();
document.addEventListener("click", e => { if (e.target.closest("#gnPotSwipe")) return; if (e.target.closest("button, .player-select-button, .pot-area")) playClickSound(); }, true);

/* Curated sound clips, local/offline. Respect app sound and Fun Mode controls. */
const GAME_NIGHT_CLIPS = {
  "air-horn": "assets/sounds/air-horn.mp3",
  "bruh": "assets/sounds/bruh.mp3",
  "boing": "assets/sounds/boing.mp3",
  "cartoon-laugh": "assets/sounds/cartoon-laugh.mp3",
  "pop": "assets/sounds/pop.mp3",
  "censor": "assets/sounds/censor.mp3",
  "crickets": "assets/sounds/crickets.mp3",
  "cheering": "assets/sounds/cheering.mp3",
  "cat": "assets/sounds/cat.mp3",
  "ding": "assets/sounds/ding.mp3",
  "drum-roll": "assets/sounds/drum-roll.mp3",
  "dramatic": "assets/sounds/dramatic.mp3",
  "evil-laugh": "assets/sounds/evil-laugh.mp3",
  "ez": "assets/sounds/ez.mp3",
  "fail": "assets/sounds/fail.mp3",
  "fart": "assets/sounds/fart.mp3",
  "finish-him": "assets/sounds/finish-him.mp3",
  "heartbeat": "assets/sounds/heartbeat.mp3",
  "heavenly": "assets/sounds/heavenly.mp3",
  "what-happened": "assets/sounds/what-happened.mp3",
  "happy-kids": "assets/sounds/happy-kids.mp3",
};
const GN_GAMEPLAY_SOUNDS_KEY = 'gameNightGameplayClipsV1';
let gnGameplayClips = localStorage.getItem(GN_GAMEPLAY_SOUNDS_KEY) === 'true';
let gnActiveClip = null;
let gnLastClipAt = 0;
function gnStopClip() { if(gnActiveClip){gnActiveClip.pause();gnActiveClip.currentTime=0;gnActiveClip=null;} }
function gnPlayClip(name, options={}) {
  if (!GAME_NIGHT_CLIPS[name] || !soundSettings.soundEffects) return false;
  
  const now=Date.now();
  if (!options.manual && now-gnLastClipAt<1200) return false;
  gnLastClipAt=now;
  gnStopClip();
  if('speechSynthesis' in window && options.manual) speechSynthesis.cancel();
  const audio=new Audio(GAME_NIGHT_CLIPS[name]);audio.volume=options.manual?.82:.57;
  gnActiveClip=audio;audio.onended=()=>{if(gnActiveClip===audio)gnActiveClip=null;};
  audio.play().catch(()=>{if(gnActiveClip===audio)gnActiveClip=null;});
  return true;
}
function gnGameplayToggleSync(){const input=document.getElementById('gnGameplayClips');if(input)input.checked=gnGameplayClips;}
document.addEventListener('change',e=>{if(e.target.id==='gnGameplayClips'){gnGameplayClips=e.target.checked;localStorage.setItem(GN_GAMEPLAY_SOUNDS_KEY,String(gnGameplayClips));if(!gnGameplayClips)gnStopClip();}});
document.addEventListener('DOMContentLoaded',gnGameplayToggleSync);

/* Full numbered sound library. Ten visible favorites; swipe through five pages of ten. */
const GN_SOUND_LIBRARY = [{"id": "library-01_Anime_waw", "name": "Anime Waw", "num": 1, "path": "assets/sounds/library-01_Anime_waw.mp3"}, {"id": "library-02_Aww", "name": "Aww", "num": 2, "path": "assets/sounds/library-02_Aww.mp3"}, {"id": "library-03_Air_Horn", "name": "Air Horn", "num": 3, "path": "assets/sounds/library-03_Air_Horn.mp3"}, {"id": "library-04_BOOM_SWOOSH", "name": "Boom Swoosh", "num": 4, "path": "assets/sounds/library-04_BOOM_SWOOSH.mp3"}, {"id": "library-05_BOXING_GLOVES", "name": "Boxing Gloves", "num": 5, "path": "assets/sounds/library-05_BOXING_GLOVES.mp3"}, {"id": "library-06_Bruh", "name": "Bruh", "num": 6, "path": "assets/sounds/library-06_Bruh.mp3"}, {"id": "library-07_Bajaj_bajuri_laugh", "name": "Bajaj Bajuri Laugh", "num": 7, "path": "assets/sounds/library-07_Bajaj_bajuri_laugh.mp3"}, {"id": "library-08_Bone_Breaking", "name": "Bone Breaking", "num": 8, "path": "assets/sounds/library-08_Bone_Breaking.mp3"}, {"id": "library-09_Car_Horn", "name": "Car Horn", "num": 9, "path": "assets/sounds/library-09_Car_Horn.mp3"}, {"id": "library-10_CARTOON_BOING", "name": "Cartoon Boing", "num": 10, "path": "assets/sounds/library-10_CARTOON_BOING.mp3"}, {"id": "library-11_CARTOON_CHOMP", "name": "Cartoon Chomp", "num": 11, "path": "assets/sounds/library-11_CARTOON_CHOMP.mp3"}, {"id": "library-12_CARTOON_CLOCK", "name": "Cartoon Clock", "num": 12, "path": "assets/sounds/library-12_CARTOON_CLOCK.mp3"}, {"id": "library-13_CARTOON_LAUGH", "name": "Cartoon Laugh", "num": 13, "path": "assets/sounds/library-13_CARTOON_LAUGH.mp3"}, {"id": "library-14_CARTOON_POP", "name": "Cartoon Pop", "num": 14, "path": "assets/sounds/library-14_CARTOON_POP.mp3"}, {"id": "library-15_CARTOON_PUNCH", "name": "Cartoon Punch", "num": 15, "path": "assets/sounds/library-15_CARTOON_PUNCH.mp3"}, {"id": "library-16_CARTOON_RICOCHET", "name": "Cartoon Ricochet", "num": 16, "path": "assets/sounds/library-16_CARTOON_RICOCHET.mp3"}, {"id": "library-17_CARTOON_SPIN", "name": "Cartoon Spin", "num": 17, "path": "assets/sounds/library-17_CARTOON_SPIN.mp3"}, {"id": "library-18_CARTOON_TAUNT", "name": "Cartoon Taunt", "num": 18, "path": "assets/sounds/library-18_CARTOON_TAUNT.mp3"}, {"id": "library-19_CARTOON_BOUNCE", "name": "Cartoon Bounce", "num": 19, "path": "assets/sounds/library-19_CARTOON_BOUNCE.mp3"}, {"id": "library-20_CARTOON_SLINK", "name": "Cartoon Slink", "num": 20, "path": "assets/sounds/library-20_CARTOON_SLINK.mp3"}, {"id": "library-21_CENSOR_BEEP", "name": "Censor Beep", "num": 21, "path": "assets/sounds/library-21_CENSOR_BEEP.mp3"}, {"id": "library-22_CRICKETS_CHIRPING", "name": "Crickets Chirping", "num": 22, "path": "assets/sounds/library-22_CRICKETS_CHIRPING.mp3"}, {"id": "library-23_CROWD_CHEERING", "name": "Crowd Cheering", "num": 23, "path": "assets/sounds/library-23_CROWD_CHEERING.mp3"}, {"id": "library-24_Camera_Shutter", "name": "Camera Shutter", "num": 24, "path": "assets/sounds/library-24_Camera_Shutter.mp3"}, {"id": "library-25_Cat", "name": "Cat", "num": 25, "path": "assets/sounds/library-25_Cat.mp3"}, {"id": "library-26_DERP_YELL", "name": "Derp Yell", "num": 26, "path": "assets/sounds/library-26_DERP_YELL.mp3"}, {"id": "library-27_Ding", "name": "Ding", "num": 27, "path": "assets/sounds/library-27_Ding.mp3"}, {"id": "library-28_DIO_muda_muda_muda", "name": "Dio Muda Muda Muda", "num": 28, "path": "assets/sounds/library-28_DIO_muda_muda_muda.mp3"}, {"id": "library-29_DOLPHIN", "name": "Dolphin", "num": 29, "path": "assets/sounds/library-29_DOLPHIN.mp3"}, {"id": "library-30_Drum_Roll", "name": "Drum Roll", "num": 30, "path": "assets/sounds/library-30_Drum_Roll.mp3"}, {"id": "library-31_Dun_Dun_Dunnn", "name": "Dun Dun Dunnn", "num": 31, "path": "assets/sounds/library-31_Dun_Dun_Dunnn.mp3"}, {"id": "library-32_Dute", "name": "Dute", "num": 32, "path": "assets/sounds/library-32_Dute.mp3"}, {"id": "library-33_Dbz", "name": "Dbz", "num": 33, "path": "assets/sounds/library-33_Dbz.mp3"}, {"id": "library-34_EAT_OR_MUNCH", "name": "Eat Or Munch", "num": 34, "path": "assets/sounds/library-34_EAT_OR_MUNCH.mp3"}, {"id": "library-35_EPIC_CHOIR_SUSPENSE", "name": "Epic Choir Suspense", "num": 35, "path": "assets/sounds/library-35_EPIC_CHOIR_SUSPENSE.mp3"}, {"id": "library-36_EVIL_LAUGH", "name": "Evil Laugh", "num": 36, "path": "assets/sounds/library-36_EVIL_LAUGH.mp3"}, {"id": "library-37_Explosion", "name": "Explosion", "num": 37, "path": "assets/sounds/library-37_Explosion.mp3"}, {"id": "library-38_Ez", "name": "Ez", "num": 38, "path": "assets/sounds/library-38_Ez.mp3"}, {"id": "library-39_Fail", "name": "Fail", "num": 39, "path": "assets/sounds/library-39_Fail.mp3"}, {"id": "library-40_Falling", "name": "Falling", "num": 40, "path": "assets/sounds/library-40_Falling.mp3"}, {"id": "library-41_Fart", "name": "Fart", "num": 41, "path": "assets/sounds/library-41_Fart.mp3"}, {"id": "library-42_FAST_TIP_TOES", "name": "Fast Tip Toes", "num": 42, "path": "assets/sounds/library-42_FAST_TIP_TOES.mp3"}, {"id": "library-43_FUNNY_GUNS_SOUND", "name": "Funny Guns Sound", "num": 43, "path": "assets/sounds/library-43_FUNNY_GUNS_SOUND.mp3"}, {"id": "library-44_Finish_Him_Mortal_Kombat", "name": "Finish Him Mortal Kombat", "num": 44, "path": "assets/sounds/library-44_Finish_Him_Mortal_Kombat.mp3"}, {"id": "library-45_GERAAAAA", "name": "Geraaaaa", "num": 45, "path": "assets/sounds/library-45_GERAAAAA.mp3"}, {"id": "library-46_GET_OVER_HERE", "name": "Get Over Here", "num": 46, "path": "assets/sounds/library-46_GET_OVER_HERE.mp3"}, {"id": "library-47_HEART_BEAT", "name": "Heart Beat", "num": 47, "path": "assets/sounds/library-47_HEART_BEAT.mp3"}, {"id": "library-48_HEAVENLY_CHOIR", "name": "Heavenly Choir", "num": 48, "path": "assets/sounds/library-48_HEAVENLY_CHOIR.mp3"}, {"id": "library-49_HEY_WHAT_HAPPENED", "name": "Hey What Happened", "num": 49, "path": "assets/sounds/library-49_HEY_WHAT_HAPPENED.mp3"}, {"id": "library-50_Happy_Kids", "name": "Happy Kids", "num": 50, "path": "assets/sounds/library-50_Happy_Kids.mp3"}];
GN_SOUND_LIBRARY.forEach(item=>{GAME_NIGHT_CLIPS[item.id]=item.path;});
const GN_DEFAULT_FAVORITES=[6,22,36,39,41,3,23,31,10,50];
const GN_FAVORITES_KEY='gameNightFavoriteSoundsV1';
function gnLoadFavorites(){try{const v=JSON.parse(localStorage.getItem(GN_FAVORITES_KEY)||'null');if(Array.isArray(v)&&v.length===10&&new Set(v).size===10&&v.every(n=>Number.isInteger(n)&&n>=1&&n<=50))return v;}catch(_){}return [...GN_DEFAULT_FAVORITES];}
let GN_SOUND_FAVORITES=gnLoadFavorites();
function gnRenderFavorites(){
 for(const [id,attr] of [['funClipGrid','funClip'],['mjClipGrid','mjClip']]){const grid=document.getElementById(id);if(grid)grid.replaceChildren(...GN_SOUND_FAVORITES.map(n=>gnSoundButton(GN_SOUND_LIBRARY[n-1],attr)));}
 const picker=document.getElementById('gnFavoritePicker');if(!picker)return;
 const currentPage = Math.max(0, Math.min(4, Number(picker.dataset.page || 0)));
 const pages = document.createDocumentFragment();
 for (let pageIndex=0; pageIndex<5; pageIndex++) {
  const page=document.createElement('div');page.className='gn-favorite-page';
  GN_SOUND_LIBRARY.slice(pageIndex*10,pageIndex*10+10).forEach(item=>{
   const selected=GN_SOUND_FAVORITES.includes(item.num);
   const button=document.createElement('button');button.type='button';button.className='gn-favorite-option';
   button.classList.toggle('selected',selected);
   button.setAttribute('aria-pressed',String(selected));
   button.textContent=`${GN_SOUND_EMOJIS[item.num]||'🔊'} ${item.name}`;
   button.onclick=()=>{
    if(selected){GN_SOUND_FAVORITES=GN_SOUND_FAVORITES.filter(n=>n!==item.num);}
    else if(GN_SOUND_FAVORITES.length<10){GN_SOUND_FAVORITES.push(item.num);}
    else {const count=document.getElementById('gnFavoriteCount');if(count)count.textContent='10 selected · remove one to add another';return;}
    localStorage.setItem(GN_FAVORITES_KEY,JSON.stringify(GN_SOUND_FAVORITES));gnRenderFavorites();
   };
   page.append(button);
  });pages.append(page);
 }
 picker.replaceChildren(pages);
 const count=document.getElementById('gnFavoriteCount');if(count)count.textContent=`${GN_SOUND_FAVORITES.length} / 10 selected`;
 const label=document.getElementById('gnFavoritePageLabel');
 const prev=document.getElementById('gnFavoritePrev'),next=document.getElementById('gnFavoriteNext');
 const update=()=>{const index=Math.max(0,Math.min(4,Math.round(picker.scrollLeft/Math.max(1,picker.clientWidth))));picker.dataset.page=String(index);if(label)label.textContent=`${index+1} / 5`;if(prev)prev.disabled=index===0;if(next)next.disabled=index===4;};
 const go=n=>{const index=Math.max(0,Math.min(4,n));picker.dataset.page=String(index);picker.scrollTo({left:index*picker.clientWidth,behavior:'smooth'});update();};
 if(prev)prev.onclick=()=>go(Number(picker.dataset.page||0)-1);
 if(next)next.onclick=()=>go(Number(picker.dataset.page||0)+1);
 picker.onscroll=update;
 picker.scrollLeft=currentPage*picker.clientWidth;
 update();
}

const GN_SOUND_EMOJIS={1:'😮',2:'🥹',3:'📣',4:'💥',5:'🥊',6:'😑',7:'🤣',8:'🦴',9:'🚗',10:'🪀',11:'😋',12:'⏰',13:'😂',14:'🫧',15:'👊',16:'🎯',17:'🌀',18:'😜',19:'🏀',20:'〰️',21:'🤐',22:'🦗',23:'👏',24:'📸',25:'🐱',26:'😱',27:'🔔',28:'🥋',29:'🐬',30:'🥁',31:'😨',32:'🤪',33:'⚡',34:'🍿',35:'🎼',36:'😈',37:'💣',38:'😎',39:'😵',40:'🫨',41:'💨',42:'👣',43:'🔫',44:'⚔️',45:'😤',46:'🦂',47:'💓',48:'😇',49:'🤷',50:'🎉'};
function gnSoundButton(item,attr){const b=document.createElement('button');b.type='button';b.dataset[attr]=item.id;b.textContent=`${GN_SOUND_EMOJIS[item.num]||'🔊'} ${item.name}`;b.setAttribute('aria-label','Play '+item.name);return b;}
function gnBuildSoundUI(){
 gnRenderFavorites();
 const reset=document.getElementById('gnResetFavorites');if(reset)reset.onclick=()=>{GN_SOUND_FAVORITES=[...GN_DEFAULT_FAVORITES];localStorage.setItem(GN_FAVORITES_KEY,JSON.stringify(GN_SOUND_FAVORITES));gnRenderFavorites();};
 const pages=document.getElementById('gnSoundLibraryPages');if(!pages)return;
 for(let p=0;p<5;p++){const page=document.createElement('div');page.className='gn-sound-library-page';page.dataset.page=String(p);GN_SOUND_LIBRARY.slice(p*10,p*10+10).forEach(item=>page.append(gnSoundButton(item,'gnLibrarySound')));pages.append(page);}
 const label=document.getElementById('gnLibraryPageLabel');
 const dots=document.getElementById('gnLibraryDots');const prev=document.getElementById('gnLibraryPrev');const next=document.getElementById('gnLibraryNext');
 const goToPage=p=>pages.scrollTo({left:Math.max(0,Math.min(4,p))*pages.clientWidth,behavior:'smooth'});
 for(let i=0;i<5;i++){const dot=document.createElement('button');dot.type='button';dot.className='gn-library-dot';dot.setAttribute('aria-label',`Go to sounds page ${i+1}`);dot.onclick=()=>goToPage(i);dots.append(dot);}
 const update=()=>{const p=Math.max(0,Math.min(4,Math.round(pages.scrollLeft/Math.max(1,pages.clientWidth))));label.textContent=`${p+1} / 5`;prev.disabled=p===0;next.disabled=p===4;[...dots.children].forEach((dot,i)=>{dot.classList.toggle('active',i===p);dot.setAttribute('aria-current',i===p?'page':'false');});};
 prev.onclick=()=>goToPage(Math.round(pages.scrollLeft/Math.max(1,pages.clientWidth))-1);
 next.onclick=()=>goToPage(Math.round(pages.scrollLeft/Math.max(1,pages.clientWidth))+1);
 pages.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);
 document.querySelectorAll('[data-open-sound-library]').forEach(b=>b.addEventListener('click',()=>{document.getElementById('gnSoundLibraryOverlay').classList.remove('hidden');pages.scrollLeft=0;update();}));
 const close=()=>document.getElementById('gnSoundLibraryOverlay').classList.add('hidden');
 document.getElementById('gnSoundLibraryClose').onclick=close;
 document.getElementById('gnSoundLibraryOverlay').addEventListener('click',e=>{if(e.target.id==='gnSoundLibraryOverlay')close();});
 document.getElementById('gnLibraryStop').onclick=gnStopClip;
 pages.addEventListener('click',e=>{const b=e.target.closest('[data-gn-library-sound]');if(b)gnPlayClip(b.dataset.gnLibrarySound,{manual:true});});
 const select=document.getElementById('gnPotWinSound'),input=document.getElementById('gnPotWinCustom');
 if(select){select.value=localStorage.getItem('gnPotWinSoundV1')||'cheering';select.addEventListener('change',()=>{localStorage.setItem('gnPotWinSoundV1',select.value);gnSyncPotSoundInput();});}
 if(input){input.value=localStorage.getItem('gnPotWinCustomV1')||'';input.addEventListener('input',()=>localStorage.setItem('gnPotWinCustomV1',input.value));}
 gnSyncPotSoundInput();
}
function gnSyncPotSoundInput(){const s=document.getElementById('gnPotWinSound'),i=document.getElementById('gnPotWinCustom');if(s&&i)i.hidden=s.value!=='custom';}
let gnLastPotVictory=0;
function gnPlayPotVictory(name){
 const now=Date.now();if(now-gnLastPotVictory<3000)return true;gnLastPotVictory=now;
 if(!soundSettings.soundEffects || typeof funMode==="undefined" || !funMode.enabled)return false;
 const selection=localStorage.getItem('gnPotWinSoundV1')||'cheering';
 if(selection==='none')return true;
 if(selection==='custom'){
   const line=(localStorage.getItem('gnPotWinCustomV1')||'Congratulations {name}! You won the pot!').replaceAll('{name}',name||'winner');
   if(typeof funSpeak==='function'){funSpeak(line);return true;}return false;
 }
 return gnPlayClip(selection,{manual:true});
}
document.addEventListener('DOMContentLoaded',gnBuildSoundUI);

/* Sound settings accordion and independent regular-win sound. */
const GN_WIN_CHOICES=['cheering','air-horn','happy-kids','heavenly'];
let gnLastRegularWin=0;
let gnPreviousWinClip=null;
function gnPlayRegularVictory(name){
  if(!soundSettings.soundEffects || typeof funMode==="undefined" || !funMode.enabled)return false;
  const now=Date.now();if(now-gnLastRegularWin<800)return true;
  const choice=localStorage.getItem('gnRegularWinSoundV1')||'random';
  if(choice==='none')return true;
  gnLastRegularWin=now;
  if(choice==='custom'){
    const line=(localStorage.getItem('gnRegularWinCustomV1')||'Well played, {name}!').replaceAll('{name}',name||'winner');
    if(typeof funSpeak==='function'){funSpeak(line);return true;}
    if('speechSynthesis' in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(line));return true;}
    return false;
  }
  const candidates=GN_WIN_CHOICES.filter(x=>x!==gnPreviousWinClip);
  const clip=choice==='random'?candidates[Math.floor(Math.random()*candidates.length)]:choice;
  gnPreviousWinClip=clip;
  return gnPlayClip(clip,{manual:true});
}
document.addEventListener('DOMContentLoaded',()=>{
 const head=document.getElementById('gnSoundSettingsHeader');
 const panel=document.getElementById('gnSoundSettingsPanel');
 const arrow=document.getElementById('gnSoundAccordionArrow');
 if(head&&panel){head.addEventListener('click',()=>{const open=head.getAttribute('aria-expanded')!=='true';head.setAttribute('aria-expanded',String(open));panel.hidden=!open;if(arrow)arrow.textContent=open?'⌃':'⌄';});}
 const select=document.getElementById('gnRegularWinSound'),input=document.getElementById('gnRegularWinCustom');
 const sync=()=>{if(input&&select)input.hidden=select.value!=='custom';};
 if(select){select.value=localStorage.getItem('gnRegularWinSoundV1')||'random';select.addEventListener('change',()=>{localStorage.setItem('gnRegularWinSoundV1',select.value);sync();});}
 if(input){input.value=localStorage.getItem('gnRegularWinCustomV1')||'';input.addEventListener('input',()=>localStorage.setItem('gnRegularWinCustomV1',input.value));}
 sync();
 document.querySelectorAll('[data-gn-preview]').forEach(button=>button.addEventListener('click',()=>{
  if(button.dataset.gnPreview==='regular'){gnLastRegularWin=0;gnPlayRegularVictory('Player');}
  else {gnLastPotVictory=0;gnPlayPotVictory('Player');}
 }));
});
