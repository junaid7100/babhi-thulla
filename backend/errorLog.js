const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "logs");
const LOG_FILE = path.join(LOG_DIR, "client-errors.log");

function logClientError(entry) {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch {
    return; // disk unavailable — drop the log rather than crash the request.
  }
  const line = JSON.stringify({ receivedAt: new Date().toISOString(), ...entry }) + "\n";
  fs.appendFile(LOG_FILE, line, () => {});
}

module.exports = { logClientError, LOG_FILE };
