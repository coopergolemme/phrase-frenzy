import type { GeneratedBatch } from "./curation.ts";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";

async function callGeminiRaw(
  prompt: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch
): Promise<unknown> {
  const response = await fetchImpl(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini response had no text content");
  }

  return JSON.parse(text);
}

export async function callGeminiForWords(
  prompt: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch
): Promise<GeneratedBatch[]> {
  const parsed = await callGeminiRaw(prompt, apiKey, fetchImpl);
  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response was not a JSON array");
  }
  return parsed as GeneratedBatch[];
}

export async function callGeminiForSimilarWords(
  prompt: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch
): Promise<string[]> {
  const parsed = await callGeminiRaw(prompt, apiKey, fetchImpl);
  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response was not a JSON array");
  }
  return parsed.filter((item): item is string => typeof item === "string");
}
