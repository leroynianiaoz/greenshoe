# Feature: GreenShoe Internal Staging Tool

## 1. Problem Statement

The agency manages multiple client websites but cannot safely make changes directly on live sites. Currently, the team lacks a centralized internal tool to:
- Duplicate client sites to a controlled staging environment
- Make and test changes without risk to live sites
- Deploy approved changes back to live in a controlled manner
- Track deployment history and roll back if needed

Existing third-party staging tools (WP Engine, Flywheel, etc.) don't provide the ownership and control the agency requires for their internal workflow.

## 2. Goals

- **G1**: Enable one-click duplication of any client site to an internal staging environment
- **G2**: Convert all sites to static HTML for consistent, easy management
- **G3**: Provide a centralized dashboard for managing all client staging sites
- **G4**: Allow safe editing on staging (via Claude Code) without affecting live sites
- **G5**: Enable controlled deployment of staging changes to live with automatic backup and rollback capability
- **G6**: Maintain version history (last 5 versions per site) for recovery purposes
- **G7**: Support concurrent editing by multiple team members on the same staging site

## 3. Non-Goals (MVP)

- **NG1**: Mobile apps (web dashboard only)
- **NG2**: Two-way sync between live and staging (fork model: pull once, edit, push)
- **NG3**: Real-time collaborative editing (concurrent access allowed, but no real-time conflict resolution)
- **NG4**: Client portal access (Phase 3)
- **NG5**: Voice/video feedback (Phase 4)
- **NG6**: Templates and modules (Phase 5)
- **NG7**: Payments and contracts (Phase 6)

*See [product-roadmap.md](product-roadmap.md) for future phases.*

## 4. Functional Requirements

### 4.1 Site Management
- **R1**: Users can add a new client site by providing: site name, live URL, and connection method (FTP/SFTP/SSH with credentials, or URL-only for crawl)
- **R2**: Users can edit client site details after creation
- **R3**: Users can delete a client site and all associated staging data
- **R4**: Dashboard displays all client sites with their current status (never pulled, staging active, last updated timestamp)

### 4.2 Pull System (Live → Staging)

#### 4.2.0 Pre-Pull Evaluation & Questionnaire
Before any pull operation, the system performs an evaluation and asks the staff member key questions:

**Site Evaluation (Automatic)**
- **R74**: System performs a quick scan of the live site (homepage + 5 sample pages)
- **R75**: System detects: site type, estimated page count, estimated total size, detected technologies (React, WordPress, Shopify, etc.)
- **R76**: System identifies interactive elements (forms, shopping carts, search, login areas)
- **R77**: System provides time estimate and resource usage estimate for the crawl
- **R78**: Evaluation results displayed in a summary card before proceeding

**Staff Questionnaire (Required before pull)**
- **R79**: Visual Fidelity Question - "What level of visual accuracy do you need?"
  - Pixel-perfect (99%+ match) - slower, more thorough
  - Functionally identical (95%+) - balanced
  - Good enough (90%+) - faster
