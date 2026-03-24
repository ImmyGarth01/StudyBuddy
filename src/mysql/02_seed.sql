-- seed.sql

-- 1) USERS
INSERT INTO users (first_name, last_name, password, degree, session_ids, email)
VALUES
('Azeez', 'Bello', 'Az23bstar67', 'Cybersecurity', '1,2', 'AzeezBello@roehampton.ac.uk'),
('Olayinka', 'Jibola', 'OJ57ola56-4', 'Business & Computing', '3', 'OlayinkaJibola@roehampton.ac.uk'),
('Tom', 'Francis', 'TO23fr560!!', 'Computer Science', '4', 'TomFrancis@roehampton.ac.uk'),
('Gloria', 'Amelia', 'AG89pass-5', 'Computing', '5', 'GloriaAmelia@roehampton.ac.uk'),
('Sally', 'Smith', 'SLLS09127A2', 'Digital Media', '6', 'SallySmith@roehampton.ac.uk'),
('Liam', 'Johnson', 'LJ46gdhA12', 'Artificial Intelligence', '7', 'LiamJohnson@roehampton.ac.uk'),
('Sara', 'Khan', 'SK3746hfg7', 'Artificial Intelligence', '8', 'SaraKhan@roehampton.ac.uk'),
('Jake', 'Williams', 'JW476gh67', 'Chemistry', '9', 'JakeWilliams@roehampton.ac.uk'),
('Emily', 'Brown', 'EB348756hgf27', 'Law', '10', 'EmilyBrown@roehampton.ac.uk'),
('Daniel', 'Taylor', 'DT84756hfg98', 'Psychology', '11', 'DanielTaylor@roehampton.ac.uk'),
('Chloe', 'Evans', 'CEfeihf56', 'Computer Science', '12', 'ChloeEvans@roehampton.ac.uk');

-- 2) TAGS
INSERT INTO tags (sessionType) VALUES
('Group Study'),
('One-to-One'),
('Exam Prep'),
('Beginner Friendly'),
('Advanced');

-- 3) MODULES

-- TECH AND BUSINESS
INSERT INTO modules (module_id, module_name, degree, level) VALUES
(101, 'Networking','Cyber Security', 'Beginner'),
(102, 'Marketing','Business and Computing','Intermediate'),
(103, 'Web Development','Digital Media', 'Beginner'),
(104, 'Databases', 'Computer Science', 'Advanced');

-- ARTIFICIAL INTELLIGENCE
INSERT INTO modules (module_name, degree, level) VALUES
('Neural Networks', 'Artificial Intelligence', 'Advanced'),
('Natural Language Processing', 'Artificial Intelligence', 'Intermediate'),
('AI Ethics', 'Artificial Intelligence', 'Beginner');


-- PSYCHOLOGY
INSERT INTO modules (module_name, degree, level) VALUES
('Cognitive Psychology', 'Psychology', 'Beginner'),
('Clinical Psychology', 'Psychology', 'Advanced'),
('Developmental Psychology', 'Psychology', 'Intermediate'),
('Social Psychology', 'Psychology', 'Beginner');

-- LAW
INSERT INTO modules (module_name, degree, level) VALUES
('Criminal Law', 'Law', 'Beginner'),
('Contract Law', 'Law', 'Intermediate'),
('International Law', 'Law', 'Advanced'),
('Human Rights Law', 'Law', 'Intermediate');

-- CHEMISTRY
INSERT INTO modules (module_name, degree, level) VALUES
('Organic Chemistry', 'Chemistry', 'Advanced'),
('Inorganic Chemistry', 'Chemistry', 'Beginner'),
('Physical Chemistry', 'Chemistry', 'Intermediate'),
('Analytical Chemistry', 'Chemistry', 'Intermediate');



-- 4) LISTINGS
INSERT INTO listings (user_id, title, start_time, end_time, location, status, module)
VALUES

