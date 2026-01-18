# Dev Server Testing Skill

> Source: [oven-sh/bun](https://github.com/oven-sh/bun) - Adapted for ApoloShop

## Overview

This skill provides guidance for writing dev server and hot module reloading (HMR) tests. Dev server tests validate hot-reloading robustness and reliability.

## Test Categories

- **Bundle tests** - Dev server bundling behavior
- **CSS tests** - Stylesheet bundling and hot reloading
- **Plugin tests** - Development mode plugins
- **Ecosystem tests** - Library compatibility
- **ESM tests** - ESM features in development
- **HTML tests** - HTML file handling and watching
- **React SPA tests** - React refresh transform, server components
- **Sourcemap tests** - Source map correctness

## Key Concepts

### File Watching
Tests should validate that changes to files trigger appropriate hot reloads:
- HTML file changes should reload the page
- CSS changes should hot-swap without full reload
- JavaScript/TypeScript changes should trigger HMR

### Error Recovery
Dev server should handle and recover from:
- Missing imports that are later created
- Syntax errors that are fixed
- Invalid module resolution

## Test Structure

### Basic Pattern

```typescript
describe('dev server', () => {
  const initialFiles = {
    'index.html': `<!DOCTYPE html>
      <html>
        <head></head>
        <body>
          <h1>Hello</h1>
          <script type="module" src="/script.ts"></script>
        </body>
      </html>`,
    'script.ts': `console.log("hello");`,
  };

  it('should watch HTML file changes', async () => {
    // Setup dev server with initial files
    // Verify initial state
    // Modify file
    // Verify hot reload occurred
    // Assert new content is served
  });
});
```

### Key Operations

1. **HTTP Fetching** - Make requests to dev server endpoints
2. **File Mutations** - Write, patch, or delete files to trigger reloads
3. **Client Assertions** - Verify console output and DOM state
4. **Reload Detection** - Detect full page reloads vs hot updates

### Testing Errors

When testing error scenarios, specify anticipated errors:

```typescript
it('should handle missing imports gracefully', async () => {
  // Create file that imports non-existent module
  // Verify error is shown to user
  // Create the missing module
  // Verify recovery and module loads correctly
});
```

## Best Practices

### File System Operations
- Use test utilities for file mutations, not raw fs operations
- File mutations should automatically wait for hot-reload to complete
- Test both creation and deletion of files

### Client Testing
- Open browser clients to test console output
- Use `expectMessage()` to assert console.log output
- Use `expectReload()` to wrap code that causes hard reloads

### Error Handling
- Test that errors are properly displayed
- Test recovery from errors after fixing code
- Specify expected errors in test configuration

## Test Scenarios

### 1. Basic Hot Reload
```typescript
it('should hot reload on file change', async () => {
  // Initial fetch
  // Modify file content
  // Verify change reflected without full reload
});
```

### 2. Module Creation
```typescript
it('should handle importing then creating module', async () => {
  // Start with import of non-existent file
  // Verify error state
  // Create the file
  // Verify module loads and error clears
});
```

### 3. CSS Hot Swap
```typescript
it('should hot swap CSS without reload', async () => {
  // Load page with CSS
  // Modify CSS file
  // Verify styles update without full reload
});
```

### 4. React Fast Refresh
```typescript
it('should preserve state on component change', async () => {
  // Render component with state
  // Modify component code
  // Verify state is preserved after refresh
});
```

## Integration with Project

For ApoloShop Next.js project:

```typescript
// Test HMR with Next.js dev server
describe('Next.js Dev Server', () => {
  it('should hot reload pages', async () => {
    // Modify page component
    // Verify changes appear without losing client state
  });

  it('should hot reload API routes', async () => {
    // Modify API route
    // Verify new behavior on next request
  });
});
```

## Debugging

- Check dev server logs for HMR events
- Verify WebSocket connection is established
- Check for compilation errors in terminal
- Use browser DevTools to monitor network requests

## Resources

- [Next.js Fast Refresh](https://nextjs.org/docs/architecture/fast-refresh)
- [Vite HMR](https://vite.dev/guide/api-hmr.html)
- [Bun Dev Server](https://bun.sh/docs/bundler)
