/**
 * Wolf HMS - Health Articles Routes
 * 
 * CMS API for health education articles
 * Supports Wolf Care patient app articles section
 * 
 * Endpoints:
 * - GET  /api/articles               - List articles (with filters)
 * - GET  /api/articles/:id           - Get single article
 * - POST /api/articles               - Create article (admin)
 * - PUT  /api/articles/:id           - Update article (admin)
 * - DELETE /api/articles/:id         - Delete article (admin)
 * - GET  /api/articles/categories    - Get categories
 * - POST /api/articles/:id/bookmark  - Toggle bookmark
 * - GET  /api/articles/bookmarks     - Get patient bookmarks
 * - POST /api/articles/:id/view      - Track view
 * - GET  /api/articles/daily-tip     - Get daily health tip
 * - POST /api/articles/daily-tips    - Add daily tip (admin)
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { verifyToken } = require('../services/otpAuthService');

// ====================
// Middleware: Patient Auth
// ====================
const authenticatePatient = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        req.patient = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Authentication failed' });
    }
};

// ====================
// GET /categories - Get article categories
// ====================
router.get('/categories', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, slug, icon, description
            FROM article_categories
            WHERE is_active = true
            ORDER BY sort_order
        `);
        
        res.json({
            success: true,
            categories: result.rows
        });
    } catch (err) {
        console.error('[ARTICLES] Categories error:', err);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// ====================
// GET /daily-tip - Get daily health tip
// ====================
router.get('/daily-tip', async (req, res) => {
    try {
        // Try to get tip for today, or random active tip
        let result = await pool.query(`
            SELECT id, tip_text, category, icon FROM daily_health_tips
            WHERE display_date = CURRENT_DATE AND is_active = true
            LIMIT 1
        `);
        
        if (result.rows.length === 0) {
            // No scheduled tip, get random
            result = await pool.query(`
                SELECT id, tip_text, category, icon FROM daily_health_tips
                WHERE is_active = true
                ORDER BY RANDOM()
                LIMIT 1
            `);
        }
        
        res.json({
            success: true,
            tip: result.rows[0] || null
        });
    } catch (err) {
        console.error('[ARTICLES] Daily tip error:', err);
        res.status(500).json({ error: 'Failed to fetch daily tip' });
    }
});

// ====================
// GET / - List articles (with filters)
// ====================
router.get('/', async (req, res) => {
    try {
        const { 
            category, 
            search, 
            featured, 
            published = 'true',
            limit = 20, 
            offset = 0 
        } = req.query;
        
        let query = `
            SELECT 
                ha.id, ha.title, ha.slug, ha.summary, ha.cover_image_url,
                ha.category, ha.tags, ha.author_name, ha.read_time_minutes,
                ha.views_count, ha.is_featured, ha.is_published, ha.published_at,
                ac.name as category_name, ac.icon as category_icon
            FROM health_articles ha
            LEFT JOIN article_categories ac ON ha.category = ac.slug
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;
        
        if (published === 'true') {
            query += ` AND ha.is_published = true`;
        }
        
        if (category) {
            query += ` AND ha.category = $${paramIndex++}`;
            params.push(category);
        }
        
        if (featured === 'true') {
            query += ` AND ha.is_featured = true`;
        }
        
        if (search) {
            query += ` AND (ha.title ILIKE $${paramIndex} OR ha.summary ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        
        query += ` ORDER BY ha.is_featured DESC, ha.published_at DESC NULLS LAST, ha.created_at DESC`;
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        
        // Get total count
        let countQuery = `SELECT COUNT(*) FROM health_articles WHERE is_published = true`;
        if (category) countQuery += ` AND category = '${category}'`;
        const countResult = await pool.query(countQuery);
        
        res.json({
            success: true,
            articles: result.rows,
            total: parseInt(countResult.rows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
    } catch (err) {
        console.error('[ARTICLES] List error:', err);
        res.status(500).json({ error: 'Failed to fetch articles' });
    }
});

// ====================
// GET /:id - Get single article
// ====================
router.get('/:id', async (req, res) => {
    try {
        const articleId = req.params.id;
        
        // Check if ID is slug or numeric
        const isSlug = isNaN(articleId);
        
        const result = await pool.query(`
            SELECT 
                ha.*,
                ac.name as category_name, ac.icon as category_icon
            FROM health_articles ha
            LEFT JOIN article_categories ac ON ha.category = ac.slug
            WHERE ${isSlug ? 'ha.slug = $1' : 'ha.id = $1'}
        `, [articleId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Article not found' });
        }
        
        res.json({
            success: true,
            article: result.rows[0]
        });
        
    } catch (err) {
        console.error('[ARTICLES] Get single error:', err);
        res.status(500).json({ error: 'Failed to fetch article' });
    }
});

// ====================
// POST / - Create article (admin)
// ====================
router.post('/', async (req, res) => {
    try {
        const {
            title, summary, content, cover_image_url, category,
            tags, author_name, read_time_minutes, is_featured, is_published
        } = req.body;
        const authorId = req.user?.id;
        const hospitalId = req.user?.hospital_id || 1;
        
        if (!title || !content || !category) {
            return res.status(400).json({ error: 'Title, content, and category are required' });
        }
        
        const result = await pool.query(`
            INSERT INTO health_articles 
            (title, summary, content, cover_image_url, category, tags, 
             author_id, author_name, read_time_minutes, is_featured, is_published,
             published_at, hospital_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `, [
            title, summary, content, cover_image_url, category, tags || [],
            authorId, author_name, read_time_minutes || 5, is_featured || false,
            is_published || false, is_published ? new Date() : null, hospitalId
        ]);
        
        res.json({
            success: true,
            message: 'Article created successfully',
            article: result.rows[0]
        });
        
    } catch (err) {
        console.error('[ARTICLES] Create error:', err);
        res.status(500).json({ error: 'Failed to create article' });
    }
});

// ====================
// PUT /:id - Update article (admin)
// ====================
router.put('/:id', async (req, res) => {
    try {
        const articleId = req.params.id;
        const {
            title, summary, content, cover_image_url, category,
            tags, author_name, read_time_minutes, is_featured, is_published
        } = req.body;
        
        // Check if publishing for first time
        const existing = await pool.query('SELECT is_published FROM health_articles WHERE id = $1', [articleId]);
        const wasPublished = existing.rows[0]?.is_published;
        const publishedAt = (!wasPublished && is_published) ? new Date() : undefined;
        
        const result = await pool.query(`
            UPDATE health_articles SET
                title = COALESCE($1, title),
                summary = COALESCE($2, summary),
                content = COALESCE($3, content),
                cover_image_url = COALESCE($4, cover_image_url),
                category = COALESCE($5, category),
                tags = COALESCE($6, tags),
                author_name = COALESCE($7, author_name),
                read_time_minutes = COALESCE($8, read_time_minutes),
                is_featured = COALESCE($9, is_featured),
                is_published = COALESCE($10, is_published),
                published_at = COALESCE($11, published_at)
            WHERE id = $12
            RETURNING *
        `, [
            title, summary, content, cover_image_url, category, tags,
            author_name, read_time_minutes, is_featured, is_published,
            publishedAt, articleId
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Article not found' });
        }
        
        res.json({
            success: true,
            message: 'Article updated successfully',
            article: result.rows[0]
        });
        
    } catch (err) {
        console.error('[ARTICLES] Update error:', err);
        res.status(500).json({ error: 'Failed to update article' });
    }
});

// ====================
// DELETE /:id - Delete article (admin)
// ====================
router.delete('/:id', async (req, res) => {
    try {
        const articleId = req.params.id;
        
        const result = await pool.query(`
            DELETE FROM health_articles WHERE id = $1 RETURNING id, title
        `, [articleId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Article not found' });
        }
        
        res.json({
            success: true,
            message: 'Article deleted',
            deleted: result.rows[0]
        });
        
    } catch (err) {
        console.error('[ARTICLES] Delete error:', err);
        res.status(500).json({ error: 'Failed to delete article' });
    }
});

// ====================
// POST /:id/bookmark - Toggle bookmark
// ====================
router.post('/:id/bookmark', authenticatePatient, async (req, res) => {
    try {
        const articleId = req.params.id;
        const patientId = req.patient.id;
        
        // Check if already bookmarked
        const existing = await pool.query(`
            SELECT id FROM article_bookmarks WHERE article_id = $1 AND patient_id = $2
        `, [articleId, patientId]);
        
        if (existing.rows.length > 0) {
            // Remove bookmark
            await pool.query(`
                DELETE FROM article_bookmarks WHERE article_id = $1 AND patient_id = $2
            `, [articleId, patientId]);
            
            res.json({ success: true, action: 'removed', message: 'Bookmark removed' });
        } else {
            // Add bookmark
            await pool.query(`
                INSERT INTO article_bookmarks (article_id, patient_id) VALUES ($1, $2)
            `, [articleId, patientId]);
            
            res.json({ success: true, action: 'added', message: 'Bookmark added' });
        }
        
    } catch (err) {
        console.error('[ARTICLES] Bookmark error:', err);
        res.status(500).json({ error: 'Failed to update bookmark' });
    }
});

// ====================
// GET /bookmarks - Get patient's bookmarks
// ====================
router.get('/patient/bookmarks', authenticatePatient, async (req, res) => {
    try {
        const patientId = req.patient.id;
        
        const result = await pool.query(`
            SELECT 
                ha.id, ha.title, ha.slug, ha.summary, ha.cover_image_url,
                ha.category, ha.read_time_minutes, ab.created_at as bookmarked_at
            FROM article_bookmarks ab
            JOIN health_articles ha ON ab.article_id = ha.id
            WHERE ab.patient_id = $1 AND ha.is_published = true
            ORDER BY ab.created_at DESC
        `, [patientId]);
        
        res.json({
            success: true,
            bookmarks: result.rows
        });
        
    } catch (err) {
        console.error('[ARTICLES] Get bookmarks error:', err);
        res.status(500).json({ error: 'Failed to fetch bookmarks' });
    }
});

// ====================
// POST /:id/view - Track view
// ====================
router.post('/:id/view', async (req, res) => {
    try {
        const articleId = req.params.id;
        const patientId = req.patient?.id || req.body.patient_id;
        
        // Increment view count
        await pool.query(`
            UPDATE health_articles SET views_count = views_count + 1 WHERE id = $1
        `, [articleId]);
        
        // Track reading history if patient ID available
        if (patientId) {
            await pool.query(`
                INSERT INTO article_reading_history (article_id, patient_id, read_percentage, last_read_at)
                VALUES ($1, $2, 100, NOW())
                ON CONFLICT (article_id, patient_id) 
                DO UPDATE SET read_percentage = 100, last_read_at = NOW()
            `, [articleId, patientId]);
        }
        
        res.json({ success: true, message: 'View tracked' });
        
    } catch (err) {
        console.error('[ARTICLES] Track view error:', err);
        res.status(500).json({ error: 'Failed to track view' });
    }
});

// ====================
// POST /daily-tips - Add daily tip (admin)
// ====================
router.post('/daily-tips', async (req, res) => {
    try {
        const { tip_text, category, icon, display_date } = req.body;
        const hospitalId = req.user?.hospital_id || 1;
        
        if (!tip_text) {
            return res.status(400).json({ error: 'Tip text is required' });
        }
        
        const result = await pool.query(`
            INSERT INTO daily_health_tips (tip_text, category, icon, display_date, hospital_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [tip_text, category, icon || '💡', display_date, hospitalId]);
        
        res.json({
            success: true,
            tip: result.rows[0]
        });
        
    } catch (err) {
        console.error('[ARTICLES] Add tip error:', err);
        res.status(500).json({ error: 'Failed to add tip' });
    }
});

// ====================
// GET /all - Admin: All articles (including unpublished)
// ====================
router.get('/admin/all', async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        
        const result = await pool.query(`
            SELECT 
                ha.id, ha.title, ha.category, ha.is_published, ha.is_featured,
                ha.views_count, ha.created_at, ha.updated_at,
                ac.name as category_name
            FROM health_articles ha
            LEFT JOIN article_categories ac ON ha.category = ac.slug
            ORDER BY ha.updated_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);
        
        const countResult = await pool.query('SELECT COUNT(*) FROM health_articles');
        
        res.json({
            success: true,
            articles: result.rows,
            total: parseInt(countResult.rows[0].count)
        });
        
    } catch (err) {
        console.error('[ARTICLES] Admin all error:', err);
        res.status(500).json({ error: 'Failed to fetch articles' });
    }
});

module.exports = router;
