/* eslint-disable */
import { program } from "..";
import { cssModal } from "./Interconnect";
import { sleep } from "../helpers/utils";

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
  public callback?(modal: Modal, modalElement: HTMLElement): void; // Optional callback function for modal actions

  private modal: HTMLDivElement | null = null; // Stores the modal element

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
    this.callback = modalOptions.callback || null;

    const element = document.getElementById(program.NAME + "-modal");
    if (element == null) {
      const style = document.createElement("style");
      style.id = program.NAME + "-modal";
      style.innerHTML = cssModal; // Add modal CSS styles dynamically if they don't exist
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
    modalElement.classList.add(program.NAME + "-modal-overlay"); // Add overlay for the modal background

    const modal = document.createElement("div");
    modal.classList.add(program.NAME + "-modal"); // Main modal container
    modalElement.appendChild(modal);

    const modalContent = document.createElement("div");
    modalContent.classList.add(program.NAME + "-modal-content"); // Modal content container
    modal.appendChild(modalContent);

    // Header section for the modal
    const modalHeader = document.createElement("div");
    modalHeader.classList.add(program.NAME + "-modal-header");
    if (this.headingStyle.length > 0) {
      modalHeader.setAttribute("style", this.headingStyle); // Apply custom heading styles
    }
    modalContent.appendChild(modalHeader);

    // Add heading content
    this.heading.forEach(heading => {
      if (typeof heading === "string" && !/<\/?[a-z][\s\S]*>/i.test(heading)) {
        const modalTitle = document.createElement("h5");
        modalTitle.innerHTML = heading; // If heading is a string, add as text
        modalHeader.appendChild(modalTitle);
      } else {
        if (/<\/?[a-z][\s\S]*>/i.test(heading as string)) {
          const a = document.createElement("div");
          const b = document.createDocumentFragment();
          a.innerHTML = heading as string; // Handle HTML content in the heading
          let i;
          while ((i = a.firstChild) !== null) {
            b.appendChild(i);
          }
          modalHeader.appendChild(b);
        } else {
          modalHeader.appendChild(heading as HTMLElement);
        }
      }
    });

    // Body section for the modal
    const modalBody = document.createElement("div");
    modalBody.classList.add(program.NAME + "-modal-body");
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
      if (typeof content === "string" && !/<\/?[a-z][\s\S]*>/i.test(content)) {
        const modalText = document.createElement("div");
        modalText.innerText = content; // If content is a string, add as text
        modalBody.appendChild(modalText);
      } else {
        if (/<\/?[a-z][\s\S]*>/i.test(content as string)) {
          const a = document.createElement("div");
          const b = document.createDocumentFragment();
          a.innerHTML = content as string; // Handle HTML content in the body
          let i;
          while ((i = a.firstChild) !== null) {
            b.appendChild(i);
          }
          modalBody.appendChild(b);
        } else {
          modalBody.appendChild(content as HTMLElement);
        }
      }
    });

    // Button section for the modal
    if (this.buttonList.length > 0) {
      const modalFooter = document.createElement("div");
      modalFooter.classList.add(program.NAME + "-modal-footer");
      modalContent.appendChild(modalFooter);

      // Add buttons to the footer
      this.buttonList.forEach((button: ModalButton) => {
        const modalButton = document.createElement("button");
        modalButton.classList.add(program.NAME + "-modal-button");
        modalButton.innerText = button.text;

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
      modalContent.style.paddingBottom = "4px;"; // Adjust padding if no buttons
    }

    return modalElement;
  }

  /**
   * Opens the modal by creating the modal HTML and appending it to the body.
   */
  public async open(): Promise<void> {
    if (this.modal) {
      await this.close(); // Ensure any open modal is closed before opening a new one
    }

    this.modal = this.createModal(); // Create the modal HTML
    document.body.appendChild(this.modal); // Append modal to body
    this.modal.classList.add(program.NAME + "-modal-visible");
    setTimeout(() => {
      this.modal.classList.add(program.NAME + "-modal-show");
    });

    // Re-trigger the callback function if it exists
    if (this.callback) {
      this.callback(this, this.modal);
    }
  }

  /**
   * Closes the modal and removes it from the DOM.
   */
  public async close(): Promise<void> {
    if (!this.modal) {
      return;
    }

    this.modal.classList.remove(program.NAME + "-modal-show");
    await sleep(100); // Add a small delay for the closing animation
    this.modal.classList.remove(program.NAME + "-modal-visible");
    this.modal.parentNode.removeChild(this.modal); // Remove modal from the DOM
    this.modal = null;
  }

  /**
   * Refreshes the modal by closing and reopening it.
   */
  public async refresh(): Promise<void> {
    if (this.modal) {
      this.modal.parentNode.removeChild(this.modal);
      this.modal = null;
    }
    await this.open(); // Reopen the modal

    // Re-trigger the callback function if it exists
    if (this.callback) {
      this.callback(this, this.modal.querySelector("." + program.NAME + "-modal-body")!);
    }
  }
}