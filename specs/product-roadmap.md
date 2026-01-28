# GreenShoe Product Roadmap

**Last Updated**: January 2026
**Timeline**: 3-4 months for MVP

---

## Vision

An internal agency platform to manage client websites end-to-end:
- Pull any website → Convert to static → Edit with Claude Code → Client reviews → Push live

---

## Confirmed Decisions

| Decision | Choice |
|----------|--------|
| Static conversion | Yes - all sites converted to static HTML for easier management |
| Staging hosting | Cloudflare Pages (free tier, auto preview URLs, global CDN) |
| Push destination | Agency-managed hosting preferred, client's host if required |
| Client access | Preview link + login for comments + voice/video feedback (later) |
| External APIs OK | Yes, if quick to integrate |
| Timeline | 3-4 months MVP |
| Team + funding | Available |

---

## Architecture (Updated)

```
┌─────────────────────────────────────────────────────────────┐
│                  GreenShoe Dashboard                         │
│              (Your VPS - React + Node.js)                    │
│                                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Sites   │ │ Users   │ │ Jobs    │ │ Notifs  │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ Client's Live │ │ Cloudflare    │ │ Local Dev     │
│ Site (any)    │ │ Pages         │ │ (Claude Code) │
│               │ │               │ │               │
│ - WordPress   │ │ - Staging     │ │ - Download    │
│ - Shopify     │ │ - Preview URL │ │ - Edit        │
│ - Custom      │ │ - Client view │ │ - Upload      │
│ - Static      │ │ - CDN         │ │               │
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
        │  PUSH (FTP/API) │  AUTO DEPLOY    │
        │◄────────────────┤◄────────────────┤
```

---

## Phase Overview

| Phase | Name | Tasks | Status |
|-------|------|-------|--------|
| **MVP** | Core Staging Tool | 39 tasks | Ready to implement |
| **2** | Cloudflare Pages Integration | ~8 tasks | Spec needed |
| **3** | Client Portal (Basic) | ~10 tasks | Spec needed |
| **4** | Client Feedback (Voice/Video) | ~8 tasks | Future |
| **5** | Templates & Modules | ~12 tasks | Future |
| **6** | Business Operations | ~15 tasks | Future |
| **7** | Analytics & SEO Intelligence | ~12 tasks | Future |
| **8** | Project Management Suite | ~22 tasks | Future |

---

## MVP (Phase 1) - Current Plan

**Spec**: [internal-staging-tool.md](internal-staging-tool.md)
**Plan**: [internal-staging-tool-plan.md](internal-staging-tool-plan.md)
**Tasks**: 39
**Timeline**: ~2 months

### What's Included
- Pull websites via SFTP/SSH/FTP
- Convert to static (crawl-based)
- Host staging on VPS (upgrade to Cloudflare in Phase 2)
- Download/upload for Claude Code editing
- Push to client's host
- User roles (Developer, PM, Admin)
- Archive system (last 5 versions)
- In-app notifications

### What's Deferred
- Cloudflare Pages hosting (Phase 2)
- Client preview portal (Phase 3)
- Voice/video feedback (Phase 4)

---

## Phase 2: Cloudflare Pages Integration

**Timeline**: ~2-3 weeks after MVP
**Dependencies**: MVP complete

### Features
- Deploy staging sites to Cloudflare Pages via API
- Automatic preview URLs for each deploy
- Custom domains (client1.youragency.com)
- Remove VPS hosting of staging sites (VPS only runs dashboard)

### Tasks (High-Level)
1. Cloudflare Pages API integration
2. Auto-deploy on upload
3. Preview URL generation and storage
4. Custom domain configuration
5. Update pull flow to deploy after crawl
6. Update push flow to use Cloudflare-hosted files
7. Migration script for existing sites
8. Update documentation

### API Reference
- Cloudflare Pages API: https://developers.cloudflare.com/pages/platform/api/

---

## Phase 3: Client Portal (Basic)

**Timeline**: ~3-4 weeks after Phase 2
**Dependencies**: Cloudflare Pages integration

### Features
- Client login (separate from internal users)
- View staging site via embedded preview
- Leave text comments on specific pages
- Request changes (creates internal task)
- View project status
- Approve final version

