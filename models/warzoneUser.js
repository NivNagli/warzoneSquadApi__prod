const mongoose = require('mongoose');
const axios = require('axios');
const warzoneUserUtils = require('../modelUtils/warzoneUserUtils');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    username : {
        type: String,
        required: true
    },

    platform : {
        type: String,
        required: true
    },

    lastGamesStats : {
        type : Object,
        required: true
    },

    generalStats : {
        type : Object,
        required: true
    },

    lastTimeUpdated : {
        type : Number,
        required: true
    }

});

userSchema.methods.updateStats = async function() {
    try {
        const updatedStats = await this.getUpdatedStats(); // Execute the protocol that try to update the stats.
        if(!updatedStats) return new Promise((resolve) => { resolve(null); }); // The case we dont need to update the stats.
        this.lastGamesStats = updatedStats.lastGamesStats // The case we find new stats
        this.generalStats = updatedStats.generalStats; // ^^
        return this.save();  // Return promise which will try to update the new warzone profile in the database with the new stats.
    }

    catch(err) {
        console.log(`Failed to update the stats for the user ${this.username} in ${this.platform} platform in 'updateStats' method.`);
        console.log("Trying for second time to update that squad: ");
    }
    /* Second try in case of inner failure */
    try {
        const updatedStats = await this.getUpdatedStats(); // Execute the protocol that try to update the stats.
        if(!updatedStats) return null; // The case we dont need to update the stats.
        this.lastGamesStats = updatedStats.lastGamesStats // The case we find new stats
        this.generalStats = updatedStats.generalStats; // ^^
        console.log("Second attempt to update succeeded.")
        return this.save();  // Return promise which will try to update the new warzone profile in the database with the new stats.
    }

    catch(err) {
        console.log(`Failed to update the stats for the user ${this.username} in ${this.platform} platform in 'updateStats' method.`);
        console.log(err);
        return;
    }
};

userSchema.methods.getUpdatedStats = async function() {
    try {
        const configs = this.buildConfigs(this.username, this.platform); // Create request configs for last-games and general stats requests
        const playerDataRequestBarrier = [];
        playerDataRequestBarrier.push(axios(configs[0]));
        playerDataRequestBarrier.push(axios(configs[1]));
        const playerStats = await Promise.all(playerDataRequestBarrier); // Run the request in parallel.
        const updatedLastGamesArrayStats = warzoneUserUtils.updateUserStats(this, playerStats[0].data.data);  // Try to create the new update stats
        if(!updatedLastGamesArrayStats) {  // The case the player didn't play a new game since the last update.
            return;
        }
        return {  // The case the player did player at least one new game since the last update.
            "lastGamesStats" : updatedLastGamesArrayStats,
            "generalStats" : playerStats[1].data.data
        };
    }
    catch(err) {
        console.log(`Failed to update the stats for the user ${this.username} in ${this.platform} platform in 'getUpdatedStats' method.`);
        console.log(err);
        return;
    }
};

userSchema.methods.buildConfigs = function(username, platform) {
    const configForLast20GamesStats =
    {
        method: 'get',
        url: `${process.env.API_PREFIX}/extract/lastGamesStats/${platform}/${username}`,
        headers: {}
    };

    const configForLifetimeAndWeeklyStats =
    {
        method: 'get',
        url: `${process.env.API_PREFIX}/extract/generalStats/${platform}/${username}`,
        headers: {}
    };
    return [configForLast20GamesStats, configForLifetimeAndWeeklyStats];
};

module.exports = mongoose.model('warzoneUser', userSchema);