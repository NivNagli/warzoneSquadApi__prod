const warzoneProfile = require('../models/warzoneUser');
const squadUtils = require('../controllersUtils/squadUtils');
const HttpError = require('../models/http-error');
const MONGODB_ID_LENGTH = 24;
exports.updateSquadStats = (squad) => {
    try {
        return getSquadNewStats(squad);
    }
    catch (err) {
        throw err;
    }
};

const getSquadNewStats = async (squad) => {
    const playersGameProfiles = await getPlayersGameProfiles(squad.id);
    const updatedStats = getUpdatedStats(squad, playersGameProfiles);
    return updatedStats;
};

const getPlayersGameProfiles = async (squadID) => {
    // This method responsible for split the squad id into the players id's and according them we will return the players game profiles.
    try {
        const playersIdsArray = getPlayersProfilesIdsArray(squadID); // Split the squad id with regex syntax into the players id's.
        const playerProfilesSearchBarrier = await Promise.all(gameProfilesSearchRequestsBuilder(playersIdsArray)); // Request barrier for the profiles search.
        return playerProfilesSearchBarrier;
    }
    catch (err) {
        console.log("Error while try to find the players profiles according to the squadID, check if this squad exists in the database!");
        const error = new HttpError("Error while try to find the players profiles according to the squadID, check if this squad exists in the database!", 500);
        throw error;
    }
};

const getPlayersProfilesIdsArray = (squadID) => {
    // Split the squadID according to the mongodb object id length, because the squad id is made from the players id chained...
    return squadID.match(regexBuilderForIdSplit(MONGODB_ID_LENGTH));
};

const regexBuilderForIdSplit = (mongodbIdLength) => {
    // I made this generic regex expression builder in order to be able to change them in case the mongo team will change the length of the id's.
    const regexStringExpression = `.{1,${mongodbIdLength}}`;
    return new RegExp(regexStringExpression, 'g');
};


const gameProfilesSearchRequestsBuilder = (gameProfilesIdsArray) => {
    return gameProfilesIdsArray.map(gameProfileId => warzoneProfile.findById(gameProfileId));
};

const getUpdatedStats = (squad, playersGameProfiles) => {
    /* This method will will get the squad and the latest players game profiles, she will search for the shared games from the players game profiles
     * And will check if we found a new games that did not exists since the last time we create / update the squad stats.
     * In case there is a new shared game we will add their stats to the existing stats of the 'squad' object in the database.
     */
    try {
        // In order to find the latest shared stats we will use the same method we use when we first create the squad in order to find the shared stats.
        const latestSharedGamesStats = squadUtils.getSharedStats(playersGameProfiles);
        /* After we found the latest shared stats we will compare them with the old squad shared stats,
         * And in case we found that new shared games as been played since last time we create / update the stats we will return the specific new games. */
        const newSharedGamesGeneralStats = findNewSharedGames(squad.sharedGamesGeneralStats, latestSharedGamesStats.squadSharedGamesStats);
        if (newSharedGamesGeneralStats.length === 0) {  // The case we didn't found any new games we will stop here and return null.
            return null;
        };
        // If we here that means that a new games as been played, so we need to update for each player in the squad the stats according them.
        const playersStatsFromNewSharedGames = playersGameProfiles.map(playerProfile => getPlayerStatsFromNewSharedGames(playerProfile, newSharedGamesGeneralStats));
        // And also we need to update the general stats of the squad according the new games 
        const newPlayersSharedGamesStats = buildUpdatedStats(squad, playersStatsFromNewSharedGames);
        return {
            updatedPlayersSharedGamesStats: newPlayersSharedGamesStats,
            updatedSharedGamesGeneralStats: newSharedGamesGeneralStats.concat(squad.sharedGamesGeneralStats)
        }
    }
    catch (err) {
        console.log("Error while try filter the players stats in order to update the squad stats, the problem 99% caused because the logic in 'getUpdatedStats'.");
        const error = new HttpError("Update squad stats failed, check the logic within 'getUpdatedStats' method.", 500);
        throw error;
    }
};


const findNewSharedGames = (savedSharedGamesGeneralStats, newSharedGamesGeneralStats) => {
    // This method responsible for to make comparison between the saved shared stats to the latest shared stats.
    // In case we found new shared games we will return their general stats in order to use them to find the players stats from each new game.
    const newGames = [];
    newSharedGamesGeneralStats.forEach(generalGameStats => {
        if (new Date(generalGameStats.date).getTime() > new Date(savedSharedGamesGeneralStats[0].date).getTime()) {
            newGames.push(generalGameStats);
        }
        else {
            return newGames;
        }
    });
    return newGames;
};


const getPlayerStatsFromNewSharedGames = (playerProfile, newSharedGamesGeneralStats) => {
    /* This method responsible for to retrieve the player stats from the new shared games, we will do that with the games id's that we found earlier
     * When we checked if we do have a new games. and we will get the specific player stats with the player game profiles object. */
    const playerName = playerProfile.username.toLowerCase();  // In order to avoid mistypes.
    const playerNewGamesStats = playerNewStatsObjectBuilder(playerName);  // build the return object will look like that {playerName : {...stats}}
    const newSharedGamesIds = getNewSharedGamesIds(newSharedGamesGeneralStats);  // get the games id's from the new shared game objects.
    playerProfile.lastGamesStats.forEach(gameStats => {
        // Iterate on the lastGames stats in the player object and we will add the stats for the games that are in the 'shared games' id array.
        if (newSharedGamesIds.includes(gameStats.matchID)) {
            updatePlayerNewStats(playerNewGamesStats[playerName], gameStats);
        }
    });
    return playerNewGamesStats;
};

const playerNewStatsObjectBuilder = (playerName) => {
    return {
        [playerName] : {
            kills: 0,
            deaths: 0,
            assists: 0,
            damageDone: 0
        }
    }
};

const getNewSharedGamesIds = (newSharedGamesGeneralStats) => {
    return newSharedGamesGeneralStats.map(generalGameStats => generalGameStats.matchID);
};

const updatePlayerNewStats = (newStatsObj, newGameStats) => {
    newStatsObj.kills += newGameStats.kills;
    newStatsObj.deaths += newGameStats.deaths;
    newStatsObj.assists += newGameStats.assists;
    newStatsObj.damageDone += newGameStats.damageDone;
};

const buildUpdatedStats = (squad, playersStatsFromNewSharedGames) => {
    /* This method will get all the stats from the new games that we found and will make from them and from the old stats the new updated stats,
       We will make a deep copy array that contain the players stats from the database and we will edit them according to the new stats and eventually
       return the updated stats. */
    const playersSharedGamesStats = squad.playersSharedGamesStats.map(playerStatsObj => {return {...playerStatsObj}}); // Deep copy in order not to access the database object.
    playersSharedGamesStats.forEach(player => {
        const playerName = player.username.toLowerCase();
        playersStatsFromNewSharedGames.forEach(newStats => {
            if (newStats[playerName]) {
                player.kills += newStats[playerName].kills;
                player.deaths += newStats[playerName].deaths;
                player.assists += newStats[playerName].assists;
                player.damageDone += newStats[playerName].damageDone;
            };
        });
        if (player.deaths != 0) {
            player.kdRatio = player.kills / player.deaths;
        }
    });
    return playersSharedGamesStats;
};