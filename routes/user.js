const express = require('express');
const { check } = require('express-validator');
const router = express.Router();
const userController = require('../controllers/user');
const isAuth = require('../middleware/is-auth');

router.post(
    '/signup',

    [
        check('email')
        .normalizeEmail()
        .isEmail(),

        check('password')
        .isLength({min : 5}),

        check('username')
        .isLength({min : 1}),

        check('platform')
        .isLength({min : 1})
    ],

    userController.signup
);

router.post(
    '/login',

    [
        check('email')
        .normalizeEmail()
        .isEmail(),

        check('password')
        .isLength({min : 5})
    ],

    userController.login
);
/* protected methods */
router.post(
    '/add-squad', isAuth,

    [
        check('usernames')
        .not()
        .isEmpty(),

        check('platforms')
        .not()
        .isEmpty(),
        
        check('squadName')
        .isLength({min : 1})
    ],

    userController.addSquad
);

router.get('/get-user-data', isAuth, userController.getUserData);

module.exports = router;