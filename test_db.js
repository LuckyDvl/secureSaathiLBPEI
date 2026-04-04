require('dotenv').config();
const db = require('./database');

setTimeout(async () => {
    try {
        await db.run('INSERT INTO users (name, email, password, role, enroll_no, department, course, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['Test2', 'test2@test.com', 'test', 'student', '123', 'CCSIT', 'BCA', '1234']);
        console.log('INSERT OK');
    } catch(e) {
        console.error('INSERT ERROR:', e.message);
    }
    
    try {
        const user = await db.get('SELECT * FROM users WHERE email = ?', ['test2@test.com']);
        console.log('GET', user);
    } catch (e) {
        console.error('GET ERR', e.message);
    }
    
    process.exit();
}, 2000);
