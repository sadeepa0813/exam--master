// ==========================================
// EXAM MASTER SL - COMPLETE MAIN APPLICATION
// ==========================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase Configuration
const SUPABASE_CONFIG = {
    url: 'https://nstnkxtxlqelwnefkmaj.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdG5reHR4bHFlbHduZWZrbWFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg0NTc0OCwiZXhwIjoyMDgyNDIxNzQ4fQ.7nxY8FIR05sbZ33e4-hpZx6n8l-WA-gnlk2pOwxo2z4'
};

// Initialize Supabase Client
const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Global Variables
let activeNotifications = [];
let effectCanvas = null;
let effectCtx = null;
let effectAnimationId = null;
let currentEffects = {
    snow: false,
    confetti: false
};

// Daily Sinhala Motivational Messages
const sinhalaMessages = {
    0: "සුභ ඉරිදා! හෙට ආරම්භ වන සතිය සඳහා සූදානම් වන්න.",
    1: "සුභ සදුදා! අද ඔබේ ඉලක්ක සාක්ෂාත් කර ගැනීමට පළමු පියවර ගන්න.",
    2: "සුභ අඟහරුවාදා! දැන් ඔබ කරන සෑම වැඩක්ම අනාගතය සාදයි.",
    3: "සුභ බදාදා! දැඩි වෙනවා, ඔබට හැකියාව තියෙනවා.",
    4: "සුභ බ්‍රහස්පතින්දා! අද ඔබේ දැනුම වැඩි කර ගන්න.",
    5: "සුභ සිකුරාදා! සතිය අවසානයේදී ඔබේ ප්‍රගතිය සමාලෝචනය කරන්න.",
    6: "සුභ සෙනසුරාදා! විවේක ගත කරන අතරම අල්ප වේලාවක් ඉගෙන ගන්න."
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Exam Master SL - Initializing...');
    
    // Hide loading overlay after 1.5 seconds
    setTimeout(() => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }, 1500);
    
    // Initialize all systems
    try {
        await initializeAllSystems();
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('System initialization failed. Please refresh the page.', 'error');
    }
});

async function initializeAllSystems() {
    // 1. Initialize effects canvas first
    await initializeEffects();
    
    // 2. Load exams data
    await loadExams();
    
    // 3. Check for notifications
    await checkNotifications();
    
    // 4. Load chat system
    await loadChat();
    
    // 5. Check for daily motivational message
    checkDailyMotivation();
    
    // 6. Start effects based on settings
    await startEffectsFromSettings();
    
    console.log('All systems initialized successfully!');
}

