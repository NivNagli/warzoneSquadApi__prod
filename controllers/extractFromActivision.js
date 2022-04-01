const axios = require('axios');
const { errorMonitor } = require('events');
const extractHandler = require('./extractHandler');

/************************************************************************************************************************************************************************
 * Extract controller will serve us to break down the information we received from the 'pull.js' controller,
 * This controller is not necessary for use in order to use the API. It was created in order to facilitate the work of extracting the information.
 * 
 * I have created some try & catch blocks here so that if I have a problem I will be able to characterize the error in the best way possible, 
 * for each method that can throw an exception we will try to characterize the thrown exception before we return the response.
 * 
 * I have documented the logic of the first method which will be very similar to the other methods, so I will not fully document the rest methods here.
 ************************************************************************************************************************************************************************/

exports.getLastGamesArrayAndSummary = async (req, res, next) => {
    /****************************************************************************************************************************************************************
     * This method will get the username and platform from the request params and first will try to pull the information about the last 20 game of the user with the
     * 'pullFromActivision' route, in case we successfully pull the information we will try to arrange the data with the 'extractHandler' 'arrangeLastGamesStats' method
     * in order to reduce the information from the original response from activision
     * 
     * After we arranged the data we will return the reduced data.
     ****************************************************************************************************************************************************************/
    const platform = req.params.platform;
    const username = req.params.username;
    const config = {
        method: 'get',
        url: `${process.env.API_PREFIX}/pull/lastGamesData/${platform}/${username}`,
        headers: {}
    };
    /* First try block is responsible for send the request to our 'pullFromActivision' route */
    try {
        response = await axios(config);
        /* In case the request was successful the second try block is responsible for arrange the response */
        try {
            console.log("Player Last Games Array Extract Succeeded!");
            const lastGamesStatsAfterFilter = extractHandler.arrangeLastGamesStats(response);
            res.status(200).json({ data: lastGamesStatsAfterFilter });
            return;
        }
        catch (err) {
            console.log(err);
            console.log("Player Last Games Array Filter Protocol Failed!");
            const errorCode = 502;
            const description = "Last Games Array Filter Protocol Failed";
            const possibleCause = "Invalid Response Data || private account || Possible changes in activision api that harmed the actions of the filter";
            res.status(errorCode).json(errorDescriptionBuilder(errorCode, description, possibleCause));
            return;
        }
    }

    catch (error) {
        console.log("Player Last Games Array Extract Failed!");
        let errorCode = 500;
        if (error.response) {
            errorCode = error.response.status;
        }
        const description = "Last Games Array Extract 'get' Request Failed";
        const possibleCause = "Invalid username / platform || private account ||  Possible malfunction in the pull service";
        res.status(errorCode).json(errorDescriptionBuilder(errorCode, description, possibleCause));
        return;
    }
};

exports.getLifetimeAndWeeklyStats = async (req, res, next) => {
    const platform = req.params.platform;
    const username = req.params.username;

    const config = {
        method: 'get',
        url: `${process.env.API_PREFIX}/pull/lifetimeData/${platform}/${username}`,
        headers: {}
    };

    try {
        response = await axios(config);
        console.log("Player Lifetime & Weekly Stats Extract Succeeded!");
        res.status(200).json({ data: extractHandler.arrangeWeeklyAndLifetimeStats(response) });
        return;
    }

    catch (error) {
        console.log("Player Lifetime & Weekly Stats Extract Failed!");
        let errorCode = 500;
        if (error.response) {
            errorCode = error.response.status;
        }
        const description = "Lifetime & Weekly Stats Extract 'get' Request Failed";
        const possibleCause = "Invalid username / platform || private account || Possible malfunction in the pull service";
        if (error.response) {
            res.status(errorCode).json(errorDescriptionBuilder(errorCode, description, possibleCause));
            return;
        }
        res.status(500).json(errorDescriptionBuilder(500, description, possibleCause));
        return;
    }
};

exports.getGameStatsById = async (req, res, next) => {
    const gameId = req.params.gameId;

    const config = {
        method: 'get',
        url: `${process.env.API_PREFIX}/pull/gameStats/${gameId}`,
        headers: {}
    };

    try {
        response = await axios(config);
        console.log("Players Array From Specific Game Extract by ID Succeeded!");
        try {
            const gameStatsAfterFilter = extractHandler.arrangeSpecificGameStats(response.data);
            res.status(200).json({ data: gameStatsAfterFilter });
            return;
        }
        catch (err) {
            const errorCode = 502;
            const description = "Game stats filter Failed, for specific game extract.";
            const possibleCause = "Invalid Response Data || Possible changes in activision api that harmed the actions of the filter";
            res.status(errorCode).json(errorDescriptionBuilder(errorCode, description, possibleCause));
            return;
        }
    }

    catch (error) {
        console.log("Players Array From Specific Game Extract by ID Failed!");
        let errorCode = 500;
        if (error.response) {
            errorCode = error.response.status;
        }
        const description = "Players Array From Specific Game Extract by ID 'get' Request Failed";
        const possibleCause = "Invalid gameID || Possible malfunction in the pull service";
        res.status(errorCode).json(errorDescriptionBuilder(errorCode, description, possibleCause));
        return;
    }
};


