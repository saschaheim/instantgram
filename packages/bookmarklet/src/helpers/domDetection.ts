import localize from "./localize";

export const getElementInViewPercentage = (el: HTMLElement): number => {
    if (!el?.getBoundingClientRect) return 0;

    const { top, bottom } = el.getBoundingClientRect();
    const viewportTop = window.scrollY || document.documentElement.scrollTop;
    const viewportBottom = viewportTop + window.innerHeight;
    const elementTop = top + window.scrollY;
    const elementBottom = bottom + window.scrollY;

    if (viewportTop > elementBottom || viewportBottom < elementTop) return 0;

    const visibleHeight = Math.min(viewportBottom, elementBottom) - Math.max(viewportTop, elementTop);
    const elementHeight = bottom - top;

    return Math.round((visibleHeight / elementHeight) * 100);
};

export const resolveCurrentStoryIndex = (el: HTMLElement): number => {
    if (!el) {
        return 0;
    }

    const selectors = [
        "._acvz._acnc._acng",
        "section header div",
        ".x1ned7t2.x78zum5",
        "section > div header > div",
        "section > div > div > div > div > div > div > div > div",
        "div > div > div > div > div > div > div > div"
    ];

    let slidesRoot: { children: Iterable<unknown> | ArrayLike<unknown> };
    let matchedSelector = "";
    for (const selector of selectors) {
        slidesRoot = el.querySelector(selector);
        if (slidesRoot) {
            matchedSelector = selector;
            break;
        }
    }

    if (!slidesRoot) {
        return 0;
    }

    const slidesChildren: HTMLElement[] = Array.from(slidesRoot.children) as HTMLElement[];

    for (let i = 0; i < slidesChildren.length; i++) {
        const allDivs = slidesChildren[i].querySelectorAll('div');

        if (allDivs.length === 0) {
            if (matchedSelector === "._acvz._acnc._acng") {
                const classListLength = slidesChildren[i].classList.length;
                if (classListLength > 1) {
                    return i;
                }
            } else {
                continue;
            }
        } else {
            const spanElement = allDivs[0]?.parentNode?.parentNode?.parentNode?.parentNode?.parentNode?.children[1]?.querySelector('span');
            if (spanElement) {
                return 0;
            } else {
                for (const div of Array.from(allDivs)) {
                    const widthStyle = div.style.width;
                    const transformStyle = div.style.transform;

                    if ((widthStyle && widthStyle !== "100%") || (transformStyle && transformStyle.trim() !== "")) {
                        return i;
                    }
                }
            }
        }
    }

    return 0;
};

export const findAD = (el: HTMLElement): boolean => {
    if (el.querySelector('a[href*="https://www.facebook.com/ads/"]')) return true;
    const labels = new Set([localize("ad").trim().toLocaleLowerCase(), "anzeige"]);
    return Array.from(el.querySelectorAll<HTMLElement>("span,div"))
        .some(node => node.children.length === 0 && labels.has(node.textContent?.trim().toLocaleLowerCase() || ""));
};

// Shared by every "pick the element with the highest score" scan (widest div,
// most-visible article/story). requirePositive mirrors call sites that must
// discard a max score of 0 or less (i.e. nothing actually scored) as "not found".
export const findWithMaxScore = <T,>(items: readonly T[], score: (item: T) => number, requirePositive?: boolean): T | null => {
    let best: T | null = null;
    let bestScore = 0;
    for (let i = 0; i < items.length; i++) {
        const s = score(items[i]);
        if (best === null || s > bestScore) {
            best = items[i];
            bestScore = s;
        }
    }
    return requirePositive && bestScore <= 0 ? null : best;
};

export const getElementWithHighestWidth = (el: HTMLElement): HTMLElement | null => {
    if (!el) return null;
    const divs = el.querySelectorAll<HTMLElement>('div > div > div');
    return findWithMaxScore(Array.from(divs), div => parseFloat(getComputedStyle(div).width));
};
