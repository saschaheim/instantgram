import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src", () => ({
  program: { DOM_PREFIX: "instg" },
}));

vi.mock("../../src/helpers/localize", () => ({
  default: (key: string) => key,
  subscribeLocale: () => () => undefined,
}));

import { Modal, findModalRoot } from "../../src/components/modal";
import { uiClasses } from "../../src/components/shared/uiTokens";

afterEach(() => {
  document.body.replaceChildren();
});

describe("Modal.update", () => {
  it("reuses the open modal while replacing its Preact content", async () => {
    const modal = new Modal({
      body: "Searching",
      buttonList: [],
      closeOnOverlayClick: false,
    });
    await modal.open();

    const overlay = findModalRoot()?.querySelector(`.${uiClasses.modalOverlay}`);
    expect(overlay?.textContent).toContain("Searching");

    modal.update({
      body: "Ready",
      buttonList: [{ active: true, text: "Close" }],
    });

    expect(findModalRoot()?.querySelector(`.${uiClasses.modalOverlay}`)).toBe(overlay);
    expect(overlay?.textContent).not.toContain("Searching");
    expect(overlay?.textContent).toContain("Ready");
    expect(overlay?.querySelector("button")?.textContent).toBe("Close");

    await modal.close();
  });

  // The class names are single letters and several rules are unscoped and
  // !important, so anything of ours reaching the page itself restyles
  // Instagram. The shadow root keeps all of it out, and closing takes it away.
  it("keeps its markup and styles out of the page, and cleans up on close", async () => {
    const modal = new Modal({ body: "Searching", buttonList: [] });
    await modal.open();

    expect(document.querySelector(`.${uiClasses.modalOverlay}`)).toBeNull();
    expect(document.querySelector("style")).toBeNull();
    expect(findModalRoot()?.querySelector("style")).not.toBeNull();

    await modal.close();

    expect(findModalRoot()).toBeNull();
    expect(document.body.children).toHaveLength(0);
  });

  // The update notice opens its own modal while another one can already be up,
  // so the root has to follow the modal that opened last -- and closing that
  // one must not blank out a root it doesn't own.
  it("tracks the modal that opened last when two are up at once", async () => {
    const first = new Modal({ body: "First", buttonList: [] });
    const second = new Modal({ body: "Second", buttonList: [] });
    await first.open();
    await second.open();

    expect(findModalRoot()?.textContent).toContain("Second");

    await first.close();
    expect(findModalRoot()?.textContent).toContain("Second");

    await second.close();
    expect(findModalRoot()).toBeNull();
  });
});
