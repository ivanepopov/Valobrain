const express = require('express');
const router = express.Router();
const reportQueue = require('../services/report-queue');
const scoutingWorker = require('../services/scouting-worker');

/**
 * POST /api/scouting/:seriesId/report
 * Initiates a new report generation job.
 * Query Params: ?team=TeamName&map=MapName&agent=gemini&model=gemini-1.5-flash-002&endpoint=url (map, agent, model, endpoint are optional)
 */
router.post('/:seriesId/report', async (req, res) => {
    const { seriesId } = req.params;
    const { team, map, agent, model, endpoint } = req.query;

    // Extract user-provided API key from header (optional)
    const userApiKey = req.headers['x-gemini-api-key'] || 
                       req.headers['x-openai-api-key'] || 
                       req.headers['x-claude-api-key'] || 
                       req.headers['x-ollama-api-key'] || 
                       null;

    if (!team) {
        return res.status(400).json({ error: "Team parameter is required (?team=TeamName)" });
    }

    // Normalize map parameter (null if not provided or 'all')
    const targetMap = (map && map.toLowerCase() !== 'all') ? map : null;

    try {
        // Enqueue Job with optional map parameter and API key
        const jobId = reportQueue.addJob(seriesId, team, targetMap, userApiKey, 'v2-two-pass', agent || 'gemini', model, endpoint);
        const job = reportQueue.getJob(jobId);

        // Trigger Worker (Fire and Forget)
        // We do NOT await this, so the response is immediate
        if (job.status === reportQueue.JOB_STATUS.PENDING) {
            scoutingWorker.processJob(jobId).catch(err => {
                console.error("Critical Worker Error (Uncaught):", err);
            });
        }

        res.json({
            success: true,
            jobId: jobId,
            status: job.status,
            message: "Report generation started."
        });

    } catch (error) {
        console.error("Scouting Route Error:", error);
        res.status(500).json({ error: "Failed to initiate report generation." });
    }
});

/**
 * GET /api/scouting/jobs/:jobId
 * Checks status of a job.
 */
router.get('/jobs/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = reportQueue.getJob(jobId);

    if (!job) {
        return res.status(404).json({ error: "Job not found" });
    }

    res.json(job);
});

/**
 * DELETE /api/scouting/jobs/:jobId
 * Cancels a job.
 */
router.delete('/jobs/:jobId', (req, res) => {
    const { jobId } = req.params;
    const success = reportQueue.cancelJob(jobId);

    if (success) {
        res.json({ success: true, message: "Job cancelled" });
    } else {
        res.status(404).json({ error: "Job not found or already completed" });
    }
});

/**
 * POST /api/scouting/jobs/:jobId/abort
 * Aborts a running job.
 */
router.post('/jobs/:jobId/abort', (req, res) => {
    const { jobId } = req.params;
    const success = reportQueue.abortJob(jobId);

    if (success) {
        res.json({ success: true, message: "Job aborted successfully." });
    } else {
        res.status(404).json({ error: "Job not found or not in a state that can be aborted." });
    }
});

module.exports = router;
