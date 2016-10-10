const express = require('express');

const router = express.Router();

const path = require('path');

// const User = require(path.join('..', '..', '..', '/db/models/user'));
const Game = require('../../../db/models/game');
const User = require('../../../db/models/user');
const Promise = require('sequelize').Promise;

// Get all games
router.get('/', (req, res, next) => {
    Game.findAll({
        include:[{model: User}]
    })
        .then(games => {
            if (!games) {
                throw new Error();
            } else {
                res.json(games);
            }
        })
        .catch(next);
});

//Get all inProgress Game (rooms in the lobby)
router.get('/rooms', (req, res, next) => {
    Game.findAll({
        where: {
            isWaiting: true
        },
        include:[{model: User}]
    })
        .then(games => {
            if (!games) {
                throw new Error();
            } else {
                res.json(games);
            }
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
        .then(games => {
            if (!games) {
                throw new Error();
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
                throw new Error();
            } else {
                res.json(game);
            }
        })
        .catch(next);
});

// Update a Game
// update the room name, start the game
router.put('/:gameId', (req, res, next) => {
    Game.findById(req.params.gameId)
    .then(game => {
        return game.update(req.body);
    })
    .then(game => {
        res.status(201).json(game);
    })
    .catch(next);
});

//probably unnecessary--accomplished directly in sockets
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
        updatePromises.push(game.update({inProgress: false}));
        return Promise.all(updatePromises)  ;  
    })
    .catch(next);
});



//create a new game(with room name)
router.put('/', (req, res, next) => {
    console.log('the req body is: ', req.body);
    Game.create(req.body)
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
    .then(game => {
        return game.removeUser(req.params.userId);
    })
    .then(() => {
        res.sendStatus(204);
    })
    .catch(next);
});


module.exports = router;
