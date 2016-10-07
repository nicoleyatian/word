'use strict';
var socketio = require('socket.io');
var game = require('../game/game.js');
var persistGame = require('./persistGame.js');
var io = null;
var data = {};


module.exports = function(server) {

    // let name2gameMapper = { room: game };

    if (io) return io;

    io = socketio(server);

    //as games begin, this associates the roomname with its shared gameObject
    var roomGameMapper = {};

    io.on('connection', function(socket) {
        // Now have access to socket, wowzers!
        console.log('A new client with the socket ID of ' + socket.id + ' has connected');

        socket.on('joinRoom', function(user, roomName, gameId) {

            socket.join(roomName);
            console.log('A client joined this room: ', roomName);

            socket.broadcast.to(roomName).emit('roomJoinSuccess', user);

            socket.on('disconnect', function() {
                console.log('A client with the socket ID of ' + socket.id + ' has diconnected :(');
                persistGame.quitGame(gameId, user.id)
                socket.broadcast.to(roomName).emit('playerDisconnected', user.id);
            });

            socket.on('getStartBoard', function(gameLength, gameId, userIds) {
                //initialize GameObj for the room in the mapper
                roomGameMapper[roomName] = new game.GameObject(game.tileCounts, 6, 2);
                var thisGame = roomGameMapper[roomName];
                //associate its game id for use in persistence
                thisGame.id = gameId;
                //add each user to the game (enters them into scoreObj with score 0)
                userIds.forEach(userId => thisGame.addPlayer(userId));
                console.log(`Room ${roomName} has begun playing with game # ${gameId}`);
                
                io.to(roomName).emit('startBoard', thisGame.board);

                //set isPlaying to true in db
                persistGame.startGame(thisGame.id);

                setTimeout(function() {

                    console.log('game over', gameId);

                    io.to(roomName).emit('gameOver');

                    //send scores to db, set isPlaying to false
                    persistGame.saveGame(thisGame);
                }, gameLength * 1000);
            });

            socket.on('submitWord', function(playObj) {
                var thisGame = roomGameMapper[roomName];
                console.log('play obj before it is checked', playObj);
                var potentialUpdateObj = thisGame.wordPlayed(playObj);
                if (potentialUpdateObj) {
                    console.log('update object sending!', potentialUpdateObj);
                    io.to(roomName).emit('wordValidated', potentialUpdateObj);
                }
            });

            socket.on('shuffleBoard', function(userId){
                var thisGame = roomGameMapper[roomName];
                thisGame.shuffle();
                thisGame.playerScores[userId]-=5;
                console.log('server shuffling');
                io.to(roomName).emit('boardShuffled', thisGame.board, userId, thisGame.stateNumber);
            });
        });
    });
    return io;

};
