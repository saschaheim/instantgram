import { cssLinearGradient, sharedUiClasses } from "./styleShared";

const { modalDb } = sharedUiClasses;

const sliderRules = [
  `.slider-container{width:100%;display:flex;flex-direction:column;overflow:hidden visible;position:relative;margin:0 auto;background:#fff;transition:width .28s cubic-bezier(.22,.61,.36,1),box-shadow .28s ease,background-color .28s ease}`,
  `.slider{display:flex;align-items:stretch;transition:transform .45s cubic-bezier(.22,.61,.36,1);position:relative;will-change:transform}`,
  `.slide{position:relative;flex:0 0 100%;width:100%;background:#000}`,
  `.slide img,.slide video{display:block;width:calc(100% + 2px);height:300px;max-height:300px;margin-left:-1px;object-fit:contain;background:#000;transition:width .28s cubic-bezier(.22,.61,.36,1),height .28s cubic-bezier(.22,.61,.36,1),max-height .28s cubic-bezier(.22,.61,.36,1),transform .28s ease,filter .28s ease}`,
  `.slide-placeholder{width:100%;height:300px;max-height:300px;background:#000}`,
  `.slider-container>.${modalDb}{display:flex;align-items:center;justify-content:center;min-height:52px;padding:12px 16px;width:100%;box-sizing:border-box;font:600 20px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif!important}`,
  `.slider-controls{display:flex;justify-content:center;align-items:center;margin:0;padding:11px 12px 14px;flex-wrap:wrap;gap:6px;background:#fff;border-top:1px solid #e8edf1}`,
  `.slider-controls button{cursor:pointer;width:30px;height:30px;padding:0;margin:0;border-radius:9px;border:1px solid #dce4e9;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#52616c;background:#fff;box-shadow:0 1px 2px rgba(20,43,58,.06);transition:transform .18s ease,color .18s ease,border-color .18s ease,background .18s ease}`,
  `.slider-controls button:hover{transform:translateY(-1px);border-color:#9fbccd;color:#26475c}`,
  `.slider-controls button.active{color:#fff;border-color:transparent;${cssLinearGradient}box-shadow:0 3px 9px rgba(55,109,144,.24)}`,
  `.slider-controls.autoplay button{border:2px solid transparent;background:linear-gradient(#fff,#fff) padding-box,conic-gradient(#4b8db5 calc(var(--progress,0)*1%),#dce4e9 0) border-box}`,
  `.slider-controls.autoplay button.active{background:linear-gradient(135deg,#6ea8c8,#376d90) padding-box,conic-gradient(#163f59 calc(var(--progress,0)*1%),#cbd8df 0) border-box!important}`,
];

export const cssCarouselSlider = sliderRules.join("");
