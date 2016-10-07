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
