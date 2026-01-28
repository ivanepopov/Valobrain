/**
 * Report Generation Job Queue
 * 
 * Manages async jobs for the Two-Pass AI Pipeline.
 * Stores job status and results in-memory (reset on server restart).
 */

const crypto = require('crypto');

// In-memory job store
// Key: jobId, Value: Job Object
const jobs = new Map();

// Helper to generate simple IDs
const generateJobId = () => crypto.randomUUID();

/**
 * Job Status Enums
 */
const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Add a new job to the queue
 * @param {string} seriesId - Match Series ID
 * @param {string} teamName - Target Team
 * @param {string} targetMap - Specific map to analyze (null = all maps/Game 1)
 * @param {string} pipelineVersion - Version tag for cache busting
 * @returns {string} jobId
 */
function addJob(seriesId, teamName, targetMap = null, pipelineVersion = 'v2-two-pass') {
  // Check for existing pending/processing job for same parameters
  for (const [id, job] of jobs.entries()) {
    if (
      job.seriesId === seriesId &&
      job.teamName === teamName &&
      job.targetMap === targetMap &&
      job.version === pipelineVersion &&
      (job.status === JOB_STATUS.PENDING || job.status === JOB_STATUS.PROCESSING)
    ) {
      return id;
    }
  }

  const jobId = generateJobId();

  jobs.set(jobId, {
    id: jobId,
    seriesId,
    teamName,
    targetMap, // null = all maps (Game 1), or specific map name
    version: pipelineVersion,
    status: JOB_STATUS.PENDING,
    progress: 0,
    created_at: new Date(),
    stages: {
      digest: 'pending',
      analyst: 'pending',
      writer: 'pending'
    },
    result: null,
    error: null
  });

  return jobId;
}

/**
 * Get job details
 * @param {string} jobId 
 */
function getJob(jobId) {
  return jobs.get(jobId);
}

/**
 * Update job progress/status
 */
function updateJob(jobId, updates) {
  const job = jobs.get(jobId);
  if (!job) return;

  Object.assign(job, updates);
  jobs.set(jobId, job);
}

/**
 * Find oldest pending job to process
 */
function getNextJob() {
  // Simple FIFO
  for (const [id, job] of jobs.entries()) {
    if (job.status === JOB_STATUS.PENDING) {
      return job;
    }
  }
  return null;
}

module.exports = {
  addJob,
  getJob,
  updateJob,
  getNextJob,
  JOB_STATUS
};
