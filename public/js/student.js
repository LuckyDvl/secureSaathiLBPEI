function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<strong>${type === 'success' ? '✅' : '⚠️'}</strong> ${message}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

document.addEventListener('DOMContentLoaded', async () => {
    const socket = io();
    let currentUser = null;

    try {
        const res = await fetch('/api/me');
        if (!res.ok) {
            window.location.href = '/login.html';
            return;
        }
        currentUser = await res.json();
        document.getElementById('userNameDisplay').textContent = currentUser.name;
    } catch(err) {
        window.location.href = '/login.html';
        return;
    }

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login.html';
    });

    // Load My Complaints
    async function loadMyComplaints() {
        try {
            const res = await fetch('/api/my-complaints');
            const data = await res.json();
            const container = document.getElementById('myComplaintsList');
            container.innerHTML = '';
            
            if (data.length === 0) {
                container.innerHTML = '<p style="text-align:center; padding: 1rem; color: var(--text-muted);">You have not submitted any complaints.</p>';
            }

            data.forEach(c => {
                const div = document.createElement('div');
                div.className = 'alert-item';
                div.style.borderLeftColor = c.status === 'resolved' ? 'var(--secondary)' : 'var(--primary)';
                
                const statusBadge = c.status === 'resolved' 
                    ? `<span class="complaint-status status-resolved">Resolved</span>`
                    : `<span class="complaint-status status-pending">Pending Security Review</span>`;

                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;">
                        <div style="font-size: 0.85rem; color: var(--text-muted);">Filed on: ${new Date(c.timestamp).toLocaleString()}</div>
                        ${statusBadge}
                    </div>
                    <p style="color: var(--text-main); font-size: 0.95rem;">"${c.message}"</p>
                `;
                container.appendChild(div);
            });
        } catch(e) {
            console.error('Error fetching complaints', e);
        }
    }
    loadMyComplaints();

    // SOS Logic
    const sosBtn = document.getElementById('sosBtn');
    
    sosBtn.addEventListener('click', () => {
        showToast('Acquiring GPS location...', 'success');
        
        if (!navigator.geolocation) {
            showToast('Geolocation is not supported by your browser', 'error');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                socket.emit('sos_alert', {
                    user: currentUser,
                    location: location,
                    timestamp: new Date().toISOString()
                });
                showToast('🚨 SOS Sent! Security has been notified.', 'success');
            },
            () => {
                showToast('Error: Unable to retrieve location. Enable GPS permissions.', 'error');
            }
        );
    });

    // Complaint Logic
    document.getElementById('complaintForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = document.getElementById('complaintText').value;

        try {
            const res = await fetch('/api/complaint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            if (res.ok) {
                showToast('Complaint submitted successfully.');
                document.getElementById('complaintText').value = '';
                loadMyComplaints(); // Refresh the list!
            } else {
                showToast('Failed to submit complaint.', 'error');
            }
        } catch(err) {
            showToast('Network error.', 'error');
        }
    });

    // Listen for resolution sockets to reload list
    socket.on('complaint_resolved', () => {
        loadMyComplaints();
    });
});
