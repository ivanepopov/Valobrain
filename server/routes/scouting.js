const express = require('express');
const router = express.Router();
const reportQueue = require('../services/report-queue');
const scoutingWorker = require('../services/scouting-worker');

/**
 * POST /api/scouting/:seriesId/report
 * Initiates a new report generation job.
 * Query Params: ?team=TeamName
 */
router.post('/:seriesId/report', async (req, res) => {
    const { seriesId } = req.params;
    const { team } = req.query;

    if (!team) {
        return res.status(400).json({ error: "Team parameter is required (?team=TeamName)" });
    }

    try {
        // Enqueue Job
        const jobId = reportQueue.addJob(seriesId, team);
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

module.exports = router;
