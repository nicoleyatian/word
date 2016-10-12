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
    inProgress: { //you could consider having a status and it being enum so that you don't have to keep adding attributes for new statuses (in some eventuality that you would)
        type: Sequelize.BOOLEAN,
        defaultValue: true
    },
    isWaiting: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
    }
},
// , { //should this be in your master if it is all commented out??
//     hooks: {
//         beforeUpdate: function(game) {
//             if (!game.inProgress) {
//                 this.findById(game.id, {
//                         include: [{
//                             model: User
//                         }],
//                         order: [
//                             [User, UserGame, 'score', 'DESC']
//                         ]
//                     })
//                     .then(game => {
//                         game.setWinner(game.users[0])
//                     })
//             }
//         }
//     }
// }


 {getterMethods: {
    date: function(){ //I'm not sure where you are using this, but look into Angular date filters https://docs.angularjs.org/api/ng/filter/date
        return this.updatedAt.toDateString()+" at "+this.updatedAt.getHours()+":"+this.updatedAt.getMinutes()+":"+this.updatedAt.getSeconds();
    }
 }
})
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
