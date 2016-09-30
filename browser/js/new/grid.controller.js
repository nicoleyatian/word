app.config(function($stateProvider){
	$stateProvider.state('Game', {
		url: '/game',
		templateUrl: 'js/new/page.html',
		controller: "GameCtrl"
	})
})

app.controller('GameCtrl', function($scope, BoardFactory){
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
$scope.score=0;
$scope.playerName='';
$scope.player=$scope.export.playerId;
$scope.click=function(space, id){
	$scope.export.word+=space;
	$scope.export.wordObj[id]=space
	//console.log($scope.export);
}

$scope.submit=function(){
	return BoardFactory.submit()
	.then(function(x){
		$scope.export.wordObj={};
		$scope.export.word="";
	})
}

})