-- Cyber Security
(1, 'Advanced Network Security', '2026-04-20 10:00:00', '2026-04-20 12:00:00', 'Lab 5', 'Open', 'Networking'),
(2, 'Network Security Revision', '2026-04-01 10:00:00', '2026-04-01 12:00:00', 'Library A', 'Open', 'Networking'),

-- Business & Computing
(2, 'Marketing Strategy Revision', '2026-04-16 13:00:00', '2026-04-16 15:00:00', 'Room 201', 'Open', 'Marketing'),
(2, 'Marketing Exam Prep', '2026-04-02 14:00:00', '2026-04-02 16:00:00', 'Library B', 'Open', 'Marketing'),

-- Digital Media
(3, 'Web Development Workshop', '2026-04-21 14:00:00', '2026-04-21 16:00:00', 'Studio 2', 'Open', 'Web Development'),
(3, 'Web Dev Pair Programming', '2026-04-03 11:00:00', '2026-04-03 13:00:00', 'Lab 4', 'Open', 'Web Development'),

-- Artificial Intelligence
(1, 'Neural Networks Study Group', '2026-04-10 10:00:00', '2026-04-10 12:00:00', 'Library A', 'Open', 'Neural Networks'),
(1, 'NLP Exam Prep Session', '2026-04-11 14:00:00', '2026-04-11 16:00:00', 'Library B', 'Open', 'Natural Language Processing'),
(1, 'AI Ethics Discussion', '2026-04-12 11:00:00', '2026-04-12 13:00:00', 'Lab 2', 'Open', 'AI Ethics'),

-- Chemistry
(4, 'Organic Chemistry Study Group', '2026-04-17 10:00:00', '2026-04-17 12:00:00', 'Lab 1', 'Open', 'Organic Chemistry'),
(4, 'Physical Chemistry Problems', '2026-04-18 14:00:00', '2026-04-18 16:00:00', 'Lab 3', 'Open', 'Physical Chemistry'),

-- Computer Science
(3, 'Database Systems Revision', '2026-04-19 11:00:00', '2026-04-19 13:00:00', 'Library A', 'Open', 'Databases'),

-- Law
(5, 'Criminal Law Case Review', '2026-04-22 10:00:00', '2026-04-22 12:00:00', 'Room 105', 'Open', 'Criminal Law'),
(5, 'International Law Discussion', '2026-04-23 13:00:00', '2026-04-23 15:00:00', 'Room 106', 'Open', 'International Law'),

-- Psychology
(5, 'Cognitive Psychology Revision', '2026-04-24 10:00:00', '2026-04-24 12:00:00', 'Lab 2', 'Open', 'Cognitive Psychology'),
(5, 'Social Psychology Group Study', '2026-04-25 14:00:00', '2026-04-25 16:00:00', 'Room 210', 'Open', 'Social Psychology');

-- 5) LISTING TAGS
INSERT INTO listing_tags (listing_id, tag_id) VALUES
-- Cyber Security
(1, 3),  -- Exam Prep
(2, 3),

-- Business
(3, 3),
(4, 3),

-- Digital Media
(5, 1),  -- Group Study
(6, 2),  -- One-to-One

-- Artificial Intelligence
(7, 1),  -- Group Study
(8, 3),  -- Exam Prep
(9, 1),  -- Group Study

-- Chemistry
(10, 1),
(11, 4), -- Beginner Friendly

-- Computer Science
(12, 3),

-- Law
(13, 1),
(14, 1),

-- Psychology
(15, 3),
(16, 1);

-- 6) STREAKS  
INSERT INTO streaks (user1_id, user2_id, session_ids, start_date, `current_date`, current_count)
VALUES
(1, 3, '1,4', '2026-02-20', '2026-02-27', 7);

-- 7) JOIN REQUESTS
INSERT INTO join_requests (user_id, listing_id, status)
VALUES
(2, 1, 'pending'),
(3, 1, 'accepted'),
(4, 2, 'pending'),
(5, 3, 'declined');