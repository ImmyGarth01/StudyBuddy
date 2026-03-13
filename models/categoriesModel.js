const db = require('../config/database');

// Get all categories
async function getAllCategories() {
  const [rows] = await db.query("SELECT * FROM categories");
  return rows;
}

// Get a single category by ID
async function getCategoryById(tag_id) {
  const [rows] = await db.query(
    "SELECT * FROM categories WHERE tag_id = ?",
    [tag_id]
  );
  return rows[0];
}

// Create a new category
async function createCategory(name) {
  const [result] = await db.query(
    "INSERT INTO categories (name) VALUES (?)",
    [name]
  );
  return result.insertId;
}

module.exports = { getAllCategories, getCategoryById, createCategory };
