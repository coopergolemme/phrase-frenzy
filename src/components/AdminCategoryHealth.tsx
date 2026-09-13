import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { CategoryHealth, CategoryWordsState } from "../utils/adminApi";

interface AdminCategoryHealthProps {
  categories: CategoryHealth[];
  isLoading: boolean;
  expandedCategoryId: string | null;
  categoryWordsById: Record<string, CategoryWordsState>;
  onToggleCategory: (categoryId: string) => void;
  refiningCategoryId: string | null;
  onRefineGuidance: (categoryId: string) => void;
}

// Categories below this active-word count risk repeating too often in a
// game; categories above this flagged-word share likely need re-curation.
const LOW_WORD_COUNT_THRESHOLD = 12;
const HIGH_FLAG_RATE_THRESHOLD = 0.15;

const ROW_HEIGHT_PX = 36;
const MIN_CHART_HEIGHT_PX = 160;

interface ChartDatum {
  name: string;
  active: number;
  inactive: number;
}

function formatPercent(ratio: number | null): string {
  if (ratio === null) return "—";
  return `${Math.round(ratio * 100)}%`;
}

function CategoryTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0].payload as ChartDatum;
  return (
    <div className="rounded-button border border-border-solid bg-surface-solid px-3 py-2 text-[0.8rem] text-text">
      <p className="m-0 font-bold">{datum.name}</p>
      <p className="m-0 text-primary">{datum.active} active</p>
      <p className="m-0 text-text-secondary">{datum.inactive} inactive</p>
    </div>
  );
}

export function AdminCategoryHealth({
  categories,
  isLoading,
  expandedCategoryId,
  categoryWordsById,
  onToggleCategory,
  refiningCategoryId,
  onRefineGuidance,
}: AdminCategoryHealthProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <div
          role="status"
          aria-label="Loading category health"
          className="h-10 w-10 animate-spin rounded-full border-4 border-border-solid border-t-primary"
        />
      </div>
    );
  }

  if (categories.length === 0) {
    return <p className="py-5 text-center text-text-secondary">No categories yet.</p>;
  }

  const sorted = [...categories].sort((a, b) => a.activeWords - b.activeWords);

  const chartData: ChartDatum[] = sorted.map((category) => ({
    name: `${category.categoryEmoji} ${category.categoryLabel}`,
    active: category.activeWords,
    inactive: category.totalWords - category.activeWords,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card border border-outline bg-surface p-4 backdrop-blur-[20px]">
        <h2 className="m-0 mb-3 text-base font-bold">Words per category</h2>
        <ResponsiveContainer
          width="100%"
          height={Math.max(MIN_CHART_HEIGHT_PX, chartData.length * ROW_HEIGHT_PX)}
        >
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }}
            />
            <Tooltip
              content={(props) => <CategoryTooltip {...props} />}
              cursor={{ fill: "var(--color-surface)" }}
            />
            <Bar dataKey="active" stackId="words" fill="var(--color-primary)" radius={[4, 0, 0, 4]} />
            <Bar dataKey="inactive" stackId="words" fill="var(--color-disabled)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-hidden rounded-card border border-outline bg-surface backdrop-blur-[20px]">
        {sorted.map((category) => {
          const totalRounds = category.correct + category.skipped;
          const correctRate = totalRounds > 0 ? category.correct / totalRounds : null;
          const flagRate = category.totalWords > 0 ? category.flaggedWords / category.totalWords : 0;
          const needsMoreWords = category.activeWords < LOW_WORD_COUNT_THRESHOLD;
          const needsRecuration = flagRate > HIGH_FLAG_RATE_THRESHOLD;

          const isExpanded = expandedCategoryId === category.categoryId;
          const words = categoryWordsById[category.categoryId];

          return (
            <div key={category.categoryId} className="border-b border-border-solid last:border-b-0">
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
                aria-expanded={isExpanded}
                onClick={() => onToggleCategory(category.categoryId)}
              >
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-text">
                    <span aria-hidden="true">{category.categoryEmoji}</span> {category.categoryLabel}
                  </span>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.8rem] text-text-secondary">
                    <span>{category.activeWords} active</span>
                    <span>{formatPercent(correctRate)} correct rate</span>
                    <span>{formatPercent(flagRate)} flagged</span>
                  </div>
                </div>
                <div className="flex flex-none flex-col items-end gap-1">
                  {needsMoreWords && (
                    <span className="inline-flex items-center rounded-chip border border-yellow px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-yellow">
                      Needs words
                    </span>
                  )}
                  {needsRecuration && (
                    <span className="inline-flex items-center rounded-chip border border-danger px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-danger">
                      Needs re-curation
                    </span>
                  )}
                </div>
                <span aria-hidden="true" className="flex-none text-text-secondary">
                  {isExpanded ? "▲" : "▼"}
                </span>
              </button>

              {isExpanded && (
                <div className="border-t border-border-solid bg-surface-solid px-4 py-3">
                  <div className="mb-3 flex flex-col gap-1.5 border-b border-border-solid pb-3">
                    <span className="text-[0.8rem] font-semibold text-text-secondary">
                      Curation guidance
                    </span>
                    <p className="m-0 whitespace-pre-line text-[0.85rem] text-text">
                      {category.guidance ?? "No guidance yet — refine to learn from past decisions."}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="btn btn--small btn--outline"
                        disabled={refiningCategoryId === category.categoryId}
                        onClick={() => onRefineGuidance(category.categoryId)}
                      >
                        {refiningCategoryId === category.categoryId
                          ? "Refining…"
                          : "Refine Guidance"}
                      </button>
                      <span className="text-[0.75rem] text-text-secondary">
                        {category.decisionsSinceGuidance} decision
                        {category.decisionsSinceGuidance === 1 ? "" : "s"} since last refine
                      </span>
                    </div>
                  </div>

                  {words?.status === "loading" && (
                    <p className="m-0 text-[0.85rem] text-text-secondary">Loading words…</p>
                  )}
                  {words?.status === "error" && (
                    <p className="m-0 text-[0.85rem] text-danger">Couldn't load words.</p>
                  )}
                  {words?.status === "done" && words.items.length === 0 && (
                    <p className="m-0 text-[0.85rem] text-text-secondary">No words in this category.</p>
                  )}
                  {words?.status === "done" && words.items.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {words.items.map((word) => (
                        <span
                          key={word.id}
                          className={`inline-flex items-center rounded-chip border px-2 py-1 text-[0.8rem] ${
                            word.active
                              ? "border-border-solid text-text"
                              : "border-border-solid text-text-secondary line-through"
                          }`}
                        >
                          {word.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
