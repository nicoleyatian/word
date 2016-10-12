app.factory('LeaderBoardFactory', function ($http) {
	var LeaderBoardFactory = {};

	LeaderBoardFactory.AllPlayers = function() {
		return $http.get('/api/users')
		.then(res=>res.data)
	}


	return LeaderBoardFactory;
});
