# GreenShoe Implementation Guide

## Clean Implementation Workflow

This guide ensures every task is implemented with proper testing, code review, and quality gates.

---

## Core Principles

1. **Spec-Driven Development** - The spec is the source of truth
2. **Test Before Ship** - Every acceptance criterion must have a passing test
3. **Review Before Merge** - All code reviewed against the spec
4. **One Task at a Time** - Complete, test, review, then move on
5. **Quality Gates** - No shortcuts, no skipped steps

---

## Implementation Cycle (Per Task)

### Step 1: Understand the Task
```bash
# Review the task in the implementation plan
# Read specs/internal-staging-tool-plan.md, find your task

# Note down:
# - Spec references (which requirements this implements)
# - Acceptance criteria (what success looks like)
# - Dependencies (what must exist first)
# - Agent to use (which specialized agent handles this)
```

### Step 2: Implement with Specialized Agent
```bash
# Use the appropriate agent from .claude/agents/

# Backend work
> Use the backend-engineer agent to implement Task 5: User authentication

# Frontend work
> Use the frontend-engineer agent to implement Task 12: Site management UI

# Database work
> Use the database-specialist agent to implement Task 2: Database schema

# Security work
> Use the security-specialist agent to review credential encryption in Task 7

# Crawling work
> Use the crawler-specialist agent to implement Task 14: File sync service

# Infrastructure
> Use the devops-infra agent to configure Nginx and SSL
```

### Step 3: Write Tests (TDD Approach)
```bash
# BEFORE or DURING implementation, write tests

# Backend tests (in backend/tests/)
cd backend
npm test -- --watch

# Frontend tests (in frontend/tests/)
cd frontend
npm test -- --watch

# Test structure:
# - Unit tests for services/utilities
# - Integration tests for API endpoints
# - Component tests for UI
```

**Test Requirements:**
- Every acceptance criterion must have a test
- Tests must be independent (no shared state)
- Tests must be deterministic (no flaky tests)
- Mock external dependencies (SFTP, databases in unit tests)

### Step 4: Run Quality Checks
```bash
# Backend
cd backend
npm run lint          # ESLint
npm run type-check    # TypeScript (if using TS)
npm test              # All tests must pass
npm run build         # Must build successfully

# Frontend
cd frontend
npm run lint          # ESLint
npm run type-check    # TypeScript
npm test              # All tests must pass
npm run build         # Production build must succeed
```

### Step 5: Code Review Against Spec
```bash
# Use the /review command
> /review specs/internal-staging-tool.md backend/src/services/auth/

# Or use the reviewer agent explicitly
> Use the reviewer agent to review the authentication implementation in backend/src/services/auth/ against Task 5 requirements

# Review checklist:
# ✓ All acceptance criteria met
# ✓ Spec requirements implemented correctly
# ✓ No security vulnerabilities
# ✓ Error handling present
# ✓ Code follows existing patterns
# ✓ No over-engineering
# ✓ Tests verify all acceptance criteria
```

### Step 6: Manual Verification
```bash
# Start the application
docker-compose up -d           # Start databases
cd backend && npm run dev      # Start backend
cd frontend && npm run dev     # Start frontend

# Manually test the feature:
# - Happy path works
# - Error cases handled gracefully
# - UI feedback is clear
# - Performance is acceptable
```

### Step 7: Update Documentation
```bash
# If task changes behavior or adds features:
# - Update README.md if user-facing
# - Update CLAUDE.md if affects development workflow
# - Add JSDoc/comments for complex logic (only where needed)
# - Update API documentation (if exists)
```

### Step 8: Commit with Task Reference
```bash
git add .
git commit -m "Task 5: Implement user authentication

- Add JWT token generation and verification
- Add bcrypt password hashing
- Create auth middleware for protected routes
- Add login and register endpoints
- Tests verify A15 and A16 acceptance criteria

Spec: specs/internal-staging-tool.md (R28, R33)"
```

