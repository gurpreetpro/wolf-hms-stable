/**
 * Articles Manager Component
 * 
 * Admin CMS for managing health education articles
 * Supports Wolf Care patient app articles section
 */

import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

const ArticlesManager = () => {
    const [articles, setArticles] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [showEditor, setShowEditor] = useState(false);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, published: 0, featured: 0, views: 0 });
    const [formData, setFormData] = useState({
        title: '',
        summary: '',
        content: '',
        cover_image_url: '',
        category: 'general-health',
        tags: '',
        author_name: '',
        read_time_minutes: 5,
        is_featured: false,
        is_published: false
    });

    useEffect(() => {
        fetchArticles();
        fetchCategories();
    }, []);

    const fetchArticles = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/api/articles/admin/all`);
            const data = await res.json();
            setArticles(data.articles || []);
            
            // Calculate stats
            const published = data.articles?.filter(a => a.is_published).length || 0;
            const featured = data.articles?.filter(a => a.is_featured).length || 0;
            const views = data.articles?.reduce((sum, a) => sum + (a.views_count || 0), 0) || 0;
            setStats({ total: data.total || 0, published, featured, views });
        } catch (err) {
            console.error('Failed to fetch articles:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/articles/categories`);
            const data = await res.json();
            setCategories(data.categories || []);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    };

    const handleSave = async () => {
        try {
            const url = selectedArticle 
                ? `${API_BASE}/api/articles/${selectedArticle.id}`
                : `${API_BASE}/api/articles`;
            
            const res = await fetch(url, {
                method: selectedArticle ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
                })
            });
            
            if (res.ok) {
                setShowEditor(false);
                setSelectedArticle(null);
                resetForm();
                fetchArticles();
            }
        } catch (err) {
            console.error('Failed to save article:', err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this article?')) return;
        
        try {
            const res = await fetch(`${API_BASE}/api/articles/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchArticles();
            }
        } catch (err) {
            console.error('Failed to delete article:', err);
        }
    };

    const handleEdit = (article) => {
        setSelectedArticle(article);
        setFormData({
            title: article.title || '',
            summary: article.summary || '',
            content: article.content || '',
            cover_image_url: article.cover_image_url || '',
            category: article.category || 'general-health',
            tags: article.tags?.join(', ') || '',
            author_name: article.author_name || '',
            read_time_minutes: article.read_time_minutes || 5,
            is_featured: article.is_featured || false,
            is_published: article.is_published || false
        });
        setShowEditor(true);
    };

    const resetForm = () => {
        setFormData({
            title: '',
            summary: '',
            content: '',
            cover_image_url: '',
            category: 'general-health',
            tags: '',
            author_name: '',
            read_time_minutes: 5,
            is_featured: false,
            is_published: false
        });
    };

    const togglePublish = async (article) => {
        try {
            await fetch(`${API_BASE}/api/articles/${article.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_published: !article.is_published })
            });
            fetchArticles();
        } catch (err) {
            console.error('Failed to toggle publish:', err);
        }
    };

    const getCategoryIcon = (slug) => {
        const cat = categories.find(c => c.slug === slug);
        return cat?.icon || '📄';
    };

    return (
        <div style={{ padding: '20px', backgroundColor: '#1e1e2f', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    📚 Health Articles
                </h1>
                <p style={{ color: '#888', margin: '8px 0 0' }}>
                    Manage health education content for Wolf Care patients
                </p>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>📄</div>
                    <div style={styles.statValue}>{stats.total}</div>
                    <div style={styles.statLabel}>Total Articles</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>✅</div>
                    <div style={{ ...styles.statValue, color: '#10b981' }}>{stats.published}</div>
                    <div style={styles.statLabel}>Published</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>⭐</div>
                    <div style={{ ...styles.statValue, color: '#f59e0b' }}>{stats.featured}</div>
                    <div style={styles.statLabel}>Featured</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>👁️</div>
                    <div style={styles.statValue}>{stats.views.toLocaleString()}</div>
                    <div style={styles.statLabel}>Total Views</div>
                </div>
            </div>

            {/* Actions */}
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                    onClick={() => { resetForm(); setSelectedArticle(null); setShowEditor(true); }}
                    style={styles.addButton}
                >
                    + New Article
                </button>
            </div>

            {/* Articles Table */}
            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Article</th>
                            <th style={styles.th}>Category</th>
                            <th style={styles.th}>Status</th>
                            <th style={styles.th}>Views</th>
                            <th style={styles.th}>Updated</th>
                            <th style={styles.th}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" style={{ ...styles.td, textAlign: 'center' }}>Loading...</td></tr>
                        ) : articles.length === 0 ? (
                            <tr><td colSpan="6" style={{ ...styles.td, textAlign: 'center' }}>No articles yet</td></tr>
                        ) : (
                            articles.map(article => (
                                <tr key={article.id} style={{ borderBottom: '1px solid #3a3a4d' }}>
                                    <td style={styles.td}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {article.is_featured && <span title="Featured">⭐</span>}
                                            <span style={{ fontWeight: '500', color: '#fff' }}>{article.title}</span>
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                        <span style={styles.categoryBadge}>
                                            {getCategoryIcon(article.category)} {article.category_name || article.category}
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        <span style={{
                                            ...styles.statusBadge,
                                            backgroundColor: article.is_published ? '#10b981' : '#6b7280'
                                        }}>
                                            {article.is_published ? 'Published' : 'Draft'}
                                        </span>
                                    </td>
                                    <td style={styles.td}>{article.views_count?.toLocaleString() || 0}</td>
                                    <td style={styles.td}>
                                        {new Date(article.updated_at).toLocaleDateString()}
                                    </td>
                                    <td style={styles.td}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => handleEdit(article)} style={styles.editButton}>
                                                ✏️ Edit
                                            </button>
                                            <button onClick={() => togglePublish(article)} style={styles.toggleButton}>
                                                {article.is_published ? '📤 Unpublish' : '📥 Publish'}
                                            </button>
                                            <button onClick={() => handleDelete(article.id)} style={styles.deleteButton}>
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Editor Modal */}
            {showEditor && (
                <div style={styles.modalOverlay} onClick={() => setShowEditor(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={{ margin: 0, color: '#fff' }}>
                                {selectedArticle ? '✏️ Edit Article' : '📝 New Article'}
                            </h2>
                            <button onClick={() => setShowEditor(false)} style={styles.closeButton}>×</button>
                        </div>
                        
                        <div style={styles.modalBody}>
                            <div style={styles.formGrid}>
                                <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                                    <label style={styles.label}>Title *</label>
                                    <input 
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                                        style={styles.input}
                                        placeholder="Article title"
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Category *</label>
                                    <select 
                                        value={formData.category}
                                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                                        style={styles.input}
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.slug} value={cat.slug}>
                                                {cat.icon} {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Author Name</label>
                                    <input 
                                        type="text"
                                        value={formData.author_name}
                                        onChange={(e) => setFormData({...formData, author_name: e.target.value})}
                                        style={styles.input}
                                        placeholder="Dr. Name"
                                    />
                                </div>
                            </div>
                            
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Summary</label>
                                <textarea 
                                    value={formData.summary}
                                    onChange={(e) => setFormData({...formData, summary: e.target.value})}
                                    style={{...styles.input, minHeight: '60px', resize: 'vertical'}}
                                    placeholder="Brief summary for article cards"
                                />
                            </div>
                            
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Content *</label>
                                <textarea 
                                    value={formData.content}
                                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                                    style={{...styles.input, minHeight: '200px', resize: 'vertical', fontFamily: 'monospace'}}
                                    placeholder="Article content (supports Markdown)"
                                />
                            </div>
                            
                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Cover Image URL</label>
                                    <input 
                                        type="text"
                                        value={formData.cover_image_url}
                                        onChange={(e) => setFormData({...formData, cover_image_url: e.target.value})}
                                        style={styles.input}
                                        placeholder="https://..."
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Tags (comma-separated)</label>
                                    <input 
                                        type="text"
                                        value={formData.tags}
                                        onChange={(e) => setFormData({...formData, tags: e.target.value})}
                                        style={styles.input}
                                        placeholder="health, wellness, tips"
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Read Time (minutes)</label>
                                    <input 
                                        type="number"
                                        value={formData.read_time_minutes}
                                        onChange={(e) => setFormData({...formData, read_time_minutes: parseInt(e.target.value)})}
                                        style={styles.input}
                                        min="1" max="60"
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Options</label>
                                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc' }}>
                                            <input 
                                                type="checkbox"
                                                checked={formData.is_featured}
                                                onChange={(e) => setFormData({...formData, is_featured: e.target.checked})}
                                            />
                                            ⭐ Featured
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc' }}>
                                            <input 
                                                type="checkbox"
                                                checked={formData.is_published}
                                                onChange={(e) => setFormData({...formData, is_published: e.target.checked})}
                                            />
                                            ✅ Published
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div style={styles.modalFooter}>
                            <button onClick={() => setShowEditor(false)} style={styles.cancelButton}>Cancel</button>
                            <button onClick={handleSave} style={styles.saveButton}>
                                {selectedArticle ? 'Update Article' : 'Create Article'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    statCard: {
        backgroundColor: '#2a2a3d',
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center'
    },
    statIcon: { fontSize: '28px', marginBottom: '8px' },
    statValue: { fontSize: '32px', fontWeight: 'bold', color: '#14b8a6' },
    statLabel: { fontSize: '14px', color: '#888', marginTop: '4px' },
    addButton: {
        padding: '10px 20px',
        backgroundColor: '#14b8a6',
        border: 'none',
        borderRadius: '8px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    },
    tableContainer: {
        backgroundColor: '#2a2a3d',
        borderRadius: '12px',
        overflow: 'hidden'
    },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: {
        textAlign: 'left',
        padding: '16px',
        backgroundColor: '#1e1e2f',
        color: '#888',
        fontWeight: '500',
        fontSize: '13px',
        textTransform: 'uppercase'
    },
    td: { padding: '16px', color: '#ccc', fontSize: '14px' },
    categoryBadge: {
        padding: '4px 10px',
        backgroundColor: '#3a3a4d',
        borderRadius: '4px',
        fontSize: '12px'
    },
    statusBadge: {
        padding: '4px 10px',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#fff'
    },
    editButton: {
        padding: '6px 12px',
        backgroundColor: '#3a3a4d',
        border: 'none',
        borderRadius: '6px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '12px'
    },
    toggleButton: {
        padding: '6px 12px',
        backgroundColor: '#0ea5e9',
        border: 'none',
        borderRadius: '6px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '12px'
    },
    deleteButton: {
        padding: '6px 10px',
        backgroundColor: '#ef4444',
        border: 'none',
        borderRadius: '6px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '12px'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
    },
    modal: {
        backgroundColor: '#2a2a3d',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto'
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        borderBottom: '1px solid #3a3a4d'
    },
    closeButton: {
        background: 'none',
        border: 'none',
        color: '#888',
        fontSize: '28px',
        cursor: 'pointer'
    },
    modalBody: { padding: '20px' },
    modalFooter: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        padding: '16px 20px',
        borderTop: '1px solid #3a3a4d'
    },
    formGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
        marginBottom: '16px'
    },
    formGroup: { marginBottom: '12px' },
    label: { display: 'block', color: '#888', marginBottom: '6px', fontSize: '13px' },
    input: {
        width: '100%',
        padding: '10px 12px',
        backgroundColor: '#1e1e2f',
        border: '1px solid #3a3a4d',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '14px'
    },
    cancelButton: {
        padding: '10px 20px',
        backgroundColor: '#3a3a4d',
        border: 'none',
        borderRadius: '8px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '14px'
    },
    saveButton: {
        padding: '10px 20px',
        backgroundColor: '#14b8a6',
        border: 'none',
        borderRadius: '8px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    }
};

export default ArticlesManager;
