const fiberKey = (value: Record<string, unknown>) => Object.keys(value).find((key) => key.includes("Instance") || key.includes("Fiber"));

export const traverseReactDOMAndFindHidden = (root: Element | null): HTMLElement | null => {
    if (!root) return null;
    let child = root.firstElementChild;
    while (child) {
        const record = child as unknown as Record<string, unknown>;
        const fiber = fiberKey(record);
        const props = fiber ? (record[fiber] as { memoizedProps?: { hidden?: boolean }, return?: { memoizedProps?: { hidden?: boolean } } }) : null;
        if (child.tagName === "DIV" && props?.memoizedProps?.hidden !== true && props?.return?.memoizedProps?.hidden !== true) {
            return child as HTMLElement;
        }
        child = child.nextElementSibling;
    }
    return null;
};

export function findMediaUrl(el: HTMLElement, propName?: string) {
    const seen = new Set();
    const hits: Array<{ url: string }> = [];
    const push = (props: Record<string, unknown>) => {
        if (propName) {
            const value = props[propName];
            if (typeof value === "string") hits.push({ url: value });
            return;
        }
        for (const key in props) {
            const value = props[key];
            if (typeof value === "string" && value.includes("mpd")) hits.push({ url: value });
        }
    };

    const walkFiber = (fiber: any) => {
        if (!fiber || seen.has(fiber)) return;
        seen.add(fiber);
        if (fiber.memoizedProps) push(fiber.memoizedProps);
        walkFiber(fiber.child);
        walkFiber(fiber.sibling);
        for (let parent = fiber.return; parent; parent = parent.return) {
            if (parent.memoizedProps) push(parent.memoizedProps);
        }
    };

    const walkDom = (node: HTMLElement) => {
        const record = node as unknown as Record<string, unknown>;
        const key = fiberKey(record);
        if (key) walkFiber(record[key]);
        for (const child of Array.from(node.children)) walkDom(child as HTMLElement);
    };

    walkDom(el);

    const counts = hits.reduce<Record<string, number>>((acc, item) => {
        acc[item.url] = (acc[item.url] || 0) + 1;
        return acc;
    }, {});

    let mostFrequentUrl: string | null = null;
    let maxCount = 0;
    for (const url in counts) {
        if (counts[url] > maxCount) {
            maxCount = counts[url];
            mostFrequentUrl = url;
        }
    }

    return { mediaUrlElements: hits, mostFrequentUrl, maxCount };
}