### Step 9: Mark Complete in Plan
```bash
# Update the verification checklist in the implementation plan
# Check off completed items:
# ✓ Login returns JWT token
# ✓ Invalid credentials return 401
# ✓ Token verification works
# ✓ Tests pass
```

---

## Testing Strategy by Layer

### Backend Testing

#### Unit Tests (backend/tests/unit/)
```javascript
// Example: backend/tests/unit/services/auth.test.js
describe('AuthService', () => {
  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const hashed = await authService.hashPassword('password123');
      expect(hashed).not.toBe('password123');
      expect(hashed.length).toBeGreaterThan(20);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const hash = await authService.hashPassword('password123');
      const valid = await authService.verifyPassword('password123', hash);
      expect(valid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const hash = await authService.hashPassword('password123');
      const valid = await authService.verifyPassword('wrongpassword', hash);
      expect(valid).toBe(false);
    });
  });
});
```

#### Integration Tests (backend/tests/integration/)
```javascript
// Example: backend/tests/integration/api/auth.test.js
describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await db.migrate.latest();
    await db.seed.run();
  });

  afterEach(async () => {
    await db.migrate.rollback();
  });

  it('should return JWT token for valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe('string');
  });

  it('should return 401 for invalid credentials (A15)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });
});
```

#### Job Tests (backend/tests/jobs/)
```javascript
// Example: backend/tests/jobs/pull.test.js
describe('Pull Job', () => {
  it('should complete pull for WordPress site (A3)', async () => {
    const job = await pullQueue.add({
      siteId: 'test-wp-site',
      userId: 'test-user'
    });

    await job.finished();

    const site = await db('sites').where({ id: 'test-wp-site' }).first();
    expect(site.status).toBe('active');
    expect(site.last_pulled_at).toBeDefined();
  });

  it('should timeout and cleanup after 30 minutes (A26)', async () => {
    // Mock a slow operation
    jest.useFakeTimers();

    const job = await pullQueue.add({ siteId: 'large-site' });

    jest.advanceTimersByTime(30 * 60 * 1000); // 30 minutes

    await expect(job.finished()).rejects.toThrow('Job timeout');

    // Verify cleanup happened
    const files = await fs.readdir(`/staging/large-site/files`);
    expect(files.length).toBe(0);
  });
});
```

### Frontend Testing

#### Component Tests (frontend/tests/components/)
```javascript
// Example: frontend/tests/components/PullButton.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PullButton } from '@/components/operations/PullButton';

describe('PullButton', () => {
  it('should trigger pull on click', async () => {
    const mockPull = jest.fn();
    render(<PullButton siteId="test-site" onPull={mockPull} />);

    const button = screen.getByText('Pull from Live');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockPull).toHaveBeenCalledWith('test-site');
    });
  });

  it('should show progress during pull (A6)', async () => {
    render(<PullButton siteId="test-site" status="pulling" progress={45} />);

    expect(screen.getByText('Pulling...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '45');
  });

  it('should be disabled during pull', () => {
    render(<PullButton siteId="test-site" status="pulling" />);

    const button = screen.getByText('Pulling...');
    expect(button).toBeDisabled();
  });
});
```

#### Integration Tests (frontend/tests/integration/)
```javascript
// Example: frontend/tests/integration/SiteManagement.test.jsx
describe('Site Management Flow', () => {
  it('should add, list, and delete a site (A1)', async () => {
    render(<App />);

    // Navigate to sites page
    fireEvent.click(screen.getByText('Sites'));

    // Add site
    fireEvent.click(screen.getByText('Add Site'));
    fireEvent.change(screen.getByLabelText('Site Name'), {
      target: { value: 'Test Site' }
    });
    fireEvent.change(screen.getByLabelText('Live URL'), {
      target: { value: 'https://example.com' }
    });
    fireEvent.click(screen.getByText('Save'));

    // Verify site appears
    await waitFor(() => {
      expect(screen.getByText('Test Site')).toBeInTheDocument();
    });

    // Delete site
    fireEvent.click(screen.getByLabelText('Delete Test Site'));
    fireEvent.click(screen.getByText('Confirm'));

    // Verify site removed
    await waitFor(() => {
      expect(screen.queryByText('Test Site')).not.toBeInTheDocument();
    });
  });
});
```