// ==========================================
// 1. EXAM COUNTDOWN SYSTEM
// ==========================================
async function loadExams() {
    console.log('Loading exams...');
    
    try {
        const { data, error } = await supabase
            .from('exams')
            .select('*')
            .eq('status', 'enabled')
            .order('exam_date', { ascending: true });

        if (error) {
            console.error('Error loading exams:', error);
            throw error;
        }

        const grid = document.getElementById('examGrid');
        if (!grid) {
            console.error('Exam grid element not found!');
            return;
        }
        
        grid.innerHTML = '';
        
        if (data && data.length > 0) {
            console.log(`Found ${data.length} exams`);
            data.forEach(exam => {
                const card = createExamCard(exam);
                grid.appendChild(card);
                startTimerForExam(exam);
            });
        } else {
            grid.innerHTML = `
                <div class="exam-card" style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <i class="fas fa-calendar-times" style="font-size: 3rem; color: #94a3b8; margin-bottom: 20px;"></i>
                    <h3 style="color: #f8fafc; margin-bottom: 10px;">දැනට සක්‍රිය විභාග නොමැත</h3>
                    <p style="color: #94a3b8;">නව විභාග එකතු කිරීමට පරිපාලක අඩවියට පිවිසෙන්න</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Exams Error:', error);
        showToast('විභාග පූරණය කිරීමේ දෝෂයක්', 'error');
    }
}

function createExamCard(exam) {
    const card = document.createElement('div');
    card.className = 'exam-card';
    card.id = `exam-${exam.id}`;
    
    const examDate = new Date(exam.exam_date);
    const formattedDate = examDate.toLocaleDateString('si-LK', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    card.innerHTML = `
        <div class="exam-card-content">
            <h3>${exam.batch_name}</h3>
            <div class="exam-date">
                <i class="far fa-calendar-alt"></i>
                ${formattedDate}
            </div>
            
            <div class="timer-display">
                <div class="time-unit">
                    <span class="time-value" id="days-${exam.id}">00</span>
                    <span class="time-label">දින</span>
                </div>
                <div class="time-unit">
                    <span class="time-value" id="hours-${exam.id}">00</span>
                    <span class="time-label">පැය</span>
                </div>
                <div class="time-unit">
                    <span class="time-value" id="minutes-${exam.id}">00</span>
                    <span class="time-label">මිනි</span>
                </div>
                <div class="time-unit">
                    <span class="time-value" id="seconds-${exam.id}">00</span>
                    <span class="time-label">තත්</span>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

function startTimerForExam(exam) {
    const targetDate = new Date(exam.exam_date).getTime();
    const examId = exam.id;
    
    function updateTimer() {
        const now = new Date().getTime();
        const timeLeft = targetDate - now;
        
        if (timeLeft < 0) {
            const card = document.getElementById(`exam-${examId}`);
            if (card) {
                card.querySelector('.timer-display').innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <span style="color: #4cc9f0; font-weight: bold; font-size: 1.2rem;">
                            <i class="fas fa-check-circle"></i> විභාගය අවසන්
                        </span>
                    </div>
                `;
                card.style.opacity = '0.7';
            }
            return;
        }
        
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        // Update display elements
        const daysEl = document.getElementById(`days-${examId}`);
        const hoursEl = document.getElementById(`hours-${examId}`);
        const minutesEl = document.getElementById(`minutes-${examId}`);
        const secondsEl = document.getElementById(`seconds-${examId}`);
        
        if (daysEl) daysEl.textContent = days.toString().padStart(2, '0');
        if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
        if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
        if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
    }
    
    // Initial update
    updateTimer();
    
    // Update every second
    setInterval(updateTimer, 1000);
}

// ==========================================
// 2. NOTIFICATION SYSTEM
// ==========================================
async function checkNotifications() {
    console.log('Checking notifications...');
    
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Error loading notifications:', error);
            return;
        }

        activeNotifications = data || [];
        console.log(`Found ${activeNotifications.length} active notifications`);
        
        updateNotificationBadge();
        
        // Store last seen notification ID
        if (activeNotifications.length > 0) {
            const latestId = activeNotifications[0].id;
            localStorage.setItem('last_seen_notif', latestId);
        }
        
    } catch (error) {
        console.error('Notification Error:', error);
    }
}

function updateNotificationBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    
    if (activeNotifications.length > 0) {
        badge.textContent = activeNotifications.length > 9 ? '9+' : activeNotifications.length;
        badge.style.display = 'flex';
        
        // Pulse animation for new notifications
        if (shouldShowNotificationPulse()) {
            badge.style.animation = 'pulse 2s infinite';
        }
    } else {
        badge.style.display = 'none';
    }
}

function shouldShowNotificationPulse() {
    const lastSeen = localStorage.getItem('last_seen_notif');
    if (!lastSeen && activeNotifications.length > 0) return true;
    
    if (activeNotifications.length > 0) {
        const latestNotificationId = activeNotifications[0].id;
        return lastSeen !== latestNotificationId;
    }
    
    return false;
}

// Check and show daily motivation
function checkDailyMotivation() {
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const message = sinhalaMessages[today];
    
    if (!message) return;
    
    const lastShownDate = localStorage.getItem('last_motivation_date');
    const todayDate = new Date().toDateString();
    
    if (lastShownDate !== todayDate) {
        // Wait 3 seconds before showing
        setTimeout(() => {
            showDailyMotivation(message, today);
            localStorage.setItem('last_motivation_date', todayDate);
        }, 3000);
    }
}

function showDailyMotivation(message, dayIndex) {
    const days = ['ඉරිදා', 'සදුදා', 'අඟහරුවාදා', 'බදාදා', 'බ්‍රහස්පතින්දා', 'සිකුරාදා', 'සෙනසුරාදා'];
    const dayName = days[dayIndex];
    
    const motivationDiv = document.createElement('div');
    motivationDiv.className = 'daily-motivation';
    motivationDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #4361ee, #7209b7);
        color: white;
        padding: 20px;
        border-radius: 15px;
        box-shadow: 0 10px 25px rgba(67, 97, 238, 0.5);
        z-index: 1002;
        max-width: 350px;
        animation: slideInRight 0.5s ease;
        border-left: 5px solid #4cc9f0;
        font-family: 'Inter', sans-serif;
        cursor: pointer;
    `;
    
    motivationDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
            <div style="font-size: 2rem;">💪</div>
            <div>
                <h4 style="margin: 0; font-size: 1.1rem; color: white;">${dayName}ගේ උපදෙස</h4>
                <small style="opacity: 0.8; font-size: 0.8rem;">දිනෙක උපදෙසක්</small>
            </div>
        </div>
        <p style="margin: 0; line-height: 1.5; font-size: 1rem;">${message}</p>
        <div style="margin-top: 15px; text-align: right;">
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                padding: 5px 15px;
                border-radius: 20px;
                cursor: pointer;
                font-size: 0.9rem;
            ">
                හරි
            </button>
        </div>
    `;
    
    document.body.appendChild(motivationDiv);
    
    // Auto remove after 10 seconds
    setTimeout(() => {
        if (motivationDiv.parentElement) {
            motivationDiv.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(() => {
                if (motivationDiv.parentElement) {
                    motivationDiv.parentElement.removeChild(motivationDiv);
                }
            }, 500);
        }
    }, 10000);
}

// Open notifications modal
async function openNotifModal() {
    console.log('Opening notifications modal...');
    
    const modal = document.getElementById('notifModal');
    const contentDiv = document.getElementById('modalNotifContent');
    
    if (!modal || !contentDiv) {
        console.error('Notification modal elements not found!');
        return;
    }
    
    // Mark as seen
    if (activeNotifications.length > 0) {
        localStorage.setItem('last_seen_notif', activeNotifications[0].id);
        updateNotificationBadge();
    }
    
    if (activeNotifications.length === 0) {
        contentDiv.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <i class="far fa-bell" style="font-size: 3rem; color: #94a3b8; margin-bottom: 20px;"></i>
                <h4 style="color: #f8fafc; margin-bottom: 10px;">දැනට විශේෂ නිවේදන නොමැත</h4>
                <p style="color: #94a3b8;">නව නිවේදන සඳහා නිතර පරීක්ෂා කරන්න</p>
            </div>
        `;
    } else {
        contentDiv.innerHTML = activeNotifications.map(notif => {
            const notificationDate = new Date(notif.created_at);
            const formattedDate = notificationDate.toLocaleDateString('si-LK', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            let mediaContent = '';
            
            if (notif.image_url) {
                mediaContent += `
                    <div class="notification-media" style="margin: 15px 0;">
                        <img src="${notif.image_url}" alt="Notification Image" 
                             style="max-width: 100%; border-radius: 8px; border: 1px solid #334155;">
                    </div>
                `;
            }
            
            if (notif.pdf_url) {
                mediaContent += `
                    <div class="notification-actions" style="margin-top: 15px;">
                        <a href="${notif.pdf_url}" target="_blank" 
                           style="display: inline-flex; align-items: center; gap: 8px; 
                                  background: #f72585; color: white; padding: 8px 16px; 
                                  border-radius: 8px; text-decoration: none; font-weight: 500;">
                            <i class="fas fa-file-pdf"></i> PDF බාගත කරන්න
                        </a>
                    </div>
                `;
            }

            return `
                <div class="notification-item" style="
                    background: #1e293b;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                    border: 1px solid #334155;
                ">
                    <div class="notification-header" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 15px;
                    ">
                        <div class="notification-title" style="
                            font-size: 1.2rem;
                            font-weight: 600;
                            color: #f8fafc;
                            flex: 1;
                        ">
                            ${notif.title}
                        </div>
                        <div class="notification-date" style="
                            font-size: 0.85rem;
                            color: #94a3b8;
                            white-space: nowrap;
                            margin-left: 15px;
                        ">
                            ${formattedDate}
                        </div>
                    </div>
                    
                    <div class="notification-message" style="
                        color: #cbd5e1;
                        line-height: 1.6;
                        margin-bottom: 15px;
                        white-space: pre-wrap;
                    ">
                        ${notif.message || ''}
                    </div>
                    
                    ${mediaContent}
                </div>
            `;
        }).join('');
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Close notifications modal
function closeNotifModal() {
    const modal = document.getElementById('notifModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// ==========================================
// 3. CHAT SYSTEM
// ==========================================
async function loadChat() {
    console.log('Loading chat system...');
    
    // Load saved username
    const savedName = localStorage.getItem('chat_user_name');
    if (savedName) {
        const nameInput = document.getElementById('chatName');
        if (nameInput) {
            nameInput.value = savedName;
        }
    }

    // Fetch existing comments
    await fetchComments();

    // Subscribe to real-time updates
    supabase
        .channel('public:comments')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'comments' 
        }, payload => {
            console.log('New chat message:', payload.new);
            appendComment(payload.new);
        })
        .subscribe();
}

async function fetchComments() {
    const chatBox = document.getElementById('chatBox');
    if (!chatBox) {
        console.error('Chat box element not found!');
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(50);

        if (error) {
            console.error('Error fetching comments:', error);
            throw error;
        }

        // Remove welcome message if exists
        const welcomeMsg = chatBox.querySelector('.chat-welcome');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }

        chatBox.innerHTML = '';
        
        if (data && data.length > 0) {
            data.forEach(comment => appendComment(comment));
        } else {
            // Show welcome message if no comments
            chatBox.innerHTML = `
                <div class="chat-welcome" style="text-align: center; padding: 40px 20px; color: #94a3b8;">
                    <div class="welcome-icon" style="font-size: 3rem; color: #4361ee; opacity: 0.5; margin-bottom: 15px;">
                        <i class="fas fa-comment-alt"></i>
                    </div>
                    <h3 style="font-size: 1.5rem; margin-bottom: 10px; color: #f8fafc;">Welcome to Study Community!</h3>
                    <p style="font-size: 1rem; max-width: 400px; margin: 0 auto;">
                        Start chatting with fellow students. Share notes, ask questions, and study together.
                    </p>
                </div>
            `;
        }
        
        scrollToBottom();
    } catch (error) {
        console.error('Chat Error:', error);
    }
}

function appendComment(comment) {
    const chatBox = document.getElementById('chatBox');
    if (!chatBox) return;
    
    const myName = localStorage.getItem('chat_user_name');
    const isMe = comment.user_name === myName;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isMe ? 'user' : 'other'}`;
    messageDiv.style.cssText = `
        max-width: 80%;
        padding: 15px 20px;
        border-radius: 18px;
        position: relative;
        animation: slideIn 0.3s ease;
        margin-bottom: 10px;
        ${isMe ? 
            'align-self: flex-end; background: linear-gradient(135deg, #4361ee, #7209b7); color: white; border-bottom-right-radius: 5px;' : 
            'align-self: flex-start; background: #2d3748; border: 1px solid #334155; color: #f8fafc; border-bottom-left-radius: 5px;'
        }
    `;
    
    const messageTime = new Date(comment.created_at).toLocaleTimeString('si-LK', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.innerHTML = `
        <div class="message-header" style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        ">
            <span class="message-sender" style="
                font-weight: 600;
                font-size: 0.95rem;
            ">
                ${comment.user_name}
            </span>
            <span class="message-time" style="
                font-size: 0.8rem;
                opacity: 0.8;
            ">
                ${messageTime}
            </span>
        </div>
        <div class="message-content" style="
            line-height: 1.5;
            word-wrap: break-word;
        ">
            ${comment.message}
        </div>
    `;
    
    chatBox.appendChild(messageDiv);
    scrollToBottom();
}

function scrollToBottom() {
    const chatBox = document.getElementById('chatBox');
    if (chatBox) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

// Get user IP address
async function getIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Failed to get IP:', error);
        return 'unknown';
    }
}

// Send chat message
async function sendComment() {
    console.log('Sending chat message...');
    
    const nameInput = document.getElementById('chatName');
    const msgInput = document.getElementById('chatMessage');
    
    if (!nameInput || !msgInput) {
        console.error('Chat input elements not found!');
        return;
    }
    
    const name = nameInput.value.trim();
    const message = msgInput.value.trim();
    
    if (!name) {
        showToast('කරුණාකර ඔබේ නම ඇතුළත් කරන්න', 'warning');
        nameInput.focus();
        return;
    }
    
    if (!message) {
        showToast('කරුණාකර පණිවිඩය ඇතුළත් කරන්න', 'warning');
        msgInput.focus();
        return;
    }
    
    // Check if user is banned
    try {
        const ipAddress = await getIP();
        
        const { data: bannedUser } = await supabase
            .from('banned_users')
            .select('*')
            .or(`user_name.eq.${name},ip_address.eq.${ipAddress}`)
            .single();
        
        if (bannedUser) {
            showToast('මෙම පරිශීලකයා තහනම් කර ඇත', 'error');
            return;
        }
    } catch (error) {
        // User not banned, continue
    }
    
    // Save name to localStorage
    localStorage.setItem('chat_user_name', name);
    
    try {
        const ipAddress = await getIP();
        
        const { error } = await supabase
            .from('comments')
            .insert([{ 
                user_name: name, 
                message: message,
                ip_address: ipAddress
            }]);
        
        if (error) {
            console.error('Error sending comment:', error);
            if (error.message.includes('banned')) {
                showToast('මෙම පරිශීලකයා තහනම් කර ඇත', 'error');
            } else {
                throw error;
            }
            return;
        }
        
        // Clear message input
        msgInput.value = '';
        msgInput.focus();
        
        console.log('Chat message sent successfully');
        
    } catch (error) {
        console.error('Send Comment Error:', error);
        showToast('පණිවිඩය යැවීමේ දෝෂයක්', 'error');
    }
}

// ==========================================
// 4. EFFECTS SYSTEM
// ==========================================
async function initializeEffects() {
    console.log('Initializing effects system...');
    
    // Create canvas if it doesn't exist
    if (!document.getElementById('effectCanvas')) {
        const canvas = document.createElement('canvas');
        canvas.id = 'effectCanvas';
        canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
        `;
        document.body.appendChild(canvas);
    }
    
    effectCanvas = document.getElementById('effectCanvas');
    effectCtx = effectCanvas.getContext('2d');
    
    // Set initial canvas size
    resizeCanvas();
    
    // Listen for window resize
    window.addEventListener('resize', resizeCanvas);
    
    console.log('Effects canvas initialized');
}

function resizeCanvas() {
    if (effectCanvas) {
        effectCanvas.width = window.innerWidth;
        effectCanvas.height = window.innerHeight;
    }
}

async function startEffectsFromSettings() {
    console.log('Loading effects settings...');
    
    try {
        const { data, error } = await supabase
            .from('site_settings')
            .select('*')
            .in('setting_key', ['snow_effect', 'confetti_effect']);
        
        if (error) {
            console.error('Error loading effects settings:', error);
            return;
        }
        
        console.log('Effects settings loaded:', data);
        
        // Stop any existing effects
        stopAllEffects();
        
        if (data && data.length > 0) {
            const snowSetting = data.find(s => s.setting_key === 'snow_effect');
            const confettiSetting = data.find(s => s.setting_key === 'confetti_effect');
            
            // Check seasonal dates
            const now = new Date();
            const isDecember = now.getMonth() === 11; // December
            const isNewYear = now.getMonth() === 0 && now.getDate() <= 7; // Early January
            
            // Start snow effect if enabled and in December
            if (snowSetting && snowSetting.is_enabled) {
                if (isDecember) {
                    console.log('Starting seasonal snow effect');
                    startSnowEffect();
                } else {
                    console.log('Snow effect enabled but only shows in December');
                }
            }
            
            // Start confetti effect if enabled and around New Year
            if (confettiSetting && confettiSetting.is_enabled) {
                if (isNewYear) {
                    console.log('Starting seasonal confetti effect');
                    startConfettiEffect();
                } else {
                    console.log('Confetti effect enabled but only shows during New Year');
                }
            }
            
            // If no seasonal effects active, check for manual activation
            if (!currentEffects.snow && !currentEffects.confetti) {
                if (snowSetting && snowSetting.is_enabled) {
                    console.log('Starting snow effect (manual)');
                    startSnowEffect();
                } else if (confettiSetting && confettiSetting.is_enabled) {
                    console.log('Starting confetti effect (manual)');
                    startConfettiEffect();
                }
            }
        }
        
    } catch (error) {
        console.error('Error starting effects:', error);
    }
}

function startSnowEffect() {
    console.log('Starting snow effect...');
    
    // Clear any existing animation
    if (effectAnimationId) {
        cancelAnimationFrame(effectAnimationId);
        effectAnimationId = null;
    }
    
    // Clear canvas
    if (effectCtx) {
        effectCtx.clearRect(0, 0, effectCanvas.width, effectCanvas.height);
    }
    
    // Initialize snow particles
    const particles = [];
    const particleCount = 120;
    
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * effectCanvas.width,
            y: Math.random() * effectCanvas.height,
            radius: Math.random() * 4 + 1,
            speed: Math.random() * 2 + 0.5,
            opacity: Math.random() * 0.6 + 0.3,
            sway: Math.random() * 1 - 0.5,
            wind: Math.random() * 0.3 - 0.15,
            color: `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.3})`
        });
    }
    
    currentEffects.snow = true;
    
    function animateSnow() {
        if (!effectCtx || !effectCanvas) return;
        
        // Clear with slight transparency for trail effect
        effectCtx.fillStyle = 'rgba(15, 23, 42, 0.05)';
        effectCtx.fillRect(0, 0, effectCanvas.width, effectCanvas.height);
        
        // Draw snow particles
        particles.forEach(particle => {
            effectCtx.beginPath();
            effectCtx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            effectCtx.fillStyle = particle.color;
            effectCtx.fill();
            
            // Add sparkle effect
            effectCtx.beginPath();
            effectCtx.arc(particle.x, particle.y, particle.radius/2, 0, Math.PI * 2);
            effectCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            effectCtx.fill();
            
            effectCtx.closePath();
        });
        
        // Update particle positions
        particles.forEach(particle => {
            particle.y += particle.speed;
            particle.x += particle.sway + particle.wind;
            
            // Add gentle swaying
            particle.sway += Math.sin(Date.now() / 2000 + particle.x) * 0.05;
            
            // Reset if out of bounds
            if (particle.y > effectCanvas.height + 10) {
                particle.y = -10;
                particle.x = Math.random() * effectCanvas.width;
                particle.speed = Math.random() * 2 + 0.5;
            }
            
            // Wrap around horizontally
            if (particle.x > effectCanvas.width + 10) {
                particle.x = -10;
            } else if (particle.x < -10) {
                particle.x = effectCanvas.width + 10;
            }
        });
        
        // Continue animation
        effectAnimationId = requestAnimationFrame(animateSnow);
    }
    
    animateSnow();
    console.log('Snow effect started successfully');
}

function startConfettiEffect() {
    console.log('Starting confetti effect...');
    
    // Clear any existing animation
    if (effectAnimationId) {
        cancelAnimationFrame(effectAnimationId);
        effectAnimationId = null;
    }
    
    // Clear canvas
    if (effectCtx) {
        effectCtx.clearRect(0, 0, effectCanvas.width, effectCanvas.height);
    }
    
    // Initialize confetti particles
    const particles = [];
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#FF9FF3', '#54A0FF', '#00D2D3'];
    const particleCount = 180;
    
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * effectCanvas.width,
            y: Math.random() * effectCanvas.height - effectCanvas.height,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 10 + 5,
            speed: Math.random() * 4 + 1,
            angle: Math.random() * 360,
            rotationSpeed: Math.random() * 6 - 3,
            sway: Math.random() * 2 - 1,
            gravity: 0.05,
            opacity: Math.random() * 0.8 + 0.2,
            shape: Math.random() > 0.5 ? 'circle' : 'rect',
            delay: Math.random() * 100
        });
    }
    
    currentEffects.confetti = true;
    let startTime = Date.now();
    
    function animateConfetti() {
        if (!effectCtx || !effectCanvas) return;
        
        const currentTime = Date.now() - startTime;
        
        // Clear with slight transparency
        effectCtx.fillStyle = 'rgba(15, 23, 42, 0.03)';
        effectCtx.fillRect(0, 0, effectCanvas.width, effectCanvas.height);
        
        // Draw confetti particles
        particles.forEach(particle => {
            // Skip delayed particles
            if (currentTime < particle.delay) return;
            
            effectCtx.save();
            effectCtx.translate(particle.x, particle.y);
            effectCtx.rotate(particle.angle * Math.PI / 180);
            effectCtx.globalAlpha = particle.opacity;
            
            if (particle.shape === 'circle') {
                // Draw circle confetti
                effectCtx.beginPath();
                effectCtx.arc(0, 0, particle.size/2, 0, Math.PI * 2);
                effectCtx.fillStyle = particle.color;
                effectCtx.fill();
                
                // Add highlight
                effectCtx.beginPath();
                effectCtx.arc(-particle.size/4, -particle.size/4, particle.size/4, 0, Math.PI * 2);
                effectCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                effectCtx.fill();
            } else {
                // Draw rectangle confetti
                effectCtx.fillStyle = particle.color;
                effectCtx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
                
                // Add pattern
                effectCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                effectCtx.lineWidth = 1;
                effectCtx.strokeRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
            }
            
            effectCtx.restore();
        });
        
        // Update particle positions
        particles.forEach(particle => {
            particle.y += particle.speed;
            particle.x += particle.sway;
            particle.angle += particle.rotationSpeed;
            particle.speed += particle.gravity;
            
            // Add wind effect
            particle.sway += Math.sin(Date.now() / 1000) * 0.1;
            
            // Fade out at bottom
            if (particle.y > effectCanvas.height * 0.8) {
                particle.opacity *= 0.97;
            }
            
            // Reset if out of bounds or faded out
            if (particle.y > effectCanvas.height || particle.opacity < 0.05) {
                particle.y = -20;
                particle.x = Math.random() * effectCanvas.width;
                particle.speed = Math.random() * 4 + 1;
                particle.opacity = Math.random() * 0.8 + 0.2;
                particle.color = colors[Math.floor(Math.random() * colors.length)];
            }
            
            // Wrap horizontally
            if (particle.x > effectCanvas.width + 20) {
                particle.x = -20;
            } else if (particle.x < -20) {
                particle.x = effectCanvas.width + 20;
            }
        });
        
        // Continue animation
        effectAnimationId = requestAnimationFrame(animateConfetti);
    }
    
    animateConfetti();
    console.log('Confetti effect started successfully');
}

