# Mini-project 5 — Skills + Prompt Files + UI-Focused Subagent Review

**Spotlight:** repository instructions · targeted (path-scoped) instructions · Agent Skill · prompt file / slash command · custom agent · reviewer subagent · Playwright UI testing

**Duration:** ~3.5 hours  |  **Application:** Fleet Health Console (FastAPI + a single HTML page)  |  **Work item:** `work-items/MP5.md`

---

## Table of contents

1. [Why this lab exists](#1-why-this-lab-exists)
2. [The customization toolkit at a glance](#2-the-customization-toolkit-at-a-glance)
3. [The starter application](#3-the-starter-application)
4. [Common first 15 minutes (setup)](#4-common-first-15-minutes--every-team-starts-here)
5. [Baseline run: experience the "Before"](#5-baseline-run--experience-the-before-do-this-first)
6. [Step-by-step lab](#6-step-by-step-lab)
   - [Step 1 — Install the customizations (0:15–0:40)](#step-1--install-the-customizations-015040)
   - [Step 2 — Understand activation differences (0:40–0:55)](#step-2--understand-activation-differences-040055)
   - [Step 3 — Select UI Implementer and check skill selection (0:55–1:20)](#step-3--select-ui-implementer-and-check-skill-selection-0551-20)
   - [Step 4 — Test-first implementation (1:20–2:20)](#step-4--playwright-test-first-implementation-120220)
   - [Step 5 — Delegate to the UI Reviewer subagent (2:20–2:45)](#step-5--delegate-to-the-ui-reviewer-subagent-220245)
   - [Step 6 — Generate the PR with `/prepare-pr` (2:45–3:10)](#step-6--generate-evidence-focused-pr-content-with-prepare-pr-245310)
   - [Step 7 — Commit, open the PR, inspect logs (3:10–3:35)](#step-7--commit-open-the-pr-inspect-debug-logs-310335)
7. [Before vs. After scorecard](#7-before-vs-after-scorecard)
8. [Optional stretch: lifecycle hooks](#8-optional-stretch--lifecycle-hooks)
9. [Troubleshooting](#9-troubleshooting)
10. [Debrief questions and takeaways](#10-debrief-questions-and-takeaways)
11. [Completion checklist](#11-completion-checklist)

---

## 1. Why this lab exists

Out of the box, an AI coding assistant is a talented generalist with **no memory of your team's standards**. Ask it to "add a filter to the page" and you get *something* — but it may:

- use `<div onclick>` instead of real buttons and selects (inaccessible to keyboard and screen-reader users),
- skip tests entirely, or write them after the code so they simply confirm whatever was built,
- locate elements by CSS class or pixel position, producing brittle tests,
- quietly change the `/api/servers` contract,
- hand you a PR description that says "added filter" with no evidence.

Every one of those is a **process** failure, not an intelligence failure. The assistant didn't know your rules, or knew them only if you re-typed them in every prompt.

This lab shows how to **encode your engineering standards once, in the repository**, so that every developer, and every Copilot session, gets them automatically and consistently. You will install five kinds of customization, then use them to deliver one real feature (accessible fleet filtering) with a built-in independent review and an evidence-based PR.

### What you will be able to do afterward

| # | Capability | You will be able to… |
|---|---|---|
| 1 | Repository instructions | Make "always-on" team rules apply to every chat without anyone typing them |
| 2 | Targeted instructions | Attach rules only to the files they apply to (here: backend + UI tests) |
| 3 | Agent Skill | Package a reusable, multi-step *procedure* the model loads only when relevant |
| 4 | Prompt file (slash command) | Turn a repeated, user-triggered task into a one-word command |
| 5 | Custom agent | Create a role-specific persona with restricted tools |
| 6 | Reviewer subagent | Get an independent, read-only second opinion inside the same workflow |
| 7 | Playwright UI testing | Prove UI behaviour (including keyboard access) with automated tests |

---

## 2. The customization toolkit at a glance

Each mechanism solves a *different* problem. Choosing the right one is the main skill this lab teaches.

| Mechanism | File & location | Loaded when… | Who triggers it | Best for | Value proposition |
|---|---|---|---|---|---|
| **Repository instructions** | `.github/copilot-instructions.md` | **Always**, for every request in the repo | Automatic | Universal rules: "tests first", "never weaken a test", "stop before merge" | One source of truth; nobody has to remember to paste the rules |
| **Targeted instructions** | `.github/instructions/*.instructions.md` with `applyTo:` globs | When Copilot works on a **file matching the glob** | Automatic (by file path) | Rules that only matter for some files (UI tests, Python app code) | Keeps context small and relevant; no noise on unrelated work |
| **Agent Skill** | `.github/skills/<name>/SKILL.md` | When the model judges the **description matches the task** | Model-driven (on demand) | A repeatable *procedure* (steps, checklists, scripts, templates) | Deep expertise loaded just-in-time; zero cost when not needed |
| **Prompt file** | `.github/prompts/*.prompt.md` | When the user types **`/name`** | **User** (explicit) | A task you run on demand: PR summary, release notes, test plan | Consistent, reviewable, shareable "macro" for a common workflow |
| **Custom agent** | `.github/agents/*.agent.md` | When the user **selects it** in the agent picker (or it is invoked as a subagent) | User / another agent | A role with its own instructions **and a restricted tool set** | Least privilege + focused behaviour (e.g., a reviewer that *cannot* edit) |

### Rule of thumb for choosing

```
"Should ALWAYS be true"                          → copilot-instructions.md
"Should be true for THESE FILES"                 → targeted .instructions.md
"Here's HOW to do a certain kind of task"        → Agent Skill
"I want to run THIS task on demand, same way"    → Prompt file (/command)
"I need a ROLE with specific tools / boundaries" → Custom agent
"I want an INDEPENDENT check on the output"      → Reviewer subagent
"This MUST happen, no exceptions"                → Hook (enforcement, not guidance)
```

> **Key insight:** instructions, skills and prompts are *guidance*, since the model can still ignore them. Only hooks and automated tests are *enforcement*. This lab uses both: guidance to steer behaviour and Playwright/pytest to verify it.

---

## 3. The starter application

```
app/main.py                  FastAPI app: /health, /api/servers, and "/" (single HTML page)
tests/test_api.py            pytest: API returns 4 servers with OK/Warning/Critical
tests/ui/smoke.spec.ts       Playwright: page renders the heading + 4 server rows
work-items/MP5.md            The requirement you will implement
.github/copilot-instructions.md   Repo-wide rules (already present)
lab-assets/                  Customizations you will install in Step 1
playwright.config.ts         Starts uvicorn automatically on 127.0.0.1:8000
```

**Seed data (`/api/servers`):**

| name | model | health |
|---|---|---|
| edge-01 | DL360 Gen11 | OK |
| edge-02 | DL380 Gen11 | Warning |
| db-01 | DL360 Gen11 | Critical |
| api-01 | DL380 Gen11 | OK |

**The work item you must deliver (`work-items/MP5.md`):**

> Add health filter (All / OK / Warning / Critical) and text search by name/model. Show visible-result count and an accessible no-results state. Use Playwright to verify filtering and keyboard-accessible controls. Keep API unchanged.

**Acceptance criteria (use these to judge your own work):**

- [ ] A health filter with options **All, OK, Warning, Critical**, a real `<select>` or radio group, with a visible label.
- [ ] A text search box (labelled) that matches **name or model**, case-insensitive.
- [ ] Filter and search **combine** (both must match).
- [ ] A visible **result count** (e.g., "2 of 4 servers") that updates live.
- [ ] A **no-results message** that is announced to assistive technology (e.g., `role="status"` / `aria-live`).
- [ ] Every control is **reachable and operable by keyboard** alone.
- [ ] `/api/servers` response is **unchanged**.
- [ ] Playwright tests cover filtering, search, combination, no-results, and keyboard operation, and **all tests pass**.

---

## 4. Common first 15 minutes — every team starts here

1. Go to **https://github.com/new** and create a new **private** repository. Do **not** initialize it with a README.
2. Unzip this starter project locally and open a terminal in the project folder.
3. Push the starter to your new repo:

```bash
git init
git add .
git commit -m "lab: starter application"
git branch -M main
git remote add origin <YOUR-NEW-REPO-URL>
git push -u origin main
```

4. Open the folder in VS Code and sign in to GitHub Copilot (check the Copilot icon in the status bar, with no warning badge).
5. Create the Python environment:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

6. For UI projects (this one is):

```bash
npm install
npx playwright install chromium
```

7. Run `pytest -q` and confirm the starter is green (expect **1 passed**).
8. Read the work item in `work-items/` **before** asking Copilot to change anything.

> **Create a working branch now** so your PR in Step 7 has something to compare against:
> `git checkout -b feature/mp5-fleet-filtering`

---

## 5. Baseline run — experience the "Before" (do this first)

**Purpose:** to appreciate what the customizations buy you, you must first see what *happens without them*. This takes ~10 minutes and is the most important comparison in the lab.

> ⚠️ Do **not** copy anything from `lab-assets/` yet. Confirm `.github/` contains only `copilot-instructions.md`.

1. Open Copilot Chat in **Agent** mode with the **default** agent.
2. Paste this deliberately plain prompt:

   ```text
   Add filtering to the fleet page: a health filter and a search box.
   ```
3. Let it finish. **Do not fix anything.** Then record what you observed in the table below (copy it into your notes).
4. Run the checks:

   ```bash
   pytest -q
   npm run test:ui
   ```
5. **Stash the baseline so you can compare later**, then reset to a clean tree:

   ```bash
   git diff > baseline.diff
   git stash -u      # or: git checkout -- . && git clean -fd  (keep baseline.diff outside the repo if you do this)
   ```

### Baseline observation sheet

| Question | Baseline answer (circle/note) |
|---|---|
| Did it write or change a Playwright test **before** editing `app/main.py`? | Yes / No |
| Did it use a native `<select>`/radio and `<label for>` (vs. `<div>`s)? | Yes / No |
| Do the new controls have accessible names? (hint: try `page.getByRole('combobox', {name: …})`) | Yes / No |
| Is there a visible result count? | Yes / No |
| Is there a no-results message announced via `role="status"`/`aria-live`? | Yes / No |
| Did it modify `/api/servers`? | Yes / No |
| Did it run the tests itself and report results? | Yes / No |
| Did it list files changed, assumptions and risks? | Yes / No |
| Did anyone independently review it? | Yes / No |
| Roughly how many follow-up prompts would you need to fix the gaps? | ___ |

Typical baseline results: *no test written first, `<div>`/`<span>` controls or unlabeled inputs, selectors based on CSS classes, no no-results state, a short chat summary and no PR evidence.* **Keep these notes.** You will fill in the "After" column in [section 7](#7-before-vs-after-scorecard).

---

## 6. Step-by-step lab

### Step 1 — Install the customizations (0:15–0:40)

**Goal:** copy the five lab assets into the locations where Copilot discovers them.

**Why:** Copilot only discovers customizations at **specific paths**. The files in `lab-assets/` are *staged* so you can learn what each one does as you install it.

Run from the project root (PowerShell):

```powershell
# create target folders
New-Item -ItemType Directory -Force .github\instructions, .github\skills\ui-change-validation, .github\agents, .github\prompts | Out-Null

# instructions (targeted)
Copy-Item lab-assets\frontend.instructions.md      .github\instructions\frontend.instructions.md

# skill (folder name must match the skill `name`)
Copy-Item lab-assets\ui-change-validation\SKILL.md .github\skills\ui-change-validation\SKILL.md

# custom agents
Copy-Item lab-assets\ui-implementer.agent.md       .github\agents\ui-implementer.agent.md
Copy-Item lab-assets\ui-reviewer.agent.md          .github\agents\ui-reviewer.agent.md
```

(The prompt file is installed in Step 2.)

**Read each file** and answer the question next to it. The answers matter. They are what you will explain in the debrief.

| File | What to look for | Question to answer |
|---|---|---|
| `frontend.instructions.md` | The `applyTo: "app/**/*.py,tests/ui/**/*"` front-matter | *Which files trigger this rule? Would it apply when editing `README.md`? (No.) Why is it good that it doesn't?* |
| `ui-change-validation/SKILL.md` | `name` + `description`, then 6 numbered steps | *Which line tells Copilot **when** to use it? (the `description`). Which step makes it "test-first"? (step 2).* |
| `ui-implementer.agent.md` | `tools: [... 'edit', 'terminal', 'agent']` and `agents: ['UI Reviewer']` | *Why does the Implementer need `agent`? (so it can call a subagent). Why is only `UI Reviewer` allowed?* |
| `ui-reviewer.agent.md` | `tools: ['read','search']` and `user-invocable: false` | *Why no `edit`? (A reviewer that can edit will "fix" problems silently instead of reporting them). Why `user-invocable: false`? (it appears only as a subagent, not in the picker.)* |

**Verify the install:**

- [ ] `.github/instructions/frontend.instructions.md` exists
- [ ] `.github/skills/ui-change-validation/SKILL.md` exists
- [ ] `.github/agents/ui-implementer.agent.md` and `ui-reviewer.agent.md` exist
- [ ] In the Copilot Chat agent picker you now see **UI Implementer** (but **not** UI Reviewer, because it is hidden by design)

> If the agent does not appear, run **Developer: Reload Window** (Ctrl+Shift+P) and check *Chat → Customizations / Configure* if your VS Code version provides it.

**Value highlight:** that took one copy command. From now on *every* developer who clones this repo gets the same standards, with no onboarding doc to read and no prompt boilerplate to paste.

---

### Step 2 — Understand activation differences (0:40–0:55)

**Goal:** be able to explain precisely *when* each customization kicks in. This is the conceptual core of the lab.

1. Install the prompt file:

   ```powershell
   Copy-Item lab-assets\prepare-pr.prompt.md .github\prompts\prepare-pr.prompt.md
   ```
2. Open Copilot Chat and ask **exactly**:

   ```text
   Look at the customization files in .github/ (copilot-instructions.md, instructions/, skills/, agents/, prompts/).
   For each one, explain: (1) when it is loaded into context, (2) who or what triggers it,
   and (3) what kind of problem it is best suited for. Put the answer in a table.
   ```
3. Compare Copilot's answer to the table in [section 2](#2-the-customization-toolkit-at-a-glance). Correct anything it got wrong.

**Run the three "activation experiments"** (each takes ~3 minutes). They make the abstract concrete:

| Experiment | What to do | What you should observe | What it proves |
|---|---|---|---|
| **A. Always-on** | Ask: *"What rules must you follow in this repository before changing code?"* | It cites `copilot-instructions.md` rules (work item is source of truth, tests first, stop before merge…) without you mentioning the file | Repo instructions are **automatic** |
| **B. Path-scoped** | Open `tests/ui/smoke.spec.ts`, then ask: *"What conventions apply to the file I have open?"* Then open `LAB_GUIDE.md` and ask the same question | With the spec open it mentions semantic HTML / role-based selectors; with the markdown file open, it does **not** | Targeted instructions are **file-driven** |
| **C. User-triggered** | In chat type `/` and look for **prepare-pr** in the list | The command appears, but nothing happens until **you** run it | Prompt files are **explicitly invoked** |

**Observe, don't just read:** open the *References* / *Used references* section under a chat response to see which instruction files were attached. That is your window into what Copilot actually loaded.

**Value highlight:** you now know *why* the setup is split across five file types. Putting everything in one giant instructions file would waste context on every request and bury the rules that matter. Splitting by activation model keeps each request lean and precise.

---

### Step 3 — Select UI Implementer and check skill selection (0:55–1:20)

**Goal:** see the **skill** get chosen by the model based on its `description`, and see the agent's persona and tool limits take effect.

1. In the Copilot Chat agent picker, choose **UI Implementer**.
2. Give it the work item, but **do not let it code yet**:

   ```text
   Read work-items/MP5.md. Before you change any files, tell me:
   1. Which skill(s) or instruction files you will use and why.
   2. The ordered plan you will follow.
   3. The acceptance criteria you derive from the work item.
   4. Which files you expect to change and which you will NOT change.
   ```
3. Check the response against this rubric:

| Expected | Why it matters |
|---|---|
| Names **`ui-change-validation`** as the skill and gives the reason ("Fleet Health UI change needing accessible controls and Playwright verification") | The model matched the **skill description** to the task. This is on-demand loading. |
| Plan begins with *read work item + existing test*, and **writes a Playwright test first** | The skill's steps 1–2 are shaping its plan |
| Mentions semantic HTML + labels, role-based selectors | The targeted instructions are in effect |
| States `/api/servers` will not change | Both the skill (step 4) and the instructions enforce this |
| Plans to **delegate a final review to UI Reviewer** | The agent file's body instructs this |
| Notes it will stop before merge | Repo-wide instructions |

4. **Trace the source of each behaviour.** For each row above, write down *which file* caused it. If it is not obvious, ask Copilot: *"Which of your instructions led to step 2 of your plan?"*

**Contrast with the baseline:** in Section 5, the default agent jumped straight to editing. Here the agent first verifies its plan against standards you defined. That one change eliminates most rework.

**If the skill is not mentioned:** make sure `SKILL.md` is at `.github/skills/ui-change-validation/SKILL.md`, the front-matter `name:` matches the folder, and that skills are enabled in your VS Code version (Settings → search *agent skills*). Reload the window and retry.

---

### Step 4 — Playwright test-first implementation (1:20–2:20)

**Goal:** deliver the feature **tests-first**, with the skill and instructions guiding Copilot.

#### 4a. Red phase — write failing acceptance tests (≈ 20 min)

Tell the UI Implementer:

```text
Proceed with MP5. Follow the ui-change-validation skill.
Start ONLY with tests: add Playwright acceptance tests in tests/ui/ covering
  - health filter shows only matching servers (OK=2, Warning=1, Critical=1, All=4)
  - text search by name and by model, case-insensitive
  - filter and search combined
  - visible result count text updates
  - accessible no-results state (role="status" or aria-live) when nothing matches
  - keyboard operation: Tab to the controls, change the filter with the keyboard, type in search
Use getByRole / getByLabel locators, not CSS classes.
Run the new tests and show me that they FAIL before you touch app/main.py.
```

**Checkpoint — you must see red.** Run `npm run test:ui` yourself. The new tests should fail because the controls don't exist yet. A test that has never failed has never proved anything.

**Inspect the tests before moving on:**

- [ ] Locators use `getByRole('combobox', { name: /health/i })`, `getByLabel(/search/i)`, `getByRole('status')`, not `.server` or `div:nth-child(2)`.
- [ ] Keyboard test uses `page.keyboard.press('Tab')` / `selectOption` / `fill`/`press`, not just `.click()`.
- [ ] The original smoke test still exists and was not weakened (repo rule: *never weaken or delete a valid test*).

#### 4b. Green phase — implement (≈ 25 min)

```text
Now implement the smallest change in app/main.py that makes the tests pass.
Use a native <select> (or radio group) with an explicit <label>, a labelled search input,
a visible result count, and a no-results message with role="status".
Do not change /api/servers. Then run: targeted Playwright tests, the full UI suite, and pytest.
```

**What good output looks like (reference sketch, don't paste blindly):**

```html
<label for="health">Health</label>
<select id="health">
  <option>All</option><option>OK</option><option>Warning</option><option>Critical</option>
</select>

<label for="q">Search name or model</label>
<input id="q" type="search" />

<p id="count" role="status" aria-live="polite"></p>   <!-- "2 of 4 servers" / "No servers match your filters." -->
<div id="servers"></div>
```

#### 4c. Refactor and verify (≈ 15 min)

Run all three verifiers yourself. Do not rely on Copilot's claim that they passed:

```bash
pytest -q
npx playwright test --reporter=list
npx playwright test --headed          # watch it drive the page
```

**Manual keyboard drill (2 minutes, unavoidable):** start the app (`python -m uvicorn app.main:app`), open http://127.0.0.1:8000, **put the mouse aside**, and press Tab. Can you reach the filter, change it with the arrow keys, type in the search box, and hear/see the count change? If not, your tests missed something. Add one.

#### 4d. Spot the skill at work

Look at Copilot's progress narration. It should follow the skill's six steps in order. If it skipped step 2 (test first) or step 5 (run everything), say so, point at the skill, and have it redo it. That is exactly the correction loop the skill makes cheap.

**Value highlight:** the skill makes "test-first, accessible, minimal, verified" a *default*, not a favour you must request in every prompt.

---

### Step 5 — Delegate to the UI Reviewer subagent (2:20–2:45)

**Goal:** get an independent, **read-only** review, then triage the findings like a human lead would.

1. If the Implementer hasn't already delegated, ask:

   ```text
   Delegate a final review to the UI Reviewer subagent. Give it the changed files and the
   acceptance criteria from work-items/MP5.md. Report its findings verbatim, grouped by severity.
   ```
2. The reviewer should check: semantic controls, labels, keyboard usability, no-results behaviour, Playwright coverage.
3. **Confirm that it is read-only:** the reviewer must not have modified any files (`git status` should show only changes the Implementer made). That is the `tools: ['read','search']` restriction in action.
4. **Triage every finding.** Copy this table into your notes:

| # | Finding (from reviewer) | Valid? (yes / no / partly) | Action | Evidence of resolution |
|---|---|---|---|---|
| 1 | | | fixed / declined (why) | test name or diff line |
| 2 | | | | |

   Rules of triage (also in the repo instructions): **fix valid findings, justify declines, never delete or weaken a test to get green.**
5. Ask the Implementer to fix the valid findings, then **rerun** pytest and the full Playwright suite.

**Typical reviewer catches:** no-results message not announced to screen readers; search box lacking a label; keyboard test that only clicks; count not updating when only the search changes; a missing test for combined filter+search; innerHTML built from unescaped data.

**Why a separate reviewer?** Authors are blind to their own assumptions. A reviewer agent starts with fresh context and a different mandate ("find problems, don't fix them"), which is far more likely to surface gaps. Restricting it to read-only tools guarantees it *reports* rather than silently rewriting.

**Value highlight:** you got a second pair of eyes in two minutes, at no cost to a human reviewer's time, and the human reviewer will now spend their effort on design and risk instead of "this input has no label".

---

### Step 6 — Generate evidence-focused PR content with `/prepare-pr` (2:45–3:10)

**Goal:** use a prompt file to produce a consistent, review-ready PR description.

1. Make sure your changes are staged or at least present in the working tree, and tests are green.
2. In a **new** chat (to prove the prompt works without prior context), type:

   ```text
   /prepare-pr
   ```
3. The prompt reads the work item, the git diff and test results (it has `read`, `search`, `terminal` tools, but is instructed **not to modify files**). It should output a PR title and body with these sections:

| Section | What a good one contains |
|---|---|
| **Requirement** | Quote/summary of MP5 |
| **Implementation** | What changed and where, and what deliberately did *not* change (API) |
| **Accessibility** | Labels, roles, keyboard behaviour, live-region announcement |
| **Tests** | Exact commands run + pass counts; names of new tests |
| **Risks** | Known limitations or assumptions |
| **Human checks** | What a reviewer should verify manually (e.g., screen-reader pass) |

4. **Verify it doesn't lie.** Cross-check each claim against reality: run the test commands again, count the tests, open the diff. A PR description is only valuable if it's true.
5. Confirm `git status` shows that the prompt **did not edit any files**.

**Value highlight:** the PR author's usual 10–15 minutes of "what did I do again?" becomes one command, and every PR in the repo has the same structure, so reviewers know exactly where to look.

---

### Step 7 — Commit, open the PR, inspect debug logs (3:10–3:35)

1. Review your own diff with human eyes first:

   ```bash
   git status
   git diff --stat
   git diff
   ```
2. Confirm nothing unexpected is in the diff: `baseline.diff`, `node_modules/`, `.venv/`, `test-results/` must **not** be committed (check `.gitignore`).
3. Commit and push:

   ```bash
   git add -A
   git commit -m "feat(ui): accessible health filter, search and no-results state (MP5)"
   git push -u origin feature/mp5-fleet-filtering
   ```
4. Open the PR (GitHub UI, or `gh pr create --fill`), paste the `/prepare-pr` output as the body, and **stop there. Do not merge.** Your repo rules say a human reviews diff and evidence.
5. **Inspect Agent Debug Logs** (if available in your VS Code build; try the Command Palette → *Developer: Show Chat Debug View* / *Open Agent Debug Logs*, or the Chat view's "…" menu). Find and note:

| Look for | What it teaches |
|---|---|
| Which instruction files were attached to the request | Proof of *always-on* vs. *targeted* activation |
| The moment the skill was loaded | Proof of on-demand skill loading |
| The subagent call (UI Reviewer) and the tools it used | Proof of tool restriction (only read/search) |
| Terminal commands the agent ran | Audit trail of test evidence |

**Value highlight:** the logs make the AI's behaviour **auditable**. Instead of "trust me", you can show exactly what guidance it received and what it did, which is essential for team adoption and for security/compliance conversations.

---

## 7. Before vs. After scorecard

Fill in the "Before" column from your baseline notes (Section 5) and the "After" column from this run. This is your take-home evidence.

| Dimension | ❌ Before (default Copilot, no customization) | ✅ After (instructions + skill + agents + prompt) | Your result |
|---|---|---|---|
| **Process** | Jumps straight to code | Reads work item → writes failing test → minimal implementation → runs all tests | B: ___  A: ___ |
| **Prompt effort** | Must re-type rules every time ("use tests", "be accessible"…) | One-line prompt: *"Proceed with MP5"* | B: ___  A: ___ |
| **Test quality** | Often none, or CSS-class selectors (`.server`) | `getByRole`/`getByLabel`, keyboard test, no-results test | B: ___  A: ___ |
| **Accessibility** | `<div>`/`<span>` controls, unlabeled input, silent empty state | Native `<select>`, `<label>`s, `role="status"` count & no-results | B: ___  A: ___ |
| **Scope control** | May alter API or refactor unrelated code | `/api/servers` unchanged; smallest change | B: ___  A: ___ |
| **Independent review** | None, so the author approves their own work | Read-only **UI Reviewer** subagent finds gaps; you triage | B: ___  A: ___ |
| **Evidence** | "Done!" in chat | Test commands + counts, files changed, assumptions, risks | B: ___  A: ___ |
| **PR description** | Vague / hand-written | Structured via `/prepare-pr`, same every time | B: ___  A: ___ |
| **Consistency across developers** | Depends on who prompts and how | Same behaviour for everyone who clones the repo | B: ___  A: ___ |
| **Auditability** | Opaque | Debug logs show which guidance and tools were used | B: ___  A: ___ |
| **Safety / least privilege** | Single agent can do anything | Reviewer is read-only; prompt can't edit; human merges | B: ___  A: ___ |
| **Follow-up prompts to reach acceptable quality** | ≈ 6–10 | ≈ 1–3 | B: ___  A: ___ |

### A concrete code-level contrast

**Before (typical default output):**

```html
<input placeholder="search" onkeyup="filter()">
<div onclick="setFilter('OK')">OK</div> <div onclick="setFilter('Warning')">Warning</div>
...
<!-- no label, not keyboard focusable, no count, empty list shows nothing -->
```
```ts
// typical test, if any
await page.click('div:nth-child(2)');
await expect(page.locator('.server')).toHaveCount(2);   // breaks on any markup change
```

**After (guided by instructions + skill):**

```html
<label for="health">Health</label><select id="health">…</select>
<label for="q">Search name or model</label><input id="q" type="search">
<p role="status" aria-live="polite">2 of 4 servers</p>
```
```ts
await page.getByLabel('Health').selectOption('OK');
await expect(page.getByRole('status')).toHaveText(/2 of 4/);
await page.getByLabel(/search/i).fill('zzz');
await expect(page.getByRole('status')).toContainText(/no servers/i);
```

The "after" version is accessible *and* testable. Accessible markup and good tests reinforce each other, which is why the instructions ask for both.

---

## 8. Optional stretch — lifecycle hooks

Everything above is **guidance**: the model *usually* follows it. If something **must** happen every time (format code, run a quick check after every edit, block edits to certain paths), use a **hook**, which is deterministic code run by the harness at lifecycle events (e.g., `PostToolUse` after an edit).

**Try it:** add a hook that runs a quick check after Copilot edits files, for example `python -m py_compile app/main.py` or a formatter such as `ruff format app`.

1. Create `.github/hooks/` (or use the location your VS Code/Copilot version documents for hooks) and define a post-edit hook that executes your command.
2. Ask the Implementer to make a trivial edit to `app/main.py`.
3. Confirm the check ran (look in the Debug Logs). Then introduce a deliberate syntax error and confirm the hook catches it.

| Guidance (instructions/skills/prompts) | Enforcement (hooks / CI / tests) |
|---|---|
| Model *should* follow it | Harness *always* runs it |
| Flexible, context-aware | Deterministic, narrow |
| Cheap to write | Needs a script |

> Availability, file location, and event names for hooks **vary by harness and version**. Check the current Copilot/VS Code documentation. If hooks aren't available to you, add the same check to CI or a git pre-commit hook instead.

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| UI Implementer not in agent picker | File not in `.github/agents/` or wrong extension | Must be `*.agent.md`; reload window |
| UI Reviewer not in picker | **Expected:** `user-invocable: false` | It's only callable as a subagent |
| Implementer won't delegate to reviewer | Name mismatch | `agents: ['UI Reviewer']` must equal the reviewer's `name:` exactly; check that `agent` is in `tools` |
| Skill never mentioned | Wrong path/name, skills disabled, or description doesn't match your wording | Path `.github/skills/ui-change-validation/SKILL.md`; folder name = `name:`; ask "Use the ui-change-validation skill" to confirm it loads |
| `/prepare-pr` not listed | Not in `.github/prompts/` or not `*.prompt.md` | Move/rename; reload window |
| `/prepare-pr` can't find the work item | Relative path in `#file:` wrong | From `.github/prompts/`, `../../work-items/MP5.md` is correct; keep the file in that folder |
| Targeted instructions don't seem to apply | No matching file in context | `applyTo` only fires when working with matching files; open/attach one |
| `playwright: command not found` or browser missing | Skipped step 6 of setup | `npm install` then `npx playwright install chromium` |
| Port 8000 already in use | A previous uvicorn is still running | Stop it, or set `BASE_URL`; config has `reuseExistingServer: true` |
| `pytest` can't import `app` | Venv not activated or wrong cwd | Activate `.venv`, run from the project root |
| Tests pass but you suspect they're weak | Test never failed first | Temporarily break the feature and confirm the test fails |
| Copilot "fixes" a failing test by weakening it | Violates repo rules | Reject, restate: *"Never weaken a valid test; fix the code."* |

---

## 10. Debrief questions and takeaways

Discuss in your team (10 minutes) and be ready to share one answer:

1. In the baseline run, which gap would have cost you the most time in code review? Which customization closed it?
2. Which of the five mechanisms would you have been tempted to put in `copilot-instructions.md`, and why is that a worse choice?
3. What did the reviewer subagent find that the Implementer missed? Why is a *read-only* reviewer safer than a reviewer that can edit?
4. Which rules in your own team's standards are best expressed as: always-on instructions? targeted instructions? a skill? a prompt file? a hook?
5. What would you **not** trust Copilot to verify, and what human check remains? (Hint: look at "Human checks" in your PR.)

### Key takeaways

- **Encode standards once, apply everywhere.** Repo-level customizations travel with the code, so onboarding and consistency come free.
- **Match the mechanism to the need.** Always-on vs. path-scoped vs. on-demand vs. user-triggered vs. role-based vs. enforced.
- **Test-first + accessibility-first is a *workflow*,** and a skill is how you make a workflow repeatable.
- **Separation of duties works for AI too:** implementer writes, reviewer (read-only) critiques, human decides.
- **Guidance isn't enforcement.** Pair it with tests, CI and hooks for anything non-negotiable.
- **Evidence beats assertion.** A PR with commands, counts and risks is reviewable; "it works" is not.

---

## 11. Completion checklist

**Setup & customization**
- [ ] Private repo created; starter pushed; `pytest -q` green at start
- [ ] Baseline run recorded (Section 5) before installing customizations
- [ ] Instructions, skill, both agents and the prompt file installed in the correct `.github/` folders
- [ ] Can explain when each customization activates (Step 2 experiments A, B, C)

**Delivery**
- [ ] UI Implementer named the `ui-change-validation` skill and gave a test-first plan
- [ ] New Playwright tests failed first (red), then passed (green)
- [ ] Locators use roles/labels; keyboard operation is tested
- [ ] Filter (All/OK/Warning/Critical), search (name/model), count, and no-results state all work
- [ ] `/api/servers` unchanged; original smoke test intact
- [ ] `pytest -q` and `npm run test:ui` both pass

**Review & PR**
- [ ] UI Reviewer ran read-only; findings triaged in a table; valid ones fixed and tests re-run
- [ ] `/prepare-pr` generated a PR body covering requirement, implementation, accessibility, tests, risks, human checks
- [ ] PR opened on `feature/mp5-fleet-filtering`; **not merged**
- [ ] Debug logs inspected (or noted unavailable)

**Reflection**
- [ ] Before/After scorecard completed
- [ ] Debrief question answered
- [ ] *(Optional)* Hook added and verified
