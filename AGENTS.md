# AGENTS.md

Instructions for AI coding agents working on the MetaMask Accounts Monorepo.

## Agent Instructions Summary

**Project Type:** TypeScript monorepo for keyring implementations, accounts and hardware wallets management  
**Languages:** TypeScript (required for all code)  
**Testing:** Jest (unit tests)  
**Build System:** ts-bridge, Yarn workspaces  
**Package Manager:** Yarn 4.5.0 (managed by Corepack)

### Critical Rules for Agents

1. **ALWAYS use TypeScript** - No JavaScript files for new code
2. **ALWAYS run `yarn lint:fix`** before completing work
3. **ALWAYS colocate tests** with source files (`.test.ts`)
4. **ALWAYS run tests** after making changes: `yarn test`
5. **ALWAYS update CHANGELOGs** when modifying package behavior
6. **NEVER use `any` type** - Use proper TypeScript types (`@typescript-eslint/no-explicit-any` is enforced)
7. **NEVER modify git config** or run destructive git operations
8. **NEVER commit** unless explicitly requested by user

### Comprehensive Guidelines Location

This file provides comprehensive coding standards. For specific areas, see:

- Architecture: [README.md](./README.md) - Package structure and dependency graph
- Release process: [docs/how-to-release.md](./docs/how-to-release.md)
- Package documentation: Each package has its own README in `packages/*/README.md`

---

## Quick Setup

### Prerequisites

- **Node.js 18.18+ or 20+** (use `nvm use` to auto-select from `.nvmrc`)
- **Yarn** (managed by Corepack, included with Node.js)

### First-Time Setup

```bash
# 1. Enable Corepack (manages Yarn)
corepack enable

# 2. Install dependencies
yarn install

# 3. Build all packages
yarn build

# 4. Run tests to verify setup
yarn test
```

### Common Setup Issues

| Problem | Solution |
|---------|----------|
| `command not found: yarn` | Run `corepack enable` |
| Build fails with type errors | Run `yarn build:clean` |
| Tests fail after setup | Ensure all dependencies installed: `yarn install` |
| Circular dependency warnings | Run `yarn lint:dependencies:fix` |

---

## Common Commands

### Building

```bash
# Build all packages
yarn build

# Clean build (removes previous build artifacts)
yarn build:clean

# Build documentation for all packages
yarn build:docs
```

**Build System Notes:**
- Uses `ts-bridge` for TypeScript compilation
- Build outputs go to each package's `dist/` directory
- Source maps are generated for debugging

### Testing

```bash
# Run all tests
yarn test

# Run tests for specific package
cd packages/keyring-api
yarn test

# Run tests in watch mode (for development)
yarn test --watch

# Run tests with coverage
yarn test --coverage

# Clean test artifacts
yarn test:clean
```

**Testing Notes:**
- Tests must be colocated with source files (e.g., `file.ts` → `file.test.ts`)
- Uses Jest as test runner
- Coverage reports in `coverage/` directory of each package
- Test files use `.test.ts` extension (not `.spec.ts`)

### Linting & Formatting

```bash
# Run all linters
yarn lint

# Auto-fix all issues
yarn lint:fix

# Individual linters
yarn lint:eslint          # ESLint only
yarn lint:misc --check    # Prettier for JSON/MD/YAML
yarn lint:dependencies    # Check dependency issues
yarn lint:readme          # Verify README is up to date

# Fix specific issues
yarn lint:dependencies:fix  # Fix dependency issues
yarn lint:misc --write      # Auto-fix formatting
```

**Linting Notes:**
- ESLint config extends `@metamask/eslint-config`
- TypeScript-specific rules in `.eslintrc.js`
- No `any` types allowed (enforced by linter)
- Prettier for consistent formatting

### Dependency Management

```bash
# Add dependency to specific package
cd packages/keyring-api
yarn add some-package

# Add dev dependency to root
yarn add -D some-dev-package -W

# Check for dependency issues
yarn lint:dependencies

# Fix dependency mismatches and duplicates
yarn lint:dependencies:fix

# Deduplicate yarn.lock
yarn dedupe
```

**Dependency Notes:**
- Use workspace protocol for internal dependencies: `"@metamask/keyring-api": "workspace:^"`
- Run `yarn lint:dependencies:fix` after adding/updating packages
- Check `syncpack` for version consistency across packages

