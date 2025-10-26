// Node script: scans ./decks and produces decks.json
// Run with: node scripts/generate-manifest.js
const fs = require('fs');
const path = require('path');

const decksDir = path.join(process.cwd(), 'decks');
const outFile = path.join(process.cwd(), 'decks.json');

function generate() {
  if (!fs.existsSync(decksDir)) {
    console.log('No decks directory found. Creating one.');
    fs.mkdirSync(decksDir, { recursive: true });
  }
  const files = fs.readdirSync(decksDir, { withFileTypes: true })
    .filter(d => d.isFile() && /\.(apkg|zip|anki|tar\.gz)$/i.test(d.name))
    .map(d => {
      const fp = path.join(decksDir, d.name);
      const stat = fs.statSync(fp);
      return {
        filename: d.name,
        title: path.basename(d.name, path.extname(d.name)).replace(/[-_]/g, ' '),
        description: '',
        size: stat.size,
        url: `decks/${encodeURIComponent(d.name)}`
      };
    });

  fs.writeFileSync(outFile, JSON.stringify(files, null, 2) + '\n');
  console.log(`Wrote ${outFile} (${files.length} entries)`);
}

generate();
