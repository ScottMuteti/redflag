const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('admin'));

// TODO: campaign CRUD + launch via Gophish/Africa's Talking
router.get('/', (req, res) => res.status(501).json({ message: 'Not implemented' }));
router.post('/', (req, res) => res.status(501).json({ message: 'Not implemented' }));
router.get('/:id', (req, res) => res.status(501).json({ message: 'Not implemented' }));
router.post('/:id/launch', (req, res) => res.status(501).json({ message: 'Not implemented' }));
router.get('/:id/results', (req, res) => res.status(501).json({ message: 'Not implemented' }));

module.exports = router;
