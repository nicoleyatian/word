app.controller('LeaderBoardCtrl', function($scope, LeaderBoardFactory, $state, AuthService) {
    console.log(' 1')
    LeaderBoardFactory.AllPlayers()
    .then(players => {
        players.forEach(player => {
            if (player.games.length > 0) {
                var scores = player.games.map(game => game.userGame.score)
                player.highestScore = Math.max(...scores)
            } else {
                player.highestScore = 0;
            }
            player.games_won = player.winner.length;
            player.games_played = player.games.length;
            if(player.games.length===0){
            	player.win_percentage = 0 + '%'
            } else {
            	player.win_percentage = ((player.winner.length/player.games.length)*100).toFixed(0) + '%';
            }

        })
        $scope.players = players;
    })
});
