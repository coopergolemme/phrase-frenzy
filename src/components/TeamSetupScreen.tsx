import { useMemo, useState } from "react";
import type { WordCategory } from "../data/wordCategory";
import { CategoryPickerSheet } from "./CategoryPickerSheet";

const MIN_TEAMS = 2;
const MAX_TEAMS = 6;
const MIN_ROUNDS = 1;
const MAX_ROUNDS = 5;
const MIN_ROUND_DURATION_SEC = 30;
const MAX_ROUND_DURATION_SEC = 120;
const ROUND_DURATION_STEP_SEC = 15;
const DEFAULT_ROUND_DURATION_SEC = 60;

interface TeamSetupScreenProps {
  categories: WordCategory[];
  onStart: (
    teamNames: string[],
    teamMembers: string[][],
    roundsPerTeam: number,
    categoryIds: string[],
    roundDurationSec: number
  ) => void;
  knownPlayerNames?: string[];
  knownTeamNames?: string[];
}

const KNOWN_PLAYERS_DATALIST_ID = "known-player-names";
const KNOWN_TEAMS_DATALIST_ID = "known-team-names";

export function TeamSetupScreen({
  categories,
  onStart,
  knownPlayerNames = [],
  knownTeamNames = [],
}: TeamSetupScreenProps) {
  const allCategoryIds = useMemo(() => categories.map((c) => c.id), [categories]);
  const [teamNames, setTeamNames] = useState<string[]>(["", ""]);
  const [teamMembers, setTeamMembers] = useState<string[][]>([[], []]);
  const [memberDrafts, setMemberDrafts] = useState<string[]>(["", ""]);
  const [roundsPerTeam, setRoundsPerTeam] = useState(3);
  const [roundDurationSec, setRoundDurationSec] = useState(DEFAULT_ROUND_DURATION_SEC);
  const [categoryIds, setCategoryIds] = useState<string[]>(allCategoryIds);
  const [isPickingCategories, setIsPickingCategories] = useState(false);

  const canAddTeam = teamNames.length < MAX_TEAMS;
  const canRemoveTeam = teamNames.length > MIN_TEAMS;
  const allSelected = categoryIds.length === allCategoryIds.length;
  const categorySummary = allSelected
    ? "All"
    : `${categoryIds.length} selected`;
  const canStart =
    teamNames.length >= MIN_TEAMS &&
    teamNames.every((name) => name.trim().length > 0) &&
    categoryIds.length > 0;

  const updateName = (index: number, value: string) => {
    setTeamNames((prev) => prev.map((name, i) => (i === index ? value : name)));
  };

  const addTeam = () => {
    if (!canAddTeam) return;
    setTeamNames((prev) => [...prev, ""]);
    setTeamMembers((prev) => [...prev, []]);
    setMemberDrafts((prev) => [...prev, ""]);
  };

  const removeTeam = (index: number) => {
    if (!canRemoveTeam) return;
    setTeamNames((prev) => prev.filter((_, i) => i !== index));
    setTeamMembers((prev) => prev.filter((_, i) => i !== index));
    setMemberDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMemberDraft = (teamIndex: number, value: string) => {
    setMemberDrafts((prev) => prev.map((draft, i) => (i === teamIndex ? value : draft)));
  };

  const addMember = (teamIndex: number) => {
    const name = memberDrafts[teamIndex]?.trim();
    if (!name) return;
    setTeamMembers((prev) =>
      prev.map((members, i) => (i === teamIndex ? [...members, name] : members))
    );
    setMemberDrafts((prev) => prev.map((draft, i) => (i === teamIndex ? "" : draft)));
  };

  const removeMember = (teamIndex: number, memberIndex: number) => {
    setTeamMembers((prev) =>
      prev.map((members, i) =>
        i === teamIndex ? members.filter((_, mi) => mi !== memberIndex) : members
      )
    );
  };

  const toggleCategory = (id: string) => {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const selectAllCategories = () => {
    setCategoryIds(allCategoryIds);
  };

  const adjustRounds = (delta: number) => {
    setRoundsPerTeam((prev) => Math.min(MAX_ROUNDS, Math.max(MIN_ROUNDS, prev + delta)));
  };

  const adjustRoundDuration = (delta: number) => {
    setRoundDurationSec((prev) =>
      Math.min(MAX_ROUND_DURATION_SEC, Math.max(MIN_ROUND_DURATION_SEC, prev + delta))
    );
  };

  const handleStart = () => {
    if (!canStart) return;
    onStart(
      teamNames.map((name) => name.trim()),
      teamMembers,
      roundsPerTeam,
      categoryIds,
      roundDurationSec
    );
  };

  const stepperBtnClass =
    "flex h-touch w-touch flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-primary-pressed bg-primary text-[1.2rem] leading-none text-white transition-transform transition-[filter] duration-[80ms] active:scale-90 active:brightness-95 disabled:cursor-not-allowed disabled:border-disabled disabled:bg-disabled";

  return (
    <div className="screen overflow-y-auto pt-4 landscape-compact:pt-2">
      <div className="flex flex-col gap-4 landscape-compact:grid landscape-compact:grid-cols-2 landscape-compact:items-start landscape-compact:gap-x-4 landscape-compact:gap-y-2">
        <h1 className="m-0 text-center text-[clamp(1.6rem,7vmin,2rem)] font-extrabold landscape-compact:col-span-2">
          Set Up Teams
        </h1>

        <div className="flex flex-col gap-3 landscape-compact:min-w-0 landscape-compact:flex-1">
          <div className="flex flex-col gap-3 landscape-compact:gap-2">
            {teamNames.map((name, index) => (
              <div className="flex flex-col gap-2" key={index}>
                <div className="flex items-center gap-3 rounded-button border border-outline bg-surface px-3 py-2 backdrop-blur-[20px]">
                  <input
                    className="min-h-touch flex-1 border-none bg-transparent font-[inherit] text-[1.05rem] text-text outline-none placeholder:text-text-secondary"
                    type="text"
                    placeholder={`Team ${index + 1}`}
                    value={name}
                    maxLength={24}
                    list={KNOWN_TEAMS_DATALIST_ID}
                    onChange={(e) => updateName(index, e.target.value)}
                  />
                  <button
                    type="button"
                    className="h-touch w-touch flex-shrink-0 rounded-full border-[1.5px] border-outline bg-disabled text-[1.1rem] leading-none text-white transition-transform transition-[filter] duration-[80ms] active:scale-90 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => removeTeam(index)}
                    disabled={!canRemoveTeam}
                    aria-label={`Remove ${name || `Team ${index + 1}`}`}
                  >
                    &times;
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 px-2">
                  {teamMembers[index]?.map((member, memberIndex) => (
                    <span
                      className="inline-flex items-center gap-1 rounded-chip border border-outline bg-surface px-2 py-1 text-[0.85rem] font-semibold text-text"
                      key={memberIndex}
                    >
                      {member}
                      <button
                        type="button"
                        className="border-none bg-transparent p-0 text-[0.95rem] leading-none text-text-secondary"
                        onClick={() => removeMember(index, memberIndex)}
                        aria-label={`Remove ${member}`}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  <input
                    className="min-h-touch min-w-[8ch] flex-1 border-none bg-transparent font-[inherit] text-[0.85rem] text-text outline-none placeholder:text-text-secondary"
                    type="text"
                    placeholder="+ Add member"
                    value={memberDrafts[index] ?? ""}
                    maxLength={24}
                    list={KNOWN_PLAYERS_DATALIST_ID}
                    onChange={(e) => updateMemberDraft(index, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addMember(index);
                      }
                    }}
                    onBlur={() => addMember(index)}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn btn--outline"
            onClick={addTeam}
            disabled={!canAddTeam}
          >
            + Add Team
          </button>
        </div>

        <div className="flex flex-col overflow-hidden rounded-card border border-outline bg-surface backdrop-blur-[20px] landscape-compact:min-w-0 landscape-compact:flex-1">
          <button
            type="button"
            className="flex min-h-touch w-full items-center justify-between border-b border-border-solid px-4 py-3 font-[inherit] text-base text-text transition-transform transition-[filter] duration-[80ms] active:scale-[0.98] active:brightness-[0.97]"
            onClick={() => setIsPickingCategories(true)}
          >
            <span className="font-semibold">Word categories</span>
            <span className="flex items-center gap-1 font-semibold text-text-secondary">
              {categorySummary}
              <span className="text-[1.2rem] leading-none text-disabled" aria-hidden="true">
                &rsaquo;
              </span>
            </span>
          </button>

          <div className="flex items-center justify-between border-b border-border-solid px-4 py-3">
            <span className="font-semibold">Rounds per team</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className={stepperBtnClass}
                onClick={() => adjustRounds(-1)}
                disabled={roundsPerTeam <= MIN_ROUNDS}
                aria-label="Decrease rounds per team"
              >
                &minus;
              </button>
              <span className="min-w-[1.5ch] text-center font-bold tabular-nums">
                {roundsPerTeam}
              </span>
              <button
                type="button"
                className={stepperBtnClass}
                onClick={() => adjustRounds(1)}
                disabled={roundsPerTeam >= MAX_ROUNDS}
                aria-label="Increase rounds per team"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-semibold">Round timer</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className={stepperBtnClass}
                onClick={() => adjustRoundDuration(-ROUND_DURATION_STEP_SEC)}
                disabled={roundDurationSec <= MIN_ROUND_DURATION_SEC}
                aria-label="Decrease round timer"
              >
                &minus;
              </button>
              <span className="min-w-[1.5ch] text-center font-bold tabular-nums">
                {roundDurationSec}s
              </span>
              <button
                type="button"
                className={stepperBtnClass}
                onClick={() => adjustRoundDuration(ROUND_DURATION_STEP_SEC)}
                disabled={roundDurationSec >= MAX_ROUND_DURATION_SEC}
                aria-label="Increase round timer"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        className="btn btn--primary btn--large"
        onClick={handleStart}
        disabled={!canStart}
      >
        Start Game
      </button>

      {isPickingCategories && (
        <CategoryPickerSheet
          categories={categories}
          categoryIds={categoryIds}
          onToggleCategory={toggleCategory}
          onSelectAll={selectAllCategories}
          onClose={() => setIsPickingCategories(false)}
        />
      )}

      <datalist id={KNOWN_PLAYERS_DATALIST_ID}>
        {knownPlayerNames.map((name) => (
          <option value={name} key={name} />
        ))}
      </datalist>

      <datalist id={KNOWN_TEAMS_DATALIST_ID}>
        {knownTeamNames.map((name) => (
          <option value={name} key={name} />
        ))}
      </datalist>
    </div>
  );
}
