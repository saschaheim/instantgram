import localization from "../localization";

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
                const targetIndex = Array.from(allDivs[0]?.parentNode?.parentNode?.children ?? []).findIndex(child => child.children.length > 0);
                return (slidesChildren.length - targetIndex) > 0 ? 0 : 0;
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

export const findAD = (el: HTMLElement, isStory?: boolean): boolean => {
    const isADPathPresent = (): boolean => {
        return Boolean(Array.from(el.querySelectorAll<SVGPathElement>("path"))
            .find(p => p.getAttribute("d") === "M21 17.502a.997.997 0 0 1-.707-.293L12 8.913l-8.293 8.296a1 1 0 1 1-1.414-1.414l9-9.004a1.03 1.03 0 0 1 1.414 0l9 9.004A1 1 0 0 1 21 17.502Z"));
    };

    const getAdText = (): string | undefined => {
        try {
            return el.children[0]?.children[0]?.children[0]?.children[0]?.children[0]?.children[1]?.children[0]?.children[0]?.children[1]?.children[1]?.children[0]?.textContent;
        } catch {
            return undefined;
        }
    };

    if (isStory) {
        const adText = getAdText();
        if (adText) {
            return Object.values(localization.langs).some(locale => locale.ad === adText);
        }
        return false;
    }

    return isADPathPresent();
};

export const getElementWithHighestWidth = (el: HTMLElement): HTMLElement | null => {
    if (!el) return null;
    const divs = el.querySelectorAll<HTMLElement>('div > div > div');
    if (divs.length === 0) return null;
    return Array.from(divs).reduce((maxDiv, currentDiv) => {
        const maxWidth = parseFloat(getComputedStyle(maxDiv).width);
        const currentWidth = parseFloat(getComputedStyle(currentDiv).width);
        return currentWidth > maxWidth ? currentDiv : maxDiv;
    }, divs[0]);
};

export const getStoryWrapper = (el: HTMLElement | null | undefined) => {
    const sections = [...el?.querySelectorAll("section") || []];
    return sections[sections.length - 1];
};

export const getAllNodeParent = (el: { parentNode: any; }) => {
    const parents = [];
    for (parents.push(el); el.parentNode;) {
        parents.unshift(el.parentNode);
        el = el.parentNode;
    }
    return parents;
};

export const isElementInViewport = (el: HTMLElement) => {
    const { top, right, bottom, left } = el.getBoundingClientRect();
    return bottom > 0 && right > 0 && left < window.innerWidth && top < window.innerHeight;
};

export const isProfileImage = (el: HTMLElement) => {
    const parent = el.parentElement;
    const elementWidth = el.getBoundingClientRect().width;
    return el.getAttribute("data-testid") === "user-avatar" ||
        elementWidth < 48 ||
        ["span", "a"].includes(parent?.localName) ||
        getAllNodeParent(el).some(node => node.nodeName === "HEADER");
};