---

## Common Agent Workflows

### Workflow: Adding a New Feature

```bash
# 1. Identify the package to modify
cd packages/keyring-snap-bridge  # or relevant package

# 2. Create new files (MUST be TypeScript)
# - Implementation: src/feature-name.ts
# - Types: src/feature-name.types.ts (if needed)
# - Tests: src/feature-name.test.ts

# 3. Implement the feature following patterns below

# 4. Run tests
yarn test

# 5. Lint and fix issues
yarn lint:fix

# 6. Build to verify no type errors
yarn build

# 7. Update CHANGELOG.md with your changes
# Add entry under "Unreleased" section
```

### Workflow: Modifying Existing Code

```bash
# 1. Locate the file to modify
# Use grep or file search to find relevant code

# 2. Read the test file to understand behavior
# Tests are colocated: file.ts → file.test.ts

# 3. Make changes

# 4. Update tests if behavior changed
# Ensure tests reflect new expected behavior

# 5. Run tests for the package
cd packages/package-name
yarn test

# 6. Lint changes
yarn lint:fix

# 7. Build to verify types
yarn build
```

### Workflow: Fixing a Bug

```bash
# 1. Write a failing test that reproduces the bug
# Add test to existing .test.ts file

# 2. Run test to confirm it fails
yarn test path/to/file.test.ts

# 3. Fix the bug in source code

# 4. Run test again to confirm fix
yarn test path/to/file.test.ts

# 5. Run all tests for the package
yarn test

# 6. Lint changes
yarn lint:fix

# 7. Update CHANGELOG.md with bug fix entry
```

### Workflow: Adding a New Package

```bash
# 1. Create package directory
mkdir -p packages/new-package/src

# 2. Copy package.json from similar package and modify
# Set name, version, description, dependencies

# 3. Create tsconfig.json and tsconfig.build.json
# Base on existing packages

# 4. Create jest.config.js
# Use jest.config.packages.js as base

# 5. Add README.md with usage instructions

# 6. Implement code in src/

# 7. Add package to root tsconfig.json references

# 8. Build and test
yarn build
yarn test

# 9. Update root README.md
yarn readme:update
```

### Workflow: Releasing Packages

```bash
# 1. Start release process
yarn release

# 2. Editor opens with release spec
# Select packages and version bump (major/minor/patch)

# 3. Update each package's CHANGELOG.md
# Move entries from "Unreleased" to new version section
# Follow keepachangelog.com format

# 4. Commit changes with title: "release: x.y.z"
# This naming is CRITICAL for CI

# 5. Create PR named: "release: x.y.z"

# 6. After approval, merge to trigger release
```

---

## Project Structure

### High-Level Directory Layout

```
accounts/
├── packages/              # All packages (monorepo)
│   ├── keyring-api/      # Core API interfaces
│   ├── keyring-snap-bridge/  # Snap integration
│   ├── keyring-eth-hd/   # HD wallet implementation
│   ├── keyring-eth-simple/   # Simple keyring
│   ├── keyring-utils/    # Shared utilities
│   └── ...              # Other keyring packages
├── docs/                 # Documentation
├── scripts/              # Build and release scripts
├── jest.config.packages.js  # Shared Jest config
├── tsconfig.json         # Root TypeScript config
├── tsconfig.packages.json    # Packages TypeScript config
├── .eslintrc.js         # ESLint configuration
└── package.json         # Root package.json (workspace config)
```

### Dependency Graph

**The dependency relationships between packages are maintained in [README.md](./README.md) with a visual graph. Always run `yarn readme:update` when updating dependencies to keep this graph current.**

**Core Packages:**
- `keyring-api` - Core interfaces
- `keyring-utils` - Shared utilities

**Implementation Packages:**
- `keyring-eth-hd` - HD wallet implementation
- `keyring-eth-simple` - Simple keyring implementation
- `keyring-eth-trezor` - Trezor hardware wallet integration
- `keyring-eth-ledger-bridge` - Ledger hardware wallet integration
- `keyring-eth-qr` - QR code keyring for air-gapped signing

