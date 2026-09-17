const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticate);

// TODO: adaptive assignment based on susceptibility score
router.get('/assignments', (req, res) => res.status(501).json({ message: 'Not implemented' }));
router.post('/assign', authorize('admin'), (req, res) => res.status(501).json({ message: 'Not implemented' }));
router.post('/assignments/:id/complete', (req, res) => res.status(501).json({ message: 'Not implemented' }));

module.exports = router;
