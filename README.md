

# 🎟️ TicketBoss - Event Ticketing API

A high-performance event ticketing API with **optimistic concurrency control** to prevent overselling during concurrent seat reservations.

## 🚀 Features

- Real-time seat reservations with instant accept/deny responses
- Optimistic concurrency control using version-based locking
- Prevents overselling even under high concurrent load
- RESTful API design
- SQLite database with WAL mode for better concurrency
- Transaction-based seat management

---

## 📋 Prerequisites

- Node.js v16 or higher
- npm

---

## ⚙️ Installation & Setup

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd ticketboss
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start the server
```bash
npm start
```

The API will start on `http://localhost:3000`

**On first startup, the database is automatically initialized and seeded with:**
- Event ID: `node-meetup-2025`
- Total Seats: `500`
- Available Seats: `500`
- Version: `0`

---

## 📡 API Endpoints

### 1. **Reserve Seats**
**`POST /reservations`**

Reserve seats for a partner.

**Request Body:**
```json
{
  "partnerId": "abc-corp",
  "seats": 3
}
```

**Responses:**

✅ **201 Created** - Reservation successful
```json
{
  "reservationId": "a3d27c17-247b-4cd5-a80f-1234567890ab",
  "seats": 3,
  "status": "confirmed"
}
```

❌ **409 Conflict** - Not enough seats
```json
{
  "error": "Not enough seats left"
}
```

❌ **400 Bad Request** - Invalid input
```json
{
  "error": "Maximum 10 seats per request"
}
```

**Validation Rules:**
- `partnerId` is required (non-empty string)
- `seats` must be an integer between 1 and 10

---

### 2. **Cancel Reservation**
**`DELETE /reservations/:reservationId`**

Cancel a reservation and return seats to the pool.

**Responses:**

✅ **204 No Content** - Cancellation successful

❌ **404 Not Found** - Reservation doesn't exist or already cancelled
```json
{
  "error": "Reservation not found or already cancelled"
}
```

---

### 3. **Get Event Summary**
**`GET /reservations`**

Get current event status and reservation statistics.

**Response:**

✅ **200 OK**
```json
{
  "eventId": "node-meetup-2025",
  "name": "Node.js Meet-up",
  "totalSeats": 500,
  "availableSeats": 487,
  "version": 4,
  "reservationCount": 3
}
```

---

### 4. **Health Check**
**`GET /`**

Check if the API is running.

**Response:**
```json
{
  "message": "TicketBoss API",
  "status": "running"
}
```

---

## 🧪 Testing Examples

### Using PowerShell (Windows):
```powershell
# Get event summary
Invoke-RestMethod -Uri http://localhost:3000/reservations -Method Get

# Make a reservation
Invoke-RestMethod -Uri http://localhost:3000/reservations -Method Post -Body '{"partnerId":"abc-corp","seats":3}' -ContentType "application/json"

# Cancel a reservation
Invoke-RestMethod -Uri http://localhost:3000/reservations/YOUR-RESERVATION-ID -Method Delete

# Test validation (too many seats)
Invoke-RestMethod -Uri http://localhost:3000/reservations -Method Post -Body '{"partnerId":"xyz-corp","seats":15}' -ContentType "application/json"
```

### Using curl (Mac/Linux):
```bash
# Get event summary
curl http://localhost:3000/reservations

# Make a reservation
curl -X POST http://localhost:3000/reservations \
  -H "Content-Type: application/json" \
  -d '{"partnerId":"abc-corp","seats":3}'

# Cancel a reservation
curl -X DELETE http://localhost:3000/reservations/YOUR-RESERVATION-ID
```

---

## 🏗️ Architecture & Technical Decisions

### **Optimistic Concurrency Control**

The core challenge is preventing overselling when multiple partners try to reserve the last few seats simultaneously.

**Implementation:**
1. Each event has a `version` field that increments with every update
2. When reserving seats:
   - Read current `version` and `availableSeats`
   - Attempt to update seats WHERE `version = currentVersion`
   - If update fails (0 rows affected), another request modified the data → retry
   - Maximum 5 retry attempts before returning 503

**SQL Example:**
```sql
UPDATE events 
SET available_seats = available_seats - 3,
    version = version + 1
WHERE id = 'node-meetup-2025' 
  AND version = 2
  AND available_seats >= 3
```

This ensures **atomic updates** and prevents race conditions.

---

### **Technology Choices**

| Technology | Reason |
|------------|--------|
| **Node.js + Express** | Fast, lightweight, perfect for APIs |
| **SQLite + better-sqlite3** | Zero configuration, synchronous operations, WAL mode for concurrency |
| **Transactions** | ACID guarantees for seat reservations and cancellations |
| **WAL Mode** | Write-Ahead Logging allows concurrent reads during writes |

---

### **Database Schema**

**Events Table:**
```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  total_seats INTEGER NOT NULL,
  available_seats INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 0
)
```

**Reservations Table:**
```sql
CREATE TABLE reservations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  seats INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id)
)
```

---

## 📁 Project Structure
```
ticketboss/
├── src/
│   ├── db/
│   │   └── database.js       # Database initialization, schema, and seeding
│   ├── routes/
│   │   └── reservations.js   # API endpoints and business logic
│   ├── middleware/
│   │   └── validator.js      # Input validation middleware
│   └── app.js                # Express server setup
├── database.db               # SQLite database (auto-generated)
├── package.json
├── .gitignore
└── README.md
```

---

## 🔒 Error Handling

The API handles the following edge cases:

- ✅ Concurrent reservations (optimistic locking)
- ✅ Insufficient seats (409 Conflict)
- ✅ Invalid input (400 Bad Request)
- ✅ Non-existent reservations (404 Not Found)
- ✅ Cancelled reservations (seats returned to pool)
- ✅ Maximum retry exhaustion (503 Service Unavailable)

---

## 🎯 Assumptions

1. Only one event (`node-meetup-2025`) is managed
2. No authentication/authorization required
3. Partner IDs are provided by external systems
4. Maximum 10 seats per reservation request
5. Cancelled reservations cannot be un-cancelled
6. Database persists between server restarts

---

## 🚦 Future Enhancements

- Add authentication for partners
- Support multiple events
- Add rate limiting per partner
- Implement reservation expiry
- Add payment integration
- Create admin dashboard
- Add metrics and monitoring

---

## 📄 License

MIT

---

## 👨‍💻 Author

Built as part of the TicketBoss coding challenge.