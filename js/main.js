// Fetch decks.json or Firestore (if configured) and render deck cards
async function loadDecks() {
  const container = document.getElementById('decks');
  container.innerHTML = '<p class="loading">Loading decks…</p>';
  try {
    let data = null;

    // If Firebase uploader is configured and provides a fetch method, use it.
    if (typeof window.fetchDecksFromFirestore === 'function') {
      data = await window.fetchDecksFromFirestore();
    }

    // Fallback to static decks.json when Firebase not configured or returned no entries
    if (!data || !Array.isArray(data) || data.length === 0) {
      try {
        const res = await fetch('decks.json', {cache: 'no-cache'});
        if (res.ok) {
          data = await res.json();
        } else {
          if (!data || data.length === 0) {
            throw new Error('No decks available');
          }
        }
      } catch (err) {
        // If there was no Firestore data and decks.json couldn't be loaded, show message below
        if (!data || data.length === 0) {
          container.innerHTML = '<p class="loading">No decks found. Upload .apkg files into the /decks folder or configure the Firebase uploader.</p>';
          return;
        }
      }
    }

    renderDecks(data);
  } catch (err) {
    container.innerHTML = '<p class="loading">Unable to load decks. Make sure decks.json exists and is valid or configure Firebase uploader.</p>';
    console.error(err);
  }
}

function renderDecks(decks){
  const container = document.getElementById('decks');
  if (!Array.isArray(decks) || decks.length === 0) {
    container.innerHTML = '<p class="loading">No decks found. Upload .apkg files into the /decks folder and add them to decks.json (or enable the Firebase uploader).</p>';
    return;
  }
  const search = document.getElementById('search');
  const createCard = (d) => {
    const el = document.createElement('article');
    el.className = 'deck';
    el.innerHTML = `
      <h3>${escapeHtml(d.title || d.filename)}</h3>
      <div class="meta">${escapeHtml(d.description || '')}</div>
      <div class="meta">${d.size ? humanFileSize(d.size) : ''}</div>
      <div class="actions">
        <a class="btn" href="${encodeURI(d.url)}" target="_blank" rel="noopener">Download</a>
        <a class="btn secondary" href="https://github.com/chubjabb/FlashCardUniversity/tree/main/decks" target="_blank" rel="noopener">View on GitHub</a>
      </div>
    `;
    return el;
  };

  function doRender(filter='') {
    container.innerHTML = '';
    const filtered = decks.filter(d => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      return (d.title || d.filename || '').toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q);
    });
    if (filtered.length === 0) {
      container.innerHTML = '<p class="loading">No decks match your search.</p>';
      return;
    }
    for (const d of filtered) container.appendChild(createCard(d));
  }

  search.addEventListener('input', (e)=>doRender(e.target.value));
  doRender('');
}

function escapeHtml(s=''){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

function humanFileSize(size){
  if (!size && size !== 0) return '';
  const i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return `${(size / Math.pow(1024, i)).toFixed(1)} ${['B','KB','MB','GB','TB'][i]}`;
}

loadDecks();
