const axios = require('axios');
const Squad = require('../models/warzoneSquad');
const HttpError = require('../models/http-error');
const { validationResult } = require('express-validator');
const squadUtils = require('../controllersUtils/squadUtils');


/* This method will search for existing squad that includes the same players and if we do not find one, 
 * We will create a new one and after both cases we will return the squad shared and not shared stats.
 */
exports.createSquad = async (req, res, next) => {
    /* First we will check if we received errors from the route with the help of express-validator third party package */
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new HttpError('Invalid inputs passed, please check your data.', 422);
        return next(error);
    }

    const { usernames, platforms } = req.body;
    if (usernames.length != platforms.length) {
        const error = new HttpError('Invalid inputs passed, please check your data.', 422);
        return next(error);
    }

    let playersFound = false;  // Boolean flag indicator that will indicate if we found the players or not, in order to acknowledge the error.
    try {
        /* In the next 3 lines we will create requests for retrieving the players profiles, 
         * i use 'promise' barrier in order to run the requests in parallel 
         */
        const playersProfileSearchBarrier = playersProfilesSearchBarrierBuilder(usernames, platforms);
        const playersProfilesRequests = await Promise.all(playersProfileSearchBarrier);
        const playersProfiles = playersProfilesRequests.map(requestInfo => requestInfo.data);
        /* After we successfully extract the players profiles we will sort them according the profiles id's because i defined the 'Squad'
         * object ID in the database according to the profiles ID's when they are sorted and chained into single string which is the Squad ID.
         * I did that to prevent duplicate squads in the database which contain the same players.
         */
        const sortedPlayersIds = playersProfiles.map(profile => profile.profileID);
        playersFound = true;
        sortedPlayersIds.sort();
        // Check for existing squad.
        let existingSquad = await Squad.findById(sortedPlayersIds.join(''));
        // if the squad exists or not we need the updated all time stats.
        const allTimeGamesStats = squadUtils.getPlayersLifetimeStats(playersProfiles);
        if (existingSquad) {
            // In case we already have identical squad in the database we will not create him again...
            res.status(200).json(
                {
                    squadID: existingSquad.id, playersSharedGamesStats: existingSquad.playersSharedGamesStats,
                    sharedGamesGeneralStats: existingSquad.sharedGamesGeneralStats, allTimePlayersStats: allTimeGamesStats,
                    dateCreated : existingSquad.dateCreated
                });
            return;
        }
        else {
            // The case we dont have this squad in the database,
            // First i will create the squad shared games stats with the help of the 'squadUtils' module and after that we will create the new squad.
            const sharedGamesStats = squadUtils.getSharedStats(playersProfiles);
            const newSquad = new Squad({
                _id: sortedPlayersIds.join(''),
                playersSharedGamesStats: sharedGamesStats.playersSharedGamesStats,
                sharedGamesGeneralStats: sharedGamesStats.squadSharedGamesStats,
                lastTimeUpdated: new Date().getTime(),
                usernames: usernames, platforms: platforms,
                dateCreated: new Date().toISOString().split('T')[0]
            });
            await newSquad.save();
            res.status(201).json(
                {
                    squadID: newSquad.id, playersSharedGamesStats: sharedGamesStats.playersSharedGamesStats,
                    sharedGamesGeneralStats: sharedGamesStats.squadSharedGamesStats, allTimePlayersStats: allTimeGamesStats
                });
        }
    }
    catch (err) {
        console.log(err);
        let error = new HttpError(`Creating squad failed, make sure you enter a valid information and all the players have public profiles at activision`, 500);
        // The case the error occurred after we found the players profiles
        if (playersFound) {
            error = new HttpError("Creating squad failed, please try again", 500);
        }
        return next(error);
    }
};

const playersProfilesSearchBarrierBuilder = (usernames, platforms) => {
    // This method will get usernames and platforms array and will create an requests barrier that will need to execute with Promise.all() method.
    try {
        const playersProfileSearchBarrier = [];
        usernames.forEach((username, index) => {
            playersProfileSearchBarrier.push(searchPlayerProfileBuilder(username, platforms[index]));
        });
        return playersProfileSearchBarrier;

    }
    catch (err) {
        const error = new HttpError('Invalid inputs passed, please check your data.', 422);
        return next(error);
    }
};

