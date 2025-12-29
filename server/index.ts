
import express from 'express';
import cors from 'cors';
import { initDb, query } from './db.ts';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize Database
initDb();

// --- API ENDPOINTS ---

// USERS
app.post('/api/users', async (req, res) => {
    const { id, name, email } = req.body;
    try {
        // Check if user exists first to avoid PK error
        const check = await query('SELECT * FROM users WHERE id = $1', [id]);
        if (check.rows.length === 0) {
            await query('INSERT INTO users (id, name, email) VALUES ($1, $2, $3)', [id, name, email]);
            res.status(201).json({ message: 'User created' });
        } else {
            res.status(200).json({ message: 'User exists' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// SESSIONS
app.get('/api/sessions/:userId', async (req, res) => {
    try {
        const result = await query('SELECT * FROM sessions WHERE user_id = $1', [req.params.userId]);
        // Convert back to camelCase for frontend compatibility if needed, or handle there
        // For now returning raw rows which are snake_case column names. 
        // We will adjust the frontend to map this or map it here.
        // Let's map it here to match existing TypeScript interfaces
        const mapped = result.rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            subject: row.subject,
            topic: row.topic,
            plannedMinutes: row.planned_minutes,
            startTime: parseInt(row.start_time),
            endTime: row.end_time ? parseInt(row.end_time) : null,
            metrics: row.metrics,
            slices: row.slices
        }));
        res.json(mapped);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/sessions', async (req, res) => {
    const { id, userId, subject, topic, plannedMinutes, startTime, endTime, metrics, slices } = req.body;
    try {
        await query(
            `INSERT INTO sessions (id, user_id, subject, topic, planned_minutes, start_time, end_time, metrics, slices) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [id, userId, subject, topic, plannedMinutes, startTime, endTime, metrics, JSON.stringify(slices)]
        );
        res.status(201).json({ message: 'Session saved' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ASSIGNMENTS
app.get('/api/assignments/:userId', async (req, res) => {
    try {
        const result = await query('SELECT * FROM assignments WHERE user_id = $1', [req.params.userId]);
        const mapped = result.rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            name: row.name,
            dueDate: row.due_date,
            completed: row.completed
        }));
        res.json(mapped);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/assignments', async (req, res) => {
    const { id, userId, name, dueDate, completed } = req.body;
    try {
        await query(
            'INSERT INTO assignments (id, user_id, name, due_date, completed) VALUES ($1, $2, $3, $4, $5)',
            [id, userId, name, dueDate, completed]
        );
        res.status(201).json({ message: 'Assignment added' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// EXAMS
app.get('/api/exams/:userId', async (req, res) => {
    try {
        const result = await query('SELECT * FROM exams WHERE user_id = $1', [req.params.userId]);
        const mapped = result.rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            name: row.name,
            date: row.date
        }));
        res.json(mapped);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/exams', async (req, res) => {
    const { id, userId, name, date } = req.body;
    try {
        await query(
            'INSERT INTO exams (id, user_id, name, date) VALUES ($1, $2, $3, $4)',
            [id, userId, name, date]
        );
        res.status(201).json({ message: 'Exam added' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// PROJECTS
app.get('/api/projects/:userId', async (req, res) => {
    try {
        const result = await query('SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC', [req.params.userId]);
        const mapped = result.rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            title: row.title,
            description: row.description,
            status: row.status,
            createdAt: parseInt(row.created_at)
        }));
        res.json(mapped);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/projects', async (req, res) => {
    const { id, userId, title, description, status, createdAt } = req.body;
    try {
        await query(
            'INSERT INTO projects (id, user_id, title, description, status, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, userId, title, description, status, createdAt]
        );
        res.status(201).json({ message: 'Project created' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});


import multer from 'multer';

// Multer Setup
const upload = multer({ storage: multer.memoryStorage() });

// ... (existing imports/setup)

// CONTENT SOURCES
app.get('/api/projects/:projectId/content', async (req, res) => {
    try {
        const result = await query('SELECT id, project_id, type, title, content, metadata, created_at FROM content_sources WHERE project_id = $1 ORDER BY created_at DESC', [req.params.projectId]);
        const mapped = result.rows.map(row => ({
            id: row.id,
            projectId: row.project_id,
            type: row.type,
            title: row.title,
            content: row.content,
            metadata: JSON.parse(row.metadata || '{}'),
            createdAt: parseInt(row.created_at)
        }));
        res.json(mapped);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

app.post('/api/content', upload.single('file'), async (req, res) => {
    // Handle form-data (req.body contains text fields, req.file contains file)
    let { id, projectId, type, title, content, metadata, createdAt } = req.body;
    let fileData = null;

    if (req.file) {
        fileData = req.file.buffer;
        // Parse metadata if it came as string due to FormData
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch (e) { }
        }
    }

    try {
        await query(
            'INSERT INTO content_sources (id, project_id, type, title, content, metadata, file_data, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [id, projectId, type, title, content, typeof metadata === 'object' ? JSON.stringify(metadata) : metadata, fileData, createdAt]
        );
        res.status(201).json({ message: 'Content source created' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

// LECTURE SESSIONS
app.get('/api/projects/:projectId/lectures', async (req, res) => {
    try {
        const result = await query('SELECT * FROM lecture_sessions WHERE project_id = $1 ORDER BY created_at DESC', [req.params.projectId]);
        const mapped = result.rows.map(row => ({
            id: row.id,
            projectId: row.project_id,
            title: row.title,
            transcript: row.transcript,
            audioUrl: row.audio_url,
            duration: row.duration,
            status: row.status,
            createdAt: parseInt(row.created_at)
        }));
        res.json(mapped);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

app.post('/api/lectures', async (req, res) => {
    const { id, projectId, title, transcript, audioUrl, duration, status, createdAt } = req.body;
    try {
        await query(
            'INSERT INTO lecture_sessions (id, project_id, title, transcript, audio_url, duration, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [id, projectId, title, transcript, audioUrl, duration, status, createdAt]
        );
        res.status(201).json({ message: 'Lecture session created' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

// LEARNING MATERIALS
app.get('/api/projects/:projectId/materials', async (req, res) => {
    try {
        const result = await query('SELECT * FROM learning_materials WHERE project_id = $1 ORDER BY created_at DESC', [req.params.projectId]);
        const mapped = result.rows.map(row => ({
            id: row.id,
            projectId: row.project_id,
            type: row.type,
            content: row.content, // Assuming content is text (JSON string or plain text)
            createdAt: parseInt(row.created_at)
        }));
        res.json(mapped);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

app.post('/api/materials', async (req, res) => {
    const { id, projectId, type, content, createdAt } = req.body;
    try {
        await query(
            'INSERT INTO learning_materials (id, project_id, type, content, created_at) VALUES ($1, $2, $3, $4, $5)',
            [id, projectId, type, content, createdAt]
        );
        res.status(201).json({ message: 'Learning material created' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
