app.factory("BoardFactory", function($http, Socket){
	return{
		submit: function(obj){
			Socket.emit('submitWord', obj);
		}

	}
})
