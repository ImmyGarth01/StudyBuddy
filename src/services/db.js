const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "db",
  user: "root",
  password: "password",
  database: "db",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = {
  query: (sql, params) => pool.execute(sql, params)
};