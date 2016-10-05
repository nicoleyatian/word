app.config(function($stateProvider){
	$stateProvider.state("UserProfile",{
		url: "/users/:userId",
		templateUrl:"js/user_profile/profile.template.html",
		controller: "UserCtrl"
	})
	$stateProvider.state("GameRecord", {
		url:"/users/:userId/games",
		templateUrl: "js/user_profile/games.html",
		controller: "GameRecordCtrl"
	})
})

app.controller("UserCtrl", function($scope, UserFactory, $stateParams){
	UserFactory.fetchInformation($stateParams.userId)
	.then(function(user){
		$scope.user=user;
		return user
	})
	.then(function(user){
		$scope.updated=$scope.user.updatedAt.getDay();
	})
})

app.controller("GameRecordCtrl",function($scope, UserFactory, $stateParams){
	UserFactory.fetchInformation($stateParams.userId)
	.then(function(user){
		$scope.user=user;
	})
	.then(function(user){
	UserFactory.fetchGames($stateParams.userId)
	})
	.then(function(games){
		$scope.games=games;
	})
})