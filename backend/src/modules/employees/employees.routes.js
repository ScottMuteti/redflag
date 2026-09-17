const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticate);

// TODO: CRUD scoped to req.user.organizationId
router.get('/', authorize('admin'), (req, res) => res.status(501).json({ message: 'Not implemented' }));
router.post('/', authorize('admin'), (req, res) => res.status(501).json({ message: 'Not implemented' }));
router.get('/:id', (req, res) => res.status(501).json({ message: 'Not implemented' }));
router.put('/:id', authorize('admin'), (req, res) => res.status(501).json({ message: 'Not implemented' }));
router.delete('/:id', authorize('admin'), (req, res) => res.status(501).json({ message: 'Not implemented' }));

module.exports = router;
