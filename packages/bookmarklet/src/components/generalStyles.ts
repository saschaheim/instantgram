import { cssLinearGradient, sharedUiClasses } from "./styleShared";

const { btn, btnPrimary, btnSuccess, modalBody } = sharedUiClasses;

const slideOnRules = [
  `.slideon{position:relative;display:inline-block;width:42px;height:24px;vertical-align:middle}`,
  `.slideon>input,input.slideon{display:none}`,
  `.slideon-slider{position:absolute;cursor:pointer;border-radius:34px;top:0;left:0;right:0;bottom:0;background-color:#ccc;-webkit-transition:.4s;transition:.4s}`,
  `.slideon-slider:before{position:absolute;content:"";height:22px;width:22px;left:1px;bottom:1px;border-radius:50%;background-color:#fff;-webkit-transition:.4s;transition:.4s;-webkit-box-shadow:0 0 3px 0 rgba(0,0,0,.45);-moz-box-shadow:0 0 3px 0 rgba(0,0,0,.45);box-shadow:0 0 3px 0 rgb(0,0,0,.45)}`,
  `.slideon input:checked~.slideon-slider{${cssLinearGradient}}`,
  `.slideon input:checked~.slideon-slider:before{-webkit-transform:translateX(18px);-ms-transform:translateX(18px);transform:translateX(18px)}`,
  `.slideon input:disabled~.slideon-slider{opacity:.5}`,
];

const generalRules = [
  `.${btn},label{display:inline-block}`,
  `.${btn}{padding:.25rem 1.9rem .4rem;font-size:1rem;font-weight:400;line-height:1.5;color:#212529;text-align:center;vertical-align:middle;user-select:none;background:transparent;border:1px solid transparent;border-radius:.25rem;transition:color .15s ease-in-out,background-color .15s ease-in-out,border-color .15s ease-in-out,box-shadow .15s ease-in-out}`,
  `.${modalBody} p{margin:0 0 1rem}`,
  `@keyframes horizontal-shaking{0%,100%{transform:translateX(0)}25%,75%{transform:translateX(5px)}50%{transform:translateX(-5px)}}`,
  `.${btn}:hover{color:#212529;text-decoration:none}`,
  `.${btn}:not(:disabled):not(.disabled){cursor:pointer}`,
  `.${btnPrimary}{color:#fff!important;${cssLinearGradient}border:4px!important}`,
  `.${btnPrimary}:hover{color:#fff!important;background-color:#0069d9!important;border-color:#0062cc!important}`,
  `.${btnPrimary}:not(:disabled):not(.disabled).active,.${btnPrimary}:not(:disabled):not(.disabled):active,.show>.${btnPrimary}.dropdown-toggle{color:#fff;background-color:#0062cc;border-color:#005cbf}`,
  `.${btnPrimary}:not(:disabled):not(.disabled).active:focus,.${btnPrimary}:not(:disabled):not(.disabled):active:focus,.show>.${btnPrimary}.dropdown-toggle:focus{box-shadow:0 0 0 .2rem rgba(75,141,181,.35)}`,
  `.${btnSuccess}{color:#fff!important;background-color:#28a745!important;border-color:#28a745!important}`,
  `.mt-2{margin-top:.5rem!important}`,
  `.mt-3{margin-top:1rem!important}`,
  `.mb-0{margin-bottom:0!important}`,
  `label{margin-bottom:.5rem}`,
  `.${modalBody} *{box-sizing:border-box}`,
  `b,strong{font-weight:bolder}`,
  `button,input{overflow:visible}`,
  `button,input,optgroup,select,textarea{margin:0;font-family:inherit;font-size:inherit;line-height:inherit}`,
  `input[type=checkbox],input[type=radio]{box-sizing:border-box;padding:0}`,
  `.sg{padding:0 15px}`,
  `.sy{margin:1.5rem 0}`,
  `.st{display:flex;flex-wrap:wrap;border-bottom:1px solid #dee2e6}`,
  `.tb{display:block;padding:.5rem 1rem;cursor:pointer;color:#000;margin-bottom:-1px;background:transparent;border:1px solid transparent;border-top-left-radius:.25rem;border-top-right-radius:.25rem}`,
  `.st .tb:hover,.st .tb:focus{border-color:#e9ecef #e9ecef #dee2e6}`,
  `.st .tb.active{color:#495057;background:#fff;border-color:#dee2e6 #dee2e6 #fff;border-bottom:#4b8db5 2px solid}`,
  `.tp{display:none}`,
  `.active.tp{display:block}`,
  `.fade{transition:opacity .15s linear}`,
  `.fade:not(.show){opacity:0}`,
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
