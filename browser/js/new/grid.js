app.config(function($stateProvider){
	$stateProvider.state('Game', {
		url: '/game',
		templateUrl: 'js/new/page.html',
		controller: "GameCtrl"
	})
})

app.controller('GameCtrl', function($scope){
$scope.export={
	wordObj: {},
	word:"",
	playerId:3,
	stateNumber: 1
}
$scope.board=[
['a', 'b', 'c'],
['e', 'f', 'g'],
['h', 'i', 'j']
];
$scope.word="";
$scope.size=3;
$scope.click=function(space, id){
	$scope.export.word+=space;
	$scope.export.wordObj[id]=space
	console.log($scope.export);
}

$scope.submit=function(){
	$scope.export.wordObj={};
	$scope.export.word="";
}

})