'use strict';
var socketio = require('socket.io');
var game = require('../game/game.js');
var io = null;
var data = {};

module.exports = function(server) {

    var thisGame = new game.GameObject(game.tileCounts, 6, 2);

    if (io) return io;

    io = socketio(server);

    io.on('connection', function(socket) {
        // Now have access to socket, wowzers!
        console.log('A new client with the socket ID of ' + socket.id + ' has connected');
        let roomName;

        let addData = function(playerMove) {
            if (!data[roomName]) data[roomName] = [];
            data[roomName].push(playerMove);
        }

        socket.on('joinRoom', function(user, room) {
            roomName = room;

            socket.join(roomName);
            console.log('A client joined this room: ', roomName);
            io.to(roomName).emit('roomJoinSuccess', user);
            // io.sockets.in(roomName).emit('roomData', {
            //     count: io.sockets.adapter.rooms[roomName]
            // })
            // console.log('roomData count has been updated');
        });

        socket.on('disconnect', function() {
            console.log('A client with the socket ID of ' + socket.id + ' has diconnected :(');
            socket.broadcast.to(roomName).emit('playerDisconnected', 'some data about player');
        });

        socket.on('submitWord', function(playObj){
            console.log('play obj before it is checked', playObj);
            var potentialUpdateObj = thisGame.wordPlayed(playObj);
            if(potentialUpdateObj){
                console.log('play obj being checked', potentialUpdateObj)
                io.to(roomName).emit('wordValidated', potentialUpdateObj);
            }
        });
    });
    return io;

};
