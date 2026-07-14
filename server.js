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

const app = express();

app.use(cors());
app.use(express.json());

// Serve the frontend
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/carts', cartRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reports', reportRoutes);

// Fallback: unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Amica House Coffee Cart server running at http://localhost:${PORT}`);
});