**Snap Packages:**
- `keyring-snap-bridge` - Snap keyring bridge for MetaMask Snaps
- `keyring-snap-client` - Client library for snap communication
- `keyring-snap-sdk` - SDK for building keyring Snaps
- `keyring-internal-api` - Internal APIs for keyring communication
- `keyring-internal-snap-client` - Internal snap client implementation

**Account API:**
- `account-api` - Account abstractions and utilities

### Finding Specific Code

| Feature | Location |
|---------|----------|
| Core keyring interfaces | `packages/keyring-api/src/api/` |
| Ethereum-specific methods | `packages/keyring-api/src/eth/` |
| Bitcoin methods | `packages/keyring-api/src/btc/` |
| Solana methods | `packages/keyring-api/src/sol/` |
| Snap integration | `packages/keyring-snap-bridge/src/` |
| Utility functions | `packages/keyring-utils/src/` |
| Type definitions | Each package's `src/*.types.ts` or `src/types.ts` |

### Architecture Patterns

**Keyring Implementations:**
- Implement the `Keyring` interface from `@metamask/keyring-api`
- Methods for account management: `getAccounts()`, `addAccounts()`, etc.
- Methods for signing: `signTransaction()`, `signMessage()`, etc.
- State serialization: `serialize()` and `deserialize()`
- Type property to identify keyring type

**Type Definitions:**
- Use strict TypeScript types (no `any`)
- Export types and interfaces from separate files when complex
- Use JSDoc comments for public APIs
- Leverage TypeScript utility types (`Partial`, `Required`, `Pick`, etc.)

**Testing:**
- Tests colocated with source: `file.ts` → `file.test.ts`
- Use `describe` blocks to organize by class/function
- Use `it` blocks for individual test cases (not `test`)
- Use present tense in test descriptions (not "should")
- Mock external dependencies
- Aim for high coverage (>80%)

### File Modification Patterns

When you modify certain files, you typically need to update related files:

**When modifying a package's main export:**
```
packages/foo/src/FooKeyring.ts → ALSO UPDATE:
├── packages/foo/src/FooKeyring.test.ts (tests)
├── packages/foo/src/index.ts (if exports changed)
├── packages/foo/CHANGELOG.md (document changes)
└── packages/foo/README.md (if API changed)
```

**When adding a new file to a package:**
```
packages/foo/src/new-feature.ts → ALSO CREATE:
├── packages/foo/src/new-feature.test.ts (tests)
├── packages/foo/src/new-feature.types.ts (if types are complex)
└── Update packages/foo/src/index.ts (add export)
```

**When changing exported types:**
```
packages/foo/src/types.ts → CHECK:
├── All packages that depend on this package
├── Update type imports if signature changed
└── packages/foo/CHANGELOG.md (document breaking changes)
```

**When adding/removing dependencies:**
```
packages/foo/package.json → MUST RUN:
├── yarn install (update lockfile)
├── yarn lint:dependencies:fix (sync versions)
└── yarn build (verify no build errors)
```

---

## TypeScript Guidelines

### Naming Conventions

```typescript
// ✅ CORRECT: Enums use singular names (not plural)
enum EthMethod {
  SignTransaction = 'eth_signTransaction',
  PersonalSign = 'personal_sign',
}

enum AccountType {
  Eoa = 'eoa',
  Erc4337 = 'erc4337',
}

// ❌ WRONG: Plural enum names
enum EthMethods {  // Don't use plural
  SignTransaction = 'eth_signTransaction',
}

enum AccountTypes {  // Don't use plural
  Eoa = 'eoa',
}

// ✅ CORRECT: Interfaces and types use PascalCase
interface KeyringAccount { /* ... */ }
type AccountId = string;

// ✅ CORRECT: Functions and variables use camelCase
function getAccountById(id: string): KeyringAccount { /* ... */ }
const accountList: KeyringAccount[] = [];

// ✅ CORRECT: Constants use SCREAMING_SNAKE_CASE or camelCase
const SNAP_KEYRING_TYPE = 'Snap Keyring';
const defaultOptions = { /* ... */ };

// ✅ CORRECT: Private class members use # prefix
class SnapKeyring {
  readonly #messenger: SnapKeyringMessenger;
  readonly #accounts: SnapIdMap<Account>;
}
```

### Type Safety

