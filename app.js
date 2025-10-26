// Simple in-memory storage for demo purposes
// In production, you'd want to use a proper database
let decks = JSON.parse(localStorage.getItem('anki-decks')) || [];

// Load existing decks on page load
document.addEventListener('DOMContentLoaded', function() {
    loadDecks();
    
    // Handle form submission
    const form = document.querySelector('form[name="anki-upload"]');
    form.addEventListener('submit', handleFormSubmit);
});

function handleFormSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const deckName = formData.get('deck-name');
    const description = formData.get('description');
    const file = formData.get('anki-file');
    
    // Create a simple deck object (we'll store metadata only)
    const newDeck = {
        id: Date.now().toString(),
        name: deckName,
        description: description,
        fileName: file.name,
        uploadDate: new Date().toLocaleDateString(),
        // Note: For actual file storage, you'd need server-side processing
        // This demo stores metadata only
    };
    
    decks.push(newDeck);
    localStorage.setItem('anki-decks', JSON.stringify(decks));
    
    alert('Deck uploaded successfully! (Note: This demo stores metadata only)');
    event.target.reset();
    loadDecks();
}

function loadDecks() {
    const decksList = document.getElementById('decks-list');
    decksList.innerHTML = '';
    
    if (decks.length === 0) {
        decksList.innerHTML = '<p>No decks available yet.</p>';
        return;
    }
    
    decks.forEach(deck => {
        const deckElement = document.createElement('div');
        deckElement.className = 'deck';
        deckElement.innerHTML = `
            <h3>${deck.name}</h3>
            <p>${deck.description}</p>
            <p><strong>File:</strong> ${deck.fileName}</p>
            <p><strong>Uploaded:</strong> ${deck.uploadDate}</p>
            <button onclick="downloadDeck('${deck.id}')">Download</button>
        `;
        decksList.appendChild(deckElement);
    });
}

function downloadDeck(deckId) {
    const deck = decks.find(d => d.id === deckId);
    if (deck) {
        alert(`This would download: ${deck.fileName}\n\nIn a full implementation, the actual file would be downloaded.`);
        // For actual file download, you'd need server-side file storage
    }
}
