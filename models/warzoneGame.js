const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const gameSchema = new Schema({
    _id : {
        type: String,
        required: true
    },

    gameStats : {
        type : Object,
        required: true
    },

    signedUsers : [{
        type : Schema.Types.ObjectId,
        ref : 'warzoneUser'
    }],
    // Will use the 'lastTouched' variable to determine if we want to delete the object from the database cache.
    lastTouched : {
        type : Number,
        required: true
    }
});

module.exports = mongoose.model('warzoneGame', gameSchema);