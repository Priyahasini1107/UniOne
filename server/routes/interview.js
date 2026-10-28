/**
 * routes/interview.js — Interview Preparation API
 * Read-only topic browsing + per-student progress tracking.
 */
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { requireStudent } = require('./student');

router.use(requireStudent);

function isInt(v) { return Number.isSafeInteger(Number(v)) && Number(v) > 0; }

// GET /api/interview-prep — list topics with student progress
router.get('/', async (req, res) => {
  try {
    const sid = req.student.id;
    const { category, difficulty, q } = req.query;
    const categories = ['dsa', 'aptitude', 'technical', 'programming', 'hr', 'other'];
    const difficulties = ['beginner', 'intermediate', 'advanced'];
    if (category && !categories.includes(category)) return res.status(400).json({ success: false, message: 'Invalid interview category.' });
    if (difficulty && !difficulties.includes(difficulty)) return res.status(400).json({ success: false, message: 'Invalid difficulty.' });
    if (q && (typeof q !== 'string' || q.length > 200)) return res.status(400).json({ success: false, message: 'Search text must be 200 characters or fewer.' });
    let sql = `
      SELECT t.id, t.category, t.title, t.difficulty, t.content, t.tags, t.created_at,
             COALESCE(ip.is_done, 0) AS is_done,
             COALESCE(ia.attempt_count, 0) AS attempt_count,
             COALESCE(ia.correct_count, 0) AS correct_count,
             ia.last_is_correct
      FROM   interview_topics t
      LEFT JOIN interview_progress ip ON ip.topic_id = t.id AND ip.student_id = ?
      LEFT JOIN interview_attempts ia ON ia.topic_id = t.id AND ia.student_id = ?
      WHERE  1=1`;
    const params = [sid, sid];
    if (category)   { sql += ' AND t.category = ?';    params.push(category); }
    if (difficulty) { sql += ' AND t.difficulty = ?';  params.push(difficulty); }
    if (q)          { sql += ' AND (t.title LIKE ? OR t.tags LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
    sql += ' ORDER BY t.category, t.difficulty, t.id';
    const [topics] = await pool.execute(sql, params);
    res.json({ success: true, topics });
  } catch (err) {
    console.error('[interview GET]', err.message);
    res.status(500).json({ success: false, message: 'Could not load topics.' });
  }
});

// GET /api/interview-prep/progress — summary of student's progress
router.get('/progress', async (req, res) => {
  try {
    const sid = req.student.id;
    const [[totals]] = await pool.execute(
      `SELECT COUNT(*) AS total,
              SUM(COALESCE(ip.is_done,0)) AS done,
              SUM(CASE WHEN COALESCE(ia.attempt_count,0)>0 THEN 1 ELSE 0 END) AS attempted,
              SUM(COALESCE(ia.correct_count,0)) AS correct_answers,
              SUM(COALESCE(ia.attempt_count,0)) AS attempts,
              (SELECT COUNT(*) FROM interview_quiz_attempts q WHERE q.student_id=?) AS quiz_count,
              (SELECT AVG(score_percent) FROM interview_quiz_attempts q WHERE q.student_id=?) AS average_quiz_score,
              (SELECT score_percent FROM interview_quiz_attempts q WHERE q.student_id=? ORDER BY q.created_at DESC,q.id DESC LIMIT 1) AS latest_quiz_score
       FROM   interview_topics t
       LEFT JOIN interview_progress ip ON ip.topic_id=t.id AND ip.student_id=?
       LEFT JOIN interview_attempts ia ON ia.topic_id=t.id AND ia.student_id=?`,
      [sid, sid, sid, sid, sid]
    );
    res.json({ success: true, total: totals.total, done: totals.done || 0, attempted: totals.attempted || 0, attempts: totals.attempts || 0, correct_answers: totals.correct_answers || 0, quiz_count: totals.quiz_count || 0, average_quiz_score: Number(totals.average_quiz_score || 0), latest_quiz_score: totals.latest_quiz_score == null ? null : Number(totals.latest_quiz_score) });
  } catch (err) {
    console.error('[interview/progress]', err.message);
    res.status(500).json({ success: false, message: 'Could not load progress.' });
  }
});

// POST /api/interview-prep/attempts — score a quiz answer on the server.
router.post('/attempts', async (req, res) => {
  try {
    const topicId = Number(req.body?.topic_id);
    const answer = req.body?.answer;
    if (!isInt(topicId)) return res.status(400).json({ success: false, message: 'Invalid topic ID.' });
    if (typeof answer !== 'string' || !answer.trim() || answer.length > 10000) return res.status(400).json({ success: false, message: 'Enter an answer of up to 10,000 characters.' });
    const [[topic]] = await pool.execute('SELECT content FROM interview_topics WHERE id=?', [topicId]);
    if (!topic) return res.status(404).json({ success: false, message: 'Question not found.' });
    let question;
    try { question = JSON.parse(topic.content); } catch { return res.status(400).json({ success: false, message: 'This question does not support scored attempts yet.' }); }
    const answerIndex = Number(answer);
    const graded = question.format === 'mcq' && Number.isInteger(question.answerIndex) && answerIndex >= 0 && answerIndex < (question.options || []).length;
    if (question.format === 'mcq' && !graded) return res.status(400).json({ success: false, message: 'Select a valid answer option.' });
    const isCorrect = graded ? answerIndex === question.answerIndex : null;
    await pool.execute(
      `INSERT INTO interview_attempts (student_id, topic_id, attempt_count, correct_count, last_answer, last_is_correct)
       VALUES (?, ?, 1, ?, ?, ?)
       ON DUPLICATE KEY UPDATE attempt_count=attempt_count+1,
         correct_count=correct_count+VALUES(correct_count), last_answer=VALUES(last_answer), last_is_correct=VALUES(last_is_correct)`,
      [req.student.id, topicId, isCorrect ? 1 : 0, answer.trim(), isCorrect]
    );
    res.json({ success: true, graded, is_correct: isCorrect, explanation: question.explanation || question.solution || '', correct_answer: graded ? question.options[question.answerIndex] : null });
  } catch (error) {
    console.error('[interview attempts POST]', error.message);
    res.status(500).json({ success: false, message: 'Could not save this attempt.' });
  }
});

// POST /api/interview-prep/quizzes — grade and persist an entire quiz result.
router.post('/quizzes', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const answers = req.body?.answers;
    if (!Array.isArray(answers) || !answers.length || answers.length > 50) return res.status(400).json({ success: false, message: 'Submit between 1 and 50 quiz answers.' });
    const ids = answers.map(item => Number(item?.topic_id));
    if (ids.some(id => !isInt(id)) || new Set(ids).size !== ids.length) return res.status(400).json({ success: false, message: 'Quiz question IDs must be unique valid IDs.' });
    const gradedRows = [];
    for (const answer of answers) {
      if (typeof answer.answer !== 'string' || !/^\d+$/.test(answer.answer)) return res.status(400).json({ success: false, message: 'Each quiz answer must be a selected option.' });
      const [[topic]] = await conn.execute('SELECT content FROM interview_topics WHERE id=?', [Number(answer.topic_id)]);
      if (!topic) return res.status(404).json({ success: false, message: 'A quiz question was not found.' });
      let question;
      try { question = JSON.parse(topic.content); } catch { return res.status(400).json({ success: false, message: 'A quiz question has no scoring key.' }); }
      const selected = Number(answer.answer);
      if (question.format !== 'mcq' || !Number.isInteger(question.answerIndex) || selected < 0 || selected >= (question.options || []).length) return res.status(400).json({ success: false, message: 'A quiz answer is invalid.' });
      gradedRows.push({ topicId: Number(answer.topic_id), answer: String(selected), question, isCorrect: selected === question.answerIndex });
    }
    const correctCount = gradedRows.filter(item => item.isCorrect).length;
    const score = Math.round((correctCount * 10000 / gradedRows.length)) / 100;
    await conn.beginTransaction();
    const [result] = await conn.execute(
      'INSERT INTO interview_quiz_attempts (student_id,total_questions,correct_count,score_percent) VALUES (?,?,?,?)',
      [req.student.id, gradedRows.length, correctCount, score]
    );
    for (const item of gradedRows) {
      await conn.execute(
        `INSERT INTO interview_attempts (student_id,topic_id,attempt_count,correct_count,last_answer,last_is_correct)
         VALUES (?,?,1,?,?,?) ON DUPLICATE KEY UPDATE attempt_count=attempt_count+1,
         correct_count=correct_count+VALUES(correct_count), last_answer=VALUES(last_answer), last_is_correct=VALUES(last_is_correct)`,
        [req.student.id, item.topicId, item.isCorrect ? 1 : 0, item.answer, item.isCorrect]
      );
    }
    await conn.commit();
    res.json({ success: true, quiz_id: result.insertId, total_questions: gradedRows.length, correct_count: correctCount, score_percent: score,
      results: gradedRows.map(item => ({ id: item.topicId, is_correct: item.isCorrect, correct_answer: item.question.options[item.question.answerIndex], explanation: item.question.explanation || '' })) });
  } catch (error) {
    await conn.rollback().catch(() => {});
    console.error('[interview quizzes POST]', error.message);
    res.status(500).json({ success: false, message: 'Could not save quiz results.' });
  } finally { conn.release(); }
});

// PATCH /api/interview-prep/:id/progress — toggle a topic done/undone
router.patch('/:id/progress', async (req, res) => {
  try {
    const topicId = Number(req.params.id);
    const sid     = req.student.id;
    if (!isInt(topicId)) return res.status(400).json({ success: false, message: 'Invalid topic ID.' });
    if (!req.body || typeof req.body.is_done !== 'boolean') return res.status(400).json({ success: false, message: 'is_done must be true or false.' });
    const isDone = req.body.is_done ? 1 : 0;
    await pool.execute(
      `INSERT INTO interview_progress (student_id, topic_id, is_done)
       VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE is_done=VALUES(is_done)`,
      [sid, topicId, isDone]
    );
    res.json({ success: true, message: isDone ? 'Marked as done.' : 'Marked as not done.' });
  } catch (err) {
    console.error('[interview/progress PATCH]', err.message);
    res.status(500).json({ success: false, message: 'Could not update progress.' });
  }
});

module.exports = router;
