const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { validationResult } = require('express-validator');
const HttpError = require('../models/http-error');
const User = require('../models/user');
const gameProfile = require('../models/warzoneUser');
const Squad = require('../models/warzoneSquad');

exports.signup = async (req, res, next) => {
    /* First we will check if we received errors from the route with the help of express-validator third party package */
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new HttpError('Invalid inputs passed, please check your data.', 422);
        return next(error);
    }
    req.body.username = req.body.username.toLowerCase();
    const { email, password, username, platform } = req.body;


    /* Check if there is already a existing user for this email address */
    let checkForExistingUser;
    try {
        checkForExistingUser = await User.findOne({ email: email });
    }
    catch (err) {
        console.log(err);
        const error = new HttpError(
            'Signing up failed, please try again later.',
            500
        );
        return next(error);
    }

    if (checkForExistingUser) {
        const error = new HttpError(
            'User exists already under this email, please login instead.',
            422
        );
        return next(error);
    }

    /* Try to create the new user after all the checks process are done and valid. */

    // I'm going to create hash value from the password in order to not expose the original passwords in case of a leak in the database ... 
    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 12);
    }
    catch (err) {
        const error = new HttpError('Failed to create a new user, please try again', 500);
        next(error);
    }

    /* 
        Now I'm going to check if someone already searched for this user in our site and if so i will use the existing game profile from the
        database, or create a new game profile if not found one in the database.
    */

    let existingProfile;
    try {
        existingProfile = await gameProfile.findOne({ username: username, platform: platform });
    }
    catch (err) {
        const error = new HttpError(
            'Signing up failed, please try again later.',
            500
        );
        console.log(err);
        return next(error);
    }

    /* The case we dont have existing profile in the database i will create a new one and save him */
    if (!existingProfile) {
        let newGameProfileID;
        try {
            const newGameProfileID = await createAndSaveNewGameProfile(username, platform);
            const createdUser = new User({
                email,
                password: hashedPassword,
                username,
                platform,
                gameProfile: newGameProfileID
            });
            await createdUser.save();
            const token = jwt.sign(
                { userID: createdUser.id, email: createdUser.email },
                process.env.JWT_SECRET,
                { expiresIn: '2h' }
            );
            console.log("New user just created in the site, and saved in the database.");
            res
                .status(201)
                .json({ userID: createdUser.id, gameProfileID: newGameProfileID, token: token });
            return;
        }
        catch (err) {
            console.log(err);
            let description = 'Signing up failed, please make sure that the username and platform are belongs to a public profile at activision website.';
            if (newGameProfileID) {  // The case we succeed to create a new game profile but fail to save him / create the jwt token.
                description = 'Signing up failed, please try again later.';
            }
            const error = new HttpError(description, 500);
            return next(error);
        }
    }
    /* The case we already have a game profile with the information that we received from the user */
    else {
        try {
            const createdUser = new User({
                email,
                password: hashedPassword,
                username,
                platform,
                gameProfile: existingProfile.id
            });
            await createdUser.save();
            const token = jwt.sign(
                { userID: createdUser.id, email: createdUser.email },
                process.env.JWT_SECRET,
                { expiresIn: '2h' }
            );
            console.log("New user in the site just created and saved in the database.");
            res
                .status(201)
                .json({ userID: createdUser.id, gameProfileID: existingProfile.id, token: token });
            return;

        }
        catch (err) {
            console.log(err);
            const error = new HttpError(
                'Signing up failed, please try again later.',
                500
            );
            return next(error);
        }

    }

};

const createAndSaveNewGameProfile = async (username, platform) => {
    /* 
    This method will get username and platform, and will use our api with request to the 'profile' route and will try to create a new profile.
    in case of successful creation, we will return the new profile ID to save him into the user's account, in case of failure, we will catch the
    error in the place this method was called.
    */
    const configForCreateUser =
    {
        method: 'get',
        url: `${process.env.API_PREFIX}/profile/username/${username}/platform/${platform}`,
        headers: {}
    };
    let createProfileResult;
    createProfileResult = await axios(configForCreateUser);
    return createProfileResult.data.profileID;
};

