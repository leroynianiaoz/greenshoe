/**
 * Unit Tests for Backup Schedule Service (Phase 9)
 *
 * Tests cron generation, schedule management, repeatable jobs,
 * and backup triggering
 */

import {
  scheduleBackup,
  unscheduleBackup,
  getBackupSchedule,
  triggerManualBackup,
  getAllScheduledBackups
} from '../../src/services/backupScheduleService.js';
import {
  createTestUser,
  createTestSite,
  cleanAllTestData,
  prisma
} from '../utils/testHelpers.js';
import { testBackupSchedules } from '../utils/fixtures.js';
import { backupQueue } from '../../src/jobs/backupQueue.js';

describe('Backup Schedule Service Unit Tests', () => {
  let testUser;
  let testSite;

  beforeEach(async () => {
    // Create test user and site before each test
    // (global afterEach cleans database after each test)
    const userResult = await createTestUser('PROJECT_MANAGER');
    testUser = userResult.user;

    testSite = await createTestSite(testUser.id, {
      name: 'Backup Test Site',
      status: 'ACTIVE'
    });
  });

  afterAll(async () => {
    // Clean up queue
    try {
      const repeatableJobs = await backupQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        await backupQueue.removeRepeatableByKey(job.key);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterEach(async () => {
    // Clean up any scheduled backups after each test
    try {
      if (testSite && testSite.id) {
        await unscheduleBackup(testSite.id);
      }
    } catch (error) {
      // Ignore errors
    }
  });

  describe('scheduleBackup()', () => {
    test('schedules daily backup successfully', async () => {
      const result = await scheduleBackup(
        testSite.id,
        testUser.id,
        testBackupSchedules.daily
      );

      expect(result.success).toBe(true);
      expect(result.frequency).toBe('daily');
      expect(result.time).toBe('02:00');
      expect(result.cron).toBe('0 2 * * *');
      expect(result.message).toContain('daily');
      expect(result.message).toContain('02:00 UTC');
    });

    test('schedules weekly backup successfully', async () => {
      const result = await scheduleBackup(
        testSite.id,
        testUser.id,
        testBackupSchedules.weekly
      );

      expect(result.success).toBe(true);
      expect(result.frequency).toBe('weekly');
      expect(result.time).toBe('03:00');
      expect(result.cron).toBe('0 3 * * 0'); // Sunday at 3:00 AM
    });

    test('schedules monthly backup successfully', async () => {
      const result = await scheduleBackup(
        testSite.id,
        testUser.id,
        testBackupSchedules.monthly
      );

      expect(result.success).toBe(true);
      expect(result.frequency).toBe('monthly');
      expect(result.time).toBe('04:00');
      expect(result.cron).toBe('0 4 1 * *'); // 1st of month at 4:00 AM
    });

    test('stores schedule in database', async () => {
      await scheduleBackup(
        testSite.id,
        testUser.id,
        testBackupSchedules.daily
      );

      const site = await prisma.site.findUnique({
        where: { id: testSite.id }
      });

      expect(site.backupSchedule).toBeTruthy();

      const schedule = JSON.parse(site.backupSchedule);
      expect(schedule.frequency).toBe('daily');
      expect(schedule.time).toBe('02:00');
      expect(schedule.enabled).toBe(true);
      expect(schedule.scheduledBy).toBe(testUser.id);
      expect(schedule.cron).toBe('0 2 * * *');
    });

    test('creates repeatable job in queue', async () => {
      await scheduleBackup(
        testSite.id,
        testUser.id,
        testBackupSchedules.daily
      );

      const repeatableJobs = await backupQueue.getRepeatableJobs();
      const job = repeatableJobs.find(j => j.id === `backup-schedule-${testSite.id}`);

      expect(job).toBeDefined();
      expect(job.cron).toBe('0 2 * * *');
      expect(job.tz).toBe('UTC');
    });

    test('replaces existing schedule when scheduling new one', async () => {
      // Schedule daily first
      await scheduleBackup(
        testSite.id,
        testUser.id,
        testBackupSchedules.daily
      );

      // Schedule weekly (should replace daily)
      await scheduleBackup(
        testSite.id,
        testUser.id,
        testBackupSchedules.weekly
      );

      const site = await prisma.site.findUnique({
        where: { id: testSite.id }
      });

      const schedule = JSON.parse(site.backupSchedule);
      expect(schedule.frequency).toBe('weekly');
      expect(schedule.cron).toBe('0 3 * * 0');

      // Should only have one repeatable job
      const repeatableJobs = await backupQueue.getRepeatableJobs();
      const jobs = repeatableJobs.filter(j => j.id === `backup-schedule-${testSite.id}`);
      expect(jobs.length).toBe(1);
    });

    test('validates frequency (rejects invalid)', async () => {
      await expect(
        scheduleBackup(testSite.id, testUser.id, {
          frequency: 'invalid',
          time: '02:00'
        })
      ).rejects.toThrow('Invalid frequency');
    });

    test('validates time format (rejects invalid)', async () => {
      await expect(
        scheduleBackup(testSite.id, testUser.id, {
          frequency: 'daily',
          time: '25:00' // Invalid hour
        })
      ).rejects.toThrow('Invalid time format');

      await expect(
        scheduleBackup(testSite.id, testUser.id, {
          frequency: 'daily',
          time: '02:60' // Invalid minute
        })
      ).rejects.toThrow('Invalid time format');

      await expect(
        scheduleBackup(testSite.id, testUser.id, {
          frequency: 'daily',
          time: 'not-a-time'
        })
      ).rejects.toThrow('Invalid time format');
    });

    test('validates dayOfWeek for weekly backups', async () => {
      await expect(
        scheduleBackup(testSite.id, testUser.id, {
          frequency: 'weekly',
          time: '02:00',
          dayOfWeek: -1 // Invalid
        })
      ).rejects.toThrow('dayOfWeek must be 0-6');

      await expect(
        scheduleBackup(testSite.id, testUser.id, {
          frequency: 'weekly',
          time: '02:00',
          dayOfWeek: 7 // Invalid
        })
      ).rejects.toThrow('dayOfWeek must be 0-6');

      await expect(
        scheduleBackup(testSite.id, testUser.id, {
          frequency: 'weekly',
          time: '02:00'
          // Missing dayOfWeek
        })
      ).rejects.toThrow('dayOfWeek must be 0-6');
    });

    test('validates dayOfMonth for monthly backups', async () => {
      await expect(
        scheduleBackup(testSite.id, testUser.id, {
          frequency: 'monthly',
          time: '02:00',
          dayOfMonth: 0 // Invalid
        })
      ).rejects.toThrow('dayOfMonth must be 1-31');

      await expect(
        scheduleBackup(testSite.id, testUser.id, {
          frequency: 'monthly',
          time: '02:00',
          dayOfMonth: 32 // Invalid
        })
      ).rejects.toThrow('dayOfMonth must be 1-31');

      await expect(
        scheduleBackup(testSite.id, testUser.id, {
          frequency: 'monthly',
          time: '02:00'
          // Missing dayOfMonth
        })
      ).rejects.toThrow('dayOfMonth must be 1-31');
    });

    test('generates correct cron for different times', async () => {
      // Morning
      let result = await scheduleBackup(testSite.id, testUser.id, {
        frequency: 'daily',
        time: '08:30'
      });
      expect(result.cron).toBe('30 8 * * *');

      // Afternoon
      result = await scheduleBackup(testSite.id, testUser.id, {
        frequency: 'daily',
        time: '14:45'
      });
      expect(result.cron).toBe('45 14 * * *');

      // Midnight
      result = await scheduleBackup(testSite.id, testUser.id, {
        frequency: 'daily',
        time: '00:00'
      });
      expect(result.cron).toBe('0 0 * * *');

      // Just before midnight
      result = await scheduleBackup(testSite.id, testUser.id, {
        frequency: 'daily',
        time: '23:59'
      });
      expect(result.cron).toBe('59 23 * * *');
    });

    test('generates correct cron for all days of week', async () => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      for (let i = 0; i < 7; i++) {
        const result = await scheduleBackup(testSite.id, testUser.id, {
          frequency: 'weekly',
          time: '02:00',
          dayOfWeek: i
        });
        expect(result.cron).toBe(`0 2 * * ${i}`);
      }
    });

    test('generates correct cron for all days of month', async () => {
      for (let day = 1; day <= 31; day++) {
        const result = await scheduleBackup(testSite.id, testUser.id, {
          frequency: 'monthly',
          time: '02:00',
          dayOfMonth: day
        });
        expect(result.cron).toBe(`0 2 ${day} * *`);
      }
    });
  });

  describe('unscheduleBackup()', () => {
    test('removes scheduled backup successfully', async () => {
      // Schedule first
      await scheduleBackup(testSite.id, testUser.id, testBackupSchedules.daily);

      // Unschedule
      const result = await unscheduleBackup(testSite.id);

      expect(result.success).toBe(true);
      expect(result.message).toContain('removed');
    });

    test('removes backup schedule from database', async () => {
      // Schedule first
      await scheduleBackup(testSite.id, testUser.id, testBackupSchedules.daily);

      // Unschedule
      await unscheduleBackup(testSite.id);

      const site = await prisma.site.findUnique({
        where: { id: testSite.id }
      });

      expect(site.backupSchedule).toBeNull();
    });

    test('removes repeatable job from queue', async () => {
      // Schedule first
      await scheduleBackup(testSite.id, testUser.id, testBackupSchedules.daily);

      // Verify job exists
      let repeatableJobs = await backupQueue.getRepeatableJobs();
      let job = repeatableJobs.find(j => j.id === `backup-schedule-${testSite.id}`);
      expect(job).toBeDefined();

      // Unschedule
      await unscheduleBackup(testSite.id);

      // Verify job is removed
      repeatableJobs = await backupQueue.getRepeatableJobs();
      job = repeatableJobs.find(j => j.id === `backup-schedule-${testSite.id}`);
      expect(job).toBeUndefined();
    });

    test('handles unscheduling when no schedule exists', async () => {
      // Should not throw error
      const result = await unscheduleBackup(testSite.id);
      expect(result.success).toBe(true);
    });
  });

  describe('getBackupSchedule()', () => {
    test('retrieves existing backup schedule', async () => {
      // Schedule first
      await scheduleBackup(testSite.id, testUser.id, testBackupSchedules.weekly);

      const result = await getBackupSchedule(testSite.id);

      expect(result.enabled).toBe(true);
      expect(result.frequency).toBe('weekly');
      expect(result.time).toBe('03:00');
      expect(result.dayOfWeek).toBe(0);
      expect(result.cron).toBe('0 3 * * 0');
      expect(result.scheduledBy).toBe(testUser.id);
      expect(result.scheduledAt).toBeDefined();
    });

    test('returns disabled status when no schedule exists', async () => {
      const result = await getBackupSchedule(testSite.id);

      expect(result.enabled).toBe(false);
      expect(result.message).toContain('No backup schedule');
    });

    test('includes next run time from queue', async () => {
      await scheduleBackup(testSite.id, testUser.id, testBackupSchedules.daily);

      const result = await getBackupSchedule(testSite.id);

      expect(result.nextRun).toBeDefined();
      expect(result.nextRun instanceof Date).toBe(true);
    });
  });

  describe('triggerManualBackup()', () => {
    test('triggers manual backup successfully', async () => {
      const result = await triggerManualBackup(testSite.id, testUser.id);

      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
      expect(result.message).toContain('Manual backup started');
    });

    test('adds job to queue with correct data', async () => {
      const result = await triggerManualBackup(testSite.id, testUser.id);

      const job = await backupQueue.getJob(result.jobId);

      expect(job).toBeDefined();
      expect(job.data.siteId).toBe(testSite.id);
      expect(job.data.userId).toBe(testUser.id);
      expect(job.data.scheduled).toBe(false);
    });

    test('generates unique job IDs for multiple manual backups', async () => {
      const result1 = await triggerManualBackup(testSite.id, testUser.id);
      const result2 = await triggerManualBackup(testSite.id, testUser.id);

      expect(result1.jobId).not.toBe(result2.jobId);
      expect(result1.jobId).toContain('backup-manual');
      expect(result2.jobId).toContain('backup-manual');
    });
  });

  describe('getAllScheduledBackups()', () => {
    test('retrieves all scheduled backups', async () => {
      // Create second site
      const site2 = await createTestSite(testUser.id, {
        name: 'Second Backup Site'
      });

      // Schedule backups for both sites
      await scheduleBackup(testSite.id, testUser.id, testBackupSchedules.daily);
      await scheduleBackup(site2.id, testUser.id, testBackupSchedules.weekly);

      const result = await getAllScheduledBackups();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);

      const backup1 = result.find(b => b.siteId === testSite.id);
      const backup2 = result.find(b => b.siteId === site2.id);

      expect(backup1).toBeDefined();
      expect(backup1.cron).toBe('0 2 * * *');
      expect(backup1.nextRun instanceof Date).toBe(true);

      expect(backup2).toBeDefined();
      expect(backup2.cron).toBe('0 3 * * 0');
    });

    test('returns empty array when no backups scheduled', async () => {
      // Clean all schedules
      const repeatableJobs = await backupQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        await backupQueue.removeRepeatableByKey(job.key);
      }

      const result = await getAllScheduledBackups();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('Integration: Schedule Lifecycle', () => {
    test('complete schedule lifecycle: create, retrieve, modify, delete', async () => {
      // 1. Create daily schedule
      let result = await scheduleBackup(testSite.id, testUser.id, testBackupSchedules.daily);
      expect(result.frequency).toBe('daily');

      // 2. Retrieve schedule
      let schedule = await getBackupSchedule(testSite.id);
      expect(schedule.enabled).toBe(true);
      expect(schedule.frequency).toBe('daily');

      // 3. Modify to weekly
      result = await scheduleBackup(testSite.id, testUser.id, testBackupSchedules.weekly);
      expect(result.frequency).toBe('weekly');

      schedule = await getBackupSchedule(testSite.id);
      expect(schedule.frequency).toBe('weekly');

      // 4. Delete schedule
      result = await unscheduleBackup(testSite.id);
      expect(result.success).toBe(true);

      schedule = await getBackupSchedule(testSite.id);
      expect(schedule.enabled).toBe(false);
    });

    test('scheduled backups and manual backups are independent', async () => {
      // Schedule automatic backup
      await scheduleBackup(testSite.id, testUser.id, testBackupSchedules.daily);

      // Trigger manual backup
      const manualResult = await triggerManualBackup(testSite.id, testUser.id);
      expect(manualResult.success).toBe(true);

      // Scheduled backup should still exist
      const schedule = await getBackupSchedule(testSite.id);
      expect(schedule.enabled).toBe(true);

      // Queue should have repeatable job AND one-time job
      const repeatableJobs = await backupQueue.getRepeatableJobs();
      const scheduledJob = repeatableJobs.find(j => j.id === `backup-schedule-${testSite.id}`);
      expect(scheduledJob).toBeDefined();

      const manualJob = await backupQueue.getJob(manualResult.jobId);
      expect(manualJob).toBeDefined();
      expect(manualJob.data.scheduled).toBe(false);
    });
  });
});
