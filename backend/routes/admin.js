const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const User = require('../models/UserModel');
const Resource = require('../models/ResourceModel');

// GET /api/admin/analytics - Fetch aggregated analytics data
router.get('/analytics', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        // 1. Most Downloaded Resources (Top 10)
        const topResources = await Resource.find({ downloadCount: { $gt: 0 } })
                                            .sort({ downloadCount: -1 })
                                            .limit(10)
                                            .select('title downloadCount'); // Select only needed fields

        // 2. Quizzes Taken Per Subject
        // $unwind breaks the quizHistory array into individual documents
        // $group groups them by subject and counts
        // $sort sorts by count descending
        const quizzesPerSubject = await User.aggregate([
            { $unwind: '$quizHistory' },
            { $group: { 
                _id: '$quizHistory.subject', // Group by subject
                count: { $sum: 1 }          // Count quizzes per subject
            }},
            { $sort: { count: -1 } }          // Sort by count descending
        ]);

        // 3. Total Donations Received
        // $group calculates the sum of totalContribution across all users
        const totalDonationsResult = await User.aggregate([
            { $group: {
                _id: null, // Group all users together
                total: { $sum: '$totalContribution' }
            }}
        ]);
        const totalDonations = totalDonationsResult.length > 0 ? totalDonationsResult[0].total : 0;

        // Combine results
        const analytics = {
            topDownloadedResources: topResources,
            quizzesTakenPerSubject: quizzesPerSubject,
            totalDonationsReceived: totalDonations
        };

        res.json(analytics);

    } catch (error) {
        console.error('Error fetching admin analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
});

// Add other admin-specific routes here later if needed

module.exports = router; 