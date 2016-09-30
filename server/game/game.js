//UNIT TESTS:::
//board history object, check states


//THE "MASTER OBJECT", HOLDS THE DEFINITIVE STATE OF THE BOARD
//AND HISTORY, AND HAS METHODS FOR


function GameObject(tileCountObj, sideLength, minWordLength) {
    var tileArray = tileCountToArray(tileCountObj);
    var board = generateBoardMutating(tileArray, sideLength);
    this.sideLength = sideLength;
    this.stateNumber = 0;
    this.minWordLength = minWordLength;
    this.remainingTilesArray = tileArray;
    this.board = board;
    this.playerScores = {};
    //array of the tile coordinates of the tiles played at each stateNumber
    this.stateHistory = {};
}

function generateBoardMutating(tileArray, sideLength) {
    var board = [];
    for (var row = 0; row < sideLength; row++) {
        var nextRow = [];
        for (var col = 0; col < sideLength; col++) {
            var nextLetter = drawLetter(tileArray);
            nextRow.push(nextLetter);
        }
        board.push(nextRow);
    }
    return board;
}

var tileCounts = {
    'A': 13,'B': 3,'C': 3,'D': 6,'E': 18,'F': 3,'G': 4,'H': 3,'I': 12,
    'J': 2,'K': 2,'L': 5,'M': 3,'N': 8,'O': 11,'P': 3,'Q': 2,'R': 9,
    'S': 5,'T': 9,'U': 6,'V': 3,'W': 3,'X': 2,'Y': 3,'Z': 2,
};

//called once with the countObj at creation of game instance.
//obj simplifies visualizing/altering letter counts, but array
//is better for drawing and keeping track of remaining tiles
function tileCountToArray(tileCountObj) {
    var tileArray = [];
    for (var l in tileCountObj) {
        for (var c = 0; c < tileCountObj[l]; c++) {
            tileArray.push(l);
        }
    }
    return tileArray;
}


// function generateBoard(tileArray, sideLength) {
//     var board = [];
//     for (var row = 0; row < sideLength; row++) {
//         var nextRow = [];
//         for (var col = 0; col < sideLength; col++) {
//             var rnd = Math.floor(Math.random() * tileArray.length);
//             nextRow.push(tileArray[rnd][0]);
//         }
//         board.push(nextRow);
//     }
//     return board;
// }


//exists off of gameObj because utilized in init board gen
function drawLetter(tileArray) {
    var rnd = Math.floor(Math.random() * tileArray.length);
    return tileArray.splice(rnd, 1)[0];
}
GameObject.prototype.drawLetter = function() {
    return drawLetter(this.remainingTilesArray);
};

function generateBoardMutating(tileArray, sideLength) {
    var board = [];
    for (var row = 0; row < sideLength; row++) {
        var nextRow = [];
        for (var col = 0; col < sideLength; col++) {
            var nextLetter = drawLetter(tileArray);
            nextRow.push(nextLetter);
        }
        board.push(nextRow);
    }
    return board;
}


//add player id to playerScores obj with init score 0
GameObject.prototype.addPlayer = function(id) {
    this.playerScores[id] = 0;
};

GameObject.prototype.addToScore = function(playerId, word) {
    var pointsEarned = this.computeScore(word);
    this.playerScores[playerId] += pointsEarned;
    return pointsEarned;
};


GameObject.prototype.computeScore = function(word) {
    return word.length - this.minWordLength + 1;
};

//checking whether coords of tiles for proposed move have been moved
//since the state of the player trying to make a move
GameObject.prototype.stateConflicts = function(wordObj, prevState) {
    var tilesMoved = Object.keys(wordObj);
    for (var state in this.stateHistory) {
        if (state >= prevState) {
            if (this.stateHistory[state].some(coord => tilesMoved.indexOf(coord) > -1)) return true;
        }
    }
    return false;
};


