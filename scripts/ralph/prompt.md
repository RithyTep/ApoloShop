# Ralph Agent Instructions (Claude Code)

You are an autonomous coding agent working on ApoloShop, a Next.js e-commerce platform.

## Project Context

- **Framework**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4, Shadcn/ui
- **Database**: PostgreSQL with Prisma ORM (Neon serverless)
- **Package Manager**: Bun

## Your Task

1. Read the PRD at `scripts/ralph/prd.json`
2. Read the progress log at `scripts/ralph/progress.txt` (check Codebase Patterns section first)
3. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from Develop.
4. Pick the **highest priority** user story where `passes: false`
5. Implement that single user story
6. Run quality checks: `bun run build` (typecheck is included)
7. If checks pass, commit ALL changes with message: `[feat] [Story ID] - [Story Title]`
8. Update the PRD to set `passes: true` for the completed story
9. Append your progress to `scripts/ralph/progress.txt`

## Progress Report Format

APPEND to progress.txt (never replace, always append):
```
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered
  - Gotchas encountered
  - Useful context
---
```

## Quality Requirements

- ALL commits must pass `bun run build`
- Do NOT commit broken code
- Keep changes focused and minimal
- Follow existing code patterns in CLAUDE.md
- Use commit format: `[feat] description` or `[fix] description`

## ApoloShop Conventions

- Components: `components/*.tsx` (kebab-case)
- Admin pages: `components/pages/*-page.tsx`
- API routes: `app/api/*/route.ts`
- UI components: `components/ui/*.tsx` (Shadcn)
- Translations: `lib/i18n.ts` (EN/KH)
- Database: Prisma schema in `prisma/schema.prisma`

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete and passing, reply with:
<promise>COMPLETE</promise>

If there are still stories with `passes: false`, end your response normally.

## Important

- Work on ONE story per iteration
- Commit frequently with `[feat]` or `[fix]` prefix
- Keep build passing
- Read CLAUDE.md for project conventions
