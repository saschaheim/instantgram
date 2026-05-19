/* eslint-disable */
import { program } from "..";
import { cssModal } from "./Interconnect";
import { uiClasses } from "./uiTokens";
import { sleep } from "../helpers/common";

/**
 * ModalButton interface defines the structure for the buttons in the modal.
 * Includes the button text, active status, and an optional callback function to trigger when clicked.
 */
export interface ModalButton {
  text: string; // Text displayed on the button
  active?: boolean; // Optional flag to indicate if the button is active
  callback?(): void; // Optional callback function to execute when the button is clicked
}

/**
 * ModalOptions interface defines the options for creating a modal.
 * Includes image URL, heading, body content, style, buttons, and a callback function.
 */
export interface ModalOptions {
  imageURL?: string; // URL for an image to display in the modal (optional)
  heading?: (HTMLElement | string)[]; // Modal heading, which can be a string or HTML element(s)
  headingStyle?: string; // Optional custom CSS for the modal header
  body?: (HTMLElement | string)[]; // Body content, which can be strings or HTML element(s)
  bodyStyle?: string; // Optional custom CSS for the modal body
  buttonList?: ModalButton[]; // Array of buttons to display in the modal
  closeOnOverlayClick?: boolean; // Whether clicking the overlay should close the modal
  callback?(modal: Modal, modalElement: HTMLElement): void; // Optional callback to execute after opening the modal
}

/**
 * The Modal class is responsible for creating, displaying, and managing the modal dialog.
 */
export class Modal {
  public imageURL?: string; // Image URL for the modal (optional)
  public heading?: (HTMLElement | string)[]; // Modal heading (string or HTML element(s))
  public headingStyle?: string; // Custom styles for the modal heading
  public body?: (HTMLElement | string)[]; // Modal body content (string or HTML element(s))
  public bodyStyle?: string; // Custom styles for the modal body
  public buttonList?: ModalButton[]; // List of buttons to display in the modal
  public closeOnOverlayClick: boolean; // Whether overlay click closes the modal
  public callback?(modal: Modal, modalElement: HTMLElement): void; // Optional callback function for modal actions

  private modal: HTMLDivElement | null = null; // Stores the modal element
  private closePromise: Promise<void> | null = null;
  private openTimerId: number | null = null;

  private get domPrefix(): string {
    return program.DOM_PREFIX;
  }

  private containsHtml(value: string): boolean {
    return /<\/?[a-z][\s\S]*>/i.test(value);
  }

  private appendContent(container: HTMLElement, content: HTMLElement | string, plainTextTag = "div"): void {
    if (typeof content !== "string") {
      container.appendChild(content);
      return;
    }

    if (!this.containsHtml(content)) {
      const textNode = document.createElement(plainTextTag);
      textNode.textContent = content;
      container.appendChild(textNode);
      return;
    }

    const template = document.createElement("template");
    template.innerHTML = content;
    container.appendChild(template.content.cloneNode(true));
  }

  /**
   * The constructor initializes the modal with the provided options.
   */
  public constructor(modalOptions: ModalOptions) {
    this.imageURL = modalOptions.imageURL || "";
    this.heading = modalOptions.heading || [""];
    this.headingStyle = modalOptions.headingStyle || "";
    this.body = modalOptions.body || [""];
    this.bodyStyle = modalOptions.bodyStyle || "";
    this.buttonList = modalOptions.buttonList || [];
    this.closeOnOverlayClick = modalOptions.closeOnOverlayClick ?? true;
    this.callback = modalOptions.callback || null;

    const element = document.getElementById(this.domPrefix + "-modal");
    if (element == null) {
      const style = document.createElement("style");
      style.id = this.domPrefix + "-modal";
      style.textContent = cssModal; // Add modal CSS styles dynamically if they don't exist
      document.head.appendChild(style);
    }
  }

  /**
   * Getter method for the modal element.
   */
  public get element(): HTMLDivElement | null {
    return this.modal;
  }

