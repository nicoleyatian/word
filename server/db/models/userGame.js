'use strict';
var crypto = require('crypto');
var _ = require('lodash');
var Sequelize = require('sequelize');
//var User = require('./user.js');
var Games=require("./game.js");

var db = require('../_db');

module.exports = db.define('userGame', {
        score: {
            type: Sequelize.INTEGER
        },
        longestWord: {
        	type: Sequelize.STRING
        }	
    }
); //nice, so each user can know their score and longest word for each game :)