### New User Role
- **Client**: View staging, leave comments, approve

### Tasks (High-Level)
1. Client user model and authentication
2. Client dashboard (simplified view)
3. Site preview embed component
4. Comment system (page-level)
5. Change request submission
6. Approval workflow
7. Status visibility for clients
8. Email notifications for clients (SendGrid)
9. Password-protected preview links
10. Client onboarding flow

---

## Phase 4: Client Feedback (Voice/Video)

**Timeline**: ~2-3 weeks after Phase 3
**Dependencies**: Client Portal

### Features
- Client records voice feedback while viewing site
- Voice transcribed to text (Whisper API)
- Client records screen + voice (Loom-style)
- AI processes feedback into actionable tasks
- Claude asks clarifying questions if needed

### External APIs
- **Whisper API** ($0.006/min) - voice transcription
- **Screen recording** - browser MediaRecorder API (no external tool)

### Tasks (High-Level)
1. Voice recording component
2. Whisper API integration
3. Screen recording component
4. Recording storage (Cloudflare R2 or S3)
5. Transcription display and editing
6. AI task extraction (Claude API)
7. Clarifying question flow
8. Task creation from feedback

---

## Phase 5: Templates & Modules

**Timeline**: ~4 weeks
**Dependencies**: Core platform stable

### Features
- Template library (starter sites)
- Module library (header, footer, hero, contact, etc.)
- Brand standards assistant
- New client onboarding with template selection
- Module drag-and-drop (if feasible)

### Tasks (High-Level)
1. Template storage and management
2. Template preview system
3. Create from template flow
4. Module library structure
5. Module insertion into sites
6. Brand standards document generator
7. Brand compliance checker
8. Client template selection UI
9. Template customization options
10. Module versioning
11. Internal template creation tool
12. Template documentation

---

## Phase 6: Business Operations

**Timeline**: ~4-6 weeks
**Dependencies**: Client Portal

### Features
- Scope definition and tracking
- Contract signing (DocuSign API)
- Payment processing (Stripe)
- Project timeline tracking
- Budget tracking
- Scope creep detection
- Email/SMS notifications (SendGrid/Twilio)
- Internal reporting

### External APIs
- **Stripe** - payments
- **DocuSign** - e-signatures
- **SendGrid** - email
- **Twilio** - SMS (optional)

### Tasks (High-Level)
1. Project/scope model
2. Scope definition UI
3. DocuSign API integration
4. Contract generation
5. Stripe integration
6. Payment page for clients
7. Invoice generation
8. Timeline tracking UI
9. Budget tracking
10. Scope change requests
11. Scope creep alerts
12. Email notification system
13. SMS notifications (optional)
14. Internal reports dashboard
15. Financial reports

---

## Phase 7: Analytics & SEO Intelligence

**Timeline**: ~3-4 weeks
**Dependencies**: Client Portal, Business Operations

### Features
- Google Analytics integration (traffic, conversions, user behavior)
- Google Tag Manager integration (event tracking, data layer management)
- SEMrush integration (SEO audits, keyword tracking, competitor analysis)
- Site health dashboard (performance + SEO combined)
- Automated SEO recommendations
- Traffic reports for clients

### External APIs
- **Google Analytics Data API** - Traffic and conversion data
- **Google Tag Manager API** - Tag configuration and deployment
- **SEMrush API** - SEO metrics, keyword data, site audits

### Tasks (High-Level)
1. Google Analytics OAuth connection
2. Analytics dashboard widgets
3. Traffic reporting per site
4. Google Tag Manager OAuth connection
5. GTM container management
6. Event tracking configuration UI
7. SEMrush API integration
8. SEO audit automation
9. Keyword tracking per site
10. Competitor comparison reports
11. Combined health score algorithm
12. Client-facing analytics reports

---

## Phase 8: Project Management Suite

**Timeline**: ~6-8 weeks
**Dependencies**: All previous phases stable
**Inspiration**: ClickUp-style project management

### Vision
Transform GreenShoe from a staging tool into a complete agency operations platform. Clients and team members collaborate in one place — no more switching between tools.

### Features

#### Task Management
- Task creation with assignees, due dates, priorities
- Task dependencies and subtasks
- Multiple views: List, Board (Kanban), Timeline (Gantt), Calendar
- Custom task statuses per project
- Time tracking on tasks
- Task templates for common workflows

