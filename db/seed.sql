-- Insert sample users
INSERT INTO users (first_name, last_name, password, degree, session_ids)
VALUES
('Azeez', 'Bello', 'Az23bstar67', 'Cybersecurity', '1,2'),
('Olayinka', 'Jibola', 'OJ57ola56-4', 'Business & Computing', '3'),
('Tom', 'Francis', 'TO23fr560!!', 'Computer Science', '4'),
('Gloria', 'Amelia', 'AG89pass-5', 'Computing', '5'),
('Sally', 'Smith', 'SLLS09127A2', 'Digital Media', '6');

-- Insert categories/tags
INSERT INTO categories (name) VALUES
('Group Study'),
('One-to-One'),
('Exam Prep'),
('Beginner Friendly'),
('Advanced');

-- Insert modules
INSERT INTO modules (course_id, category_name, level) VALUES
(101, 'Networking', 'Beginner'),
(102, 'Marketing', 'Intermediate'),
(103, 'Web Development', 'Beginner'),
(104, 'Databases', 'Advanced');

-- Insert listings
INSERT INTO listings (user_id, title, start_time, end_time, location, status, module)
VALUES
(1, 'Network Security Revision', '2026-03-01 10:00', '2026-03-01 12:00', 'Library A', 'Open', 'Networking'),
(2, 'Marketing Exam Prep', '2026-03-02 14:00', '2026-03-02 16:00', 'Library B', 'Open', 'Marketing'),
(3, 'Web Dev Pair Programming', '2026-03-03 11:00', '2026-03-03 13:00', 'Lab 4', 'Open', 'Web Development');

-- Insert listing_tags (connect listings to categories)
INSERT INTO listing_tags (listing_id, tag_id)
VALUES
(1, 1),  -- Network Security Revision → Group Study
(1, 5),  -- Network Security Revision → Advanced
(2, 3),  -- Marketing Exam Prep → Exam Prep
(3, 4);  -- Web Dev Pair Programming → Beginner Friendly

-- Insert streaks
INSERT INTO streaks (user1_id, user2_id, session_ids, start_date, current_date, current_count)
VALUES
(1, 3, '1,4', '2026-02-20', '2026-02-27', 7);