### End-to-End Tests (Task 39)
```javascript
// Example: tests/e2e/pull-push-flow.test.js
describe('Full Pull-Push Flow', () => {
  it('should pull WordPress site, edit, and push back (A3, A7)', async () => {
    // 1. Add site
    await addSite({
      name: 'Test WP Site',
      url: 'https://test-wp.example.com',
      credentials: { /* ... */ }
    });

    // 2. Pull from live
    await clickPull('Test WP Site');
    await waitForStatus('active', 30000);

    // 3. Verify staging accessible
    const stagingResponse = await fetch('https://staging.yourdomain.com/test-wp-site');
    expect(stagingResponse.ok).toBe(true);

    // 4. Download, edit, upload
    await downloadStaging('Test WP Site');
    // ... edit files locally ...
    await uploadStaging('Test WP Site', editedZip);

    // 5. Push to live
    await clickPush('Test WP Site');
    await waitForStatus('active', 30000);

    // 6. Verify live updated
    const liveResponse = await fetch('https://test-wp.example.com');
    const liveHtml = await liveResponse.text();
    expect(liveHtml).toContain('EDITED CONTENT');
  });
});
```

---

## Code Review Process

### Using the /review Command
```bash
# Review specific files against spec
> /review specs/internal-staging-tool.md backend/src/services/auth/authService.js

# Review entire feature
> /review specs/internal-staging-tool.md backend/src/api/routes/sites.js backend/src/services/sync/
```

### Using the Reviewer Agent
```bash
> Use the reviewer agent to perform a security review of the credential encryption implementation

> Use the reviewer agent to verify Task 17 (Pull job) meets all acceptance criteria A3, A4, A5, A6, and A26
```

### Manual Review Checklist

**Functionality**
- [ ] All acceptance criteria met
- [ ] Spec requirements fully implemented
- [ ] Edge cases handled
- [ ] Error messages are clear and helpful

**Security**
- [ ] No credentials in logs (checked by security-specialist)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevented
- [ ] Path traversal prevented
- [ ] Authentication enforced
- [ ] Authorization (RBAC) enforced
- [ ] Encryption used where specified

**Code Quality**
- [ ] Follows existing patterns in codebase
- [ ] No code duplication (DRY)
- [ ] Functions are single-purpose
- [ ] Naming is clear and consistent
- [ ] No magic numbers/strings
- [ ] Comments only where logic is complex

**Testing**
- [ ] All acceptance criteria have tests
- [ ] Tests are independent
- [ ] Tests are deterministic
- [ ] Mocks used appropriately
- [ ] Test coverage >80% for critical paths

**Performance**
- [ ] No N+1 queries
- [ ] Database indexes on foreign keys
- [ ] Large files streamed, not loaded to memory
- [ ] Timeouts configured

**Over-Engineering Check**
- [ ] No unnecessary abstractions
- [ ] No premature optimization
- [ ] No features beyond spec
- [ ] No unused code

---

## Phase-by-Phase Strategy

### Phase 1: Project Setup (Tasks 1-4)
**Goal:** Working foundation with databases

```bash
# Task 1: Project structure
> Use the backend-engineer agent to initialize the project structure per Task 1

# Verify:
npm install works in both directories
docker-compose up starts PostgreSQL and Redis
```

**Quality Gates:**
- [ ] All dependencies install without errors
- [ ] Docker containers start successfully
- [ ] Health check endpoint returns 200
- [ ] Database migrations run

**Testing:** Infrastructure tests only (connection checks)

---

