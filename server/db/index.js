'use strict';
var db = require('./_db');
module.exports = db;

// eslint-disable-next-line no-unused-vars
var User = require('./models/user');
var Game = require('./models/game');
var UserGame = require('./models/userGame');


Game.belongsToMany(User, {through: UserGame})
User.belongsToMany(Game, {through: UserGame})

Game.belongsTo(User, {as: 'winner'})
User.hasMany(Game, {as: 'winner', foreignKey: 'winnerId'}) // this is great! your associations look nice and the use of 'foreignKey' makes me happy


// if we had more models, we could associate them in this file
// e.g. User.hasMany(Reports)
