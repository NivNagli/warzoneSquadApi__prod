const HttpError = require('../models/http-error');

/*========================================== Shared game Stats Methods ==========================================*/
const createSharedGamesStats = (warzoneProfilesArray) => {
    try {
        const playersLastGamesStats = warzoneProfilesArray.map(warzoneProfile => warzoneProfile.lastGamesStats);
        return getSharedGamesStats(playersLastGamesStats);
    }
    catch (err) {
        console.log("Failed to create the all time stats for several profile [In 'createSharedGamesStats' at 'squadUtils.js'");
        // console.log(err);
        throw err;
    }
};

const getSharedGamesStats = (playersLastGamesStats) => {
    const result = {
        playersSharedGamesStats: [],
        squadSharedGamesStats: []
    };
    const sharedGamesIds = getSharedGamesIds(playersLastGamesStats);
    if (!sharedGamesIds || sharedGamesIds.length === 0) {
        console.log("No shared games found.");
        return result;
    }
    initPlayersSharedGamesStats(result, playersLastGamesStats);
    sharedGamesIds.forEach(gameId => {
        const squadGeneralStatsFromSharedGame = initSquadGeneralStatsFromSharedGame(gameId);
        let generalSquadStatsFlag = false; // will use this flag to indicate whether the placement, mode and date have been updated.
        playersLastGamesStats.forEach((playerLastGameStats, index) => {
            const playerSharedGamesStats = result.playersSharedGamesStats[index];
            playerLastGameStats.forEach(game => {
                if (game.matchID === gameId) {
                    if (!generalSquadStatsFlag) {
                        generalSquadStatsFlag = true;
                        updateGeneralSharedSquadStats(squadGeneralStatsFromSharedGame, game);
                    }
                    updateSharedStatsByGame(squadGeneralStatsFromSharedGame, playerSharedGamesStats, game);
                }
            });
            if(playerSharedGamesStats.deaths != 0) {
                playerSharedGamesStats.kdRatio = playerSharedGamesStats.kills / playerSharedGamesStats.deaths;
                playerSharedGamesStats.kdRatio = parseFloat(playerSharedGamesStats.kdRatio.toFixed(2));
            }
        });
        squadGeneralStatsFromSharedGame.avgScorePerMinute = squadGeneralStatsFromSharedGame.avgScorePerMinute / playersLastGamesStats.length;
        result.squadSharedGamesStats.push(squadGeneralStatsFromSharedGame);
    });
    return result;
};

const getSharedGamesIds = (playersLastGamesStats) => {
    const allPlayersGamesIdsArrays = [];
    playersLastGamesStats.forEach(playerLastGameStats => allPlayersGamesIdsArrays.push(getAllPlayerGamesIdsArray(playerLastGameStats)));
    return allPlayersGamesIdsArrays.reduce((a, b) => a.filter(c => b.includes(c)));
};

const getAllPlayerGamesIdsArray = (playerLastGamesStats) => {
    const res = [];
    playerLastGamesStats.forEach(gameStatsObject => res.push(gameStatsObject.matchID));
    return res;
};

const initPlayersSharedGamesStats = (result, playersLastGamesStats) => {
    playersLastGamesStats.forEach(playerLastGameStats => {
        result.playersSharedGamesStats.push(
            {
                username: playerLastGameStats[0].username,
                kills: 0,
                deaths: 0,
                assists: 0,
                damageDone: 0
            }
        );
    });
};

const initSquadGeneralStatsFromSharedGame = (gameId) => {
    return {
        matchID: gameId,
        kills: 0,
        deaths: 0,
        placement: 0,
        avgScorePerMinute: 0,
        mode: 0,
        date: 0
    };
};

const updateGeneralSharedSquadStats = (squadGeneralStatsFromSharedGame, sharedGame) => {
    squadGeneralStatsFromSharedGame.placement = sharedGame.teamPlacement;
    squadGeneralStatsFromSharedGame.mode = sharedGame.mode;
    squadGeneralStatsFromSharedGame.date = sharedGame.gameDate;
};

const updateSharedStatsByGame = (squadGeneralStatsFromSharedGame, playerSharedGamesStats, sharedGame) => {
    squadGeneralStatsFromSharedGame.kills += sharedGame.kills;
    squadGeneralStatsFromSharedGame.deaths += sharedGame.deaths;
    squadGeneralStatsFromSharedGame.avgScorePerMinute += sharedGame.scorePerMinute;
    playerSharedGamesStats.kills += sharedGame.kills;
    playerSharedGamesStats.deaths += sharedGame.deaths;
    playerSharedGamesStats.assists += sharedGame.assists;
    playerSharedGamesStats.damageDone += sharedGame.damageDone;
};

exports.getSharedStats = createSharedGamesStats;
/*=============================================================================================================*/

const getAllGamesStats = (warzoneProfilesArray) => {
    const result = [];
    try {
        warzoneProfilesArray.forEach((warzoneProfile) => {
            let playerAllTimeStats = { ...warzoneProfile.generalStats.br_lifetime_data };
            playerAllTimeStats.username = warzoneProfile.lastGamesStats[0].username;
            result.push(playerAllTimeStats)
        });
        return result;
    }
    catch (err) {
        console.log("Failed to create the all time stats for several profile [In 'getAllGamesStats' at 'squadUtils.js'");
        // console.log(err);
        throw err;
    }
};

exports.getPlayersLifetimeStats = getAllGamesStats;