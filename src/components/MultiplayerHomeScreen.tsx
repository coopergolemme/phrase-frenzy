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

interface MultiplayerHomeScreenProps {
  categories: WordCategory[];
  isBusy: boolean;
  error: string | null;
  onCreate: (params: {
    hostName: string;
    teamNames: string[];
    roundsPerTeam: number;
    roundDurationSec: number;
    foulPenaltySec: number;
    categoryIds: string[];
  }) => void;
  onJoin: (roomCode: string) => void;
  onBack: () => void;
}

type Mode = "choose" | "host" | "join";

export function MultiplayerHomeScreen({
  categories,
  isBusy,
  error,
  onCreate,
  onJoin,
  onBack,
}: MultiplayerHomeScreenProps) {
  const [mode, setMode] = useState<Mode>("choose");
  const allCategoryIds = useMemo(() => categories.map((c) => c.id), [categories]);

  const [hostName, setHostName] = useState("");
  const [teamNames, setTeamNames] = useState<string[]>(["", ""]);
  const [roundsPerTeam, setRoundsPerTeam] = useState(3);
  const [roundDurationSec, setRoundDurationSec] = useState(DEFAULT_ROUND_DURATION_SEC);
  const [foulPenaltySec, setFoulPenaltySec] = useState(2);
  const [categoryIds, setCategoryIds] = useState<string[]>(allCategoryIds);
  const [isPickingCategories, setIsPickingCategories] = useState(false);

  const [joinCode, setJoinCode] = useState("");

  const canAddTeam = teamNames.length < MAX_TEAMS;
  const canRemoveTeam = teamNames.length > MIN_TEAMS;
  const canCreate =
    hostName.trim().length > 0 &&
    teamNames.every((name) => name.trim().length > 0) &&
    categoryIds.length > 0;
  const canJoin = joinCode.trim().length > 0;

  const handleCreate = () => {
    if (!canCreate) return;
    onCreate({
      hostName: hostName.trim(),
      teamNames: teamNames.map((n) => n.trim()),
      roundsPerTeam,
      roundDurationSec,
      foulPenaltySec,
      categoryIds,
    });
  };

  if (mode === "choose") {
    return (
      <div className="screen justify-center items-center gap-5 text-center">
        <div className="relative w-full">
          <button
            type="button"
            className="btn btn--text absolute left-0 top-1/2 min-h-0 -translate-y-1/2 py-1"
            onClick={onBack}
          >
            ← Back
          </button>
          <h1 className="m-0 text-center font-display font-bold text-[clamp(1.3rem,6vmin,1.7rem)] leading-tight text-yellow">
            Play Online
          </h1>
        </div>
        <p className="m-0 text-text-secondary">
          Everyone plays on their own phone — no passing required.
        </p>
        <button className="btn btn--primary btn--large w-full" onClick={() => setMode("host")}>
          Host a Game
        </button>
        <button className="btn btn--outline btn--large w-full" onClick={() => setMode("join")}>
          Join a Game
        </button>
      </div>
    );
  }

  if (mode === "join") {
    return (
      <div className="screen justify-center items-center gap-5 text-center">
        <div className="relative w-full">
          <button
            type="button"
            className="btn btn--text absolute left-0 top-1/2 min-h-0 -translate-y-1/2 py-1"
            onClick={() => setMode("choose")}
          >
            ← Back
          </button>
          <h1 className="m-0 text-center font-display font-bold text-[clamp(1.3rem,6vmin,1.7rem)] leading-tight text-yellow">
            Join a Game
          </h1>
        </div>
        <input
          className="min-h-touch w-full rounded-button border border-outline bg-surface px-3 py-2 text-center font-[inherit] text-[1.4rem] font-bold uppercase tracking-[0.3em] text-text outline-none placeholder:text-text-secondary placeholder:tracking-normal"
          type="text"
          placeholder="Room code"
          value={joinCode}
          maxLength={6}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
        />
        {error && <p className="m-0 text-[0.9rem] text-danger">{error}</p>}
        <button
          className="btn btn--primary btn--large w-full"
          onClick={() => onJoin(joinCode.trim().toUpperCase())}
          disabled={!canJoin || isBusy}
        >
          {isBusy ? "Joining…" : "Continue"}
        </button>
      </div>
    );
  }

  const stepperBtnClass =
    "flex h-touch w-touch flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-primary-pressed bg-primary text-[1.2rem] leading-none text-[#0e1f15] transition-transform transition-[filter] duration-[80ms] active:scale-90 active:brightness-95 disabled:cursor-not-allowed disabled:border-disabled disabled:bg-disabled disabled:text-text-secondary";
  const allSelected = categoryIds.length === allCategoryIds.length;
  const categorySummary = allSelected ? "All" : `${categoryIds.length} selected`;

  return (
    <div className="screen overflow-y-auto pt-4">
      <div className="relative">
        <button
          type="button"
          className="btn btn--text absolute left-0 top-1/2 min-h-0 -translate-y-1/2 py-1"
          onClick={() => setMode("choose")}
        >
          ← Back
        </button>
        <h1 className="m-0 text-center font-display font-bold text-[clamp(1.3rem,6vmin,1.7rem)] leading-tight text-yellow">
          Host a Game
        </h1>
      </div>

      <div className="flex flex-col gap-3">
        <input
          className="min-h-touch rounded-button border border-outline bg-surface px-3 py-2 font-[inherit] text-[1.05rem] text-text outline-none placeholder:text-text-secondary"
          type="text"
          placeholder="Your name"
          value={hostName}
          maxLength={24}
          onChange={(e) => setHostName(e.target.value)}
        />

        {teamNames.map((name, index) => (
          <div
            className="flex items-center gap-3 rounded-button border border-outline bg-surface px-3 py-2"
            key={index}
          >
            <input
              className="min-h-touch flex-1 border-none bg-transparent font-[inherit] text-[1.05rem] text-text outline-none placeholder:text-text-secondary"
              type="text"
              placeholder={`Team ${index + 1}`}
              value={name}
              maxLength={24}
              onChange={(e) =>
                setTeamNames((prev) => prev.map((n, i) => (i === index ? e.target.value : n)))
              }
            />
            <button
              type="button"
              className="h-touch w-touch flex-shrink-0 rounded-full border-[1.5px] border-outline bg-disabled text-[1.1rem] leading-none text-text disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => {
                setTeamNames((prev) => prev.filter((_, i) => i !== index));
              }}
              disabled={!canRemoveTeam}
              aria-label={`Remove ${name || `Team ${index + 1}`}`}
            >
              &times;
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn--outline"
          onClick={() => setTeamNames((prev) => [...prev, ""])}
          disabled={!canAddTeam}
        >
          + Add Team
        </button>

        <div className="flex flex-col overflow-hidden rounded-card border border-outline bg-surface">
          <button
            type="button"
            className="flex min-h-touch w-full items-center justify-between border-b border-border-solid px-4 py-3 font-[inherit] text-base text-text"
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
                onClick={() =>
                  setRoundsPerTeam((prev) => Math.max(MIN_ROUNDS, prev - 1))
                }
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
                onClick={() =>
                  setRoundsPerTeam((prev) => Math.min(MAX_ROUNDS, prev + 1))
                }
                disabled={roundsPerTeam >= MAX_ROUNDS}
                aria-label="Increase rounds per team"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-border-solid px-4 py-3">
            <span className="font-semibold">Round timer</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className={stepperBtnClass}
                onClick={() =>
                  setRoundDurationSec((prev) =>
                    Math.max(MIN_ROUND_DURATION_SEC, prev - ROUND_DURATION_STEP_SEC)
                  )
                }
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
                onClick={() =>
                  setRoundDurationSec((prev) =>
                    Math.min(MAX_ROUND_DURATION_SEC, prev + ROUND_DURATION_STEP_SEC)
                  )
                }
                disabled={roundDurationSec >= MAX_ROUND_DURATION_SEC}
                aria-label="Increase round timer"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-semibold">Foul penalty</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className={stepperBtnClass}
                onClick={() => setFoulPenaltySec((prev) => Math.max(0, prev - 1))}
                disabled={foulPenaltySec <= 0}
                aria-label="Decrease foul penalty"
              >
                &minus;
              </button>
              <span className="min-w-[1.5ch] text-center font-bold tabular-nums">
                {foulPenaltySec > 0 ? `${foulPenaltySec}s` : "Off"}
              </span>
              <button
                type="button"
                className={stepperBtnClass}
                onClick={() => setFoulPenaltySec((prev) => Math.min(5, prev + 1))}
                disabled={foulPenaltySec >= 5}
                aria-label="Increase foul penalty"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="m-0 text-center text-[0.9rem] text-danger">{error}</p>}

      <button className="btn btn--primary btn--large" onClick={handleCreate} disabled={!canCreate || isBusy}>
        {isBusy ? "Creating…" : "Create Room"}
      </button>

      {isPickingCategories && (
        <CategoryPickerSheet
          categories={categories}
          categoryIds={categoryIds}
          onToggleCategory={(id) =>
            setCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
          }
          onSelectAll={() => setCategoryIds(allCategoryIds)}
          onClose={() => setIsPickingCategories(false)}
        />
      )}
    </div>
  );
}
