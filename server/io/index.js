'use strict';
var socketio = require('socket.io');
var game = require('../game/game.js');
var io = null;

module.exports = function (server) {

  var thisGame = new game.GameObject(game.tileCounts, 6, 2);

    if (io) return io;

    io = socketio(server);

    io.on('connection', function (socket) {
        // Now have access to socket, wowzers!
        socket.on('wordPlayed', function(playObj){
          console.log('word is being played');
          var potentialUpdateObj = thisGame.wordPlayed(playObj);
          // game.wordPlayed(playObj);
          if(potentialUpdateObj){
            io.emit('boardUpdated', potentialUpdateObj);
          }
        });
    });
    return io;

};
