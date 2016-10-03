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
	playerId:1,
	stateNumber: 1,
	pointsEarned: 500
}
$scope.board=[
['a', 'b', 'c'],
['e', 'f', 'g'],
['h', 'i', 'j']
];

$scope.size=3;
$scope.score=0;
$scope.playerName='Me';
$scope.player=4;
$scope.otherPlayers=[{name: 'You',score: 0, id:1},
 {name:'Him',score: 0, id: 2},
 {name: 'Her', score: 0, id: 3}
];
$scope.click=function(space, id){
	$scope.exports.word+=space;
	$scope.exports.wordObj[id]=space
	console.log($scope.exports);
}

$scope.updateScore=function(points, playerId){
	if (playerId===$scope.player){
		$scope.score+=points;
		$scope.exports.pointsEarned=null;
	}
	else {
		for (var player in $scope.otherPlayers){
			if ($scope.otherPlayers[player].id===playerId){
				$scope.otherPlayers[player].score+=points;
				break;
			}
		}
		$scope.exports.pointsEarned=null;
	}
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