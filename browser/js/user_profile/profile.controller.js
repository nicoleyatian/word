app.config(function($stateProvider){
	$stateProvider.state("UserProfile",{
		url: "/users/:userId",
		templateUrl:"js/user_profile/profile.template.html",
		controller: "UserCtrl"
	})
})

app.controller("UserCtrl", function($scope, UserFactory, $stateParams){
	UserFactory.fetchInformation($stateParams.userId)
	.then(function(user){
		$scope.user=user;
	})
})