- **R80**: Interactive Elements Question - "How should we handle forms, carts, and other interactive features that won't work on staging?"
  - Show as disabled (grayed out with tooltip)
  - Remove entirely from the page
  - Keep as-is (look functional but won't work)
  - Replace with placeholder message
- **R81**: Verification Question - "How should we verify the copy accuracy?"
  - Visual comparison (screenshots of live vs staging, highlight differences)
  - Automated checks only (broken links, missing assets)
  - Manual review (staff will check themselves)
- **R82**: Speed vs Accuracy Question - "What's your priority for this site?"
  - Speed (faster crawl, some quality tradeoffs)
  - Accuracy (slower but thorough)

**Review & Confirm**
- **R83**: After questionnaire, system shows a summary review:
  - Site evaluation results
  - Selected options
  - Estimated crawl time
  - Estimated storage size
  - "Start Pull" button to proceed

#### 4.2.1 Pull Execution
- **R5**: Users can initiate a "Pull from Live" action after completing the questionnaire
- **R6**: The system crawls the live site using Puppeteer (headless browser) to capture JavaScript-rendered content
- **R7**: For sites with FTP/SSH access, system can also pull source files directly
- **R8**: The system performs URL rewriting: replaces all live URLs with staging URLs
- **R9**: Large sites support chunked processing
- **R10**: Progress indicator shows pull status in real-time
- **R11**: System logs all pull operations with timestamp, user, and success/failure status

#### 4.2.2 Asset Capture
- **R12**: All CSS files are downloaded, including @import chains and external stylesheets
- **R13**: All images are downloaded, including lazy-loaded images (data-src converted to src) and srcset variations
- **R69**: Hover states, transitions, and CSS animations are preserved (they live in CSS)
- **R70**: JavaScript files are downloaded; JS-based animations captured in rendered state
- **R71**: Fonts are downloaded (Google Fonts, Adobe Fonts, self-hosted) with proper CORS handling
- **R72**: Videos can be downloaded or kept as external URLs (configurable per site)
- **R73**: SVGs, icons, and favicons are captured

#### 4.2.3 Post-Pull Verification
- **R84**: If "Visual comparison" was selected, system takes screenshots of key pages on both live and staging
- **R85**: Visual diff highlights areas where staging differs from live (using image comparison)
- **R86**: System generates a "Copy Accuracy Report" showing:
  - Pages successfully copied
  - Assets downloaded vs missing
  - Visual match percentage (if visual comparison enabled)
  - Interactive elements found and how they were handled
  - Any errors or warnings
- **R87**: Staff must acknowledge the accuracy report before the staging site is marked as "ready"

*Note: All sites are converted to static HTML for consistent management. Dynamic functionality (WordPress admin, etc.) is not preserved on staging. JavaScript interactions that require API calls will not work on staging.*

### 4.3 Push System (Staging → Live)
- **R14**: Users with appropriate permissions can initiate a "Push to Live" action
- **R15**: Before pushing, the system detects if the live site has changed since the last pull
- **R16**: If live site changes are detected, the system displays a warning summary and requires explicit user confirmation to proceed
- **R17**: Before overwriting live, the system creates a backup of current live files and database
- **R18**: The system uploads all staging files to the live server
- **R19**: For WordPress sites, the system exports staging database, performs URL rewriting (staging → live), and imports to live
- **R20**: If push fails mid-way (connection drop, error), the system automatically rolls back using the backup
- **R21**: Progress indicator shows push status in real-time
- **R22**: System logs all push operations with timestamp, user, and success/failure status

### 4.4 Archive & History
- **R23**: Before each push, the system archives the current staging state (files + database)
- **R24**: The system retains the last 5 versions per site, automatically deleting older archives
- **R25**: Users can view available archives for any site
- **R26**: Users can restore staging from any available archive
- **R27**: Restore operations are logged

### 4.5 User Management & Roles
- **R28**: Users can log in with email/password
- **R29**: Three roles exist: Developer, Project Manager, Admin
- **R30**: Developers can: view sites, pull from live, edit staging sites, view logs
- **R31**: Project Managers can: all Developer permissions + push to live, view archives, restore from archive
- **R32**: Admins can: all Project Manager permissions + manage users, manage site credentials, delete sites
- **R33**: Password reset functionality via email

### 4.6 Staging Site Access
- **R34**: Each staging site is accessible via a unique subdomain (e.g., client1.staging.yourdomain.com)
- **R35**: Dashboard provides direct link to each staging site
- **R36**: For WordPress staging sites, dashboard displays admin credentials if different from live

### 4.7 Local Editing (Claude Code Integration)
- **R47**: Users can download staging files to their local machine as a ZIP archive
- **R48**: Users can upload a ZIP archive to replace/update staging files
- **R49**: Download includes all site files; for WordPress, optionally includes database export (SQL file)
- **R50**: Upload validates ZIP structure before extracting to staging
- **R51**: Upload creates a backup of current staging before overwriting
- **R52**: Download/upload operations are logged with timestamp and user

*Workflow: Pull → Download → Edit locally with Claude Code → Upload → Push*

### 4.8 Credential Security
- **R37**: All client credentials (FTP/SFTP/SSH, database) are encrypted at rest using a master encryption key
- **R38**: Credentials are decrypted only when needed for pull/push operations
- **R39**: Master key is stored securely and not in the codebase

### 4.9 Notifications (MVP)
- **R40**: Dashboard displays in-app notifications for completed pull operations (success or failure)
- **R41**: Dashboard displays in-app notifications for completed push operations (success or failure)
- **R42**: Dashboard displays in-app notifications when an auto-rollback occurs
- **R43**: Notification bell icon shows unread count; clicking reveals notification history

*Note: Email notifications deferred to post-MVP.*

### 4.10 Site Conversion
- **R44**: All sites are converted to static HTML during pull (crawl-based)
- **R45**: Original site type is recorded for reference (WordPress, Shopify, custom, etc.)
- **R46**: Static output is the canonical staging version for all editing

*Note: Phase 2 will add Cloudflare Pages for staging hosting with automatic preview URLs.*

### 4.11 Advanced Push Features

#### 4.11.1 Partial Push (Selected Files)
- **R53**: Users can select specific files or folders to push instead of the entire site
- **R54**: The file selection UI shows a tree view of staging files with checkboxes
- **R55**: Selected files are highlighted and a summary shows "X files selected (Y MB)"
- **R56**: Partial push still creates a backup of the affected files on live before overwriting
- **R57**: Partial push logs include the list of files that were pushed

#### 4.11.2 Scheduled Live Site Backups
- **R58**: Users can configure automatic backups of the live site on a schedule (daily, weekly, or custom cron)
- **R59**: Scheduled backups run independently of push operations
- **R60**: Scheduled backups are stored separately from staging archives (labeled as "Live Backup")
- **R61**: Users can restore live site from any scheduled backup
- **R62**: Maximum 5 scheduled backups retained per site (same as staging archives)
- **R63**: Backup schedule can be enabled/disabled per site

#### 4.11.3 Diff View (Staging vs Live)
- **R64**: Before pushing, users can view a diff showing what changed between staging and live
- **R65**: Diff view shows: added files (green), modified files (yellow), deleted files (red)
- **R66**: For text files (HTML, CSS, JS), users can click to see line-by-line diff
- **R67**: Diff summary shows total counts: "5 added, 12 modified, 2 deleted"
- **R68**: Users can push directly from the diff view or cancel

## 5. Acceptance Criteria

### Site Management
- **A1**: Add new client site
  - GIVEN: User is logged in as Admin
  - WHEN: User fills in site name, live URL, connection type, and credentials, then clicks "Add Site"
  - THEN: Site appears in the dashboard with status "Never Pulled"

- **A2**: Add WordPress site with missing database credentials
  - GIVEN: User is adding a new site detected as WordPress
  - WHEN: User omits database credentials
  - THEN: System displays error "Database credentials required for WordPress sites"

### Pull Operations
- **A3**: Successful pull of WordPress site
  - GIVEN: A WordPress client site is configured with valid credentials
  - WHEN: User clicks "Pull from Live"
  - THEN: All files are downloaded, database is exported/imported, URLs are rewritten, staging site is accessible, and email notification is sent

- **A4**: Successful pull of Static HTML site
  - GIVEN: A static HTML client site is configured with valid credentials
  - WHEN: User clicks "Pull from Live"
  - THEN: All files are downloaded, staging site is accessible, and email notification is sent

- **A5**: Pull with invalid credentials
  - GIVEN: A client site is configured with invalid FTP credentials
  - WHEN: User clicks "Pull from Live"
  - THEN: System displays error "Connection failed: Invalid credentials", operation is logged as failed, email notification is sent

- **A6**: Pull progress indication
  - GIVEN: A pull operation is in progress
  - WHEN: User views the dashboard
  - THEN: Progress bar shows percentage complete and current operation (e.g., "Downloading files: 45%")

### Push Operations
- **A7**: Successful push without live site changes
  - GIVEN: Staging has changes and live site is unchanged since last pull
  - WHEN: Project Manager clicks "Push to Live"
  - THEN: Backup is created, files are uploaded, database is updated (WordPress), live site reflects staging changes, email notification is sent

- **A8**: Push with live site changes detected
  - GIVEN: Live site has changed since last pull
  - WHEN: Project Manager clicks "Push to Live"
  - THEN: Warning modal appears showing "Live site has changed since last pull. Proceeding will overwrite these changes. Continue?" with Cancel and Proceed buttons

- **A9**: Push confirmation modal
  - GIVEN: User clicks "Push to Live"
  - WHEN: Confirmation modal appears
  - THEN: Modal displays site name, last pull date, and requires explicit "Confirm Push" action

- **A10**: Push failure with auto-rollback
  - GIVEN: Push operation starts and backup is created
  - WHEN: Connection drops at 50% of file upload
  - THEN: System detects failure, restores live site from backup, logs rollback, sends email notification with "Push failed - automatic rollback completed"

- **A11**: Developer cannot push
  - GIVEN: User is logged in as Developer
  - WHEN: User views a staging site
  - THEN: "Push to Live" button is disabled or hidden

### Archive & Restore
- **A12**: Archive created before push
  - GIVEN: User initiates a push operation
  - WHEN: Push begins
  - THEN: Current staging state is archived before any changes are made to live

- **A13**: Archive retention limit
  - GIVEN: Site already has 5 archived versions
  - WHEN: A new archive is created
  - THEN: Oldest archive is automatically deleted, 5 most recent remain

- **A14**: Restore from archive with confirmation
  - GIVEN: Site has 3 archived versions and current staging has unsaved work
  - WHEN: Project Manager selects version 2 and clicks "Restore"
  - THEN: Confirmation modal appears: "This will overwrite current staging. Any unsaved changes will be lost. Continue?"

- **A14b**: Restore proceeds after confirmation
  - GIVEN: Restore confirmation modal is displayed
  - WHEN: User clicks "Confirm Restore"
  - THEN: Staging environment is restored to selected version, current staging is overwritten

### Role-Based Access
- **A15**: Admin can manage users
  - GIVEN: User is logged in as Admin
  - WHEN: User navigates to User Management
  - THEN: User can add, edit roles, and remove users

- **A16**: Developer access restrictions
  - GIVEN: User is logged in as Developer
  - WHEN: User attempts to access Push to Live, User Management, or Delete Site
  - THEN: Action is denied with "Insufficient permissions" message

### URL Rewriting
- **A17**: WordPress URL rewriting
  - GIVEN: Live WordPress site uses https://clientsite.com
  - WHEN: Pull operation completes
  - THEN: All database entries and static files containing "https://clientsite.com" are replaced with "https://clientsite.staging.yourdomain.com"

- **A18**: Serialized data handling
  - GIVEN: WordPress database contains serialized data with URLs
  - WHEN: URL rewriting occurs
  - THEN: Serialized string lengths are correctly updated to prevent data corruption

### Credentials Security
- **A19**: Credentials encrypted at rest
  - GIVEN: Admin adds site credentials
  - WHEN: Credentials are stored in database
  - THEN: Credentials are encrypted and not readable in plaintext from database

- **A20**: Credentials decryption for operations
  - GIVEN: Pull or push operation is initiated
  - WHEN: System needs to connect to client server
  - THEN: Credentials are decrypted in memory, used, and not logged in plaintext

### Concurrent Editing
- **A21**: Multiple users editing same staging site
  - GIVEN: Developer A and Developer B both access staging site for Client X
  - WHEN: Both make edits simultaneously
  - THEN: Both can save their changes (file-level, not real-time merge)

### Local Editing (Claude Code Integration)
- **A27**: Download staging files
  - GIVEN: Staging site has been pulled and contains files
  - WHEN: User clicks "Download for Local Editing"
  - THEN: Browser downloads ZIP file containing all staging files

- **A28**: Download with database (WordPress)
  - GIVEN: Staging site is WordPress
  - WHEN: User clicks "Download for Local Editing" and checks "Include database"
  - THEN: ZIP includes SQL dump file alongside site files

- **A29**: Upload edited files
  - GIVEN: User has edited files locally
  - WHEN: User uploads ZIP via "Upload Changes" button
  - THEN: System validates ZIP, creates backup, extracts to staging, shows success notification

- **A30**: Upload validation failure
  - GIVEN: User uploads malformed ZIP or ZIP exceeds 2GB
  - WHEN: Validation runs
  - THEN: System displays error and does not modify staging files

### Notifications (MVP)
- **A22**: In-app notification on successful operation
  - GIVEN: Push or pull operation completes successfully
  - WHEN: Operation finishes
  - THEN: Notification appears in dashboard with message "[Site Name]: [Operation] completed successfully"

- **A23**: In-app notification on failed operation
  - GIVEN: Pull or push operation fails
  - WHEN: Failure is detected
  - THEN: Notification appears in dashboard with error summary and link to logs

- **A24**: Notification badge count
  - GIVEN: User has 3 unread notifications
  - WHEN: User views the dashboard header
  - THEN: Notification bell displays badge with "3"

### Partial Push (Selected Files)
- **A31**: Select files for partial push
  - GIVEN: User is on the push screen with staging changes
  - WHEN: User clicks "Select Files" instead of "Push All"
  - THEN: File tree appears with checkboxes, user can select individual files/folders

- **A32**: Partial push execution
  - GIVEN: User has selected 3 specific files to push
  - WHEN: User confirms partial push
  - THEN: Only those 3 files are uploaded to live, other files remain unchanged

- **A33**: Partial push backup
  - GIVEN: User initiates partial push of files A, B, C
  - WHEN: Push begins
  - THEN: Backup is created containing only the original versions of A, B, C from live

### Scheduled Live Backups
- **A34**: Configure backup schedule
  - GIVEN: Admin is viewing site settings
  - WHEN: Admin enables "Scheduled Backups" and selects "Daily at 2:00 AM"
  - THEN: Schedule is saved and next backup time is displayed

- **A35**: Scheduled backup execution
  - GIVEN: Site has daily backup scheduled for 2:00 AM
  - WHEN: Clock reaches 2:00 AM
  - THEN: System automatically backs up live site, creates "Live Backup" archive

- **A36**: Restore from live backup
  - GIVEN: Site has 3 live backups available
  - WHEN: Admin selects a live backup and clicks "Restore to Live"
  - THEN: Live site is restored to that backup state (with confirmation)

- **A37**: Live backup retention
  - GIVEN: Site has 5 live backups
  - WHEN: 6th scheduled backup completes
  - THEN: Oldest live backup is deleted, 5 most recent remain

### Diff View (Staging vs Live)
- **A38**: View diff before push
  - GIVEN: Staging has changes compared to live
  - WHEN: User clicks "Preview Changes" before push
  - THEN: Diff view shows list of added, modified, and deleted files with color coding

- **A39**: File-level diff
  - GIVEN: Diff view shows "index.html" as modified
  - WHEN: User clicks on "index.html"
  - THEN: Side-by-side or inline diff shows exact line changes

- **A40**: Diff summary
  - GIVEN: Staging has 5 new files, 12 modified, 2 deleted
  - WHEN: Diff view loads
  - THEN: Summary banner shows "5 added, 12 modified, 2 deleted (total: 1.2 MB)"

- **A41**: Push from diff view
  - GIVEN: User is viewing the diff
  - WHEN: User clicks "Push All Changes" or selects specific files and clicks "Push Selected"
  - THEN: Push proceeds with selected scope

### Pre-Pull Evaluation & Questionnaire
- **A42**: Automatic site evaluation
  - GIVEN: User clicks "Pull from Live" on a site
  - WHEN: Pre-pull wizard opens
  - THEN: System automatically scans the live site (homepage + 5 sample pages) and displays: site type, estimated page count, estimated size, detected technologies, and identified interactive elements

- **A43**: Time and resource estimate
  - GIVEN: Site evaluation has completed
  - WHEN: Evaluation results are displayed
  - THEN: System shows estimated crawl time (e.g., "~15 minutes") and estimated storage size (e.g., "~350 MB")

- **A44**: Visual fidelity question required
  - GIVEN: User is in the pre-pull questionnaire
  - WHEN: User attempts to proceed without answering visual fidelity question
  - THEN: System highlights the question and prevents proceeding with "Please select a visual fidelity level"

- **A45**: Interactive elements handling selection
  - GIVEN: User is answering the questionnaire
  - WHEN: User selects "Show as disabled" for interactive elements
  - THEN: Selection is recorded and will be applied during crawl (forms grayed out with tooltips)

- **A46**: Questionnaire review summary
  - GIVEN: User has answered all 4 questionnaire questions
  - WHEN: User proceeds to review step
  - THEN: Summary displays: site evaluation results, all selected options, estimated crawl time, estimated storage size, and "Start Pull" button

- **A47**: Pull blocked without questionnaire
  - GIVEN: User has not completed the questionnaire
  - WHEN: User attempts to bypass and start pull
  - THEN: System prevents pull and displays "Please complete the pre-pull questionnaire first"

- **A48**: Visual comparison screenshots
  - GIVEN: User selected "Visual comparison" for verification
  - WHEN: Pull operation completes
  - THEN: System captures screenshots of key pages on both live and staging sites

- **A49**: Visual diff highlighting
  - GIVEN: Visual comparison screenshots have been captured
  - WHEN: User views the accuracy report
  - THEN: Side-by-side comparison highlights areas where staging differs from live (using image diff)

- **A50**: Copy accuracy report generation
  - GIVEN: Pull operation has completed
  - WHEN: Post-pull verification runs
  - THEN: System generates report showing: pages copied, assets downloaded vs missing, visual match percentage (if enabled), interactive elements handled, and any errors/warnings

- **A51**: Accuracy report acknowledgment required
  - GIVEN: Pull has completed and accuracy report is displayed
  - WHEN: User has not acknowledged the report
  - THEN: Staging site status remains "Pending Review" and is not marked as "Ready" until user clicks "Acknowledge & Continue"

### Size & Timeout Limits
- **A25**: Site exceeds size limit
  - GIVEN: Client site files + database total 2.5GB
  - WHEN: User initiates pull
  - THEN: System displays error "Site size (2.5GB) exceeds maximum allowed (2GB). Contact admin."

- **A26**: Operation timeout
  - GIVEN: Pull operation is in progress
  - WHEN: Operation exceeds 30 minutes
  - THEN: Operation is cancelled, partial files are cleaned up, notification displays "Operation timed out after 30 minutes"

## 6. Constraints & Invariants

- **C1**: All client credentials must be encrypted at rest using AES-256 or equivalent
- **C2**: Push operations require role of Project Manager or Admin
- **C3**: Delete site operations require role of Admin
- **C4**: Maximum 5 archive versions per site; older versions auto-deleted
- **C5**: Every push must create a backup before modifying live site
- **C6**: Failed pushes must trigger automatic rollback
- **C7**: All operations (pull, push, restore, delete) must be logged with timestamp and user
- **C8**: Staging URLs must follow pattern: {client-slug}.staging.{yourdomain.com}
- **C9**: Phase 1 supports only WordPress and Static HTML sites
- **C10**: Web dashboard only; no mobile apps in Phase 1
- **C11**: Maximum site size: 2GB (files + database combined)
- **C12**: Operation timeout: 30 minutes maximum for any pull/push operation
- **C13**: Maximum concurrent sites: 10 (MVP infrastructure constraint)

## 7. Resolved Decisions

- **D1**: Maximum site size: **2GB** (files + database combined) — covers most WordPress sites with media
- **D2**: Operation timeout: **30 minutes** — safe buffer for large pulls/pushes
- **D3**: Notifications: **In-app only for MVP** — email notifications deferred to post-MVP
- **D4**: Infrastructure: **Single VPS** — 4GB RAM, 2 vCPU, 80GB SSD
- **D5**: Expected scale: **5-10 client sites** in MVP
- **D6**: Archive restore behavior: **Warn and require confirmation** before overwriting current staging

## 8. Open Questions

*All remaining questions are post-MVP considerations:*

- **Q1**: Should the system support scheduling pulls or pushes for off-peak hours?
- **Q2**: For WordPress, should we support pulling only specific components (e.g., only database, only uploads folder)?
- **Q3**: Should there be a "preview" feature to see staging changes before push without actually pushing?
- **Q4**: Should there be an audit log export feature for compliance purposes?

---

## Technical Notes (For Planning Reference)

These are captured from the concept brief but are **not prescriptive** - implementation decisions to be made during planning:

- Potential tech stack: Node.js or Python backend, React or Vue dashboard, PostgreSQL for app data
- File transfer via SFTP/rsync
- Wildcard DNS for staging subdomains
- Consider queue system (Redis + Bull) for async pull/push jobs

### MVP Infrastructure Constraints
- Single VPS: 4GB RAM, 2 vCPU, 80GB SSD
- Must handle 5-10 client sites
- Each site up to 2GB = 20GB for sites + 30GB for 5 archives each = ~50GB used, leaving ~30GB buffer
- Operations timeout at 30 minutes

---

*Last Updated: January 2026*
*Status: Ready for planning*
