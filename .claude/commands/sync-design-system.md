---
description: Pull the latest CourseCapture design system into the repo
---

1. Fetch the latest `tokens.json`, logo and icon files from the CourseCapture design system into `design-system/`.
2. Regenerate `src/styles/tokens.css` (`pnpm tokens`) and copy icons into `public/`.
3. Diff token names: report any added, renamed or removed tokens and every component that uses a removed one.
4. Run visual and a11y tests in both themes; summarise changes in the PR.
