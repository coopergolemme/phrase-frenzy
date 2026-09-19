// Re-exports the canonical pure game logic. The source of truth lives in
// supabase/functions/_shared/turnLogic.ts so the multiplayer edge function
// (Deno) and the local reducer (this file's consumer, useGameState.ts) run
// the exact same deck/turn/scoring code — see that file for why.
export * from "../../supabase/functions/_shared/turnLogic";
