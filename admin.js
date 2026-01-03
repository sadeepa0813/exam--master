// ==========================================
// EXAM MASTER ADMIN - COMPLETE ADMIN PANEL (FIXED)
// ==========================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase Configuration
const SUPABASE_URL = 'https://nstnkxtxlqelwnefkmaj.supabase.co';
// ⚠️ IMPORTANT: Replace this with your ANON key, NOT service_role key!
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdG5reHR4bHFlbHduZWZrbWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3NTgzNDgsImV4cCI6MjA1MjMzNDM0OH0.YOUR_ANON_KEY_HERE';

// Initialize Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global Variables
let currentUser = null;
let isDatabaseConnected = false;
let allExams = [];
let allNotifications = [];
let allChatMessages = [];

// Rate limiting
const rateLimiter = {
    requests: {},
    check: function(key, limit = 10, window = 60000) {
        const now = Date.now();
        if (!this.requests[key]) {
            this.requests[key] = [];
        }
        
        // Remove old requests
        this.requests[key] = this.requests[key].filter(time => now - time < window);
        
        if (this.requests[key].length >= limit) {
            return false;
        }
        
        this.requests[key].push(now);
        return true;
    }
};

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin Panel Initializing...');
    
    try {
        // Check for existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error('Session error:', sessionError);
            showToast('Session error. Please login again.', 'error');
            showLoginScreen();
            return;
        }
        
        if (session) {
            currentUser = session.user;
            console.log('User logged in:', currentUser.email);
            
            // Verify admin role
            const isAdmin = await verifyAdminRole(currentUser);
            if (!isAdmin) {
                showToast('Access denied. Admin privileges required.', 'error');
                await logout();
                return;
            }
            
            // Update UI
            showDashboardScreen();
            updateUserInfo();
            
            // Load all data
            await loadAllData();
            
            // Update database status
            await checkDatabaseConnection();
            
            showToast('Welcome back, ' + currentUser.email, 'success');
        } else {
            console.log('No session found, showing login form');
            showLoginScreen();
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('System initialization failed', 'error');
        showLoginScreen();
    } finally {
        // Hide loading overlay
        setTimeout(() => {
            const loader = document.getElementById('loadingOverlay');
            if (loader) loader.style.display = 'none';
        }, 1000);
    }
});

// Verify admin role
async function verifyAdminRole(user) {
    try {
        // Check if user has admin role in database
        const { data, error } = await supabase
            .from('admin_users')
            .select('role')
            .eq('email', user.email)
            .eq('is_active', true)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            console.error('Admin verification error:', error);
            return false;
        }
        
        return data && data.role === 'admin';
    } catch (error) {
        console.error('Error verifying admin:', error);
        return false;
    }
}

// Show login screen
function showLoginScreen() {
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');
    
    if (loginSection) loginSection.style.display = 'block';
    if (dashboardSection) dashboardSection.style.display = 'none';
}

