app.controller('LeaderBoardCtrl', function($scope, LeaderBoardFactory, $state, AuthService) {
    console.log(' 1')
    LeaderBoardFactory.AllPlayers()
    .then(players => {
        players.forEach(player => {
            player.games_won = player.winner.length;
            player.games_played = player.games.length;
            if (player.games.length > 0) {
                var scores = player.games.map(game => game.userGame.score)
                player.highestScore = Math.max(...scores)
                player.longestWord =  player.games.sort((a, b) => b.userGame.longestWord.length - a.userGame.longestWord.length)[0].userGame.longestWord
                player.win_percentage = ((player.winner.length/player.games.length)*100).toFixed(0) + '%';
            } else {
                player.highestScore = 0;
                player.win_percentage = 0 + '%';
                player.longestWord = '';
            }

        })
        $scope.players = players;
    })
});
