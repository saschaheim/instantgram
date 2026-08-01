import { ComponentChildren, render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { program } from "../..";
import localize, { subscribeLocale } from "../../helpers/localize";
import { LocalizationKey } from "../../localization";
import { cssModal } from "./styles";
import { uiClasses } from "../shared/uiTokens";
import { sleep } from "../../helpers/common";

export interface ModalButton {
  text: string;
  localizationKey?: LocalizationKey;
  active?: boolean;
  callback?(): void;
}

function ModalView({ onClose, options }: { onClose: () => void; options: ModalOptions }) {
  const [, setLocaleVersion] = useState(0);
  useEffect(() => subscribeLocale(() => setLocaleVersion((version) => version + 1)), []);
  const { heading = "", body = "", bodyStyle, buttonList = [], modalClassName } = options;

  return (
    <div class={uiClasses.modal+(modalClassName ? " "+modalClassName : "")}>
      <div class={uiClasses.modalContent} style={!buttonList.length ? "padding-bottom:4px" : undefined}>
        <div class={uiClasses.modalHeader}>{typeof heading === "string" ? <h5>{heading}</h5> : heading}</div>
        <div class={uiClasses.modalBody} style={bodyStyle}>{typeof body === "string" ? <div>{body}</div> : body}</div>
        {!!buttonList.length && (
          <div class={uiClasses.modalFooter}>
            {buttonList.map((button) => (
              <button class={button.active ? "active" : undefined} onClick={() => {
                button.callback?.();
                onClose();
              }}>{button.localizationKey ? localize(button.localizationKey) : button.text}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export type ModalContent = ComponentChildren | string;

export interface ModalOptions {
  heading?: ModalContent;
  body?: ModalContent;
  bodyStyle?: string;
  buttonList?: ModalButton[];
  modalClassName?: string;
  closeOnOverlayClick?: boolean;
}

export class Modal {
  private options: ModalOptions;
  private modal: HTMLDivElement | null = null;
  private modalHost: HTMLDivElement | null = null;
  private openTimerId = 0;

  public constructor(modalOptions: ModalOptions) {
    this.options = modalOptions;
    const styleId = program.DOM_PREFIX + "-modal";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = cssModal;
      document.head.appendChild(style);
    }
  }

  private renderModal(): void {
    if (!this.modalHost) return;
    render(<ModalView options={this.options} onClose={() => void this.close()} />, this.modalHost);
  }

  private createModal(): HTMLDivElement {
    const modalElement = document.createElement("div");
    modalElement.classList.add(uiClasses.modalOverlay);
    modalElement.addEventListener("click", (event: MouseEvent) => {
      if (this.options.closeOnOverlayClick !== false && event.target === modalElement) {
        void this.close();
      }
    });

    const modalHost = document.createElement("div");
    this.modalHost = modalHost;
    modalElement.appendChild(modalHost);
    this.renderModal();

    return modalElement;
  }

  public async open(): Promise<void> {
    if (this.modal) await this.close();

    const modal = this.createModal();
    this.modal = modal;
    document.body.appendChild(modal);
    modal.classList.add(uiClasses.modalVisible);
    this.openTimerId = window.setTimeout(() => modal.classList.add(uiClasses.modalShow));
  }

  public update(modalOptions: ModalOptions): void {
    this.options = modalOptions;
    this.renderModal();
  }

  public async close(): Promise<void> {
    if (!this.modal) return;

    const modal = this.modal;
    clearTimeout(this.openTimerId);
    modal.classList.remove(uiClasses.modalShow);
    await sleep(100);
    render(null, this.modalHost!);
    modal.remove();
    this.modalHost = this.modal = null;
  }
}
