# GreenShoe Development Guide

This repository is an internal agency platform for **managing client website staging and deployments** using spec-driven, multi-agent development with Claude Code.

## Core Philosophy

**Specs are the source of truth. Claude executes the loop. Humans stay in control.**

- No implementation without a spec
- No "looks good" without acceptance criteria
- Specs evolve when reality disagrees

## HARD RULES - Development Server Ports

**These ports are MANDATORY. Always use these exact ports for local development.**

| Service    | Port | URL                          |
|------------|------|------------------------------|
| PostgreSQL | 5432 | localhost:5432 (local)       |
| Redis      | 6379 | localhost:6379 (Docker)      |
| Backend    | 9090 | http://localhost:9090        |
| Frontend   | 5200 | http://localhost:5200        |

**When starting servers:**
1. If any of these ports are in use, KILL the process using that port first
2. Then restart the server on the correct port
3. Never allow servers to fall back to alternative ports

---

## What GreenShoe Does

1. **Pull** - Crawl any client website and convert to static HTML
2. **Edit** - Download, edit locally with Claude Code, upload back
3. **Review** - Client views staging and provides feedback
4. **Push** - Deploy approved changes to live with automatic backup
5. **Rollback** - Automatically restore if something goes wrong

## Repository Structure

```
greenshoe/
├── CLAUDE.md                # This file - repository context for Claude
├── README.md                # Project overview
├── docker-compose.yml       # PostgreSQL + Redis
│
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── api/            # Routes, controllers, middleware
│   │   │   ├── routes/     # Express routes
│   │   │   ├── middleware/ # Auth, RBAC, validation
│   │   │   └── controllers/
│   │   ├── services/       # Business logic
│   │   │   ├── crawler/    # Static site crawling
│   │   │   ├── pull/       # Pull from live
│   │   │   ├── push/       # Push to live
│   │   │   ├── download/   # ZIP creation
│   │   │   ├── upload/     # ZIP extraction
│   │   │   ├── credentials/# Encryption service
│   │   │   └── archive/    # Version management
│   │   ├── jobs/           # Background job processors
│   │   └── models/         # Prisma models
│   └── tests/
│
├── frontend/               # React dashboard
│   ├── src/
│   │   ├── components/     # UI components
│   │   │   ├── common/     # Shared (Button, Modal, etc.)
│   │   │   ├── sites/      # Site management
│   │   │   ├── operations/ # Pull/push controls
│   │   │   ├── localEditing/ # Download/upload
│   │   │   └── archives/   # Archive management
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   └── services/       # API client
│   └── package.json
│
├── specs/                  # Feature specifications
│   ├── internal-staging-tool.md      # Main spec (52 requirements)
│   ├── internal-staging-tool-plan.md # Implementation plan (39 tasks)
│   └── product-roadmap.md            # Future phases
│
├── .claude/
│   ├── agents/             # AI agent definitions (8 agents)
│   │   ├── backend-engineer.md
│   │   ├── frontend-engineer.md
│   │   ├── crawler-specialist.md
│   │   ├── devops-infra.md
│   │   ├── database-specialist.md
│   │   ├── security-specialist.md
│   │   ├── reviewer.md
│   │   └── tester.md
│   └── commands/           # Slash commands
│
└── prompts/                # Workflow prompts
    ├── spec.md
    ├── plan.md
    ├── implement.md
    └── review.md
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js 18+ + Express |
| Database | PostgreSQL 15 + Prisma ORM |
| Job Queue | Bull + Redis |
| Crawling | wget/HTTrack + Puppeteer (for SPAs) |
| File Transfer | ssh2-sftp-client |
| Encryption | AES-256-GCM |
| Auth | JWT + bcrypt |

## AI Agents

This project uses 8 specialized agents:

| Agent | Purpose |
|-------|---------|
| **backend-engineer** | API endpoints, services, job processing |
| **frontend-engineer** | React dashboard, UI components, hooks |
| **crawler-specialist** | Static site crawling, URL rewriting |
| **devops-infra** | VPS setup, Docker, Nginx, SSL |
| **database-specialist** | PostgreSQL schema, Prisma, migrations |
| **security-specialist** | Encryption, auth, RBAC, validation |
| **reviewer** | Code review, spec alignment, security |
| **tester** | Acceptance criteria verification |

### Using Agents

```
# For backend implementation
"Use the backend-engineer agent to implement Task 5"

# For crawling work
"Use the crawler-specialist agent to implement the URL rewriting service"

# For infrastructure setup
"Use the devops-infra agent to configure Nginx"

# For security review
"Use the security-specialist agent to review credential handling"
```

## Custom Slash Commands

- `/spec <file>` - Refine a feature specification
- `/plan <file>` - Generate implementation task list
- `/implement <file>` - Execute the implementation loop
- `/review <spec> [files]` - Spec-based code review

## Development Workflow

### Starting Implementation

```bash
# 1. Start databases
docker-compose up -d

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Run migrations
cd backend && npm run migrate

# 4. Start development servers
npm run dev  # In both backend and frontend directories
```

### Using Claude Code

```bash
# Start Claude Code
claude

