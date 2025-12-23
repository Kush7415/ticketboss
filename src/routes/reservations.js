import express from 'express';
import db from '../db/database.js';
import { validateReservation } from '../middleware/validator.js';
import { randomUUID } from 'crypto';

const router = express.Router();

const EVENT_ID = 'node-meetup-2025';
const MAX_RETRIES = 5;

// POST /reservations - Reserve seats
router.post('/', validateReservation, (req, res) => {
  const { partnerId, seats } = req.body;
  
  // Optimistic concurrency control with retry
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Start transaction
      const transaction = db.transaction(() => {
        // 1. Get current event state with version
        const event = db.prepare(`
          SELECT available_seats, version 
          FROM events 
          WHERE id = ?
        `).get(EVENT_ID);

        if (!event) {
          throw new Error('EVENT_NOT_FOUND');
        }

        // 2. Check if enough seats available
        if (event.available_seats < seats) {
          throw new Error('NOT_ENOUGH_SEATS');
        }

        // 3. Try to update seats with version check (optimistic locking)
        const updateResult = db.prepare(`
          UPDATE events 
          SET available_seats = available_seats - ?,
              version = version + 1
          WHERE id = ? 
            AND version = ?
            AND available_seats >= ?
        `).run(seats, EVENT_ID, event.version, seats);

        // If no rows affected, version changed (concurrent update)
        if (updateResult.changes === 0) {
          throw new Error('VERSION_CONFLICT');
        }

        // 4. Create reservation
        const reservationId = randomUUID();
        db.prepare(`
          INSERT INTO reservations (id, event_id, partner_id, seats, status)
          VALUES (?, ?, ?, ?, 'confirmed')
        `).run(reservationId, EVENT_ID, partnerId, seats);

        return reservationId;
      });

      // Execute transaction
      const reservationId = transaction();

      // Success!
      return res.status(201).json({
        reservationId,
        seats,
        status: 'confirmed'
      });

    } catch (error) {
      if (error.message === 'NOT_ENOUGH_SEATS') {
        return res.status(409).json({
          error: 'Not enough seats left'
        });
      }
      
      if (error.message === 'EVENT_NOT_FOUND') {
        return res.status(404).json({
          error: 'Event not found'
        });
      }

      if (error.message === 'VERSION_CONFLICT') {
        // Retry on version conflict
        continue;
      }

      // Other errors
      console.error('Reservation error:', error);
      return res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  // Max retries exceeded
  return res.status(503).json({
    error: 'Service temporarily unavailable, please retry'
  });
});

// DELETE /reservations/:reservationId - Cancel reservation
router.delete('/:reservationId', (req, res) => {
  const { reservationId } = req.params;

  try {
    const transaction = db.transaction(() => {
      // 1. Get reservation
      const reservation = db.prepare(`
        SELECT id, seats, status 
        FROM reservations 
        WHERE id = ? AND status = 'confirmed'
      `).get(reservationId);

      if (!reservation) {
        throw new Error('NOT_FOUND');
      }

      // 2. Mark as cancelled
      db.prepare(`
        UPDATE reservations 
        SET status = 'cancelled' 
        WHERE id = ?
      `).run(reservationId);

      // 3. Return seats to pool
      db.prepare(`
        UPDATE events 
        SET available_seats = available_seats + ?
        WHERE id = ?
      `).run(reservation.seats, EVENT_ID);
    });

    transaction();

    return res.status(204).send();

  } catch (error) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({
        error: 'Reservation not found or already cancelled'
      });
    }

    console.error('Cancellation error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// GET /reservations - Get event summary
router.get('/', (req, res) => {
  try {
    const event = db.prepare(`
      SELECT 
        id as eventId,
        name,
        total_seats as totalSeats,
        available_seats as availableSeats,
        version
      FROM events 
      WHERE id = ?
    `).get(EVENT_ID);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }

    // Count confirmed reservations
    const reservationCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM reservations 
      WHERE event_id = ? AND status = 'confirmed'
    `).get(EVENT_ID).count;

    return res.status(200).json({
      ...event,
      reservationCount
    });

  } catch (error) {
    console.error('Summary error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;