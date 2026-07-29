import { sharedUiClasses } from "./styleShared";

const { modalDb } = sharedUiClasses;

const sliderRules = [
  `.slider-container{width:500px;display:flex;flex-direction:column;overflow:hidden visible;position:relative;margin:0 auto;background:#fff;transition:width .28s cubic-bezier(.22,.61,.36,1),box-shadow .28s ease,background-color .28s ease}`,
  `.slider{display:flex;align-items:stretch;transition:transform .45s cubic-bezier(.22,.61,.36,1);position:relative;will-change:transform}`,
  `.slide{position:relative;flex:0 0 100%;width:100%;background:#000}`,
  `.slide img,.slide video{display:block;width:calc(100% + 2px);height:300px;max-height:300px;margin-left:-1px;object-fit:contain;background:#000;transition:width .28s cubic-bezier(.22,.61,.36,1),height .28s cubic-bezier(.22,.61,.36,1),max-height .28s cubic-bezier(.22,.61,.36,1),transform .28s ease,filter .28s ease}`,
  `.slider-container>.${modalDb}{display:flex;align-items:center;justify-content:center;min-height:52px;padding:12px 16px;width:100%;box-sizing:border-box;font:600 20px/1.5 "Open Sans","Helvetica Neue",Helvetica,Arial,sans-serif!important}`,
  `.slider-controls{display:flex;justify-content:center;align-items:center;margin:0;padding:10px 0 14px;flex-wrap:wrap;gap:5px;background:#fff;border-top:1px solid #eef0f3}`,
  `.slider-controls button{cursor:pointer;width:28px;height:28px;padding:0;margin:0;border-radius:50%;border:0;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#3d434a;background:#ddd;transition:transform .2s ease,color .2s ease}`,
  `.slider-controls.autoplay button{background:conic-gradient(#4b8db5 calc(var(--progress,0)*1%),#ddd 0)}`,
  `.slider-controls button.active{color:#111;transform:scale(1.05)}`,
];

export const cssCarouselSlider = sliderRules.join("");
