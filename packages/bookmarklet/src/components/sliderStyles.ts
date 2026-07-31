import { cssImportant as I, sharedUiClasses } from "./styleShared";

const { modalDb } = sharedUiClasses;

const sliderRules = [
  ".slider-container{width:100%;display:flex;flex-direction:column;overflow:hidden visible;position:relative;margin:0 auto;background:#fff;transition:width .28s cubic-bezier(.22,.61,.36,1),box-shadow .28s ease,background-color .28s ease}",
  ".slider{display:flex;align-items:stretch;transition:transform .45s cubic-bezier(.22,.61,.36,1);position:relative;will-change:transform;touch-action:pan-y;cursor:grab;background:#000}",
  ".slider.dragging{cursor:grabbing}",
  ".slide{position:relative;flex:0 0 100%;width:100%;background:#000}",
  ".slide img,.slide video{display:block;width:calc(100% + 2px);height:300px;max-height:300px;margin-left:-1px;object-fit:contain;background:#000;-webkit-user-drag:none;user-select:none;transition:width .28s cubic-bezier(.22,.61,.36,1),height .28s cubic-bezier(.22,.61,.36,1),max-height .28s cubic-bezier(.22,.61,.36,1),transform .28s ease,filter .28s ease}",
  ".slide-placeholder{width:100%;height:300px;max-height:300px;background:#000}",
  ".slider-container>."+modalDb+'{display:flex;align-items:center;justify-content:center;min-height:52px;padding:12px 16px;width:100%;box-sizing:border-box;font:600 20px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif'+I+'}',
  ".slider-controls{display:flex;justify-content:center;align-items:center;margin:0;padding:11px 12px 14px;flex-wrap:wrap;gap:6px;background:#f7f4ef;border-top:1px solid #ded8d2}",
  ".slider-controls button{cursor:pointer;box-sizing:border-box;width:30px;height:30px;padding:0;margin:0;border-radius:9px;border:1px solid #d9d2cb;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#58636d;background:#fff;box-shadow:0 1px 2px rgba(16,24,32,.06);transition:transform .18s ease,color .18s ease,border .18s ease,background .18s ease,box-shadow .18s ease}",
  ".slider-controls button:hover{transform:translateY(-1px);border-color:#9fbccd;color:#26475c}",
  ".slider-controls button.active{color:#fff;border:2px solid transparent;background:linear-gradient(120deg,#101820 0%,#193342 58%,#367da3 100%) padding-box,conic-gradient(#65b8dc calc(var(--progress,0)*1%),#c8d6dd 0) border-box"+I+";box-shadow:0 1px 2px rgba(55,109,144,.35)}",
  ".slider-controls button.active:only-child{border-color:#d9d2cb}",
];

export const cssCarouselSlider = sliderRules.join("");
