/******************************************************************************************************************
 * This Route should be a kind of Decorator for the public API of activision to pull warzone stats about specific user/match,
 * I return the response as it comes back to us from the original api but I change the errors in order that I will not be dependent
 * on their errors code and descriptions because i want to know in which stage the error occurred to notify it and describe
 * the possible cause of the error.
 * 
 * The way it will be implemented appears in the 'pullFromActivision.js' file inside 'controllers' folder.
****************************************************************************************************************** */


const express = require('express');

const router = express.Router();

const pullController = require('../controllers/pullFromActivision');

router.get('/lastGamesData/:platform/:username', pullController.getPlayerLastGamesData);
router.get('/lastGamesData/:platform/:username/:utcDate', pullController.getPlayerLastGamesDataByDate);
router.get('/lifetimeData/:platform/:username', pullController.getPlayerLifetimeData);
router.get('/gameStats/:gameId', pullController.getGameData);

module.exports = router;