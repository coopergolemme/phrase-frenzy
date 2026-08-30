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
}

export function TeamSetupScreen({ categories, onStart }: TeamSetupScreenProps) {
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

  return (
    <div className="screen screen--team-setup">
      <div className="team-setup__content">
        <h1 className="team-setup__title">Set Up Teams</h1>

        <div className="team-setup__teams">
          <div className="team-setup__list">
            {teamNames.map((name, index) => (
              <div className="team-row-group" key={index}>
                <div className="team-row">
                  <input
                    className="team-row__input"
                    type="text"
                    placeholder={`Team ${index + 1}`}
                    value={name}
                    maxLength={24}
                    onChange={(e) => updateName(index, e.target.value)}
                  />
                  <button
                    type="button"
                    className="team-row__remove"
                    onClick={() => removeTeam(index)}
                    disabled={!canRemoveTeam}
                    aria-label={`Remove ${name || `Team ${index + 1}`}`}
                  >
                    &times;
                  </button>
                </div>

                <div className="member-list">
                  {teamMembers[index]?.map((member, memberIndex) => (
                    <span className="member-chip" key={memberIndex}>
                      {member}
                      <button
                        type="button"
                        className="member-chip__remove"
                        onClick={() => removeMember(index, memberIndex)}
                        aria-label={`Remove ${member}`}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  <input
                    className="member-list__input"
                    type="text"
                    placeholder="+ Add member"
                    value={memberDrafts[index] ?? ""}
                    maxLength={24}
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

        <div className="settings-card">
          <button
            type="button"
            className="category-summary settings-card__row"
            onClick={() => setIsPickingCategories(true)}
          >
            <span className="category-summary__label">Word categories</span>
            <span className="category-summary__value">
              {categorySummary}
              <span className="category-summary__chevron" aria-hidden="true">
                &rsaquo;
              </span>
            </span>
          </button>

          <div className="rounds-stepper settings-card__row">
            <span className="rounds-stepper__label">Rounds per team</span>
            <div className="rounds-stepper__control">
              <button
                type="button"
                className="rounds-stepper__btn"
                onClick={() => adjustRounds(-1)}
                disabled={roundsPerTeam <= MIN_ROUNDS}
                aria-label="Decrease rounds per team"
              >
                &minus;
              </button>
              <span className="rounds-stepper__value">{roundsPerTeam}</span>
              <button
                type="button"
                className="rounds-stepper__btn"
                onClick={() => adjustRounds(1)}
                disabled={roundsPerTeam >= MAX_ROUNDS}
                aria-label="Increase rounds per team"
              >
                +
              </button>
            </div>
          </div>

          <div className="rounds-stepper settings-card__row">
            <span className="rounds-stepper__label">Round timer</span>
            <div className="rounds-stepper__control">
              <button
                type="button"
                className="rounds-stepper__btn"
                onClick={() => adjustRoundDuration(-ROUND_DURATION_STEP_SEC)}
                disabled={roundDurationSec <= MIN_ROUND_DURATION_SEC}
                aria-label="Decrease round timer"
              >
                &minus;
              </button>
              <span className="rounds-stepper__value">{roundDurationSec}s</span>
              <button
                type="button"
                className="rounds-stepper__btn"
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
    </div>
  );
}