const searchPlayerProfileBuilder = (username, platform) => {
    /**
     * This method will return for us promise for action of a profile search that we defined in the 'profile' controller.
     * First of all we will check if we have a profile for the user in our database and if so she will return it from there,
     * and if not she will create a new profile and save it in the database and then return the relevant details from it.
     * 
     * The returned value from this function will be entered into a promise barrier that will cause all requests to run simultaneously 
     * in order to optimize the runtime of all users profile search.
     */
    try {
        const playerSearchConfig = playerConfigBuilder(username, platform);
        return axios(playerSearchConfig);
    }
    catch (err) {
        const error = new HttpError('Invalid inputs passed, please check your data.', 422);
        return next(error);
    }
};

const playerConfigBuilder = (username, platform) => {
    // Build config for the axios 'get' request.
    const configForPlayerProfileSearch =
    {
        method: 'get',
        url: `${process.env.API_PREFIX}/profile/username/${username}/platform/${platform}`,
        headers: {}
    };
    return configForPlayerProfileSearch;
};

/* ================================================================================================================================================= */

/*
 * This method is almost identical to the 'createSquad' method, except that this time if the squad does not exist in the database after we create
 * the shared games stats we will return them directly instead of using them to create a new squad in the database.
 */
exports.comparePlayers = async (req, res, next) => {
    /* First we will check if we received errors from the route with the help of express-validator third party package */
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new HttpError('Invalid inputs passed, please check your data.', 422);
        return next(error);
    }

    const { usernames, platforms } = req.body;
    if (usernames.length != platforms.length) {
        const error = new HttpError('Invalid inputs passed, please check your data.', 422);
        return next(error);
    }

    let playersFound = false;  // Boolean flag indicator that will indicate if we found the players or not, in order to acknowledge the error.
    try {
        /* In the next 3 lines we will create requests for retrieving the players profiles, 
         * i use 'promise' barrier in order to run the requests in parallel 
         */
        const playersProfileSearchBarrier = playersProfilesSearchBarrierBuilder(usernames, platforms);
        const playersProfilesRequests = await Promise.all(playersProfileSearchBarrier);
        const playersProfiles = playersProfilesRequests.map(requestInfo => requestInfo.data);
        /* After we successfully extract the players profiles we will sort them according the profiles id's because i defined the 'Squad'
         * object ID in the database according to the profiles ID's when they are sorted and chained into single string which is the Squad ID.
         * I did that to prevent duplicate squads in the database which contain the same players.
         */
        const sortedPlayersIds = playersProfiles.map(profile => profile.profileID);
        playersFound = true;
        sortedPlayersIds.sort();
        // Check for existing squad.
        let existingSquad = await Squad.findById(sortedPlayersIds.join(''));
        // if the squad exists or not we need the updated all time stats.
        const allTimeGamesStats = squadUtils.getPlayersLifetimeStats(playersProfiles);
        if (existingSquad) {
            // In case we already have identical squad in the database we will not create him again...
            res.status(200).json(
                {
                    playersSharedGamesStats: existingSquad.playersSharedGamesStats,
                    sharedGamesGeneralStats: existingSquad.sharedGamesGeneralStats, allTimePlayersStats: allTimeGamesStats,
                    dateCreated : existingSquad.dateCreated
                });
        }
        else {
            // The case we dont have this squad in the database,
            // We will create the shared game stats and afterwards we return them with the 'all time' stats.
            const sharedGamesStats = squadUtils.getSharedStats(playersProfiles);
            res.status(200).json(
                {
                    playersSharedGamesStats: sharedGamesStats.playersSharedGamesStats,
                    sharedGamesGeneralStats: sharedGamesStats.squadSharedGamesStats, allTimePlayersStats: allTimeGamesStats
                });
        }
    }
    catch (err) {
        console.log(err);
        let error = new HttpError(`Players compare failed, make sure you enter a valid information and all the players have public profiles at activision`, 500);
        // The case the error occurred after we found the players profiles
        if (playersFound) {
            error = new HttpError("Players compare failed, please try again", 500);
        }
        return next(error);
    }
};