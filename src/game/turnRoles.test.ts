import { describe, expect, it } from "vitest";
import { getDescriberName, getGuesserNames, getPlayedThisRoundTeamIds } from "./turnRoles";
import type { Team } from "./turnLogic";

const teams: Team[] = [
  { id: "team-0", name: "Blue", totalScore: 0, members: ["Ann", "Bo", "Cy"] },
  { id: "team-1", name: "Red", totalScore: 0, members: ["Dee", "Ed"] },
  { id: "team-2", name: "Green", totalScore: 0, members: [] },
];
const turnOrder = [0, 1, 2, 0, 1, 2];

describe("getDescriberName", () => {
  it("rotates through a team's members on each of its turns", () => {
    expect(getDescriberName(teams, turnOrder, 0, 0)).toBe("Ann");
    expect(getDescriberName(teams, turnOrder, 0, 3)).toBe("Bo");
    expect(getDescriberName(teams, turnOrder, 1, 4)).toBe("Ed");
  });

  it("is null for a team without player names", () => {
    expect(getDescriberName(teams, turnOrder, 2, 2)).toBeNull();
  });
});

describe("getGuesserNames", () => {
  it("lists everyone on the team but the describer", () => {
    expect(getGuesserNames(teams[0], "Bo")).toEqual(["Ann", "Cy"]);
  });

  it("is empty without a describer", () => {
    expect(getGuesserNames(teams[2], null)).toEqual([]);
  });
});

describe("getPlayedThisRoundTeamIds", () => {
  it("lists teams up to the one that just played, mid-round", () => {
    expect(getPlayedThisRoundTeamIds(teams, 1)).toEqual(["team-0", "team-1"]);
  });

  it("is null once the round is complete", () => {
    expect(getPlayedThisRoundTeamIds(teams, 2)).toBeNull();
  });

  it("is null for a single-team game", () => {
    expect(getPlayedThisRoundTeamIds([teams[0]], 0)).toBeNull();
  });
});
