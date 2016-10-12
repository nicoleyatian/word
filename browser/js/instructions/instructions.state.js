app.config(function($stateProvider){
	$stateProvider.state("Instructions", {
		url: "/instructions",
		templateUrl: "js/instructions/instructions.html",
		controller: function($scope){
			$scope.clicked=false;
		}
	})
})