```typescript
// ✅ CORRECT: Explicit types, no any
interface UserAccount {
  id: string;
  address: string;
  balance: bigint;
}

function getAccount(id: string): UserAccount {
  // Implementation
}

// ❌ WRONG: Using any
function getAccount(id: any): any {
  // Don't do this - any is not allowed
}
```

### Exported Types

```typescript
// ✅ CORRECT: Export types from separate namespace
export type KeyringAccount = {
  id: string;
  address: string;
  options: Record<string, Json>;
  methods: string[];
  type: string;
};

export type KeyringRequest = {
  id: string;
  account: string;
  scope: string;
  request: JsonRpcRequest;
};

// ✅ CORRECT: Use type exports for type-only exports
export type { SomeType } from './types';
```

### JSDoc Comments

```typescript
/**
 * Create a new account in the keyring.
 *
 * @param options - Account creation options.
 * @param options.type - Type of account to create.
 * @param options.index - Account index for HD derivation.
 * @returns The newly created account.
 * @throws If account creation fails.
 */
async function createAccount(options: {
  type: string;
  index?: number;
}): Promise<KeyringAccount> {
  // Implementation
}
```

### Error Handling

```typescript
// ✅ CORRECT: Specific error types
export class KeyringError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KeyringError';
  }
}

// ✅ CORRECT: Throw descriptive errors
if (!account) {
  throw new KeyringError(`Account '${accountId}' not found`);
}

// ✅ CORRECT: Handle errors in async code
try {
  await snapClient.submitRequest(request);
} catch (error) {
  log('Snap request failed:', error);
  throw new KeyringError(`Failed to submit request: ${error.message}`);
}
```

---

## Testing Guidelines

### Test Structure

```typescript
// ✅ CORRECT: Organize with describe blocks
describe('SnapKeyring', () => {
  describe('constructor', () => {
    it('initializes correctly', () => {
      const keyring = new SnapKeyring({ messenger, callbacks });
      expect(keyring.type).toBe('Snap Keyring');
    });
  });

  describe('getAccounts', () => {
    it('returns empty array when no accounts exist', async () => {
      const accounts = await keyring.getAccounts();
      expect(accounts).toStrictEqual([]);
    });

    it('returns all account addresses', async () => {
      // Setup
      await keyring.addAccount(account1);
      await keyring.addAccount(account2);

      // Execute
      const accounts = await keyring.getAccounts();

      // Assert
      expect(accounts).toHaveLength(2);
      expect(accounts).toContain(account1.address);
      expect(accounts).toContain(account2.address);
    });
  });
});
```

### Test Naming

```typescript
// ✅ CORRECT: Present tense, descriptive
it('throws error when account does not exist', () => {
  // Test implementation
});

it('returns account by address', async () => {
  // Test implementation
});

// ❌ WRONG: Using "should"
it('should throw an error', () => {
  // Don't use "should"
});

// ❌ WRONG: Too vague
it('works correctly', () => {
  // Not descriptive enough
});
```

### Mocking

```typescript
// ✅ CORRECT: Mock external dependencies
const mockMessenger = {
  call: jest.fn(),
  publish: jest.fn(),
};

const mockCallbacks = {
  saveState: jest.fn(),
  addressExists: jest.fn().mockResolvedValue(false),
};

// ✅ CORRECT: Verify mock calls
expect(mockCallbacks.saveState).toHaveBeenCalledTimes(1);
expect(mockMessenger.call).toHaveBeenCalledWith(
  'SnapController:handleRequest',
  expect.objectContaining({
    snapId: 'local:snap.mock',
  })
);
```

### Async Testing

```typescript
// ✅ CORRECT: Use async/await in tests
it('creates account asynchronously', async () => {
  const account = await keyring.createAccount(snapId, {});
  expect(account).toBeDefined();
  expect(account.id).toBeTruthy();
});

// ✅ CORRECT: Test error cases
it('throws error when creation fails', async () => {
  await expect(
    keyring.createAccount(snapId, { invalid: true })
  ).rejects.toThrow('Invalid account options');
});
```

### Setup Function Pattern

For complex test suites, use a `setup()` function to create test fixtures with configurable options.
This pattern improves test readability and reduces boilerplate:

