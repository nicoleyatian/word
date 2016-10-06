'use strict';
var crypto = require('crypto');
var _ = require('lodash');
var Sequelize = require('sequelize');
// var UserGame = require('./userGame.js');

var db = require('../_db');

module.exports = db.define('game', {
    roomname: {
        type: Sequelize.STRING,
        allowNull: false
    },
    inProgress: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
    },
    isWaiting: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
    }
});


    // getterMethods: {
    //     winner: function() {
    //         return this.getUsers()
    //             .then(function(players) {
    //                 return players
    //             });
    //     }
    // }


    //         UserGames.max('score', {where: 
    //             {gameId: this.id}
    //         })
    //             .then(function(players){

    //             }
    //     }
    // }