import { ComponentChildren, render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { program } from "../..";
import localize, { subscribeLocale } from "../../helpers/localize";
import { LocalizationKey } from "../../localization";
import { cssModal } from "./styles";
import { cssCarouselSlider } from "../mediaViewer/sliderStyles";
import { cssGeneral, cssSlideOn } from "../shared/generalStyles";
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

let activeRoot: ShadowRoot | null = null;

/**
 * The shadow root of the modal that opened last, or null while none is open.
 * Every element and every style rule of ours lives in there: the class names
 * are single letters ("a".."q") and several rules are unscoped and !important,
 * so injecting them into the page itself restyled Instagram's own buttons and
 * inputs, and the <style> tags outlived the modal. Tracked in a variable
 * rather than looked up by id because the update notice can open its own modal
 * while another one is already up.
 */
export const findModalRoot = (): ShadowRoot | null => activeRoot;

export class Modal {
  private options: ModalOptions;
  private modal: HTMLDivElement | null = null;
  private modalHost: HTMLDivElement | null = null;
  private host: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private openTimerId = 0;

  public constructor(modalOptions: ModalOptions) {
    this.options = modalOptions;
  }

  private createHost(): HTMLDivElement {
    const host = document.createElement("div");
    host.className = program.DOM_PREFIX + "-root";
    const style = document.createElement("style");
    style.textContent = cssModal + cssGeneral + cssSlideOn + cssCarouselSlider;
    this.shadowRoot = host.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(style);
    return host;
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
    const host = this.createHost();
    this.host = host;
    this.shadowRoot!.appendChild(modal);
    activeRoot = this.shadowRoot;
    document.body.appendChild(host);
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
    // Takes the shadow root's <style> with it, so nothing of ours is left in
    // the page once the modal is closed.
    this.host?.remove();
    if (activeRoot === this.shadowRoot) {
      activeRoot = null;
    }
    this.shadowRoot = this.host = this.modalHost = this.modal = null;
  }
}
