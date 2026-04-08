const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const initDb = () => {
    db.serialize(() => {
        // Create Users Table
        db.run(`
            CREATE TABLE IF NOT EXISTS Users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL,
                coins INTEGER DEFAULT 0
            )
        `);

        // Create TimeLogs Table
        db.run(`
            CREATE TABLE IF NOT EXISTS TimeLogs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                duration_minutes INTEGER NOT NULL,
                earned_coins INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES Users(id)
            )
        `);

        // Create BannedSites Table
        db.run(`
            CREATE TABLE IF NOT EXISTS BannedSites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL UNIQUE
            )
        `);

        // Create RedeemedRewards Table
        db.run(`
            CREATE TABLE IF NOT EXISTS RedeemedRewards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                reward_name TEXT NOT NULL,
                cost INTEGER NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES Users(id)
            )
        `);

        // Create Rewards (Dynamic store) Table
        db.run(`
            CREATE TABLE IF NOT EXISTS Rewards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                cost INTEGER NOT NULL,
                img TEXT NOT NULL
            )
        `);

        // Create Goals Table
        db.run(`
            CREATE TABLE IF NOT EXISTS Goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                type TEXT NOT NULL,
                completed BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Seed initial users if empty
        db.get("SELECT COUNT(*) AS count FROM Users", (err, row) => {
            if (err) console.error(err);
            if (row && row.count === 0) {
                const salt = bcrypt.genSaltSync(10);
                // Creating Student
                const hashedPassShreeya = bcrypt.hashSync('shreeya', salt);
                db.run("INSERT INTO Users (username, password, role, coins) VALUES (?, ?, ?, ?)", ['Shreeya', hashedPassShreeya, 'student', 0]);
                
                // Creating Admin
                const hashedPassAdmin = bcrypt.hashSync('lohitaksh', salt);
                db.run("INSERT INTO Users (username, password, role, coins) VALUES (?, ?, ?, ?)", ['Lohitaksh', hashedPassAdmin, 'admin', 0]);
                console.log("Database seeded with default users.");
            }
        });
        
        // Seed some initial banned sites
        db.get("SELECT COUNT(*) AS count FROM BannedSites", (err, row) => {
            if (err) console.error(err);
            if (row && row.count === 0) {
                const initialSites = ['facebook.com', 'instagram.com', 'twitter.com', 'reddit.com', 'netflix.com'];
                const stmt = db.prepare("INSERT INTO BannedSites (url) VALUES (?)");
                initialSites.forEach(site => stmt.run(site));
                stmt.finalize();
                console.log("Database seeded with default banned sites.");
            }
        });
        
        // Seed initial Rewards
        db.get("SELECT COUNT(*) AS count FROM Rewards", (err, row) => {
            if (err) console.error(err);
            if (row && row.count === 0) {
                const initialRewards = [
                  { name: 'Eatables', cost: 35, img: '/eatables.png' },
                  { name: 'A Truth', cost: 50, img: '/truth.png' },
                  { name: 'A Dare', cost: 65, img: '/dare.png' },
                  { name: 'An Old Note', cost: 40, img: '/note.png' },
                  { name: 'Photos', cost: 55, img: '/photos.png' },
                  { name: 'Custom Request', cost: 160, img: '/custom.png' }
                ];
                const stmt = db.prepare("INSERT INTO Rewards (name, cost, img) VALUES (?, ?, ?)");
                initialRewards.forEach(r => stmt.run(r.name, r.cost, r.img));
                stmt.finalize();
                console.log("Database seeded with default rewards store.");
            }
        });
    });
};

initDb();

module.exports = db;
