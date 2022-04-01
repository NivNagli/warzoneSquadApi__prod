const axios = require('axios');
const WarzoneUser = require('../models/warzoneUser');
const controllersUtils = require('./controllersUtils');
const HttpError = require('../models/http-error');

exports.getGameProfile = async (req, res, next) => {
    const platform = req.params.platform;
    let username;
    if (platform === 'battle') {
        username = controllersUtils.fixBattleName(req.params.username).toLowerCase();;
    }
    else {
        username = req.params.username.toLowerCase();;
    }

    /* I have written down a description & possibleCause that will help us get around problems 
    according to the steps of the code */
    let description = "Failed to access the database";
    let possibleCause = "Check the DB status";

    /* pre-prepares the config structure in case we need to send request to get game stats
       from activision. */
    const configForLast100GamesStats =
    {
        method: 'get',
        url: `${process.env.API_PREFIX}/extract/lastGamesStats/${platform}/${username}/5`,
        headers: {}
    };

    const configForLifetimeAndWeeklyStats =
    {
        method: 'get',
        url: `${process.env.API_PREFIX}/extract/generalStats/${platform}/${username}`,
        headers: {}
    };

    try {
        const gameProfile = await WarzoneUser.findOne({ username: username, platform: platform });
        if (!gameProfile) {
            description = "Failed to search the profile, make sure you enter the correct details and that the user have public activision account.";  // default message description in case we will not get one from our requests.
            possibleCause = "check the username & platform and the extract controller";

            /* Im making promise 'barrier' in order to run the 2 requests in parallel */
            const playerDataRequestBarrier = [];
            playerDataRequestBarrier.push(axios(configForLast100GamesStats));
            playerDataRequestBarrier.push(axios(configForLifetimeAndWeeklyStats));
            const playerStats = await Promise.all(playerDataRequestBarrier);

            const userExists = await WarzoneUser.findOne({ username: username, platform: platform });
            if(userExists) {
                /* I made this second check because the create operation take some time
                 * and we don't want to create duplicate profiles so i made this second check. */
                return res.status(200).json({ lastGamesStats: userExists.lastGamesStats, generalStats: userExists.generalStats, profileID : userExists.id});
            }

            const last100GamesStatsArray = playerStats[0].data.data.gamesArray;
            const lifetimeAndWeeklyStats = playerStats[1].data.data;
            description = "Failed attempt to save the data in the database";
            possibleCause = "Check the DB status";
            const newGameProfile = new WarzoneUser({
                username: username,
                platform: platform,
                lastGamesStats: last100GamesStatsArray,
                generalStats: lifetimeAndWeeklyStats,
                lastTimeUpdated : new Date().getTime()
            });
            await newGameProfile.save();
            console.log("New game profile object created in the database");
            res.status(200).json({ lastGamesStats: last100GamesStatsArray, generalStats: lifetimeAndWeeklyStats, profileID : newGameProfile.id});
        }
        else {
            res.status(200).json({ lastGamesStats: gameProfile.lastGamesStats, generalStats: gameProfile.generalStats, profileID : gameProfile.id});
        }
    }
    catch (err) {
        try {
            possibleCause = err.response.data.possibleCause;
        }
        catch (err) {} // Dont care if dont have a cause, we will use ours cause from this method.
        console.log("getUser controller method failed!");
        console.log(err.response.data.possibleCause);
        try {
            const errorCode = error.response.status;
            res.status(errorCode).json(controllersUtils.errorDescriptionBuilder(errorCode, description, possibleCause));
            return;
        }
        catch (error) {
            res.status(500).json(controllersUtils.errorDescriptionBuilder(500, description, possibleCause));
        }
    }
};

exports.getGameProfileById = async (req, res, next) => {
    /* This method will get a profile id as he appear in the database and will return for that profile if it exists */
    const {profileId} = req.body;
    if(!profileId) {
        const error = new HttpError('Invalid inputs passed, please check your data.', 422);
        return next(error);
    };

    let existingProfile;
    try {
        existingProfile = await  WarzoneUser.findById(profileId);
    }
    catch (err) {
        console.log(err);
        const error = new HttpError("Profile search failed, Please try again.", 500);
        return next(error);
    }
    if(!existingProfile) {
        const error = new HttpError("Invalid profile ID", 403);
        return next(error);
    }
    res.status(200).json({ lastGamesStats: existingProfile.lastGamesStats, generalStats: existingProfile.generalStats, profileID : existingProfile.id});
};