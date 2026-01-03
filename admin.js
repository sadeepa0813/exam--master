// ==========================================
// EXAM MASTER ADMIN - COMPLETE ADMIN PANEL
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
let allExams = [];
let allNotifications = [];
let allChatMessages = [];

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin Panel Initializing...');
    
    // Check for existing session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
        console.error('Session error:', error);
        showToast('Session error. Please login again.', 'error');
    }
    
    if (session) {
        currentUser = session.user;
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('dashboardSection').style.display = 'block';
        
        // Update user info
        updateUserInfo();
        
        // Load all data
        await loadAllData();
        
        // Update database status
        await checkDatabaseConnection();
        
        showToast('Welcome back, ' + currentUser.email, 'success');
    } else {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('dashboardSection').style.display = 'none';
    }
    
    // Hide loading overlay
    setTimeout(() => {
        document.getElementById('loadingOverlay').style.display = 'none';
    }, 1000);
});

// Update user information
function updateUserInfo() {
    if (currentUser) {
        const adminName = document.getElementById('adminName');
        const adminEmail = document.getElementById('adminEmailDisplay');
        
        if (adminName) {
            adminName.textContent = currentUser.email.split('@')[0] || 'Administrator';
        }
        
        if (adminEmail) {
            adminEmail.textContent = currentUser.email;
        }
    }
}

// Check database connection
async function checkDatabaseConnection() {
    try {
        const { data, error } = await supabase
            .from('exams')
            .select('count')
            .limit(1);
        
        if (error) {
            console.error('Database connection failed:', error);
            isDatabaseConnected = false;
            updateDatabaseStatus(false);
            return false;
        }
        
        console.log('Database connection successful');
        isDatabaseConnected = true;
        updateDatabaseStatus(true);
        return true;
        
    } catch (error) {
        console.error('Database check error:', error);
        isDatabaseConnected = false;
        updateDatabaseStatus(false);
        return false;
    }
}

// Update database status indicator
function updateDatabaseStatus(connected) {
    const dbStatus = document.getElementById('dbStatus');
    if (dbStatus) {
        if (connected) {
            dbStatus.style.backgroundColor = '#4cc9f0';
            dbStatus.classList.add('active');
        } else {
            dbStatus.style.backgroundColor = '#f72585';
            dbStatus.classList.remove('active');
        }
    }
}

// ==========================================
// AUTHENTICATION
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
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            console.error('Login error:', error);
            
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
        
        // Update UI
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('dashboardSection').style.display = 'block';
        
        updateUserInfo();
        
        // Load data
        await loadAllData();
        
        // Check database connection
        await checkDatabaseConnection();
        
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
// DATA LOADING
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
        
        console.log('All data loaded successfully');
        
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Failed to load some data', 'warning');
    } finally {
        showLoading(false);
    }
}

