/**
 * routes/community.js — Student Community Posts & Comments
 */
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { requireStudent } = require('./student');

router.use(requireStudent);

function isInt(v) { return Number.isSafeInteger(Number(v)) && Number(v) > 0; }
const VALID_CATS = ['discussion','question','resource','opportunity','general'];

// GET /api/community — list posts
router.get('/', async (req, res) => {
  try {
    const sid = req.student.id;
    const { category, q } = req.query;
    let sql = `
      SELECT p.id, p.title, p.content, p.category, p.created_at, p.updated_at,
             u.full_name AS student_name,
             CASE WHEN p.student_id=? THEN 1 ELSE 0 END AS is_mine,
             (SELECT COUNT(*) FROM community_comments c WHERE c.post_id=p.id) AS comment_count
      FROM community_posts p JOIN users u ON p.student_id=u.id WHERE 1=1`;
    const params = [sid];
    if (category) { sql += ' AND p.category=?'; params.push(category); }
    if (q)        { sql += ' AND (p.title LIKE ? OR p.content LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
    sql += ' ORDER BY p.created_at DESC LIMIT 100';
    const [posts] = await pool.execute(sql, params);
    res.json({ success: true, posts });
  } catch (err) {
    console.error('[community GET]', err.message);
    res.status(500).json({ success: false, message: 'Could not load posts.' });
  }
});

// POST /api/community — create post
router.post('/', async (req, res) => {
  try {
    const { title, content, category } = req.body;
    if (!title || !title.trim())   return res.status(400).json({ success: false, message: 'Title is required.' });
    if (!content || !content.trim()) return res.status(400).json({ success: false, message: 'Content is required.' });
    const cat = VALID_CATS.includes(category) ? category : 'general';
    const [result] = await pool.execute(
      'INSERT INTO community_posts (student_id, title, content, category) VALUES (?,?,?,?)',
      [req.student.id, title.trim(), content.trim(), cat]
    );
    res.status(201).json({ success: true, message: 'Post created.', postId: result.insertId });
  } catch (err) {
    console.error('[community POST]', err.message);
    res.status(500).json({ success: false, message: 'Could not create post.' });
  }
});

// DELETE /api/community/:id — delete own post
router.delete('/:id', async (req, res) => {
  try {
    const id  = Number(req.params.id);
    const sid = req.student.id;
    if (!isInt(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const [result] = await pool.execute(
      'DELETE FROM community_posts WHERE id=? AND student_id=?', [id, sid]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Post not found or not yours.' });
    res.json({ success: true, message: 'Post deleted.' });
  } catch (err) {
    console.error('[community DELETE]', err.message);
    res.status(500).json({ success: false, message: 'Could not delete post.' });
  }
});

// GET /api/community/:id/comments
router.get('/:id/comments', async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const sid    = req.student.id;
    if (!isInt(postId)) return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    const [comments] = await pool.execute(
      `SELECT c.id, c.content, c.created_at, u.full_name AS student_name,
              CASE WHEN c.student_id=? THEN 1 ELSE 0 END AS is_mine
       FROM community_comments c JOIN users u ON c.student_id=u.id
       WHERE c.post_id=? ORDER BY c.created_at ASC`,
      [sid, postId]
    );
    res.json({ success: true, comments });
  } catch (err) {
    console.error('[community/comments GET]', err.message);
    res.status(500).json({ success: false, message: 'Could not load comments.' });
  }
});

// POST /api/community/:id/comments — add comment
router.post('/:id/comments', async (req, res) => {
  try {
    const postId = Number(req.params.id);
    if (!isInt(postId)) return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ success: false, message: 'Comment cannot be empty.' });
    const [[post]] = await pool.execute('SELECT id, student_id FROM community_posts WHERE id=?', [postId]);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    const [result] = await pool.execute(
      'INSERT INTO community_comments (post_id, student_id, content) VALUES (?,?,?)',
      [postId, req.student.id, content.trim()]
    );
    // Notify the post owner if different
    if (post.student_id !== req.student.id) {
      await pool.execute(
        'INSERT INTO notifications (student_id, type, title, message, module) VALUES (?,?,?,?,?)',
        [post.student_id, 'community', 'New comment on your post',
         `${req.student.fullName} commented on your post.`, 'community']
      );
    }
    res.status(201).json({ success: true, message: 'Comment added.', commentId: result.insertId });
  } catch (err) {
    console.error('[community/comments POST]', err.message);
    res.status(500).json({ success: false, message: 'Could not add comment.' });
  }
});

// DELETE /api/community/comments/:id — delete own comment
router.delete('/comments/:id', async (req, res) => {
  try {
    const id  = Number(req.params.id);
    const sid = req.student.id;
    if (!isInt(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const [result] = await pool.execute(
      'DELETE FROM community_comments WHERE id=? AND student_id=?', [id, sid]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Comment not found or not yours.' });
    res.json({ success: true, message: 'Comment deleted.' });
  } catch (err) {
    console.error('[community/comments DELETE]', err.message);
    res.status(500).json({ success: false, message: 'Could not delete comment.' });
  }
});

module.exports = router;
