const express = require('express');

const router = express.Router();

const path = require('path');

// const User = require(path.join('..', '..', '..', '/db/models/user'));
const User = require('../../../db/models/user');
const UserGame = require('../../../db/models/userGame');
const Game = require('../../../db/models/game'); //I would HIGHLY discourage this. We want to make sure our db/index.js has run so that the appropriate associations exist (testing and random bugs are when we run into this most often). As such, I would say that you either export everything from db/index.js or require in db and find the model from there (see below)
    //const db = require('../../../db')
    //const User = db.model('user')
    // OR
    //const User = db.models.user
    // OR
    //const User = require('../../../db').User //you just have to make sure to change your db/index.js for this one, but this one is the one Nick Drane (who has worked with SQL a LOT) recommends because then you have reference to the one file and you can make changes (like to the model name) in that one file and still export the same variable name

function verifyUser(req, res, next){
    if (req.user && req.user===req.params.id){
        next();
    }else{
        res.sendStatus(401); //use error handling middleware (i.e. throw an error, attach this status, and use next)
        //with regards to 401 - if there is no req.user then 401 (unauthorized) makes sense because we are saying login and try again; but if they are logged in and trying to get info they aren't allowed, then I would expect 403 (forbidden). So maybe splitting this up into two functions would be best (and then calling them in order in the routes)
    }
}


// Get all users
router.get('/', (req, res, next) => { //so anyone can get all users, but only the user can retrieve their single value below?
    console.log(req.user); //kill this
    User.findAll({
        include: [Game, {
            model: Game,
            as: 'winner'
        }]
    })
        .then(users => {
            if (!users) {
                throw new Error('Unable to access user list');
            } else {
                res.json(users); //sanitize users before sending them to the front!
            }
        })
        .catch(next);
});





router.get('/:userId',  (req, res, next) => {
    if (+req.user.dataValues.id===+req.params.userId){ //why are you doing this rather than useing the function `verifyUser`? I don't think you should be accessing 'dataValues'. Did you try just req.user.id? That should work if memory serves
        User.findById(req.params.userId, {
            include: [Game, {
                model: Game,
                as: 'winner'
            }]
        })
            .then(user => {
                res.send(user); //sanitize me as well
            })
            .catch(next);
    } else {
        res.status(403).send(); //what if req.user doesn't exist, then we get an uncaught error :( Also, do this validation outside of here
    }
});
//get a user's games
router.get('/:userId/games', function(req, res, next){
    if (+req.user.dataValues.id===+req.params.userId){ //same as the last comment
        UserGame.findAll({
            where:{
                userId: req.params.userId
            }
        })
        .then(function(games){
            console.log("GAMES!!!"+games) //kill this
            res.send(games);
        })
        .catch(next);
    } else {
        res.status(403).send(); //don't do this here, but use sendStatus in these types of situations if you aren't sending anything else
    }
})


// Update user
router.put('/:userId',  (req, res, next) => {

    if (req.user.adminStatus) { //can users not update any of their own info? Also do this validation check outside of this function (make a util 'isAdmin' or some such name)
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

//consider having a post for an admin to create users rather than the normal signup route. Not necessary though

// Delete user
router.delete('/:userId', (req, res, next) => {
    if (req.user.adminStatus) {
        User.destroy({ //consider having paranoid on for your DB so that nothing actually is deleted
                where: {
                    id: req.params.userId
                }
            })
            .then(deletedUser => res.json(deletedUser)) //when you use destroy you get back a count of the number of rows destroyed not the deleted user
            .catch(next);

    } else {
        res.status(403).send();
    }
});


module.exports = router;
