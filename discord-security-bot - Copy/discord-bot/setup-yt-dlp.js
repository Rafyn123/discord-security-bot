const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const isWindows = process.platform === 'win32';
const filename = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
const ytdlpPath = path.join(__dirname, filename);

console.log(`📍 Platform: ${process.platform}`);
console.log(`📍 Căutam yt-dlp la: ${ytdlpPath}`);

// Dacă deja există, nu mai descarcă
if (fs.existsSync(ytdlpPath)) {
  console.log(`✅ ${filename} deja existent.`);
  process.exit(0);
}

console.log(`⏳ Descarcă yt-dlp pentru ${process.platform}...`);

// Pentru Linux, descarcă binariu
if (!isWindows) {
  const downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
  const file = fs.createWriteStream(ytdlpPath);
  
  let downloadedBytes = 0;

  https.get(downloadUrl, (response) => {
    // Urmărire redirect
    if (response.statusCode === 301 || response.statusCode === 302) {
      console.log(`↩️ Redirect: ${response.headers.location}`);
      return require('https').get(response.headers.location, (newResponse) => {
        newResponse.pipe(file);
        file.on('finish', finishDownload);
      });
    }

    const totalSize = parseInt(response.headers['content-length'], 10);
    
    response.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      const percent = Math.round((downloadedBytes / totalSize) * 100);
      process.stdout.write(`\r⏳ Descarcă: ${percent}%`);
    });

    response.pipe(file);
    file.on('finish', finishDownload);

  }).on('error', (err) => {
    try {
      fs.unlinkSync(ytdlpPath);
    } catch (e) {}
    console.error('\n❌ Eroare descărcare:', err.message);
    process.exit(1);
  });

  function finishDownload() {
    file.close();
    try {
      execSync(`chmod +x ${ytdlpPath}`, { stdio: 'ignore' });
      console.log(`\n✅ yt-dlp descărcat și marcat executabil.`);
      process.exit(0);
    } catch (err) {
      console.error('\n⚠️ Eroare la chmod:', err.message);
      process.exit(1);
    }
  }
} else {
  console.log('⚠️ Windows: descarcă manual de pe https://github.com/yt-dlp/yt-dlp/releases/latest');
  process.exit(1);
}