exports.login = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new HttpError('Invalid inputs passed, please check your data.', 422);
        return next(error);
    };

    const { email, password } = req.body;
    let existingUser;

    try {
        existingUser = await User.findOne({ email: email });
    }
    catch (err) {
        const error = new HttpError("Logging in failed, please try again later.", 500);
        return next(error);
    }

    if (!existingUser) {
        const error = new HttpError("Invalid credentials, could not log you in.", 403);
        return next(error);
    }

    let passwordIsValid = false;
    try {
        passwordIsValid = await bcrypt.compare(password, existingUser.password);
    }
    catch (err) {
        const error = new HttpError("Logging in failed, please check your credentials and try again.");
        return next(error);
    }

    if (!passwordIsValid) {
        const error = new HttpError("Invalid credentials, could not log you in.", 403);
        return next(error);
    }

    let token;
    try {
        token = jwt.sign(
            { userID: existingUser.id, email: existingUser.email },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );
    }
    catch (err) {
        const error = new HttpError("Logging in failed, please try again later.", 500);
        return next(error);
    }
    console.log("Login succeed!");
    res
        .status(200)
        .json({ userID: existingUser.id, gameProfileID: existingUser.gameProfile, token: token });
};

exports.addSquad = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new HttpError('Invalid inputs passed, please check your data.', 422);
        return next(error);
    }
    const { usernames, platforms, squadName } = req.body;

    /* Because of 'is-auth' middleware, the only users that will be allowed to use this service 
     * Are registered users, we extract from the jwt token the 'userID' and saved him the req. */
    const { userID } = req.userData;

    if (usernames.length != platforms.length) {
        const error = new HttpError('Invalid inputs passed, please check your data.', 422);
        return next(error);
    }
    if (!userID) {
        console.log("Failed to access the userID from after the 'is-auth' middleware.");
        const error = new HttpError('Access denied, please make sure you have logged in recently.', 401);
        return next(error);
    }

    let squadFound = false; // Boolean flag to indicate whether the protocol failed because of failure to create / find the squad in the database.
    try {
        const squadData = await axios(addSquadConfigBuilder(usernames, platforms));
        const squadID = squadData.data.squadID;
        squadFound = true;  // The case the squad created or found successfully.
        const currentUser = await User.findById(userID);
        /* After we extract the user and squad models, we need to check if the user is already have that squad in his list in the database. */
        const checkForExistingSquad = squadExists(currentUser, squadName, squadID);
        if (!checkForExistingSquad) {
            currentUser.squads.push({ squadID: squadID, squadName: squadName });
            await currentUser.save();
            return res.status(200).json({ squadList: currentUser.squads });
        }
        else {
            // The case the user already has that squad...
            let error;
            if (checkForExistingSquad.squadExists) {
                error = new HttpError(`You already have squad that contains those players, the squad name is: '${checkForExistingSquad.existingSquadName}' `, 422);
            }
            else {
                error = new HttpError(`You already have squad under this name please select different squad name.`, 422);
            }
            return next(error);
        }
    }
    catch (err) {
        let error;
        if (!squadFound) {
            // The case we didn't find or enable to create the squad.
            error = new HttpError("Creating a new squad failed, make sure all the users data is valid!", 500);
        }
        else {
            error = new HttpError("Creating a new squad failed, please try again later.", 500);
        }
        return next(error);
    }

};

const addSquadConfigBuilder = (usernames, platforms) => {
    // Will create a config for post request to the create squad service which will create a new squad in case the squad not exists, or will return the existing ones.
    const body = {
        usernames: usernames,
        platforms: platforms
    }
    return {
        method: 'post',
        url: `${process.env.API_PREFIX}/squad/create-squad`,
        headers: {},
        data: body
    };
};

const squadExists = (user, squadName, squadID) => {
    const result = {
        squadExists: false,
        squadNameExists: false,
        existingSquadName: ""
    };
    for (let i = 0; i < user.squads.length; i++) {
        if (user.squads[i].squadID === squadID) {
            result.squadExists = true;
            result.existingSquadName = user.squads[i].squadName;
            return result;
        }

        if (user.squads[i].squadName === squadName) {
            // If we already have a squad under this name we will tell the user he cant do that.
            result.squadNameExists = true;
            return result;
        };
    }
    return null;
};

