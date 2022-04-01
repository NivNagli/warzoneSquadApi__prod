/***************************************************************************************************************
 * This file will contain methods that will receive the information that return from the 'pullFromActivision.js' request methods
 * And they will take care of arranging and sorting the information for the response that the client side will receive from
 * the 'extractFromActivision.js' methods.
 * 
 * I decided to implement these methods in a separate file in order not to overload the logic of the file 'extractFromActivision.js'.
 *********************************************************************************************************************/

exports.arrangeSpecificGameStats = (resData) => {
    /*******
     * This method will get the response that the Activision server sends back to us for information about 
     * a specific game, and it will return the relevant information about the players according to their teams 
     * sorted by the place they finished the game
    */
    try {
        let dataExists = resData.data.data.allPlayers;

    }
    catch (err) {
        throw new Error(`Error while trying access specific game information: In 'arrangeSpecificGameStats' method \n 
        ${err}`);
    }
    const allPlayers = resData.data.data.allPlayers;
    return arrangeGameStatsByTeams(allPlayers);
};

const arrangeGameStatsByTeams = (allPlayersStats) => {
    /*
    This method will return for us array of objects that will contain information about each team from the game data,
    First we create a map where each member represents a team in the game each element value 
    is an array with the information about the players of that team.
    After the division into teams, I take care of returning only the arrays of the players according to the teams, 
    so that we can sort them according to the position they finished in the game before we return the result.
    */


    /* Create a map where each key is a team name and its value is the data of each player 
    on the team in the same game */
    const teamsMap = arrangePlayersStatsByTeams(allPlayersStats);

    /* Create an array from the map, each object is an array with the information about the 
    players when the player with the most kills appears first in the array */
    const teamsUnsortedArray = sortTeamsMapByKillsAndReturnTeamsByArray(teamsMap);

    /* Sort the teams in the array according to their position at the end of the game */
    return sortTeamsArrayByPlacement(teamsUnsortedArray);

};

const arrangePlayersStatsByTeams = (allPlayersStats) => {
    /******************************************************************************************************************
     * In this method we will arrange 'team' object that each key inside him represent a team in the game by their team name,
     * And each value in that 'team' map will be array that contain data about the team members.
     ****************************************************************************************************************** */
    const teams = {};
    allPlayersStats.forEach(playerStats => {
        if (!teams[playerStats.player.team]) {
            teams[playerStats.player.team] = [getRelevantPlayerStatsForMatchDisplay(playerStats)];
        }
        else {
            teams[playerStats.player.team].push(getRelevantPlayerStatsForMatchDisplay(playerStats));
        }
    });
    return teams;
};

const sortTeamsMapByKillsAndReturnTeamsByArray = (teams) => {
    /******************************************************************************************************************
     * We will iterate over the teams and will sort the team players by kills and will return all the sorted team in array.
     ****************************************************************************************************************** */
    const result = [];
    for (teamName in teams) {
        // getting the players stats array and we sort the players inside each array according to the number of kills.
        result.push(teams[teamName].sort((playerA, playerB) => { return playerB.kills - playerA.kills }));
    }
    return result;
};

const sortTeamsArrayByPlacement = (teamsArray) => {
    /******************************************************************************************************************
     * We will sort the teams array by placement and will return him sorted.
     ****************************************************************************************************************** */
    return teamsArray.sort((elemA, elemB) => { return elemA[0].teamPlacement - elemB[0].teamPlacement });
};

const getRelevantPlayerStatsForMatchDisplay = (allPlayerStats) => {
    /* Side method which will help to chose the relevant data */
    const result = allPlayerStats.playerStats;
    result["matchID"] = allPlayerStats.matchID;
    result["mode"] = allPlayerStats.mode;
    result["team"] = allPlayerStats.player.team;
    result["username"] = allPlayerStats.player.username;
    result["gameDate"] = timeConverter(allPlayerStats.utcStartSeconds);
    return result;
};


