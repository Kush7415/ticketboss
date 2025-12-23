import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize database
const db = new Database(join(__dirname, '../../database.db'));

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create tables
function initializeDatabase() {
  // Events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      total_seats INTEGER NOT NULL,
      available_seats INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Reservations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      partner_id TEXT NOT NULL,
      seats INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id)
    )
  `);

  // Create index for faster lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_reservations_event 
    ON reservations(event_id, status)
  `);

  console.log('✅ Database initialized');
}

// Seed initial event data
function seedEvent() {
  const checkEvent = db.prepare('SELECT id FROM events WHERE id = ?').get('node-meetup-2025');
  
  if (!checkEvent) {
    const insert = db.prepare(`
      INSERT INTO events (id, name, total_seats, available_seats, version)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    insert.run('node-meetup-2025', 'Node.js Meet-up', 500, 500, 0);
    console.log('✅ Event seeded: node-meetup-2025');
  } else {
    console.log('ℹ️  Event already exists');
  }
}

// Initialize on import
initializeDatabase();
seedEvent();

export default db;