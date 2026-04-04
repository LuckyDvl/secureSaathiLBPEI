require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'secure_saathi_secret_key_evaluation',
    resave: false,
    saveUninitialized: false
}));

// Authentication Middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    } else {
        res.status(401).json({ error: 'Not authenticated', redirect: '/login.html' });
    }
}

function requireRole(role) {
    return (req, res, next) => {
        if (req.session && req.session.role === role) {
            next();
        } else {
            res.status(403).json({ error: 'Forbidden: Not authorized' });
        }
    };
}

// Routes
app.post('/api/register', async (req, res) => {
    const { name, email, password, role, enroll_no, department, course, phone } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.run(
            'INSERT INTO users (name, email, password, role, enroll_no, department, course, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, email, hashedPassword, role, enroll_no, department, course, phone]
        );
        res.json({ success: true, message: 'Registration successful. Please login.' });
    } catch (err) {
        console.error('[Register Error]:', err);
        res.status(400).json({ error: 'Email already exists or invalid data' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.userId = user.id;
            req.session.role = user.role;
            req.session.name = user.name;
            
            if (user.role === 'student') res.json({ redirect: '/student.html' });
            else if (user.role === 'security') res.json({ redirect: '/security.html' });
            else res.json({ redirect: '/' });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/complaint', requireAuth, async (req, res) => {
    const { message } = req.body;
    try {
        const result = await db.run('INSERT INTO complaints (student_id, message) VALUES (?, ?)',
            [req.session.userId, message]
        );
        // Notify Security via sockets
        io.emit('new_complaint', {
            id: result.lastID,
            studentName: req.session.name,
            message: message,
            status: 'pending',
            timestamp: new Date().toISOString()
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit complaint' });
    }
});

app.get('/api/complaints', requireAuth, requireRole('security'), async (req, res) => {
    try {
        const rows = await db.all(`SELECT c.id, c.message, c.status, c.timestamp, u.name as studentName, u.enroll_no, u.department, u.course, u.phone
            FROM complaints c JOIN users u ON c.student_id = u.id ORDER BY c.timestamp DESC`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching complaints' });
    }
});

// New Endpoint: Mark Complaint as Resolved
app.patch('/api/complaint/:id/resolve', requireAuth, requireRole('security'), async (req, res) => {
    try {
        await db.run('UPDATE complaints SET status = ? WHERE id = ?', ['resolved', req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error resolving complaint' });
    }
});

// New Endpoint: Get My Complaints
app.get('/api/my-complaints', requireAuth, async (req, res) => {
    try {
        const rows = await db.all(`SELECT * FROM complaints WHERE student_id = ? ORDER BY timestamp DESC`, [req.session.userId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching complaints' });
    }
});

app.get('/api/me', requireAuth, async (req, res) => {
    try {
        const user = await db.get('SELECT id, name, email, role, enroll_no, department, course, phone FROM users WHERE id = ?', [req.session.userId]);
        if (!user) return res.status(404).json({ error: 'Not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, redirect: '/login.html' });
});

// Socket.IO for Live SOS
io.on('connection', (socket) => {
    console.log('User connected');
    socket.on('sos_alert', async (data) => {
        console.log('SOS ALERT RECEIVED:', data);
        try {
            await db.run('INSERT INTO sos_alerts (student_id, latitude, longitude) VALUES (?, ?, ?)',
                [data.user.id, data.location.latitude, data.location.longitude]);
            io.emit('security_alert', data);
        } catch (err) {
            console.error('Failed to log SOS alert:', err);
        }
    });
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Secure Saathi server listening on port ${PORT}`));

// Redirect root to login
app.get('/', (req, res) => res.redirect('/login.html'));
