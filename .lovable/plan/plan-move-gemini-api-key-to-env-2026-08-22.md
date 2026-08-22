# Plan: Move Gemini API key to `.env`

## Goal
Move the Gemini API key from the runtime secret store into a local `.env` file as `VITE_GEMINI_API_KEY`, reference it in code via `import.meta.env.VITE_GEMINI_API_KEY`, and protect it from being committed.

## Current state
- `src/lib/analyze.server.ts` reads `process.env["GEMINI_API_KEY"]`.
- A runtime secret named `GEMINI_API_KEY` is configured in the project.
- No `.env` or `.env.example` files exist.
- `.gitignore` does not include `.env`.

## Changes

1. **Create `.env`**
   - Add `VITE_GEMINI_API_KEY=AQ.Ab8RN6L6blxW2vEhfWXmLICJp0UCviyWOdYfSdmYyA_Qm6-_3A`
   - This file will be gitignored and never committed.

2. **Create `.env.example`**
   - Add `VITE_GEMINI_API_KEY=your-gemini-api-key-here`
   - The real key will NOT be placed here; `.env.example` is a template for developers.

3. **Update `.gitignore`**
   - Add `.env` so the real key is never committed.

4. **Update `src/lib/analyze.server.ts`**
   - Replace `process.env["GEMINI_API_KEY"]` with `import.meta.env.VITE_GEMINI_API_KEY`.
   - Keep the existing error message if the key is missing.

5. **Audit for other hardcoded keys**
   - Search the codebase for the literal key string and any other references to `GEMINI_API_KEY` or `VITE_GEMINI_API_KEY` to ensure consistency.

## Notes
- `VITE_` prefix makes the value available to Vite (including SSR/server functions in this TanStack Start project).
- The existing runtime `GEMINI_API_KEY` secret will become unused after this change. It can be left in place or removed later; this plan will not delete it automatically.
