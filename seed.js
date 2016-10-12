/*

This seed file is only a placeholder. It should be expanded and altered
to fit the development of your application.

It uses the same file the server uses to establish
the database connection:
--- server/db/index.js

The name of the database used is set in your environment files:
--- server/env/*

This seed file has a safety check to see if you already have users
in the database. If you are developing multiple applications with the
fsg scaffolding, keep in mind that fsg always uses the same database
name in the environment files.

*/
const faker = require('faker');

var chalk = require('chalk');
var db = require('./server/db');
var User = db.model('user');
var Game = db.model('game');
var UserGame = db.model('userGame')
var Promise = require('sequelize').Promise;

// var seedUsers = function () { //get rid of the stuff you aren't using

//     var users = [
//         {
//             email: 'testing@fsa.com',
//             password: 'password'
//         },
//         {
//             email: 'obama@gmail.com',
//             password: 'potus'
//         }
//     ];

//     var creatingUsers = users.map(function (userObj) {
//         return User.create(userObj);
//     });

//     return Promise.all(creatingUsers);

// };

// var seedGames = function () {

//     var users = [
//         {},
//         {}
//     ];

//     var creatingUsers = users.map(function (userObj) {
//         return Game.create(userObj);
//     });

//     return Promise.all(creatingUsers);

// };

let user = {
    username: faker.internet.userName,
    email: faker.internet.email,
    password: () => 'test'
};

let game = {
    roomname: faker.hacker.noun,
    isWaiting: () => true,
    inProgress: () => true
};


let userGame = {
    gameId: () => Math.ceil(Math.random() * 49),
    userId: () => Math.ceil(Math.random() * 49),
    score: () => Math.ceil(Math.random() * 99)
};


// db.sync({ force: true })
//     .then(function () {
//         return seedUsers();
//     })
//     .then(()=>seedGames())
//     .then(()=>{
//         Game.findAll()
//         .then(games=>{
//             let settingUsers = [];
//                 while (games.length > 0) {
//                     settingUsers.push(games.pop().setUser(randomInt(2)))
//                 }
//                 return Promise.all(settingUsers)
//                     .then(() => console.log('users set.'))
//         })
//     })
//     .then(function () {
//         console.log(chalk.green('Seed successful!'));
//         process.exit(0);
//     })
//     .catch(function (err) {
//         console.error(err);
//         process.exit(1);
//     });

function generateRows(model, number) {
    let rows = [];
    for (let i = 0; i < number; i++) {
        let row = {};
        for (let field in model) {
            if (Array.isArray(model[field])) { // for tag arrays
                row[field] = model[field].map(fn => fn());
            } else if (field === 'releaseDate') { // edge case until we get proper date
                row[field] = faker.date.recent().toString();
            } else {
                row[field] = model[field]();
            }
        }
        rows.push(row);
    }
    return rows;
}

function addRows(rows, model) {
    let promises = [];
    while (rows.length > 0) {
        let row = model.create(rows.pop());
        promises.push(row);
    }
    return promises;
}

var seedRooms = function() {

    var rooms = [
        { roomname: 'room1' },
        { roomname: 'room2' },
        { roomname: 'room3' },
        { roomname: 'room4' }
    ];

    var creatingRooms = rooms.map(function(room) {
        return Game.create(room);
    });

    return Promise.all(creatingRooms);

};

function randomInt(int) {
    return Math.ceil(Math.random() * int);
}

function addPlayers(game) {
    let addData = [game.addUser(randomInt(9)), game.addUser(randomInt(9) + 10), game.addUser(randomInt(9) + 20), game.addUser(randomInt(9) + 30)]
    return Promise.all(addData)
}

// var seedScores = function() {
//     var sets = [];
//     Game.findAll()
//     .then(games=>{
//         sets = games.map((game)=> game.addUsers(Math.ceil(Math.random() * 49),Math.ceil(Math.random() * 49),Math.ceil(Math.random() * 49),Math.ceil(Math.random() * 49)))
//     })

//     return Promise.all(sets);

// }


db.sync({
        force: true
    })
    .then(() => Promise.all(addRows(generateRows(game, 50), Game)))
    .then(() => Promise.all(addRows(generateRows(user, 50), User))) //I would think that you would be able to combine these promise.alls; it doesn't seem to me that the user relies on the game being created yet. As such you might be able to just return the created games and users from 1 big ole Promise.all, but doing a find and then mapping is fine too -- KH
    .then(() => Game.findAll()
        .then(games => { //no need to nest this inside of the then on line 180. Game.findAll is an implicit return, so the next .then will have all of the games if you let it return. (see line 189) -- KH
            let add = [];
            games.forEach(game => {
                add.push(addPlayers(game))
            })
            return Promise.all(add)
            //if you map them to an array of promises you can just return that (see line 189) -- KH
        })
    )
    // .then(games => Promise.all(games.map(game => addPlayers(game)))) -- KH
    .then(() => UserGame.findAll()
        .then(userGames => { //same with nested then here
            let updates = [];
            userGames.forEach(userGame => {
                updates.push(userGame.update({
                    score: randomInt(100),
                    longestWord: 'Here is a list of longest possible words'.split(' ')[Math.floor(Math.random() * 8)]
                }));
            });
            return Promise.all(updates)
            // return Promise.all(userGames.map(userGame => userGame.update({
            //         score: randomInt(100),
            //         longestWord: 'Here is a list of longest possible words'.split(' ')[Math.floor(Math.random() * 8)]
            //     }))); -- KH
        }))
    .then(() => Game.findAll()
        .then(games => {
            let updates = [];
            games.forEach(game => { //why not do this while you are adding player? or creating for the first time?
                updates.push(game.update({ isWaiting: false }));
                updates.push(game.update({ inProgress: false }))
            });
            return Promise.all(updates)
        }))
    //.then(() => Promise.all(addRows(generateRows(userGame, 150), UserGame)))
    .then(seedRooms)

//.then(seedScores)
.then(() => {
        console.log(chalk.green('Seed successful!'));
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
