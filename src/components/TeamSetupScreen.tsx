import { useState } from "react";
import { WORD_CATEGORIES } from "../data/words";

const MIN_TEAMS = 2;
const MAX_TEAMS = 6;
const MIN_ROUNDS = 1;
const MAX_ROUNDS = 5;

interface TeamSetupScreenProps {
  onStart: (teamNames: string[], roundsPerTeam: number, categoryId: string) => void;
}

export function TeamSetupScreen({ onStart }: TeamSetupScreenProps) {
  const [teamNames, setTeamNames] = useState<string[]>(["", ""]);
  const [roundsPerTeam, setRoundsPerTeam] = useState(3);
  const [categoryId, setCategoryId] = useState(WORD_CATEGORIES[0].id);

  const canAddTeam = teamNames.length < MAX_TEAMS;
  const canRemoveTeam = teamNames.length > MIN_TEAMS;
  const canStart =
    teamNames.length >= MIN_TEAMS && teamNames.every((name) => name.trim().length > 0);

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

  const adjustRounds = (delta: number) => {
    setRoundsPerTeam((prev) => Math.min(MAX_ROUNDS, Math.max(MIN_ROUNDS, prev + delta)));
  };

  const handleStart = () => {
    if (!canStart) return;
    onStart(
      teamNames.map((name) => name.trim()),
      roundsPerTeam,
      categoryId
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
          <div className="category-picker__section">
            <span className="category-picker__label">Word category</span>
            <div className="category-picker">
              {WORD_CATEGORIES.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  className={
                    "category-chip" +
                    (category.id === categoryId ? " category-chip--selected" : "")
                  }
                  onClick={() => setCategoryId(category.id)}
                  aria-pressed={category.id === categoryId}
                >
                  <span aria-hidden="true">{category.emoji}</span> {category.label}
                </button>
              ))}
            </div>
          </div>

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
    </div>
  );
}
