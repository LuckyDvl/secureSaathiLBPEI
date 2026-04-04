require('dotenv').config();
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcrypt');

const usePostgres = !!process.env.DATABASE_URL;
let pgPool, sqliteDb;

if (usePostgres) {
    console.log('-----------------------------------------');
    console.log('✅ Connected to online PostgreSQL Database.');
    console.log('-----------------------------------------');
    pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
} else {
    console.log('-----------------------------------------');
    console.log('⚠️ Using local SQLite Database.');
    console.log('Provide a DATABASE_URL in .env to use PostgreSQL.');
    console.log('-----------------------------------------');
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.resolve(__dirname, 'database.sqlite');
    sqliteDb = new sqlite3.Database(dbPath, (err) => {
        if (err) console.error('Error connecting to SQLite DB:', err.message);
    });
}

function convertQuery(sql) {
    if (usePostgres) {
        // Convert SQLite schema definitions to PostgreSQL
        sql = sql.replace(/id INTEGER PRIMARY KEY AUTOINCREMENT/ig, 'id SERIAL PRIMARY KEY');
        sql = sql.replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/ig, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        
        // Convert ? placeholders to $1, $2, etc.
        let counter = 1;
        sql = sql.replace(/\?/g, () => `$${counter++}`);
        return sql;
    }
    return sql;
}

const db = {
    run: async (sql, params = []) => {
        const querySql = convertQuery(sql);
        if (usePostgres) {
            let finalSql = querySql;
            const isInsert = finalSql.trim().toUpperCase().startsWith('INSERT');
            if (isInsert && !finalSql.toUpperCase().includes('RETURNING ID')) {
                finalSql += ' RETURNING id';
            }
            try {
                const res = await pgPool.query(finalSql, params);
                return { lastID: isInsert && res.rows[0] ? res.rows[0].id : null, changes: res.rowCount };
            } catch(e) {
                console.error('[DB Run Error]:', querySql, e.message);
                throw e;
            }
        } else {
            return new Promise((resolve, reject) => {
                sqliteDb.run(querySql, params, function(err) {
                    if (err) {
                        console.error('[DB Run Error]:', querySql, err.message);
                        reject(err);
                    } else resolve({ lastID: this.lastID, changes: this.changes });
                });
            });
        }
    },
    all: async (sql, params = []) => {
        const querySql = convertQuery(sql);
        if (usePostgres) {
            try {
                const res = await pgPool.query(querySql, params);
                return res.rows;
            } catch(e) {
                console.error('[DB All Error]:', querySql, e.message);
                throw e;
            }
        } else {
            return new Promise((resolve, reject) => {
                sqliteDb.all(querySql, params, (err, rows) => {
                    if (err) {
                        console.error('[DB All Error]:', querySql, err.message);
                        reject(err);
                    } else resolve(rows);
                });
            });
        }
    },
    get: async (sql, params = []) => {
        const querySql = convertQuery(sql);
        if (usePostgres) {
            try {
                const res = await pgPool.query(querySql, params);
                return res.rows[0];
            } catch(e) {
                console.error('[DB Get Error]:', querySql, e.message);
                throw e;
            }
        } else {
            return new Promise((resolve, reject) => {
                sqliteDb.get(querySql, params, (err, row) => {
                    if (err) {
                        console.error('[DB Get Error]:', querySql, err.message);
                        reject(err);
                    } else resolve(row);
                });
            });
        }
    }
};

async function initializeDB() {
    try {
        await db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'student',
            enroll_no TEXT,
            department TEXT,
            course TEXT,
            phone TEXT
        )`);

        // Migration safety checks for existing DBs
        try { await db.run(`ALTER TABLE users ADD COLUMN department TEXT`); } catch(e) {}
        try { await db.run(`ALTER TABLE users ADD COLUMN enroll_no TEXT`); } catch(e) {}
        try { await db.run(`ALTER TABLE users DROP COLUMN roll_no`); } catch(e) {}

        await db.run(`CREATE TABLE IF NOT EXISTS complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        await db.run(`CREATE TABLE IF NOT EXISTS sos_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            latitude REAL,
            longitude REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        const securityUser = await db.get('SELECT * FROM users WHERE role = ?', ['security']);
        if (!securityUser) {
            const hashedPassword = await bcrypt.hash('security123', 10);
            await db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', 
                ['Campus Security', 'security@college.edu', hashedPassword, 'security']);
            console.log('Created default Security account (security@college.edu / security123)');
        }
        
    } catch (err) {
        console.error('Database Initialization Failed:', err);
    }
}

// Short delay guarantees db connection setup
setTimeout(initializeDB, 500);

module.exports = db;
