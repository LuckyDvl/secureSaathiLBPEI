process.env.DATABASE_URL = ''; // Force SQLite
const db = require('./database');
setTimeout(async () => {
    try {
        await db.run('INSERT INTO users (name, email, password, role, enroll_no, department, course, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['Dev Test', 'dev@test.com', 'test', 'student', '999', 'CCSIT', 'BCA', '111']);
        console.log('SQLITE INSERT OK');
    } catch(e) {
        console.error('SQLITE INSERT ERROR:', e.message);
    }
    
    try {
        const user = await db.get('SELECT * FROM users WHERE email = ?', ['dev@test.com']);
        console.log('SQLITE GET', user);
    } catch (e) {
        console.error('SQLITE GET ERR', e.message);
    }
    process.exit();
}, 2000);
