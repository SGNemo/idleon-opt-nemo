# idleon-opt-nemo

Self-hosted IdleOn optimizer / to-do list. Static Angular SPA, no backend, data stays in the browser.

- `src/core` framework-free TypeScript (save parser, account model; later tasks + optimizers). Tests: `npm test`.
- `src/app` Angular 19 UI (signals). `npm start`, `npm run build`.
- `docs/FORMULAS.md` formula registry (`verified` | `TODO`).
- `fixtures/` local saves, git-ignored. Check before use: `npm run check:fixture`; inspect parser output: `npm run summary`.
- Docker: `docker build -t idleon-opt . && docker run -p 8080:80 idleon-opt`.
