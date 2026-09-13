import { describe, expect, it } from "vitest";
import { buildGuidancePrompt, type Decision } from "./guidance";

describe("buildGuidancePrompt", () => {
  it("includes the category label and groups decisions by type", () => {
    const decisions: Decision[] = [
      { text: "Pizza", decision: "approved" },
      { text: "Quantum Foam", decision: "rejected" },
      { text: "Sofa", decision: "deactivated", reason: "too easy to confuse with Couch" },
    ];

    const prompt = buildGuidancePrompt("Food", null, decisions);

    expect(prompt).toContain('"Food"');
    expect(prompt).toContain("APPROVED");
    expect(prompt).toContain('"Pizza"');
    expect(prompt).toContain("REJECTED during review");
    expect(prompt).toContain('"Quantum Foam"');
    expect(prompt).toContain("DEACTIVATED");
    expect(prompt).toContain('"Sofa" (reason: too easy to confuse with Couch)');
  });

  it("tells the model to write a first rubric when there's no existing guidance", () => {
    const prompt = buildGuidancePrompt("Food", null, [{ text: "Pizza", decision: "approved" }]);

    expect(prompt).toContain("no house-style notes yet");
    expect(prompt).not.toContain("EXISTING house-style notes");
  });

  it("tells the model to revise, not replace, when existing guidance is given", () => {
    const prompt = buildGuidancePrompt("Food", "Prefer concrete foods.", [
      { text: "Pizza", decision: "approved" },
    ]);

    expect(prompt).toContain("EXISTING house-style notes");
    expect(prompt).toContain('"Prefer concrete foods."');
    expect(prompt).toContain("Revise these notes");
    expect(prompt).not.toContain("no house-style notes yet");
  });

  it("ignores blank existing guidance", () => {
    const prompt = buildGuidancePrompt("Food", "   ", [{ text: "Pizza", decision: "approved" }]);

    expect(prompt).toContain("no house-style notes yet");
  });

  it("omits a decision-type block entirely when there are none of that type", () => {
    const prompt = buildGuidancePrompt("Food", null, [{ text: "Pizza", decision: "approved" }]);

    expect(prompt).toContain("APPROVED");
    expect(prompt).not.toContain("REJECTED during review");
    expect(prompt).not.toContain("DEACTIVATED");
  });

  it("caps the requested rubric length and requires a JSON object response", () => {
    const prompt = buildGuidancePrompt("Food", null, []);

    expect(prompt).toContain("well under 150");
    expect(prompt).toContain('{ "guidance":');
  });
});
