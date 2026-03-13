const db = require('../config/database');

// Get all streaks
async function getAllStreaks() {
  const [rows] = await db.query("SELECT * FROM streaks");
  return rows;
}

// Get streak between two users
async function getStreakBetweenUsers(user1_id, user2_id) {
  const [rows] = await db.query(
    "SELECT * FROM streaks WHERE user1_id = ? AND user2_id = ?",
    [user1_id, user2_id]
  );
  return rows[0];
}

// Create a new streak
async function createStreak(user1_id, user2_id, session_ids, start_date) {
  const [result] = await db.query(
    "INSERT INTO streaks (user1_id, user2_id, session_ids, start_date, current_date, current_count) VALUES (?, ?, ?, ?, ?, ?)",
    [user1_id, user2_id, session_ids, start_date, start_date, 1]
  );
  return result.insertId;
}

module.exports = { getAllStreaks, getStreakBetweenUsers, createStreak };