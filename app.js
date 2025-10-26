// Global variables
let decks = [];
let supabaseClient;
let currentFilters = {
    search: '',
    university: '',
    courseCode: ''
};

// Wait for the page to fully load before initializing Supabase
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        // Initialize Supabase - REPLACE THESE WITH YOUR ACTUAL VALUES!
        const supabaseUrl = 'YOUR_SUPABASE_URL';
        const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
        
        supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
        
        // Test connection
        const { data, error } = await supabaseClient
            .from('decks')
            .select('*')
            .limit(1);
            
        if (error) {
            console.error('Supabase connection failed:', error);
            showMessage('❌ Database connection failed', 'error');
        } else {
            console.log('Supabase connected successfully!');
            setupEventListeners();
            loadDecks();
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showMessage('❌ Failed to initialize app', 'error');
    }
}

function setupEventListeners() {
    // Upload form
    document.getElementById('uploadForm').addEventListener('submit', handleUpload);
    
    // Search and filter inputs
    document.getElementById('searchInput').addEventListener('input', function(e) {
        currentFilters.search = e.target.value;
        applyFilters();
    });
    
    document.getElementById('universityFilter').addEventListener('change', function(e) {
        currentFilters.university = e.target.value;
        applyFilters();
    });
    
    document.getElementById('courseCodeFilter').addEventListener('input', function(e) {
        currentFilters.courseCode = e.target.value.toUpperCase();
        applyFilters();
    });
}

async function handleUpload(event) {
    event.preventDefault();
    
    if (!supabaseClient) {
        showMessage('❌ App not ready yet. Please wait...', 'error');
        return;
    }
    
    const uploadButton = document.getElementById('uploadButton');
    const uploadMessage = document.getElementById('uploadMessage');
    
    // Get form data
    const formData = new FormData(event.target);
    const deckName = formData.get('deckName');
    const university = formData.get('university');
    const courseCode = formData.get('courseCode').toUpperCase();
    const courseName = formData.get('courseName');
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
        
        const { data: fileData, error: uploadError } = await supabaseClient.storage
            .from('anki-decks')
            .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        // Step 2: Get public URL for the file
        const { data: { publicUrl } } = supabaseClient.storage
            .from('anki-decks')
            .getPublicUrl(fileName);
        
        // Step 3: Save deck info to database
        const { data: deckData, error: dbError } = await supabaseClient
            .from('decks')
            .insert([
                {
                    name: deckName,
                    university: university,
                    course_code: courseCode,
                    course_name: courseName,
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
    
    if (!supabaseClient) {
        decksList.innerHTML = '<div class="error">App not ready yet</div>';
        return;
    }
    
    try {
        decksList.innerHTML = '<div class="loading">Loading decks...</div>';
        
        const { data, error } = await supabaseClient
            .from('decks')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        decks = data || [];
        applyFilters(); // This will render with current filters
        
    } catch (error) {
        console.error('Error loading decks:', error);
        decksList.innerHTML = '<div class="error">Error loading decks: ' + error.message + '</div>';
    }
}

function applyFilters() {
    let filteredDecks = [...decks];
    
    // Apply search filter
    if (currentFilters.search) {
        const searchTerm = currentFilters.search.toLowerCase();
        filteredDecks = filteredDecks.filter(deck => 
            deck.name.toLowerCase().includes(searchTerm) ||
            deck.course_name.toLowerCase().includes(searchTerm) ||
            deck.course_code.toLowerCase().includes(searchTerm) ||
            deck.description.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply university filter
    if (currentFilters.university) {
        filteredDecks = filteredDecks.filter(deck => 
            deck.university === currentFilters.university
        );
    }
    
    // Apply course code filter
    if (currentFilters.courseCode) {
        filteredDecks = filteredDecks.filter(deck => 
            deck.course_code.includes(currentFilters.courseCode)
        );
    }
    
    renderDecks(filteredDecks);
    updateFilterStats(filteredDecks);
}

function renderDecks(decksToRender) {
    const decksList = document.getElementById('decks-list');
    
    if (decksToRender.length === 0) {
        const noResultsHtml = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <h3>No decks found</h3>
                <p>${decks.length === 0 ? 'Be the first to upload an Anki deck!' : 'Try adjusting your search filters'}</p>
            </div>
        `;
        decksList.innerHTML = noResultsHtml;
        return;
    }
    
    decksList.innerHTML = decksToRender.map(deck => `
        <div class="deck">
            <div class="deck-header">
                <div>
                    <h3>${escapeHtml(deck.name)}</h3>
                    <div class="deck-meta">
                        <span class="university-badge">${escapeHtml(deck.university)}</span>
                        <span class="course-badge"><strong>${escapeHtml(deck.course_code)}</strong>: ${escapeHtml(deck.course_name)}</span>
                    </div>
                </div>
            </div>
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

function updateFilterStats(filteredDecks) {
    const filterResults = document.getElementById('filterResults');
    
    if (currentFilters.search || currentFilters.university || currentFilters.courseCode) {
        const totalDecks = decks.length;
        const showingDecks = filteredDecks.length;
        
        let filterText = `Showing ${showingDecks} of ${totalDecks} decks`;
        
        if (currentFilters.search) {
            filterText += ` • Search: "${currentFilters.search}"`;
        }
        if (currentFilters.university) {
            filterText += ` • University: ${currentFilters.university}`;
        }
        if (currentFilters.courseCode) {
            filterText += ` • Course Code: ${currentFilters.courseCode}`;
        }
        
        filterResults.innerHTML = `<div class="filter-stats">${filterText}</div>`;
    } else {
        filterResults.innerHTML = `<div class="filter-stats">Showing all ${decks.length} decks</div>`;
    }
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('universityFilter').value = '';
    document.getElementById('courseCodeFilter').value = '';
    
    currentFilters = {
        search: '',
        university: '',
        courseCode: ''
    };
    
    applyFilters();
}

async function downloadDeck(deckId, fileName, fileUrl) {
    try {
        // Increment download count
        const { error } = await supabaseClient
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
