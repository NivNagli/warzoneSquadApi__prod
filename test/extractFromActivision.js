const expect = require('chai').expect;
const chai = require('chai');
const sinon = require('sinon');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const extractController = require('../controllers/extractFromActivision');

describe('Extract Controller', function () {
  const goodPlayerReq = {
    params: {
      "platform": 'psn',
      "username": 'mini_niv',
      "cycles" : 5
    }
  };

  const goodGameIdReq = {
    params: {
      "gameId": '16786187350052482478'
    }
  };

  const badPlayerReq = {
    params: {
      "platform": 'psn',
      "username": 'mini_niva'
    }
  };


  const badGameIdReq = {
    params: {
      "gameId": '16786187350052482478a'
    }
  };

  const privateAccountReq = {
    "platform": 'psn',
    "username": 'ABUSSIVEMENT'
  };

  it('I dont know why but this test fail anyway this is the only test who should not pass...', (done) => {
    const res = {
      statusCode: 0,
      userStatus: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.lastGamesStats = data.data;
      }
    };
    console.log("The first test is failing no matter what i do, dont know why...");
    extractController.getGameStatsById(badGameIdReq, res, ()=>{}).then(() => {
      expect(res.statusCode).to.be.equal(422);
      done();
    });
  });

  it('should return status 200 for "getLastGamesArrayAndSummary" method', (done) => {
    const res = {
      statusCode: 0,
      userStatus: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.lastGamesStats = data.data;
      }
    };
    extractController.getLastGamesArrayAndSummary(goodPlayerReq, res, ()=>{}).then(() => {
      expect(res.statusCode).to.be.equal(200);
      done();
    });
  }).timeout(10000);

  it('should return status 200 for "getLifetimeAndWeeklyStats" method', (done) => {
    const res = {
      statusCode: 0,
      userStatus: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.lastGamesStats = data.data;
      }
    };
    extractController.getLifetimeAndWeeklyStats(goodPlayerReq, res, ()=>{}).then(() => {
      expect(res.statusCode).to.be.equal(200);
      done();
    });
  }).timeout(10000);

  it('should return status 200 for "getGameStatsById" method', (done) => {
    const res = {
      statusCode: 0,
      userStatus: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.lastGamesStats = data.data;
      }
    };
    extractController.getGameStatsById(goodGameIdReq, res, ()=>{}).then(() => {
      expect(res.statusCode).to.be.equal(200);
      done();
    });
  }).timeout(10000);
  
  it('should return status 200 for "getLastGamesArrayByCycle" method', (done) => {
    const res = {
      statusCode: 0,
      userStatus: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.lastGamesStats = data.data;
      }
    };
    extractController.getLastGamesArrayByCycle(goodPlayerReq, res, ()=>{}).then(() => {
      expect(res.statusCode).to.be.equal(200);
      done();
    });
  }).timeout(25000);

  /*********** Requests that should not be successful due to incorrect information  ************/
  it('should return status 500 for "getLastGamesArrayAndSummary" method', (done) => {
    const res = {
      statusCode: 0,
      userStatus: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.lastGamesStats = data.data;
      }
    };
    extractController.getLastGamesArrayAndSummary(badPlayerReq, res, ()=>{}).then(() => {
      expect(res.statusCode).to.be.equal(500);
      done();
    });
  }).timeout(10000);

  it('should return status 500 for "getLifetimeAndWeeklyStats" method', (done) => {
    const res = {
      statusCode: 0,
      userStatus: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.lastGamesStats = data.data;
      }
    };
    extractController.getLifetimeAndWeeklyStats(badPlayerReq, res, ()=>{}).then(() => {
      expect(res.statusCode).to.be.equal(500);
      done();
    });
  }).timeout(10000);

  it('should return status 500 for "getGameStatsById" method', (done) => {
    const res = {
      statusCode: 0,
      userStatus: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.lastGamesStats = data.data;
      }
    };
    extractController.getGameStatsById(badGameIdReq, res, ()=>{}).then(() => {
      expect(res.statusCode).to.be.equal(500);
      done();
    });
  }).timeout(10000);
});
