var User = require('../db/models/user');
var Game = require('../db/models/game');
var UserGame = require('../db/models/userGame');

module.exports = { //these seem like they should be actual requests that hit a route. Why are they in this socket logic?
    startGame: function(gameId) {
        Game.findById(gameId)
            .then(game => game.update({
                isWaiting: false
            }))
            .catch(function(e) {
                console.error('the game did not start correctly!', e); //these might be useful for the user as well -- are you sending this to the front at all?
            });
    },

    saveGame: function(gameObj, winnersArray, ourWords) {
        console.log('save game gameObject.id: ', gameObj.id);
        var winnerId = null;
        if (winnersArray.length === 1) winnerId = winnersArray[0];
        Game.findById(gameObj.id, {
                include: [{
                    model: User,
                    attributes: ['id']
                }]
            })
            .then(game => {
                let updatePromises = [];
                game.users.forEach(user => {
                    updatePromises.push(user.userGame.update({
                        score: gameObj.playerScores[user.id],
                        longestWord: ourWords[user.id]
                    }));
                }); //you could also use a map to just mutate the game array to a new array of updatePromises (but I see these following promises, so it doesn't make it that much cleaner honestly)
                updatePromises.push(game.setWinner(winnerId));
                updatePromises.push(game.update({ inProgress: false }));
                console.log('about to run updated scores: ', updatePromises);
                return Promise.all(updatePromises);
            })
            .catch(function(e) {
                console.error('the game did not save correctly!', e);
            });
    },

    quitGame: function(gameId, userId) { //This makes sense here AND in the route. So I could click a button to leave that sends a request to the back, or I could just leave the tab.
        Game.findById(gameId)
            .then(game => {
                if (game.inProgress) {
                    return game.removeUser(userId);
                } else return;
            })
            .catch(e => {
                console.log('the user was not removed correctly!')
            });
    }
};