/* ================================================================================================= */

/******************************************************************************************************************************** 
 * The next method's will be responsible for organizing the information that comes back to us from
 * 'getPlayerLastGamesData' method from the 'pullFromActivision' file that return for us the stats
 * about the player last 20 games.
 * 
 * We are not going to return all the information that came back to us from the request 
 * we will return concise information for each of the games, 
 * in case the user wants to get exact details we will perform a specific search for the game
 * with the 'getGameStatsById' method from the 'extractFromActivision.js' file.
********************************************************************************************************************************/

exports.arrangeLastGamesStats = (resData) => {
    try {
        let dataExists = resData.data.data.data.summary;
    }
    catch (err) {
        throw new Error(`Error while trying access last 20 games information : in 'arrangeLastGamesStats'\n ${err}`);
    }
    const summaryStats = resData.data.data.data.summary;  // we will sort him in the return object.
    const gamesArray = filterGamesArray(resData.data.data.data.matches);
    return { "gamesArray": gamesArray, "summaryStats": filterSummaries(summaryStats) };
};

exports.arrangeLastGamesStatsWithoutSummaries = (resData) => {
    try {
        let dataExists = resData.data.data.data.summary;
    }
    catch (err) {
        throw new Error(`Error while trying access last 20 games information : in 'arrangeLastGamesStatsWithoutSummaries'\n ${err}`);
    }
    const gamesArray = filterGamesArray(resData.data.data.data.matches);
    return gamesArray;
};

const filterGamesArray = (gamesArray) => {
    const result = [];
    gamesArray.forEach(gameData => { result.push(getRelevantPlayerStatsForGeneralDisplay(gameData)) });
    return result;
};

const getRelevantPlayerStatsForGeneralDisplay = (allPlayerStats) => {
    /* Side method which will help to chose the relevant data, i chose to cut some stats because if the
       player will want the full stats about the game he can search for the specific game and there he will get 
       the full stats.
    */
    const result = {};
    result["matchID"] = allPlayerStats.matchID;
    result["teamPlacement"] = allPlayerStats.playerStats.teamPlacement;
    result["mode"] = allPlayerStats.mode;
    result["team"] = allPlayerStats.player.team;
    result["username"] = allPlayerStats.player.username;
    result["gameDate"] = timeConverter(allPlayerStats.utcStartSeconds);
    result["kills"] = allPlayerStats.playerStats.kills;
    result["kdRatio"] = allPlayerStats.playerStats.kdRatio;
    result["damageDone"] = allPlayerStats.playerStats.damageDone;
    result["assists"] = allPlayerStats.playerStats.assists;
    result["scorePerMinute"] = allPlayerStats.playerStats.scorePerMinute;
    result["deaths"] = allPlayerStats.playerStats.deaths;
    return result;
};

const filterSummaries = (summaryStats) => {
    const tempResult = [];
    /* first i create array of objects, each object key name is the mode and his value is the
       summary of the last games of the last 20 games from that mode.
       afterwards i will use the spread operator to merge all those objects into one object. */ 
    for (summaryData in summaryStats) {
        tempResult.push(getRelevantPlayerStatsForGeneralSummaryDisplay(summaryStats[summaryData], summaryData))
    }
    const finalResult = Object.assign(...tempResult);
    return finalResult;
};

const getRelevantPlayerStatsForGeneralSummaryDisplay = (summaryStats, modeName) => {
    /* Side method which will help to chose the relevant data.
       I Chose those fields because i want them to the 'relevant' stats that return from the
       'getRelevantPlayerStatsForGeneralDisplay' method, i took also the 'deaths' field because when we will update
       the stats after receiving more games to the db i will calculate the 'kdRatio' according to the kills/deaths.
    */
    // !!! important !!! i used [modeName] and not modeName because only with the brackets i can get the name as string for use him as a key */
    const result = {[modeName] : {}};
    // result[modeName]["mode"] = modeName; TODO: Delete if dont need this anymore.
    result[modeName]["kills"] = summaryStats.kills;
    result[modeName]["deaths"] = summaryStats.deaths;
    result[modeName]["damageDone"] = summaryStats.damageDone;
    result[modeName]["assists"] = summaryStats.assists;
    result[modeName]["kdRatio"] = summaryStats.kdRatio;
    return result;
};



