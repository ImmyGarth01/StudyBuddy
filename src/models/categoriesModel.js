const db = require('../config/database');

async function getCategories() {
  const [rows] = await db.query('SELECT * FROM categories');
  return rows;
}

module.exports = { getCategories };
