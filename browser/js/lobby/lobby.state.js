app.config(function ($stateProvider) {

    $stateProvider.state('lobby', {
        url: '/lobby',
        templateUrl: 'js/lobby/lobby.template.html',
        resolve: {
        	rooms: function(LobbyFactory) {
        		return LobbyFactory.getAllRooms();
        	}
        },
        controller: 'LobbyCtrl',
        data: {
            authenticate: true
        }
    });

});