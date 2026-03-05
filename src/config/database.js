const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password',        // or your MySQL password
  database: 'studybuddy',  // your database name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
