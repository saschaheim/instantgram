import interval from '../helpers/interval'

export default function getLoadingDots(el: Element, t: number = 500) {
    var _int = interval(function () {
        if ((el.innerHTML += '.').length == 4) {
            el.innerHTML = ''
        }
    }, t, null)
}