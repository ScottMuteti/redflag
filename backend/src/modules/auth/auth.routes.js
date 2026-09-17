const express = require('express');

const router = express.Router();

// TODO: create organization + admin, hash password, sign JWT
router.post('/register', (req, res) => res.status(501).json({ message: 'Not implemented' }));

// TODO: verify credentials, return JWT with role + organization_id
router.post('/login', (req, res) => res.status(501).json({ message: 'Not implemented' }));

module.exports = router;
