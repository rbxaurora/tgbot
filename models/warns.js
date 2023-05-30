const mongoose = require(`mongoose`);
const Schema = mongoose.Schema;

const warnsSchema = new Schema({
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
});

const Warns = mongoose.model(`warns`, warnsSchema);

module.exports = Warns;