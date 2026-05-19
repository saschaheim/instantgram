const getRecord = (value: object): Record<string, unknown> => value as Record<string, unknown>;

export function getReactFiberKey(element: Record<string, unknown>) {
    return Object.keys(element).find(key => key.includes('Instance') || key.includes('Fiber'));
}

export const traverseReactDOMAndFindHidden = (root: Element | null): HTMLElement | null => {
    const traverse = (node: Element | null): HTMLElement | null => {
        if (!node) return null;
        const nodeRecord = getRecord(node);
        const fiberKey = getReactFiberKey(nodeRecord);
        const fiberNode = fiberKey ? nodeRecord[fiberKey] as { memoizedProps?: { hidden?: boolean }, return?: { memoizedProps?: { hidden?: boolean } } } : null;
        const isHidden = fiberNode?.memoizedProps?.hidden === true || fiberNode?.return?.memoizedProps?.hidden === true;
        return node.tagName === 'DIV' && !isHidden ? node as HTMLElement : null;
    };

    if (!root) return null;

    let child = root.firstElementChild;
    while (child) {
        const result = traverse(child);
        if (result) return result;
        child = child.nextElementSibling;
    }
    return null;
};

export const getReactInstanceFromElement = (el: Record<string, unknown>) => {
    const key = Object.keys(el).find((key) => key.includes("Instance") || key.includes("Fiber"));
    return key ? el[key] : null;
};

export const compareMpegRepresentation = (a: { quality: string; bandwidth: number; }, b: { quality: string; bandwidth: number; }) =>
    a.quality === "hd" && b.quality !== "hd" ? -1 :
        a.quality !== "hd" && b.quality === "hd" ? 1 :
            b.bandwidth - a.bandwidth;

export const toMpegRepresentation = (el: Element) => ({
    quality: el.getAttribute("FBQualityClass"),
    bandwidth: +el.getAttribute("bandwidth"),
    baseUrl: el.querySelector("BaseURL")?.textContent?.trim() || null,
});

export const getOriginalVideo = (el: (Record<string, unknown> & { src?: string }) | null, manifest?: string) => {
    const src = el?.src && !el.src.startsWith("blob:") ? el.src : null;
    if (src) return src;

    const reactInstance = el ? getReactInstanceFromElement(el) as { return?: { return?: { memoizedProps?: { manifest?: string } } } } | null : null;
    const videoManifest = manifest || reactInstance?.return?.return?.memoizedProps?.manifest;
    if (!videoManifest) return null;

    const doc = new DOMParser().parseFromString(videoManifest, "text/xml");
    const representations = Array.from(doc.querySelectorAll('Representation[mimeType="video/mp4"]'))
        .map(toMpegRepresentation)
        .filter(rep => rep.baseUrl)
        .sort(compareMpegRepresentation);

    return representations[0]?.baseUrl || null;
};

export function findMediaInSpecificElementAndChildren(el: HTMLElement) {
    const visitedNodes = new Set();

    function searchFiber(fiberNode: any) {
        if (!fiberNode || visitedNodes.has(fiberNode)) return;
        visitedNodes.add(fiberNode);

        if (fiberNode.memoizedProps && fiberNode.memoizedProps.post) {
            const postProp = fiberNode.memoizedProps.post;
            searchForMedia(postProp);
        }

        if (fiberNode.child) searchFiber(fiberNode.child);
        if (fiberNode.sibling) searchFiber(fiberNode.sibling);
    }

    function searchForMedia(obj: any) {
        if (!obj || typeof obj !== 'object') return;

        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                if (obj[key].startsWith('http') && obj[key].includes('mp4')) {
                    console.log('MP4 URL found:', obj[key]);
                } else if (obj[key].startsWith('http') && obj[key].includes('jpg')) {
                    console.log('JPG URL found:', obj[key]);
                }
            } else if (typeof obj[key] === 'object') {
                searchForMedia(obj[key]);
            }
        }
    }

    function searchElementAndChildren(element: HTMLElement) {
        searchFiber(element);

        const childElements = element.querySelectorAll('*');
        childElements.forEach((childElement) => {
            const childRecord = getRecord(childElement);
            const instanceKey = Object.keys(childRecord).find(key => key.includes('Instance') || key.includes('Fiber'));
            const reactFiber = instanceKey ? childRecord[instanceKey] : null;
            if (reactFiber) {
                searchFiber(reactFiber);
            }
        });
    }

    searchElementAndChildren(el);
}

export function findMediaUrl(el: HTMLElement, propName?: string) {
    const visitedNodes = new Set();
    const mediaUrlElements: Array<{ url: string; reactEl: Record<string, unknown>; element: HTMLElement }> = [];

    function searchFiber(fiberNode: any, element: HTMLElement) {
        if (!fiberNode || visitedNodes.has(fiberNode)) return;
        visitedNodes.add(fiberNode);

        function processMemoizedProps(memoizedProps: Record<string, unknown>, targetElement: HTMLElement) {
            if (propName) {
                if (memoizedProps[propName] && typeof memoizedProps[propName] === 'string') {
                    mediaUrlElements.push({
                        url: memoizedProps[propName],
                        reactEl: memoizedProps,
                        element: targetElement
                    });
                }
            } else {
                for (const prop in memoizedProps) {
                    if (typeof memoizedProps[prop] === 'string' && memoizedProps[prop].includes('mpd')) {
                        mediaUrlElements.push({
                            url: memoizedProps[prop],
                            reactEl: memoizedProps,
                            element: targetElement
                        });
                    }
                }
            }
        }

        if (fiberNode.memoizedProps) {
            processMemoizedProps(fiberNode.memoizedProps, element);
        }

        if (fiberNode.child) searchFiber(fiberNode.child, element);
        if (fiberNode.sibling) searchFiber(fiberNode.sibling, element);

        let currentReturn = fiberNode.return;
        while (currentReturn) {
            if (currentReturn.memoizedProps) {
                processMemoizedProps(currentReturn.memoizedProps, element);
            }
            currentReturn = currentReturn.return;
        }
    }

    function traverseDom(element: HTMLElement) {
        if (!element) return;

        const elementRecord = getRecord(element);
        const instanceKey = Object.keys(elementRecord).find(key => key.includes('Instance') || key.includes('Fiber'));
        if (instanceKey) {
            const reactFiber = elementRecord[instanceKey];
            searchFiber(reactFiber, element);
        }

        Array.from(element.children).forEach(child => traverseDom(child as HTMLElement));
    }

    traverseDom(el);

    const urlCounts = mediaUrlElements.reduce<Record<string, number>>((acc, item) => {
        const url = item.url;
        if (url) {
            acc[url] = (acc[url] || 0) + 1;
        }
        return acc;
    }, {});

    let mostFrequentUrl = null;
    let maxCount = 0;
    for (const url in urlCounts) {
        if (urlCounts[url] > maxCount) {
            maxCount = urlCounts[url];
            mostFrequentUrl = url;
        }
    }

    return { mediaUrlElements, mostFrequentUrl, maxCount };
}

export const processMediaUrls = (mediaUrlElements: Array<{ url: string }>) => {
    return mediaUrlElements.map(mediaElement => {
        const videoUrl = getOriginalVideo(null, mediaElement.url);
        console.log(videoUrl);
        return videoUrl;
    })
        .filter(url => url !== null);
};
