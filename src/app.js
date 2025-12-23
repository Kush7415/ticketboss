
import express from 'express';
import reservationsRouter from './routes/reservations.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/reservations', reservationsRouter);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'TicketBoss API',
    status: 'running'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎟️  TicketBoss API running on http://localhost:${PORT}`);
});