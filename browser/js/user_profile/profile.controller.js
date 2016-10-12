app.config(function($stateProvider) {
    $stateProvider.state("UserProfile", {
        url: "/users/:userId",
        templateUrl: "js/user_profile/profile.template.html",
        controller: "UserCtrl"
    })
    $stateProvider.state("GameRecord", {
        url: "/users/:userId/games",
        templateUrl: "js/user_profile/games.html",
        controller: "GameRecordCtrl"
    })
})

app.controller("UserCtrl", function($scope, UserFactory, $stateParams) {
    UserFactory.fetchInformation($stateParams.userId)
        .then(function(player) {
            // $scope.user=user;
            player.games_won = player.winner.length;
            player.games_played = player.games.length;
            if (player.games.length > 0) {
                var scores = player.games.map(game => game.userGame.score)
                player.highestScore = Math.max(...scores)
                player.longestWord = player.games.sort((a, b) => b.userGame.longestWord.length - a.userGame.longestWord.length)[0].userGame.longestWord
                player.win_percentage = ((player.winner.length / player.games.length) * 100).toFixed(0) + '%';
            } else {
                player.highestScore = 0;
                player.win_percentage = 0 + '%';
                player.longestWord = '';
            }

            $scope.user = player;
        })



})

app.controller("GameRecordCtrl", function($scope, UserFactory, $stateParams) {
    UserFactory.fetchInformation($stateParams.userId)
        .then(function(user) {
            return $scope.user = user;
        })
    $scope.win = function(id) {
        if (!id) {
            return "Tie"
        } else if (id === $scope.user.id) {
            return "Win";
        } else if (id != $scope.user.id) {
            return "Loss";
        }
    }
})
