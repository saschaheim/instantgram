import { cssImportant as I, cssLinearGradient, sharedUiClasses } from "./cssTokens";

const { btn, btnPrimary, btnSuccess, modalBody } = sharedUiClasses;
const FIREFOX_LITE = process.env.FIREFOX_LITE as unknown as boolean ?? false;

const slideOnRules = [
  ".slideon{position:relative;display:inline-block;width:42px;height:24px;vertical-align:middle}",
  ".slideon>input,input.slideon{display:none}",
  ".slideon-slider{position:absolute;cursor:pointer;border-radius:34px;inset:0;background-color:#ccc;"+(FIREFOX_LITE?"":"transition:.4s")+"}",
  '.slideon-slider:before{position:absolute;content:"";height:22px;width:22px;left:1px;bottom:1px;border-radius:50%;background-color:#fff'+(FIREFOX_LITE?"":';transition:.4s;box-shadow:0 0 3px 0 rgba(0,0,0,.45)')+"}",
  ".slideon input:checked~.slideon-slider{"+cssLinearGradient+"}",
  ".slideon input:checked~.slideon-slider:before{transform:translateX(18px)}",
];

const generalRules = [
  "."+btn+"{padding:.25rem 1.9rem .4rem;font-size:1rem;font-weight:400;line-height:1.5;color:#212529;text-align:center;vertical-align:middle;user-select:none;background:transparent;border:1px solid transparent;"+(FIREFOX_LITE?"":"border-radius:.25rem;")+"cursor:pointer}",
  "@keyframes horizontal-shaking{0%,100%{transform:translateX(0)}25%,75%{transform:translateX(5px)}50%{transform:translateX(-5px)}}",
  "."+btnPrimary+"{color:#fff"+I+";"+cssLinearGradient+"border:4px"+I+"}",
  ...(!FIREFOX_LITE ? ["."+btnPrimary+":hover{color:#fff"+I+";background-color:#0069d9"+I+";border-color:#0062cc"+I+"}"] : []),
  "."+btnSuccess+"{color:#fff"+I+";background-color:#28a745"+I+";border-color:#28a745"+I+"}",
  ".mt-2{margin-top:.5rem"+I+"}",
  ".mb-0{margin-bottom:0"+I+"}",
  "."+modalBody+" *{box-sizing:border-box}",
  "button,input{margin:0;font:inherit}",
  ".sg{margin:0;padding:0}",
  ".sy{margin:0}",
  ".st{display:flex;gap:4px;margin:14px;padding:4px;background:#e8e2dc"+(FIREFOX_LITE?"":";border-radius:12px")+"}",
  ".tb{flex:1;display:block;padding:.55rem 1rem;cursor:pointer;color:#58636d;background:transparent;border:0;font-weight:700"+(FIREFOX_LITE?"":";border-radius:9px;transition:color .2s,background-color .2s,box-shadow .2s")+"}",
  ".st .tb.active{color:#101820;background:#fff"+(FIREFOX_LITE?"":";box-shadow:0 2px 8px rgba(16,24,32,.12)")+"}",
  ".tc{padding:0 14px 14px}",
  ".tp{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}",
  ".si{display:block;min-width:0;padding:13px 14px;background:#fff;border:1px solid #ded8d2"+(FIREFOX_LITE?"":";border-radius:14px;box-shadow:0 4px 14px rgba(16,24,32,.06)")+"}",
  ...(!FIREFOX_LITE ? [
  ".si:not(.wide){cursor:pointer;transition:border-color .2s,box-shadow .2s,transform .2s}",
  ".si:not(.wide):hover{border-color:#93b9cc;box-shadow:0 7px 18px rgba(16,24,32,.11);transform:translateY(-1px)}",
  ] : [".si:not(.wide){cursor:pointer}"]),
  ".si.wide,.sw{grid-column:1/-1}",
  ".si strong{font-size:15px;line-height:1.28}",
  ".si .sm{font-size:13px;line-height:1.35;white-space:pre-line}",
  ".sr{display:flex;align-items:center;height:100%;gap:10px}",
  ".sgw{flex:1 1 0;min-width:0;padding-right:0}",
  ".se{flex:0 0 auto}",
  ".sm{color:#58636d"+I+"}",
  ".sf,.fi{display:block;width:100%}",
  ".sf{display:flex;flex-direction:column;align-items:flex-start;gap:.25rem}",
  ".fi{padding:.375rem .75rem;margin:.05rem 0 0;width:100%;font-size:.95rem;font-weight:400;line-height:1.45;height:calc(1.45em + .75rem + 2px);color:#495057;background:#fff;border:1px solid #ced4da"+(FIREFOX_LITE?"":";border-radius:.25rem;transition:border-color .15s ease-in-out,box-shadow .15s ease-in-out")+"}",
  ".sf ."+btn+"{align-self:flex-start;margin-right:0}",
  ".sw{position:relative;padding:11px 16px;font-size:13px;line-height:1.45;color:#58636d;background:#efded3;border:1px solid #e2cec1"+(FIREFOX_LITE?"":";border-radius:12px")+"}",
  ".sw .sx{color:#367da3;font-weight:700}",
];

export const cssSlideOn = slideOnRules.join("");
export const cssGeneral = generalRules.join("");
