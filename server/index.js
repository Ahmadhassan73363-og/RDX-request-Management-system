// Local development server entry point.
// Imports the Express app from app.js and starts listening on a port.
// On Vercel, api/index.js is used instead — it exports the app directly.

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import app from './app.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 RDX Management Backend running on http://localhost:${PORT}`);
  console.log(`📊 Connected to PostgreSQL (database: ${process.env.PGDATABASE || 'neondb'})`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use by another process. Please close it first or set PORT=<other_port>.`);
  } else {
    console.error('❌ Server startup error:', err);
  }
  process.exit(1);
});
