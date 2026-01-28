# GreenShoe

> Internal agency platform for managing client website staging and deployments.

**GreenShoe** is an internal web-based tool that allows the agency to pull any client website, convert it to static HTML, edit with Claude Code, get client approval, and deploy changes back to live.

## What It Does

1. **Pull** - Crawl any client website and convert to static HTML
2. **Edit** - Make changes with Claude Code locally
3. **Review** - Client views staging and provides feedback
4. **Push** - Deploy approved changes to live with automatic backup
5. **Rollback** - Automatically restore if something goes wrong

## Key Features

- **Any website** - Pull from WordPress, Shopify, custom sites, anything
- **Static conversion** - All sites converted to static HTML for easy management
- **Claude Code editing** - Download, edit locally with AI, upload back
- **Automatic backups** - Every push creates a backup before modifying live
- **Auto-rollback** - Failed pushes automatically restore the live site
- **Version history** - Keep last 5 versions per site for recovery
- **Role-based access** - Developers edit, PMs deploy, Admins manage
- **Secure credentials** - AES-256 encryption for all stored credentials
- **Diff view** - See exactly what changed before pushing (added/modified/deleted)
- **Partial push** - Push only selected files instead of the entire site
- **Scheduled backups** - Automatic daily/weekly backups of live sites

## Supported Source Sites

| Source | Pull Method | Result |
|--------|-------------|--------|
| WordPress | Crawl or FTP | Static HTML |
| Shopify | Crawl | Static HTML |
| Webflow | Crawl | Static HTML |
| Custom sites | Crawl or FTP | Static HTML |
| Static HTML | Direct copy | Static HTML |

*All sites become static HTML for consistent editing and deployment.*

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  GreenShoe Dashboard                         │
│              (Your VPS - React + Node.js)                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ Client's Live │ │ Staging       │ │ Local Dev     │
│ Site (any)    │ │ (VPS/Cloud)   │ │ (Claude Code) │
│               │ │               │ │               │
│ - WordPress   │ │ - Static HTML │ │ - Download    │
│ - Shopify     │ │ - Preview URL │ │ - Edit        │
│ - Custom      │ │ - Archives    │ │ - Upload      │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        │                 │                 │
        │  PULL (crawl)   │                 │
        ├────────────────►│                 │
        │                 │  DOWNLOAD ZIP   │
        │                 ├────────────────►│
        │                 │                 │
        │                 │  UPLOAD ZIP     │
        │                 │◄────────────────┤
        │                 │                 │
        │  PUSH (FTP)     │                 │
        │◄────────────────┤                 │
```

**Phase 2**: Staging moves to Cloudflare Pages for automatic preview URLs and global CDN.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Job Queue | Bull + Redis |
| File Transfer | ssh2-sftp-client |
| Encryption | AES-256-GCM |
| Auth | JWT + bcrypt |

## Project Structure

```
greenshoe/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── api/            # Routes, controllers, middleware
│   │   ├── services/       # Business logic
│   │   │   ├── auth/       # Authentication
│   │   │   ├── credentials/# Encryption service
│   │   │   ├── sync/       # File sync engine
│   │   │   ├── database/   # DB clone/restore
│   │   │   └── archive/    # Version management
│   │   ├── jobs/           # Background job processors
│   │   └── models/         # Database models
│   └── tests/
│
├── frontend/               # React dashboard
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   └── services/       # API client
│   └── package.json
│
├── specs/                  # Feature specifications
│   ├── internal-staging-tool.md      # Main spec
│   └── internal-staging-tool-plan.md # Implementation plan
│
├── .claude/
│   ├── agents/             # AI agent definitions
│   │   ├── backend-engineer.md
│   │   ├── frontend-engineer.md
│   │   ├── reviewer.md
│   │   └── tester.md
│   └── commands/           # Slash commands
│
├── docker-compose.yml      # PostgreSQL + Redis
└── README.md
```

## Documentation

### Specifications
- **[Feature Spec](specs/internal-staging-tool.md)** - Complete requirements, acceptance criteria, constraints
- **[Implementation Plan](specs/internal-staging-tool-plan.md)** - 35 tasks across 7 phases

### Implementation Phases

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-4 | Project setup, database schema, scaffolding |
| 2 | 5-8 | Authentication, RBAC, credential encryption |
| 3 | 9-13 | Site management, platform detection, dashboard |
| 4 | 14-19 | Pull system (file sync, DB clone, URL rewrite) |
| 5 | 20-25 | Push system (backup, upload, rollback) |
| 6 | 26-29 | Archive system (create, retain, restore) |
| 7 | 30-35 | Notifications, logs, user management, testing |

## User Roles

| Role | Permissions |
|------|-------------|
| **Developer** | View sites, pull from live, edit staging, view logs |
| **Project Manager** | + Push to live, view/restore archives |
| **Admin** | + Manage users, manage credentials, delete sites |

## Workflow

### For Developers
```
1. Select client site from dashboard
2. Click "Pull from Live" to get latest
3. Edit staging site:
   - Option A: Edit directly via staging subdomain (WordPress admin, etc.)
   - Option B: Download → Edit locally with Claude Code → Upload
