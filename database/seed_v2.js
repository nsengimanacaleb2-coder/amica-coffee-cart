// Populates packages, menu items, and a sample promo code.
// Run with: node database/seed_v2.js  (after migration_v2.sql has been applied)
require('dotenv').config();
const pool = require('../config/db');

async function seed() {
  const packages = [
    { name: 'Wedding Package', event_type: 'Wedding', price: 450, description: 'Full-day coverage with décor to match your theme.', included_services: 'Premium cart,2 baristas,Custom menu board,Decoration,Extended hours' },
    { name: 'Birthday Package', event_type: 'Birthday Party', price: 220, description: 'A fun, relaxed setup perfect for birthday celebrations.', included_services: 'Classic cart,1 barista,Coffee & hot chocolate bar' },
    { name: 'Corporate Package', event_type: 'Corporate Meeting', price: 300, description: 'Efficient service to keep meetings and conferences energized.', included_services: 'Premium cart,1 barista,Espresso & filter coffee,Branded cups' },
    { name: 'Graduation Package', event_type: 'Other', price: 260, description: 'Celebrate the milestone with a festive coffee bar.', included_services: 'Classic cart,1 barista,Coffee & tea bar,Photo-friendly setup' },
    { name: 'VIP Package', event_type: 'Other', price: 600, description: 'Our most complete offering for high-profile events.', included_services: 'Deluxe cart,2 baristas,Full menu,Custom branding,Decoration,Priority booking' },
  ];

  for (const p of packages) {
    await pool.query(
      `INSERT INTO packages (name, event_type, price, description, included_services)
       VALUES (?, ?, ?, ?, ?)`,
      [p.name, p.event_type, p.price, p.description, p.included_services]
    );
  }

  const menu = [
    ['Espresso', 'Coffee', 'A concentrated shot of rich, bold coffee.', 3],
    ['Cappuccino', 'Coffee', 'Espresso topped with steamed milk and foam.', 4],
    ['Latte', 'Coffee', 'Espresso with steamed milk, lightly foamed.', 4],
    ['Mocha', 'Coffee', 'Espresso, chocolate, and steamed milk.', 4.5],
    ['Americano', 'Coffee', 'Espresso diluted with hot water.', 3.5],
    ['Hot Chocolate', 'Non-Coffee', 'Rich, creamy chocolate, always a crowd favorite.', 4],
    ['Tea', 'Non-Coffee', 'A selection of black, green, and herbal teas.', 3],
    ['Snacks', 'Food', 'Pastries and light bites to go with your drink.', 2.5],
  ];
  for (const [name, category, description, price] of menu) {
    await pool.query(
      `INSERT INTO menu_items (name, category, description, price) VALUES (?, ?, ?, ?)`,
      [name, category, description, price]
    );
  }

  await pool.query(
    `INSERT INTO promo_codes (code, discount_type, discount_value, max_uses, active)
     VALUES ('WELCOME10', 'percent', 10, 100, 1)
     ON DUPLICATE KEY UPDATE code = VALUES(code)`
  );

  console.log('Phase 2 seed complete: packages, menu items, and promo code WELCOME10 added.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
