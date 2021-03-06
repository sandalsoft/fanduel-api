"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const models_1 = require("../models");
const Fanduel_1 = require("../Fanduel");
const chai_1 = require("chai");
const path_1 = require("path");
const Q = require("q");
const _ = require("lodash");
const auth = JSON.parse(fs.readFileSync(path_1.dirname(__filename) + "/../auth.json", "utf8"));
let fd;
before(() => {
    fd = new Fanduel_1.default(auth);
});
describe("auth", () => {
    it("valid credentials", () => {
        const fd = new Fanduel_1.default(auth);
        return fd.login().then(result => {
            chai_1.expect(result).to.equal(true, "Auth succeeded!");
        });
    });
    it("invalid credentials", () => {
        auth.password = "badpassword";
        const fd = new Fanduel_1.default(auth);
        return fd.login()
            .then()
            .catch(result => {
            chai_1.expect(result).to.equal("Couldn't login! Inavalid credentials?");
        });
    });
});
describe("info", () => {
    it("slates", () => {
        return fd.getAvailableSlates().then(result => {
            chai_1.expect(result).to.be.instanceof(Array);
        });
    });
    it("slate details", () => {
        const df = Q.defer();
        fd.getAvailableSlates().then(result => {
            fd.getDetailsForSlate(result[0])
                .then(slateDetails => {
                chai_1.expect(slateDetails).to.be.any;
                df.resolve(true);
            })
                .catch(reason => {
                console.log(reason);
                chai_1.expect(false).to.equal(true);
            });
        });
        return df.promise;
    });
    it("slate contests", () => {
        const df = Q.defer();
        fd.getAvailableSlates().then(result => {
            fd.getAvailableContestsForSlateId(result[0])
                .then(contestDetails => {
                chai_1.expect(contestDetails).to.be.any;
                df.resolve(true);
            })
                .catch(reason => {
                console.log(reason);
                chai_1.expect(false).to.equal(true);
            });
        });
        return df.promise;
    });
    it("players for slate", () => {
        const df = Q.defer();
        fd.getAvailableSlates().then(result => {
            fd.getPlayersForSlate(result[0]).then(slatePlayers => {
                chai_1.expect(slatePlayers).to.be.instanceof(Array);
            });
        });
        return df.promise;
    });
    it("games for slate", () => {
        const df = Q.defer();
        fd.getAvailableSlates().then(result => {
            fd.getGamesForSlate(result[0]).then(slateGames => {
                chai_1.expect(slateGames).to.be.instanceof(Array);
            });
        });
        return df.promise;
    });
});
describe("lineups", () => {
    it("generate valid lineup", () => {
        const df = Q.defer();
        fd.getAvailableSlates().then(result => {
            fd.createValidLineupForSlate(result[0]).then(lineup => {
                chai_1.expect(lineup).to.be.instanceof(models_1.Lineup);
                df.resolve(true);
            });
        });
        return df.promise;
    });
    it("enter contest", () => {
        const df = Q.defer();
        fd.getAvailableSlates().then(result => {
            const slate = result[1];
            const autoLineup = fd.createValidLineupForSlate(slate);
            const contestResult = fd.getAvailableContestsForSlateId(slate);
            Q.all([contestResult, autoLineup])
                .then(results => {
                const contest = _.find(results[0].contests, c => c.entry_fee == 1);
                fd.createEntryForContest(slate, contest, results[1]).then(createdContests => {
                    chai_1.expect(createdContests).to.be.instanceof(Array);
                    df.resolve(true);
                });
            })
                .catch(e => console.log(e));
        });
        return df.promise;
    });
    it("list my upcoming", () => {
        return fd.getUpcomingRosters().then(result => {
            chai_1.expect(result).to.be.instanceof(models_1.UpcomingRoster);
        });
    });
    it("update my roster", () => {
        const df = Q.defer();
        const slatesDf = fd.getAvailableSlates();
        const myRostersDf = fd.getUpcomingRosters();
        Q.all([slatesDf, myRostersDf]).then(results => {
            if (results[1].rosters.length == 0) {
                console.error("No upcoming rosters so can't test edit.");
                chai_1.expect(false).to.equal(false);
                return df.resolve(true);
            }
            const targetRoster = results[1].rosters[0];
            const splitIds = targetRoster.id.split("-");
            const slate = _.find(results[0], f => f.id == splitIds[0]);
            fd.getPlayersForSlate(slate).then(players => {
                const targetRosterSpot = targetRoster.lineup[0];
                const playerToReplace = _.find(players, f => f.id == targetRosterSpot.player.id);
                const otherPlayer = _.find(players, f => f.id != playerToReplace.id && f.position == playerToReplace.position && f.salary <= playerToReplace.salary);
                targetRoster.lineup[0].player = otherPlayer;
                fd.updateEntryForContest(targetRoster, { roster: targetRoster.lineup })
                    .then(result => {
                    chai_1.expect(true).to.equal(true);
                    df.resolve(result);
                })
                    .catch(e => console.log(e));
            })
                .catch(e => console.log(e));
        })
            .catch(e => console.log(e));
        return df.promise;
    });
    it("delete my upcoming", () => {
        const df = Q.defer();
        fd.getUpcomingRosters().then(result => {
            if (result.rosters.length == 0) {
                console.error("No upcoming rosters so can't test edit.");
                chai_1.expect(false).to.equal(false);
                return df.resolve(true);
            }
            fd.getEntriesForRoster(result.rosters[0]).then(entries => {
                fd.cancelEntryForContest(entries[0]).then(() => {
                    chai_1.expect(true).to.equal(true);
                    return df.resolve(true);
                });
            });
        });
        return df.promise;
    });
});
