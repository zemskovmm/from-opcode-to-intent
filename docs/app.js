'use strict';
const previous=document.getElementById('previous');
const next=document.getElementById('next');
const count=document.getElementById('slide-count');
const fullscreen=document.getElementById('fullscreen');
const positionKey='opcode-to-intent:last-slide';
const explicitSlide=Boolean(location.hash);
let rememberedSlide=0;
try{rememberedSlide=Number(localStorage.getItem(positionKey))||0;}catch{}
fullscreen.disabled=!document.fullscreenEnabled;
fullscreen.addEventListener('click',async()=>{
  try {
    if(document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    document.getElementById('status').textContent='Full screen was blocked by your browser. You can use its View menu instead.';
  }
});
document.addEventListener('fullscreenchange',()=>{
  const label=document.fullscreenElement?'Exit full screen':'Enter full screen';
  fullscreen.textContent=document.fullscreenElement?'Exit full screen':'Full screen';
  fullscreen.setAttribute('aria-label',label);
});
function updateControls(){
  const index=Reveal.getIndices().h;
  const total=Reveal.getTotalSlides();
  previous.disabled=index===0;
  next.disabled=index===total-1;
  count.textContent=`${String(index+1).padStart(2,'0')} / ${total}`;
  try{localStorage.setItem(positionKey,String(index));}catch{}
}
previous.addEventListener('click',()=>Reveal.prev());
next.addEventListener('click',()=>Reveal.next());
Reveal.on('slidechanged',updateControls);
Reveal.initialize({width:1600,height:900,margin:0.035,controls:false,progress:false,center:false,hash:true,hashOneBasedIndex:true,view:'slide',scrollActivationWidth:null,transition:matchMedia('(prefers-reduced-motion: reduce)').matches?'none':'fade',transitionSpeed:'fast',pdfMaxPagesPerSlide:1,pdfSeparateFragments:false}).then(()=>{
  if(!explicitSlide && Number.isInteger(rememberedSlide) && rememberedSlide>=0 && rememberedSlide<Reveal.getTotalSlides()) Reveal.slide(rememberedSlide);
  updateControls();
});
