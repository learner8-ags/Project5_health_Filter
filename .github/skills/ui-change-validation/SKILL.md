---
name: ui-change-validation
description: Use for Fleet Health UI changes requiring accessible controls and Playwright verification.
---
1. Read work item and existing UI test before editing.
2. Add/adjust a Playwright acceptance test first.
3. Prefer semantic HTML controls with explicit labels.
4. Implement smallest UI change; keep `/api/servers` unchanged.
5. Run targeted Playwright test, full UI suite and pytest.
6. Summarize accessibility behavior and evidence.
