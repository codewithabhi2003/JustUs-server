// contactRoutes.js — saved inline, loaded by server.js
const express1 = require('express');
const cr = express1.Router();
const { getContacts, addContact } = require('../controllers/contactController');
const { protect: p1 } = require('../middleware/authMiddleware');
cr.get('/',             p1, getContacts);
cr.post('/add/:userId', p1, addContact);
module.exports = cr;