# View the implementation plan
> /plan specs/internal-staging-tool.md

# Start implementing
> /implement specs/internal-staging-tool-plan.md

# Review code
> /review specs/internal-staging-tool.md backend/src/services/
```

## Code Patterns

### Backend Service Pattern

```typescript
// services/pull/pullService.ts
export class PullService {
  constructor(
    private crawler: CrawlerService,
    private credentials: CredentialService
  ) {}

  async pullSite(siteId: string, userId: string): Promise<PullResult> {
    // 1. Get site config
    // 2. Decrypt credentials (if needed)
    // 3. Crawl site to static HTML
    // 4. Rewrite URLs
    // 5. Log operation
  }
}
```

### Frontend Component Pattern

```tsx
// components/operations/PullButton.tsx
export function PullButton({ siteId }: { siteId: string }) {
  const { mutate: pull, isLoading } = usePull(siteId);

  return (
    <Button onClick={() => pull()} disabled={isLoading}>
      {isLoading ? 'Pulling...' : 'Pull from Live'}
    </Button>
  );
}
```

### API Route Pattern

```typescript
// api/routes/sites.ts
router.post('/:id/pull',
  authMiddleware,
  requirePermission('pull:execute'),
  async (req, res) => {
    const job = await pullQueue.add({ siteId: req.params.id });
    res.json({ jobId: job.id });
  }
);
```

## User Roles & Permissions

| Feature | Developer | Project Manager | Admin |
|---------|-----------|-----------------|-------|
| View sites | ✅ | ✅ | ✅ |
| Pull from live | ✅ | ✅ | ✅ |
| Download/upload | ✅ | ✅ | ✅ |
| Push to live | ❌ | ✅ | ✅ |
| View archives | ❌ | ✅ | ✅ |
| Restore archive | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Delete sites | ❌ | ❌ | ✅ |

## Key Constraints

- **Max site size**: 2GB (files combined)
- **Operation timeout**: 30 minutes
- **Archive retention**: Last 5 versions per site
- **Max sites**: 10 (MVP infrastructure)
- **Infrastructure**: Single VPS (4GB RAM, 2 vCPU, 80GB SSD)

## Security Requirements

- Credentials encrypted at rest (AES-256-GCM)
- Master key in environment variable only
- Credentials never logged in plaintext
- JWT authentication on all API endpoints
- Role-based access control enforced
- ZIP uploads validated (size, structure, path traversal)
- URL validation before crawling (SSRF prevention)

## Testing Standards

- Every acceptance criterion must have a test
- Unit tests for all services
- Integration tests for pull/push flows
- Test credential encryption/decryption
- Test role-based access controls
- Test timeout and size limit handling

## Build Commands

```bash
# Backend
cd backend
npm run dev          # Development server
npm run build        # Production build
npm run test         # Run tests
npm run migrate      # Run migrations

# Frontend
cd frontend
npm run dev          # Development server
npm run build        # Production build
npm run test         # Run tests
npm run lint         # Lint check
```

## Environment Variables

```bash
# Backend (.env)
NODE_ENV=development
PORT=9090                    # MANDATORY - see Hard Rules
DATABASE_URL=postgresql://user:pass@localhost:5432/greenshoe
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-64-char-hex-key
STAGING_DOMAIN=staging.yourdomain.com

# Frontend (.env)
VITE_API_URL=http://localhost:9090/api   # MANDATORY - see Hard Rules
```

## Git Workflow

- **Branch naming**: `feature/task-N-description` or `fix/issue-description`
- **Commit messages**: Reference task number (e.g., "Task 5: Implement auth middleware")
- **PR requirements**: Link to spec, verification checklist completed

## Spec-Driven Development Rules

1. **Always start with a spec** - Read `specs/internal-staging-tool.md`
2. **Follow the plan** - Tasks are ordered by dependencies
3. **One task at a time** - Complete and verify before moving on
4. **Verify against spec** - Tests must validate acceptance criteria
5. **Stop on ambiguity** - Clarify specs, don't invent requirements

## Context Management Tips

- Use `/clear` between major features to reset context
- Reference specs explicitly: "Read specs/internal-staging-tool.md"
- Use appropriate agents for specialized work
- Check existing code patterns before adding new ones

## Troubleshooting

- **Database connection issues?** → Check Docker is running: `docker-compose ps`
- **Redis connection issues?** → Verify Redis container: `docker-compose logs redis`
- **Permission errors?** → Check user role in JWT payload
- **Crawling fails?** → Validate URL, check site is publicly accessible

## Key Documentation

- **[Main Spec](specs/internal-staging-tool.md)** - 52 requirements, 30 acceptance criteria
- **[Implementation Plan](specs/internal-staging-tool-plan.md)** - 39 tasks across 8 phases
- **[Product Roadmap](specs/product-roadmap.md)** - Future phases (Cloudflare, Client Portal, etc.)

## Resources

- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Bull Queue Documentation](https://github.com/OptimalBits/bull)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Remember**: Specs define success. Claude implements. Tests verify. Humans approve.
