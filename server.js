require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const cartRoutes = require('./routes/cartRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const reportRoutes = require('./routes/reportRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const engagementRoutes = require('./routes/engagementRoutes');
const { authLimiter } = require('./middleware/rateLimiter');

const app = express();

app.use(cors());
app.use(express.json());

// Serve the frontend — cache static assets for a day (images/css/js), browsers revalidate HTML normally
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/carts', cartRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api', catalogRoutes);      // /api/packages, /api/menu
app.use('/api', engagementRoutes);   // /api/favorites, /api/promo, /api/newsletter

// Fallback: unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Amica House Coffee Cart server running at http://localhost:${PORT}`);
});
