'use strict';
var crypto = require('crypto');
var _ = require('lodash');
var Sequelize = require('sequelize');
var User = require('./user.js');

var db = require('../_db');

module.exports = db.define('userGame', {
    score: {
    	type: Sequelize.INTEGER
    }
});


// {
//    getterMethods: {
//      winner: function(){
//        UserGame.max('score', {
//          where: {
//            gameId: this.id
//          }
//        })
//        .then(highestScore => {
//          this.highestScore = highestScore
//        })
//      }
//    }
// UserGame.findAll({
//   attributes: ['winner']
// })
// .then(function(winner){
//   console.log('winner from UserGame', winner);
// })

 // getterMethods:{
 //        win_percentage: function(){
 //            if (this.games_played===0){
 //                return 0;
 //            }
 //            return  (this.games_won/this.games_played)*100;
 //        }


// function getHighestScore(user) {
//     UserGame.max('score', {
//         where: {
//             userId: user.id
//         }
//     })
//     .then(max => {user.highestScore = max})
// }
