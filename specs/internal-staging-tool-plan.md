# Implementation Plan: GreenShoe Internal Staging Tool

**Spec**: [internal-staging-tool.md](internal-staging-tool.md)
**Created**: January 2026
**Total Tasks**: 53
**Estimated Phases**: 10

---

## Plan Summary

Build an internal web-based staging tool that allows the agency to:
1. Pull client websites (WordPress/Static HTML) to a staging environment
2. Download staging files for local editing with Claude Code
3. Upload edited files back to staging
4. Push approved changes to live with automatic backup/rollback
5. Manage version history (last 5 archives per site)

**Key Constraints**:
- Maximum site size: 2GB
- Operation timeout: 30 minutes
- Scale: 5-10 client sites
- Infrastructure: Single VPS (4GB RAM, 2 vCPU, 80GB SSD)
- Web dashboard only (no mobile)

---

## Tech Stack Decisions

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Backend** | Node.js + Express | Mature ecosystem, good SSH/SFTP libraries, async I/O |
| **Database** | PostgreSQL | Reliable, good JSON support for credentials |
| **Queue** | Bull + Redis | Proven for background jobs, handles timeouts |
| **File Transfer** | ssh2-sftp-client | Full SFTP support, resume capability |
| **Encryption** | Node crypto (AES-256-GCM) | Built-in, secure |
| **Frontend** | React + Vite | Fast dev experience, wide adoption |
| **Styling** | Tailwind CSS | Rapid UI development |
| **Auth** | JWT + bcrypt | Stateless, secure |

---

## Project Structure (New)

