app.controller('LobbyCtrl', function ($scope, LobbyFactory, rooms, $state) {
	$scope.rooms = rooms;
	$scope.roomNameForm = false;
	$scope.user = {
		id: 1
	}

	LobbyFactory.AllPlayers()
	.then(players=>{	
		players.forEach(player => {
			player.score = player.highestScore
		})
		$scope.players = players;
	})

	$scope.joinGame =  function(roomId) {
		LobbyFactory.joinGame(roomId, $scope.user.id);
	}
	
	$scope.newRoom = function(roomInfo) {
		LobbyFactory.newGame(roomInfo);
		$scope.roomNameForm = false;
	}
	$scope.showForm = function(){
		$scope.roomNameForm = true;
	}

});