exports.getUserData = async (req, res, next) => {
    /* This service will be available only for registered users, and will return summary of their stats 
     * Based on the saved data on the server. */

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const error = new HttpError('Invalid inputs passed, please check your data.', 422);
        return next(error);
    }

    /* Because of 'is-auth' middleware, the only users that will be allowed to use this service 
     * Are registered users, we extract from the jwt token the 'userID' and saved him the req. */
    const { userID } = req.userData;

    if (!userID) {
        // Rare case that should not occur because of the 'is-auth' middleware.
        console.log("Failed to access the userID from after the 'is-auth' middleware.");
        const error = new HttpError('Access denied, please make sure you have logged in recently.', 401);
        return next(error);
    }

    try {
        // First we find the user model in the database
        const currentUser = await User.findById(userID);
        const currentPlayerInGameProfile = await gameProfile.findById(currentUser.gameProfile);
        // After we found him we extract the wanted fields from the database model. 
        const gameProfileData = (({ username, platform, lastGamesStats, generalStats }) => ({ username, platform, lastGamesStats, generalStats }))(currentPlayerInGameProfile);
        // Now we will sort the user squads data in order to ease their use in the front side.
        const squadList = [];
        // First we check if the user there are registered squads
        if (currentUser.squads.length > 0) {
            // The case where the user have registered squads, we iterate through the embedded 'squads' array which contain the squads id's
            for (let i = 0; i < currentUser.squads.length; i++) {
                // Then we search for each squad object in the database and extract the wanted stats
                let squadObj = await Squad.findById(currentUser.squads[i].squadID);
                let squadSummary = getSquadSummaryStats(squadObj);
                if (squadSummary) {
                    // The case the squad have shared stats.
                    squadSummary['SquadName'] = currentUser.squads[i].squadName;
                    squadList.push(squadSummary);
                }
                else {
                    if(!squadObj) {
                        const error = new HttpError("Database issue! please contact us to solve this issue.", 500);
                        return next(error);
                    }
                    // Some squads does not have shared games stats because they did not play together since they registered in the website
                    squadList.push({ usernames: squadObj.usernames, platforms: squadObj.platforms, squadName: currentUser.squads[i].squadName});
                }
            }
        }
        return res.status(200).json({ userData: { gameProfile: gameProfileData, squadList: squadList } });
    }
    catch (err) {
        console.log(err);
        const error = new HttpError("Failed to access user data, please try again later.", 500);
        return next(error);
    }

};

const getSquadSummaryStats = (squadObj) => {
    /* This method will get squadObj which contains the the schema fields as they were defined in the database
     * And we will iterate on each player in the squad and will make summary for each stats for the entire squad,
     * With general information about the squad */

    if(!squadObj) return null; // Database failure!

    if (!squadObj.playersSharedGamesStats.length && !squadObj.sharedGamesGeneralStats.length) {
        // The case the squad does not have shared stats.
        return null;
    }
    const res = {};
    if (squadObj.playersSharedGamesStats.length > 0) {
        // Here we will summary some selected stats for the entire squad.
        getSquadSharedGamesStatsSummary(res, squadObj.playersSharedGamesStats);
    }
    if (squadObj.sharedGamesGeneralStats.length > 0) {
        // Here we will count the number of matches and will return them with the general stats of that matches
        getSquadGamesGeneralStatsSummary(res, squadObj);
    }
    // Lastly, we will add the usernames and platforms of that squad.
    res['usernames'] = squadObj.usernames;
    res['platforms'] = squadObj.platforms;
    return res;
};

const getSquadSharedGamesStatsSummary = (resultObj, playersSharedGamesStats) => {
    /* This method will get the array which contains the players objects with the shared games stats
     * And will return the summary of the selected stats, first we extract the values into array with the 'map'
     * method and then summaries the array values with reducer function. */
    resultObj['avgSquadKd'] = playersSharedGamesStats.map(i => i['kdRatio']).reduce((a, b) => a + b) / playersSharedGamesStats.length;
    resultObj['SquadKills'] = playersSharedGamesStats.map(i => i['kills']).reduce((a, b) => a + b);
    resultObj['SquadDeaths'] = playersSharedGamesStats.map(i => i['deaths']).reduce((a, b) => a + b);
    resultObj['SquadAssists'] = playersSharedGamesStats.map(i => i['assists']).reduce((a, b) => a + b);
    resultObj['SquadDamage'] = playersSharedGamesStats.map(i => i['damageDone']).reduce((a, b) => a + b);
};

const getSquadGamesGeneralStatsSummary = (resultObj, squadObj) => {
    // This method will return the number of the documented shared games in the database, and their general stats array.
    resultObj['numberOfMatches'] = squadObj.sharedGamesGeneralStats.length;
    resultObj['sharedGamesGeneralStats'] = squadObj.sharedGamesGeneralStats;
};