```
greenshoe/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   └── controllers/
│   │   ├── services/
│   │   │   ├── auth/
│   │   │   ├── credentials/
│   │   │   ├── sync/
│   │   │   ├── database/
│   │   │   ├── archive/
│   │   │   └── notifications/
│   │   ├── jobs/
│   │   ├── models/
│   │   └── utils/
│   ├── tests/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## Phase 1: Project Setup (Tasks 1-4)

### Task 1: Initialize project structure

**Spec reference**: N/A (setup)
**Acceptance criteria**: N/A
**Dependencies**: None
**Agent**: backend-engineer

#### Implementation steps:
1. Create `backend/` directory with Node.js project (npm init)
2. Create `frontend/` directory with Vite + React
3. Add `.gitignore` entries for node_modules, .env, etc.
4. Create `docker-compose.yml` for PostgreSQL and Redis
5. Create `.env.example` with required environment variables

#### Verification:
- [ ] `npm install` succeeds in both backend and frontend
- [ ] `docker-compose up` starts PostgreSQL and Redis
- [ ] Project structure matches specification

---

### Task 2: Database schema design and migrations

**Spec reference**: R1-R5, R28-R32, C7
**Acceptance criteria**: A1, A15
**Dependencies**: Task 1
**Agent**: backend-engineer

#### Implementation steps:
1. Install Knex.js for migrations
2. Create migration for `users` table (id, email, password_hash, role, created_at)
3. Create migration for `sites` table (id, name, slug, live_url, connection_type, encrypted_credentials, platform_type, status, last_pulled_at, created_by)
4. Create migration for `operations` table (id, site_id, user_id, type, status, started_at, completed_at, error_message)
5. Create migration for `archives` table (id, site_id, version, file_path, db_path, created_at)
6. Create migration for `notifications` table (id, user_id, type, message, read, created_at)
7. Add indexes for common queries

#### Verification:
- [ ] Migrations run successfully (`npx knex migrate:latest`)
- [ ] All tables created with correct columns
- [ ] Foreign key constraints work correctly

---

### Task 3: Backend project scaffolding

**Spec reference**: N/A (setup)
**Acceptance criteria**: N/A
**Dependencies**: Task 1
**Agent**: backend-engineer

#### Implementation steps:
1. Install dependencies: express, cors, helmet, morgan, pg, knex, bull, ioredis, ssh2-sftp-client, bcrypt, jsonwebtoken, dotenv
2. Create Express app with middleware (cors, helmet, json parsing)
3. Create folder structure (api/, services/, jobs/, models/, utils/)
4. Create database connection utility
5. Create Redis connection utility
6. Create logger utility
7. Add health check endpoint (GET /api/health)

#### Verification:
- [ ] Server starts without errors
- [ ] Health endpoint returns 200
- [ ] Database connection established
- [ ] Redis connection established

---

### Task 4: Frontend project scaffolding

**Spec reference**: N/A (setup)
**Acceptance criteria**: N/A
**Dependencies**: Task 1
**Agent**: frontend-engineer

#### Implementation steps:
1. Initialize Vite + React + TypeScript project
2. Install dependencies: react-router-dom, axios, @tanstack/react-query, tailwindcss
3. Configure Tailwind CSS
4. Create folder structure (components/, pages/, hooks/, services/)
5. Create API client utility (axios instance)
6. Create basic layout component with header
7. Set up React Router with placeholder routes

#### Verification:
- [ ] `npm run dev` starts frontend
- [ ] Basic layout renders in browser
- [ ] Tailwind styles work

---

## Phase 2: Authentication & Security (Tasks 5-8)

### Task 5: User authentication - Backend

**Spec reference**: R28, R33
**Acceptance criteria**: A15, A16
**Dependencies**: Task 2, Task 3
**Agent**: backend-engineer

#### Implementation steps:
1. Create auth service (register, login, verify token)
2. Create password hashing utility (bcrypt)
3. Create JWT utility (sign, verify)
4. Create POST /api/auth/login endpoint
5. Create POST /api/auth/register endpoint (admin only for MVP)
6. Create GET /api/auth/me endpoint (get current user)
7. Create auth middleware (verifyToken)
8. Write unit tests for auth service

#### Verification:
- [ ] Login returns JWT token
- [ ] Invalid credentials return 401
- [ ] Token verification works
- [ ] Tests pass

---

### Task 6: Role-based access control

**Spec reference**: R29-R32, C2, C3
**Acceptance criteria**: A11, A15, A16
**Dependencies**: Task 5
**Agent**: backend-engineer

#### Implementation steps:
1. Create roles enum (Developer, ProjectManager, Admin)
2. Create RBAC middleware (requireRole)
3. Define permission matrix:
   - Developer: view sites, pull, view logs
   - ProjectManager: + push, archives, restore
   - Admin: + manage users, delete sites, manage credentials
4. Apply middleware to relevant routes
5. Write tests for permission checks

#### Verification:
- [ ] Developer cannot access push endpoint
- [ ] Developer cannot access user management
- [ ] Admin can access all endpoints
- [ ] Tests pass for all role combinations

---

### Task 7: Credential encryption service

**Spec reference**: R37-R39, C1
**Acceptance criteria**: A19, A20
**Dependencies**: Task 3
**Agent**: backend-engineer

#### Implementation steps:
1. Create encryption utility using AES-256-GCM
2. Master key loaded from environment variable
3. Create encrypt(data) function
4. Create decrypt(data) function
5. Ensure credentials are never logged (redact in logger)
6. Write tests with test encryption key

#### Verification:
- [ ] Encrypted data is not readable
- [ ] Decryption returns original data
- [ ] Different inputs produce different ciphertexts
- [ ] No plaintext credentials in logs

---

### Task 8: User authentication - Frontend

**Spec reference**: R28
**Acceptance criteria**: A15, A16
**Dependencies**: Task 4, Task 5
**Agent**: frontend-engineer

#### Implementation steps:
1. Create auth context/store
2. Create login page with form
3. Create API service for auth endpoints
4. Store JWT in localStorage/memory
5. Create protected route wrapper
6. Add logout functionality
7. Redirect unauthenticated users to login

#### Verification:
- [ ] Login form submits and stores token
- [ ] Protected routes redirect to login
- [ ] Logout clears token and redirects

---

## Phase 3: Site Management (Tasks 9-13)

### Task 9: Site CRUD - Backend

**Spec reference**: R1-R5
**Acceptance criteria**: A1, A2
**Dependencies**: Task 6, Task 7
**Agent**: backend-engineer

#### Implementation steps:
1. Create site model with CRUD operations
2. Create POST /api/sites (add site) - Admin only
3. Create GET /api/sites (list all sites)
4. Create GET /api/sites/:id (get single site)
5. Create PUT /api/sites/:id (update site) - Admin only
6. Create DELETE /api/sites/:id (delete site) - Admin only
7. Encrypt credentials before storing
8. Validate WordPress sites require DB credentials
9. Auto-generate slug from site name

#### Verification:
- [ ] Create site stores encrypted credentials
- [ ] WordPress without DB creds returns error
- [ ] List returns all sites with status
- [ ] Delete removes site and related data

---

### Task 10: Platform detection service

**Spec reference**: R44-R46, C9
**Acceptance criteria**: A3, A4
**Dependencies**: Task 9
**Agent**: backend-engineer

#### Implementation steps:
1. Create platform detection service
2. Check for wp-config.php via SFTP connection
3. Return platform type: 'wordpress' | 'static'
4. Cache detection result in site record
5. Update site creation to auto-detect platform

#### Verification:
- [ ] WordPress site detected correctly
- [ ] Static HTML site detected correctly
- [ ] Detection result stored in database

---

### Task 11: SFTP/SSH connection service

**Spec reference**: R6, R7, R14, R18
**Acceptance criteria**: A5
**Dependencies**: Task 7
**Agent**: backend-engineer

#### Implementation steps:
1. Create connection factory (SFTP/SSH based on type)
2. Create connect(credentials) function
3. Create disconnect() function
4. Handle connection errors with meaningful messages
5. Create test connection utility (for site setup)
6. Add connection timeout (30 seconds)
7. Write tests with mock SFTP server

#### Verification:
- [ ] Valid credentials establish connection
- [ ] Invalid credentials return clear error
- [ ] Timeout triggers after 30 seconds
- [ ] Connection properly closed after use

---

### Task 12: Site management - Frontend

**Spec reference**: R1-R5, R35
**Acceptance criteria**: A1, A2
**Dependencies**: Task 8, Task 9
**Agent**: frontend-engineer

#### Implementation steps:
1. Create sites list page (dashboard)
2. Create site card component (name, status, last pulled, actions)
3. Create add site modal/form
4. Create edit site modal/form
5. Create delete site confirmation modal
6. Show staging URL link for each site
7. Role-based button visibility (delete for Admin only)

#### Verification:
- [ ] Sites list displays all sites
- [ ] Add site form works with validation
- [ ] Delete only visible for Admin
- [ ] Staging URL links correctly

---

### Task 13: Site status indicators

**Spec reference**: R5, R12, R21
**Acceptance criteria**: A6
**Dependencies**: Task 12
**Agent**: frontend-engineer

#### Implementation steps:
1. Create status badge component (never pulled, staging active, pulling, pushing)
2. Create progress bar component
3. Add last pulled timestamp display
4. Add real-time status updates via polling (every 5 seconds during operations)

#### Verification:
- [ ] Status badge shows correct state
- [ ] Progress bar updates during operations
- [ ] Last pulled time displays correctly

---

## Phase 4: Pull System (Tasks 14-19)

### Task 14: File sync service - Pull

**Spec reference**: R7, R11, C11
**Acceptance criteria**: A3, A4, A25
**Dependencies**: Task 11
**Agent**: backend-engineer

#### Implementation steps:
1. Create file sync service for downloading
2. Implement recursive directory download
3. Add file size calculation before download
4. Enforce 2GB limit (abort if exceeded)
5. Implement chunked downloads for large files
6. Track progress (files downloaded, bytes transferred)
7. Create staging directory structure: /staging/{site-slug}/files/

#### Verification:
- [ ] All files downloaded recursively
- [ ] Progress tracked accurately
- [ ] >2GB site rejected with error
- [ ] Files stored in correct location

---

### Task 15: Database clone service (WordPress)

**Spec reference**: R8, R10
**Acceptance criteria**: A3
**Dependencies**: Task 11
**Agent**: backend-engineer

#### Implementation steps:
1. Create MySQL dump utility (via SSH: mysqldump command)
2. Download dump file to staging
3. Create local staging database for site
4. Import dump to local database
5. Update wp-config.php with staging DB credentials
6. Store staging DB credentials in site record

#### Verification:
- [ ] Database exported from live
- [ ] Database imported to staging
- [ ] wp-config.php updated correctly
- [ ] Staging WordPress connects to staging DB

---

### Task 16: URL rewriting service

**Spec reference**: R9
**Acceptance criteria**: A17, A18
**Dependencies**: Task 15
**Agent**: backend-engineer

#### Implementation steps:
1. Create URL replacement utility
2. Replace URLs in database (SQL UPDATE on common WP tables)
3. Handle serialized PHP data (adjust string lengths)
4. Replace URLs in static files (.html, .css, .js)
5. Create reverse function (staging → live) for push

#### Verification:
- [ ] All database URLs replaced
- [ ] Serialized data not corrupted
- [ ] Static file URLs replaced
- [ ] Site accessible via staging URL

---

### Task 17: Pull job implementation

**Spec reference**: R6, R12, R13, C12
**Acceptance criteria**: A3, A4, A5, A6, A26
**Dependencies**: Task 14, Task 15, Task 16
**Agent**: backend-engineer

#### Implementation steps:
1. Create Bull queue for pull jobs
2. Create pull job processor:
   - Validate credentials
   - Check site size
   - Download files
   - Clone database (if WordPress)
   - Rewrite URLs
   - Update site status
3. Add 30-minute timeout
4. Handle timeout: cleanup partial files, log failure
5. Emit progress events for real-time updates
6. Log operation to operations table

#### Verification:
- [ ] Pull job completes successfully
- [ ] Progress updates received
- [ ] Timeout triggers cleanup
- [ ] Operation logged correctly

---

### Task 18: Pull API endpoint

**Spec reference**: R6
**Acceptance criteria**: A3, A4, A5
**Dependencies**: Task 17
**Agent**: backend-engineer

#### Implementation steps:
1. Create POST /api/sites/:id/pull endpoint
2. Validate site exists and user has permission
3. Check no operation already in progress
4. Queue pull job
5. Return job ID for status tracking
6. Create GET /api/jobs/:id endpoint for status

#### Verification:
- [ ] Pull endpoint queues job
- [ ] Concurrent pull rejected
- [ ] Job status retrievable

---

### Task 19: Pull UI implementation

**Spec reference**: R6, R12
**Acceptance criteria**: A3, A4, A5, A6
**Dependencies**: Task 13, Task 18
**Agent**: frontend-engineer

#### Implementation steps:
1. Add "Pull from Live" button to site card
2. Create pull confirmation modal
3. Connect to pull API endpoint
4. Poll job status during operation
5. Update progress bar in real-time
6. Show success/error notification on completion

#### Verification:
- [ ] Pull button triggers operation
- [ ] Progress bar updates
- [ ] Success notification appears
- [ ] Error shown on failure

---

## Phase 5: Push System (Tasks 20-25)

### Task 20: Live site change detection

**Spec reference**: R15, R16
**Acceptance criteria**: A8
**Dependencies**: Task 11
**Agent**: backend-engineer

#### Implementation steps:
1. Store file checksums during pull
2. Create change detection service
3. Compare current live checksums with stored
4. Return list of changed files
5. Include in push pre-check

#### Verification:
- [ ] Changes detected when live site modified
- [ ] No false positives on unchanged sites
- [ ] Change summary returned

---

### Task 21: Backup service

**Spec reference**: R17, C5
**Acceptance criteria**: A10, A12
**Dependencies**: Task 11
**Agent**: backend-engineer

#### Implementation steps:
1. Create backup service for live site
2. Download current live files to backup location
3. Export current live database (WordPress)
4. Store backup with timestamp
5. Create restore-from-backup function

#### Verification:
- [ ] Backup created before push
- [ ] Backup contains all files and DB
- [ ] Restore function works

---

### Task 22: File sync service - Push

**Spec reference**: R18
**Acceptance criteria**: A7
**Dependencies**: Task 11, Task 21
**Agent**: backend-engineer

#### Implementation steps:
1. Create file upload service
2. Implement recursive directory upload
3. Track upload progress
4. Handle upload failures (retry 3 times)
5. Verify upload integrity (checksum)

#### Verification:
- [ ] All files uploaded
- [ ] Progress tracked
- [ ] Failed uploads retried
- [ ] Integrity verified

---

### Task 23: Push job with rollback

**Spec reference**: R14, R17-R22, C6, C12
**Acceptance criteria**: A7, A10
**Dependencies**: Task 20, Task 21, Task 22, Task 16
**Agent**: backend-engineer

#### Implementation steps:
1. Create Bull queue for push jobs
2. Create push job processor:
   - Create backup of live site
   - Upload staging files to live
   - Update database (if WordPress)
   - Rewrite URLs (staging → live)
   - Verify site accessible
3. Implement rollback on failure:
   - Restore files from backup
   - Restore database from backup
   - Log rollback
4. Add 30-minute timeout
5. Log operation to operations table

#### Verification:
- [ ] Push completes successfully
- [ ] Rollback triggers on failure
- [ ] Live site restored after rollback
- [ ] Operation logged

---

### Task 24: Push API endpoint

**Spec reference**: R14, C2
**Acceptance criteria**: A7, A8, A11
**Dependencies**: Task 23
**Agent**: backend-engineer

#### Implementation steps:
1. Create POST /api/sites/:id/push endpoint
2. Require ProjectManager or Admin role
3. Check for live site changes, return warning if found
4. Accept force=true to proceed despite changes
5. Queue push job
6. Return job ID for status tracking

#### Verification:
- [ ] Push requires PM/Admin role
- [ ] Developer gets 403
- [ ] Warning returned on live changes
- [ ] Force flag bypasses warning

---

### Task 25: Push UI implementation

**Spec reference**: R14, R16, R21
**Acceptance criteria**: A7, A8, A9, A11
**Dependencies**: Task 19, Task 24
**Agent**: frontend-engineer

#### Implementation steps:
1. Add "Push to Live" button (PM/Admin only)
2. Create push confirmation modal with site name, last pull date
3. Create live changes warning modal
4. Connect to push API endpoint
5. Poll job status during operation
6. Show success/error/rollback notification

#### Verification:
- [ ] Push button hidden for Developer
- [ ] Confirmation modal shows details
- [ ] Warning modal appears when live changed
- [ ] Rollback notification shown on failure

---

## Phase 6: Archive System (Tasks 26-29)

### Task 26: Archive creation service

**Spec reference**: R23, R24, C4
**Acceptance criteria**: A12, A13
**Dependencies**: Task 17
**Agent**: backend-engineer

#### Implementation steps:
1. Create archive service
2. Archive staging files (tar.gz)
3. Archive staging database (SQL dump)
4. Store in /archives/{site-slug}/{version}/
5. Create archive record in database
6. Implement retention: delete oldest when > 5

#### Verification:
- [ ] Archive created on push
- [ ] Files and DB both archived
- [ ] Only 5 archives retained
- [ ] Oldest deleted automatically

---

### Task 27: Archive restore service

**Spec reference**: R26, R27
**Acceptance criteria**: A14, A14b
**Dependencies**: Task 26
**Agent**: backend-engineer

#### Implementation steps:
1. Create restore service
2. Extract archived files to staging
3. Import archived database to staging
4. Update site status
5. Log restore operation

#### Verification:
- [ ] Staging restored from archive
- [ ] Database restored correctly
- [ ] Operation logged

---

### Task 28: Archive API endpoints

**Spec reference**: R25, R26, C2
**Acceptance criteria**: A14
**Dependencies**: Task 26, Task 27
**Agent**: backend-engineer

#### Implementation steps:
1. Create GET /api/sites/:id/archives (list archives)
2. Create POST /api/sites/:id/archives/:version/restore
3. Require ProjectManager or Admin role
4. Return archive details (version, date, size)

#### Verification:
- [ ] Archives listed correctly
- [ ] Restore requires PM/Admin
- [ ] Developer gets 403

---

### Task 29: Archive UI implementation

**Spec reference**: R25, R26
**Acceptance criteria**: A14, A14b
**Dependencies**: Task 25, Task 28
**Agent**: frontend-engineer

#### Implementation steps:
1. Add archives section to site detail page
2. List available archives (version, date, size)
3. Add "Restore" button (PM/Admin only)
4. Create restore confirmation modal
5. Show success notification on restore

#### Verification:
- [ ] Archives list displays
- [ ] Restore button hidden for Developer
- [ ] Confirmation modal shows warning
- [ ] Success notification appears

---

## Phase 7: Local Editing - Claude Code Integration (Tasks 30-33)

### Task 30: Download staging files - Backend

**Spec reference**: R47, R49
**Acceptance criteria**: A27, A28
**Dependencies**: Task 17
**Agent**: backend-engineer

#### Implementation steps:
1. Create GET /api/sites/:id/download endpoint
2. Create ZIP archive of staging files on-the-fly
3. For WordPress: optionally include database SQL dump if `includeDb=true` query param
4. Stream ZIP to response (don't load entire file in memory)
5. Add Content-Disposition header for browser download
6. Log download operation

#### Verification:
- [ ] ZIP downloads successfully
- [ ] All staging files included
- [ ] WordPress DB dump included when requested
- [ ] Large sites stream without memory issues

---

### Task 31: Upload edited files - Backend

**Spec reference**: R48, R50, R51, R52
**Acceptance criteria**: A29, A30
**Dependencies**: Task 30
**Agent**: backend-engineer

#### Implementation steps:
1. Create POST /api/sites/:id/upload endpoint
2. Accept multipart/form-data with ZIP file
3. Validate ZIP structure (not malformed, under 2GB)
4. Create backup of current staging before overwriting
5. Extract ZIP to staging directory
6. If SQL file included, import to staging database
7. Log upload operation
8. Return success/error response

#### Verification:
- [ ] Valid ZIP extracts to staging
- [ ] Backup created before overwrite
- [ ] Malformed ZIP rejected with error
- [ ] >2GB ZIP rejected with error
- [ ] Database imported if SQL file present

---

### Task 32: Download/Upload UI

**Spec reference**: R47, R48
**Acceptance criteria**: A27, A28, A29, A30
**Dependencies**: Task 30, Task 31
**Agent**: frontend-engineer

#### Implementation steps:
1. Add "Download for Local Editing" button to site detail page
2. For WordPress: add checkbox "Include database export"
3. Add "Upload Changes" button with file input
4. Show upload progress indicator
5. Show success/error notification after upload
6. Disable buttons during active pull/push operations

#### Verification:
- [ ] Download button triggers ZIP download
- [ ] WordPress shows database checkbox
- [ ] Upload accepts ZIP and shows progress
- [ ] Error shown for invalid files

---

### Task 33: Local editing documentation

**Spec reference**: R47-R52
**Acceptance criteria**: N/A (documentation)
**Dependencies**: Task 32
**Agent**: backend-engineer

#### Implementation steps:
1. Add "Local Editing with Claude Code" section to README
2. Document workflow: Download → Extract → Claude Code → ZIP → Upload
3. Include example commands for extracting/zipping
4. Note that database changes require SQL file in ZIP root

#### Verification:
- [ ] Documentation clear and complete
- [ ] Workflow steps easy to follow

---

## Phase 8: Notifications & Polish (Tasks 34-39)

### Task 34: Notification service - Backend

**Spec reference**: R40-R43
**Acceptance criteria**: A22, A23, A24
**Dependencies**: Task 17, Task 23
**Agent**: backend-engineer

#### Implementation steps:
1. Create notification service
2. Create notification on operation complete (success/failure)
3. Create notification on rollback
4. Create GET /api/notifications endpoint
5. Create PUT /api/notifications/:id/read endpoint
6. Return unread count with notifications

#### Verification:
- [ ] Notifications created on events
- [ ] Unread count accurate
- [ ] Mark as read works

---

### Task 35: Notification UI implementation

**Spec reference**: R40-R43
**Acceptance criteria**: A22, A23, A24
**Dependencies**: Task 34
**Agent**: frontend-engineer

#### Implementation steps:
1. Create notification bell component in header
2. Show unread badge count
3. Create notification dropdown/panel
4. Mark notifications as read on view
5. Link to relevant logs on failure notifications
6. Poll for new notifications (every 30 seconds)

#### Verification:
- [ ] Bell shows unread count
- [ ] Dropdown lists notifications
- [ ] Clicking marks as read
- [ ] Failure links to logs

---

### Task 36: Activity logs UI

**Spec reference**: R13, R22, C7
**Acceptance criteria**: A5
**Dependencies**: Task 17, Task 23
**Agent**: frontend-engineer

#### Implementation steps:
1. Create logs page
2. List all operations (pull, push, restore)
3. Show: site, user, type, status, timestamp, duration
4. Add filtering by site, type, status
5. Show error messages for failed operations

#### Verification:
- [ ] All operations listed
- [ ] Filters work correctly
- [ ] Error details visible

---

### Task 37: User management UI (Admin)

**Spec reference**: R28-R32
**Acceptance criteria**: A15
**Dependencies**: Task 8
**Agent**: frontend-engineer

#### Implementation steps:
1. Create user management page (Admin only)
2. List all users with roles
3. Create add user form
4. Create edit user modal (change role)
5. Create delete user confirmation
6. Restrict page access to Admin role

#### Verification:
- [ ] Only Admin can access page
- [ ] Users listed correctly
- [ ] Add/edit/delete work

---

### Task 38: Error handling & edge cases

**Spec reference**: C11, C12
**Acceptance criteria**: A25, A26
**Dependencies**: Tasks 17-25
**Agent**: backend-engineer

#### Implementation steps:
1. Add size check before pull starts
2. Return clear error for >2GB sites
3. Ensure timeout cleanup removes partial files
4. Add connection retry logic (3 attempts)
5. Handle database connection failures gracefully
6. Add request validation on all endpoints

#### Verification:
- [ ] >2GB site rejected with clear message
- [ ] Timeout cleans up properly
- [ ] Retries work on transient failures
- [ ] Validation errors return 400

---

### Task 39: Integration testing

**Spec reference**: All
**Acceptance criteria**: A3, A4, A7, A10, A27-A30
**Dependencies**: All previous tasks
**Agent**: tester

#### Implementation steps:
1. Create test WordPress site (local or test server)
2. Create test static HTML site
3. Test full pull flow (WordPress)
4. Test full pull flow (static)
5. Test download staging files (with and without DB)
6. Test upload edited files (valid ZIP, invalid ZIP, oversized ZIP)
7. Test full push flow with rollback simulation
8. Test archive create and restore
9. Test role permissions (all 3 roles)
10. Test size limit rejection
11. Test timeout handling
12. Document test results

#### Verification:
- [ ] WordPress pull/push works end-to-end
- [ ] Static HTML pull/push works end-to-end
- [ ] Download/upload workflow works end-to-end
- [ ] Rollback restores site correctly
- [ ] All acceptance criteria verified

---

## Phase 9: Advanced Push Features (Tasks 40-47)

### Task 40: Diff service - Backend

**Spec reference**: R64-R68
**Acceptance criteria**: A38, A39, A40
**Dependencies**: Task 17
**Agent**: backend-engineer

#### Implementation steps:
1. Create GET /api/sites/:id/diff endpoint
2. Compare staging directory with live site (via crawl or cached snapshot)
3. Generate list of added, modified, deleted files
4. Calculate file sizes and totals
5. For text files, generate line-by-line diff (use diff library)
6. Return structured diff result with file tree

#### Verification:
- [ ] Added/modified/deleted files correctly identified
- [ ] Line-level diff works for HTML/CSS/JS
- [ ] Summary counts accurate
- [ ] Large sites don't timeout

---

### Task 41: Diff view UI - Frontend

**Spec reference**: R64-R68
**Acceptance criteria**: A38, A39, A40, A41
**Dependencies**: Task 40
**Agent**: frontend-engineer

#### Implementation steps:
1. Create DiffView component with file tree
2. Color-code files: green (added), yellow (modified), red (deleted)
3. Show summary banner with counts
4. Implement file click to show line-by-line diff modal
5. Add "Push All" and "Push Selected" buttons
6. Integrate into push workflow (button: "Preview Changes")

#### Verification:
- [ ] File tree displays with colors
- [ ] Line diff modal works
- [ ] Summary shows correct counts
- [ ] Can push from diff view

---

### Task 42: Partial push - Backend

**Spec reference**: R53-R57
**Acceptance criteria**: A32, A33
**Dependencies**: Task 23, Task 40
**Agent**: backend-engineer

#### Implementation steps:
1. Modify POST /api/sites/:id/push to accept optional `files` array
2. If files array provided, only push those files
3. Create backup of only the affected files from live
4. Upload only selected files to live server
5. Log which specific files were pushed
6. Handle partial rollback if push fails

#### Verification:
- [ ] Partial file list accepted
- [ ] Only selected files uploaded
- [ ] Backup contains only affected files
- [ ] Partial rollback works

---

### Task 43: File selection UI - Frontend

**Spec reference**: R53-R55
**Acceptance criteria**: A31
**Dependencies**: Task 41, Task 42
**Agent**: frontend-engineer

#### Implementation steps:
1. Add "Select Files" button alongside "Push All"
2. Create file tree with checkboxes
3. Implement select all/none for folders
4. Show selection summary: "X files selected (Y MB)"
5. Pass selected files to push API
6. Disable during active operations

#### Verification:
- [ ] File tree with checkboxes works
- [ ] Folder selection selects children
- [ ] Summary updates in real-time
- [ ] Selected files passed to API

---

### Task 44: Scheduled backup service - Backend

**Spec reference**: R58-R63
**Acceptance criteria**: A34, A35, A37
**Dependencies**: Task 17, Task 26
**Agent**: backend-engineer

#### Implementation steps:
1. Add backup_schedule fields to sites table (enabled, cron_expression, last_backup_at)
2. Create scheduled backup job using Bull repeatable jobs
3. Backup job crawls live site and stores as "live_backup" archive type
4. Separate retention for live backups (5 max, independent of staging archives)
5. Add API endpoints: PUT /api/sites/:id/schedule, GET /api/sites/:id/live-backups
6. Log all scheduled backup operations

#### Verification:
- [ ] Cron schedule saves correctly
- [ ] Job runs at scheduled time
- [ ] Live backups stored separately
- [ ] Retention limit enforced

---

### Task 45: Scheduled backup UI - Frontend

**Spec reference**: R58, R63
**Acceptance criteria**: A34
**Dependencies**: Task 44
**Agent**: frontend-engineer

#### Implementation steps:
1. Add "Scheduled Backups" section to site settings
2. Toggle to enable/disable
3. Dropdown for frequency (daily, weekly, custom)
4. Time picker for backup time
5. Show next scheduled backup time
6. Show last backup status

#### Verification:
- [ ] Schedule toggle works
- [ ] Frequency options save
- [ ] Next backup time displayed
- [ ] Settings persist

---

### Task 46: Live backup restore - Backend & Frontend

**Spec reference**: R61
**Acceptance criteria**: A36
**Dependencies**: Task 44, Task 45
**Agent**: backend-engineer

#### Implementation steps:
1. Create POST /api/sites/:id/live-backups/:backupId/restore endpoint
2. Download live backup archive
3. Push entire backup to live server (replacing current live)
4. Create backup of current live before restore (safety net)
5. Add UI: "Live Backups" tab showing available backups
6. Add "Restore to Live" button with confirmation modal
7. Log restore operation

#### Verification:
- [ ] Live backups listed in UI
- [ ] Restore confirmation required
- [ ] Live site restored correctly
- [ ] Safety backup created

---

### Task 47: Advanced features integration testing

**Spec reference**: R53-R68
**Acceptance criteria**: A31-A41
**Dependencies**: Tasks 40-46
**Agent**: tester

#### Implementation steps:
1. Test diff view with various file changes
2. Test partial push with single file
3. Test partial push with folder
4. Test partial push rollback
5. Test scheduled backup creation
6. Test scheduled backup at scheduled time
7. Test live backup restore
8. Test retention limits for live backups
9. Document test results

#### Verification:
- [ ] Diff shows accurate changes
- [ ] Partial push works correctly
- [ ] Scheduled backups run on time
- [ ] Live restore works end-to-end

---

## Phase 10: Pre-Pull Evaluation & Questionnaire (Tasks 48-53)

### Task 48: Site evaluation service - Backend

**Spec reference**: R74-R78
**Acceptance criteria**: A42, A43
**Dependencies**: Task 17 (Pull job)
**Agent**: crawler-specialist

#### Implementation steps:
1. Create GET /api/sites/:id/evaluate endpoint
2. Use Puppeteer to quick-scan homepage + 5 sample pages
3. Detect site type (WordPress, Shopify, Webflow, React, etc.) from HTML signatures
4. Estimate page count by sampling internal links
5. Estimate total size based on sampled pages and assets
6. Detect technologies using page source analysis
7. Identify interactive elements (forms, carts, search, login)
8. Calculate time estimate based on site complexity and settings
9. Return evaluation result with all metrics

#### Verification:
- [ ] Evaluation completes within 60 seconds
- [ ] Site type detected correctly
- [ ] Page count estimate within 20% of actual
- [ ] Interactive elements identified
- [ ] Time estimate provided

---

### Task 49: Pre-pull questionnaire API - Backend

**Spec reference**: R79-R83
**Acceptance criteria**: A44, A45, A46, A47
**Dependencies**: Task 48
**Agent**: backend-engineer

#### Implementation steps:
1. Add `pull_settings` JSONB column to operations table
2. Create POST /api/sites/:id/pull-settings endpoint
3. Store questionnaire answers:
   - visual_fidelity: 'pixel_perfect' | 'functional' | 'good_enough'
   - interactive_handling: 'disabled' | 'remove' | 'keep' | 'placeholder'
   - verification_method: 'visual' | 'automated' | 'manual'
   - priority: 'speed' | 'accuracy'
4. Update pull job to require pull_settings before execution
5. Return validation error if pull attempted without settings
6. Pass settings to crawler for use during pull

#### Verification:
- [ ] Settings saved to database
- [ ] Pull blocked without questionnaire
- [ ] Settings passed to crawler job
- [ ] All 4 questions required

---

### Task 50: Pre-pull wizard UI - Frontend

**Spec reference**: R74-R83
**Acceptance criteria**: A42, A43, A44, A45, A46
**Dependencies**: Task 48, Task 49, Task 19 (Pull UI)
**Agent**: frontend-engineer

#### Implementation steps:
1. Replace simple "Pull from Live" button with wizard trigger
2. Create multi-step wizard component:
   - Step 1: Site Evaluation (auto-runs, shows loading then results)
   - Step 2: Visual Fidelity question (radio buttons)
   - Step 3: Interactive Elements question (radio buttons)
   - Step 4: Verification Method question (radio buttons)
   - Step 5: Speed vs Accuracy question (radio buttons)
   - Step 6: Review & Confirm (summary of all selections)
3. Show evaluation results card with site type, page count, size estimate, technologies, time estimate
4. Require all questions answered before "Start Pull" button enabled
5. Show estimated crawl time and storage size in review
6. On confirm, save settings then trigger pull job

#### Verification:
- [ ] Wizard opens on pull button click
- [ ] Evaluation runs and displays results
- [ ] All questions must be answered
- [ ] Review shows all selections
- [ ] Pull starts after confirmation

---

### Task 51: Visual comparison service - Backend

**Spec reference**: R84, R85
**Acceptance criteria**: A48, A49
**Dependencies**: Task 17 (Pull job), Task 49
**Agent**: crawler-specialist

#### Implementation steps:
1. If verification_method is 'visual', run post-pull comparison
2. Use Puppeteer to screenshot key pages on live site
3. Screenshot same pages on staging site
4. Use image comparison library (pixelmatch, resemble.js) to diff
5. Generate visual diff images highlighting differences
6. Calculate visual match percentage per page
7. Store screenshots and diffs in /staging/{site-slug}/verification/
8. Return comparison results to be included in accuracy report

#### Verification:
- [ ] Live site screenshots captured
- [ ] Staging site screenshots captured
- [ ] Diff images generated
- [ ] Match percentage calculated
- [ ] Comparison skipped if not 'visual' verification

---

### Task 52: Accuracy report service - Backend

**Spec reference**: R86, R87
**Acceptance criteria**: A50, A51
**Dependencies**: Task 51, Task 17
**Agent**: backend-engineer

#### Implementation steps:
1. Create accuracy report generator that runs after pull completes
2. Compile report data:
   - Pages successfully copied (count and list)
   - Assets: downloaded count, missing count, failed list
   - Visual match percentage (if visual comparison enabled)
   - Interactive elements: found count, how each was handled
   - Errors and warnings from crawl log
3. Store report as JSON in database (new accuracy_reports table or in operations.metadata)
4. Add GET /api/sites/:id/operations/:opId/accuracy-report endpoint
5. Add POST /api/sites/:id/operations/:opId/acknowledge endpoint
6. Update site status to 'pending_review' until acknowledged
7. After acknowledgment, set status to 'active'

#### Verification:
- [ ] Report generated after pull
- [ ] All metrics included
- [ ] Site status is 'pending_review' after pull
- [ ] Acknowledgment changes status to 'active'

---

### Task 53: Accuracy report UI - Frontend

**Spec reference**: R86, R87
**Acceptance criteria**: A50, A51
**Dependencies**: Task 52, Task 51
**Agent**: frontend-engineer

#### Implementation steps:
1. Create AccuracyReport component with collapsible sections
2. Display metrics:
   - Pages copied (expandable list)
   - Assets summary with missing items highlighted
   - Visual comparison gallery (if enabled) with side-by-side viewer
   - Interactive elements table showing element type and handling
   - Errors/warnings panel
3. Add "Acknowledge & Continue" button at bottom
4. Button disabled until user scrolls through report (optional UX)
5. On acknowledge, update site status and redirect to site detail
6. Show 'Pending Review' badge on sites awaiting acknowledgment

#### Verification:
- [ ] Report displays all sections
- [ ] Visual comparison shows side-by-side images
- [ ] Acknowledge button works
- [ ] Site status changes after acknowledgment
- [ ] Pending review badge visible on dashboard

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| SFTP connection instability | Medium | High | Implement retry logic, chunked transfers |
| WordPress serialized data corruption | Medium | High | Use proven search-replace library (interconnectit/wp-cli) |
| Rollback fails leaving site broken | Low | Critical | Test rollback extensively, keep backup until verified |
| 30-minute timeout too short for large sites | Medium | Medium | Monitor job durations, consider configurable timeout |
| Credential exposure in logs | Medium | Critical | Redact all credential fields in logger |
| Concurrent operations corrupt state | Low | High | Lock site during operations, reject concurrent jobs |

---

## Acceptance Criteria Verification Matrix

| Criteria | Task(s) | Verified By |
|----------|---------|-------------|
| A1 | 9, 12 | Add site appears in dashboard |
| A2 | 9 | WordPress without DB creds shows error |
| A3 | 17, 19 | WordPress pull completes successfully |
| A4 | 17, 19 | Static HTML pull completes successfully |
| A5 | 11, 18, 19 | Invalid credentials show error |
| A6 | 13, 19 | Progress bar updates during pull |
| A7 | 23, 25 | Push completes, live site updated |
| A8 | 20, 24, 25 | Warning shown when live site changed |
| A9 | 25 | Confirmation modal shows site details |
| A10 | 21, 23, 25 | Rollback restores live site |
| A11 | 6, 24, 25 | Developer cannot push |
| A12 | 26 | Archive created before push |
| A13 | 26 | Only 5 archives retained |
| A14 | 28, 29 | Restore shows confirmation |
| A14b | 27, 29 | Restore overwrites staging |
| A15 | 5, 6, 37 | Admin can manage users |
| A16 | 6 | Developer access restricted |
| A17 | 16 | URLs rewritten in database/files |
| A18 | 16 | Serialized data handled correctly |
| A19 | 7 | Credentials encrypted in database |
| A20 | 7 | Credentials not in logs |
| A21 | N/A | Concurrent file access allowed (no locking) |
| A22 | 34, 35 | Success notification appears |
| A23 | 34, 35 | Failure notification with error |
| A24 | 34, 35 | Notification badge shows count |
| A25 | 14, 38 | >2GB site shows error |
| A26 | 17, 38 | Timeout cancels and cleans up |
| A27 | 30, 32 | Download staging files as ZIP |
| A28 | 30, 32 | WordPress download includes DB option |
| A29 | 31, 32 | Upload ZIP extracts to staging |
| A30 | 31, 32 | Invalid/oversized ZIP rejected |
| A31 | 43 | File selection UI for partial push |
| A32 | 42 | Partial push uploads only selected files |
| A33 | 42 | Partial push backup contains only affected files |
| A34 | 44, 45 | Backup schedule configured and saved |
| A35 | 44 | Scheduled backup runs automatically |
| A36 | 46 | Restore live site from backup |
| A37 | 44 | Live backup retention limit enforced |
| A38 | 40, 41 | Diff view shows file changes |
| A39 | 40, 41 | Line-level diff for text files |
| A40 | 40, 41 | Diff summary with counts |
| A41 | 41 | Push from diff view |
| A42 | 48, 50 | Automatic site evaluation before pull |
| A43 | 48, 50 | Time and resource estimate displayed |
| A44 | 49, 50 | Visual fidelity question required |
| A45 | 49, 50 | Interactive elements handling selection |
| A46 | 49, 50 | Questionnaire review summary shown |
| A47 | 49, 50 | Pull blocked without questionnaire |
| A48 | 51 | Visual comparison screenshots captured |
| A49 | 51, 53 | Visual diff highlighting differences |
| A50 | 52, 53 | Copy accuracy report generated |
| A51 | 52, 53 | Accuracy report acknowledgment required |

---

## Next Steps

1. Review this plan and approve
2. Run `/implement` to start with Task 1
3. Complete tasks sequentially, verifying each before moving on
4. Run integration tests (Task 39) when all features complete

---

*Plan Status: Ready for implementation*
