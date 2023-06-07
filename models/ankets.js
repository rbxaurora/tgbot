const mongoose = require(`mongoose`);
const Schema = mongoose.Schema;

const anketsSchema = new Schema({
    userId: {
        type: Number,
        required: true,
        unique: true
    },
    name: String,
    question: Number,
    age: Number,
    activity: String,
    tiktok: String,
    roblox: String,
    skin: String,
    phone: String,
    whyus: String,
    status: String
}, { timestamps: true });

const Ankets = mongoose.model(`ankets`, anketsSchema);

module.exports = Ankets;