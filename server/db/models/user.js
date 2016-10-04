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
    },
    highestScore: {
        type: Sequelize.INTEGER,
        defaultValue: 0
    },
    games_won:{
        type: Sequelize.INTEGER,
        defaultValue: 0
    },
    games_played: {
        type: Sequelize.INTEGER,
        defaultValue: 0
    }
}, {
    getterMethods:{
        win_percentage: function(){
            if (this.games_played===0){
                return 0;
            }
            return  (this.games_won/this.games_played)*100;
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

function getHighestScore(user) {
    UserGame.max('score', {
        where: {
            userId: user.id
        }
    })
    .then(max => {user.highestScore = max})
}
