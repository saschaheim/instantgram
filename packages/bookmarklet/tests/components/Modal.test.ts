import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src", () => ({
  program: { DOM_PREFIX: "instg" },
}));

vi.mock("../../src/helpers/localize", () => ({
  default: (key: string) => key,
  subscribeLocale: () => () => undefined,
}));

import { Modal } from "../../src/components/modal";
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

    const overlay = document.querySelector(`.${uiClasses.modalOverlay}`);
    expect(overlay?.textContent).toContain("Searching");

    modal.update({
      body: "Ready",
      buttonList: [{ active: true, text: "Close" }],
    });

    expect(document.querySelector(`.${uiClasses.modalOverlay}`)).toBe(overlay);
    expect(overlay?.textContent).not.toContain("Searching");
    expect(overlay?.textContent).toContain("Ready");
    expect(overlay?.querySelector("button")?.textContent).toBe("Close");

    await modal.close();
  });
});
