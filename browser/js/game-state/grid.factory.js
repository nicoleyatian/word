app.factory ("BoardFactory", function($http, Socket){
	return{
		getStartBoard: function(gameLength, gameId, userIds){
			console.log('factory. gl: ', gameLength);
			Socket.emit('getStartBoard', gameLength, gameId, userIds);
		},

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
		},

		quitFromRoom: function(gameId, userId) {
			// Socket.emit('disconnect', roomName, userId);
			return $http.delete('/api/games/'+gameId+'/'+userId)
		}
	}
});
