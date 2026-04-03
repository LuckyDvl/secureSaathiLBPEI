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
    const sirenAudio = document.getElementById('sirenSound');
    const muteBtn = document.getElementById('muteAlarmBtn');
    let isMuted = false;

    // Fetch user details
    try {
        const res = await fetch('/api/me');
        if (!res.ok) {
            window.location.href = '/login.html';
            return;
        }
        currentUser = await res.json();
        document.getElementById('userNameDisplay').textContent = currentUser.name;
        if(currentUser.role !== 'security') {
            window.location.href = '/student.html';
            return;
        }
    } catch(err) {
        window.location.href = '/login.html';
        return;
    }

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login.html';
    });

    muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        sirenAudio.muted = isMuted;
        muteBtn.textContent = isMuted ? '🔊 Unmute Siren' : '🔇 Mute Siren';
        if(isMuted) sirenAudio.pause();
    });

    function playSiren() {
        if (!isMuted) {
            sirenAudio.play().catch(e => console.log('Audio autoplay blocked', e));
        }
    }

    async function loadComplaints() {
        try {
            const res = await fetch('/api/complaints');
            const data = await res.json();
            const container = document.getElementById('complaintsList');
            container.innerHTML = '';
            
            if (data.length === 0) {
                container.innerHTML = '<p style="text-align:center; padding: 2rem; color: var(--text-muted);">No complaints recorded.</p>';
            }

            data.forEach(c => addComplaintToList(c));
        } catch(e) {
            console.error('Error fetching complaints', e);
        }
    }

    function addComplaintToList(complaint) {
        const div = document.createElement('div');
        div.className = 'alert-item';
        div.style.borderLeftColor = complaint.status === 'resolved' ? 'var(--secondary)' : 'var(--primary)';
        if(complaint.status === 'resolved') div.style.opacity = 0.6;
        
        const statusBadge = complaint.status === 'resolved' 
            ? `<span class="complaint-status status-resolved">Resolved</span>`
            : `<span class="complaint-status status-pending">Pending</span>`;

        const resolveBtnHtml = complaint.status === 'pending'
            ? `<button onclick="resolveComplaint(${complaint.id})" class="btn btn-primary" style="margin-top: 1rem; padding: 0.4rem; font-size: 0.8rem;">Mark Resolved</button>`
            : '';

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div style="font-weight: 600;">Reporter: ${complaint.studentName}</div>
                ${statusBadge}
            </div>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                Roll No: ${complaint.roll_no} | Course: ${complaint.course} | Phone: ${complaint.phone || 'N/A'} <br>
                Time: ${new Date(complaint.timestamp).toLocaleString()}
            </div>
            <p style="color: var(--text-main); font-size: 0.95rem;">"${complaint.message}"</p>
            ${resolveBtnHtml}
        `;
        document.getElementById('complaintsList').appendChild(div); // Append so oldest log goes down
    }

    window.resolveComplaint = async function(id) {
        try {
            const res = await fetch(`/api/complaint/${id}/resolve`, { method: 'PATCH' });
            if (res.ok) {
                showToast('Complaint marked as resolved!');
                loadComplaints();
            }
        } catch(err) {
            showToast('Failed to resolve complaint', 'error');
        }
    };

    loadComplaints();

    socket.on('security_alert', (data) => {
        playSiren();
        showToast('⚠️ NEW SOS ALERT RECEIVED!', 'error');

        const alertsContainer = document.getElementById('alertsList');
        const emptyMsg = alertsContainer.querySelector('div');
        if (emptyMsg && emptyMsg.textContent.includes('No active')) emptyMsg.remove();

        const mapUrl = `https://www.google.com/maps?q=${data.location.latitude},${data.location.longitude}`;
        
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert-item alert-pulse';
        alertDiv.innerHTML = `
            <h3 style="color: var(--danger); margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
                <span>⚠️ SOS TRIGGERED</span>
                <span style="font-size: 0.8rem; font-weight: 400; color: var(--text-muted);">${new Date(data.timestamp).toLocaleTimeString()}</span>
            </h3>
            
            <div class="alert-details">
                <div class="detail-item">
                    <span class="detail-label">Student Name</span>
                    <div>${data.user.name}</div>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Roll Number</span>
                    <div>${data.user.roll_no}</div>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Course</span>
                    <div>${data.user.course}</div>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Phone Number</span>
                    <div style="font-weight: bold;">${data.user.phone || 'N/A'}</div>
                </div>
            </div>

            <a href="${mapUrl}" target="_blank" class="map-link" style="display: block; margin-top: 1rem; text-align: center; padding: 0.5rem; border: 1px solid #60A5FA; border-radius: 4px;">
                🌍 View Live GPS Location on Google Maps
            </a>
            
            <button onclick="this.parentElement.remove(); showToast('Alert dismissed');" class="btn btn-danger" style="margin-top: 1rem; background: var(--border); box-shadow: none;">
                Dismiss / Resolve Alert
            </button>
        `;
        
        alertsContainer.prepend(alertDiv);
    });

    socket.on('new_complaint', (data) => {
        loadComplaints(); 
        showToast('A new complaint was submitted.');
        const panel = document.getElementById('complaintsList').parentElement;
        panel.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.4)';
        setTimeout(() => panel.style.boxShadow = '0 10px 30px -10px rgba(0, 0, 0, 0.5)', 2000);
    });
});
