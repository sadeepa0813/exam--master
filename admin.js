// ==========================================
// EXAM MASTER ADMIN - COMPLETE WORKING VERSION
// ==========================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase Configuration
const SUPABASE_URL = 'https://nstnkxtxlqelwnefkmaj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdG5reHR4bHFlbHduZWZrbWFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg0NTc0OCwiZXhwIjoyMDgyNDIxNzQ4fQ.7nxY8FIR05sbZ33e4-hpZx6n8l-WA-gnlk2pOwxo2z4';

// Initialize Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global Variables
let currentUser = null;

// ==========================================
// AUTHENTICATION SYSTEM
// ==========================================
async function adminLogin() {
    const email = document.getElementById('adminEmail')?.value.trim();
    const password = document.getElementById('adminPassword')?.value.trim();
    
    if (!email || !password) {
        showToast('Please enter email and password', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        // Attempt login
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            console.error('Login error:', error);
            showToast('Invalid email or password', 'error');
            return;
        }
        
        currentUser = data.user;
        
        // Update UI with user info
        document.getElementById('adminName').textContent = currentUser.email.split('@')[0];
        document.getElementById('adminEmailDisplay').textContent = currentUser.email;
        
        // Show dashboard
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('dashboardSection').style.display = 'block';
        
        // Load all data
        await loadAllData();
        
        showToast('Login successful! Welcome back.', 'success');
        
        // Clear login form
        document.getElementById('adminEmail').value = '';
        document.getElementById('adminPassword').value = '';
        
    } catch (error) {
        console.error('Login error:', error);
        showToast('An unexpected error occurred', 'error');
    } finally {
        showLoading(false);
    }
}

async function logout() {
    try {
        await supabase.auth.signOut();
        currentUser = null;
        
        // Reset UI
        document.getElementById('dashboardSection').style.display = 'none';
        document.getElementById('loginSection').style.display = 'block';
        
        showToast('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Logout failed', 'error');
    }
}

// ==========================================
// DATA LOADING FUNCTIONS
// ==========================================
async function loadAllData() {
    showLoading(true);
    
    try {
        await Promise.all([
            loadDashboardStats(),
            loadExams(),
            loadNotifications(),
            loadChatData(),
            loadRecentActivity(),
            loadEffectsStatus()
        ]);
        
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Failed to load data', 'warning');
    } finally {
        showLoading(false);
    }
}

async function loadDashboardStats() {
    try {
        // Get active exams count
        const { count: examsCount } = await supabase
            .from('exams')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'enabled');
        
        // Get active notifications count
        const { count: notificationsCount } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);
        
        // Get total comments count
        const { count: commentsCount } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true });
        
        // Update UI
        document.getElementById('statExams').textContent = examsCount || 0;
        document.getElementById('statNotifications').textContent = notificationsCount || 0;
        document.getElementById('statComments').textContent = commentsCount || 0;
        
        // Simulate active users
        document.getElementById('statUsers').textContent = Math.floor(Math.random() * 100) + 50;
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