const timeConverter = (UNIX_timestamp) => {
    /******************************************************************************************************************
     * This method will receive the timestamp of the game date and in milliseconds and will convert him into 'Date' object.
     ****************************************************************************************************************** */
    var a = new Date(UNIX_timestamp * 1000);
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time = date + ' ' + month + ', ' + year + ' ' + hour + ':' + min + ':' + sec;
    return time;
}

/******************************************************************************************************************************** 
 * The next method's will be responsible for organizing the information that comes back to us from
 * 'getPlayerLifetimeData' method from the 'pullFromActivision' file that return for us the weekly
 * and lifetime stats about the player.
 * I am going to make a separation in the weekly data between the data of the competitive modes 
 * [Solo, Duos, Trios, Quads] and all the other modes, 
 * so that the competitive players will get their exact details.
********************************************************************************************************************************/

exports.arrangeWeeklyAndLifetimeStats = (resData) => {
    try {
        let dataExists = resData.data.data.data.lifetime.mode.br.properties;
    }
    catch (err) {
        throw new Error(`Error while trying access last 20 games information : in 'arrangeLastGamesStats'\n ${err}`);
    }
    if (!resData.data.data.data.weekly) {
        return { "br_lifetime_data": resData.data.data.data.lifetime.mode.br.properties, "weeklyStats": null };
    }
    return { "br_lifetime_data": resData.data.data.data.lifetime.mode.br.properties, "weeklyStats": separateWeeklyStats(resData.data.data.data.weekly) };
};

const separateWeeklyStats = (allWeeklyStats) => {
    const result = separateWeeklyStatsByModes(allWeeklyStats.mode);
    return result;
};

const separateWeeklyStatsByModes = (allWeeklyStatsModes) => {
    /******************************************************************************************************************
    * This method will iterate over the weekly summaries that we get from from activision and we will make
    * separate between the competitive modes to the non competitive modes.
    ****************************************************************************************************************** */

    const competitiveModesStats = [];
    const nonCompetitiveModesStats = [];
    let allStats;
    for (const gameModeStatsKeyName in allWeeklyStatsModes) {
        if (isCompetitiveMode(gameModeStatsKeyName)) {
            var weeklySummary = allWeeklyStatsModes[gameModeStatsKeyName].properties;
            weeklySummary["mode"] = gameModeStatsKeyName;
            competitiveModesStats.push(weeklySummary);
        }
        else {
            if (gameModeStatsKeyName === "br_all") {
                allStats = allWeeklyStatsModes[gameModeStatsKeyName].properties;
                allStats["mode"] = "br_all";
            }
            else {
                var weeklySummary = allWeeklyStatsModes[gameModeStatsKeyName].properties;
                weeklySummary["mode"] = gameModeStatsKeyName;
                nonCompetitiveModesStats.push(weeklySummary);
            }
        }
    }
    return {
        "competitiveModesStats": competitiveModesStats,
        "nonCompetitiveModesStats": nonCompetitiveModesStats,
        "all": allStats
    };
};

const isCompetitiveMode = (modeName) => {
    const competitiveModes = ["br_brsolo", "br_brduos", "br_brtrios", "br_brquads",
    "br_vg_royale_solo", "br_vg_royale_duos", "br_vg_royale_trios", "br_vg_royale_quads",
    "br_br_solo", "br_br_duos", "br_br_trios", "br_br_quads"];
    return competitiveModes.includes(modeName);
};