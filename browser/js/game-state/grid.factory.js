app.factory ("BoardFactory", function($http, Socket){
	return{
		submit: function(obj){
			Socket.emit('submitWord', obj);
		},

		// findAllOtherUsers: function(game) {
		// 	return $http.get('/api/games/'+ game.id)
		// 	.then(res => res.data)
		// },

		getCurrentRoom: function(roomname) {
			return $http.get('/api/games/rooms/'+roomname) 
			.then(res => res.data)
		}

	}
});
