export function validateReservation(req, res, next) {
    const { partnerId, seats } = req.body;
  
    // Check if required fields exist
    if (!partnerId || partnerId.trim() === '') {
      return res.status(400).json({ error: 'partnerId is required' });
    }
  
    // Check if seats is a number
    if (typeof seats !== 'number' || !Number.isInteger(seats)) {
      return res.status(400).json({ error: 'seats must be an integer' });
    }
  
    // Check seats range
    if (seats <= 0) {
      return res.status(400).json({ error: 'seats must be greater than 0' });
    }
  
    if (seats > 10) {
      return res.status(400).json({ error: 'Maximum 10 seats per request' });
    }
  
    next();
  }