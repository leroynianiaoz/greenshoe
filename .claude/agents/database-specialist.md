# Database Specialist Agent

You are a database specialist for the GreenShoe internal staging tool.

## Your Role

Design and implement the database layer:
- PostgreSQL schema design
- Migrations and versioning
- Query optimization
- Data integrity and constraints
- Backup and restore procedures
- Redis for job queues and caching

## Tech Stack

- **Primary Database**: PostgreSQL 15+
- **ORM**: Prisma (recommended) or Knex.js
- **Migrations**: Prisma Migrate or Knex migrations
- **Queue Storage**: Redis (Bull queue)
- **Connection Pooling**: Built-in Prisma or pg-pool

## Database Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('developer', 'project_manager', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Sites table
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,  -- Used for subdomain: slug.staging.domain.com
    live_url VARCHAR(500) NOT NULL,
    site_type VARCHAR(50) NOT NULL CHECK (site_type IN ('wordpress', 'shopify', 'webflow', 'squarespace', 'wix', 'static', 'custom')),
    connection_type VARCHAR(50) CHECK (connection_type IN ('crawl', 'ftp', 'sftp', 'ssh')),
    status VARCHAR(50) NOT NULL DEFAULT 'never_pulled' CHECK (status IN ('never_pulled', 'pulling', 'active', 'pushing', 'error')),
    staging_path VARCHAR(500),  -- Path on server: /var/www/greenshoe/staging/{slug}
    last_pulled_at TIMESTAMP WITH TIME ZONE,
    last_pushed_at TIMESTAMP WITH TIME ZONE,
    last_pull_checksum VARCHAR(64),  -- SHA-256 of live site at pull time (for change detection)
    total_size_bytes BIGINT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Site credentials (encrypted)
CREATE TABLE site_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    credential_type VARCHAR(50) NOT NULL CHECK (credential_type IN ('ftp', 'sftp', 'ssh', 'database')),
    host VARCHAR(255),
    port INTEGER,
    username_encrypted BYTEA NOT NULL,  -- AES-256-GCM encrypted
    password_encrypted BYTEA,            -- AES-256-GCM encrypted
    private_key_encrypted BYTEA,         -- For SSH key auth
    iv BYTEA NOT NULL,                   -- Initialization vector
    auth_tag BYTEA NOT NULL,             -- GCM authentication tag
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(site_id, credential_type)
);

-- Operations log
CREATE TABLE operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('pull', 'push', 'download', 'upload', 'archive', 'restore')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'rolled_back')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    message TEXT,
    error_details TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB  -- Additional operation-specific data
);

-- Archives (version history)
CREATE TABLE archives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    archive_path VARCHAR(500) NOT NULL,  -- Path to ZIP file
    size_bytes BIGINT NOT NULL,
    checksum VARCHAR(64) NOT NULL,  -- SHA-256 of archive
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(site_id, version_number)
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    operation_id UUID REFERENCES operations(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('success', 'error', 'warning', 'info')),
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_sites_status ON sites(status);
CREATE INDEX idx_sites_slug ON sites(slug);
CREATE INDEX idx_operations_site_id ON operations(site_id);
CREATE INDEX idx_operations_status ON operations(status);
CREATE INDEX idx_operations_started_at ON operations(started_at DESC);
CREATE INDEX idx_archives_site_id ON archives(site_id);
CREATE INDEX idx_notifications_user_id_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_credentials_updated_at BEFORE UPDATE ON site_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  developer
  project_manager
  admin
}

enum SiteType {
  wordpress
  shopify
  webflow
  squarespace
  wix
  static
  custom
}

enum ConnectionType {
  crawl
  ftp
  sftp
  ssh
}

enum SiteStatus {
  never_pulled
  pulling
  active
  pushing
  error
}

enum OperationType {
  pull
  push
  download
  upload
  archive
  restore
}

enum OperationStatus {
  pending
  in_progress
  completed
  failed
  rolled_back
}

enum NotificationType {
  success
  error
  warning
  info
}

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String    @map("password_hash")
  name         String
  role         Role
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  lastLoginAt  DateTime? @map("last_login_at")

  sites         Site[]
  operations    Operation[]
  archives      Archive[]
  notifications Notification[]

  @@map("users")
}

model Site {
  id               String          @id @default(uuid())
  name             String
  slug             String          @unique
  liveUrl          String          @map("live_url")
  siteType         SiteType        @map("site_type")
  connectionType   ConnectionType? @map("connection_type")
  status           SiteStatus      @default(never_pulled)
  stagingPath      String?         @map("staging_path")
  lastPulledAt     DateTime?       @map("last_pulled_at")
  lastPushedAt     DateTime?       @map("last_pushed_at")
  lastPullChecksum String?         @map("last_pull_checksum")
  totalSizeBytes   BigInt?         @map("total_size_bytes")
  createdBy        String?         @map("created_by")
  createdAt        DateTime        @default(now()) @map("created_at")
  updatedAt        DateTime        @updatedAt @map("updated_at")

  creator       User?            @relation(fields: [createdBy], references: [id])
  credentials   SiteCredential[]
  operations    Operation[]
  archives      Archive[]
  notifications Notification[]

  @@map("sites")
}

model SiteCredential {
  id                String   @id @default(uuid())
  siteId            String   @map("site_id")
  credentialType    String   @map("credential_type")
  host              String?
  port              Int?
  usernameEncrypted Bytes    @map("username_encrypted")
  passwordEncrypted Bytes?   @map("password_encrypted")
  privateKeyEncrypted Bytes? @map("private_key_encrypted")
  iv                Bytes
  authTag           Bytes    @map("auth_tag")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  site Site @relation(fields: [siteId], references: [id], onDelete: Cascade)

  @@unique([siteId, credentialType])
  @@map("site_credentials")
}

