document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');

    // Toggle logic
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    // Login Submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');
        errorDiv.innerText = '';

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (data.redirect) {
                window.location.href = data.redirect;
            } else {
                errorDiv.innerText = data.error || 'Login failed';
            }
        } catch(err) {
            errorDiv.innerText = 'Network error. Try again.';
        }
    });

    // Registration Submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const role = document.getElementById('regRole').value;
        const roll_no = document.getElementById('regRollNo').value;
        const course = document.getElementById('regCourse').value;
        const phone = document.getElementById('regPhone').value;

        const errorDiv = document.getElementById('regError');
        const msgDiv = document.getElementById('regMessage');
        errorDiv.innerText = '';
        msgDiv.innerText = '';

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, role, roll_no, course, phone })
            });
            const data = await res.json();
            if (res.ok) {
                msgDiv.innerText = data.message;
                setTimeout(() => {
                    registerForm.style.display = 'none';
                    loginForm.style.display = 'block';
                }, 2000);
            } else {
                errorDiv.innerText = data.error || 'Registration failed';
            }
        } catch(err) {
            console.error(err);
            errorDiv.innerText = 'Error: ' + err.message;
        }
    });
});