function stopAllEffects() {
    if (effectAnimationId) {
        cancelAnimationFrame(effectAnimationId);
        effectAnimationId = null;
    }
    
    if (effectCtx && effectCanvas) {
        effectCtx.clearRect(0, 0, effectCanvas.width, effectCanvas.height);
    }
    
    currentEffects.snow = false;
    currentEffects.confetti = false;
    
    console.log('All effects stopped');
}

// Test effects
function testSnowEffect() {
    stopAllEffects();
    startSnowEffect();
    showToast('Snow effect test started! ❄️', 'success');
}

function testConfettiEffect() {
    stopAllEffects();
    startConfettiEffect();
    showToast('Confetti effect test started! 🎉', 'success');
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function showToast(message, type = 'success') {
    console.log(`Toast: ${message} (${type})`);
    
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.custom-toast');
    existingToasts.forEach(toast => {
        if (toast.parentElement) {
            toast.parentElement.removeChild(toast);
        }
    });
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    
    // Set icon based on type
    let icon = 'info-circle';
    let borderColor = '#4361ee';
    
    switch(type) {
        case 'success':
            icon = 'check-circle';
            borderColor = '#4cc9f0';
            break;
        case 'error':
            icon = 'exclamation-circle';
            borderColor = '#f72585';
            break;
        case 'warning':
            icon = 'exclamation-triangle';
            borderColor = '#f8961e';
            break;
    }
    
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add styles
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #1e293b;
        color: #f8fafc;
        padding: 15px 20px;
        border-radius: 12px;
        border-left: 4px solid ${borderColor};
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 1001;
        transform: translateX(150%);
        transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        max-width: 350px;
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(150%)';
        setTimeout(() => {
            if (toast.parentElement) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// ==========================================
// EVENT LISTENERS & GLOBAL FUNCTIONS
// ==========================================

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }
`;
document.head.appendChild(style);

// Modal close on outside click
document.addEventListener('DOMContentLoaded', function() {
    const notifModal = document.getElementById('notifModal');
    if (notifModal) {
        notifModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeNotifModal();
            }
        });
    }
    
    // Enter key for chat
    const chatMessageInput = document.getElementById('chatMessage');
    if (chatMessageInput) {
        chatMessageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendComment();
            }
        });
    }
    
    // Enter key for chat name
    const chatNameInput = document.getElementById('chatName');
    if (chatNameInput) {
        chatNameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const msgInput = document.getElementById('chatMessage');
                if (msgInput) {
                    msgInput.focus();
                }
            }
        });
    }
});

// ==========================================
// EXPORT FUNCTIONS TO WINDOW OBJECT
// ==========================================
window.openNotifModal = openNotifModal;
window.closeNotifModal = closeNotifModal;
window.sendComment = sendComment;
window.testSnowEffect = testSnowEffect;
window.testConfettiEffect = testConfettiEffect;
window.stopAllEffects = stopAllEffects;

// For notification icon click
if (document.getElementById('notificationIcon')) {
    document.getElementById('notificationIcon').addEventListener('click', openNotifModal);
}

console.log('Exam Master SL - App.js loaded successfully! 🚀');
