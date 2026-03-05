const db = require('../config/database');

async function getAllUsers() {
  const [rows] = await db.query('SELECT * FROM users');
  return rows;
}

async function getUserById(id) {
  const [rows] = await db.query('SELECT * FROM users WHERE user_id = ?', [id]);
  return rows[0];
}

module.exports = { getAllUsers, getUserById };