#### Project Organization
- Projects grouped by client
- Project templates (Website Redesign, Landing Page, etc.)
- Milestones and phases
- Project health indicators
- Workload view across team

#### Collaboration
- Comments and @mentions on tasks
- File attachments
- Activity feed per project
- Real-time updates (WebSocket)

#### Automations
- Auto-create tasks from client feedback
- Auto-assign based on task type
- Due date reminders
- Status change triggers
- Scope creep alerts when tasks exceed original scope

#### Reporting
- Team utilization reports
- Project profitability (time vs budget)
- Client activity reports
- Sprint/milestone burndown

### Integration with Existing Features
- Pull/Push operations auto-create tasks
- Client feedback becomes tasks
- Archive restores logged as tasks
- Payment milestones linked to project phases

### Tasks (High-Level)
1. Task data model (status, priority, assignee, dates, etc.)
2. Project/workspace structure
3. List view component
4. Board (Kanban) view component
5. Timeline (Gantt) view component
6. Calendar view component
7. Task detail modal/page
8. Subtasks and dependencies
9. Comments and activity feed
10. File attachments (Cloudflare R2)
11. Real-time updates (WebSocket/SSE)
12. Custom statuses per project
13. Task templates
14. Project templates
15. Time tracking
16. Workload view
17. Automation rules engine
18. Auto-task from feedback integration
19. Scope tracking integration
20. Team utilization reports
21. Project profitability reports
22. Mobile-responsive task management

---

## Future Considerations (Post-Phase 8)

- Multi-language support
- White-label option (agency branding for client portal)
- Public API for external integrations
- Mobile app for approvals and task management
- AI-powered task estimation
- AI project planning assistant
- Resource forecasting
- Advanced Gantt with auto-scheduling
- Integration marketplace (Slack, Asana import, etc.)
- Team workload balancing with AI suggestions

---

## External Tools Summary

| Tool | Phase | Purpose | Cost |
|------|-------|---------|------|
| Cloudflare Pages | 2 | Staging hosting | Free tier |
| Whisper API | 4 | Voice transcription | $0.006/min |
| SendGrid | 3+ | Email notifications | Free tier then ~$15/mo |
| Twilio | 6 | SMS notifications | ~$0.01/SMS |
| Stripe | 6 | Payments | 2.9% + $0.30/transaction |
| DocuSign | 6 | E-signatures | ~$25/mo |
| Google Analytics | 7 | Site traffic & conversions | Free |
| Google Tag Manager | 7 | Event tracking & data layer | Free |
| SEMrush | 7 | SEO audits & keyword tracking | ~$120/mo (Pro) |
| Cloudflare R2 | 8 | File storage for attachments | ~$0.015/GB/mo |

---

## Risk Management

| Risk | Mitigation |
|------|------------|
| Static conversion loses functionality | Document limitations, manual workarounds |
| Cloudflare API changes | Abstract behind service layer |
| Client feedback volume | Queue system, AI prioritization |
| Scope creep (our own project!) | Stick to phases, MVP first |
| Integration complexity | One external API per phase max |

---

## Success Metrics

### MVP
- [ ] Can pull any website and convert to static
- [ ] Can edit with Claude Code locally
- [ ] Can push changes to live
- [ ] 3 user roles working correctly
- [ ] Archive/restore functional

### Phase 2
- [ ] Staging sites on Cloudflare Pages
- [ ] Preview URLs generated automatically
- [ ] VPS only running dashboard

### Phase 3
- [ ] Clients can log in and view staging
- [ ] Clients can leave comments
- [ ] Approval workflow functional

### Phase 7
- [ ] Google Analytics connected and showing data
- [ ] GTM containers manageable from dashboard
- [ ] SEMrush audits running automatically
- [ ] Combined site health score displayed

### Phase 8
- [ ] Tasks created and managed within GreenShoe
- [ ] Multiple views (List, Board, Timeline) functional
- [ ] Client feedback auto-creates tasks
- [ ] Team can track time on tasks
- [ ] No need for external project management tool

---

*This roadmap will be updated as phases complete and requirements evolve.*
