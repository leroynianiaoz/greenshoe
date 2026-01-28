Generate an implementation plan from a specification.

**Spec file**: The spec file path provided as argument

## Your Role
Break down the specification into small, sequential, verifiable tasks for building a web-based internal tool.

## Process

1. **Read the spec thoroughly**
   - Understand all requirements
   - Note acceptance criteria
   - Identify constraints

2. **Explore the codebase**
   - Find existing files and patterns
   - Understand current project structure
   - Identify what needs to be created vs modified

3. **Create task breakdown**
   - Start with infrastructure/setup tasks
   - Order tasks by dependencies
   - Keep each task small (1-3 hours of work)
   - Make each task independently verifiable

4. **Map tasks to acceptance criteria**
   - Each criterion should be addressed by one or more tasks
   - Note which tasks validate which criteria

## Task Categories (in order)

### Phase 1: Project Setup
- Development environment setup
- Database schema design
- Project scaffolding (backend + frontend)

### Phase 2: Core Backend
- Authentication & authorization
- Credential encryption service
- Database models and migrations
- API endpoints structure

### Phase 3: File Operations
- SFTP/SSH connection service
- File sync engine (pull)
- File sync engine (push)
- Database cloning (WordPress)
- URL rewriting service

### Phase 4: Job Processing
- Background job queue setup
- Pull job implementation
- Push job implementation
- Timeout and cleanup handling
- Rollback logic

### Phase 5: Archive System
- Archive creation service
- Archive retention (keep last 5)
- Restore from archive

### Phase 6: Frontend Dashboard
- Authentication UI
- Site management views
- Pull/push controls with progress
- Notification system
- Role-based UI visibility

### Phase 7: Integration & Testing
- End-to-end pull flow
- End-to-end push flow
- Rollback testing
- Role permission testing

## Task Format

Each task should include:
```
## Task N: [Brief description]

**Spec reference**: Rxx, Cxx (requirement/constraint numbers)
**Acceptance criteria**: Axx (which criteria this addresses)
**Dependencies**: Task N-1, N-2 (if any)
**Agent**: backend-engineer | frontend-engineer | tester

### Implementation steps:
1. [Specific action]
2. [Specific action]

### Verification:
- [ ] [How to verify this task is complete]
```

## Rules

- Tasks must be sequential where dependencies exist
- Each task must have clear verification criteria
- Include test-writing as part of implementation tasks
- Flag any spec ambiguities requiring clarification
- No mobile/Android/iOS tasks - this is web-only
- Focus on MVP constraints (2GB limit, 30min timeout, 5-10 sites)

## Output

Generate a markdown file with:
1. Plan summary
2. Tech stack decisions
3. Total number of tasks
4. Ordered task list with all details
5. Risk assessment
6. Verification checklist mapping tasks to acceptance criteria

Save the plan as `specs/[spec-name]-plan.md`
