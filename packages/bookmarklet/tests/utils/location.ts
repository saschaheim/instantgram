/**
 * jsdom's `window.location` is a live navigable that doesn't accept a plain
 * URL/object assignment. Deleting it first lets us stub it with something
 * that exposes the same properties (pathname, href, ...) our code reads.
 */
export const setLocation = (href: string): void => {
    const url = new URL(href);
    delete (window as unknown as { location?: unknown }).location;
    Object.defineProperty(window, "location", {
        value: url,
        writable: true,
        configurable: true,
    });
};