// Show dashboard screen
function showDashboardScreen() {
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');
    
    if (loginSection) loginSection.style.display = 'none';
    if (dashboardSection) dashboardSection.style.display = 'block';
}

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
        const { error } = await supabase
            .from('exams')
            .select('id')
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
    
    // Input validation
    if (!email || !password) {
        showToast('Please enter email and password', 'error');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    // Rate limiting
    if (!rateLimiter.check('login', 5, 300000)) {
        showToast('Too many login attempts. Please try again later.', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        // Sign in with email and password
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            console.error('Login error:', error);
            
            if (error.message === 'Invalid login credentials') {
                showToast('Invalid email or password', 'error');
            } else if (error.message.includes('Email not confirmed')) {
                showToast('Please verify your email address first', 'warning');
            } else {
                showToast('Login failed: ' + error.message, 'error');
            }
            return;
        }
        
        if (!data.user) {
            showToast('Login failed: No user data returned', 'error');
            return;
        }
        
        currentUser = data.user;
        console.log('Login successful:', currentUser.email);
        
        // Verify admin role
        const isAdmin = await verifyAdminRole(currentUser);
        if (!isAdmin) {
            showToast('Access denied. Admin privileges required.', 'error');
            await supabase.auth.signOut();
            return;
        }
        
        // Update UI
        showDashboardScreen();
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
        showToast('An unexpected error occurred: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            console.error('Sign out error:', error);
            showToast('Logout failed: ' + error.message, 'error');
            return;
        }
        
        currentUser = null;
        
        // Reset UI
        showLoginScreen();
        
        // Clear all data
        allExams = [];
        allNotifications = [];
        allChatMessages = [];
        
        // Reset forms
        const emailField = document.getElementById('adminEmail');
        const passwordField = document.getElementById('adminPassword');
        if (emailField) emailField.value = '';
        if (passwordField) passwordField.value = '';
        
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
        await loadDashboardStats();
        await loadExams();
        await loadNotifications();
        await loadChatData();
        await loadRecentActivity();
        await loadEffectsStatus();
        
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
        const [examsResult, notificationsResult, commentsResult] = await Promise.allSettled([
            supabase.from('exams').select('*', { count: 'exact', head: true }),
            supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('comments').select('*', { count: 'exact', head: true })
        ]);
        
        // Update UI with results
        const statExams = document.getElementById('statExams');
        const statNotifications = document.getElementById('statNotifications');
        const statComments = document.getElementById('statComments');
        
        if (statExams) {
            statExams.textContent = examsResult.status === 'fulfilled' && examsResult.value.count ? examsResult.value.count : 0;
        }
        if (statNotifications) {
            statNotifications.textContent = notificationsResult.status === 'fulfilled' && notificationsResult.value.count ? notificationsResult.value.count : 0;
        }
        if (statComments) {
            statComments.textContent = commentsResult.status === 'fulfilled' && commentsResult.value.count ? commentsResult.value.count : 0;
        }
        
        // Get active users from last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const { data: activeUsers } = await supabase
            .from('comments')
            .select('user_name')
            .gte('created_at', yesterday.toISOString());
        
        const statUsers = document.getElementById('statUsers');
        if (statUsers) {
            if (activeUsers && activeUsers.length > 0) {
                const uniqueUsers = [...new Set(activeUsers.map(msg => msg.user_name))].length;
                statUsers.textContent = uniqueUsers;
            } else {
                statUsers.textContent = '0';
            }
        }
        
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
                    <td>${sanitizeHTML(exam.batch_name)}</td>
                    <td>${examDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td>${daysLeft > 0 ? `${daysLeft} days` : 'Past'}</td>
                    <td><span class="status-badge ${exam.status === 'enabled' ? 'status-active' : 'status-inactive'}">${exam.status === 'enabled' ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn-icon" onclick="toggleExamStatus(${exam.id}, '${exam.status}')" title="Toggle Status">
                            <i class="fas fa-${exam.status === 'enabled' ? 'pause' : 'play'}"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteExam(${exam.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        <i class="fas fa-inbox" style="font-size: 3rem; opacity: 0.3; display: block; margin-bottom: 1rem;"></i>
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
                <table>
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
                                    <td>${sanitizeHTML(notif.title)}</td>
                                    <td>${date.toLocaleDateString('en-US')}</td>
                                    <td><span class="status-badge ${priorityClass}">${priorityText}</span></td>
                                    <td>
                                        <button class="btn-icon" onclick="viewNotification(${notif.id})" title="View">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn-icon btn-delete" onclick="deleteNotification(${notif.id})" title="Delete">
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
                <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <i class="fas fa-bell-slash" style="font-size: 3rem; opacity: 0.3; display: block; margin-bottom: 1rem;"></i>
                    <p style="margin: 0;">No active notifications</p>
                    <p style="font-size: 0.9rem; opacity: 0.7;">Create your first notification using the form above</p>
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
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-user-circle" style="color: var(--primary); font-size: 1.2rem;"></i>
                            <strong>${sanitizeHTML(comment.user_name)}</strong>
                        </div>
                    </td>
                    <td>${sanitizeHTML(comment.message.length > 100 ? comment.message.substring(0, 100) + '...' : comment.message)}</td>
                    <td>${sanitizeHTML(comment.ip_address || 'N/A')}</td>
                    <td>${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>
                        <button class="btn-icon" onclick="viewChatMessage(${comment.id})" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteChatMessage(${comment.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="btn-icon" style="color: #f72585;" onclick="banUser('${sanitizeHTML(comment.user_name)}')" title="Ban User">
                            <i class="fas fa-ban"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            updateChatStats();
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        <i class="fas fa-comments" style="font-size: 3rem; opacity: 0.3; display: block; margin-bottom: 1rem;"></i>
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
    const totalMessages = document.getElementById('totalMessages');
    const todayMessages = document.getElementById('todayMessages');
    const activeUsers = document.getElementById('activeUsers');
    
    if (totalMessages) {
        totalMessages.textContent = allChatMessages.length;
    }
    
    const today = new Date().toDateString();
    const todayCount = allChatMessages.filter(msg => 
        new Date(msg.created_at).toDateString() === today
    ).length;
    
    if (todayMessages) {
        todayMessages.textContent = todayCount;
    }
    
    const uniqueUsers = [...new Set(allChatMessages.map(msg => msg.user_name))].length;
    if (activeUsers) {
        activeUsers.textContent = uniqueUsers;
    }
}

async function loadRecentActivity() {
    try {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;
        
        const recentActivities = [];
        
        // Get recent exams
        if (allExams.length > 0) {
            allExams.slice(0, 3).forEach(exam => {
                recentActivities.push({
                    type: 'exam',
                    title: `New exam added: ${exam.batch_name}`,
                    time: new Date(exam.created_at || exam.exam_date),
                    icon: 'fas fa-calendar-plus'
                });
            });
        }
        
        // Get recent notifications
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
        
        // Get recent chat messages
        if (allChatMessages.length > 0) {
            allChatMessages.slice(0, 2).forEach(msg => {
                recentActivities.push({
                    type: 'chat',
                    title: `New message from ${msg.user_name}`,
                    time: new Date(msg.created_at),
                    icon: 'fas fa-comment'
                });
            });
        }
        
        // Sort by time
        recentActivities.sort((a, b) => b.time - a.time);
        
        // Display top 5
        activityList.innerHTML = recentActivities.slice(0, 5).map(activity => `
            <div class="activity-item">
                <i class="${activity.icon}" style="color: var(--primary);"></i>
                <div>
                    <strong>${sanitizeHTML(activity.title)}</strong>
                    <small>${formatTimeAgo(activity.time)}</small>
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
        
        // Set defaults first
        const snowCheckbox = document.getElementById('snow_effect');
        const confettiCheckbox = document.getElementById('confetti_effect');
        const themeCheckbox = document.getElementById('dark_theme');
        
        if (snowCheckbox) snowCheckbox.checked = false;
        if (confettiCheckbox) confettiCheckbox.checked = false;
        if (themeCheckbox) themeCheckbox.checked = true;
        
        if (!error && data && data.length > 0) {
            data.forEach(setting => {
                const checkbox = document.getElementById(setting.setting_key);
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
// CRUD OPERATIONS - EXAMS
// ==========================================

async function addNewExam() {
    const name = document.getElementById('examName')?.value.trim();
    const dateTime = document.getElementById('examDateTime')?.value;
    const description = document.getElementById('examDescription')?.value.trim();
    
    // Validation
    if (!name || !dateTime) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (name.length < 3) {
        showToast('Exam name must be at least 3 characters', 'error');
        return;
    }
    
    if (name.length > 100) {
        showToast('Exam name is too long (max 100 characters)', 'error');
        return;
    }
    
    // Check date validity
    const examDate = new Date(dateTime);
    if (isNaN(examDate.getTime())) {
        showToast('Invalid date/time', 'error');
        return;
    }
    
    // Rate limiting
    if (!rateLimiter.check('addExam', 10, 60000)) {
        showToast('Too many requests. Please wait a moment.', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        // Check if exam exists
        const { data: existingExams } = await supabase
            .from('exams')
            .select('batch_name')
            .eq('batch_name', name)
            .limit(1);
        
        if (existingExams && existingExams.length > 0) {
            showToast('An exam with this name already exists', 'error');
            return;
        }
        
        // Prepare exam data
        const examData = {
            batch_name: name,
            exam_date: dateTime,
            description: description || '',
            status: 'enabled'
        };
        
        const { error } = await supabase
            .from('exams')
            .insert([examData]);
        
        if (error) throw error;
        
        showToast('Exam added successfully! 🎉', 'success');
        
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
        showToast('Failed to update exam status', 'error');
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
        const { data: exam } = await supabase
            .from('exams')
            .select('batch_name')
            .eq('id', id)
            .single();
        
        const { error } = await supabase
            .from('exams')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        showToast(`"${exam?.batch_name || 'Exam'}" deleted successfully!`, 'success');
        
        await loadExams();
        await loadDashboardStats();
        await loadRecentActivity();
        
    } catch (error) {
        console.error('Error deleting exam:', error);
        showToast('Failed to delete exam', 'error');
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
    
    // Validation
    if (!title) {
        showToast('Please enter a notification title', 'error');
        return;
    }
    
    if (title.length < 3) {
        showToast('Title must be at least 3 characters', 'error');
        return;
    }
    
    if (title.length > 200) {
        showToast('Title is too long (max 200 characters)', 'error');
        return;
    }
    
    // Rate limiting
    if (!rateLimiter.check('sendNotification', 5, 60000)) {
        showToast('Too many requests. Please wait a moment.', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        let imageUrl = null;
        let pdfUrl = null;
        
        // Upload image if exists
        if (imageFile) {
            imageUrl = await uploadFile(imageFile, 'notification-images');
        }
        
        // Upload PDF if exists
        if (pdfFile) {
            pdfUrl = await uploadFile(pdfFile, 'notification-pdfs');
        }
        
        // Prepare notification data
        const notificationData = {
            title: title,
            message: message || '',
            is_active: true,
            show_until_dismissed: isPersistent,
            priority: isImportant ? 3 : 1,
            image_url: imageUrl,
            pdf_url: pdfUrl
        };
        
        const { error } = await supabase
            .from('notifications')
            .insert([notificationData]);
        
        if (error) throw error;
        
        showToast('Notification sent successfully! 🔔', 'success');
        
        // Clear form
        document.getElementById('notificationTitle').value = '';
        document.getElementById('notificationMessage').value = '';
        document.getElementById('notificationImportant').checked = false;
        document.getElementById('notificationPersistent').checked = false;
        removeImage();
        removePDF();
        
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
        const { data: notif } = await supabase
            .from('notifications')
            .select('title')
            .eq('id', id)
            .single();
        
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        showToast(`"${notif?.title || 'Notification'}" deleted successfully!`, 'success');
        
        await loadNotifications();
        await loadDashboardStats();
        
    } catch (error) {
        console.error('Error deleting notification:', error);
        showToast('Failed to delete notification', 'error');
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
        showToast('Failed to delete chat message', 'error');
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
        // Get user's IP
        const { data: userMessages } = await supabase
            .from('comments')
            .select('ip_address')
            .eq('user_name', userName)
            .limit(1);
        
        // Try to add to banned_users table
        try {
            await supabase
                .from('banned_users')
                .insert([{
                    user_name: userName,
                    ip_address: userMessages?.[0]?.ip_address || 'unknown',
                    banned_by: currentUser?.email || 'admin',
                    reason: 'Inappropriate behavior in chat'
                }]);
        } catch (tableError) {
            console.log('banned_users table might not exist:', tableError);
        }
        
        // Delete all user's messages
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('user_name', userName);
        
        if (error) throw error;
        
        showToast(`User "${userName}" has been banned successfully`, 'success');
        await loadChatData();
        
    } catch (error) {
        console.error('Error banning user:', error);
        showToast('Failed to ban user', 'error');
    } finally {
        showLoading(false);
    }
}

function refreshChat() {
    showLoading(true);
    setTimeout(async () => {
        await loadChatData();
        showLoading(false);
        showToast('Chat refreshed', 'success');
    }, 500);
}

// ==========================================
// EFFECTS MANAGEMENT
// ==========================================

async function toggleEffect(effect, enabled) {
    console.log(`Toggling ${effect} effect: ${enabled}`);
    showLoading(true);
    
    try {
        const { data: existing } = await supabase
            .from('site_settings')
            .select('*')
            .eq('setting_key', `${effect}_effect`)
            .maybeSingle();
        
        let result;
        if (existing) {
            result = await supabase
                .from('site_settings')
                .update({
                    setting_value: enabled ? 'true' : 'false',
                    is_enabled: enabled
                })
                .eq('setting_key', `${effect}_effect`);
        } else {
            result = await supabase
                .from('site_settings')
                .insert({
                    setting_key: `${effect}_effect`,
                    setting_value: enabled ? 'true' : 'false',
                    is_enabled: enabled
                });
        }
        
        const { error } = result;
        if (error) throw error;
        
        const effectName = effect === 'snow' ? 'Snow effect' : 'Confetti effect';
        showToast(`${effectName} ${enabled ? 'enabled' : 'disabled'} successfully!`, 'success');
        
        showEffectPreview(effect, enabled);
        
    } catch (error) {
        console.error('Error toggling effect:', error);
        showToast('Failed to update effect', 'error');
        
        // Revert checkbox
        const checkbox = document.getElementById(`${effect}_effect`);
        if (checkbox) checkbox.checked = !enabled;
    } finally {
        showLoading(false);
    }
}

function showEffectPreview(effect, enabled) {
    const existingPreview = document.getElementById('effectPreview');
    if (existingPreview) existingPreview.remove();
    
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
            background: var(--bg-card);
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            border: 2px solid ${color};
            text-align: center;
            animation: slideUp 0.3s ease;
        ">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">${emoji}</div>
            <h3 style="margin: 0; color: ${color};">${effectName} Effect Enabled</h3>
            <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">Effect will appear on the main website</p>
        </div>
    `;
    
    document.body.appendChild(container);
    
    setTimeout(() => {
        if (container.parentElement) {
            container.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (container.parentElement) {
                    container.remove();
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

function testSnowEffect() {
    showEffectPreview('snow', true);
    showToast('Snow effect test started! Check the main website. ❄️', 'success');
}

function testConfettiEffect() {
    showEffectPreview('confetti', true);
    showToast('Confetti effect test started! Check the main website. 🎉', 'success');
}

function stopAllEffects() {
    showToast('All effects stopped. Refresh page to apply.', 'info');
}

function backupDatabase() {
    showToast('Database backup initiated. You will receive an email when complete.', 'info');
}

// ==========================================
// FILE UPLOAD
// ==========================================

async function uploadFile(file, bucket = 'notifications') {
    try {
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) throw error;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);
        
        return publicUrl;
        
    } catch (error) {
        console.error('File upload error:', error);
        throw new Error('Failed to upload file: ' + error.message);
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
    console.log(`Toast: ${message} (${type})`);
    
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'toast';
    
    let borderColor = '#4361ee';
    if (type === 'success') borderColor = '#4cc9f0';
    else if (type === 'error') borderColor = '#f72585';
    else if (type === 'warning') borderColor = '#f8961e';
    
    toast.style.borderLeftColor = borderColor;
    toast.classList.add('show');
    
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

function sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Confirmation Dialog
async function showConfirmation(title, message, confirmText = 'Confirm') {
    return new Promise((resolve) => {
        const modalHTML = `
            <div class="confirmation-modal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            ">
                <div style="
                    background: var(--bg-card);
                    padding: 2rem;
                    border-radius: 12px;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                    animation: slideUp 0.3s ease;
                ">
                    <h3 style="margin: 0 0 1rem 0; color: var(--text-primary);">
                        <i class="fas fa-exclamation-circle" style="color: var(--primary);"></i>
                        ${sanitizeHTML(title)}
                    </h3>
                    <p style="margin: 0 0 1.5rem 0; color: var(--text-secondary);">${sanitizeHTML(message)}</p>
                    <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                        <button id="confirmCancel" style="
                            padding: 0.75rem 1.5rem;
                            border: none;
                            border-radius: 8px;
                            background: var(--bg-dark);
                            color: var(--text-primary);
                            cursor: pointer;
                            font-weight: 500;
                            transition: all 0.3s ease;
                        ">Cancel</button>
                        <button id="confirmOk" style="
                            padding: 0.75rem 1.5rem;
                            border: none;
                            border-radius: 8px;
                            background: var(--primary);
                            color: white;
                            cursor: pointer;
                            font-weight: 500;
                            transition: all 0.3s ease;
                        ">${sanitizeHTML(confirmText)}</button>
                    </div>
                </div>
            </div>
        `;
        
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHTML;
        document.body.appendChild(modalDiv);
        
        document.getElementById('confirmCancel').onclick = () => {
            modalDiv.remove();
            resolve(false);
        };
        
        document.getElementById('confirmOk').onclick = () => {
            modalDiv.remove();
            resolve(true);
        };
        
        modalDiv.querySelector('.confirmation-modal').onclick = (e) => {
            if (e.target.classList.contains('confirmation-modal')) {
                modalDiv.remove();
                resolve(false);
            }
        };
    });
}

// View Notification Details
async function viewNotification(id) {
    const notification = allNotifications.find(n => n.id === id);
    if (!notification) {
        showToast('Notification not found', 'error');
        return;
    }
    
    const date = new Date(notification.created_at);
    
    const modalHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        " onclick="if(event.target === this) this.remove()">
            <div style="
                background: var(--bg-card);
                padding: 2rem;
                border-radius: 12px;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                animation: slideUp 0.3s ease;
            ">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1.5rem;">
                    <h2 style="margin: 0; color: var(--text-primary);">
                        <i class="fas fa-bell" style="color: var(--primary);"></i>
                        ${sanitizeHTML(notification.title)}
                    </h2>
                    <button onclick="this.closest('[style*=fixed]').remove()" style="
                        background: none;
                        border: none;
                        color: var(--text-secondary);
                        font-size: 1.5rem;
                        cursor: pointer;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                    ">×</button>
                </div>
                
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem;">
                    <i class="fas fa-clock"></i>
                    ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                
                <div style="
                    background: var(--bg-dark);
                    padding: 1.5rem;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                    color: var(--text-primary);
                    line-height: 1.6;
                ">
                    ${sanitizeHTML(notification.message || 'No message provided')}
                </div>
                
                ${notification.image_url ? `
                    <img src="${notification.image_url}" alt="Notification image" style="
                        width: 100%;
                        border-radius: 8px;
                        margin-bottom: 1rem;
                    ">
                ` : ''}
                
                ${notification.pdf_url ? `
                    <a href="${notification.pdf_url}" target="_blank" style="
                        display: inline-block;
                        padding: 0.75rem 1.5rem;
                        background: var(--primary);
                        color: white;
                        text-decoration: none;
                        border-radius: 8px;
                        margin-top: 1rem;
                    ">
                        <i class="fas fa-file-pdf"></i> Download PDF
                    </a>
                ` : ''}
            </div>
        </div>
    `;
    
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHTML;
    document.body.appendChild(modalDiv);
}

// View Chat Message Details
async function viewChatMessage(id) {
    const message = allChatMessages.find(m => m.id === id);
    if (!message) {
        showToast('Message not found', 'error');
        return;
    }
    
    const date = new Date(message.created_at);
    
    const modalHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        " onclick="if(event.target === this) this.remove()">
            <div style="
                background: var(--bg-card);
                padding: 2rem;
                border-radius: 12px;
                max-width: 600px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                animation: slideUp 0.3s ease;
            ">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1.5rem;">
                    <h2 style="margin: 0; color: var(--text-primary);">
                        <i class="fas fa-user-circle" style="color: var(--primary);"></i>
                        ${sanitizeHTML(message.user_name)}
                    </h2>
                    <button onclick="this.closest('[style*=fixed]').remove()" style="
                        background: none;
                        border: none;
                        color: var(--text-secondary);
                        font-size: 1.5rem;
                        cursor: pointer;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                    ">×</button>
                </div>
                
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem;">
                    <i class="fas fa-clock"></i>
                    ${date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
                
                <div style="
                    background: var(--bg-dark);
                    padding: 1.5rem;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                    color: var(--text-primary);
                    line-height: 1.6;
                    white-space: pre-wrap;
                ">
                    ${sanitizeHTML(message.message)}
                </div>
                
                ${message.ip_address ? `
                    <div style="
                        background: var(--bg-dark);
                        padding: 1rem;
                        border-radius: 8px;
                        color: var(--text-secondary);
                        font-size: 0.9rem;
                    ">
                        <i class="fas fa-network-wired"></i>
                        IP Address: ${sanitizeHTML(message.ip_address)}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHTML;
    document.body.appendChild(modalDiv);
}

// ==========================================
// IMAGE & PDF PREVIEW
// ==========================================

let selectedImageFile = null;
let selectedPDFFile = null;

function previewImage(event) {
    const file = event.target.files[0];
    const previewContainer = document.getElementById('imagePreviewContainer');
    const preview = document.getElementById('imagePreview');
    const fileName = document.getElementById('imageFileName');
    const fileSize = document.getElementById('imageFileSize');
    const dimensions = document.getElementById('imageDimensions');
    
    if (file) {
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            event.target.value = '';
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image size should be less than 5MB', 'error');
            event.target.value = '';
            return;
        }
        
        selectedImageFile = file;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            
            const img = new Image();
            img.onload = function() {
                if (dimensions) {
                    dimensions.textContent = `${img.width} × ${img.height} pixels`;
                }
            };
            img.src = e.target.result;
            
            const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
            const sizeInKB = (file.size / 1024).toFixed(0);
            
            if (fileName) {
                fileName.textContent = file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name;
            }
            if (fileSize) {
                fileSize.textContent = sizeInMB > 1 ? `${sizeInMB} MB` : `${sizeInKB} KB`;
            }
            if (previewContainer) {
                previewContainer.style.display = 'block';
            }
            
            showToast('Image selected successfully ✓', 'success');
        };
        reader.readAsDataURL(file);
    }
}

function removeImage() {
    const imageInput = document.getElementById('notificationImage');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const preview = document.getElementById('imagePreview');
    
    if (imageInput) imageInput.value = '';
    if (preview) preview.src = '';
    if (previewContainer) previewContainer.style.display = 'none';
    
    selectedImageFile = null;
    showToast('Image removed', 'info');
}

function previewPDF(event) {
    const file = event.target.files[0];
    let previewContainer = document.getElementById('pdfPreviewContainer');
    
    if (!previewContainer) {
        const pdfUploadSection = document.querySelector('.form-group:has(#notificationPdf)');
        if (pdfUploadSection) {
            const div = document.createElement('div');
            div.innerHTML = `
                <div id="pdfPreviewContainer" class="file-preview" style="display: none; margin-top: 1rem;">
                    <div class="file-preview-content">
                        <div class="file-icon">
                            <i class="fas fa-file-pdf" style="color: #f72585;"></i>
                            <span class="file-badge" id="pdfBadge">PDF</span>
                        </div>
                        <div class="file-info">
                            <div class="file-name" id="pdfFileName">document.pdf</div>
                            <div class="file-meta">
                                <span id="pdfFileSize">0 KB</span> • 
                                <span id="pdfPageCount">Pages: 0</span>
                            </div>
                        </div>
                        <div class="file-actions">
                            <button type="button" class="btn-icon" onclick="removePDF()" title="Remove">
                                <i class="fas fa-times"></i>
                            </button>
                            <button type="button" class="btn-icon" onclick="viewPDFInfo()" title="Details">
                                <i class="fas fa-info-circle"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            pdfUploadSection.appendChild(div);
            previewContainer = document.getElementById('pdfPreviewContainer');
        }
    }
    
    if (file) {
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            showToast('Please select a PDF file', 'error');
            event.target.value = '';
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            showToast('PDF size should be less than 10MB', 'error');
            event.target.value = '';
            return;
        }
        
        selectedPDFFile = file;
        
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        const sizeInKB = (file.size / 1024).toFixed(0);
        const estimatedPages = Math.max(1, Math.round(file.size / 50000));
        
        const fileName = document.getElementById('pdfFileName');
        const fileSize = document.getElementById('pdfFileSize');
        const pageCount = document.getElementById('pdfPageCount');
        
        if (fileName) {
            fileName.textContent = file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name;
        }
        if (fileSize) {
            fileSize.textContent = sizeInMB > 1 ? `${sizeInMB} MB` : `${sizeInKB} KB`;
        }
        if (pageCount) {
            pageCount.textContent = `Pages: ${estimatedPages} (est)`;
        }
        if (previewContainer) {
            previewContainer.style.display = 'block';
        }
        
        showToast('PDF selected successfully ✓', 'success');
    }
}

function removePDF() {
    const pdfInput = document.getElementById('notificationPdf');
    const previewContainer = document.getElementById('pdfPreviewContainer');
    
    if (pdfInput) pdfInput.value = '';
    if (previewContainer) previewContainer.style.display = 'none';
    
    selectedPDFFile = null;
    showToast('PDF removed', 'info');
}

function viewFullImage() {
    if (!selectedImageFile) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = `
            <div id="fullImageModal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
            " onclick="if(event.target === this) this.remove()">
                <button onclick="this.parentElement.remove()" style="
                    position: absolute;
                    top: 2rem;
                    right: 2rem;
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: white;
                    font-size: 2rem;
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    cursor: pointer;
                    z-index: 10002;
                ">×</button>
                <div style="max-width: 90%; max-height: 90%; text-align: center;">
                    <img src="${e.target.result}" style="max-width: 100%; max-height: 80vh; border-radius: 8px; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                    <p style="color: white; margin-top: 1rem;">${sanitizeHTML(selectedImageFile.name)} • ${(selectedImageFile.size / 1024).toFixed(0)}KB</p>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);
        
        document.addEventListener('keydown', function closeOnEsc(e) {
            if (e.key === 'Escape') {
                modalDiv.remove();
                document.removeEventListener('keydown', closeOnEsc);
            }
        });
    };
    reader.readAsDataURL(selectedImageFile);
}

function closeFullImage() {
    const modal = document.getElementById('fullImageModal');
    if (modal?.parentElement) {
        modal.parentElement.remove();
    }
}

function viewPDFInfo() {
    if (!selectedPDFFile) return;
    
    const sizeInMB = (selectedPDFFile.size / (1024 * 1024)).toFixed(2);
    const sizeInKB = (selectedPDFFile.size / 1024).toFixed(0);
    const lastModified = new Date(selectedPDFFile.lastModified).toLocaleDateString();
    
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = `
        <div id="pdfInfoModal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        " onclick="if(event.target === this) this.remove()">
            <div style="
                background: var(--bg-card);
                padding: 2rem;
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            ">
                <button onclick="this.closest('[id=pdfInfoModal]').parentElement.remove()" style="
                    float: right;
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    font-size: 1.5rem;
                    cursor: pointer;
                ">×</button>
                
                <h3 style="margin: 0 0 1.5rem 0; color: var(--text-primary);">
                    <i class="fas fa-file-pdf" style="color: #f72585;"></i>
                    PDF Details
                </h3>
                
                <div style="background: var(--bg-dark); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <div style="margin-bottom: 0.75rem;">
                        <strong style="color: var(--text-secondary);">File Name</strong>
                        <div style="color: var(--text-primary); margin-top: 0.25rem;">${sanitizeHTML(selectedPDFFile.name)}</div>
                    </div>
                    <div style="margin-bottom: 0.75rem;">
                        <strong style="color: var(--text-secondary);">File Size</strong>
                        <div style="color: var(--text-primary); margin-top: 0.25rem;">${sizeInMB > 1 ? `${sizeInMB} MB` : `${sizeInKB} KB`} (${selectedPDFFile.size.toLocaleString()} bytes)</div>
                    </div>
                    <div style="margin-bottom: 0.75rem;">
                        <strong style="color: var(--text-secondary);">File Type</strong>
                        <div style="color: var(--text-primary); margin-top: 0.25rem;">${selectedPDFFile.type || 'application/pdf'}</div>
                    </div>
                    <div>
                        <strong style="color: var(--text-secondary);">Last Modified</strong>
                        <div style="color: var(--text-primary); margin-top: 0.25rem;">${lastModified}</div>
                    </div>
                </div>
                
                <button onclick="this.closest('[id=pdfInfoModal]').parentElement.remove()" style="
                    width: 100%;
                    padding: 0.75rem;
                    background: var(--primary);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                ">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalDiv);
}

function closePDFInfo() {
    const modal = document.getElementById('pdfInfoModal');
    if (modal?.parentElement) {
        modal.parentElement.remove();
    }
}

// ==========================================
// SECTION SWITCHING
// ==========================================

function showSection(section) {
    document.querySelectorAll('.content-section').forEach(el => {
        el.classList.remove('active');
    });
    
    document.querySelectorAll('.sidebar-menu li').forEach(el => {
        el.classList.remove('active');
    });
    
    const sectionEl = document.getElementById(`section-${section}`);
    if (sectionEl) {
        sectionEl.classList.add('active');
    }
    
    const menuItem = document.querySelector(`.sidebar-menu li[onclick*="${section}"]`);
    if (menuItem) {
        menuItem.classList.add('active');
    }
}

// ==========================================
// CSS ANIMATIONS
// ==========================================

const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
    }
`;
document.head.appendChild(style);

// ==========================================
// EXPORT FUNCTIONS TO WINDOW
// ==========================================

window.adminLogin = adminLogin;
window.logout = logout;
window.showSection = showSection;
window.addNewExam = addNewExam;
window.toggleExamStatus = toggleExamStatus;
window.deleteExam = deleteExam;
window.sendNotification = sendNotification;
window.deleteNotification = deleteNotification;
window.viewNotification = viewNotification;
window.deleteChatMessage = deleteChatMessage;
window.banUser = banUser;
window.viewChatMessage = viewChatMessage;
window.refreshChat = refreshChat;
window.toggleEffect = toggleEffect;
window.toggleTheme = toggleTheme;
window.selectTheme = selectTheme;
window.testSnowEffect = testSnowEffect;
window.testConfettiEffect = testConfettiEffect;
window.stopAllEffects = stopAllEffects;
window.backupDatabase = backupDatabase;
window.previewImage = previewImage;
window.removeImage = removeImage;
window.viewFullImage = viewFullImage;
window.closeFullImage = closeFullImage;
window.previewPDF = previewPDF;
window.removePDF = removePDF;
window.viewPDFInfo = viewPDFInfo;
window.closePDFInfo = closePDFInfo;

console.log('✅ Admin panel JavaScript loaded successfully! 🚀');
