# Update TanStack packages and verify deployment handoff

## Goal
Update TanStack Start and its directly declared TanStack router packages to the latest compatible release set, resolve any resulting code changes, and verify the app remains functional.

## Current state
- The app is currently pinned to `@tanstack/react-start` 1.168.60, `@tanstack/react-router` 1.170.41, and `@tanstack/router-plugin` 1.168.42.
- The latest compatible release set identified is Start 1.169.5, React Router 1.170.46, and router-plugin 1.169.0.
- The project documents Vercel deployment; GitHub sync status is not available to inspect from the editor tools.

## Work
1. Update the three direct TanStack dependencies and lockfile to the matching release set.
2. Fix only compatibility changes required by the upgrade, preserving app behavior.
3. Verify the build and the home page, plus any relevant existing tests.
4. Leave the working changes ready for the configured GitHub sync; Vercel redeployment depends on that sync and the repository's Vercel integration.

## Technical details
Use the project's Bun lockfile and existing package conventions. Do not change unrelated dependencies. If GitHub sync is connected, the editor's sync will deliver the changes; this agent cannot inspect or trigger that external sync or verify a Vercel deployment.
