import sleep from '../helpers/sleep'

export type AlertType = 'default' | 'warn' | 'error'

export abstract class Alert {

  private static wrapper: HTMLDivElement = Alert.addBaseToPage()

  public static add(text: string, type: AlertType = 'default', timeout: number = 5000): void {
    let element = document.getElementById('instantgram-alert')
    if (element == null) {
      var style = document.createElement('style')
      style.id = 'instantgram-alert'
      style.innerHTML = `.instantgram-alert-wrapper{position:fixed;bottom:4rem;left:calc(50% - 225px);width:calc(80vw - 1rem);z-index:2000;max-width:550px}.instantgram-alert{opacity:0;transition:opacity .2s;position:relative;margin-top:20px;padding:15px 29px 15px 15px;animation:fade-in .3s;border-radius:5px}.instantgram-alert.fade-in{opacity:1}.instantgram-alert.fade-out{opacity:0}.instantgram-alert-close{position:absolute;content:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' stroke='white' fill='white' width='18' height='18' viewBox='0 0 18 18'%3E%3Cpath stroke='white' d='M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z'/%3E%3C/svg%3E%0A");cursor:pointer;right:5px;top:5px}.instantgram-alert-default{background-color:#0095f6;color:#fff}.instantgram-alert-warn{background-color:#f69500;color:#fff}.instantgram-alert-error{background-color:#f65a00;color:#fff}`
      document.head.appendChild(style)
    }

    const message = document.createElement('div')
    message.classList.add('instantgram-alert', 'instantgram-alert-' + type)

    const closeIcon = document.createElement('i')
    closeIcon.onclick = () => Alert.remove(message)
    closeIcon.classList.add('instantgram-alert-close')
    message.appendChild(closeIcon)

    const textElement = document.createElement('div')
    textElement.innerHTML = text
    message.appendChild(textElement)

    Alert.wrapper.appendChild(message)
    Alert.animateIn(message)

    sleep(timeout).then(() => Alert.remove(message))
  }

  private static animateIn(element: HTMLDivElement): void {
    element.animate(
      [{ opacity: '0' }, { opacity: '1' }],
      { duration: 300, fill: 'forwards' }
    )
  }

  private static addBaseToPage(): HTMLDivElement {
    document.querySelectorAll('.instantgram-alert-wrapper').forEach(e => e.remove())

    const wrapper = document.createElement('div')
    wrapper.classList.add('instantgram-alert-wrapper')
    document.body.appendChild(wrapper)

    return wrapper
  }

  private static remove(element: HTMLDivElement): void {
    const animation = element.animate(
      [{ opacity: '1' }, { opacity: '0' }],
      { duration: 300, fill: 'forwards' }
    )
    animation.finished.then(() => {
      element.remove()
      this.wrapper.remove()
    })
  }
}