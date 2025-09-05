# feat(api): add filesystem-backed players and teams API with frontend integration

Description
- Add backend API endpoints for players and teams using a filesystem-backed storage approach to replace or supplement the current client-side localStorage usage.
- api/players/index.ts
  - GET: list all players
  - POST: create a new player if one with the same name does not exist
- api/teams/index.ts
  - GET: list all teams
  - POST: create a deduplicated team (player1, player2) with names normalized (order-insensitive)

Frontend integration
- addPlayerIfNotExists
  - Now attempts to POST to /api/players before falling back to localStorage
- createTeam
  - Uses the new /api/teams endpoint for persistence
  - After creation, refreshes both players and teams lists to reflect the latest data
- LocalStorage fallback remains in place for offline or API-unavailable scenarios

What’s in this PR
- api/players/index.ts: New API endpoint for players
- api/teams/index.ts: New API endpoint for teams
- Wire-up notes (in the PR body) describing how frontend changes interact with the new endpoints
- Documentation and testing plan for end-to-end verification

Commits (proposed)
- feat(api): add filesystem-backed players API (GET/POST)
- feat(api): add filesystem-backed teams API (GET/POST)
- feat(frontend): route addPlayerIfNotExists to /api/players with localStorage fallback
- feat(frontend): route createTeam to /api/teams and refresh UI after creation
- docs/tests: add smoke-test plan for API endpoints and frontend flow

Files touched
- api/players/index.ts (new)
- api/teams/index.ts (new)
- index.html (existing update to call new endpoints; ensure paths align)

Testing plan
- Local:
  - GET /api/players
  - POST /api/players with body { "name": "Alice" }
  - GET /api/teams
  - POST /api/teams with body { "player1": "Alice", "player2": "Bob" }
- Frontend smoke test:
  - In the UI, create a new player named Alice, then create a team with Alice and Bob
  - Verify the players and teams lists refresh and that related game components reflect the changes
- Offline mode:
  - Verify fallback to localStorage behavior when the API is unavailable

Rollout plan
- Create a feature branch (e.g., feat/api-players-teams-backend)
- Push branch and open a PR (draft or standard depending on process)
- Include a concise PR description with testing steps
- Request reviews for:
  - API correctness and error handling
  - Concurrency safety of filesystem-backed storage
  - Frontend integration points
- Merge to main after reviews

Risks and considerations
- Data integrity and concurrency: filesystem-based storage is simple; ensure single-process access or implement appropriate locking if needed. For production, consider migrating to a real database.
- Offline behavior: localStorage fallback should remain functional when the API is unavailable.
- Tests: existing tests may need adjustments to align with API-backed flows; add a small smoke test suite for the new endpoints.

Testing steps recap (copy-paste for PR description)
- Local API checks:
  - curl -X GET http://localhost:3000/api/players
  - curl -X POST http://localhost:3000/api/players -H "Content-Type: application/json" -d '{"name":"Alice"}'
  - curl -X GET http://localhost:3000/api/teams
  - curl -X POST http://localhost:3000/api/teams -H "Content-Type: application/json" -d '{"player1":"Alice","player2":"Bob"}'
- Frontend test:
  - Use the UI to add a player and then create a team; confirm UI lists reflect the changes.

Note: This PR is designed to enable a robust path toward real backend storage while preserving the current offline-friendly behavior. If you want to preview the changes or adjust the wording for your repository’s standards, I can tailor the description text accordingly.
