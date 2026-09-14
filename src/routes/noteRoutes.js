const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const { authenticateToken } = require('../middleware/auth');

// Protect all note routes with JWT authentication
router.use(authenticateToken);

router.post('/', noteController.createNote);
router.get('/', noteController.getNotes);
router.get('/summary', noteController.getNoteSummary);
router.get('/:id', noteController.getNoteById);
router.put('/:id', noteController.updateNote);
router.delete('/:id', noteController.deleteNote);

module.exports = router;