async function loadExams() {
    try {
        const { data, error } = await supabase
            .from('exams')
            .select('*')
            .order('exam_date', { ascending: true });
        
        if (error) throw error;
        
        const tableBody = document.getElementById('examsTable');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (data && data.length > 0) {
            data.forEach(exam => {
                const examDate = new Date(exam.exam_date);
                const now = new Date();
                const daysLeft = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${exam.batch_name}</td>
                    <td>${examDate.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    })}</td>
                    <td>${daysLeft > 0 ? daysLeft : 'Past'}</td>
                    <td>
                        <span class="status-badge ${exam.status === 'enabled' ? 'status-active' : 'status-inactive'}">
                            ${exam.status === 'enabled' ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td class="actions">
                        <button class="btn-icon" onclick="toggleExamStatus('${exam.id}', '${exam.status}')">
                            <i class="fas fa-${exam.status === 'enabled' ? 'eye-slash' : 'eye'}"></i>
                        </button>
                        <button class="btn-icon btn-danger" onclick="deleteExam('${exam.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        No exams found. Add your first exam above.
                    </td>
                </tr>
            `;
        }
        
    } catch (error) {
        console.error('Error loading exams:', error);
        showToast('Failed to load exams', 'error');
    }
}

async function loadNotifications() {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const container = document.getElementById('notificationsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (data && data.length > 0) {
            const table = document.createElement('div');
            table.className = 'table-responsive';
            table.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Date</th>
                            <th>Priority</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(notif => {
                            const date = new Date(notif.created_at);
                            return `
                                <tr>
                                    <td>${notif.title}</td>
                                    <td>${date.toLocaleDateString('en-US')}</td>
                                    <td>
                                        <span class="status-badge ${notif.priority === 3 ? 'status-active' : 'status-inactive'}">
                                            ${notif.priority === 3 ? 'High' : notif.priority === 2 ? 'Medium' : 'Low'}
                                        </span>
                                    </td>
                                    <td class="actions">
                                        <button class="btn-icon" onclick="viewNotification('${notif.id}')">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn-icon btn-danger" onclick="deleteNotification('${notif.id}')">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
            container.appendChild(table);
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="far fa-bell-slash"></i>
                    <p>No active notifications</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading notifications:', error);
        showToast('Failed to load notifications', 'error');
    }
}

async function loadChatData() {
    try {
        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        const tableBody = document.getElementById('chatTable');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (data && data.length > 0) {
            data.forEach(comment => {
                const date = new Date(comment.created_at);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span>${comment.user_name}</span>
                            <button class="btn-icon btn-danger" onclick="banUser('${comment.user_name}')" 
                                    style="padding: 4px 8px; font-size: 0.8rem;">
                                <i class="fas fa-ban"></i> Ban
                            </button>
                        </div>
                    </td>
                    <td>${comment.message.length > 100 ? comment.message.substring(0, 100) + '...' : comment.message}</td>
                    <td>${comment.ip_address || 'N/A'}</td>
                    <td>${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td class="actions">
                        <button class="btn-icon btn-danger" onclick="deleteChatMessage('${comment.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        No chat messages yet
                    </td>
                </tr>
            `;
        }
        
    } catch (error) {
        console.error('Error loading chat data:', error);
        showToast('Failed to load chat messages', 'error');
    }
}

async function loadRecentActivity() {
    try {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;
        
        // Get recent exams
        const { data: exams } = await supabase
            .from('exams')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(3);
        
        // Get recent notifications
        const { data: notifications } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(3);
        
        const activities = [
            ...(exams?.map(exam => ({
                title: `New exam: ${exam.batch_name}`,
                time: new Date(exam.created_at),
                icon: 'fas fa-calendar-plus'
            })) || []),
            ...(notifications?.map(notif => ({
                title: `Notification: ${notif.title}`,
                time: new Date(notif.created_at),
                icon: 'fas fa-bell'
            })) || [])
        ].sort((a, b) => b.time - a.time).slice(0, 5);
        
        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <p class="activity-title">${activity.title}</p>
                    <span class="activity-time">${formatTimeAgo(activity.time)}</span>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

async function loadEffectsStatus() {
    try {
        const { data, error } = await supabase
            .from('site_settings')
            .select('*')
            .in('setting_key', ['snow_effect', 'confetti_effect']);
        
        if (error) throw error;
        
        if (data) {
            data.forEach(setting => {
                const checkbox = document.getElementById(`${setting.setting_key.split('_')[0]}Effect`);
                if (checkbox) {
                    checkbox.checked = setting.is_enabled;
                }
            });
        }
    } catch (error) {
        console.error('Error loading effects status:', error);
    }
}

// ==========================================
// CRUD OPERATIONS - WORKING DELETE FUNCTIONS
// ==========================================
async function addNewExam() {
    const name = document.getElementById('examName')?.value.trim();
    const dateTime = document.getElementById('examDateTime')?.value;
    const description = document.getElementById('examDescription')?.value.trim();
    
    if (!name || !dateTime) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const examData = {
            batch_name: name,
            exam_date: dateTime + ':00+05:30',
            description: description,
            status: 'enabled'
        };
        
        const { data, error } = await supabase
            .from('exams')
            .insert([examData])
            .select();
        
        if (error) throw error;
        
        showToast('Exam added successfully!', 'success');
        
        // Clear form
        document.getElementById('examName').value = '';
        document.getElementById('examDateTime').value = '';
        document.getElementById('examDescription').value = '';
        
        // Refresh data
        await loadExams();
        await loadDashboardStats();
        await loadRecentActivity();
        
    } catch (error) {
        console.error('Error adding exam:', error);
        showToast('Failed to add exam: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteExam(id) {
    console.log('Deleting exam with ID:', id);
    
    if (!await showConfirmation('Are you sure you want to delete this exam? This action cannot be undone.')) {
        return;
    }
    
    showLoading(true);
    
    try {
        // First get exam info for message
        const { data: exam, error: fetchError } = await supabase
            .from('exams')
            .select('batch_name')
            .eq('id', id)
            .single();
        
        if (fetchError) throw fetchError;
        
        // Delete the exam
        const { error } = await supabase
            .from('exams')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        showToast(`"${exam.batch_name}" deleted successfully!`, 'success');
        
        // Refresh data
        await loadExams();
        await loadDashboardStats();
        await loadRecentActivity();
        
    } catch (error) {
        console.error('Error deleting exam:', error);
        showToast('Failed to delete exam: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function toggleExamStatus(id, currentStatus) {
    const newStatus = currentStatus === 'enabled' ? 'disabled' : 'enabled';
    
    if (!await showConfirmation(`Are you sure you want to ${newStatus === 'enabled' ? 'activate' : 'deactivate'} this exam?`)) {
        return;
    }
    
    showLoading(true);
    
    try {
        const { error } = await supabase
            .from('exams')
            .update({ status: newStatus })
            .eq('id', id);
        
        if (error) throw error;
        
        showToast(`Exam ${newStatus === 'enabled' ? 'activated' : 'deactivated'} successfully`, 'success');
        await loadExams();
        
    } catch (error) {
        console.error('Error toggling exam status:', error);
        showToast('Failed to update exam status', 'error');
    } finally {
        showLoading(false);
    }
}

async function sendNotification() {
    const title = document.getElementById('notificationTitle')?.value.trim();
    const message = document.getElementById('notificationMessage')?.value.trim();
    const isImportant = document.getElementById('notificationImportant')?.checked;
    const isPersistent = document.getElementById('notificationPersistent')?.checked;
    
    if (!title) {
        showToast('Please enter a notification title', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const notificationData = {
            title: title,
            message: message,
            is_active: true,
            show_until_dismissed: isPersistent,
            priority: isImportant ? 3 : 1,
            created_by: currentUser?.email || 'admin'
        };
        
        const { error } = await supabase
            .from('notifications')
            .insert([notificationData]);
        
        if (error) throw error;
        
        showToast('Notification sent successfully!', 'success');
        
        // Clear form
        document.getElementById('notificationTitle').value = '';
        document.getElementById('notificationMessage').value = '';
        document.getElementById('notificationImportant').checked = false;
        document.getElementById('notificationPersistent').checked = false;
        
        // Refresh data
        await loadNotifications();
        await loadDashboardStats();
        await loadRecentActivity();
        
    } catch (error) {
        console.error('Error sending notification:', error);
        showToast('Failed to send notification: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteNotification(id) {
    console.log('Deleting notification with ID:', id);
    
    if (!await showConfirmation('Are you sure you want to delete this notification?')) {
        return;
    }
    
    showLoading(true);
    
    try {
        // First get notification info
        const { data: notif, error: fetchError } = await supabase
            .from('notifications')
            .select('title')
            .eq('id', id)
            .single();
        
        if (fetchError) throw fetchError;
        
        // Delete the notification
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        showToast(`"${notif.title}" deleted successfully!`, 'success');
        await loadNotifications();
        await loadDashboardStats();
        
    } catch (error) {
        console.error('Error deleting notification:', error);
        showToast('Failed to delete notification: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteChatMessage(id) {
    console.log('Deleting chat message with ID:', id);
    
    if (!await showConfirmation('Are you sure you want to delete this chat message?')) {
        return;
    }
    
    showLoading(true);
    
    try {
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        showToast('Chat message deleted successfully', 'success');
        await loadChatData();
        await loadDashboardStats();
        
    } catch (error) {
        console.error('Error deleting chat message:', error);
        showToast('Failed to delete chat message', 'error');
    } finally {
        showLoading(false);
    }
}

async function banUser(userName) {
    if (!await showConfirmation(`Are you sure you want to ban user "${userName}"?`)) {
        return;
    }
    
    showLoading(true);
    
    try {
        // First get user's messages to extract IP
        const { data: userComments, error: fetchError } = await supabase
            .from('comments')
            .select('ip_address')
            .eq('user_name', userName)
            .limit(1);
        
        if (fetchError) throw fetchError;
        
        if (userComments && userComments.length > 0) {
            const ipAddress = userComments[0].ip_address;
            
            // Add to banned_users table
            const { error } = await supabase
                .from('banned_users')
                .insert([{
                    user_name: userName,
                    ip_address: ipAddress,
                    banned_by: currentUser?.email || 'admin'
                }]);
            
            if (error) throw error;
            
            // Delete all user's messages
            await supabase
                .from('comments')
                .delete()
                .eq('user_name', userName);
            
            showToast(`User "${userName}" has been banned successfully`, 'success');
            await loadChatData();
        }
        
    } catch (error) {
        console.error('Error banning user:', error);
        showToast('Failed to ban user', 'error');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// EFFECTS SYSTEM
// ==========================================
async function toggleEffect(effect, enabled) {
    showLoading(true);
    
    try {
        const { error } = await supabase
            .from('site_settings')
            .upsert({
                setting_key: `${effect}_effect`,
                setting_value: enabled ? 'true' : 'false',
                is_enabled: enabled
            }, {
                onConflict: 'setting_key'
            });
        
        if (error) throw error;
        
        const effectName = effect === 'snow' ? 'Snow effect' : 'Confetti effect';
        showToast(`${effectName} ${enabled ? 'enabled' : 'disabled'}!`, 'success');
        
    } catch (error) {
        console.error('Error toggling effect:', error);
        showToast('Failed to update effect setting', 'error');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function showLoading(show) {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'toast';
    
    if (type === 'success') {
        toast.style.borderLeftColor = '#4cc9f0';
    } else if (type === 'error') {
        toast.style.borderLeftColor = '#f72585';
    } else if (type === 'warning') {
        toast.style.borderLeftColor = '#f8961e';
    } else {
        toast.style.borderLeftColor = '#4361ee';
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function refreshChat() {
    showLoading(true);
    setTimeout(() => {
        loadChatData();
        showLoading(false);
        showToast('Chat refreshed', 'success');
    }, 1000);
}

// Confirmation Dialog
function showConfirmation(message) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
            backdrop-filter: blur(5px);
        `;
        
        modal.innerHTML = `
            <div style="
                background: #1e293b;
                border-radius: 16px;
                padding: 30px;
                max-width: 400px;
                width: 90%;
                border: 2px solid #4361ee;
                text-align: center;
            ">
                <div style="font-size: 2.5rem; color: #f8961e; margin-bottom: 20px;">
                    ⚠️
                </div>
                <h3 style="color: #f8fafc; margin-bottom: 15px; font-size: 1.2rem;">
                    Confirm Action
                </h3>
                <p style="color: #cbd5e1; margin-bottom: 25px; line-height: 1.5;">
                    ${message}
                </p>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button id="confirmCancel" style="
                        padding: 12px 30px;
                        background: #334155;
                        border: 1px solid #475569;
                        color: #f8fafc;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        flex: 1;
                    ">
                        Cancel
                    </button>
                    <button id="confirmOk" style="
                        padding: 12px 30px;
                        background: linear-gradient(135deg, #f72585, #e11575);
                        border: none;
                        color: white;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        flex: 1;
                    ">
                        Confirm
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        document.getElementById('confirmCancel').addEventListener('click', () => {
            document.body.removeChild(modal);
            document.body.style.overflow = 'auto';
            resolve(false);
        });
        
        document.getElementById('confirmOk').addEventListener('click', () => {
            document.body.removeChild(modal);
            document.body.style.overflow = 'auto';
            resolve(true);
        });
    });
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin panel initialized');
    
    // Check for existing session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('dashboardSection').style.display = 'block';
        
        document.getElementById('adminName').textContent = currentUser.email.split('@')[0];
        document.getElementById('adminEmailDisplay').textContent = currentUser.email;
        
        await loadAllData();
    } else {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('dashboardSection').style.display = 'none';
    }
    
    setTimeout(() => {
        showLoading(false);
    }, 1000);
});

// ==========================================
// EXPORT FUNCTIONS TO GLOBAL SCOPE
// ==========================================
window.adminLogin = adminLogin;
window.logout = logout;
window.addNewExam = addNewExam;
window.toggleExamStatus = toggleExamStatus;
window.deleteExam = deleteExam;
window.sendNotification = sendNotification;
window.deleteNotification = deleteNotification;
window.deleteChatMessage = deleteChatMessage;
window.toggleEffect = toggleEffect;
window.refreshChat = refreshChat;
window.banUser = banUser;
window.showSection = function(section) {
    document.querySelectorAll('.content-section').forEach(el => {
        el.classList.remove('active');
    });
    
    document.querySelectorAll('.sidebar-menu li').forEach(el => {
        el.classList.remove('active');
    });
    
    document.getElementById(`section-${section}`).classList.add('active');
    
    const menuItem = document.querySelector(`.sidebar-menu li[onclick*="${section}"]`);
    if (menuItem) {
        menuItem.classList.add('active');
    }
};

window.viewNotification = function(id) {
    showToast('View feature coming soon', 'info');
};
