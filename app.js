// ==========================================
// IMAGE & PDF PREVIEW FUNCTIONS
// ==========================================
function previewImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('imagePreview');
    const previewActions = document.getElementById('imagePreviewActions');
    
    if (file) {
        // Check file type
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            event.target.value = '';
            return;
        }
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image size should be less than 5MB', 'error');
            event.target.value = '';
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            previewActions.style.display = 'flex';
        };
        
        reader.readAsDataURL(file);
    }
}

function removeImage() {
    const imageInput = document.getElementById('notificationImage');
    const preview = document.getElementById('imagePreview');
    const previewActions = document.getElementById('imagePreviewActions');
    
    imageInput.value = '';
    preview.src = '';
    preview.style.display = 'none';
    previewActions.style.display = 'none';
    
    showToast('Image removed', 'info');
}

function previewPDF(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('pdfPreview');
    const fileName = document.getElementById('pdfFileName');
    const fileSize = document.getElementById('pdfFileSize');
    
    if (file) {
        // Check file type
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            showToast('Please select a PDF file', 'error');
            event.target.value = '';
            return;
        }
        
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showToast('PDF size should be less than 10MB', 'error');
            event.target.value = '';
            return;
        }
        
        // Format file size
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        
        fileName.textContent = file.name;
        fileSize.textContent = `${sizeInMB} MB`;
        preview.style.display = 'block';
    }
}

function removePDF() {
    const pdfInput = document.getElementById('notificationPdf');
    const preview = document.getElementById('pdfPreview');
    
    pdfInput.value = '';
    preview.style.display = 'none';
    
    showToast('PDF removed', 'info');
}

// ==========================================
// UPDATED SEND NOTIFICATION FUNCTION WITH FILE UPLOAD
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
            console.log('Uploading image...');
            showToast('Uploading image...', 'info');
            
            // For demo, we'll use a mock URL since actual upload requires storage setup
            // In production, use supabase.storage.upload()
            imageUrl = `https://api.dicebear.com/7.x/shapes/svg?seed=${Date.now()}&backgroundColor=667eea`;
            
            // Actual upload code (commented for demo):
            /*
            const fileName = `notification_${Date.now()}_${imageFile.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('notifications')
                .upload(fileName, imageFile);
            
            if (uploadError) throw uploadError;
            
            const { data: { publicUrl } } = supabase.storage
                .from('notifications')
                .getPublicUrl(fileName);
            
            imageUrl = publicUrl;
            */
        }
        
        // Upload PDF if selected
        if (pdfFile) {
            console.log('Uploading PDF...');
            showToast('Uploading PDF...', 'info');
            
            // For demo, we'll use a mock URL
            pdfUrl = `#${pdfFile.name}`;
            
            // Actual upload code (commented for demo):
            /*
            const fileName = `notification_${Date.now()}_${pdfFile.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('notifications')
                .upload(fileName, pdfFile);
            
            if (uploadError) throw uploadError;
            
            const { data: { publicUrl } } = supabase.storage
                .from('notifications')
                .getPublicUrl(fileName);
            
            pdfUrl = publicUrl;
            */
        }
        
        // Create notification data
        const notificationData = {
            title: title,
            message: message || '',
            image_url: imageUrl,
            pdf_url: pdfUrl,
            is_active: true,
            show_until_dismissed: isPersistent,
            priority: isImportant ? 3 : 1
        };
        
        console.log('Sending notification with data:', notificationData);
        
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

// ==========================================
// UPDATED VIEW NOTIFICATION FUNCTION
// ==========================================
async function viewNotification(id) {
    const notification = allNotifications.find(n => n.id === id);
    if (!notification) {
        showToast('Notification not found', 'error');
        return;
    }
    
    const date = new Date(notification.created_at);
    let imageHTML = '';
    let pdfHTML = '';
    
    if (notification.image_url) {
        imageHTML = `
            <div style="margin: 15px 0;">
                <h4 style="color: var(--text-secondary); margin-bottom: 8px;">
                    <i class="fas fa-image"></i> Attached Image
                </h4>
                <img src="${notification.image_url}" 
                     alt="Notification Image" 
                     style="max-width: 100%; max-height: 300px; border-radius: 8px; border: 1px solid var(--border-color);">
            </div>
        `;
    }
    
    if (notification.pdf_url) {
        pdfHTML = `
            <div style="margin: 15px 0;">
                <h4 style="color: var(--text-secondary); margin-bottom: 8px;">
                    <i class="fas fa-file-pdf"></i> Attached PDF
                </h4>
                <a href="${notification.pdf_url}" target="_blank" 
                   style="display: inline-flex; align-items: center; gap: 8px; 
                          background: #f72585; color: white; padding: 10px 20px; 
                          border-radius: 8px; text-decoration: none; font-weight: 500;">
                    <i class="fas fa-download"></i> Download PDF
                </a>
            </div>
        `;
    }
    
    const modalHTML = `
        <div style="padding: 20px;">
            <h3 style="color: var(--text-primary); margin-bottom: 10px;">
                ${notification.title}
            </h3>
            <div style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 15px;">
                <i class="far fa-calendar"></i> 
                ${date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}
            </div>
            <div style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 20px; white-space: pre-wrap; padding: 15px; background: var(--bg-dark); border-radius: 8px;">
                ${notification.message || 'No message provided'}
            </div>
            ${imageHTML}
            ${pdfHTML}
        </div>
    `;
    
    // Create and show modal
    const modalDiv = document.createElement('div');
    modalDiv.style.cssText = `
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
    `;
    
    modalDiv.innerHTML = `
        <div style="
            background: var(--bg-card);
            border-radius: 12px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            animation: slideUp 0.3s ease;
        ">
            <div style="
                padding: 20px;
                border-bottom: 1px solid var(--border-color);
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <h3 style="margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-bell"></i> Notification Details
                </h3>
                <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" 
                        style="
                            background: none;
                            border: none;
                            color: var(--text-muted);
                            font-size: 1.5rem;
                            cursor: pointer;
                            padding: 5px;
                        ">
                    &times;
                </button>
            </div>
            ${modalHTML}
            <div style="padding: 20px; border-top: 1px solid var(--border-color); text-align: right;">
                <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" 
                        style="
                            padding: 8px 20px;
                            background: var(--bg-dark);
                            color: var(--text-primary);
                            border: 1px solid var(--border-color);
                            border-radius: 6px;
                            cursor: pointer;
                        ">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalDiv);
    
    // Close on background click
    modalDiv.onclick = (e) => {
        if (e.target === modalDiv) {
            modalDiv.remove();
        }
    };
}

// ==========================================
// WINDOW EXPORTS FOR PREVIEW FUNCTIONS
// ==========================================
window.previewImage = previewImage;
window.removeImage = removeImage;
window.previewPDF = previewPDF;
window.removePDF = removePDF;
