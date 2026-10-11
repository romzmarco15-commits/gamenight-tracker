/* Shared player-avatar component: used by Tongits and Mahjong setup. */
(function(){
 'use strict';
 const emojis=['😎','🤓','🧑','👩','🐼','🐯','🐸','👽','😈','🤠','🥸','🦁','🀄','😺','👑','🤩'];
 const defaults=['😎','👩','🧑','😺'];
 const emoji=(value)=>({type:'emoji',value});
 function markup(avatar){return avatar?.type==='photo'?`<img src="${avatar.value}" alt="" class="gn-avatar-image">`:(avatar?.value||'😎')}
 function resizePhoto(file){
  return new Promise((resolve,reject)=>{
   if(!file||!file.type.startsWith('image/'))return reject(new Error('Choose an image file.'));
   if(file.size>12*1024*1024)return reject(new Error('Choose a photo smaller than 12 MB.'));
   const url=URL.createObjectURL(file),image=new Image();
   image.onload=()=>{try{const canvas=document.createElement('canvas');canvas.width=canvas.height=320;const ctx=canvas.getContext('2d');const size=Math.min(image.width,image.height);ctx.drawImage(image,(image.width-size)/2,(image.height-size)/2,size,size,0,0,320,320);resolve(canvas.toDataURL('image/jpeg',.72))}catch(e){reject(e)}finally{URL.revokeObjectURL(url)}};
   image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Unable to read photo.'))};image.src=url;
  });
 }
 function renderChoices(container,current,onSelect){
  container.replaceChildren();
  emojis.forEach(value=>{const b=document.createElement('button');b.type='button';b.className='avatar-picker-button gn-emoji-option';b.textContent=value;b.setAttribute('aria-label','Choose '+value);if(current?.type==='emoji'&&current.value===value)b.classList.add('selected');b.onclick=()=>onSelect(emoji(value));container.appendChild(b)});
 }
 window.GameNightAvatar=Object.freeze({emojis,defaults,emoji,markup,resizePhoto,renderChoices});
})();
