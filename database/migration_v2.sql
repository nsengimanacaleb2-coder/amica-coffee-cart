-- Phase 2 migration — run this AFTER schema.sql, on your existing database.
-- Safe to run once: mysql -u root -p amica_coffee_cart < database/migration_v2.sql
USE amica_coffee_cart;

-- Event packages (Wedding, Birthday, Corporate, Graduation, VIP, ...)
CREATE TABLE IF NOT EXISTS packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  event_type VARCHAR(100),
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  included_services TEXT,           -- comma separated
  image VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Coffee menu shown on the public menu page
CREATE TABLE IF NOT EXISTS menu_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) DEFAULT 'Drinks',
  description VARCHAR(255),
  price DECIMAL(10, 2),
  image VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer favorite carts
CREATE TABLE IF NOT EXISTS favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  cart_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_favorite (user_id, cart_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (cart_id) REFERENCES coffee_carts(id) ON DELETE CASCADE
);

-- Promo codes
CREATE TABLE IF NOT EXISTS promo_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_type ENUM('percent', 'fixed') NOT NULL DEFAULT 'percent',
  discount_value DECIMAL(10, 2) NOT NULL,
  max_uses INT DEFAULT NULL,
  used_count INT NOT NULL DEFAULT 0,
  expires_at DATE DEFAULT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Newsletter subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL UNIQUE,
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Extend bookings with package, promo, and computed price
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS package_id INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estimated_price DECIMAL(10, 2) DEFAULT NULL;

-- Add the foreign key separately (MySQL versions before 8.0.29 don't support
-- "ADD COLUMN IF NOT EXISTS" combined inline with constraints reliably)
SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'amica_coffee_cart' AND CONSTRAINT_NAME = 'fk_bookings_package'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE bookings ADD CONSTRAINT fk_bookings_package FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
