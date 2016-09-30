'use strict';
var socketio = require('socket.io');
// var Game = require();
var io = null;

module.exports = function (server) {

    if (io) return io;

    io = socketio(server);

    io.on('connection', function (socket) {
        // Now have access to socket, wowzers!
        socket.on('wordPlayed', function(playObj){
          console.log('word is being played');
          var potentialUpdateObj = {
            word: "bird",
            playerId: 2
          };

          // game.wordPlayed(playObj);
          if(potentialUpdateObj){
            io.emit('boardUpdated', potentialUpdateObj);
          }
        });
    });
    return io;

};
