const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const squadModelUtil = require('../modelUtils/warzoneSquadUtils');

const squadSchema = new Schema({
    /*
     * In order to not to create identical squads in the database i will edit the 'id' field which will contain the squad teammates with their
     * game profile id's from the database sorted in alphabetical order and we will use the chained string of their id's as the squad id.
     */
    _id : {
        type: String,
        required: true
    },

    // An array which will contain the stats after we sorted them according to the shared games only for the squad members
    playersSharedGamesStats : [{
        type : Object,
        required : true
    }],

    // This will hold the general stats for each game which include : gameID, placement, squad total kills at that game. 
    sharedGamesGeneralStats : [{
        type: Object,
        required : true
    }],

    usernames : [{
        type: String,
        required : true
    }],

    platforms : [{
        type: String,
        required : true
    }],

    // Will use this field to check if we need to try update the squad stats.
    lastTimeUpdated : {
        type : Number,
        required: true
    },

    dateCreated : {
        type : String,
        required : true
    }
});

squadSchema.methods.updateStats = async function() {
    /* This method will execute from the middleware/update-db.js, first we are checking if the squad have new shared games that
     * have not entered the database, and if there are any we will return promise which will be resolved in promise barrier inside the 'updateSquadsData'
     * in the middleware/update-db.js file, we also try to made second attempt in case of failure. */
    try {
        const updatedStats = await squadModelUtil.updateSquadStats(this);  // i made separate file for extracting the new games information in case there are any.
        if(!updatedStats) return new Promise((resolve) => { resolve(null); }); // The case we dont need to update the stats.
        this.playersSharedGamesStats = updatedStats.updatedPlayersSharedGamesStats; // The case we find new stats
        this.sharedGamesGeneralStats = updatedStats.updatedSharedGamesGeneralStats; // The case we find new stats
        return this.save();  // Return promise which will try to update the new warzone squad in the database with the new stats.
    }

    catch(err) {
        console.log(`Failed to update the stats for the squad with those players: ${this.usernames} in ${this.platforms} platforms in 'updateStats' method.`);
        console.log("Trying for second time to update that squad: ");
    }
    /* Second try in case of inner failure */
    try {
        const updatedStats = await squadModelUtil.updateSquadStats(this);
        if(!updatedStats) return null; // The case we dont need to update the stats.
        this.playersSharedGamesStats = updatedStats.updatedPlayersSharedGamesStats; // The case we find new stats
        this.sharedGamesGeneralStats = updatedStats.updatedSharedGamesGeneralStats; // The case we find new stats
        console.log("Second attempt to update succeeded.")
        return this.save();  // Return promise which will try to update the new warzone squad in the database with the new stats.
    }

    catch(err) {
        console.log(`Failed to update the stats for the squad with those players: ${this.usernames} in ${this.platforms} platforms in 'updateStats' method.`);
        console.log(err);
        return;
    }
};

module.exports = mongoose.model('warzoneSquad', squadSchema);