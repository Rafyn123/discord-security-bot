const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const isWindows = process.platform === 'win32';
const filename = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
const ytdlpPath = path.join(__dirname, filename);

console.log(`📍 Platform: ${process.platform}`);
console.log(`📍 Căutam yt-dlp la: ${ytdlpPath}`);

// Dacă deja există și e executabil, ieși
if (fs.existsSync(ytdlpPath)) {
  try {
    // Test dacă e executabil - folosesc quote-uri pentru spații
    execSync(`"${ytdlpPath}" --version`, { stdio: 'ignore', shell: '/bin/bash' });
    console.log(`✅ ${filename} deja existent și funcțional.`);
    process.exit(0);
  } catch (e) {
    console.log(`⚠️ ${filename} există dar nu e executabil, reparez...`);
  }
}

// Pentru Linux, descarcă binariu
if (!isWindows) {
  console.log(`⏳ Descarcă yt-dlp pentru linux...`);
  
  downloadFile('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp', ytdlpPath)
    .then(() => {
      console.log(`✅ yt-dlp descărcat.`);
      
      // Marchez executabil
      try {
        fs.chmodSync(ytdlpPath, 0o755);
        console.log(`✅ Marcat executabil (chmodSync).`);
      } catch (err) {
        console.warn(`⚠️ chmodSync nu a funcționat, încerc sistem de fișiere...`);
        try {
          execSync(`chmod +x "${ytdlpPath}"`, { shell: '/bin/bash' });
          console.log(`✅ chmod reușit.`);
        } catch (cmdErr) {
          console.error(`❌ Ambele metode au eșuat:`, cmdErr.message);
          process.exit(1);
        }
      }
      
      // Verificare finală - CU QUOTE-URI
      try {
        const output = execSync(`"${ytdlpPath}" --version`, { 
          stdio: 'pipe',
          encoding: 'utf-8',
          shell: '/bin/bash'
        });
        console.log(`✅ yt-dlp funcțional: ${output.trim()}`);
        process.exit(0);
      } catch (testErr) {
        console.error(`❌ yt-dlp nu rulează:`, testErr.message);
        console.error(`   Cale: ${ytdlpPath}`);
        console.error(`   Stat: ${fs.statSync(ytdlpPath).mode.toString(8)}`);
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error(`❌ Descărcare eșuată:`, err.message);
      process.exit(1);
    });
} else {
  console.log('⚠️ Windows: descarcă manual de pe https://github.com/yt-dlp/yt-dlp/releases');
  process.exit(0);
}

// Funcție pentru descărcare cu urmare automată redirect
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      // Urmărire redirect
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
        console.log(`↩️ Redirect ${response.statusCode}...`);
        downloadFile(response.headers.location, outputPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Status ${response.statusCode}`));
        return;
      }

      const file = fs.createWriteStream(outputPath);
      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedBytes = 0;

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const percent = totalSize ? Math.round((downloadedBytes / totalSize) * 100) : '?';
        process.stdout.write(`\r⏳ Descarcă: ${percent}%`);
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
  });
}