```typescript
/* eslint-disable @typescript-eslint/naming-convention */

// ✅ CORRECT: Setup function with configurable options and typed return
function setup({
  capabilities = { scopes: [EthScope.Eoa] },
}: {
  capabilities?: KeyringCapabilities;
} = {}): {
  messenger: RootMessenger;
  keyring: SnapKeyringV2;
  mocks: {
    // ✅ CORRECT: Use PascalCase for mocks that match existing class names
    SnapKeyring: { serialize: jest.Mock; deserialize: jest.Mock };
    SnapController: { handleRequest: jest.Mock };
  };
} {
  // Create mocks
  const mocks = {
    SnapKeyring: {
      serialize: jest.fn(),
      deserialize: jest.fn(),
    },
    SnapController: {
      handleRequest: jest.fn(),
    },
  };

  // Setup messenger
  const messenger = getRootMessenger();
  messenger.registerActionHandler(
    'SnapController:handleRequest',
    mocks.SnapController.handleRequest,
  );

  // Create instance under test
  const keyring = new SnapKeyringV2({
    capabilities,
    messenger,
    snapId: MOCK_SNAP_ID,
  });

  return { messenger, keyring, mocks };
}

// Usage in tests:
describe('SnapKeyringV2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('initializes correctly', () => {
      const { keyring } = setup();
      expect(keyring).toBeDefined();
    });

    it('uses custom capabilities', () => {
      const capabilities = { scopes: [EthScope.Testnet] };
      const { keyring } = setup({ capabilities });
      expect(keyring.capabilities).toBe(capabilities);
    });
  });

  describe('getAccounts', () => {
    it('fetches accounts from Snap', async () => {
      const { keyring, mocks } = setup();
      const mockAccounts = [createMockAccount('0x123')];
      mocks.SnapController.handleRequest.mockResolvedValue(mockAccounts);

      await keyring.init();
      const accounts = await keyring.getAccounts();

      expect(accounts).toHaveLength(1);
    });
  });
});
```

**Setup Function Best Practices:**
- Return an object with the instance under test, mocks, and any helpers
- Use default parameters for optional configuration
- Type the return value explicitly for better IDE support
- Create helper functions for common mock data (e.g., `createMockAccount()`)
- Call `jest.clearAllMocks()` in `beforeEach` to reset mock state
- Use PascalCase for mocks/spies matching existing class names (e.g., `SnapKeyring`, `SnapController`)
- Add `/* eslint-disable @typescript-eslint/naming-convention */` at the top of test files when using PascalCase mocks

### Coverage Goals

- **Unit tests:** >80% coverage for all packages
- **Critical paths:** >90% coverage (e.g., signing, account management)
- **Public APIs:** 100% coverage of exported functions

---

## Decision Trees

### Decision: Where to Put New Code?

```
IF creating a new keyring implementation:
  → packages/keyring-{type}/ (e.g., keyring-eth-hardware)

IF creating core API interfaces:
  → packages/keyring-api/src/api/

IF creating shared utilities:
  → packages/keyring-utils/src/

IF creating Snap-specific code:
  → packages/keyring-snap-bridge/src/ (integration)
  → packages/keyring-snap-sdk/src/ (SDK for Snap developers)
  → packages/keyring-snap-client/src/ (client library)

IF creating types used across packages:
  → packages/keyring-api/src/ (if core types)
  → packages/keyring-utils/src/ (if utility types)
```

### Decision: How to Handle Breaking Changes?

```
IF changing public API (exports, function signatures):
  → Document in CHANGELOG.md under "Breaking Changes"
  → Bump major version in next release
  → Consider adding migration guide in README

IF changing internal implementation only:
  → Document in CHANGELOG.md under "Changed"
  → Bump minor or patch version
  → No migration needed

IF deprecating functionality:
  → Mark as @deprecated in JSDoc
  → Document in CHANGELOG.md
  → Plan removal for next major version
```

---

## Agent Pre-Completion Checklist

Before completing your task, verify ALL of the following:

### Code Quality Checks

```bash
# 1. Run linter and auto-fix
yarn lint:fix

# 2. Verify no lint errors remain
yarn lint

# 3. Check TypeScript compilation
yarn build
```

### Testing Checks

```bash
# 1. Run tests for modified packages
cd packages/modified-package
yarn test

# 2. Run all tests if core changes
yarn test

# 3. Verify test coverage is adequate
# Check coverage/ directory for reports
```

