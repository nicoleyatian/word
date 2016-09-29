'use strict';
var crypto = require('crypto');
var _ = require('lodash');
var Sequelize = require('sequelize');

var db = require('../_db');

module.exports = db.define('game', {
    roomname: {
        type: Sequelize.STRING
    },
    inProgress: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
    }
});

