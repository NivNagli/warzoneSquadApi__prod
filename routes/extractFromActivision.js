/******************************************************************************************************************
 * The role of this Route will be to use 'Pull' Route in order to extract the information in an orderly manner that 
 * suits us for use in the database, and to reduce irrelevant information that comes back from the original api.
 * The way it will be implemented appears in the 'extractFromActivision.js' file inside 'controllers' folder.
****************************************************************************************************************** */

const express = require('express');

const router = express.Router();

const extractController = require('../controllers/extractFromActivision');

router.get("/lastGamesStats/:platform/:username", extractController.getLastGamesArrayAndSummary);
router.get("/lastGamesStats/:platform/:username/:cycles", extractController.getLastGamesArrayByCycle);
router.get("/generalStats/:platform/:username", extractController.getLifetimeAndWeeklyStats);
router.get("/gameStatsById/:gameId", extractController.getGameStatsById);

module.exports = router;