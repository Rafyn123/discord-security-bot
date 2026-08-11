const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// ===== DETECTEAZĂ PLATFORMA =====
const isWindows = process.platform === 'win32';
const filename = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
const ytdlpPath = path.join(__dirname, filename);

console.log(`📍 Platform: ${process.platform}`);
console.log(`📍 Fișier: ${filename}`);
console.log(`📍 Cale: ${ytdlpPath}`);

// ===== VERIFICĂ DACĂ EXISTĂ DEJA =====
if (fs.existsSync(ytdlpPath)) {
  try {
    const cmd = isWindows ? `"${ytdlpPath}" --version` : `"${ytdlpPath}" --version`;
    const output = execSync(cmd, { 
      stdio: 'pipe', 
      encoding: 'utf-8',
      shell: isWindows ? 'cmd.exe' : '/bin/bash'
    });
    console.log(`✅ ${filename} există și funcționează: ${output.trim()}`);
    process.exit(0);
  } catch (e) {
    console.log(`⚠️ ${filename} există dar nu funcționează, înlocuiesc...`);
    try { fs.unlinkSync(ytdlpPath); } catch (err) {}
  }
}

// ===== DESCARCĂ yt-dlp =====
const url = isWindows
  ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
  : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';

console.log(`⏳ Descarc yt-dlp de la: ${url}`);

// Funcție pentru descărcare cu redirect
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const request = (currentUrl) => {
      https.get(currentUrl, (response) => {
        // Urmărire redirect (301, 302, 303, 307, 308)
        if (response.statusCode === 301 || response.statusCode === 302 || 
            response.statusCode === 303 || response.statusCode === 307 || 
            response.statusCode === 308) {
          const redirectUrl = response.headers.location;
          console.log(`↩️ Redirect ${response.statusCode}...`);
          request(redirectUrl);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Status code: ${response.statusCode}`));
          return;
        }

        const file = fs.createWriteStream(outputPath);
        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloaded = 0;
        let lastPercent = -1;

        response.on('data', (chunk) => {
          downloaded += chunk.length;
          if (totalSize) {
            const percent = Math.floor((downloaded / totalSize) * 100);
            if (percent !== lastPercent) {
              lastPercent = percent;
              process.stdout.write(`\r⏳ Descarcă: ${percent}%`);
            }
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          console.log(`\n✅ Descărcare finalizată.`);
          resolve();
        });

        file.on('error', (err) => {
          fs.unlinkSync(outputPath);
          reject(err);
        });
      }).on('error', reject);
    };
    
    request(url);
  });
}

// ===== FUNCȚIA PRINCIPALĂ =====
async function main() {
  try {
    // Descarcă fișierul
    await downloadFile(url, ytdlpPath);
    console.log(`✅ ${filename} descărcat.`);

    // Setează permisiuni de execuție (doar pe Linux/Mac)
    if (!isWindows) {
      try {
        fs.chmodSync(ytdlpPath, 0o755);
        console.log(`✅ Permisiuni de execuție setate.`);
      } catch (err) {
        console.warn(`⚠️ Nu am putut seta permisiunile:`, err.message);
        try {
          execSync(`chmod +x "${ytdlpPath}"`);
          console.log(`✅ chmod reușit.`);
        } catch (cmdErr) {
          console.warn(`⚠️ chmod a eșuat:`, cmdErr.message);
        }
      }
    }

    // Verifică dacă funcționează
    try {
      const cmd = isWindows ? `"${ytdlpPath}" --version` : `"${ytdlpPath}" --version`;
      const output = execSync(cmd, { 
        stdio: 'pipe', 
        encoding: 'utf-8',
        shell: isWindows ? 'cmd.exe' : '/bin/bash'
      });
      console.log(`✅ yt-dlp funcțional: ${output.trim()}`);
    } catch (testErr) {
      console.error(`❌ yt-dlp nu rulează:`, testErr.message);
      console.error(`   Cale: ${ytdlpPath}`);
      if (fs.existsSync(ytdlpPath)) {
        console.error(`   Dimensiune: ${fs.statSync(ytdlpPath).size} bytes`);
      }
      process.exit(1);
    }

    console.log('✅ Setup complet!');
    process.exit(0);
  } catch (err) {
    console.error(`❌ Eroare:`, err.message);
    process.exit(1);
  }
}

main();
