'use strict';
var socketio = require('socket.io');
var game = require('../game/game.js');
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


            socket.on('disconnect', function() {
                console.log(user)
                console.log('A client with the socket ID of ' + socket.id + ' has diconnected :( from', roomName);
                // io.emit('hello', 'hello')
                socket.broadcast.to(roomName).emit('playerDisconnected', 'some data about player');
                // io.to(roomName).emit('disconnectFromServer', socket.id)
            });

            socket.on('getStartBoard', function() {
                roomGameMapper[roomName] = new game.GameObject(game.tileCounts, 6, 2);
                var thisGame = roomGameMapper[roomName];
                console.log(`Room ${roomName} has begun playing`);
                io.to(roomName).emit('startBoard', thisGame.board);
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
