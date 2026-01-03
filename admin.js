/* ===================================================
   ADMIN PANEL SCRIPT – FIXED & STABLE
   Author: Sadeepa
=================================================== */

// -------------------- SUPABASE CONFIG --------------------
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_PUBLIC_ANON_KEY'; // ❗ NOT service_role

const supabase = supabaseJs.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

// -------------------- TOAST --------------------
function showToast(message, type = 'success') {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: type === 'error' ? "#ff4d4d" : "#4CAF50",
    }).showToast();
}

// -------------------- CONFIRMATION --------------------
async function showConfirmation(title, message) {
    return new Promise((resolve) => {
        const result = window.confirm(`${title}\n\n${message}`);
        resolve(result);
    });
}

// -------------------- LOAD EFFECTS STATUS --------------------
async function loadEffectsStatus() {
    const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
            'snow_effect',
            'confetti_effect',
            'dark_theme'
        ]);

    if (error) {
        console.error(error);
        return;
    }

    data.forEach(setting => {
        const checkbox = document.getElementById(setting.setting_key);
        if (checkbox) {
            checkbox.checked = setting.setting_value === 'true';
        }
    });
}

// -------------------- TOGGLE EFFECT --------------------
async function toggleEffect(effect, enabled) {
    const key = `${effect}_effect`;

    const { error } = await supabase
        .from('site_settings')
        .upsert({
            setting_key: key,
            setting_value: enabled.toString()
        });

    if (error) {
        showToast('Failed to update effect', 'error');
        return;
    }

    showToast(`${effect} effect ${enabled ? 'enabled' : 'disabled'}`);
}

// -------------------- THEME (SINGLE SOURCE OF TRUTH) --------------------
async function toggleTheme(isDark) {
    const { error } = await supabase
        .from('site_settings')
        .upsert({
            setting_key: 'dark_theme',
            setting_value: isDark.toString()
        });

    if (error) {
        showToast('Theme update failed', 'error');
        return;
    }

    showToast(`Theme set to ${isDark ? 'Dark' : 'Light'}`);
}

// -------------------- BAN USER --------------------
async function banUser(userName) {
    if (!userName) return;

    const confirmed = await showConfirmation(
        'Ban User',
        `Are you sure you want to ban "${userName}"?`
    );

    if (!confirmed) return;

    // Check existing ban
    const { data: existing } = await supabase
        .from('banned_users')
        .select('id')
        .eq('user_name', userName)
        .single();

    if (existing) {
        showToast('User already banned', 'error');
        return;
    }

    const { error } = await supabase
        .from('banned_users')
        .insert({ user_name: userName });

    if (error) {
        showToast('Ban failed', 'error');
        return;
    }

    showToast('User banned successfully');
}

// -------------------- DELETE EXAM --------------------
async function deleteExam(examId) {
    const confirmed = await showConfirmation(
        'Delete Exam',
        'This action cannot be undone'
    );

    if (!confirmed) return;

    const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId);

    if (error) {
        showToast('Delete failed', 'error');
        return;
    }

    showToast('Exam deleted');
}

// -------------------- INIT --------------------
document.addEventListener('DOMContentLoaded', () => {
    loadEffectsStatus();
});
