var chai = require('chai');
var expect = chai.expect;
var game = require('../../../server/game/game.js');


describe("the GameObject", function() {
    var aGame,
        tileCountObj = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6 },
        sideLength = 3,
        minWordLength = 3,
        numOfTiles = 0;

    for (var ltr in tileCountObj) {
        numOfTiles += tileCountObj[ltr];
    }

    beforeEach(function() {
        aGame = new game.GameObject(tileCountObj, sideLength, minWordLength);
    });

    it("has a remainingTilesArray, which initially contains all the tiles from the tileCountObj not used to populate the board", function() {
        expect(Array.isArray(aGame.remainingTilesArray)).to.be.true;
        expect(aGame.remainingTilesArray.length).to.be.equal(numOfTiles - (sideLength * sideLength));
    });

    it("has a board: an array of arrays where the length of each array as well as the quantity of them is dictated by the sideLength", function() {
        expect(aGame.board.length).to.equal(sideLength);
        expect(aGame.board[0].length).to.equal(sideLength);
    });

    it("has a drawLetter method; calling it selects a random letter from tileArray (and removes the letter from the array) ", function() {
        var tileArray = game.tileCountToArray(tileCountObj);
        var tileArrayCopy = tileArray.slice();
        var drawnLetter = game.drawLetter(tileArray);

        expect(tileArray.length).to.equal(tileArrayCopy.length - 1);
        expect(typeof drawnLetter).to.be.equal('string');
        expect(drawnLetter.length).to.be.equal(1);

        tileArray.push(drawnLetter);
        expect(tileArray.sort()).to.deep.equal(tileArrayCopy.sort());
    });

    it("has a shuffle method; calling it rearranges the tiles on the board) ", function() {
        var initTileLayout = [];
        aGame.board.forEach(r=>initTileLayout = initTileLayout.concat(r));
        aGame.shuffle();
        var endTileLayout = [];
        aGame.board.forEach(r=>endTileLayout = endTileLayout.concat(r));

        expect(initTileLayout).not.to.deep.equal(endTileLayout);
        expect(initTileLayout.sort()).to.deep.equal(endTileLayout.sort());
    });

    describe("the wordPlayed method of the GameObject", function() {

        var playObj = {
            stateNumber: 0,
            wordObj: { '0-1': 'T', '1-2': 'O' },
            word: "TO",
            playerId: 3
        };

        it("returns undefined if word length is less than minWordLength", function() {
            expect(aGame.wordPlayed(playObj)).to.be.undefined;
        });

        describe("the updateObject returned by valid calls to wordPlayed method", function() {

            var playObj1 = {
                stateNumber: 0,
                wordObj: { '0-1': 'T', '1-2': 'O', '1-1': 'P' },
                word: "TOP",
                playerId: 3
            };

            it("does indeed return, and is indeed an object", function() {
                expect(typeof aGame.wordPlayed(playObj1)).to.be.equal('object');
            });

            //updateObject's wordObj represents the new tiles that should replace the tiles of the word that was played
            it("updateObject contains a wordObj with the same keys (letter coordinates) as the playObj's wordObj", function() {
                var playObjWOKeys = Object.keys(playObj1.wordObj);
                var updateObj = aGame.wordPlayed(playObj1);
                var updateObjWOKeys = Object.keys(updateObj.wordObj);

                expect(playObjWOKeys).to.be.deep.equal(updateObjWOKeys);
            });

            //stateNumber represents how many changes have been made since the initial board (which had stateNumber of 0)
            it("has a stateNumber equal to the game's new stateNumber and one greater than the game's prior stateNumber", function() {
                var priorStateNumber = aGame.stateNumber;
                var updateObj = aGame.wordPlayed(playObj1);
                var newStateNumber = aGame.stateNumber;
                var updateObjStateNumber = updateObj.stateNumber;

                expect(updateObjStateNumber).to.be.equal(newStateNumber);
                expect(newStateNumber).to.be.equal(priorStateNumber + 1);
            });

            it("has a pointsEarned property, which is a number", function() {
                var updateObj = aGame.wordPlayed(playObj1);

                expect(typeof updateObj.pointsEarned).to.be.equal('number');
            });

        });

        describe("correctly handles sequential plays", function() {

            var playObj1 = {
                stateNumber: 0,
                wordObj: { '0-1': 'T', '1-2': 'O', '1-1': 'P' },
                word: "TOP",
                playerId: 3
            };

            var playObj2 = {
                stateNumber: 0,
                wordObj: { '2-2': 'M', '2-1': 'A', '1-1': 'P' },
                word: "MAP",
                playerId: 2
            };

            var playObj3 = {
                stateNumber: 0,
                wordObj: { '2-0': 'M', '1-0': 'A', '0-0': 'P' },
                word: "MAP",
                playerId: 1
            };

            it("a word played from a prior state (meaning a player makes a move immediately after another player, and before having received the updateObj from the earlier move) is not allowed (returns undefined, does not change stateNumber) if it includes tiles that the earlier word used", function() {
                aGame.wordPlayed(playObj1);
                var stateNumber = aGame.stateNumber;
                var responseToConflictingMove = aGame.wordPlayed(playObj2);
                expect(responseToConflictingMove).to.be.undefined;
                expect(aGame.stateNumber).to.be.equal(stateNumber);
            });

            it("however a word played from a prior state IS allowed (returns updateObj, increments stateNumber) if it doesn't include tiles that the earlier word used", function() {
                aGame.wordPlayed(playObj1);
                var stateNumber = aGame.stateNumber;
                var responseToNonConflictingMove = aGame.wordPlayed(playObj3);
                expect(responseToNonConflictingMove).to.be.ok;
                expect(aGame.stateNumber).to.be.equal(stateNumber + 1);
            });

            it("if a word is played from a state prior and a shuffle has occurred since, it will not be allowed", function() {
              aGame.shuffle();
              var stateNumber = aGame.stateNumber;
              var responseToNonConflictingMove = aGame.wordPlayed(playObj1);
              expect(responseToNonConflictingMove).to.be.undefined;
              expect(aGame.stateNumber).to.be.equal(stateNumber);
            });
        });

    });
});
