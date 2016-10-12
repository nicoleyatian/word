const express = require('express');

const router = express.Router();

const path = require('path');

// const User = require(path.join('..', '..', '..', '/db/models/user'));
const Game = require('../../../db/models/game');
const User = require('../../../db/models/user');
const Promise = require('sequelize').Promise; //you don't need this for anything you are doing in this file. es6 Promise has Promise.all

// Get all games
router.get('/', (req, res, next) => {
    Game.findAll({
        include:[{model: User}] //you should just be able to do 'include:[User]' here
    })
        .then(games => {
            if (!games) {
                throw new Error(); //do you want to throw an error for no games, or just have something on the front that says there are no games to display if the length is 0?
                //if you still want to throw the error, make it meaningful
            } else {
                res.json(games);
            }
        })
        .catch(next);
});

//Get all inProgress Game (rooms in the lobby)
router.get('/rooms', (req, res, next) => { //you could consider just making this a query in the original get('/' above -- that is what I would expect as you are just filtering
    Game.findAll({
        where: {
            isWaiting: true
        },
        include:[{model: User}]
    })
        .then(games => {
                res.json(games);
        })
        .catch(next);
});

//Get game id with roomname
router.get('/rooms/:roomname', (req, res, next) => {
    Game.findOne({
        where: {
            isWaiting: true,
            roomname: req.params.roomname
        },
        include:[{model: User}]
    })
        .then(games => { //this should be a singular game
            if (!games) {
                throw new Error(); //if there is no game, throw a meaningful error (and status code)
            } else {
                res.json(games);
            }
        })
        .catch(next);
});

// Get a game with id
router.get('/:gameId', (req, res, next) => {
    Game.findById(req.params.gameId, {
        include:[User]
    })
        .then(game => {
            if (!game) {
                throw new Error(); //same as above
            } else {
                res.json(game);
            }
        })
        .catch(next);
});

// Update a Game
// update the room name, start the game
router.put('/:gameId', (req, res, next) => { //can just anyone update a game in any way? Maybe confine user updates to adding themselves, and Admin can do more. Because you can update associations with just req.body
    Game.findById(req.params.gameId)
    .then(game => {
        return game.update(req.body); //if you get rid of the brackets, it is implicitly returned
    })
    //.then(game => game.update(req.body))
    .then(game => {
        res.status(201).json(game);
    })
    .catch(next);
});

//probably unnecessary--accomplished directly in sockets //I think it makes more sense here rather than in your sockets
router.put('/:gameId/over', (req, res, next) => {
    Game.findById(req.params.gameId, {
        include: [{
            model: User,
            attributes: ['id']
        }]
    })
    .then(game => {
        let updatePromises = [];
        game.users.forEach(user=>{
            updatePromises.push(user.userGame.update({
                score: req.body[user.id]
            }));
        });
        updatePromises.push(game.update({inProgress: false})); //this doesn't have all of the logic of the 'saveGame' from sockets, so if you go with this make sure to update it. If you don't, delete it
        return Promise.all(updatePromises)  ;  
    })
    .catch(next);
});



//create a new game(with room name)
router.put('/', (req, res, next) => { //this is a POST not a PUT. You are creating not updating
    console.log('the req body is: ', req.body);
    Game.create(req.body) //consider limiting the fields that are accepted
    .then(game => {
        res.status(201).json(game);
    })
    .catch(next);
});


//join a game;
//limit to 4 players
router.put('/:gameId/player', (req, res, next) => {
    let userId = req.body.id;
    Game.findById(req.params.gameId, {
        include: [User]
    })
    .then(game => {
        if (game.users.length < 4) {
            return game.addUser(userId);
        } else {

            throw new Error ('The room is full!');
        } 
    })
    .then(game => {
        res.status(201).json(game);
    })
    .catch(next);
});

//leave from a game;
router.delete('/:gameId/:userId', (req, res, next) => {
    Game.findById(req.params.gameId)
    .then(game => { //do you only want to do this if the game is inProgress?
        return game.removeUser(req.params.userId);
    })
    .then(() => {
        res.sendStatus(204);
    })
    .catch(next);
});


module.exports = router;
