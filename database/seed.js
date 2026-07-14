// Populates the database with a default admin account and sample coffee carts.
// Run with: npm run seed   (after schema.sql has been applied)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function seed() {
  const adminPassword = await bcrypt.hash('Admin@123', 10);

  await pool.query(
    `INSERT INTO users (name, email, phone, password, role)
     VALUES (?, ?, ?, ?, 'admin')
     ON DUPLICATE KEY UPDATE name = VALUES(name)`,
    ['Amica Admin', 'admin@amicahouse.com', '0780000000', adminPassword]
  );

  const carts = [
    {
      cart_name: 'Classic Coffee Cart',
      description: 'A charming cart perfect for small gatherings, offering hand-brewed filter coffee and tea.',
      image: '/images/cart-classic.jpg',
      price: 120.0,
      capacity: 50,
      equipment: 'Filter coffee machine,Kettle,Cups & saucers',
    },
    {
      cart_name: 'Premium Coffee Cart',
      description: 'Full espresso bar with a professional barista, ideal for weddings and corporate events.',
      image: '/images/cart-premium.jpg',
      price: 200.0,
      capacity: 150,
      equipment: 'Espresso machine,Barista service,Coffee varieties,Event decoration',
    },
    {
      cart_name: 'Deluxe Coffee Cart',
      description: 'Our top-tier setup with two baristas, a full menu, and custom branding for large events.',
      image: '/images/cart-deluxe.jpg',
      price: 320.0,
      capacity: 300,
      equipment: 'Dual espresso machines,2 Baristas,Custom menu board,Branding,Event decoration',
    },
  ];

  for (const cart of carts) {
    await pool.query(
      `INSERT INTO coffee_carts (cart_name, description, image, price, capacity, equipment, status)
       VALUES (?, ?, ?, ?, ?, ?, 'available')`,
      [cart.cart_name, cart.description, cart.image, cart.price, cart.capacity, cart.equipment]
    );
  }

  console.log('Seed complete. Admin login -> admin@amicahouse.com / Admin@123');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
