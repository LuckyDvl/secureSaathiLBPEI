document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');

    // Dynamic Course Logic
    const courseMap = {
        "CCSIT": ["BCA", "MCA", "B.Tech (Computer Science)", "M.Tech", "B.Sc (Animation)"],
        "FOE": ["B.Tech (Civil)", "B.Tech (Mechanical)", "B.Tech (Electrical)", "M.Tech"],
        "Law": ["BA LLB (Hons.)", "BBA LLB (Hons.)", "B.Com LLB (Hons.)", "LLM", "Ph.D"],
        "Nursing": ["B.Sc Nursing", "M.Sc Nursing", "Post Basic B.Sc Nursing", "GNM"],
        "Paramedical": ["B.Sc (Medical Lab Techniques)", "B.Sc (Radiological Techniques)", "Bachelor of Optometry (B.Optom)", "M.Sc MLT"],
        "Arts": ["BA", "MA", "B.Ed", "M.Ed", "B.PEd"]
    };
    const regDepartment = document.getElementById('regDepartment');
    const regCourse = document.getElementById('regCourse');
    
    if (regDepartment && regCourse) {
        regDepartment.addEventListener('change', (e) => {
            const dept = e.target.value;
            regCourse.innerHTML = '<option value="" disabled selected>Select Course</option>';
            if (courseMap[dept]) {
                regCourse.disabled = false;
                courseMap[dept].forEach(course => {
                    const opt = document.createElement('option');
                    opt.value = course;
                    opt.innerText = course;
                    regCourse.appendChild(opt);
                });
            }
        });
    }

    // Password Logic
    const regPassword = document.getElementById('regPassword');
    const regConfirmPassword = document.getElementById('regConfirmPassword');
    const strengthDiv = document.getElementById('passwordStrength');
    const matchDiv = document.getElementById('passwordMatch');

    function checkPassword() {
        const val = regPassword.value;
        if (!val) { strengthDiv.innerText = ''; return; }
        if (val.length < 6) {
            strengthDiv.innerText = 'Strength: Weak 🔴';
            strengthDiv.style.color = 'var(--danger)';
        } else if (val.length < 10 || !/\d/.test(val)) {
            strengthDiv.innerText = 'Strength: Medium 🟠 (Add numbers/specials for strong)';
            strengthDiv.style.color = '#F59E0B';
        } else {
            strengthDiv.innerText = 'Strength: Strong 🟢';
            strengthDiv.style.color = 'var(--secondary)';
        }
        checkMatch();
    }
    
    function checkMatch() {
        if(!regConfirmPassword) return;
        const p1 = regPassword.value;
        const p2 = regConfirmPassword.value;
        if (!p2) { matchDiv.innerText = ''; return; }
        if (p1 === p2) {
            matchDiv.innerText = 'Passwords match ✅';
            matchDiv.style.color = 'var(--secondary)';
        } else {
            matchDiv.innerText = 'Passwords do not match ❌';
            matchDiv.style.color = 'var(--danger)';
        }
    }

    if (regPassword) regPassword.addEventListener('input', checkPassword);
    if (regConfirmPassword) regConfirmPassword.addEventListener('input', checkMatch);

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
        const confirmPassword = document.getElementById('regConfirmPassword').value;
        const role = document.getElementById('regRole').value;
        const enroll_no = document.getElementById('regEnrollNo').value;
        const department = document.getElementById('regDepartment').value;
        const course = document.getElementById('regCourse').value;
        const phone = document.getElementById('regPhone').value;

        const errorDiv = document.getElementById('regError');
        const msgDiv = document.getElementById('regMessage');
        errorDiv.innerText = '';
        msgDiv.innerText = '';

        if (password !== confirmPassword) {
            errorDiv.innerText = 'Passwords do not match!';
            return;
        }

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, role, enroll_no, department, course, phone })
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
