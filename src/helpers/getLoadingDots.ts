export default function getLoadingDots(el: HTMLElement, t: number = 500) {
    let i = 0
    return setInterval(() => {
        el.innerText = Array(i = i > 2 ? 0 : i + 1).fill('.').join('')
    }, t)
}