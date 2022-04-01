const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength: 5 },
    username: { type: String, required: true},
    platform: { type: String, required: true},
    gameProfile: {
        type: Schema.Types.ObjectId,
        ref: 'warzoneUser',
        required: true
    },
    /* Because i changed the format of the squad _id field in the mongodb database i will save them as string */
    squads : [{
        type : Object, required: true
    }]
});


module.exports = mongoose.model('User', userSchema);
