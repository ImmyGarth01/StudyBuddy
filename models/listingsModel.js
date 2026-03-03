const db = require('../config/database');

async function getAllListings() {
  const [rows] = await db.query('SELECT * FROM listings');
  return rows;
}

async function getListingById(id) {
  const [rows] = await db.query('SELECT * FROM listings WHERE listing_id = ?', [id]);
  return rows[0];
}

module.exports = { getAllListings, getListingById };
