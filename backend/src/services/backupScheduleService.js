import { backupQueue } from '../jobs/backupQueue.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../utils/db.js';

/**
 * Schedule a repeatable backup job for a site
 * @param {string} siteId - Site ID
 * @param {string} userId - User who scheduled the backup
 * @param {string} frequency - Backup frequency: 'daily', 'weekly', 'monthly'
 * @param {string} time - Time in HH:mm format (24-hour)
 * @param {number} dayOfWeek - Day of week (0-6, 0=Sunday) for weekly backups
 * @param {number} dayOfMonth - Day of month (1-31) for monthly backups
 */
export async function scheduleBackup(siteId, userId, { frequency, time, dayOfWeek, dayOfMonth }) {
  try {
    // Validate inputs
    if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
      throw new Error('Invalid frequency. Must be daily, weekly, or monthly');
    }

    if (!time || !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
      throw new Error('Invalid time format. Use HH:mm (24-hour)');
    }

    // Parse time
    const [hour, minute] = time.split(':').map(Number);

    // Build cron expression based on frequency
    let cron;
    switch (frequency) {
      case 'daily':
        // Every day at specified time
        cron = `${minute} ${hour} * * *`;
        break;
      case 'weekly':
        // Every week on specified day at specified time
        if (dayOfWeek === undefined || dayOfWeek < 0 || dayOfWeek > 6) {
          throw new Error('dayOfWeek must be 0-6 for weekly backups');
        }
        cron = `${minute} ${hour} * * ${dayOfWeek}`;
        break;
      case 'monthly':
        // Every month on specified day at specified time
        if (dayOfMonth === undefined || dayOfMonth < 1 || dayOfMonth > 31) {
          throw new Error('dayOfMonth must be 1-31 for monthly backups');
        }
        cron = `${minute} ${hour} ${dayOfMonth} * *`;
        break;
    }

    logger.info(`Scheduling ${frequency} backup for site ${siteId}: ${cron}`);

    // Remove any existing scheduled backup for this site
    await unscheduleBackup(siteId);

    // Add repeatable job to queue
    await backupQueue.add(
      {
        siteId,
        userId,
        scheduled: true
      },
      {
        jobId: `backup-schedule-${siteId}`,
        repeat: {
          cron,
          tz: 'UTC' // Use UTC timezone
        }
      }
    );

    // Store schedule in database
    await prisma.site.update({
      where: { id: siteId },
      data: {
        backupSchedule: JSON.stringify({
          frequency,
          time,
          dayOfWeek,
          dayOfMonth,
          cron,
          enabled: true,
          scheduledBy: userId,
          scheduledAt: new Date().toISOString()
        })
      }
    });

    logger.info(`Backup scheduled successfully for site ${siteId}`);

    return {
      success: true,
      frequency,
      time,
      cron,
      message: `Backup scheduled ${frequency} at ${time} UTC`
    };

  } catch (error) {
    logger.error(`Failed to schedule backup for site ${siteId}:`, error.message);
    throw new Error(`Failed to schedule backup: ${error.message}`);
  }
}

/**
 * Unschedule a backup for a site
 */
export async function unscheduleBackup(siteId) {
  try {
    logger.info(`Unscheduling backup for site ${siteId}`);

    // Remove repeatable job from queue
    const repeatableJobs = await backupQueue.getRepeatableJobs();
    const jobToRemove = repeatableJobs.find(job => job.id === `backup-schedule-${siteId}`);

    if (jobToRemove) {
      await backupQueue.removeRepeatableByKey(jobToRemove.key);
      logger.info(`Removed scheduled backup job for site ${siteId}`);
    }

    // Update database - use updateMany to avoid error if site doesn't exist
    await prisma.site.updateMany({
      where: { id: siteId },
      data: {
        backupSchedule: null
      }
    });

    return {
      success: true,
      message: 'Backup schedule removed'
    };

  } catch (error) {
    logger.error(`Failed to unschedule backup for site ${siteId}:`, error.message);
    throw new Error(`Failed to unschedule backup: ${error.message}`);
  }
}

/**
 * Get backup schedule for a site
 */
export async function getBackupSchedule(siteId) {
  try {
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { backupSchedule: true }
    });

    if (!site || !site.backupSchedule) {
      return {
        enabled: false,
        message: 'No backup schedule configured'
      };
    }

    const schedule = JSON.parse(site.backupSchedule);

    // Get next scheduled time from queue
    const repeatableJobs = await backupQueue.getRepeatableJobs();
    const scheduledJob = repeatableJobs.find(job => job.id === `backup-schedule-${siteId}`);

    return {
      enabled: schedule.enabled,
      frequency: schedule.frequency,
      time: schedule.time,
      dayOfWeek: schedule.dayOfWeek,
      dayOfMonth: schedule.dayOfMonth,
      cron: schedule.cron,
      scheduledBy: schedule.scheduledBy,
      scheduledAt: schedule.scheduledAt,
      nextRun: scheduledJob ? new Date(scheduledJob.next) : null
    };

  } catch (error) {
    logger.error(`Failed to get backup schedule for site ${siteId}:`, error.message);
    throw new Error(`Failed to get backup schedule: ${error.message}`);
  }
}

/**
 * Trigger a manual backup (non-scheduled)
 */
export async function triggerManualBackup(siteId, userId) {
  try {
    logger.info(`Triggering manual backup for site ${siteId}`);

    const job = await backupQueue.add(
      {
        siteId,
        userId,
        scheduled: false
      },
      {
        jobId: `backup-manual-${siteId}-${Date.now()}`
      }
    );

    return {
      success: true,
      jobId: job.id,
      message: 'Manual backup started'
    };

  } catch (error) {
    logger.error(`Failed to trigger manual backup for site ${siteId}:`, error.message);
    throw new Error(`Failed to trigger manual backup: ${error.message}`);
  }
}

/**
 * Get list of all scheduled backups
 */
export async function getAllScheduledBackups() {
  try {
    const repeatableJobs = await backupQueue.getRepeatableJobs();

    return repeatableJobs.map(job => ({
      jobId: job.id,
      siteId: job.id.replace('backup-schedule-', ''),
      cron: job.cron,
      nextRun: new Date(job.next),
      tz: job.tz
    }));

  } catch (error) {
    logger.error('Failed to get scheduled backups:', error.message);
    throw new Error(`Failed to get scheduled backups: ${error.message}`);
  }
}
