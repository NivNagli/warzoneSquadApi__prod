const expect = require('chai').expect;
const chai = require('chai');
const sinon = require('sinon');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
const Squad = require('../models/warzoneSquad');

const squadController = require('../controllers/squad');

let tempSquadID = 0;
describe('Squad Controller: Make sure we dont have that squad in the database because the return code will be different!', function () {

    const goodUserReq = {
        body: {
            "platforms": ["psn", "psn"],
            "usernames": ['mini_niv', 'mp3il'],
        }
    };

    it('should return status 201 for "createSquad" method, in case that failed check if the squad already exists in the database.', (done) => {
        const res = {
            statusCode: 0,
            userStatus: null,
            data: null,
            status: function (code) {
                this.statusCode = code;
                return this;
            },
            json: function (data) {
                this.data = data;
            }
        };
        squadController.createSquad(goodUserReq, res, () => { }).then(() => {
            expect(res.statusCode).to.be.equal(201);
            tempSquadID = res.data.squadID;
            done();
        });
    }).timeout(25000);

    /*********** Requests that should not be successful due to incorrect information  ************/
    it('should return status 200 for "compare" method', (done) => {
        const res = {
            statusCode: 0,
            userStatus: null,
            status: function (code) {
                this.statusCode = code;
                return this;
            },
            json: function (data) {
                this.lastGamesStats = data.data;
            }
        };
        squadController.comparePlayers(goodUserReq, res, () => { }).then(() => {
            expect(res.statusCode).to.be.equal(200);
            done();
        });
    }).timeout(2000);

    after(function (done) {
        Squad.deleteOne({_id : tempSquadID})
            .then(() => {
                console.log("Delete the test squad successfully completed.");
                done();
            })
    });
});
