const expect = require('chai').expect;
const chai = require('chai');
const sinon = require('sinon');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
const app = require('../app');
var request = require('supertest')

const matchController = require('../controllers/match');

describe('Match Controller', function () {

    const goodGameIdReq = {
        params: {
            "gameId": '16786187350052482478'
        }
    };


    const badGameIdReq = {
        params: {
            "gameId": '16786187350052482478a'
        }
    };


    it('should return status 200 for "getMatch" method', (done) => {
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
        matchController.getMatch(goodGameIdReq, res, () => { }).then(() => {
            expect(res.statusCode).to.be.equal(200);
            done();
        });
    }).timeout(10000);

    /*********** Requests that should not be successful due to incorrect information  ************/
    it('should return status 500 for "getMatch" method', (done) => {
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
        matchController.getMatch(badGameIdReq, res, () => { }).then(() => {
            expect(res.statusCode).to.be.equal(500);
            done();
        });
    }).timeout(5000);
});