exports.getLastGamesArrayByCycle = async (req, res, next) => {
    /****************************************************************************************************************************************************************
     * This method will return to us the array of the last games in cycles of 20 games, 
     * i.e. if we got 2 cycles we will return the last 40 games of the player.
     * 
     * I could narrow down the code here but due to time constraints I leave it as it is, the logic is very similar to 
     * the method above but this time we do not refer to the information that comes back to us from the game summary.
     * the result of this method is an array of concise information for the latest (20 * cycle) games.
     ****************************************************************************************************************************************************************/
    const platform = req.params.platform;
    const username = req.params.username;
    let cycle = parseInt(req.params.cycles);  // from each cycle we will pull 20 games, for example 3 cycles === 60 matches.
    if (cycle <= 0 || !(cycle > 0)) {
        console.log("Invalid number of cycles received at 'getLastGamesArrayByCycle'!");
        const errorCode = 502;
        const description = "Invalid number of cycles";
        const possibleCause = "Invalid number of cycles";
        res.status(errorCode).json(errorDescriptionBuilder(errorCode, description, possibleCause));
        return;
    }
    const gamesArray = [];
    const firstCycleConfig = {
        method: 'get',
        url: `${process.env.API_PREFIX}/pull/lastGamesData/${platform}/${username}`,
        headers: {}
    };
    const buildCycleConfig = (lastGameDate) => {
        return {
            method: 'get',
            url: `${process.env.API_PREFIX}/pull/lastGamesData/${platform}/${username}/${new Date(lastGameDate).getTime()}`,
            headers: {}
        };
    };
    let lastGameDate;
    // I create the 2 'reTry' variables because the public API from activision sometime collapse, so in order to avoid from the user to re search we re try to send another request to api.
    let reTryForTheInitSearch = 5;
    let reTryForTheAdvancedSearch = 2;
    while (cycle > 0) {
        if (cycle === parseInt(req.params.cycles)) {
            try {
                response = await axios(firstCycleConfig);
                /* In case the request was successful the second try block is responsible for arrange the response */
                try {
                    const lastGamesStatsAfterFilter = extractHandler.arrangeLastGamesStatsWithoutSummaries(response);
                    gamesArray.push(...lastGamesStatsAfterFilter);
                    lastGameDate = gamesArray[gamesArray.length - 1].gameDate;
                    cycle--;
                }
                catch (err) {
                    console.log("Player Last Games Array Filter Protocol Failed! at 'getLastGamesArrayByCycle'.");
                    const errorCode = 502;
                    const description = "Last Games Array Filter Protocol Failed";
                    const possibleCause = "Invalid Response Data || private account || Possible changes in activision api that harmed the actions of the filter";
                    res.status(errorCode).json(errorDescriptionBuilder(errorCode, description, possibleCause));
                    return;
                }
            }

            catch (error) {
                if (reTryForTheInitSearch--) {
                    console.log(`Init search num ${reTryForTheInitSearch + 1} for 'getLastGamesArrayByCycle failed, we try again.'`)
                }
                else {
                    console.log("Player Last Games Array Extract Failed! at 'getLastGamesArrayByCycle'.");
                    let errorCode = 500;
                    if (error.response) {
                        errorCode = error.response.status;
                    }
                    const description = "Last Games Array Extract 'get' Request Failed";
                    const possibleCause = "Invalid username / platform || private account ||  Possible malfunction in the pull service";
                    res.status(errorCode).json(errorDescriptionBuilder(errorCode, description, possibleCause));
                    return;
                }
            }
        }
        else {
            try {
                let newConfig = buildCycleConfig(lastGameDate);
                response = await axios(newConfig);
                /* In case the request was successful the second try block is responsible for arrange the response */
                try {
                    const lastGamesStatsAfterFilter = extractHandler.arrangeLastGamesStatsWithoutSummaries(response);
                    gamesArray.push(...lastGamesStatsAfterFilter);
                    lastGameDate = gamesArray[gamesArray.length - 1].gameDate;
                    cycle--;
                    reTryForTheAdvancedSearch++;
                }
                catch (err) {
                    console.log("Player Last Games Array Filter Protocol Failed! at 'getLastGamesArrayByCycle'.");
                    const errorCode = 502;
                    const description = "Last Games Array Filter Protocol Failed";
                    const possibleCause = "Invalid Response Data || private account || Possible changes in activision api that harmed the actions of the filter";
                    res.status(errorCode).json(errorDescriptionBuilder(errorCode, description, possibleCause));
                    return;
                }
            }

            catch (error) {
                if (reTryForTheAdvancedSearch--) {
                    console.log(`Advanced search num ${reTryForTheAdvancedSearch + 1} for 'getLastGamesArrayByCycle failed, we try again.'`)
                }
                else {
                    // TODO: Aggressive patch for handling error that cause from the activision api, in case of weird errors that can be the root of them.
                    console.log("Aggressive patch execute, need to check for possible trailing errors!");
                    res.status(200).json({ data: { "gamesArray": gamesArray } });
                    return;
                    console.log("Player Last Games Array Extract Failed! at 'getLastGamesArrayByCycle'.");
                    let errorCode = 500;
                    if (error.response) {
                        errorCode = error.response.status;
                    }
                    const description = "Last Games Array Extract 'get' Request Failed";
                    const possibleCause = "Invalid username / platform || private account ||  Possible malfunction in the pull service";
                    res.status(errorCode).json(errorDescriptionBuilder(errorCode, description, possibleCause));
                    return;
                }
            }
        }
    }
    /* Success case: where we were able to complete all the cycles for the data extractions. */
    res.status(200).json({ data: { "gamesArray": gamesArray } });
    return;
};


const errorDescriptionBuilder = (errorCode, description, possibleCause) => {
    const errorDescription = {};
    errorDescription["message"] = description;
    errorDescription["name"] = "Error";
    errorDescription["possibleCause"] = possibleCause;
    errorDescription["originalMessage"] = `Request failed with status code ${errorCode}`;
    return errorDescription;
};

