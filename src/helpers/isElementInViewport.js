export default function isElementInViewport(el, viewport) {
    viewport = viewport || (window || document.documentElement)
    var rect = el.getBoundingClientRect()

    return rect.bottom > 0 &&
        rect.right > 0 &&
        rect.left < (viewport.innerWidth || viewport.clientWidth) &&
        rect.top < (viewport.innerHeight || viewport.clientHeight)
}