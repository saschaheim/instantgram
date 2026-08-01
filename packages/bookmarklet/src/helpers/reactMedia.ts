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
