app.config(function($stateProvider){
	$stateProvider.state('Game', {
		url: '/game/:roomname',
		templateUrl: 'js/new/page.html',
		controller: "GameCtrl"
	})
})

app.controller('GameCtrl', function($scope, BoardFactory){
$scope.exports={
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
$scope.playerName='Me';
$scope.player=$scope.exports.playerId;
$scope.otherPlayers=[['You', 0], ['Him', 0], ['Her', 0]];
$scope.click=function(space, id){
	$scope.exports.word+=space;
	$scope.exports.wordObj[id]=space
	console.log($scope.exports);
}

$scope.submit=function(){
	return BoardFactory.submit()
	.then(function(x){
		$scope.exports.wordObj={};
		$scope.exports.word="";
	})
}

$scope.updateBoard=function(object){
	console.log($scope.board);
	for (var key in object){
		$scope.board[key[0]][key[2]]=object[key];
	}
}

})