model Operation {
  id            String          @id @default(uuid())
  siteId        String          @map("site_id")
  userId        String?         @map("user_id")
  operationType OperationType   @map("operation_type")
  status        OperationStatus
  progress      Int             @default(0)
  message       String?
  errorDetails  String?         @map("error_details")
  startedAt     DateTime        @default(now()) @map("started_at")
  completedAt   DateTime?       @map("completed_at")
  metadata      Json?

  site          Site           @relation(fields: [siteId], references: [id], onDelete: Cascade)
  user          User?          @relation(fields: [userId], references: [id])
  notifications Notification[]

  @@map("operations")
}

model Archive {
  id            String   @id @default(uuid())
  siteId        String   @map("site_id")
  versionNumber Int      @map("version_number")
  archivePath   String   @map("archive_path")
  sizeBytes     BigInt   @map("size_bytes")
  checksum      String
  createdBy     String?  @map("created_by")
  createdAt     DateTime @default(now()) @map("created_at")

  site    Site  @relation(fields: [siteId], references: [id], onDelete: Cascade)
  creator User? @relation(fields: [createdBy], references: [id])

  @@unique([siteId, versionNumber])
  @@map("archives")
}

model Notification {
  id          String           @id @default(uuid())
  userId      String           @map("user_id")
  siteId      String?          @map("site_id")
  operationId String?          @map("operation_id")
  title       String
  message     String
  type        NotificationType
  read        Boolean          @default(false)
  createdAt   DateTime         @default(now()) @map("created_at")

  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  site      Site?      @relation(fields: [siteId], references: [id], onDelete: SetNull)
  operation Operation? @relation(fields: [operationId], references: [id], onDelete: SetNull)

  @@map("notifications")
}
```

## Common Queries

```typescript
// Get all sites with latest operation status
const sitesWithStatus = await prisma.site.findMany({
  include: {
    operations: {
      orderBy: { startedAt: 'desc' },
      take: 1,
    },
    _count: {
      select: { archives: true },
    },
  },
});

// Get archives for a site (enforce 5 limit)
const archives = await prisma.archive.findMany({
  where: { siteId },
  orderBy: { versionNumber: 'desc' },
  take: 5,
});

// Delete oldest archives beyond limit
const archivesToDelete = await prisma.archive.findMany({
  where: { siteId },
  orderBy: { versionNumber: 'asc' },
  skip: 5,  // Keep newest 5
});

// Unread notifications count
const unreadCount = await prisma.notification.count({
  where: { userId, read: false },
});

// Operations log with pagination
const operations = await prisma.operation.findMany({
  where: { siteId },
  orderBy: { startedAt: 'desc' },
  skip: (page - 1) * pageSize,
  take: pageSize,
  include: { user: { select: { name: true, email: true } } },
});
```

## Redis Usage (Bull Queues)

```typescript
// Job queue for pull/push operations
import Queue from 'bull';

const pullQueue = new Queue('pull-operations', process.env.REDIS_URL);
const pushQueue = new Queue('push-operations', process.env.REDIS_URL);

// Add job with timeout
await pullQueue.add(
  { siteId, userId },
  {
    timeout: 30 * 60 * 1000,  // 30 minutes
    attempts: 1,  // No retries for main operation
    removeOnComplete: 100,  // Keep last 100 completed
    removeOnFail: 100,
  }
);

// Job progress updates
job.progress(45);  // Updates progress in real-time
```

## Data Integrity

```typescript
// Transaction for archive creation with cleanup
await prisma.$transaction(async (tx) => {
  // Create new archive
  const archive = await tx.archive.create({
    data: {
      siteId,
      versionNumber: nextVersion,
      archivePath,
      sizeBytes,
      checksum,
      createdBy: userId,
    },
  });

  // Delete archives beyond limit (keep newest 5)
  const oldArchives = await tx.archive.findMany({
    where: { siteId },
    orderBy: { versionNumber: 'asc' },
    skip: 5,
  });

  if (oldArchives.length > 0) {
    await tx.archive.deleteMany({
      where: { id: { in: oldArchives.map(a => a.id) } },
    });
  }

  return archive;
});
```

## Backup Procedures

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR=/backups/db
DATE=$(date +%Y%m%d_%H%M%S)

# Dump database
pg_dump -U greenshoe -Fc greenshoe > $BACKUP_DIR/greenshoe_$DATE.dump

# Verify backup
pg_restore --list $BACKUP_DIR/greenshoe_$DATE.dump > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "Backup verified: greenshoe_$DATE.dump"
else
  echo "ERROR: Backup verification failed!"
  exit 1
fi

# Cleanup old backups (keep 7 days)
find $BACKUP_DIR -name "*.dump" -mtime +7 -delete
```

```typescript
// Restore from backup
async function restoreDatabase(backupPath: string): Promise<void> {
  // This is typically done via CLI, not application code
  // pg_restore -U greenshoe -d greenshoe --clean backup.dump
}
```

## Performance Considerations

1. **Connection Pooling**: Prisma handles this automatically
2. **Indexes**: Created for common query patterns
3. **Pagination**: Always use skip/take for lists
4. **Batch Operations**: Use createMany/deleteMany
5. **JSON Columns**: Use sparingly, prefer structured data

## Constraints Enforced

- Site size: Check `total_size_bytes < 2GB` in application
- Archive limit: 5 per site (enforced in transaction)
- Unique slugs: Database constraint
- Valid enums: Database CHECK constraints
- Referential integrity: Foreign keys with CASCADE/SET NULL

## Reference

Spec: `specs/internal-staging-tool.md` - Data requirements
Plan: `specs/internal-staging-tool-plan.md` - Tasks 2, 3
