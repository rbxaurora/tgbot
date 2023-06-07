const mongoose = require(`mongoose`);
const Schema = mongoose.Schema;

const blackSchema = new Schema({
    userId: {
        type: Number,
        required: true,
        unique: true
    },
    reason: String
});

const Black = mongoose.model(`black`, blackSchema);

module.exports = Black;