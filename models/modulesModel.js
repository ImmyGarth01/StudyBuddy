const db = require('../config/database');

// Get all modules
async function getAllModules() {
  const [rows] = await db.query("SELECT * FROM modules");
  return rows;
}

// Get a single module by ID
async function getModuleById(module_id) {
  const [rows] = await db.query(
    "SELECT * FROM modules WHERE module_id = ?",
    [module_id]
  );
  return rows[0];
}

// Create a new module
async function createModule(course_id, category_name, level) {
  const [result] = await db.query(
    "INSERT INTO modules (course_id, category_name, level) VALUES (?, ?, ?)",
    [course_id, category_name, level]
  );
  return result.insertId;
}

module.exports = { getAllModules, getModuleById, createModule };
