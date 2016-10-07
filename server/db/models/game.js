'use strict';
var crypto = require('crypto');
var _ = require('lodash');
var Sequelize = require('sequelize');
var UserGame = require('./userGame.js');
var User = require('./user.js');


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
}, {
    hooks: {
        beforeUpdate: function(game) {
            if (!game.inProgress) {
                this.findById(game.id, {
                        include: [{
                            model: User
                        }],
                        order: [
                            [User, UserGame, 'score', 'DESC']
                        ]
                    })
                    .then(game => {
                        game.setWinner(game.users[0])
                    })
            }
        }
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
