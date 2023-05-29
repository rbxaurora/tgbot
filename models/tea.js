const mongoose = require(`mongoose`);
const Schema = mongoose.Schema;

const teaSchema = new Schema({
    auroraID: {
        type: Number,
        required: true,
        unique: true
    },
    total: Number
}, { timestamps: true });

const Tea = mongoose.model(`tea`, teaSchema);

module.exports = Tea;