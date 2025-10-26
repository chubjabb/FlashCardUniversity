// Initialize Supabase - REPLACE THESE WITH YOUR ACTUAL VALUES!
const supabaseUrl = 'https://ssvirocnzzunatlrqlnf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmlyb2Nuenp1bmF0bHJxbG5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0OTU0NzQsImV4cCI6MjA3NzA3MTQ3NH0.Bt5lH4jH2hkOO5zW3b4KCQyCltNp_fdMJ4Ib8PRu3oU';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Global variables
let decks = [];

document.addEventListener('DOMContentLoaded', function() {
    loadDecks();
    document.getElementById('uploadForm').addEventListener('submit', handleUpload);
});

async function handleUpload(event) {
    event.preventDefault();
    
    const uploadButton = document.getElementById('uploadButton');
    const uploadMessage = document.getElementById('uploadMessage');
    
    // Get form data
    const formData = new FormData(event.target);
    const deckName = formData.get('deckName');
    const description = formData.get('description');
    const fileInput = document.querySelector('input[name="ankiFile"]');
    
    if (!fileInput.files.length) {
        showMessage('Please select a file', 'error');
        return;
    }
    
    const file = fileInput.files[0];
    
    // Validate file type
    if (!file.name.endsWith('.apkg') && !file.name.endsWith('.anki2')) {
        showMessage('Please upload a valid Anki deck file (.apkg or .anki2)', 'error');
        return;
    }
    
    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
        showMessage('File size must be less than 100MB', 'error');
        return;
    }
    
    try {
        // Disable button and show loading
        uploadButton.disabled = true;
        uploadButton.textContent = 'Uploading...';
        showMessage('Uploading your deck...', 'loading');
        
        // Step 1: Upload file to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { data: fileData, error: uploadError } = await supabase.storage
            .from('anki-decks')
            .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        // Step 2: Get public URL for the file
        const { data: { publicUrl } } = supabase.storage
            .from('anki-decks')
            .getPublicUrl(fileName);
        
        // Step 3: Save deck info to database
        const { data: deckData, error: dbError } = await supabase
            .from('decks')
            .insert([
                {
                    name: deckName,
                    description: description,
                    file_name: file.name,
                    file_url: publicUrl,
                    file_size: formatFileSize(file.size)
                }
            ])
            .select();
        
        if (dbError) throw dbError;
        
        // Success!
        showMessage('✅ Deck uploaded successfully!', 'success');
        event.target.reset();
        
        // Reload decks
        await loadDecks();
        
    } catch (error) {
        console.error('Upload error:', error);
        showMessage('❌ Error uploading deck: ' + error.message, 'error');
    } finally {
        // Re-enable button
        uploadButton.disabled = false;
        uploadButton.textContent = 'Upload Deck';
    }
}

async function loadDecks() {
    const decksList = document.getElementById('decks-list');
    
    try {
        decksList.innerHTML = '<div class="loading">Loading decks...</div>';
        
        const { data, error } = await supabase
            .from('decks')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        decks = data || [];
        renderDecks();
        
    } catch (error) {
        console.error('Error loading decks:', error);
        decksList.innerHTML = '<div class="error">Error loading decks: ' + error.message + '</div>';
    }
}

function renderDecks() {
    const decksList = document.getElementById('decks-list');
    
    if (decks.length === 0) {
        decksList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <h3>No decks yet</h3>
                <p>Be the first to upload an Anki deck!</p>
            </div>
        `;
        return;
    }
    
    decksList.innerHTML = decks.map(deck => `
        <div class="deck">
            <h3>${escapeHtml(deck.name)}</h3>
            <p>${escapeHtml(deck.description)}</p>
            <div class="stats">
                <strong>File:</strong> ${escapeHtml(deck.file_name)} 
                ${deck.file_size ? `(${deck.file_size})` : ''}<br>
                <strong>Uploaded:</strong> ${new Date(deck.created_at).toLocaleDateString()}
                ${deck.download_count ? `• <strong>Downloads:</strong> ${deck.download_count}` : ''}
            </div>
            <button onclick="downloadDeck('${deck.id}', '${escapeHtml(deck.file_name)}', '${deck.file_url}')">
                📥 Download Deck
            </button>
        </div>
    `).join('');
}

async function downloadDeck(deckId, fileName, fileUrl) {
    try {
        // Increment download count
        const { error } = await supabase
            .from('decks')
            .update({ download_count: (decks.find(d => d.id === deckId).download_count || 0) + 1 })
            .eq('id', deckId);
        
        if (error) console.error('Error updating download count:', error);
        
        // Create download link
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Reload to show updated download count
        setTimeout(loadDecks, 500);
        
    } catch (error) {
        console.error('Download error:', error);
        alert('Error downloading file: ' + error.message);
    }
}

function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('uploadMessage');
    messageDiv.innerHTML = `<div class="${type}">${message}</div>`;
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.innerHTML = '';
        }, 5000);
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
