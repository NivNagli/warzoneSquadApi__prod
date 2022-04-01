const expect = require('chai').expect;
const chai = require('chai');
const sinon = require('sinon');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
const User = require('../models/user');

const userController = require('../controllers/user');

describe('User Controller, make sure we dont have in the database user under the email address that we are testing on.', function () {

    const goodUserReq = {
        body: {
            "platform": 'psn',
            "username": 'mini_niv',
            "email": "Test123@gmail.com",
            "password": "Test1234"
        }
    };
    let createdUserID;

    const goodUserReq4AddSquad = {
        body : {
            "usernames" : ["mini_niv", "mp3il"],
            "platforms" : ["psn", "psn"]
        }
    };

    it('should return status 201 for "signup" method, in case that failed check if the user already exists in the database.', (done) => {
        const res = {
            statusCode: 0,
            userStatus: null,
            data: null,
            status: function (code) {
                this.statusCode = code;
                return this;
            },
            json: function (data) {
                res.data = data.data;
            }
        };
        userController.signup(goodUserReq, res, () => { }).then(() => {
            expect(res.statusCode).to.be.equal(201);
            done();
        });
    }).timeout(15000);

    it('should return status 200 for "login" method', (done) => {
        const res = {
            statusCode: 0,
            userStatus: null,
            status: function (code) {
                this.statusCode = code;
                return this;
            },
            json: function (data) {
                this.data = data;
            }
        };
        userController.login(goodUserReq, res, () => { }).then(() => {
            expect(res.statusCode).to.be.equal(200);
            createdUserID = res.data.userId;
            done();
        });
    }).timeout(10000);

    // it('should return status 200 for "addSquad" method', (done) => {
    //     const res = {
    //         statusCode: 0,
    //         userStatus: null,
    //         status: function (code) {
    //             this.statusCode = code;
    //             return this;
    //         },
    //         json: function (data) {
    //             this.lastGamesStats = data.data;
    //         }
    //     };
    //     goodUserReq4AddSquad.body.userID = createdUserID;
    //     userController.addSquad(goodUserReq4AddSquad, res, () => { }).then(() => {
    //         expect(res.statusCode).to.be.equal(200);
    //         done();
    //     });
    // }).timeout(10000);

    after(function (done) {
        User.deleteOne({ email: "Test123@gmail.com" })
            .then(() => {
                console.log("Delete the test user successfully completed.");
                done();
            })
    });
});