### Phase 2: Authentication & Security (Tasks 5-8)
**Goal:** Secure authentication and authorization

```bash
# Task 5: Backend auth
> Use the backend-engineer agent to implement Task 5: User authentication backend

# Task 6: RBAC
> Use the security-specialist agent to implement and review Task 6: Role-based access control

# Task 7: Encryption
> Use the security-specialist agent to implement Task 7: Credential encryption service

# Task 8: Frontend auth
> Use the frontend-engineer agent to implement Task 8: User authentication frontend
```

**Quality Gates:**
- [ ] All auth tests pass
- [ ] RBAC tests verify all 3 roles (A11, A15, A16)
- [ ] Encryption tests verify A19, A20
- [ ] Security review passed
- [ ] No plaintext credentials in any logs

**Testing:**
- Unit tests for password hashing, JWT generation
- Integration tests for login/register endpoints
- RBAC permission matrix tests
- Encryption round-trip tests

**Critical Review:** Security-specialist must review before Phase 3

---

### Phase 3: Site Management (Tasks 9-13)
**Goal:** CRUD operations for client sites

```bash
> Use the backend-engineer agent to implement Task 9: Site CRUD backend
> Use the frontend-engineer agent to implement Task 12: Site management UI
```

**Quality Gates:**
- [ ] Site creation encrypts credentials (A1)
- [ ] WordPress validation works (A2)
- [ ] Platform detection accurate (A3, A4)
- [ ] UI shows all sites with status (A1, A6)

**Testing:**
- API integration tests for all CRUD operations
- UI component tests for forms and modals
- Platform detection unit tests

---

### Phase 4: Pull System (Tasks 14-19)
**Goal:** Pull client sites to staging

```bash
> Use the crawler-specialist agent to implement Task 14: File sync service
> Use the backend-engineer agent to implement Task 15: Database clone service
> Use the crawler-specialist agent to implement Task 16: URL rewriting service
> Use the backend-engineer agent to implement Task 17: Pull job implementation
> Use the frontend-engineer agent to implement Task 19: Pull UI
```

**Quality Gates:**
- [ ] WordPress pull works end-to-end (A3)
- [ ] Static HTML pull works end-to-end (A4)
- [ ] Credentials validated (A5)
- [ ] Progress bar updates (A6)
- [ ] 2GB limit enforced (A25)
- [ ] 30-minute timeout works (A26)

**Testing:**
- File sync unit tests with mock SFTP
- Database clone tests with test MySQL
- URL rewriting tests (including serialized PHP data)
- Pull job integration test (end-to-end)
- Timeout handling test

**Critical Review:**
- Crawler-specialist reviews file sync and URL rewriting
- Tester runs manual test with real WordPress site

---

### Phase 5: Push System (Tasks 20-25)
**Goal:** Push staging changes to live with rollback

```bash
> Use the backend-engineer agent to implement Task 23: Push job with rollback
> Use the frontend-engineer agent to implement Task 25: Push UI
```

**Quality Gates:**
- [ ] Push completes successfully (A7)
- [ ] Live change detection works (A8)
- [ ] Confirmation modal shows (A9)
- [ ] Rollback restores live site (A10)
- [ ] Developer cannot push (A11)

**Testing:**
- Push job integration test
- Rollback simulation test (force failure)
- RBAC permission test for push
- Change detection unit test

**Critical Testing:**
- Test rollback with intentional failure
- Verify live site restored correctly

---

### Phase 6-10: Continue Similarly
Each phase follows the same cycle:
1. Implement with appropriate agent
2. Write tests for acceptance criteria
3. Run quality checks
4. Code review with reviewer agent
5. Manual verification
6. Mark complete

---

## Quality Gates by Phase

### Phase 1-2: Foundation ✓
- All tests pass
- Security review complete
- Docker environment stable

### Phase 3: Site Management ✓
- CRUD operations work
- Platform detection accurate
- UI functional

