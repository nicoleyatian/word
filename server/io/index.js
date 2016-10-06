'use strict';
var socketio = require('socket.io');
var game = require('../game/game.js');
var io = null;
var data = {};
var User = require('../db/models/user');
var Game = require('../db/models/game');
var UserGame = require('../db/models/userGame');


function saveGame(gameObj) {
    console.log('save game go.id: ',gameObj.gameId);
    Game.findById(gameObj.id, {
            include: [{
                model: User,
                attributes: ['id']
            }]
        })
        .then(game => {
            let updatePromises = [];
            game.users.forEach(user => {
                updatePromises.push(user.userGame.update({
                    score: gameObj.playerScores[user.id]
                }));
            });
            updatePromises.push(game.update({ inProgress: false }));
            console.log('about to run updated scores: ',updatePromises);
            return Promise.all(updatePromises);
        })
        .catch(function(e) {
            console.error(e)
        });
}

module.exports = function(server) {

    // let name2gameMapper = { room: game };

    if (io) return io;

    io = socketio(server);

    //as games begin, this associates the roomname with its shared gameObject
    var roomGameMapper = {};

    io.on('connection', function(socket) {
        // Now have access to socket, wowzers!
        console.log('A new client with the socket ID of ' + socket.id + ' has connected');

        // let addData = function(playerMove) {
        //     if (!data[roomName]) data[roomName] = [];
        //     data[roomName].push(playerMove);
        // };


        socket.on('joinRoom', function(user, roomName) {


            // if (!thisGame) {
            //     thisGame.user = user;
            // }

            socket.join(roomName);
            console.log('A client joined this room: ', roomName);

            socket.broadcast.to(roomName).emit('roomJoinSuccess', user);
            // io.sockets.in(roomName).emit('roomData', {
            //     count: io.sockets.adapter.rooms[roomName]
            // })
            // console.log('roomData count has been updated');


            socket.on('disconnect', function(userId) {
                console.log('A client with the socket ID of ' + socket.id + ' has diconnected :(');
                socket.broadcast.to(roomName).emit('playerDisconnected', 'some data about player');
            });

            socket.on('getStartBoard', function(gameLength, gameId) {
                roomGameMapper[roomName] = new game.GameObject(game.tileCounts, 6, 2);
                var thisGame = roomGameMapper[roomName];
                thisGame.id = gameId;
                console.log(`Room ${roomName} has begun playing with game # ${gameId}`);
                io.to(roomName).emit('startBoard', thisGame.board);
                setTimeout(function() {
                    //send some data to server and:
                    console.log('game over', gameId);

                    io.to(roomName).emit('gameOver');
                    saveGame(thisGame);
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
        });
    });
    return io;

};
