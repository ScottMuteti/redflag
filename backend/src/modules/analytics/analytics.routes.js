const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticate);

// TODO: aggregate simulation_attempts, susceptibility_scores, training completion
router.get('/organization', authorize('admin'), (req, res) => res.status(501).json({ message: 'Not implemented' }));
router.get('/employee/:id', (req, res) => res.status(501).json({ message: 'Not implemented' }));

module.exports = router;
