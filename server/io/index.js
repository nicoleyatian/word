'use strict';
var socketio = require('socket.io');
var game = require('../game/game.js');
var persistGame = require('./persistGame.js');
var io = null;


module.exports = function(server) {

    if (io) return io;

    io = socketio(server);

    //as games begin, this associates the roomname with its shared gameObject
    var roomGameMapper = {};

    //associates roomname with objects containing each player's longest word
    var roomWordMapper = {};

    function trackLongestWord(roomName, playerId, word) {
        var ourWordMapper = roomWordMapper[roomName];
        var myLongestWord = ourWordMapper[playerId];
        // if (!myLongestWord) ourWordMapper[playerId] = word;
        // else 
        if (myLongestWord.length < word.length) ourWordMapper[playerId] = word;
    }

    //returns an array with the winner(/winners if theres a tie)
    function getWinner(scoreObj) {
        var winners = [];
        for (var id in scoreObj) {
            if (winners.length === 0) winners.push(id);
            else if (scoreObj[id] > scoreObj[winners[0]]) winners = [id];
            else if (scoreObj[id] === scoreObj[winners[0]]) winners.push(id);
        }
        return winners;
    }

    io.on('connection', function(socket) {
        console.log("ROOMYTHINGY!", roomGameMapper); //get rid of some of these logssss
        // Now have access to socket, wowzers!
        console.log('A new client with the socket ID of ' + socket.id + ' has connected');

        socket.on('joinRoom', function(user, roomName, gameId) {

            socket.join(roomName);
            console.log('A client joined this room: ', roomName);

            socket.broadcast.to(roomName).emit('roomJoinSuccess', user);

            // socket.on('disconnect', function() {
            //     console.log('A client with the socket ID of ' + socket.id + ' has diconnected :(');

            //     persistGame.quitGame(gameId, user.id);
            //     socket.broadcast.to(roomName).emit('playerDisconnected', user.id);
            // });
        });
        socket.on('getStartBoard', function(gameLength, gameId, userIds, roomName) {
            //initialize GameObj for the room in the mapper
            roomGameMapper[roomName] = new game.GameObject(game.tileCounts, 6, 2); //you are going to make these variable right? how big the board can be and the min length of words? If so, it seems like tileCounts might increase?
            roomWordMapper[roomName] = {};
            var thisGame = roomGameMapper[roomName];
            var ourWords = roomWordMapper[roomName];
            //associate its game id for use in persistence
            thisGame.id = gameId;
            //add each user to the game (enters them into scoreObj with score 0)
            userIds.forEach(userId => {
                thisGame.addPlayer(userId);
                ourWords[userId] = '';
            });
            console.log(`Room ${roomName} has begun playing with game # ${gameId}`);

            io.to(roomName).emit('startBoard', thisGame.board);

            //set isPlaying to true in db
            persistGame.startGame(thisGame.id);

            setTimeout(function() {

                console.log('game over', gameId);
                var winnersArray = getWinner(thisGame.playerScores);
                var ourWords = roomWordMapper[roomName];
                // My only thoughts right now are that when you emit this, you make a request from the front which will make that call to persist the scores. The route jsut seems like the right place to save the game 
                io.to(roomName).emit('gameOver', winnersArray);

                //send scores to db (AND WORDS?!), set isPlaying to false
                persistGame.saveGame(thisGame, winnersArray, ourWords);
            }, gameLength * 1000);
        });

        socket.on('submitWord', function(playObj, roomName) {
            var thisGame = roomGameMapper[roomName];
            console.log('play obj before it is checked', playObj);
            var potentialUpdateObj = thisGame.wordPlayed(playObj);
            if (potentialUpdateObj) {
                console.log('update object sending!', potentialUpdateObj);
                io.to(roomName).emit('wordValidated', potentialUpdateObj);
                trackLongestWord(roomName, playObj.playerId, playObj.word);
            }
        });

        socket.on('shuffleBoard', function(user, roomName) {
            var thisGame = roomGameMapper[roomName];
            thisGame.shuffle();
            thisGame.playerScores[user.id] -= 5;
            console.log('server shuffling');
            io.to(roomName).emit('boardShuffled', thisGame.board, user, thisGame.stateNumber);
        });

        socket.on('leaveRoom', function(user, roomName, gameId) {
            console.log('A client with the socket ID of ' + socket.id + ' has diconnected :(');
            persistGame.quitGame(gameId, user.id);
            socket.broadcast.to(roomName).emit('playerDisconnected', user);
            socket.leave(roomName);
        });
    });
    return io;

};
