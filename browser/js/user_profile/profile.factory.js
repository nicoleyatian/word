app.factory("UserFactory", function($http){
	return {
		fetchInformation: function(id){
			return $http.get("/api/users/"+id)
			.then(function(user){
				return user.data;
			})
		},
		fetchGames: function(id){
			return $http.get("/api/users/"+id+"/games")
			.then(function(games){
				return games.data;
			})
		}
	}
})