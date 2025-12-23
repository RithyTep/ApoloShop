# Git Workflow & Documentation Standards

> This document defines the Git workflow, branch naming, commit conventions, and documentation requirements for ApoloShop.

## Branch Naming Convention

### Format
```
<type>/<short-description>
```

### Branch Types

| Type | Description | Example |
|------|-------------|---------|
| `Feature/` | New features | `Feature/user-authentication` |
| `Fix/` | Bug fixes | `Fix/checkout-validation` |
| `Hotfix/` | Urgent production fixes | `Hotfix/payment-crash` |
| `Refactor/` | Code refactoring | `Refactor/api-structure` |
| `Docs/` | Documentation only | `Docs/api-reference` |
| `Test/` | Test additions/fixes | `Test/order-integration` |
| `Chore/` | Maintenance tasks | `Chore/dependency-updates` |

### Rules
- Use **PascalCase** for type prefix (e.g., `Feature/`, `Fix/`)
- Use **kebab-case** for description (e.g., `user-authentication`)
- Keep descriptions short but descriptive (2-4 words)
- Branch from `Develop` for features, `main` for hotfixes

---

## Commit Message Convention

### Format
```
[<type>] <short-description>

<optional-body>

<optional-footer>
```

### Commit Types

| Type | Description | Triggers Doc Update |
|------|-------------|---------------------|
| `feat` | New feature | Yes - feature doc required |
| `fix` | Bug fix | Yes - update affected docs |
| `refactor` | Code refactoring | Yes - if API changes |
| `docs` | Documentation only | N/A |
| `test` | Adding/fixing tests | No |
| `chore` | Maintenance tasks | No |
| `style` | Formatting, no code change | No |
| `perf` | Performance improvements | Yes - if API changes |

### Examples

```bash
# Feature commit
git commit -m "[feat] Add user authentication with JWT"

# Bug fix
git commit -m "[fix] Resolve checkout validation error"

# Refactoring
git commit -m "[refactor] Restructure API routes for consistency"

# Documentation
git commit -m "[docs] Update API reference for orders endpoint"

# Multi-line commit
git commit -m "[feat] Add product search functionality

Implements full-text search using PostgreSQL
- Added search endpoint at /api/products/search
- Supports filtering by category and price range
- Includes pagination support

Closes #42"
```

---

## Documentation Requirements

### Every Feature Must Have Documentation

When creating a new feature, you **MUST** create or update documentation:

1. **Feature Documentation**: `docs/features/<feature-name>.md`
2. **API Documentation**: Update `docs/api/<endpoint>.md` if adding/modifying APIs
3. **Changelog Entry**: Add to `CHANGELOG.md`

### Feature Documentation Template

Create file at `docs/features/<feature-name>.md`:

```markdown
# Feature: <Feature Name>

> Added in branch: `Feature/<branch-name>`
> Last updated: YYYY-MM-DD

## Overview
Brief description of what this feature does.

## Usage
How to use this feature with examples.

## Components
List of components created or modified.

## API Endpoints
List any new or modified endpoints.

## Database Changes
Any schema changes (if applicable).

## Configuration
Environment variables or settings needed.

## Related Files
- `path/to/file.tsx`
- `path/to/another-file.ts`
```

### Documentation File Structure

```
docs/
├── README.md                 # Documentation index
├── CHANGELOG.md              # Version history
├── features/                 # Feature documentation
│   ├── _TEMPLATE.md          # Template for new features
│   ├── authentication.md
│   ├── checkout.md
│   └── ...
├── api/                      # API documentation
│   ├── README.md
│   ├── products.md
│   ├── orders.md
│   └── ...
├── guides/                   # How-to guides
│   ├── getting-started.md
│   └── conventions.md
└── database/                 # Database documentation
    └── schema.md
```

---

## Git Hooks

### Pre-commit Hook

The pre-commit hook validates:
1. Feature branches have corresponding documentation
2. Documentation timestamps are updated
3. Commit includes doc changes for `feat` commits

### Commit-msg Hook

The commit-msg hook validates:
1. Commit message follows the `[type] description` format
2. Type is one of the allowed types
3. Description is meaningful (>10 characters)

---

## Workflow Examples

### Creating a New Feature

```bash
# 1. Create feature branch
git checkout Develop
git pull origin Develop
git checkout -b Feature/user-dashboard

# 2. Create feature documentation FIRST
touch docs/features/user-dashboard.md
# Fill in the template...

# 3. Implement the feature
# ... write code ...

# 4. Commit with proper format
git add .
git commit -m "[feat] Add user dashboard with analytics widgets"

# 5. Push and create PR
git push -u origin Feature/user-dashboard
```

### Fixing a Bug

```bash
# 1. Create fix branch
git checkout Develop
git checkout -b Fix/cart-quantity-update

# 2. Fix the bug
# ... write code ...

# 3. Update relevant documentation if behavior changes
# Edit docs/features/shopping-cart.md if needed

# 4. Commit
git commit -m "[fix] Correct cart quantity update logic"

# 5. Push and create PR
git push -u origin Fix/cart-quantity-update
```

### Documentation-Only Changes

```bash
# 1. Create docs branch
git checkout -b Docs/api-improvements

# 2. Update documentation
# ... edit docs ...

# 3. Commit
git commit -m "[docs] Improve API reference examples"

# 4. Push and create PR
git push -u origin Docs/api-improvements
```

---

## Pull Request Requirements

Before merging a PR:

1. **Documentation Check**
   - [ ] Feature has documentation in `docs/features/`
   - [ ] API changes documented in `docs/api/`
   - [ ] CHANGELOG.md updated (for features/breaking changes)

2. **Code Quality**
   - [ ] Build passes (`bun run build`)
   - [ ] No TypeScript errors
   - [ ] Follows code conventions

3. **Commit History**
   - [ ] All commits follow convention
   - [ ] Meaningful commit messages
   - [ ] No WIP commits in final PR

---

## Quick Reference

### Branch Prefixes
```
Feature/  Fix/  Hotfix/  Refactor/  Docs/  Test/  Chore/
```

### Commit Types
```
[feat]  [fix]  [refactor]  [docs]  [test]  [chore]  [style]  [perf]
```

### Required Documentation
```
Feature → docs/features/<name>.md
API     → docs/api/<endpoint>.md
All     → CHANGELOG.md (for releases)
```

---

*For Claude Code: Always follow this workflow when making changes. Create documentation before or alongside code changes.*
