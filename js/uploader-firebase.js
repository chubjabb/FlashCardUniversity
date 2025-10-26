// Frontend uploader + Firestore manifest integration using Firebase compat SDK.
// Depends on window.firebaseConfig being set (js/firebase-config.js).
(function(){
  if (!window.firebaseConfig) {
    // Nothing to initialize — uploader disabled.
    console.info('Firebase not configured (window.firebaseConfig missing). Uploader disabled.');
    return;
  }

  // Initialize Firebase
  firebase.initializeApp(window.firebaseConfig);
  const auth = firebase.auth();
  const storage = firebase.storage();
  const firestore = firebase.firestore();

  // Wire up UI
  const openUploaderBtn = document.getElementById('open-uploader');
  const uploaderEl = document.getElementById('uploader');
  const signInBtn = document.getElementById('sign-in');
  const signOutBtn = document.getElementById('sign-out');
  const userInfo = document.getElementById('user-info');
  const fileInput = document.getElementById('file-input');
  const uploadBtn = document.getElementById('upload-btn');
  const progressEl = document.getElementById('upload-progress');
  const statusEl = document.getElementById('upload-status');

  openUploaderBtn.addEventListener('click', ()=> {
    uploaderEl.style.display = uploaderEl.style.display === 'none' ? 'block' : 'none';
  });

  signInBtn.addEventListener('click', ()=> {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => {
      console.error(err);
      alert('Sign-in failed: ' + err.message);
    });
  });

  signOutBtn.addEventListener('click', ()=> auth.signOut());

  auth.onAuthStateChanged(user => {
    if (user) {
      signInBtn.style.display = 'none';
      signOutBtn.style.display = 'inline-block';
      userInfo.textContent = `Signed in as ${user.displayName || user.email}`;
    } else {
      signInBtn.style.display = 'inline-block';
      signOutBtn.style.display = 'none';
      userInfo.textContent = 'Not signed in — sign in to upload';
    }
  });

  uploadBtn.addEventListener('click', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return alert('Please choose a .apkg (or compatible) file to upload.');
    // basic client-side checks
    if (!/\.(apkg|anki|zip)$/i.test(file.name)) {
      return alert('Only .apkg, .anki, or .zip files are allowed.');
    }
    const maxBytes = 200 * 1024 * 1024; // 200 MB client-side limit
    if (file.size > maxBytes) {
      return alert('File is too large (limit 200MB).');
    }
    const user = auth.currentUser;
    if (!user) return alert('You must sign in to upload.');

    const titleField = document.getElementById('deck-title').value.trim();
    const descField = document.getElementById('deck-desc').value.trim();

    const safeName = `${Date.now()}_${file.name.replace(/\s+/g,'_')}`;
    const storageRef = storage.ref().child(`decks/${safeName}`);

    progressEl.style.display = 'block';
    progressEl.value = 0;
    statusEl.textContent = 'Uploading...';

    const uploadTask = storageRef.put(file);

    uploadTask.on('state_changed', snapshot => {
      const pct = Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100);
      progressEl.value = pct;
    }, error => {
      console.error('Upload failed', error);
      statusEl.textContent = 'Upload failed: ' + error.message;
    }, async () => {
      // Upload complete
      const downloadURL = await storageRef.getDownloadURL();
      const metadata = {
        filename: file.name,
        title: titleField || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g,' '),
        description: descField || '',
        size: file.size,
        url: downloadURL,
        storagePath: storageRef.fullPath,
        uploader: user.uid,
        uploaderName: user.displayName || user.email || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      try {
        // Add to Firestore 'decks' collection
        await firestore.collection('decks').add(metadata);
        statusEl.textContent = 'Upload complete — visible to visitors shortly.';
        progressEl.value = 100;
        // Clear input
        fileInput.value = '';
        document.getElementById('deck-title').value = '';
        document.getElementById('deck-desc').value = '';
      } catch (err) {
        console.error('Failed to write metadata', err);
        statusEl.textContent = 'Upload succeeded but failed to write manifest: ' + err.message;
      }
    });
  });

  // Provide a helper to fetch decks from Firestore for the site's main renderer (main.js).
  window.fetchDecksFromFirestore = async function() {
    try {
      const snapshot = await firestore.collection('decks').orderBy('createdAt','desc').get();
      const arr = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          filename: d.filename || (d.storagePath ? d.storagePath.split('/').pop() : ''),
          title: d.title || d.filename,
          description: d.description || '',
          size: d.size || 0,
          url: d.url || '',
          id: doc.id,
          uploaderName: d.uploaderName || ''
        };
      });
      return arr;
    } catch (err) {
      console.error('Error fetching decks from Firestore', err);
      return [];
    }
  };
})();
