# Senior QA Skill

> Source: [davila7/claude-code-templates](https://github.com/davila7/claude-code-templates)

## Overview

This is a comprehensive QA toolkit designed for quality assurance professionals working with modern web technologies. The skill enables test strategy design, test automation, manual testing, and coverage analysis.

## Core Capabilities

### 1. Test Suite Generation
- Create test scaffolding with built-in best practices
- Configurable templates for different test types
- Support for unit, integration, and E2E tests

### 2. Coverage Analysis
- Perform deep analysis with performance metrics
- Identify coverage gaps
- Provide optimization recommendations

### 3. E2E Test Scaffolding
- Create production-grade end-to-end testing setup
- Support for Playwright, Cypress, and other frameworks
- Page object pattern implementation

## Technology Support

### Languages
- TypeScript, JavaScript, Python, Go, Swift, Kotlin

### Frontend Frameworks
- React, Next.js, Vue, React Native

### Backend Systems
- Node.js, Express, GraphQL, REST APIs

### Databases
- PostgreSQL, MySQL, Prisma, Supabase

### DevOps
- Docker, Kubernetes, GitHub Actions, CI/CD pipelines

## Testing Strategies

### Unit Testing
- Test individual functions and methods in isolation
- Mock external dependencies
- Fast execution, high coverage
- Use for business logic validation

### Integration Testing
- Test component interactions
- Verify API contracts
- Database integration verification
- External service integration

### E2E Testing
- User journey validation
- Cross-browser testing
- Visual regression testing
- Performance testing

## QA Best Practices

### 1. Test Pyramid
```
        /\
       /E2E\     <- Few, slow, expensive
      /------\
     /Integ.  \  <- Medium count
    /----------\
   /   Unit     \ <- Many, fast, cheap
  /--------------\
```

### 2. Testing Principles
- **Measure before optimizing**: Run coverage analyzer first
- **Validate inputs**: Security-focused input validation
- **Maintain clear standards**: Consistent code quality
- **Keep dependencies current**: Regular updates

### 3. Test Quality Checklist
- Tests are independent and can run in any order
- Tests are deterministic (no flaky tests)
- Tests are fast and don't slow down development
- Tests have clear assertions and error messages
- Tests cover both happy paths and edge cases

## Workflow Process

### Step 1: Setup
```bash
# Install testing dependencies
bun add -d vitest @testing-library/react @testing-library/jest-dom

# Install E2E framework
bun add -d @playwright/test
```

### Step 2: Analyze Coverage
```bash
# Run coverage analysis
bun test --coverage

# Generate HTML report
bun test --coverage --coverage.reporter=html
```

### Step 3: Identify Gaps
- Review uncovered lines
- Identify critical paths without tests
- Prioritize high-risk areas

### Step 4: Implement Tests
Following documented best practices:
- Code quality focus
- Performance considerations
- Security testing
- Maintainability

## Test Categories for ApoloShop

### Component Tests
```typescript
describe('ProductCard', () => {
  it('should display product name and price', () => {});
  it('should handle add to cart action', () => {});
  it('should show discount badge when applicable', () => {});
});
```

### API Tests
```typescript
describe('Product API', () => {
  it('should return product list', async () => {});
  it('should handle pagination', async () => {});
  it('should filter by category', async () => {});
});
```

### E2E Tests
```typescript
test('checkout flow', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="product-1"]');
  await page.click('[data-testid="add-to-cart"]');
  await page.click('[data-testid="checkout"]');
  await expect(page).toHaveURL(/checkout/);
});
```

## Coverage Requirements

### Minimum Thresholds
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

### Critical Paths (100% Required)
- Payment processing
- User authentication
- Cart operations
- Order management

## Test Automation

### CI/CD Integration
```yaml
# GitHub Actions example
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: oven-sh/setup-bun@v1
    - run: bun install
    - run: bun test --coverage
    - run: bun playwright test
```

### Pre-commit Hooks
```bash
# Run tests before commit
bun test --run --changed
```

## Debugging Tests

### Common Issues
1. **Flaky tests**: Use retry mechanisms, fix timing issues
2. **Slow tests**: Parallelize, mock heavy operations
3. **False positives**: Improve assertions, add edge cases
4. **Test pollution**: Ensure proper cleanup between tests

### Debugging Commands
```bash
# Run single test file
bun test path/to/file.spec.ts

# Run with verbose output
bun test --reporter=verbose

# Debug mode
bun test --inspect-brk
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Kent C. Dodds Testing Blog](https://kentcdodds.com/blog)
