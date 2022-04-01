/******************************************************************************************************************
 * These methods will responsible for searching for existing game stats in the database or to create new one and return him.
****************************************************************************************************************** */

const axios = require('axios');
const WarzoneGame = require('../models/warzoneGame');
const controllersUtils = require('./controllersUtils');

exports.getMatch = async (req, res, next) => {
    const gameId = req.params.gameId;

    /* I have written down a description & possibleCause that will help us get around problems 
    according to the steps of the code */
    let description = "Failed to access the database";
    let possibleCause = "Check the DB status";

    /* pre-prepares the config structure in case we need to send request to get game stats
       from activision. */
    const config =
    {
        method: 'get',
        url: `${process.env.API_PREFIX}/extract/gameStatsById/${gameId}`,
        headers: {}
    };
    try {
        const match = await WarzoneGame.findById(gameId);
        if(!match) {
            // The case we dont have this match in our database.
            description = "Game search failed, please try again in a few moments";
            possibleCause = "check the gameID and the extract controller";
            const matchStats = await axios(config);
            description = "Failed attempt to save the data in the database";
            possibleCause = "Check the DB status";
            const newMatch = new WarzoneGame({
                _id : gameId,
                gameStats: matchStats.data.data,
                lastTouched : new Date().getTime()
            });
            await newMatch.save();
            console.log("New match object created in the database");
            res.status(200).json({ matchStats: matchStats.data.data });
        }
        else {
            // Someone searched for existing match, we will update the lastTouched and will return the stats.
            match.lastTouched = new Date().getTime();
            await match.save();
            console.log("Game details are in the database, we return them from there");
            res.status(200).json({ matchStats: match.gameStats });
        }
    }
    catch(err) {
        console.log("getMatch controller method failed!");
        try {
            const errorCode = error.response.status;
            res.status(errorCode).json(controllersUtils.errorDescriptionBuilder(errorCode, description, possibleCause));
            return;
        }
        catch(error) {
            res.status(500).json(controllersUtils.errorDescriptionBuilder(500, description, possibleCause));
        }
    };
};