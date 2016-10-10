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
	})

})

app.controller("GameRecordCtrl",function($scope, UserFactory, $stateParams){
	UserFactory.fetchInformation($stateParams.userId)
	.then(function(user){
		return $scope.user=user;
	})
	$scope.win=function(id){
		if (!id){
			return "Tie"
		}
		else if (id===$scope.user.id){
			return "Win";
		}
		else if (id!=$scope.user.id){
			return "Loss";
		}
	}
})