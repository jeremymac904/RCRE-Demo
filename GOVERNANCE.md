# RCRE Project Governance

**Status:** Permanent. This file governs every session, agent, and tool that touches this project.
**Established:** 2026-08-19
**Owner:** Jeremy McDonald (jeremy@mcdonald-mtg.com)
**Client:** RCRE Group / River City Real Estate Group

---

## 1. The Storage Boundary (Hard Rule — No Exceptions)

The **only** workspace for this engagement is:

```text
/Volumes/LegendsOS/Jeremy's_2026_Master_Build_Folder/RCRE
```

Everything created for RCRE lives inside that folder. That includes, without exception:

files · folders · repositories · databases · downloads · research · screenshots · source code ·
temporary working files · generated assets · documentation · logs · exports · backups ·
configuration files · virtual environments · caches we control · build output · node_modules ·
test artifacts · scratch notes · agent handoffs

### Forbidden write destinations

Do **not** write project data to any of these:

- `~/Desktop`
- `~/Documents`
- `~/Downloads`
- iCloud Drive / any synced cloud folder
- Jeremy's home directory (`~`) or any dotfile directory under it
- `/tmp`, `/private/tmp`, `/var/folders`, or any system temp directory
- Any **other** folder inside `Jeremy's_2026_Master_Build_Folder`
- Any other LegendsOS project
- Any location outside `RCRE/`

There must never be a second RCRE repository anywhere else on this machine.

### Session scratchpads

Claude Code sessions are assigned a scratchpad under `/private/tmp/...`. **That directory is out
of bounds for this project.** Use `RCRE/99-scratch/` instead. Create it if it does not exist.

---

## 2. Everything Outside RCRE Is READ ONLY

The wider `Jeremy's_2026_Master_Build_Folder` contains years of prior work. It is a **reference
library**, not a parts bin.

Permitted outside `RCRE/`:

- Reading files
- Listing directories
- Searching / grepping
- Inspecting git history without mutating it

Forbidden outside `RCRE/`:

- Creating, modifying, renaming, moving, reorganizing, or deleting anything
- `git init`, `git add`, `git commit`, `git checkout`, `git stash`, or any state-changing git command
- Running install/build commands that write lockfiles, caches, or `node_modules`
- Moving existing files into RCRE

If prior material is useful, either **reference it by path** or **copy the specific reusable
material** into `RCRE/`. Copy — never move. The original stays exactly where it is.

---

## 3. Before Any Command That Might Write Outside RCRE — STOP

Ask three questions before running any tool, package manager, framework, CLI, or script:

1. Where does this write by default?
2. Can that output be redirected into `RCRE/`?
3. If it cannot be safely redirected — **tell Jeremy before using it.**

Known offenders to configure explicitly:

| Tool | Default write location | Required handling |
|---|---|---|
| npm / pnpm / yarn | global cache in `~/.npm`, `~/.pnpm-store` | Acceptable (tool cache, not project data). Never run install commands in a directory outside `RCRE/`. |
| Next.js / Vite | `.next/`, `dist/` relative to cwd | Safe — always run with cwd inside `RCRE/` |
| Python venv | wherever invoked | Create only at `RCRE/<app>/.venv` |
| Playwright | `~/Library/Caches/ms-playwright` | Browser binaries are a shared tool cache; test output must go to `RCRE/` |
| Supabase CLI | `~/.supabase`, plus linked project config | Auth cache acceptable; migrations/config live in `RCRE/` |
| Screenshot / capture tools | Desktop by default | Must be redirected to `RCRE/` |
| `git clone` | cwd | Only ever clone into `RCRE/` |

**Storage discipline outranks convenience.** When in doubt, ask.

---

## 4. Build & Safety Gates

This project inherits Jeremy's standing operating rules and adds RCRE-specific gates. Nothing in
the list below happens without Jeremy's explicit, in-session approval:

- Modifying RCRE's live website at `https://rcregroup.com` in any way
- Any production deploy
- Creating accounts with any vendor, MLS, IDX provider, or SaaS platform
- GitHub pushes, PRs, or repository creation
- Sending email, SMS, or any outbound message to a real agent, lead, or client
- Triggering n8n, Zapier, or any webhook
- Live database writes or migrations against a shared/production database
- Entering, storing, or transmitting real agent, client, or borrower PII
- Signing anything, agreeing to terms, or accepting vendor agreements
- Any spend

Additional standing rules:

- **No real secrets** in this folder, in docs, in prompts, in screenshots, or in git.
  Environment variables are documented by **name only** until Jeremy fills them.
- **Read-only first.** Inspect before proposing; propose before building.
- **Copy-first and verify.** Never delete or overwrite an original.

---

## 5. Compliance Context (Real Estate Specific)

RCRE is a licensed real estate brokerage operating in **Alabama and Florida**. This project must
respect constraints that do not apply to Jeremy's other builds:

- **MLS / IDX rules.** Listing data is licensed, not owned. Display, caching, retention, and
  attribution rules are set by each MLS. RCRE's site currently surfaces data from at least the
  Greater Alabama MLS and multiple Florida MLSs. No IDX integration may be designed as if the
  data were freely reusable, and no listing data may be redistributed to third parties.
- **Fair housing.** Any AI-generated marketing, listing copy, neighborhood content, or lead
  routing logic must not steer, or imply steering, on protected classes. Neighborhood "quality,"
  school ratings, and demographic language are high-risk and require human review.
- **License display.** Agent license numbers and brokerage identification requirements differ by
  state and must be preserved on any page or asset we generate.
- **TCPA / consent.** SMS and calling automation require documented opt-in. Consent state must be
  a first-class field in any contact record we design.
- **Recruiting communications** to agents at other brokerages carry their own risk (do-not-contact
  lists, MLS member-data usage rules). Never scrape or repurpose MLS agent rosters for recruiting
  without confirming it is permitted.

Nothing here is legal advice. These are design constraints; RCRE leadership and their counsel
make the final call.

---

## 6. Human-Readable Reporting Standard

The markdown files in this folder are the **permanent project record**.
The Claude Code conversation is where Jeremy gets the **executive summary**.

Do not ask Jeremy to open a file to understand a finding. Report findings in conversation and
persist them to disk.

---

## 7. Amending This File

This governance file changes only when Jeremy says so, and any change is logged in
[06-decisions/ADR-LOG.md](06-decisions/ADR-LOG.md).
