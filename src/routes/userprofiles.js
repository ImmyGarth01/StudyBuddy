const express = require('express');
const router = express.Router();

//  ADDED — Multer for file uploads
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/uploads/");
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ storage: storage });

// PROFILE HOME PAGE
router.get('/', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const userId = req.session.user.user_id;

    // ADDED — Load privacy settings
    const [privacy] = await req.db.query(
        "SELECT * FROM user_privacy WHERE user_id = ?",
        [userId]
    );

    res.render('profile', {
        user: req.session.user,
        privacy: privacy[0] || {}
    });
});

// ADDED — HIDE INFORMATION PAGE (GET)
router.get('/hide-info', async (req, res) => {
    const userId = req.session.user.user_id;

    const [privacy] = await req.db.query(
        "SELECT * FROM user_privacy WHERE user_id = ?",
        [userId]
    );

    res.render('hide-info', {
        privacy: privacy[0] || {}
    });
});

// ADDED — HIDE INFORMATION (POST)
router.post('/hide-info', async (req, res) => {
    const userId = req.session.user.user_id;

    const hide_email = req.body.hide_email ? 1 : 0;
    const hide_degree = req.body.hide_degree ? 1 : 0;
    const hide_modules = req.body.hide_modules ? 1 : 0;
    const hide_picture = req.body.hide_picture ? 1 : 0;

    await req.db.query(
        `INSERT INTO user_privacy (user_id, hide_email, hide_degree, hide_modules, hide_picture)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         hide_email = VALUES(hide_email),
         hide_degree = VALUES(hide_degree),
         hide_modules = VALUES(hide_modules),
         hide_picture = VALUES(hide_picture)`,
        [userId, hide_email, hide_degree, hide_modules, hide_picture]
    );

    res.redirect('/profile');
});

//  ADDED — UPLOAD PROFILE PICTURE PAGE (GET)
router.get('/upload-picture', (req, res) => {
    res.render('upload-picture');
});

//  ADDED — UPLOAD PROFILE PICTURE (POST)
router.post('/upload-picture', upload.single('profile_pic'), async (req, res) => {
    const userId = req.session.user.user_id;

    if (!req.file) {
        return res.status(400).send("No file uploaded.");
    }

    const filename = req.file.filename;

    await req.db.query(
        "UPDATE users SET profile_pic = ? WHERE user_id = ?",
        [filename, userId]
    );

    // Update session so profile updates instantly
    req.session.user.profile_pic = filename;

    res.redirect('/profile');
});

// EDIT PROFILE PAGE (GET)
router.get('/edit', async (req, res) => {
    const user = req.session.user;
    res.render('edit-profile', { user });
});

// EDIT PROFILE (POST)
router.post('/edit', async (req, res) => {
    const userId = req.session.user.user_id;
    const { first_name, last_name, degree } = req.body;

    try {
        await req.db.query(
            "UPDATE users SET first_name = ?, last_name = ?, degree = ? WHERE user_id = ?",
            [first_name, last_name, degree, userId]
        );

        // Update session so profile updates instantly
        req.session.user.first_name = first_name;
        req.session.user.last_name = last_name;
        req.session.user.degree = degree;

        res.redirect('/profile');

    } catch (err) {
        console.error("Edit profile error:", err);
        res.status(500).send("Error updating profile.");
    }
});

// EDIT MODULES PAGE (GET)
router.get('/modules', async (req, res) => {
    const userId = req.session.user.user_id;

    try {
        // Get all modules
        const [modules] = await req.db.query(
            "SELECT module_id, module_name FROM modules ORDER BY module_name ASC"
        );

        // Get modules the user already selected
        const [userModules] = await req.db.query(
            "SELECT module_id FROM user_modules WHERE user_id = ?",
            [userId]
        );

        const selected = userModules.map(m => m.module_id);

        res.render('edit-modules', {
            modules,
            selected
        });

    } catch (err) {
        console.error("Edit modules error:", err);
        res.status(500).send("Error loading modules.");
    }
});

// EDIT MODULES (POST)
router.post('/modules', async (req, res) => {
    const userId = req.session.user.user_id;

    const selectedModules = Array.isArray(req.body.modules)
        ? req.body.modules
        : [req.body.modules];

    try {
        await req.db.query("DELETE FROM user_modules WHERE user_id = ?", [userId]);

        for (const moduleId of selectedModules) {
            await req.db.query(
                "INSERT INTO user_modules (user_id, module_id) VALUES (?, ?)",
                [userId, moduleId]
            );
        }

        res.redirect('/profile');

    } catch (err) {
        console.error("Update modules error:", err);
        res.status(500).send("Error updating modules.");
    }
});

module.exports = router;