//EXPECTS: OBJECT with stateNumber, wordObj, word, playerId
//A "STATENUMBER" TO MAKE SURE THIS MOVE ISNT COMING
//AFTER ANOTHER MOVE THAT ALREADY CHANGED THE BOARD
//obj with "wordObj" of format: {'0-1': 'T', '1-2': 'O'}
//meaning letter 'T' placed at row-0 col-1..., word: , player: id
//RETURNS: new stateNumber, obj with wordObj of same type of letters pulled from bag
//to replace the "removed" letters with, word:, playerId: id, pointsEarned:
GameObject.prototype.wordPlayed = function(playObj) {
    if (playObj.word.length < this.minWordLength) return; //throw error?
    if (playObj.stateNumber < this.stateNumber &&
    	this.stateConflicts(playObj.wordObj, playObj.stateNumber)) return;
    var coordArray, row, col;
    for (var ltrCoord in playObj.wordObj) {
        coordArray = ltrCoord.split('-');
        row = coordArray[0];
        col = coordArray[1];
        var newLetter = this.drawLetter();
        this.board[row][col] = newLetter;
        playObj.wordObj[ltrCoord] = newLetter;
    }
    var pointsEarned = this.addToScore(playObj.playerId, playObj.word);
    this.stateHistory[this.stateNumber] = Object.keys(playObj.wordObj);
    return {
        stateNumber: ++this.stateNumber,
        wordObj: playObj.wordObj,
        word: playObj.word,
        playerId: playObj.playerId,
        pointsEarned: pointsEarned
    };
};

//rearranges tiles on board. records in state history
GameObject.prototype.shuffle = function(){
	var currentTiles = [];
	this.board.forEach(r => currentTiles = currentTiles.concat(r));
	this.board = generateBoardMutating(currentTiles, this.sideLength);
	this.stateHistory[this.stateNumber] = 'shuffled';
	this.stateNumber++;
};

//checking whether coords of tiles for proposed move have been moved
//since the state of the player trying to make a move, OR board has been shuffled
GameObject.prototype.stateConflicts = function(wordObj, prevState) {
    var tilesMoved = Object.keys(wordObj);
    for (var state in this.stateHistory) {
        if (state >= prevState) {
        	var stateTilesMoved = this.stateHistory[state];
            if (stateTilesMoved === 'shuffled' || stateTilesMoved.some(coord => tilesMoved.includes(coord))) return true;
        }
    }
    return false;
};

//add player id to playerScores obj with init score 0
GameObject.prototype.addPlayer = function(id) {
    this.playerScores[id] = 0;
};

GameObject.prototype.addToScore = function(playerId, word) {
    var pointsEarned = this.computeScore(word);
    this.playerScores[playerId] += pointsEarned;
    return pointsEarned;
};

GameObject.prototype.computeScore = function(word) {
    return word.length - this.minWordLength + 1;
};




//testing & experimentation
// var GO = new GameObject(tileCounts, 6, 2);

// GO.stateHistory = {
// 	0: ['1-1', '1-0'],
// 	1: ['2-3', '3-3']
// };

// GO.stateNumber = 2;

// // console.log('init: ', GO);

// GO.addPlayer(1);
// GO.addPlayer(2);

// var testWord = {
//     stateNumber: 3,
//     wordObj: { '0-1': 'T', '1-2': 'O', '1-1': 'P' },
//     word: 'TOP',
//     playerId: 2
// };
// GO.shuffle();
// console.log('2nd: ', GO);

// console.log('3rd: ', GO.wordPlayed(testWord));
// console.log(GO);


// var scrabTileCounts = {
//     'A': 9,
//     'B': 2,
//     'C': 2,
//     'D': 4,
//     'E': 12,
//     'F': 2,
//     'G': 3,
//     'H': 2,
//     'I': 9,
//     'J': 1,
//     'K': 1,
//     'L': 4,
//     'M': 2,
//     'N': 6,
//     'O': 8,
//     'P': 2,
//     'Q': 1,
//     'R': 6,
//     'S': 4,
//     'T': 6,
//     'U': 4,
//     'V': 2,
//     'W': 2,
//     'X': 1,
//     'Y': 2,
//     'Z': 1
// };



// function generateBoard(tileArray, sideLength) {
//     var board = [];
//     for (var row = 0; row < sideLength; row++) {
//         var nextRow = [];
//         for (var col = 0; col < sideLength; col++) {
//             var rnd = Math.floor(Math.random() * tileArray.length);
//             nextRow.push(tileArray[rnd][0]);
//         }
//         board.push(nextRow);
//     }
//     return board;
// }

module.exports = {
    GameObject: GameObject,
    generateBoardMutating: generateBoardMutating,
    drawLetter: drawLetter,
    tileCountToArray: tileCountToArray
};
