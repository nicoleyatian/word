var User = require('../db/models/user');
var Game = require('../db/models/game');
var UserGame = require('../db/models/userGame');

module.exports = {
    startGame: function(gameId) { //why not have this happen in the back from a frontend call before you call 'getStartBoard'?
        Game.findById(gameId)
            .then(game => game.update({
                isWaiting: false
            }))
            .catch(function(e) {
                console.error('the game did not start correctly!', e);
            });
    },

    saveGame: function(gameObj, winnersArray, ourWords) { //I see why you have this here based on the setTimeout, but I don't like it much. 
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
                console.error('the game did not save correctly!', e); //this would probably be a useful message to the user, so consider emitting it to the frontends
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
