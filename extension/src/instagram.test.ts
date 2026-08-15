import { beforeEach, describe, expect, it } from "vitest";
import { countFromControl, findRelationControl } from "./scanner";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("current Instagram relationship controls", () => {
  it("finds hash-based followers and following links by visible label", () => {
    document.body.innerHTML = `
      <main>
        <a href="#"><span><span title="13,375">13.3K</span> followers</span></a>
        <a href="#"><span><span>51</span> following</span></a>
      </main>
    `;

    expect(findRelationControl("followers")?.textContent).toContain("followers");
    expect(findRelationControl("following")?.textContent).toContain("following");
  });

  it("prefers an exact nested title over abbreviated visible text", () => {
    document.body.innerHTML = `
      <main>
        <a href="#"><span><span title="13,375">13.3K</span> followers</span></a>
      </main>
    `;
    const control = findRelationControl("followers");
    if (!control) throw new Error("followers control missing");

    expect(countFromControl(control)).toEqual({ value: 13_375, exact: true });
  });
});
