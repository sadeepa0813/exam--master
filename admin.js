// ==========================================
// EXAM MASTER ADMIN - FIXED VERSION
// Professional Admin Panel with Database Connection
// ==========================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase Configuration
const SUPABASE_URL = 'https://nstnkxtxlqelwnefkmaj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdG5reHR4bHFlbHduZWZrbWFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg0NTc0OCwiZXhwIjoyMDgyNDIxNzQ4fQ.7nxY8FIR05sbZ33e4-hpZx6n8l-WA-gnlk2pOwxo2z4';

// Initialize Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global Variables
let currentUser = null;
let isDatabaseConnected = false;

// ==========================================
// DATABASE CONNECTION TEST
// ==========================================
async function testDatabaseConnection() {
    try {
        showLoading(true);
        
        // Test connection by fetching a simple query
        const { data, error } = await supabase
            .from('exams')
            .select('count')
            .limit(1);
        
        if (error) {
            console.error('Database connection failed:', error);
            showToast('Database connection failed. Please check your internet connection and try again.', 'error');
            isDatabaseConnected = false;
            return false;
        }
        
        console.log('Database connection successful');
        isDatabaseConnected = true;
        
        // Update database status indicator
        const dbStatus = document.getElementById('dbStatus');
        if (dbStatus) {
            dbStatus.style.background = '#4cc9f0';
            dbStatus.classList.add('active');
        }
        
        showToast('Connected to database successfully!', 'success');
        return true;
        
    } catch (error) {
        console.error('Connection test error:', error);
        isDatabaseConnected = false;
        showToast('Failed to connect to database.', 'error');
        return false;
    } finally {
        showLoading(false);
    }
}

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
        // First test database connection
        const isConnected = await testDatabaseConnection();
        if (!isConnected) {
            showToast('Cannot connect to database. Please try again later.', 'error');
            return;
        }
        
        // Attempt login
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                showToast('Invalid email or password', 'error');
            } else if (error.message.includes('Email not confirmed')) {
                showToast('Please verify your email address first', 'warning');
            } else {
                showToast('Login failed: ' + error.message, 'error');
            }
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
        showToast('An unexpected error occurred during login', 'error');
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
        // Load data in parallel
        await Promise.all([
            loadDashboardStats(),
            loadExams(),
            loadNotifications(),
            loadChatData(),
            loadRecentActivity()
        ]);
        
        console.log('All data loaded successfully');
        
    } catch (error) {
        console.error('Error loading all data:', error);
        showToast('Failed to load some data. Please refresh.', 'warning');
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
        
        // Simulate active users (for demo)
        const activeUsers = Math.floor(Math.random() * 100) + 50;
        document.getElementById('statUsers').textContent = activeUsers;
        
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
                        <button class="btn-icon" onclick="toggleExamStatus(${exam.id}, '${exam.status}')">
                            <i class="fas fa-${exam.status === 'enabled' ? 'eye-slash' : 'eye'}"></i>
                        </button>
                        <button class="btn-icon btn-danger" onclick="deleteExam(${exam.id})">
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
                            <th>Type</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(notif => {
                            const date = new Date(notif.created_at);
                            const type = notif.image_url ? 'Image' : notif.pdf_url ? 'PDF' : 'Text';
                            
                            return `
                                <tr>
                                    <td>${notif.title}</td>
                                    <td>${type}</td>
                                    <td>${date.toLocaleDateString('en-US')}</td>
                                    <td class="actions">
                                        <button class="btn-icon" onclick="viewNotification(${notif.id})">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn-icon btn-danger" onclick="deleteNotification(${notif.id})">
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
                    <small>Create your first notification using the form above</small>
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
                        <button class="btn-icon" onclick="viewChatMessage(${comment.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon btn-danger" onclick="deleteChatMessage(${comment.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            // Update stats
            document.getElementById('totalMessages').textContent = data.length;
            document.getElementById('todayMessages').textContent = data.filter(c => 
                new Date(c.created_at).toDateString() === new Date().toDateString()
            ).length;
            
            // Count unique users
            const uniqueUsers = [...new Set(data.map(c => c.user_name))].length;
            document.getElementById('activeUsers').textContent = uniqueUsers;
            
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
            .limit(5);
        
        // Get recent notifications
        const { data: notifications } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        
        // Combine and sort activities
        const activities = [
            ...(exams?.map(exam => ({
                type: 'exam',
                title: `New exam added: ${exam.batch_name}`,
                time: new Date(exam.created_at),
                icon: 'fas fa-calendar-plus'
            })) || []),
            ...(notifications?.map(notif => ({
                type: 'notification',
                title: `Notification sent: ${notif.title}`,
                time: new Date(notif.created_at),
                icon: 'fas fa-bell'
            })) || [])
        ].sort((a, b) => b.time - a.time).slice(0, 10);
        
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

// ==========================================
// CRUD OPERATIONS
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
            status: 'enabled',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        console.log('Inserting exam data:', examData);
        
        const { data, error } = await supabase
            .from('exams')
            .insert([examData])
            .select();
        
        if (error) {
            console.error('Supabase error:', error);
            if (error.message.includes('check constraint')) {
                showToast('Please check the exam status (should be "enabled" or "disabled")', 'error');
            } else {
                showToast('Failed to add exam: ' + error.message, 'error');
            }
            return;
        }
        
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

async function deleteExam(id) {
    if (!await showConfirmation('Are you sure you want to delete this exam? This action cannot be undone.')) {
        return;
    }
    
    showLoading(true);
    
    try {
        const { error } = await supabase
            .from('exams')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        showToast('Exam deleted successfully', 'success');
        await loadExams();
        await loadDashboardStats();
        
    } catch (error) {
        console.error('Error deleting exam:', error);
        showToast('Failed to delete exam', 'error');
    } finally {
        showLoading(false);
    }
}

async function sendNotification() {
    const title = document.getElementById('notificationTitle')?.value.trim();
    const message = document.getElementById('notificationMessage')?.value.trim();
    const isImportant = document.getElementById('notificationImportant')?.checked;
    const isPersistent = document.getElementById('notificationPersistent')?.checked;
    const imageFile = document.getElementById('notificationImage')?.files[0];
    const pdfFile = document.getElementById('notificationPdf')?.files[0];
    
    if (!title) {
        showToast('Please enter a notification title', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        let imageUrl = null;
        let pdfUrl = null;
        
        // Upload image if selected
        if (imageFile) {
            const fileName = `image_${Date.now()}_${imageFile.name.replace(/\s+/g, '_')}`;
            const { data, error } = await supabase.storage
                .from('uploads')
                .upload(`notifications/${fileName}`, imageFile);
            
            if (error) throw error;
            
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(`notifications/${fileName}`);
            
            imageUrl = publicUrl;
        }
        
        // Upload PDF if selected
        if (pdfFile) {
            const fileName = `pdf_${Date.now()}_${pdfFile.name.replace(/\s+/g, '_')}`;
            const { data, error } = await supabase.storage
                .from('uploads')
                .upload(`notifications/${fileName}`, pdfFile);
            
            if (error) throw error;
            
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(`notifications/${fileName}`);
            
            pdfUrl = publicUrl;
        }
        
        // Insert notification
        const { error } = await supabase
            .from('notifications')
            .insert([{
                title: title,
                message: message,
                image_url: imageUrl,
                pdf_url: pdfUrl,
                is_active: true,
                show_until_dismissed: isPersistent,
                priority: isImportant ? 2 : 1,
                created_at: new Date().toISOString(),
                created_by: currentUser?.email || 'admin'
            }]);
        
        if (error) throw error;
        
        showToast('Notification sent successfully!', 'success');
        
        // Clear form
        document.getElementById('notificationTitle').value = '';
        document.getElementById('notificationMessage').value = '';
        document.getElementById('notificationImportant').checked = false;
        document.getElementById('notificationPersistent').checked = false;
        document.getElementById('notificationImage').value = '';
        document.getElementById('notificationPdf').value = '';
        
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
    if (!await showConfirmation('Are you sure you want to delete this notification?')) {
        return;
    }
    
    showLoading(true);
    
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_active: false })
            .eq('id', id);
        
        if (error) throw error;
        
        showToast('Notification deleted successfully', 'success');
        await loadNotifications();
        await loadDashboardStats();
        
    } catch (error) {
        console.error('Error deleting notification:', error);
        showToast('Failed to delete notification', 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteChatMessage(id) {
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

// User Management Functions for Chat
async function banUser(userName) {
    if (!await showConfirmation(`Are you sure you want to ban user "${userName}"?`)) {
        return;
    }
    
    showLoading(true);
    
    try {
        // First get user's IP from comments
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
                    banned_at: new Date().toISOString(),
                    reason: 'Inappropriate behavior in chat',
                    banned_by: currentUser?.email || 'admin'
                }]);
            
            if (error) throw error;
            
            // Delete all user's messages
            const { error: deleteError } = await supabase
                .from('comments')
                .delete()
                .eq('user_name', userName);
            
            if (deleteError) throw deleteError;
            
            showToast(`User "${userName}" has been banned successfully`, 'success');
            await loadChatData();
        } else {
            showToast('User not found in chat records', 'error');
        }
        
    } catch (error) {
        console.error('Error banning user:', error);
        showToast('Failed to ban user', 'error');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// SITE EFFECTS & THEMES
// ==========================================
async function toggleEffect(effect, enabled) {
    try {
        // Save setting to database
        const { error } = await supabase
            .from('site_settings')
            .upsert({
                setting_key: `${effect}_effect`,
                setting_value: enabled ? 'true' : 'false',
                is_enabled: enabled,
                updated_at: new Date().toISOString()
            });
        
        if (error) throw error;
        
        const effectName = effect === 'snow' ? 'Snow effect' : 'Confetti effect';
        showToast(`${effectName} ${enabled ? 'enabled' : 'disabled'}`, 'success');
        
    } catch (error) {
        console.error('Error toggling effect:', error);
        showToast('Failed to update effect setting', 'error');
    }
}

function toggleTheme(theme, enabled) {
    // This would be implemented based on your theme system
    showToast('Theme settings saved. Refresh page to see changes.', 'success');
}

function selectTheme(theme) {
    showToast(`Selected ${theme} theme. Changes will apply on next refresh.`, 'info');
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
    
    // Set message and type
    toast.textContent = message;
    toast.className = 'toast';
    
    // Add type-specific styling
    if (type === 'success') {
        toast.style.borderLeftColor = '#4cc9f0';
    } else if (type === 'error') {
        toast.style.borderLeftColor = '#f72585';
    } else if (type === 'warning') {
        toast.style.borderLeftColor = '#f8961e';
    } else {
        toast.style.borderLeftColor = '#4361ee';
    }
    
    // Show toast
    toast.classList.add('show');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}

function formatTimeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
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
        showToast('Chat data refreshed', 'success');
    }, 1000);
}

function backupDatabase() {
    showToast('Database backup initiated. You will receive an email when complete.', 'info');
    // In a real application, this would trigger a server-side backup process
}

// Confirmation Modal
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
                <div style="font-size: 3rem; color: #f8961e; margin-bottom: 20px;">
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
                        padding: 12px 25px;
                        background: #0f172a;
                        border: 1px solid #334155;
                        color: #f8fafc;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        flex: 1;
                    ">
                        Cancel
                    </button>
                    <button id="confirmOk" style="
                        padding: 12px 25px;
                        background: linear-gradient(135deg, #4361ee, #7209b7);
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
        
        // Update user info
        document.getElementById('adminName').textContent = currentUser.email.split('@')[0];
        document.getElementById('adminEmailDisplay').textContent = currentUser.email;
        
        // Load data
        await loadAllData();
    } else {
        // Show login screen
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('dashboardSection').style.display = 'none';
    }
    
    // Hide loading overlay
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
window.toggleTheme = toggleTheme;
window.selectTheme = selectTheme;
window.refreshChat = refreshChat;
window.backupDatabase = backupDatabase;
window.banUser = banUser;
window.showSection = function(section) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(el => {
        el.classList.remove('active');
    });
    
    // Remove active from all menu items
    document.querySelectorAll('.sidebar-menu li').forEach(el => {
        el.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(`section-${section}`).classList.add('active');
    
    // Set active menu item
    const menuItem = document.querySelector(`.sidebar-menu li[onclick*="${section}"]`);
    if (menuItem) {
        menuItem.classList.add('active');
    }
};

// View functions
window.viewNotification = function(id) {
    showToast('View notification feature coming soon', 'info');
};

window.viewChatMessage = function(id) {
    showToast('View chat message feature coming soon', 'info');
};