  /**
   * Creates the modal element with its structure (header, body, buttons, etc.).
   */
  private createModal(): HTMLDivElement {
    const modalElement = document.createElement("div");
    modalElement.classList.add(uiClasses.modalOverlay); // Add overlay for the modal background
    modalElement.addEventListener("click", (event: MouseEvent) => {
      if (this.closeOnOverlayClick && event.target === modalElement) {
        void this.close();
      }
    });

    const modal = document.createElement("div");
    modal.classList.add(uiClasses.modal); // Main modal container
    modalElement.appendChild(modal);

    const modalContent = document.createElement("div");
    modalContent.classList.add(uiClasses.modalContent); // Modal content container
    modal.appendChild(modalContent);

    // Header section for the modal
    const modalHeader = document.createElement("div");
    modalHeader.classList.add(uiClasses.modalHeader);
    if (this.headingStyle.length > 0) {
      modalHeader.setAttribute("style", this.headingStyle); // Apply custom heading styles
    }
    modalContent.appendChild(modalHeader);

    // Add heading content
    this.heading.forEach(heading => {
      this.appendContent(modalHeader, heading, "h5");
    });

    // Body section for the modal
    const modalBody = document.createElement("div");
    modalBody.classList.add(uiClasses.modalBody);
    if (this.bodyStyle.length > 0) {
      modalBody.setAttribute("style", this.bodyStyle); // Apply custom body styles
    }
    modalContent.appendChild(modalBody);

    // If image URL exists, display the image
    if (this.imageURL.length > 0) {
      const imageWrapper = document.createElement("div");
      modalContent.appendChild(imageWrapper);

      const image = document.createElement("img");
      image.setAttribute("height", "76px");
      image.setAttribute("width", "76px");
      image.style.margin = "auto";
      image.style.paddingBottom = "20px";
      image.setAttribute("src", this.imageURL);
      imageWrapper.appendChild(image);
    }

    // Add body content
    this.body.forEach(content => {
      this.appendContent(modalBody, content);
    });

    // Button section for the modal
    if (this.buttonList.length > 0) {
      const modalFooter = document.createElement("div");
      modalFooter.classList.add(uiClasses.modalFooter);
      modalContent.appendChild(modalFooter);

      // Add buttons to the footer
      this.buttonList.forEach((button: ModalButton) => {
        const modalButton = document.createElement("button");
        modalButton.classList.add(uiClasses.modalButton);
        modalButton.textContent = button.text;

        if (button.active) {
          modalButton.classList.add("active");
        }

        modalButton.onclick = () => {
          if (button && button.callback) {
            button.callback(); // Trigger the button callback function
          }

          this.close.bind(this)(); // Close the modal after button click
        };
        modalFooter.appendChild(modalButton);
      });
    } else {
      modalContent.style.paddingBottom = "4px"; // Adjust padding if no buttons
    }

    return modalElement;
  }

  /**
   * Opens the modal by creating the modal HTML and appending it to the body.
   */
  public async open(): Promise<void> {
    if (this.closePromise) {
      await this.closePromise;
    }

    if (this.modal) {
      await this.close(); // Ensure any open modal is closed before opening a new one
    }

    const modal = this.createModal();
    this.modal = modal; // Create the modal HTML
    document.body.appendChild(modal); // Append modal to body
    modal.classList.add(uiClasses.modalVisible);
    this.openTimerId = window.setTimeout(() => {
      if (this.modal === modal) {
        modal.classList.add(uiClasses.modalShow);
      }
      this.openTimerId = null;
    });

    // Re-trigger the callback function if it exists
    if (this.callback) {
      this.callback(this, modal);
    }
  }

  /**
   * Closes the modal and removes it from the DOM.
   */
  public async close(): Promise<void> {
    if (this.closePromise) {
      return this.closePromise;
    }

    if (!this.modal) {
      return;
    }

    const modal = this.modal;
    if (this.openTimerId !== null) {
      clearTimeout(this.openTimerId);
      this.openTimerId = null;
    }

    this.closePromise = (async () => {
      modal.classList.remove(uiClasses.modalShow);
      await sleep(100); // Add a small delay for the closing animation
      modal.classList.remove(uiClasses.modalVisible);
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal); // Remove modal from the DOM
      }
      if (this.modal === modal) {
        this.modal = null;
      }
      this.closePromise = null;
    })();

    return this.closePromise;
  }

  /**
   * Refreshes the modal by closing and reopening it.
   */
  public async refresh(): Promise<void> {
    if (this.closePromise) {
      await this.closePromise;
    }
    if (this.modal) {
      const modal = this.modal;
      if (this.openTimerId !== null) {
        clearTimeout(this.openTimerId);
        this.openTimerId = null;
      }
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
      if (this.modal === modal) {
        this.modal = null;
      }
    }
    await this.open(); // Reopen the modal

    // Re-trigger the callback function if it exists
    // open() already runs callback
  }
}
