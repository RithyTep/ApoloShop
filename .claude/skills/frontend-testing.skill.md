# Frontend Testing Skill

> Source: [langgenius/dify](https://github.com/langgenius/dify) - Adapted for ApoloShop

## Overview

This skill provides comprehensive frontend testing guidance using Vitest and React Testing Library. When you ask to write, refactor, or fix tests, follow these rules by default.

## Tech Stack

- **Framework**: Next.js 16 + React 19 + TypeScript
- **Testing Tools**: Vitest + React Testing Library
- **Test Environment**: jsdom
- **File Naming**: `ComponentName.spec.tsx` (same directory as component)

## Running Tests

```bash
# Run all tests
bun test

# Watch mode
bun test --watch

# Generate coverage report
bun test --coverage

# Run specific file
bun test path/to/file.spec.tsx
```

## Test Authoring Principles

- **Single behavior per test**: Each test verifies one user-observable behavior.
- **Black-box first**: Assert external behavior and observable outputs, avoid internal implementation details.
- **Semantic naming**: Use `should <behavior> when <condition>`.
- **AAA Pattern**: Arrange (setup) → Act (execute) → Assert (verify).
- **Minimal assertions**: Keep only expectations that express the essence of the behavior.

## Basic Guidelines

- Always use AAA pattern: Arrange → Act → Assert
- Descriptive test names: `"should [behavior] when [condition]"`
- TypeScript: No `any` types
- Reset mocks in `beforeEach()`, not `afterEach()`
- Never mock base components from `components/ui/`
- Import real project components instead of mocking them
- Only mock external dependencies and APIs

## Component Complexity Guidelines

### Very Complex Components (Complexity > 50)
- Refactor first: Break component into smaller pieces
- Integration tests: Test complex workflows end-to-end
- Data-driven tests: Use `test.each()` for multiple scenarios

### Complex Components (Complexity 30-50)
- Multiple describe blocks: Group related test cases
- Integration scenarios: Test feature combinations

### Large Components (500+ lines)
- Consider refactoring: Split into smaller components
- Section testing: Test major sections separately

## Test Scenarios

### 1. Rendering Tests (REQUIRED)
- Verify component renders properly
- Check key elements exist
- Use semantic queries (getByRole, getByLabelText)

### 2. Props Testing (REQUIRED)
- Required props gate functionality
- Optional props fall back to defaults
- Invalid combinations surface through safeguards

### 3. State Management
- Initial render in context
- Interactions that move state machine
- Resulting UI or side effects
- Use `waitFor()` for async transitions

### 4. Event Handlers
- Primary clicks, change events, submits
- Relevant keyboard shortcuts
- Resulting behavior confirmation

### 5. API Calls and Async Operations
- Mock all API calls using `vi.mock`
- Test retry logic (if applicable)
- Verify error handling and user feedback
- Use `waitFor()` for async operations

### 6. Edge Cases (REQUIRED)
- null/undefined/empty values
- Boundary conditions
- Error states
- Loading states
- Unexpected inputs

## Example Structure

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Component from './index'

// Mock external dependencies only
vi.mock('@/service/api')

describe('ComponentName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render without crashing', () => {
      // Arrange
      const props = { title: 'Test' }

      // Act
      render(<Component {...props} />)

      // Assert
      expect(screen.getByText('Test')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should handle click events', () => {
      const handleClick = vi.fn()
      render(<Component onClick={handleClick} />)

      fireEvent.click(screen.getByRole('button'))

      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge Cases', () => {
    it('should handle null data', () => {
      render(<Component data={null} />)
      expect(screen.getByText(/no data/i)).toBeInTheDocument()
    })
  })
})
```

## Coverage Goals

- 100% function coverage (every exported function/method tested)
- 100% statement coverage (every line executed)
- >95% branch coverage (every if/else, switch case, ternary tested)
- >95% line coverage

## Finding Elements Priority

1. `getByRole` - Most recommended, follows accessibility standards
2. `getByLabelText` - Form fields
3. `getByPlaceholderText` - Only when no label
4. `getByText` - Non-interactive elements
5. `getByDisplayValue` - Current form value
6. `getByAltText` - Images
7. `getByTitle` - Last choice
8. `getByTestId` - Only as last resort

## Debugging Tips

```typescript
// Print entire DOM
screen.debug()

// Print specific element
screen.debug(screen.getByRole('button'))

// Wait for element to appear
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument()
})

// Find async element
const element = await screen.findByText('Async Content')
```

## Resources

- [Vitest Documentation](https://vitest.dev/guide/)
- [React Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
