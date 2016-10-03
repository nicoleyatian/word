'use strict';
var socketio = require('socket.io');
// var Game = require();
var io = null;
var data = {};

module.exports = function (server) {

    if (io) return io;

    io = socketio(server);

    io.on('connection', function (socket) {
        // Now have access to socket, wowzers!
        console.log('A new client with the socket ID of ' + socket.id + ' has connected');
        let roomName;

        let addData = function(playerMove){
          if(!data[roomName]) data[roomName] = [];
          data[roomName].push(playerMove);
        }

        socket.on('joinRoom', function(room){
          roomName = room;
          socket.join(roomName);
          console.log('A client joined this room: ', roomName);
          io.sockets.in(roomName).emit('roomData', {
            count: io.sockets.adapter.rooms[roomName]
          })
          console.log('roomData count has been updated');
        });

        socket.on('disconnect', function(){
          console.log('A client with the socket ID of ' + socket.id + ' has diconnected :(');
          socket.broadcast.to(roomName).emit('playerDisconnected', 'some data about player');
        });

        // socket.on('lettersClicked', function(){
        //   if (!data[roomName]) data[roomName] = [];
        //   socket.emit('lettersClicked', data[roomName]);
        // })
    });
    return io;

};



    // io.on('connection', function (socket) {
    //     // Now have access to socket, wowzers!
    //     socket.on('wordPlayed', function(playObj){
    //       console.log('word is being played');
    //       var potentialUpdateObj = {
    //         word: "bird",
    //         playerId: 2
    //       };

    //       // game.wordPlayed(playObj);
    //       if(potentialUpdateObj){
    //         io.emit('boardUpdated', potentialUpdateObj);
    //       }
    //     });
    // });
