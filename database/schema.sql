-- Amica House Coffee Cart Booking Management System
-- Run this file first: mysql -u root -p < database/schema.sql

CREATE DATABASE IF NOT EXISTS amica_coffee_cart;
USE amica_coffee_cart;

-- ---------------------------------------------------------
-- USERS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(30),
  password VARCHAR(255) NOT NULL,
  role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- COFFEE CARTS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS coffee_carts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cart_name VARCHAR(150) NOT NULL,
  description TEXT,
  image VARCHAR(255),
  price DECIMAL(10, 2) NOT NULL,
  capacity INT,
  equipment TEXT,               -- comma separated list, e.g. "Espresso machine,Barista service"
  status ENUM('available', 'unavailable') NOT NULL DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- BOOKINGS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  cart_id INT NOT NULL,
  event_type VARCHAR(100),
  event_date DATE NOT NULL,
  event_time TIME,
  location VARCHAR(255),
  guests INT,
  message TEXT,
  status ENUM('Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (cart_id) REFERENCES coffee_carts(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- PAYMENTS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50),
  payment_status ENUM('Pending', 'Paid', 'Refunded', 'Failed') NOT NULL DEFAULT 'Pending',
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- REVIEWS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Helpful index for double-booking checks
CREATE INDEX idx_bookings_cart_date ON bookings(cart_id, event_date);
