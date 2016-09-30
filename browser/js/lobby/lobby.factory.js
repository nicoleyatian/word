app.factory('LobbyFactory', function ($http) {
	var LobbyFactory = {};
	var tempRooms = []; //work with socket?

	LobbyFactory.getAllRooms = function(){
		return $http.get('/api/games/rooms')
		.then(res => res.data)
		.then(rooms => {
			angular.copy(rooms, tempRooms);
			return tempRooms;
		})
	};

	LobbyFactory.joinGame = function(roomId, userId) {
		return $http.put('/api/games/'+ roomId +'/player', {id: userId})
		.then(res=>res.data)
	};

	LobbyFactory.newGame = function(roomInfo) {
		return $http.put('/api/games', roomInfo)
		.then(res => res.data)
		.then(room => {tempRooms.push(room)})
	}

	LobbyFactory.AllPlayers = function() {
		return $http.get('/api/users')
		.then(res=>res.data)
	}

	return LobbyFactory;
});