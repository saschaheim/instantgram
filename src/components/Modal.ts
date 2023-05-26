import sleep from '../helpers/sleep'

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
  callback?(arg0: Modal, arg1: HTMLElement): void
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

  public constructor(modalOptions?: ModalOptions) {
    this.imageURL = modalOptions?.imageURL || ''
    this.heading = modalOptions?.heading || ['']
    this.headingStyle = modalOptions?.headingStyle || ''
    this.body = modalOptions?.body || ['']
    this.bodyStyle = modalOptions?.bodyStyle || ''
    this.buttonList = modalOptions?.buttonList || []
    this.callback = modalOptions?.callback || null

    let element = document.getElementById('instantgram-modal')
    if (element == null) {
      var style = document.createElement('style')
      style.id = 'instantgram-modal'
      style.innerHTML = `.instantgram-modal-overlay{display:none!important;opacity:0!important;transition:all ease .1s!important;position:fixed!important;top:0!important;left:0!important;right:0!important;bottom:0!important;z-index:1000!important;background:rgba(0,0,0,.65)!important;justify-content:center!important;align-items:center!important}.instantgram-modal{transition:width ease-in-out .1s!important;display:inline-block!important;width:400px!important;padding:1.6px!important;z-index:1001!important}.instantgram-modal select{margin-left:.8px!important;border:solid 1px #dbdbdb!important;border-radius:3px!important;color:#262626!important;outline:0!important;padding:3px!important;text-align:center!important}@media (min-width:736px){.instantgram-modal{width:500px!important}}.instantgram-modal-content{position:relative;display:flex;flex-direction:column;width:100%!important;pointer-events:auto!important;background-clip:padding-box!important;outline:0!important}.instantgram-modal-header{color:#fff!important;background-color:#fd1d1d!important;background-image:linear-gradient(45deg,#405de6,#5851db,#833ab4,#c13584,#e1306c,#fd1d1d)!important;border-top-left-radius:12px!important;border-top-right-radius:12px!important;padding:0 16px 0 16px!important}.instantgram-modal-header h5{color:#fff!important;font-family:"Open Sans","Helvetica Neue",Helvetica,Arial,sans-serif!important;font-size:16px!important;margin:revert!important}.instantgram-modal-header h5:nth-child(2){margin-top:-15px!important;margin-bottom:20px!important}.instantgram-modal-body{background:#fff!important;position:relative!important;-webkit-box-flex:1!important;-ms-flex:1 1 auto!important;flex:1 1 auto!important;padding:16px!important}.instantgram-modal-body > img{background: black;object-fit:scale-down}.instantgram-modal-body p{display:block!important;margin:revert!important;margin-block-start:1em!important;font-family:"Open Sans","Helvetica Neue",Helvetica,Arial,sans-serif!important;font-size:16px!important}.instantgram-modal-footer{background-color:#fff!important;border-top:1px solid #dbdbdb!important;border-left:0!important;border-right:0!important;border-bottom-left-radius:12px!important;border-bottom-right-radius:12px!important;line-height:1.5!important;min-height:48px!important;padding:4px 8px!important;user-select:none!important;display:-webkit-box!important;display:-ms-flexbox!important;display:flex!important;-webkit-box-align:center!important;-ms-flex-align:center!important;align-items:center!important;-webkit-box-pack:end!important;-ms-flex-pack:end!important;justify-content:center!important}.instantgram-modal-footer button{width:100%!important;min-height:39px!important;background-color:transparent!important;border:0!important;outline:0!important;cursor:pointer!important;font-family:"Open Sans","Helvetica Neue",Helvetica,Arial,sans-serif!important;font-size:16px!important}.instantgram-modal-footer button.active{color:#0095e2!important}.instantgram-modal-show{opacity:1!important}.instantgram-modal-visible{display:flex!important}#instantgram-bulk-download-indicator{text-align:center!important}.instantgram-modal-db {
    color: #fff!important;
    background: linear-gradient(45deg,#405de6,#5851db,#833ab4,#c13584,#e1306c,#fd1d1d)!important;
    display: block;
    padding: 0.8rem;
    width: 100%;
    border: none;
    cursor: pointer;
}
.instantgram-modal-db:focus {
  outline: none;
  background: linear-gradient(45deg, rgba(64, 93, 230, 0.5), rgba(88, 81, 219, 0.5), rgba(131, 58, 180, 0.5), rgba(193, 53, 132, 0.5), rgba(225, 48, 108, 0.5), rgba(253, 29, 29, 0.5))!important;
}
.instantgram-modal-header {
  text-align: center;
}
.instantgram-modal-header h5 {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-text-left {
  margin-right: auto;
}
.header-text-right {
  margin-left: auto;
}
.header-text-middle {
  margin: 0;
}`
      document.head.appendChild(style)
    }
  }

  public get element(): HTMLDivElement | null {
    return this.modal
  }

  private createModal(): HTMLDivElement {
    const modalElement = document.createElement('div')
    modalElement.classList.add('instantgram-modal-overlay')

    const modal = document.createElement('div')
    modal.classList.add('instantgram-modal')
    modalElement.appendChild(modal)

    const modalContent = document.createElement('div')
    modalContent.classList.add('instantgram-modal-content')
    modal.appendChild(modalContent)

    const modalHeader = document.createElement('div')
    modalHeader.classList.add('instantgram-modal-header')
    if (this.headingStyle.length > 0) {
      modalHeader.setAttribute('style', this.headingStyle)
    }
    modalContent.appendChild(modalHeader)

    this.heading.forEach(heading => {
      if (typeof heading === 'string' && !/<\/?[a-z][\s\S]*>/i.test(heading)) {
        const modalTitle = document.createElement('h5')
        modalTitle.innerHTML = heading
        modalHeader.appendChild(modalTitle)
      } else {
        if (/<\/?[a-z][\s\S]*>/i.test(heading as string)) {
          let i
          let a = document.createElement('div')
          let b = document.createDocumentFragment()
          a.innerHTML = heading as string
          while (i = a.firstChild) {
            b.appendChild(i)
          }
          modalHeader.appendChild(b)
        } else {
          modalHeader.appendChild(heading as HTMLElement)
        }
      }
    })

    const modalBody = document.createElement('div')
    modalBody.classList.add('instantgram-modal-body')
    if (this.bodyStyle.length > 0) {
      modalBody.setAttribute('style', this.bodyStyle)
    }
    modalContent.appendChild(modalBody)

    if (this.imageURL.length > 0) {
      const imageWrapper = document.createElement('div')
      modalContent.appendChild(imageWrapper)

      const image = document.createElement('img')
      image.setAttribute('height', '76px')
      image.setAttribute('width', '76px')
      image.style.margin = 'auto'
      image.style.paddingBottom = '20px'
      image.setAttribute('src', this.imageURL)
      imageWrapper.appendChild(image)
    }

    this.body.forEach(content => {
      if (typeof content === 'string' && !/<\/?[a-z][\s\S]*>/i.test(content)) {
        const modalText = document.createElement('p')
        modalText.innerText = content
        modalBody.appendChild(modalText)
      } else {
        if (/<\/?[a-z][\s\S]*>/i.test(content as string)) {
          let i
          let a = document.createElement('div')
          let b = document.createDocumentFragment()
          a.innerHTML = content as string
          while (i = a.firstChild) {
            b.appendChild(i)
          }
          modalBody.appendChild(b)
        } else {
          modalBody.appendChild(content as HTMLElement)
        }
      }
    })

    if (this.buttonList.length > 0) {
      const modalFooter = document.createElement('div')
      modalFooter.classList.add('instantgram-modal-footer')
      modalContent.appendChild(modalFooter)

      this.buttonList.forEach((button: ModalButton) => {
        const modalButton = document.createElement('button')
        modalButton.classList.add('instantgram-modal-button')
        modalButton.innerText = button.text

        if (button.active) {
          modalButton.classList.add('active')
        }

        modalButton.onclick = button?.callback ? button.callback : this.close.bind(this)
        modalFooter.appendChild(modalButton)
      })
    } else {
      modalContent.style.paddingBottom = '4px;'
    }

    return modalElement
  }

  public async open(): Promise<void> {
    if (this.modal) {
      await this.close()
    }

    this.modal = this.createModal()
    document.body.appendChild(this.modal)
    this.modal.classList.add('instantgram-modal-visible')
    setTimeout(() => {
      this.modal!.classList.add('instantgram-modal-show')
    })
  }

  public async close(): Promise<void> {
    if (!this.modal) {
      return
    }

    this.modal.classList.remove('instantgram-modal-show')
    await sleep(100)
    this.modal.classList.remove('instantgram-modal-visible')
    this.modal.parentNode.removeChild(this.modal)
    this.modal = null

    // Cleanup modal css stuff
    // select all elements on the page with the ID "instantgram-modal"
    /* const modalElements = document.querySelectorAll('#instantgram-modal');
    // loop through each element and remove any inline style attributes or class names
    modalElements.forEach((el) => {
      el.remove()
    }) */

    const callbackElements = document.querySelectorAll('#instantgram-modal-css-extension');
    // loop through each element and remove any inline style attributes or class names
    callbackElements.forEach((el) => {
      el.remove()
    })
  }

  public async refresh(): Promise<void> {
    if (this.modal) {
      this.modal.parentNode.removeChild(this.modal)
      this.modal = null
    }
    await this.open()

    // Re-trigger the callback function if it exists
    if (this?.callback) {
      this.callback(this, this.modal!.querySelector('.instantgram-modal-body')!)
    }
  }
}