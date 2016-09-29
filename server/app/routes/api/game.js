const express = require('express');

const router = express.Router();

const path = require('path');

// const User = require(path.join('..', '..', '..', '/db/models/user'));
const Game = require('../../../db/models/game');
const User = require('../../../db/models/user');


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
})

//join a game;
router.put('/:gameId', (req, res, next) => {
    Game.findById(req.params.gameId)
    .then(game => {
        return game.addUser(req.body)
    })
    .then(game => {
        res.status(201).json(game)
    })
    .catch(next)
})

//leave from a game;
router.delete('/:gameId/:userId', (req, res, next) => {
    Game.findById(req.params.gameId)
    .then(game => {
        return game.removeUser(req.params.userId)
    })
    .then(() => {
        res.sendStatus(204)
    })
    .catch(next)
})


module.exports = router;
