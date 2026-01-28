#!/usr/bin/env node

/**
 * Utility to update task progress
 *
 * Usage:
 *   node update-progress.js complete 1
 *   node update-progress.js start 2
 *   node update-progress.js criteria 1 0
 *   node update-progress.js activity "Completed Task 1"
 */

const fs = require('fs');
const path = require('path');

const PROGRESS_FILE = path.join(__dirname, 'progress.json');

function loadProgress() {
  const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
  return JSON.parse(data);
}

function saveProgress(data) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
  console.log('✓ Progress updated');
}

function findTaskById(data, taskId) {
  for (const phase of data.phases) {
    const task = phase.tasks.find(t => t.id === parseInt(taskId));
    if (task) return task;
  }
  return null;
}

function updateTaskStatus(taskId, status) {
  const data = loadProgress();
  const task = findTaskById(data, taskId);

  if (!task) {
    console.error(`Task ${taskId} not found`);
    return;
  }

  task.status = status;

  if (status === 'completed') {
    data.completedTasks++;
    // Mark all criteria as completed
    task.completedCriteria = task.acceptanceCriteria.map((_, i) => i);
  }

  addActivity(data, `Task ${taskId} marked as ${status}: ${task.name}`);
  saveProgress(data);
}

function updateCriteria(taskId, criteriaIndex) {
  const data = loadProgress();
  const task = findTaskById(data, taskId);

  if (!task) {
    console.error(`Task ${taskId} not found`);
    return;
  }

  const index = parseInt(criteriaIndex);
  if (!task.completedCriteria.includes(index)) {
    task.completedCriteria.push(index);
  }

  addActivity(data, `Task ${taskId}: Completed criteria "${task.acceptanceCriteria[index]}"`);
  saveProgress(data);
}

function addActivity(data, description) {
  const today = new Date().toISOString().split('T')[0];
  data.recentActivity.unshift({
    date: today,
    description: description
  });

  // Keep only last 20 activities
  data.recentActivity = data.recentActivity.slice(0, 20);
}

function logActivity(message) {
  const data = loadProgress();
  addActivity(data, message);
  saveProgress(data);
}

function showHelp() {
  console.log(`
GreenShoe Progress Update Utility

Usage:
  node update-progress.js <command> [args]

Commands:
  start <taskId>              Mark task as in-progress
  complete <taskId>           Mark task as completed
  criteria <taskId> <index>   Mark acceptance criteria as completed
  activity <message>          Add activity log entry

Examples:
  node update-progress.js start 1
  node update-progress.js complete 1
  node update-progress.js criteria 1 0
  node update-progress.js activity "Started Phase 2"
  `);
}

// Parse command line arguments
const [,, command, ...args] = process.argv;

switch (command) {
  case 'start':
    updateTaskStatus(args[0], 'in-progress');
    break;
  case 'complete':
    updateTaskStatus(args[0], 'completed');
    break;
  case 'criteria':
    updateCriteria(args[0], args[1]);
    break;
  case 'activity':
    logActivity(args.join(' '));
    break;
  case 'help':
  default:
    showHelp();
}
