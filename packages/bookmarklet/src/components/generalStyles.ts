import { cssLinearGradient, sharedUiClasses } from "./styleShared";

const { btn, btnPrimary, btnSuccess, modalBody } = sharedUiClasses;

const slideOnRules = [
  `.slideon{position:relative;display:inline-block;width:42px;height:24px;vertical-align:middle}`,
  `.slideon>input,input.slideon{display:none}`,
  `.slideon-slider{position:absolute;cursor:pointer;border-radius:34px;inset:0;background-color:#ccc;transition:.4s}`,
  `.slideon-slider:before{position:absolute;content:"";height:22px;width:22px;left:1px;bottom:1px;border-radius:50%;background-color:#fff;transition:.4s;box-shadow:0 0 3px 0 rgba(0,0,0,.45)}`,
  `.slideon input:checked~.slideon-slider{${cssLinearGradient}}`,
  `.slideon input:checked~.slideon-slider:before{transform:translateX(18px)}`,
];

const generalRules = [
  `.${btn}{padding:.25rem 1.9rem .4rem;font-size:1rem;font-weight:400;line-height:1.5;color:#212529;text-align:center;vertical-align:middle;user-select:none;background:transparent;border:1px solid transparent;border-radius:.25rem;cursor:pointer}`,
  `@keyframes horizontal-shaking{0%,100%{transform:translateX(0)}25%,75%{transform:translateX(5px)}50%{transform:translateX(-5px)}}`,
  `.${btnPrimary}{color:#fff!important;${cssLinearGradient}border:4px!important}`,
  `.${btnPrimary}:hover{color:#fff!important;background-color:#0069d9!important;border-color:#0062cc!important}`,
  `.${btnSuccess}{color:#fff!important;background-color:#28a745!important;border-color:#28a745!important}`,
  `.mt-2{margin-top:.5rem!important}`,
  `.mb-0{margin-bottom:0!important}`,
  `.${modalBody} *{box-sizing:border-box}`,
  `button,input{margin:0;font:inherit}`,
  `.sg{padding:0 15px}`,
  `.sy{margin:1.5rem 0}`,
  `.st{display:flex;flex-wrap:wrap;border-bottom:1px solid #dee2e6}`,
  `.tb{display:block;padding:.5rem 1rem;cursor:pointer;color:#000;margin-bottom:-1px;background:transparent;border:1px solid transparent;border-top-left-radius:.25rem;border-top-right-radius:.25rem}`,
  `.st .tb.active{color:#495057;background:#fff;border-color:#dee2e6 #dee2e6 #fff;border-bottom:#4b8db5 2px solid}`,
  `.si{display:block;padding:.75rem 1.25rem;background:#fff;border:1px solid #eef0f3}`,
  `.tp>.si:first-child{border-top-width:0}`,
  `.si+.si,.sw+.si{border-top-width:0}`,
  `.si strong{font-size:15px;line-height:1.28}`,
  `.si .sm{font-size:13px;line-height:1.35}`,
  `.sr{display:flex;align-items:center}`,
  `.sgw{flex:1 1 0;min-width:0;padding-right:0}`,
  `.se{flex:0 0 auto}`,
  `.sm{color:#6c757d!important}`,
  `.sf,.fi{display:block;width:100%}`,
  `.sf{display:flex;flex-direction:column;align-items:flex-start;gap:.25rem}`,
  `.fi{padding:.375rem .75rem;margin:.05rem 0 0;width:100%;font-size:.95rem;font-weight:400;line-height:1.45;height:calc(1.45em + .75rem + 2px);color:#495057;background:#fff;border:1px solid #ced4da;border-radius:.25rem;transition:border-color .15s ease-in-out,box-shadow .15s ease-in-out}`,
  `.sf .${btn}{align-self:flex-start;margin-right:0}`,
  `.sw{position:relative;padding:.75rem 1rem;font-size:13px;line-height:1.45;color:#495057;background:#f8f9fb;border:1px solid #eef0f3;border-top:0}`,
  `.sw .sx{color:#6ea8c8;font-weight:700}`,
];

export const cssSlideOn = slideOnRules.join("");
export const cssGeneral = generalRules.join("");
