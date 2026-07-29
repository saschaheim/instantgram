import { describe, expect, it } from "vitest";
import { findAD } from "../../src/helpers/domDetection";

describe("findAD", () => {
    it("recognizes Instagram's German Anzeige label", () => {
        const article = document.createElement("article");
        article.innerHTML = "<div><span>Anzeige</span></div>";

        expect(findAD(article)).toBe(true);
    });
});
