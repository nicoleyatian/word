'use strict';
var crypto = require('crypto');
var _ = require('lodash');
var Sequelize = require('sequelize');

var db = require('../_db');
var UserGame = require('./userGame.js')

module.exports = db.define('user', {
    username: {
        type: Sequelize.STRING
    },
    email: {
        type: Sequelize.STRING,
        unique: true
    },
    password: {
        type: Sequelize.STRING
    },
    salt: {
        type: Sequelize.STRING
    },
    twitter_id: {
        type: Sequelize.STRING
    },
    facebook_id: {
        type: Sequelize.STRING
    },
    google_id: {
        type: Sequelize.STRING
    }
}, {
    getterMethods:{
        highestScore:function(){
            console.log(this.games)
            var score=0;
            for (var game in this.games){
                if (this.games[game].userGame.score>score){score=this.games[game].userGame.score}
            }
        return score;
        },
        games_played: function(){
            var total=0;
            for (var game in this.games){
                total+=1;
            }
            return total;
        },
        games_won: function(){
            var total=0;
            for (var game in this.games){
                if (this.games[game].winnerId===this.id){
                    total+=1;
                }
            }
            return total;
        },
        win_percentage: function(){
            if (this.games_played===0){
                return 0;
            }
            return  ((this.games_won/this.games_played)*100).toFixed(2);
        },
        longestWord: function(){
            var longest='';
            for (var game in this.games){
                if (this.games[game].userGame.longestWord.length>longest.length){
                    longest=this.games[game].userGame.longestWord;
                }
            }
            return longest;
        }
    },
    instanceMethods: {
        sanitize: function () {
            return _.omit(this.toJSON(), ['password', 'salt']);
        },
        correctPassword: function (candidatePassword) {
            return this.Model.encryptPassword(candidatePassword, this.salt) === this.password;
        }
    },
    classMethods: {
        generateSalt: function () {
            return crypto.randomBytes(16).toString('base64');
        },
        encryptPassword: function (plainText, salt) {
            var hash = crypto.createHash('sha1');
            hash.update(plainText);
            hash.update(salt);
            return hash.digest('hex');
        }

    },
    hooks: {
        beforeCreate: function(user){
            setSaltAndPassword(user);
            //getHighestScore(user)
        },
        beforeUpdate: function(user){
            setSaltAndPassword(user);
            //getHighestScore(user)
        }
    }
});

function setSaltAndPassword(user) {
    if (user.changed('password')) {
        user.salt = user.Model.generateSalt();
        user.password = user.Model.encryptPassword(user.password, user.salt);
    }
}

