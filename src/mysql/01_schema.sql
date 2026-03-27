CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  password VARCHAR(255) NOT NULL,
  degree VARCHAR(100),
  session_ids VARCHAR(255),
  email VARCHAR(150) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE modules (
  module_id INT AUTO_INCREMENT PRIMARY KEY,
  module_name VARCHAR(100),
  degree VARCHAR(100),
  level VARCHAR(50)
);

CREATE TABLE tags (
  tag_id INT AUTO_INCREMENT PRIMARY KEY,
  sessionType VARCHAR(100)
);

CREATE TABLE listings (
  listing_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  title VARCHAR(150),
  start_time DATETIME,
  end_time DATETIME,
  location VARCHAR(150),
  status VARCHAR(50),
  module VARCHAR(100),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE listing_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT,
  tag_id INT,
  FOREIGN KEY (listing_id) REFERENCES listings(listing_id),
  FOREIGN KEY (tag_id) REFERENCES tags(tag_id)
);

CREATE TABLE streaks (
  streak_id INT AUTO_INCREMENT PRIMARY KEY,
  user1_id INT NOT NULL,
  user2_id INT NOT NULL,
  session_ids VARCHAR(255),
  start_date DATE NOT NULL,
  `current_date` DATE NOT NULL,
  current_count INT NOT NULL,
  FOREIGN KEY (user1_id) REFERENCES users(user_id),
  FOREIGN KEY (user2_id) REFERENCES users(user_id)
);

CREATE TABLE join_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  listing_id INT NOT NULL,
  status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (listing_id) REFERENCES listings(listing_id)
);

CREATE TABLE notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  message VARCHAR(255) NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
CREATE TABLE user_modules (
    user_id INT NOT NULL,
    module_id INT NOT NULL,
    PRIMARY KEY (user_id, module_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (module_id) REFERENCES modules(module_id)
);
CREATE TABLE user_privacy (
    user_id INT PRIMARY KEY,
    hide_email TINYINT(1) DEFAULT 0,
    hide_degree TINYINT(1) DEFAULT 0,
    hide_modules TINYINT(1) DEFAULT 0,
    hide_picture TINYINT(1) DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