4. Request PM to review and push when ready
```

### Local Editing with Claude Code
```bash
# 1. Download staging files from dashboard (ZIP)
# 2. Extract locally
unzip client-site.zip -d ./client-site

# 3. Edit with Claude Code
cd client-site
claude
> "Update the hero section to use a gradient background"

# 4. Re-zip and upload via dashboard
zip -r client-site-updated.zip ./*
# Upload via "Upload Changes" button in dashboard
```

### For Project Managers
```
1. Review staging changes
2. Click "Push to Live"
3. Confirm the push (warning if live site changed)
4. System creates backup → uploads → verifies
5. If anything fails, automatic rollback kicks in
```

### For Admins
```
1. Add new client sites with credentials
2. Manage team user accounts and roles
3. Delete sites when no longer needed
4. View all activity logs
```

## MVP Constraints

- **Max site size**: 2GB (files + database)
- **Operation timeout**: 30 minutes
- **Archive retention**: Last 5 versions per site
- **Max sites**: 10 (single VPS constraint)
- **Infrastructure**: Single VPS - 4GB RAM, 2 vCPU, 80GB SSD

## Getting Started

### Prerequisites
- Node.js 18+
- Docker (for PostgreSQL and Redis)
- Claude Code CLI

### Quick Start - View Progress Dashboard

```bash
# Install root dependencies
npm install

# Start the visual progress dashboard
npm run dashboard
```

Open [http://localhost:3333](http://localhost:3333) to see the live progress tracker.

The dashboard shows:
- Overall progress (53 tasks across 10 phases)
- Task status and acceptance criteria
- Recent activity feed
- Auto-refreshes every 10 seconds

### Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/greenshoe
cd greenshoe

# Start databases
docker-compose up -d

# Install backend dependencies
cd backend
npm install
cp .env.example .env  # Configure your environment
npm run migrate       # Run database migrations
npm run dev          # Start backend server

# Install frontend dependencies (new terminal)
cd frontend
npm install
npm run dev          # Start frontend dev server
```

### Updating Progress

```bash
# Mark task as started
node update-progress.js start 5

# Mark task as completed
node update-progress.js complete 5

# Mark specific acceptance criteria as met
node update-progress.js criteria 5 0

# Add activity log
node update-progress.js activity "Completed authentication implementation"
```

### Using Claude Code

```bash
# Start Claude Code
claude

# Refine the spec (if needed)
> /spec specs/internal-staging-tool.md

# View the implementation plan
> /plan specs/internal-staging-tool.md

# Start implementing
> /implement specs/internal-staging-tool-plan.md
```

## AI Agents

This project uses specialized AI agents for development:

| Agent | Purpose |
|-------|---------|
| **backend-engineer** | API, file sync, database operations, encryption |
| **frontend-engineer** | React dashboard, notifications, role-based UI |
| **reviewer** | Security review, spec alignment, code quality |
| **tester** | Acceptance criteria verification, edge cases |

## Testing

### Unit & Integration Tests

```bash
# Backend tests
cd backend
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm test -- --coverage # With coverage

# Frontend tests
cd frontend
npm test              # Run all tests
npm test -- --watch   # Watch mode
```

### End-to-End Tests (Playwright)

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e              # Headless mode
npm run test:e2e:headed       # With visible browser
npm run test:e2e:ui           # Interactive UI mode (recommended)
npm run test:e2e:report       # View last test report

# Run specific test file
npx playwright test tests/e2e/auth.spec.js

# Debug tests
npx playwright test --debug
```

**E2E Test Coverage:**
- Authentication flow (login, logout, protected routes)
- Site management (CRUD operations)
- Pull workflow (WordPress, static sites, progress tracking)
- Push workflow (deployment, rollback)
- Role-based access control (Developer, PM, Admin)
- Archive management
- Download/upload workflow

## Security

- All credentials encrypted at rest (AES-256-GCM)
- Master encryption key stored in environment (not in code)
- Credentials never logged in plaintext
- Role-based access control on all operations
- JWT authentication with secure password hashing

## What Clients Need to Provide

- Server credentials (FTP, SFTP, or SSH)
- Database credentials (MySQL for WordPress sites)

## What We Provide

- Staging server infrastructure
- Admin dashboard to manage all client staging sites
- Automatic backups and version history
- Secure credential storage

## Acceptance Criteria Summary

The spec includes 26 testable acceptance criteria covering:
- Site management (A1-A2)
- Pull operations (A3-A6)
- Push operations (A7-A11)
- Archive & restore (A12-A14b)
- Role-based access (A15-A16)
- URL rewriting (A17-A18)
- Credential security (A19-A20)
- Notifications (A22-A24)
- Size & timeout limits (A25-A26)

See [specs/internal-staging-tool.md](specs/internal-staging-tool.md) for complete details.

## Future Considerations (Post-MVP)

- Email notifications
- Scheduled pulls/pushes
- Partial pulls (database only, uploads only)
- Preview before push
- Audit log export
- Additional platform support (Shopify, Webflow, etc.)

## License

Internal use only.

---

**Ready to implement?** → See [specs/internal-staging-tool-plan.md](specs/internal-staging-tool-plan.md)
