const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticate);

// TODO: call ML service, persist/read susceptibility_scores
router.post('/compute', authorize('admin'), (req, res) => res.status(501).json({ message: 'Not implemented' }));
router.get('/employee/:employeeId', (req, res) => res.status(501).json({ message: 'Not implemented' }));

module.exports = router;
