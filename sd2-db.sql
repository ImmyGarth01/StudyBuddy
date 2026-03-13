DROP DATABASE IF EXISTS db;
CREATE DATABASE db;
USE db;

CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  degree VARCHAR(100) NOT NULL
);

INSERT INTO users (first_name, last_name, degree) VALUES
('Azeez', 'Bello', 'Cybersecurity'),
('Olayinka', 'Jibola', 'Business & Computing'),
('Tom', 'Francis', 'Computer Science'),
('Gloria', 'Amelia', 'Computing'),
('Sally', 'Smith', 'Digital Media');

CREATE TABLE listings (
  listing_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  title VARCHAR(255) NOT NULL,
  module VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  start_time DATETIME NOT NULL,
  status VARCHAR(50) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

INSERT INTO listings (user_id, title, module, location, start_time, status) VALUES
(1, 'Network Security Revision', 'Cybersecurity', 'Library Room A', '2026-03-15 14:00:00', 'Open'),
(2, 'Marketing Exam Prep', 'Business', 'Study Hall 2', '2026-03-16 10:00:00', 'Open'),
(3, 'Web Dev Pair Programming', 'Computer Science', 'Lab 3', '2026-03-17 16:00:00', 'Open');