// One exact-reference gallery for every category; native horizontal scrolling
// keeps touch, trackpads and zoomed image panning available without gestures.
export function openPhotoGallery(document,media,url,title,imgSrc){
 const dialog=document.querySelector('#photo-dialog'),track=document.querySelector('#photo-track');
 const previous=document.querySelector('#photo-previous'),next=document.querySelector('#photo-next');
 const zoom=document.querySelector('#photo-zoom'),position=document.querySelector('#photo-position');
 const photos=media.gallery.length?media.gallery:[url];
 let index=Math.max(0,photos.indexOf(url));
 document.querySelector('#photo-title').textContent=title;
 track.replaceChildren();
 for(const [i,src] of photos.entries()){
  const slide=document.createElement('div');slide.className='photo-slide';
  const image=document.createElement('img');image.src=imgSrc(src);image.alt=src===media.label?'Ingredient and nutrition label':`${title} — photo ${i+1}`;
  const error=document.createElement('p');error.hidden=true;error.textContent='This photo could not load. You can still view the other photos.';
  image.onerror=()=>{image.hidden=true;error.hidden=false;};
  slide.append(image,error);track.append(slide);
 }
 const slides=[...track.children];
 const update=()=>{
  previous.disabled=index===0;next.disabled=index===photos.length-1;
  position.textContent=`${index+1} / ${photos.length}${photos[index]===media.label?' · Ingredient label':''}`;
  const enlarged=slides[index].querySelector('img').classList.contains('zoomed');
  zoom.textContent=enlarged?'−':'+';zoom.setAttribute('aria-pressed',String(enlarged));
 };
 const go=target=>{
  index=Math.max(0,Math.min(photos.length-1,target));
  track.scrollTo({left:index*track.clientWidth,behavior:'instant'});update();
 };
 previous.onclick=()=>go(index-1);next.onclick=()=>go(index+1);
 track.onscroll=()=>{const current=Math.round(track.scrollLeft/track.clientWidth);if(current!==index&&slides[current]){index=current;update();}};
 dialog.onkeydown=event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();go(index+(event.key==='ArrowRight'?1:-1));}};
 zoom.onclick=()=>{slides[index].querySelector('img').classList.toggle('zoomed');update();};
 dialog.onclose=()=>{track.replaceChildren();dialog.onkeydown=null;track.onscroll=null;};
 if(!dialog.open)dialog.showModal();go(index);
 const resize=new ResizeObserver(()=>go(index));resize.observe(track);
 dialog.addEventListener('close',()=>resize.disconnect(),{once:true});
}
