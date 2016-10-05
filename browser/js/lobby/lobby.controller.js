app.controller('LobbyCtrl', function($scope, LobbyFactory, rooms, $state, AuthService) {

    AuthService.getLoggedInUser()
        .then(function(user) {
            console.log('user from AuthService', user);
            $scope.user = user;
        });

    $scope.rooms = rooms;
    $scope.roomNameForm = false;
    // $scope.user = {
    //  id: 3
    // }


    LobbyFactory.AllPlayers()
        .then(players => {
            players.forEach(player => {
                if (player.games.length > 0) {
                    var scores = player.games.map(game => game.userGame.score)
                    player.score = Math.max(...scores)
                } else {
                    player.score = 0;
                }

            })
            $scope.players = players;
        })

    $scope.joinGame = function(room) {
        $state.go('Game', { roomname: room.roomname })
    }

    $scope.newRoom = function(roomInfo) {
        LobbyFactory.newGame(roomInfo);
        $scope.roomNameForm = false;
    }
    $scope.showForm = function() {
        $scope.roomNameForm = true;
    }

});
