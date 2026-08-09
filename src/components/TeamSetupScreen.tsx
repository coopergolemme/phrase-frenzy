import { useState } from "react";
import { WORD_CATEGORIES } from "../data/words";
import { CategoryPickerSheet } from "./CategoryPickerSheet";

const MIN_TEAMS = 2;
const MAX_TEAMS = 6;
const MIN_ROUNDS = 1;
const MAX_ROUNDS = 5;
const ALL_CATEGORY_IDS = WORD_CATEGORIES.map((c) => c.id);

interface TeamSetupScreenProps {
  onStart: (teamNames: string[], roundsPerTeam: number, categoryIds: string[]) => void;
}

export function TeamSetupScreen({ onStart }: TeamSetupScreenProps) {
  const [teamNames, setTeamNames] = useState<string[]>(["", ""]);
  const [roundsPerTeam, setRoundsPerTeam] = useState(3);
  const [categoryIds, setCategoryIds] = useState<string[]>(ALL_CATEGORY_IDS);
  const [isPickingCategories, setIsPickingCategories] = useState(false);

  const canAddTeam = teamNames.length < MAX_TEAMS;
  const canRemoveTeam = teamNames.length > MIN_TEAMS;
  const allSelected = categoryIds.length === ALL_CATEGORY_IDS.length;
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
  };

  const removeTeam = (index: number) => {
    if (!canRemoveTeam) return;
    setTeamNames((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleCategory = (id: string) => {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const selectAllCategories = () => {
    setCategoryIds(ALL_CATEGORY_IDS);
  };

  const adjustRounds = (delta: number) => {
    setRoundsPerTeam((prev) => Math.min(MAX_ROUNDS, Math.max(MIN_ROUNDS, prev + delta)));
  };

  const handleStart = () => {
    if (!canStart) return;
    onStart(
      teamNames.map((name) => name.trim()),
      roundsPerTeam,
      categoryIds
    );
  };

  return (
    <div className="screen screen--team-setup">
      <div className="team-setup__content">
        <h1 className="team-setup__title">Set Up Teams</h1>

        <div className="team-setup__teams">
          <div className="team-setup__list">
            {teamNames.map((name, index) => (
              <div className="team-row" key={index}>
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

        <div className="team-setup__options">
          <button
            type="button"
            className="category-summary"
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

          <div className="rounds-stepper">
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
          categoryIds={categoryIds}
          onToggleCategory={toggleCategory}
          onSelectAll={selectAllCategories}
          onClose={() => setIsPickingCategories(false)}
        />
      )}
    </div>
  );
}
