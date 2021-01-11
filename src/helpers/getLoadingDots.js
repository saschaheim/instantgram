import interval from '../helpers/interval.js'

export default function getLoadingDots(el, t = 500) {
    var _int = interval(function() {
        if ((el.innerHTML += '.').length == 4) {
            el.innerHTML = ''
        }
    }, t)
}