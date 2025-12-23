# Claude Code Project Memory - ApoloShop

This file provides context for Claude Code when working on this project.

## Project Overview

**ApoloShop** is a Next.js 16 e-commerce platform for small Cambodian businesses (coffee shops, bakeries).

## Quick Reference

| Aspect | Details |
|--------|---------|
| Framework | Next.js 16.0.10, React 19.2.0 |
| Styling | Tailwind CSS 4.1.9, Shadcn/ui |
| Language | TypeScript |
| Package Manager | Bun |
| Deployment | Vercel |

## Key Directories

- `app/` - Next.js App Router pages
- `components/` - React components (32 total)
- `components/ui/` - Shadcn UI components
- `components/pages/` - Admin dashboard pages
- `lib/` - Utilities and i18n translations
- `public/` - Static assets

## Important Files

- `components/shop-app.tsx` - Main shop container
- `components/admin-dashboard.tsx` - Admin dashboard
- `lib/i18n.ts` - English/Khmer translations
- `PROJECT.md` - Full project documentation

## Development Commands

```bash
bun dev      # Start dev server
bun build    # Production build
bun start    # Start production
```

## Code Conventions

- Components: `kebab-case.tsx`
- Page components: `*-page.tsx`
- UI primitives: `components/ui/`
- Translations in `lib/i18n.ts`

## Features to Know

1. **Multi-language**: English (en) / Khmer (kh)
2. **Multi-currency**: USD / KHR (1 USD = 4000 KHR)
3. **Checkout**: Via Telegram or Facebook Messenger
4. **Admin**: 12 dashboard pages for shop management
5. **KDS**: Kitchen Display System for order tracking

## Git Workflow

**See `GIT_WORKFLOW.md` for complete documentation.**

### Branch Naming
```
Feature/<name>   # New features
Fix/<name>       # Bug fixes
Hotfix/<name>    # Urgent fixes
Refactor/<name>  # Code refactoring
Docs/<name>      # Documentation
```

### Commit Convention
```
[feat] Add new feature
[fix] Fix a bug
[refactor] Refactor code
[docs] Update documentation
[test] Add/fix tests
[chore] Maintenance
```

### Documentation Requirements
- **Every feature** must have: `docs/features/<name>.md`
- **API changes** must update: `docs/api/<endpoint>.md`
- **Releases** must update: `CHANGELOG.md`

### Git Hooks (Automatic)
- **pre-commit**: Updates timestamps, validates docs
- **commit-msg**: Validates commit format `[type] description`

---

## Claude Code Instructions

**IMPORTANT: Follow these rules for EVERY task.**

### Before Starting Any Feature

1. **Check current branch**: `git branch --show-current`
2. **Create proper branch** if needed:
   ```bash
   git checkout -b Feature/<feature-name>  # For new features
   git checkout -b Fix/<bug-name>          # For bug fixes
   ```
3. **Create documentation FIRST** before writing code:
   ```bash
   # Copy template
   cp docs/features/_TEMPLATE.md docs/features/<feature-name>.md
   # Then fill in the template
   ```

### During Development

1. **Update documentation** as you implement features
2. **Update API docs** if you modify `app/api/` routes
3. **Add to CHANGELOG.md** for significant changes

### When Committing

1. **Always use this format**: `[type] description`
   - `[feat]` - New feature
   - `[fix]` - Bug fix
   - `[docs]` - Documentation
   - `[refactor]` - Refactoring
   - `[chore]` - Maintenance

2. **Commit command**:
   ```bash
   git commit -m "[type] Short description of change"
   ```

3. **Multi-line commits** for bigger changes:
   ```bash
   git commit -m "$(cat <<'EOF'
   [feat] Add feature description

   - Detail 1
   - Detail 2

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   )"
   ```

### Workflow Checklist

For every task, follow this order:

- [ ] 1. Create/switch to correct branch
- [ ] 2. Create `docs/features/<name>.md` (for features)
- [ ] 3. Implement the code changes
- [ ] 4. Update documentation to match implementation
- [ ] 5. Update `docs/api/*.md` if API changed
- [ ] 6. Add entry to `CHANGELOG.md` if significant
- [ ] 7. Commit with `[type] description` format
- [ ] 8. Verify hooks pass (they run automatically)

### Quick Reference

| Task Type | Branch | Commit | Docs Required |
|-----------|--------|--------|---------------|
| New feature | `Feature/<name>` | `[feat]` | `docs/features/<name>.md` |
| Bug fix | `Fix/<name>` | `[fix]` | Update affected docs |
| API change | `Feature/<name>` | `[feat]` | `docs/api/<endpoint>.md` |
| Refactor | `Refactor/<name>` | `[refactor]` | Update if behavior changes |
| Docs only | `Docs/<name>` | `[docs]` | N/A |

## MCP Integration

This project uses MCP servers for:
- `filesystem` - File access
- `memory` - Persistent context

See `.claude/settings.local.json` for configuration.

---

*For full documentation, see PROJECT.md*
