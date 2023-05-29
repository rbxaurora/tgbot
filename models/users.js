const mongoose = require(`mongoose`);
const Schema = mongoose.Schema;

const usersSchema = new Schema({
    name: String,
    auroraID: {
        type: Number,
        required: true,
        unique: true
    },
    isAdmin: Boolean
});

const Users = mongoose.model(`users`, usersSchema);

module.exports = Users;