### Documentation Checks

```
IF you created new public APIs:
  → Add JSDoc comments with @param and @returns
  → Update package README.md with usage examples

IF you changed behavior:
  → Update CHANGELOG.md under "Unreleased" section
  → Update relevant documentation in README files

IF you added/modified types:
  → Ensure types are exported from index.ts
  → Document complex types with comments
```

### Final Verification

```
✓ All new code is TypeScript (no .js files)
✓ Tests are colocated with source files
✓ All tests pass: yarn test
✓ All linting passes: yarn lint
✓ Build succeeds: yarn build
✓ No console.log or debug code remains
✓ JSDoc comments on public functions
✓ CHANGELOG.md updated (if applicable)
✓ README.md updated (if API changed)
✓ Dependencies properly declared in package.json
✓ No use of `any` type
✓ Error handling is comprehensive
✓ Mock external dependencies in tests
```

---

## Additional Resources

### Documentation

- **Main README:** [README.md](./README.md) - Overview and package list
- **Release Guide:** [docs/how-to-release.md](./docs/how-to-release.md)
- **Package READMEs:** Each package has documentation in `packages/*/README.md`

### Package-Specific Docs

- **Keyring API:** [packages/keyring-api/README.md](./packages/keyring-api/README.md)
- **Snap Bridge:** [packages/keyring-snap-bridge/README.md](./packages/keyring-snap-bridge/README.md)
- **Keyring Utils:** [packages/keyring-utils/README.md](./packages/keyring-utils/README.md)

### External Resources

- **MetaMask Contributor Docs:** https://github.com/MetaMask/contributor-docs
- **MetaMask Snaps:** https://docs.metamask.io/snaps/
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/handbook/intro.html
- **Jest Documentation:** https://jestjs.io/docs/getting-started

---

## Troubleshooting

### Build Issues

| Problem | Solution |
|---------|----------|
| Type errors in build | Run `yarn build:clean` to rebuild from scratch |
| Module not found | Run `yarn install` to ensure all deps installed |
| Circular dependency warnings | Check `packages/*/src/index.ts` exports |
| Build hangs | Check for infinite loops in type definitions |

### Test Issues

| Problem | Solution |
|---------|----------|
| Tests fail after changes | Check if test expectations need updating |
| Tests timeout | Increase timeout in jest.config.js |
| Coverage too low | Add tests for uncovered code paths |
| Mock not working | Verify mock is called before test assertion |

### Development Issues

| Problem | Solution |
|---------|----------|
| ESLint errors | Run `yarn lint:fix` to auto-fix |
| Type errors | Check imported types are exported correctly |
| Dependency version mismatch | Run `yarn lint:dependencies:fix` |
| Yarn lockfile conflicts | Run `yarn dedupe` |

### Common Error Messages

**"@typescript-eslint/no-explicit-any: Unexpected any"**
- Solution: Replace `any` with proper type (string, number, Json, unknown, etc.)

**"Cannot find module '@metamask/...'"**
- Solution: Add dependency to package.json and run `yarn install`

**"Circular dependency detected"**
- Solution: Refactor imports to avoid circular references, use type-only imports if needed

**"Test suite failed to run"**
- Solution: Check jest.config.js configuration, ensure test file has `.test.ts` extension

---

## Summary for Quick Reference

**Key Commands:**
```bash
yarn install        # Install dependencies
yarn build          # Build all packages
yarn test           # Run all tests
yarn lint:fix       # Fix linting issues
yarn release        # Start release process
```

**Key Principles:**
1. TypeScript only, no `any` types
2. Tests colocated with source
3. High test coverage (>80%)
4. JSDoc comments on public APIs
5. Update CHANGELOGs for user-facing changes
6. Follow existing patterns in codebase

**Before Committing:**
- [ ] `yarn lint:fix` passes
- [ ] `yarn test` passes  
- [ ] `yarn build` succeeds
- [ ] CHANGELOG.md updated
- [ ] Tests added/updated
- [ ] Documentation updated

---

*This document is intended to help AI coding agents understand the codebase structure, patterns, and workflows. For human developers, please also refer to the package-specific README files and MetaMask contributor documentation.*
