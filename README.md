<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1_y8j-lEQxa7eky_ksAyK_z-K8iubqcil

## Run Locally

**Prerequisites:**  Node.js

[CI Provider Webhook] -> [Orchestrator queue] -> [Repro Sandbox] <-> [LLM Analysis] -> [Patch Synthesizer] -> [PR Builder] -> [Repo]
                                                          |
                                                       [Audit Store & Metrics]
                                                          |
                                                   [Dashboard & Chat UI]


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

# ForgeMate — Autonomous CI Recovery & Pair-Programming Agent

ForgeMate autonomously triages CI failures, reproduces them in ephemeral sandboxes, generates minimal fixes and tests, and opens explainable pull requests — reducing developer context switching and time-to-fix.

## Features
- Automatic CI failure detection (GitHub/GitLab)
- Ephemeral reproducible sandboxes (Docker/K8s)
- LLM-assisted root cause analysis + patch synthesis
- Safe PR creation with test evidence + confidence
- Policy engine to enforce safety and review gating
- Developer chat assistant to refine PRs

## Demo
Watch the 2-minute demo: `demo/demo.mp4` (or link to hosted video)

## Quickstart (MVP)
1. Create a GitHub App with repo access scopes.
2. Copy `.env.example` → `.env` and fill in credentials (GITHUB_APP_ID, GITHUB_PRIVATE_KEY, LLM_API_KEY).
3. `docker compose up --build`
4. Install ForgeMate on your repo.
5. Trigger a failing CI run to see the agent in action.

## Architecture
(See ARCHITECTURE.md)

## License
MIT

## Roadmap / Future
- Multi-language deep stacks (Java, Python, JS, Go)
- Self-healing PR pipeline (opt-in)
- Offline reproducibility bundles for compliance

