const mongoose = require('mongoose');
const WarzoneUser = require('../models/warzoneUser');
const WarzoneSquad = require('../models/warzoneSquad');
const WarzoneGame = require('../models/warzoneGame');

exports.updateUsersData = async () => {
    /************************************************************************************************
     * This method will try to update all the warzone profiles in the database that did not attempt to update their data, in a specific time window that we will define here.
     * In order for all requests to be processed simultaneously to improve efficiency I use here 'request barrier' aka 'usersUpdateRequestsBarrier' 
     * that we will release once all requests are ready to be sent.
    /************************************************************************************************/
    const updateIntervalInMilSec = 900000; // 15 minutes in milliseconds.
    const nextUpdateWindowTime = new Date().getTime() - updateIntervalInMilSec;
    const usersUpdateRequestsBarrier = [];
    const usersDbCursor = await WarzoneUser.find({"lastTimeUpdated" : {$lt: nextUpdateWindowTime}});
    let numOfUsersUpdateAttempts = 0;
    usersDbCursor.forEach(user => {
        user.lastTimeUpdated = new Date().getTime();
        usersUpdateRequestsBarrier.push(user.updateStats());
        numOfUsersUpdateAttempts++;
        if (new Date().getTime() - user.lastTimeUpdated > updateIntervalInMilSec) {
            console.log("Need to fix the update interval because we should not be here!");
        }
    });
    const releaseBarrier = await Promise.allSettled(usersUpdateRequestsBarrier);
    console.log(`An update attempt as been done for ${numOfUsersUpdateAttempts} users.`);
};

exports.updateSquadsData = async () => {
    /************************************************************************************************
     * This method will try to update all the warzone squads in the database that did not attempt to update their data, in a specific time window that we will define here.
     * In order for all requests to be processed simultaneously to improve efficiency I use here 'request barrier' aka 'squadsUpdateRequestsBarrier' 
     * that we will release once all requests are ready to be sent.
    /************************************************************************************************/
    const updateIntervalInMilSec = 900000; // 10 minutes in milliseconds.
    const nextUpdateWindowTime = new Date().getTime() - updateIntervalInMilSec;
    const squadsUpdateRequestsBarrier = [];
    const squadsDbCursor = await WarzoneSquad.find({"lastTimeUpdated" : {$lt: nextUpdateWindowTime}});
    let numOfSquadsUpdateAttempts = 0;
    squadsDbCursor.forEach(squad => {
        squad.lastTimeUpdated = new Date().getTime();
        squadsUpdateRequestsBarrier.push(squad.updateStats());
        numOfSquadsUpdateAttempts++;
        if (new Date().getTime() - squad.lastTimeUpdated > updateIntervalInMilSec) {
            console.log("Need to fix the update interval because we should not be here!");
        }
    });
    const releaseBarrier = await Promise.allSettled(squadsUpdateRequestsBarrier);
    console.log(`An update attempt as been done for ${numOfSquadsUpdateAttempts} squads.`);
};

exports.cleanSavedGames = async () => {
    const timePeriodForUnTouchedGame = 43200000; // 12 hours in milliseconds, if no one search for this game after 12 hours we will delete him for the db.
    const nextUpdateWindowTime = new Date().getTime() - timePeriodForUnTouchedGame;
    await WarzoneGame.deleteMany({"lastTouched" : {$lt: nextUpdateWindowTime}});
    console.log("An attempt was made to delete unpopular games.");
};