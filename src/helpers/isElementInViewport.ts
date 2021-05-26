export default function isElementInViewport(el: Element): boolean {
    let viewport: any
    if (window !== null && window !== undefined) {
        viewport = window
    } else {
        viewport = document.documentElement
    }

    const rect = el.getBoundingClientRect()

    return rect.bottom > 0 &&
        rect.right > 0 &&
        rect.left < (viewport.innerWidth || viewport.clientWidth) &&
        rect.top < (viewport.innerHeight || viewport.clientHeight)
}