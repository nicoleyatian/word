var chai = require('chai');
var expect = chai.expect;
var game = require('../../../server/game/game.js');


describe("Game class", function() {
    var aGame,
        tileCountObj = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6 },
        sideLength = 3,
        minWordLength = 3,
        numOfTiles = 0;

    for (var i in tileCountObj) {
        numOfTiles += tileCountObj[i];
    }


    // Game is a constructor function
    beforeEach(function() {
        aGame = new game.GameObject(tileCountObj, sideLength, minWordLength);
    });

    // A new Game object has remainingTimesArray that has been decremented by the number of tiles on the new board
    it("has a tileArray", function() {
        expect(Array.isArray(aGame.remainingTilesArray)).to.be.true;
        expect(aGame.remainingTilesArray.length + (sideLength * sideLength)).to.be.equal(numOfTiles);
    });

    // test that board is generated to correct dimensions
    it("has a board that has equal sideLengths", function() {
        expect(aGame.board.length).to.equal(sideLength);
        expect(aGame.board[0].length).to.equal(sideLength);
    });


    it("draws a letter from tileArray", function() {
        var tileArray = game.tileCountToArray(tileCountObj);
        var tileArrayCopy = tileArray.slice();
        var drawnLetter = game.drawLetter(tileArray);

        expect(tileArray.length).to.equal(tileArrayCopy.length - 1);
        expect(typeof drawnLetter).to.be.equal('string');
        expect(drawnLetter.length).to.be.equal(1);

        tileArray.push(drawnLetter);
        expect(tileArray.sort()).to.deep.equal(tileArrayCopy.sort());
    });

    describe("wordPlayed function", function() {

      var playObj;

        it("returns undefined if word length is less than minWordLength", function() {
            playObj = {
                stateNumber: 2,
                wordObj: { '0-1': 'T', '1-2': 'O' },
                word: "TO",
                playerId: 3
            };
            expect(aGame.wordPlayed(playObj)).to.be.undefined;

        });


    });

});


//   it("should have an array called offspring", function() {
//     expect(myMammal.offspring).toEqual([]);
//   });

//   // myMammal's prototype is the prototype of its contructor function which is Mammal.prototype
//   it("should have a sayHello function on it's prototype", function() {
//     expect(myMammal.sayHello()).toEqual("My name is Joe, I'm a Mammal");
//     // these functions should be on Mammal.prototype
//     expect(myMammal.hasOwnProperty("sayHello")).toEqual(false);
//   });

//   it("should have a haveBaby function", function() {
//     child = myMammal.haveBaby();
//     expect(child.name).toEqual("Baby Joe");
//     expect(myMammal.offspring).toEqual([child]);

//     // these functions should be on Mammal.prototype
//     expect(myMammal.hasOwnProperty("haveBaby")).toEqual(false);
//   });
// });


// // Cat instances inherit from Mammals, all the properties
// // Mammals have, Cat's will have as well.
// describe("Cat class", function() {
//   var cat;

//   // Cat is a constructor function
//   beforeEach(function() {
//     spyOn(Mammal, 'call').and.callThrough();
//     cat = new Cat("Garfield", "yellow");
//   });

//   // Review how .call() and .apply() work.
//   it("calls the Mammal Constructor Function", function() {
//     // Inside the Cat constructor function, you should also call `Mammal.call`
//     // and use the Mammal constructor function to create the basic properties of a `Cat` instance
//     expect(Mammal.call).toHaveBeenCalled();
//   });

//   it("should have an array called offspring and name property from the Mammal constructor function", function() {
//     expect(cat.offspring).toEqual([]);
//     expect(cat.name).toEqual("Garfield");
//   });

//   it("should have a color in its constructor function", function() {
//     expect(cat.color).toEqual("yellow");
//   });

//   // Testing if new Mammal vs Object.create(Mammal) is used to set up the chain or inheritance
//   // of the prototype chain.  (In the lecture videos we covered how to impelement inheritance
//   // using the classical model, in the earlier videos we demonstrated how to chain prototypes with
//   // Object.create() )

//   it("should use Object.create to inherit methods from Mammal", function() {
//     expect(typeof Cat.prototype.sayHello).toEqual('function');
//     expect(Cat.prototype.offspring).toEqual(undefined);
//   });

//   // What is the constructor property? We did not cover this in the lecture video.
//   it('should have its prototype object and a constructor property that points back to Cat', function() {
//     expect(Cat.prototype.constructor).toEqual(Cat);
//   });


//   // Even though Cat inherits many of its properties from Mammal, we can override methods
//   // to perform different actions (polymorphism).
//   it("should have it's own haveBaby method that takes only a color", function() {
//     var greenCat = cat.haveBaby("green");
//     expect(cat.offspring).toEqual([greenCat]);
//     expect(greenCat.name).toEqual("Baby Garfield");
//     expect(greenCat.color).toEqual("green");

//   });

//   // Research the constructor property
//   it("the cat haveBaby is actually a Cat and not a Mammal", function() {
//     var blueCat = cat.haveBaby("blue");
//     expect(blueCat instanceof Cat).toEqual(true);
//     expect(blueCat.constructor).toEqual(Cat);
//   });
