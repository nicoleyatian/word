app.config(function ($stateProvider) {

    $stateProvider.state('leaderBoard', {
        url: '/leaderBoard',
        templateUrl: 'js/leaderBoard/leaderBoard.template.html',
        resolve: {
        	allPlayers: function(LeaderBoardFactory) {
        		return LeaderBoardFactory.AllPlayers;
        	},
            
        },
        controller: 'LeaderBoardCtrl'
    });

});