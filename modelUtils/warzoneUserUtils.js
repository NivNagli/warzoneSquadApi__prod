exports.updateUserStats = (user, userLastGamesStats) => {
    const possibleNewGamesArray = updateGamesArray(user, userLastGamesStats);
    console.log("Trying to update with new games.");
    if (!possibleNewGamesArray) {  
        console.log("Should not update");
        return;
    }
    const updatedLastGamesArray = possibleNewGamesArray.concat(user.lastGamesStats);
    console.log("Should be updated");
    if(updatedLastGamesArray.length > 100 ) {
        return updatedLastGamesArray.slice(0, 100);
    }
    return updatedLastGamesArray;
};


// userLastGamesStats need to be "gamesArray" from the axios request.
const updateGamesArray = (user, userLastGamesStats) => {
    const lastGameFromLastGamesSavedArray = user.lastGamesStats[0];
    lastSavedGameDateInUtc = new Date(lastGameFromLastGamesSavedArray.gameDate).getTime();
    if (new Date(userLastGamesStats.gamesArray[0].gameDate).getTime() === lastSavedGameDateInUtc) {
        return null;
    }
    const newGamesArray = findNewGames(lastSavedGameDateInUtc, userLastGamesStats.gamesArray);
    return newGamesArray;
};

const findNewGames = (lastSavedGameDateInUtc, newLastGamesArray) => {
    const result = [];
    newLastGamesArray.forEach((game) => {
        if (new Date(game.gameDate).getTime() > lastSavedGameDateInUtc) {
            result.push(game);
        }
        else {
            return result;
        }
    });
    return result;

};