### Phase 4: Pull System ✓
- WordPress pull works end-to-end
- Static HTML pull works end-to-end
- Rollback tested and verified

### Phase 5: Push System ✓
- Push works end-to-end
- Rollback restores correctly
- All RBAC rules enforced

### Phase 8: Integration Testing ✓ (Task 39)
- Full pull-edit-push flow tested
- All acceptance criteria verified
- Performance benchmarks met

### Phase 10: Production Ready ✓
- All 51 acceptance criteria passing
- Security audit complete
- Documentation complete

---

## Continuous Integration Setup (Optional but Recommended)

### GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Run migrations
        working-directory: ./backend
        run: npm run migrate

      - name: Run tests
        working-directory: ./backend
        run: npm test

      - name: Lint
        working-directory: ./backend
        run: npm run lint

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Run tests
        working-directory: ./frontend
        run: npm test

      - name: Lint
        working-directory: ./frontend
        run: npm run lint

      - name: Build
        working-directory: ./frontend
        run: npm run build
```

---

## Progress Tracking

### Task Progress Board

Create `PROGRESS.md`:

```markdown
# GreenShoe Implementation Progress

## Phase 1: Project Setup
- [x] Task 1: Initialize project structure
- [x] Task 2: Database schema
- [x] Task 3: Backend scaffolding
- [x] Task 4: Frontend scaffolding

## Phase 2: Authentication & Security
- [x] Task 5: User authentication - Backend
- [x] Task 6: Role-based access control
- [x] Task 7: Credential encryption service
- [ ] Task 8: User authentication - Frontend (IN PROGRESS)

## Phase 3: Site Management
- [ ] Task 9: Site CRUD - Backend
- [ ] Task 10: Platform detection service
...
```

### Daily Log

Keep a simple log of what was done:
```markdown
## 2026-01-27
- Completed Task 5: User authentication backend
- All tests passing (12/12)
- Security review passed
- Next: Task 6 (RBAC)

## 2026-01-28
- Completed Task 6: RBAC middleware
- Added permission matrix tests (15/15 passing)
- Reviewer agent verified against spec
- Next: Task 7 (Encryption)
```

---

## Tools and Automation

### Pre-commit Hooks (Husky)
```bash
# Install husky
npm install --save-dev husky lint-staged

# Setup pre-commit hook
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

```json
// package.json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

### Linting Configuration
```json
// .eslintrc.json
{
  "extends": ["eslint:recommended", "plugin:react/recommended"],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error",
    "eqeqeq": "error",
    "no-var": "error",
    "prefer-const": "error"
  }
}
```

---

## When Things Go Wrong

### Test Failures
1. Read the error message carefully
2. Reproduce the failure manually
3. Fix the code or fix the test (whichever is wrong)
4. Verify all tests pass before moving on

### Spec Ambiguity
1. Document the question
2. Make a reasonable assumption
3. Add comment to code explaining assumption
4. Continue implementation
5. Flag for review

### Blocked on External Dependencies
1. Use mocks/stubs for now
2. Document the dependency
3. Continue with other tasks
4. Circle back when dependency available

---

## Summary: The Implementation Loop

```
For each task:

1. READ spec reference and acceptance criteria
2. SELECT appropriate agent
3. IMPLEMENT with TDD approach
4. WRITE tests for all acceptance criteria
5. RUN quality checks (lint, build, tests)
6. REVIEW code against spec (use /review or reviewer agent)
7. VERIFY manually in running app
8. COMMIT with task reference
9. MARK complete in progress tracker

Every 5 tasks: INTEGRATION TEST
Every phase: SECURITY REVIEW
Every milestone: FULL E2E TEST
```

---

**Remember:** No shortcuts. Quality over speed. Spec is truth. Tests verify. Review ensures.

Now you're ready to build GreenShoe the right way. Start with:

```bash
> Use the backend-engineer agent to implement Task 1: Initialize project structure
```
