const mongoose = require(`mongoose`);
const Schema = mongoose.Schema;

const teaSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    auroraID: {
        type: Number,
        required: true,
        unique: true
    },
    total: Number
}, { timestamps: true });

const Tea = mongoose.model(`tea`, teaSchema);

module.exports = Tea;