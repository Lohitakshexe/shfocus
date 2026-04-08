const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const cron = require('node-cron');
const db = require('./database');
const jwt = require('jsonwebtoken');

const app = express();
const SECRET_KEY = 'super_secret_goals_key';

app.use(cors());
app.use(express.json());

// Auth middleware snippet
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Login Route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM Users WHERE username = ?", [username], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY);
        res.json({ token, role: user.role, username: user.username, id: user.id, coins: user.coins });
    });
});

// Fetch User
app.get('/user', authenticateToken, (req, res) => {
    db.get("SELECT id, username, role, coins FROM Users WHERE id = ?", [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(user);
    });
});

// Banned Sites Routes
app.get('/banned-sites', (req, res) => {
    db.all("SELECT * FROM BannedSites", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/banned-sites', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    
    db.run("INSERT INTO BannedSites (url) VALUES (?)", [url], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, url });
    });
});

app.delete('/banned-sites/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    db.run("DELETE FROM BannedSites WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'deleted' });
    });
});

// Logging Focus Time & Adding Coins
app.post('/logs', authenticateToken, (req, res) => {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Students only' });
    const { duration_minutes } = req.body;
    
    // Reward calculation: 5 coins per 5 minutes of solid focus.
    const intervals = Math.floor(duration_minutes / 5);
    const earned_coins = intervals * 5;

    db.run("INSERT INTO TimeLogs (user_id, duration_minutes, earned_coins) VALUES (?, ?, ?)", 
        [req.user.id, duration_minutes, earned_coins], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            // Re-calc user's total coins (optional) or just increment
            if (earned_coins > 0) {
                db.run("UPDATE Users SET coins = coins + ? WHERE id = ?", [earned_coins, req.user.id], (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true, earned_coins });
                });
            } else {
                res.json({ success: true, earned_coins: 0 });
            }
        });
});

app.get('/logs', authenticateToken, (req, res) => {
    db.all(`SELECT tl.*, u.username 
            FROM TimeLogs tl JOIN Users u ON tl.user_id = u.id 
            ORDER BY tl.id DESC LIMIT 50`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Rewards
app.post('/rewards/redeem', authenticateToken, (req, res) => {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Students only' });
    const { reward_name, cost } = req.body;
    
    db.get("SELECT coins FROM Users WHERE id = ?", [req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (row.coins < cost) {
            return res.status(400).json({ error: 'Not enough coins!' });
        }

        db.serialize(() => {
            db.run("UPDATE Users SET coins = coins - ? WHERE id = ?", [cost, req.user.id]);
            db.run("INSERT INTO RedeemedRewards (user_id, reward_name, cost) VALUES (?, ?, ?)", 
                [req.user.id, reward_name, cost], function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true, remaining_coins: row.coins - cost });
                });
        });
    });
});

// --- DYNAMIC REWARDS STORE API --- //

app.get('/rewards', authenticateToken, (req, res) => {
    db.all("SELECT * FROM Rewards", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/rewards', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { name, cost, img } = req.body;
    db.run("INSERT INTO Rewards (name, cost, img) VALUES (?, ?, ?)", [name, cost, img], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name, cost, img });
    });
});

app.put('/rewards/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { name, cost } = req.body;
    db.run("UPDATE Rewards SET name = ?, cost = ? WHERE id = ?", [name, cost, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/rewards/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    db.run("DELETE FROM Rewards WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'deleted' });
    });
});

// --------------------------------- //

app.post('/admin/grant-coins', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    db.run("UPDATE Users SET coins = coins + ? WHERE role = 'student'", [amount], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, granted: amount });
    });
});

// --- GOALS API --- //
app.get('/goals', authenticateToken, (req, res) => {
    db.all("SELECT * FROM Goals ORDER BY created_at ASC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/goals', authenticateToken, (req, res) => {
    const { text, type } = req.body;
    db.run("INSERT INTO Goals (text, type, completed) VALUES (?, ?, 0)", [text, type], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, text, type, completed: 0 });
    });
});

app.put('/goals/:id/toggle', authenticateToken, (req, res) => {
    const { completed } = req.body;
    db.run("UPDATE Goals SET completed = ? WHERE id = ?", [completed ? 1 : 0, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/goals', authenticateToken, (req, res) => {
    db.run("DELETE FROM Goals", [], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});
// ----------------- //

app.get('/rewards/redeemed', authenticateToken, (req, res) => {
    db.all(`SELECT rr.*, u.username 
            FROM RedeemedRewards rr JOIN Users u ON rr.user_id = u.id 
            ORDER BY rr.id DESC LIMIT 50`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Cron Job: Delete TimeLogs each Monday at 2 AM IST
// Note: CRON expression for 2 AM IST (IST is UTC + 5:30)
// To run at 2 AM IST -> that's 8:30 PM UTC Sunday. Wait, 02:00 IST - 5:30 = 20:30 UTC.
// So 30 20 * * 0 (minute 30, hour 20, Sunday = 0)
cron.schedule('30 20 * * 0', () => {
    console.log('Running weekly TimeLog purge according to IST (2 AM Monday)....');
    db.run("DELETE FROM TimeLogs", (err) => {
        if (err) console.error("Error purging TimeLogs:", err.message);
        else console.log("TimeLogs perfectly purged.");
    });
}, {
    scheduled: true,
    timezone: "UTC"
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
