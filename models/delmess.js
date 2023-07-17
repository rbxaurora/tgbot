const { Schema, model } = require('mongoose');

const delmessSchema = new Schema({
    msgId: {
        type: Number,
        required: true
    }
}, { timestamps: true });

const Delmess = model('delmess', delmessSchema, 'delmess');


module.exports = Delmess;