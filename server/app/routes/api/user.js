const express = require('express');

const router = express.Router();

const path = require('path');

// const User = require(path.join('..', '..', '..', '/db/models/user'));
const User = require('../../../db/models/user');
const UserGame = require('../../../db/models/userGame');
const Game = require('../../../db/models/game');


// Get all users
router.get('/', (req, res, next) => {
    User.findAll({
        include: [{
            model: Game
        }]
    })
        .then(users => {
            if (!users) {
                throw new Error('Unable to access user list');
            } else {
                res.json(users);
            }
        })
        .catch(next);
});



// Update user
router.put('/:userId', (req, res, next) => {

    if (req.user.adminStatus) {
        User.findById(req.params.userId)
            .then(user => {
                return user.update(req.body);
            })
            .then(updatedUser => res.json(updatedUser))
            .catch(next);
    } else {
        res.status(403).send();
    }
});


// Delete user
router.delete('/:userId', (req, res, next) => {
    if (req.user.adminStatus) {
        User.destroy({
                where: {
                    id: req.params.userId
                }
            })
            .then(deletedUser => res.json(deletedUser))
            .catch(next);

    } else {
        res.status(403).send();
    }
});


module.exports = router;
