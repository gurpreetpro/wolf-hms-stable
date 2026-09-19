const express = require('express');
const router = express.Router();
const { getProblems, addProblem, updateProblem, deleteProblem } = require('../controllers/problemListController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/problems/:patient_id', protect, getProblems);
router.post('/problems', protect, authorize('doctor', 'admin'), addProblem);
router.patch('/problems/:id', protect, authorize('doctor', 'admin'), updateProblem);
router.put('/problems/:id/resolve', protect, authorize('doctor', 'admin'), (req, res, next) => {
    req.body.status = 'Resolved';
    req.body.resolved_date = new Date();
    return updateProblem(req, res, next);
});
router.delete('/problems/:id', protect, authorize('doctor', 'admin'), deleteProblem);

module.exports = router;
