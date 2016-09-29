'use strict';
var crypto = require('crypto');
var _ = require('lodash');
var Sequelize = require('sequelize');

var db = require('../_db');

module.exports = db.define('userGame', {
    score: {
    	type: Sequelize.INTEGER
    }
});