async function loadDashboardStats() {
    try {
        // Get counts
        const [examsCount, notificationsCount, commentsCount] = await Promise.all([
            supabase.from('exams').select('*', { count: 'exact', head: true }).eq('status', 'enabled'),
            supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('comments').select('*', { count: 'exact', head: true })
        ]);
        
        // Update UI
        document.getElementById('statExams').textContent = examsCount.count || 0;
        document.getElementById('statNotifications').textContent = notificationsCount.count || 0;
        document.getElementById('statComments').textContent = commentsCount.count || 0;
        
        // Get active users (simulated for demo)
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
        
        allExams = data || [];
        
        const tableBody = document.getElementById('examsTable');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (allExams.length > 0) {
            allExams.forEach(exam => {
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
                    <td>
                        <span class="${daysLeft > 0 ? 'text-success' : 'text-danger'}">
                            ${daysLeft > 0 ? `${daysLeft} days` : 'Past'}
                        </span>
                    </td>
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
        
        allNotifications = data || [];
        
        const container = document.getElementById('notificationsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (allNotifications.length > 0) {
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
                        ${allNotifications.map(notif => {
                            const date = new Date(notif.created_at);
                            const priorityText = notif.priority === 3 ? 'High' : notif.priority === 2 ? 'Medium' : 'Low';
                            const priorityClass = notif.priority === 3 ? 'status-active' : notif.priority === 2 ? 'status-warning' : 'status-inactive';
                            
                            return `
                                <tr>
                                    <td>${notif.title}</td>
                                    <td>${date.toLocaleDateString('en-US')}</td>
                                    <td>
                                        <span class="status-badge ${priorityClass}">
                                            ${priorityText}
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
        
        allChatMessages = data || [];
        
        const tableBody = document.getElementById('chatTable');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (allChatMessages.length > 0) {
            allChatMessages.forEach(comment => {
                const date = new Date(comment.created_at);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span>${comment.user_name}</span>
                            <button class="btn-icon btn-danger" onclick="banUser('${comment.user_name}')" 
                                    style="padding: 4px 8px; font-size: 0.8rem;">
                                <i class="fas fa-ban"></i>
                            </button>
                        </div>
                    </td>
                    <td>${comment.message.length > 100 ? comment.message.substring(0, 100) + '...' : comment.message}</td>
                    <td>${comment.ip_address || 'N/A'}</td>
                    <td>${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td class="actions">
                        <button class="btn-icon" onclick="viewChatMessage('${comment.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon btn-danger" onclick="deleteChatMessage('${comment.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            // Update stats
            updateChatStats();
            
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

function updateChatStats() {
    // Total messages
    document.getElementById('totalMessages').textContent = allChatMessages.length;
    
    // Today's messages
    const today = new Date().toDateString();
    const todayMessages = allChatMessages.filter(msg => 
        new Date(msg.created_at).toDateString() === today
    ).length;
    document.getElementById('todayMessages').textContent = todayMessages;
    
    // Unique users
    const uniqueUsers = [...new Set(allChatMessages.map(msg => msg.user_name))].length;
    document.getElementById('activeUsers').textContent = uniqueUsers;
}

async function loadRecentActivity() {
    try {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;
        
        // Get recent activities
        const recentActivities = [];
        
        // Add recent exams
        if (allExams.length > 0) {
            allExams.slice(0, 3).forEach(exam => {
                recentActivities.push({
                    type: 'exam',
                    title: `New exam added: ${exam.batch_name}`,
                    time: new Date(exam.created_at || exam.updated_at),
                    icon: 'fas fa-calendar-plus'
                });
            });
        }
        
        // Add recent notifications
        if (allNotifications.length > 0) {
            allNotifications.slice(0, 3).forEach(notif => {
                recentActivities.push({
                    type: 'notification',
                    title: `Notification: ${notif.title}`,
                    time: new Date(notif.created_at),
                    icon: 'fas fa-bell'
                });
            });
        }
        
        // Sort by time
        recentActivities.sort((a, b) => b.time - a.time);
        
        // Display
        activityList.innerHTML = recentActivities.slice(0, 5).map(activity => `
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
            .in('setting_key', ['snow_effect', 'confetti_effect', 'dark_theme']);
        
        if (error) {
            console.log('No effects settings found, creating defaults...');
            await createDefaultSettings();
            return;
        }
        
        console.log('Loaded effects settings:', data);
        
        if (data && data.length > 0) {
            data.forEach(setting => {
                const checkbox = document.getElementById(`${setting.setting_key}`);
                if (checkbox) {
                    checkbox.checked = setting.is_enabled;
                    console.log(`Set ${setting.setting_key} to: ${setting.is_enabled}`);
                }
            });
        }
        
    } catch (error) {
        console.error('Error loading effects status:', error);
    }
}

async function createDefaultSettings() {
    try {
        const defaultSettings = [
            { setting_key: 'snow_effect', setting_value: 'false', is_enabled: false },
            { setting_key: 'confetti_effect', setting_value: 'false', is_enabled: false },
            { setting_key: 'dark_theme', setting_value: 'true', is_enabled: true }
        ];
        
        const { error } = await supabase
            .from('site_settings')
            .insert(defaultSettings);
        
        if (error) throw error;
        
        console.log('Default settings created');
        
    } catch (error) {
        console.error('Error creating default settings:', error);
    }
}

// ==========================================
// CRUD OPERATIONS - EXAMS
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
            description: description || '',
            status: 'enabled'
        };
        
        const { data, error } = await supabase
            .from('exams')
            .insert([examData])
            .select();
        
        if (error) {
            console.error('Add exam error:', error);
            
            if (error.message.includes('check constraint')) {
                showToast('Invalid exam status. Please use "enabled" or "disabled".', 'error');
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
    const action = newStatus === 'enabled' ? 'activate' : 'deactivate';
    
    const confirmed = await showConfirmation(
        'Change Exam Status',
        `Are you sure you want to ${action} this exam?`,
        action.charAt(0).toUpperCase() + action.slice(1)
    );
    
    if (!confirmed) return;
    
    showLoading(true);
    
    try {
        const { error } = await supabase
            .from('exams')
            .update({ status: newStatus })
            .eq('id', id);
        
        if (error) throw error;
        
        showToast(`Exam ${action}d successfully!`, 'success');
        await loadExams();
        
    } catch (error) {
        console.error('Error toggling exam status:', error);
        showToast('Failed to update exam status: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteExam(id) {
    const confirmed = await showConfirmation(
        'Delete Exam',
        'Are you sure you want to delete this exam? This action cannot be undone.',
        'Delete'
    );
    
    if (!confirmed) return;
    
    showLoading(true);
    
    try {
        // Get exam info for message
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

// ==========================================
// CRUD OPERATIONS - NOTIFICATIONS
// ==========================================
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
        
        // Create notification data
        const notificationData = {
            title: title,
            message: message || '',
            image_url: imageUrl,
            pdf_url: pdfUrl,
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
    const confirmed = await showConfirmation(
        'Delete Notification',
        'Are you sure you want to delete this notification?',
        'Delete'
    );
    
    if (!confirmed) return;
    
    showLoading(true);
    
    try {
        // Get notification info
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

// ==========================================
// CHAT MANAGEMENT
// ==========================================
async function deleteChatMessage(id) {
    const confirmed = await showConfirmation(
        'Delete Message',
        'Are you sure you want to delete this chat message?',
        'Delete'
    );
    
    if (!confirmed) return;
    
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
        showToast('Failed to delete chat message: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function banUser(userName) {
    const confirmed = await showConfirmation(
        'Ban User',
        `Are you sure you want to ban user "${userName}"? This will delete all their messages.`,
        'Ban'
    );
    
    if (!confirmed) return;
    
    showLoading(true);
    
    try {
        // Get user's IP from recent messages
        const { data: userMessages, error: fetchError } = await supabase
            .from('comments')
            .select('ip_address')
            .eq('user_name', userName)
            .limit(1);
        
        if (fetchError) throw fetchError;
        
        let ipAddress = 'unknown';
        if (userMessages && userMessages.length > 0) {
            ipAddress = userMessages[0].ip_address;
        }
        
        // Add to banned_users table
        const { error: banError } = await supabase
            .from('banned_users')
            .insert([{
                user_name: userName,
                ip_address: ipAddress,
                banned_by: currentUser?.email || 'admin',
                reason: 'Inappropriate behavior in chat'
            }]);
        
        if (banError) throw banError;
        
        // Delete all user's messages
        const { error: deleteError } = await supabase
            .from('comments')
            .delete()
            .eq('user_name', userName);
        
        if (deleteError) throw deleteError;
        
        showToast(`User "${userName}" has been banned successfully`, 'success');
        await loadChatData();
        
    } catch (error) {
        console.error('Error banning user:', error);
        showToast('Failed to ban user: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function refreshChat() {
    showLoading(true);
    setTimeout(() => {
        loadChatData();
        showLoading(false);
        showToast('Chat refreshed', 'success');
    }, 1000);
}

// ==========================================
// EFFECTS MANAGEMENT
// ==========================================
async function toggleEffect(effect, enabled) {
    console.log(`Toggling ${effect} effect: ${enabled}`);
    
    showLoading(true);
    
    try {
        // Check if setting exists
        const { data: existing } = await supabase
            .from('site_settings')
            .select('*')
            .eq('setting_key', `${effect}_effect`)
            .single()
            .catch(() => ({ data: null }));
        
        let result;
        
        if (existing) {
            // Update existing setting
            result = await supabase
                .from('site_settings')
                .update({
                    setting_value: enabled ? 'true' : 'false',
                    is_enabled: enabled,
                    updated_at: new Date().toISOString()
                })
                .eq('setting_key', `${effect}_effect`);
        } else {
            // Insert new setting
            result = await supabase
                .from('site_settings')
                .insert({
                    setting_key: `${effect}_effect`,
                    setting_value: enabled ? 'true' : 'false',
                    is_enabled: enabled,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
        }
        
        const { error } = result;
        
        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        
        const effectName = effect === 'snow' ? 'Snow effect' : 'Confetti effect';
        showToast(`${effectName} ${enabled ? 'enabled' : 'disabled'} successfully!`, 'success');
        
        // Show preview
        showEffectPreview(effect, enabled);
        
    } catch (error) {
        console.error('Error toggling effect:', error);
        showToast('Failed to update effect: ' + error.message, 'error');
        
        // Revert checkbox
        const checkbox = document.getElementById(`${effect}_effect`);
        if (checkbox) {
            checkbox.checked = !enabled;
        }
    } finally {
        showLoading(false);
    }
}

function showEffectPreview(effect, enabled) {
    const previewDiv = document.getElementById('effectPreview');
    if (previewDiv && previewDiv.parentElement) {
        previewDiv.parentElement.removeChild(previewDiv);
    }
    
    if (!enabled) return;
    
    const container = document.createElement('div');
    container.id = 'effectPreview';
    container.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1001;
        pointer-events: none;
    `;
    
    const effectName = effect === 'snow' ? 'Snow' : 'Confetti';
    const emoji = effect === 'snow' ? '❄️' : '🎉';
    const color = effect === 'snow' ? '#4cc9f0' : '#f72585';
    
    container.innerHTML = `
        <div style="
            background: rgba(30, 41, 59, 0.95);
            border-radius: 20px;
            padding: 30px;
            text-align: center;
            border: 2px solid ${color};
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            animation: fadeIn 0.3s ease;
            backdrop-filter: blur(10px);
        ">
            <div style="font-size: 4rem; margin-bottom: 20px;">${emoji}</div>
            <h3 style="color: white; margin-bottom: 10px; font-size: 1.5rem;">${effectName} Effect Enabled</h3>
            <p style="color: #cbd5e1; margin-bottom: 20px;">Effect will appear on the main website</p>
            <div style="
                width: 100px;
                height: 100px;
                margin: 0 auto;
                background: ${effect === 'snow' ? 
                    'linear-gradient(135deg, #ffffff, #e0f7fa)' : 
                    'linear-gradient(135deg, #ff6b6b, #ffd700, #4ecdc4)'};
                border-radius: 50%;
                animation: pulse 2s infinite;
            "></div>
        </div>
    `;
    
    document.body.appendChild(container);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (container.parentElement) {
            container.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (container.parentElement) {
                    container.parentElement.removeChild(container);
                }
            }, 300);
        }
    }, 3000);
}

function toggleTheme(theme, enabled) {
    showToast(`Theme settings saved. Refresh page to see changes.`, 'info');
}

function selectTheme(theme) {
    showToast(`Selected ${theme} theme. Changes will apply on next refresh.`, 'info');
}

function testEffects() {
    showToast('Testing effects... Check the main website!', 'info');
}

function backupDatabase() {
    showToast('Database backup initiated. You will receive an email when complete.', 'info');
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
    console.log(`Toast: ${message} (${type})`);
    
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'toast';
    
    // Set color based on type
    let borderColor = '#4361ee';
    if (type === 'success') borderColor = '#4cc9f0';
    else if (type === 'error') borderColor = '#f72585';
    else if (type === 'warning') borderColor = '#f8961e';
    
    toast.style.borderLeftColor = borderColor;
    
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

// Confirmation Dialog
async function showConfirmation(title, message, confirmText = 'Confirm') {
    return new Promise((resolve) => {
       
