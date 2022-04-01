/******************************************************************************************************************
 * This route is responsible for retrieving concrete information about a game and storing it in a database,
 * in case we have an existing data about the game in the database we will return it.
 * We will extract the game information with the 'extractFromActivision' Route.
 * 
 * The way it will be implemented appears in the 'match.js' file inside 'controllers' folder.
****************************************************************************************************************** */

const express = require('express');

const router = express.Router();

const matchController = require('../controllers/match');

router.get('/:gameId', matchController.getMatch);


module.exports = router;