/* eslint-disable */
import { program } from ".."
import { cssModal } from "./Interconnect"
import { sleep } from "../helpers/utils"

/**
 * An interface for the modal button
 */
export interface ModalButton {
  text: string
  active?: boolean

  callback?(): void
}

export interface ModalOptions {
  imageURL?: string
  heading?: (HTMLElement | string)[]
  headingStyle?: string
  body?: (HTMLElement | string)[]
  bodyStyle?: string
  buttonList?: ModalButton[]
  callback?(
    arg0: Modal, 
    arg1: HTMLElement
  ): void
}

export class Modal {
  public imageURL?: string
  public heading?: (HTMLElement | string)[]
  public headingStyle?: string
  public body?: (HTMLElement | string)[]
  public bodyStyle?: string
  public buttonList?: ModalButton[]
  public callback?(arg0: Modal, arg1: HTMLElement): void

  private modal: HTMLDivElement | null = null

  public constructor(modalOptions: ModalOptions) {
    this.imageURL = modalOptions.imageURL || ""
    this.heading = modalOptions.heading || [""]
    this.headingStyle = modalOptions.headingStyle || ""
    this.body = modalOptions.body || [""]
    this.bodyStyle = modalOptions.bodyStyle || ""
    this.buttonList = modalOptions.buttonList || []
    this.callback = modalOptions.callback || null

    const element = document.getElementById(program.NAME + "-modal")
    if (element == null) {
      const style = document.createElement("style")
      style.id = program.NAME + "-modal"
      style.innerHTML = cssModal
      document.head.appendChild(style)
    }
  }

  public get element(): HTMLDivElement | null {
    return this.modal
  }

  private createModal(): HTMLDivElement {
    const modalElement = document.createElement("div")
    modalElement.classList.add(program.NAME + "-modal-overlay")

    const modal = document.createElement("div")
    modal.classList.add(program.NAME + "-modal")
    modalElement.appendChild(modal)

    const modalContent = document.createElement("div")
    modalContent.classList.add(program.NAME + "-modal-content")
    modal.appendChild(modalContent)

    const modalHeader = document.createElement("div")
    modalHeader.classList.add(program.NAME + "-modal-header")
    if (this.headingStyle.length > 0) {
      modalHeader.setAttribute("style", this.headingStyle)
    }
    modalContent.appendChild(modalHeader)

    this.heading.forEach(heading => {
      if (typeof heading === "string" && !/<\/?[a-z][\s\S]*>/i.test(heading)) {
        const modalTitle = document.createElement("h5")
        modalTitle.innerHTML = heading
        modalHeader.appendChild(modalTitle)
      } else {
        if (/<\/?[a-z][\s\S]*>/i.test(heading as string)) {
          const a = document.createElement("div")
          const b = document.createDocumentFragment()
          a.innerHTML = heading as string
          let i
          while ((i = a.firstChild) !== null) {
            b.appendChild(i)
          }
          modalHeader.appendChild(b)
        } else {
          modalHeader.appendChild(heading as HTMLElement)
        }
      }
    })

    const modalBody = document.createElement("div")
    modalBody.classList.add(program.NAME + "-modal-body")
    if (this.bodyStyle.length > 0) {
      modalBody.setAttribute("style", this.bodyStyle)
    }
    modalContent.appendChild(modalBody)

    if (this.imageURL.length > 0) {
      const imageWrapper = document.createElement("div")
      modalContent.appendChild(imageWrapper)

      const image = document.createElement("img")
      image.setAttribute("height", "76px")
      image.setAttribute("width", "76px")
      image.style.margin = "auto"
      image.style.paddingBottom = "20px"
      image.setAttribute("src", this.imageURL)
      imageWrapper.appendChild(image)
    }

    this.body.forEach(content => {
      if (typeof content === "string" && !/<\/?[a-z][\s\S]*>/i.test(content)) {
        const modalText = document.createElement("div")
        modalText.innerText = content
        modalBody.appendChild(modalText)
      } else {
        if (/<\/?[a-z][\s\S]*>/i.test(content as string)) {
          const a = document.createElement("div")
          const b = document.createDocumentFragment()
          a.innerHTML = content as string
          let i
          while ((i = a.firstChild) !== null) {
            b.appendChild(i)
          }
          modalBody.appendChild(b)
        } else {
          modalBody.appendChild(content as HTMLElement)
        }
      }
    })

    if (this.buttonList.length > 0) {
      const modalFooter = document.createElement("div")
      modalFooter.classList.add(program.NAME + "-modal-footer")
      modalContent.appendChild(modalFooter)

      this.buttonList.forEach((button: ModalButton) => {
        const modalButton = document.createElement("button")
        modalButton.classList.add(program.NAME + "-modal-button")
        modalButton.innerText = button.text

        if (button.active) {
          modalButton.classList.add("active")
        }

        modalButton.onclick = () => {
          if (button && button.callback) {
            button.callback()
          }

          this.close.bind(this)()
        }
        modalFooter.appendChild(modalButton)
      })
    } else {
      modalContent.style.paddingBottom = "4px;"
    }

    return modalElement
  }

  public async open(): Promise<void> {
    if (this.modal) {
      await this.close()
    }

    this.modal = this.createModal()
    document.body.appendChild(this.modal)
    this.modal.classList.add(program.NAME + "-modal-visible")
    setTimeout(() => {
      this.modal.classList.add(program.NAME + "-modal-show")
    })

    // Re-trigger the callback function if it exists
    if (this.callback) {
      this.callback(this, this.modal)
    }
  }

  public async close(): Promise<void> {
    if (!this.modal) {
      return
    }

    this.modal.classList.remove(program.NAME + "-modal-show")
    await sleep(100)
    this.modal.classList.remove(program.NAME + "-modal-visible")
    this.modal.parentNode.removeChild(this.modal)
    this.modal = null
  }

  public async refresh(): Promise<void> {
    if (this.modal) {
      this.modal.parentNode.removeChild(this.modal)
      this.modal = null
    }
    await this.open()

    // Re-trigger the callback function if it exists
    if (this.callback) {
      this.callback(this, this.modal.querySelector("." + program.NAME + "-modal-body")!)
    }
  }
}