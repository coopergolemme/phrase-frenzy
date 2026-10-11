import type { Team } from "./turnLogic";

// Who plays which part in a turn, shared by local pass-and-play (App.tsx)
// and online multiplayer (useMultiplayerGame).

/** Describers rotate through a team's members, one per turn that team takes. */
export function getDescriberName(
  teams: Team[],
  turnOrder: number[],
  teamIndex: number,
  turnIndex: number
): string | null {
  const team = teams[teamIndex];
  if (!team || team.members.length === 0) return null;
  const turnsTaken = turnOrder.slice(0, turnIndex).filter((index) => index === teamIndex).length;
  return team.members[turnsTaken % team.members.length];
}

/** Everyone on the team except the describer. */
export function getGuesserNames(team: Team | undefined, describerName: string | null): string[] {
  if (!team || !describerName) return [];
  return team.members.filter((member) => member !== describerName);
}

/**
 * Ids of teams that have played in the current round, given the team whose
 * turn just ended. Turn order is round-robin, so that's every team up to and
 * including it. Null once the round is complete (or in single-team games),
 * when there's nothing useful to show.
 */
export function getPlayedThisRoundTeamIds(teams: Team[], activeTeamIndex: number): string[] | null {
  const isMidRound = teams.length > 1 && activeTeamIndex >= 0 && activeTeamIndex < teams.length - 1;
  return isMidRound ? teams.slice(0, activeTeamIndex + 1).map((team) => team.id) : null;
}
