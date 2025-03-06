const mongoose = require('mongoose');

const userschema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: { type: String },
}, { timestamps: true });

const usermodel = mongoose.model('User', userschema);

module.exports = usermodel;
