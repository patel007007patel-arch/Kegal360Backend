/**
 * Run the seed API logic locally (same as POST /api/seed).
 * Uses MONGODB_URI from .env. Run from repo root: node Kegal360Backend/scripts/runSeedApi.js
 * Or from Backend: node scripts/runSeedApi.js (after ensuring dotenv loads from backend)
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/k360';

async function main() {
  await mongoose.connect(uri);
  const { runSeed } = await import('../controllers/seed.controller.js');
  const res = {
    statusCode: 200,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(body) {
      console.log(JSON.stringify(body, null, 2));
    }
  };
  await runSeed({}, res);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
