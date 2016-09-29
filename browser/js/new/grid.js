app.config(function($stateProvider){
	$stateProvider.state('Game', {
		url: '/game',
		templateUrl: 'js/new/page.html',
		controller: "GameCtrl"
	})
})

app.controller('GameCtrl', function($scope){
$scope.board=[
['a', 'b', 'c'],
['e', 'f', 'g'],
['h', 'i', 'j']
];
console.log($scope.board[0][1]);
$scope.word="";
$scope.size=3;
// $scope.createGrid=function(size){
// 	var board="";
// 	var alphabet="abcdefghijklmnopqrstuvwxyz";
// 	for (var i=0; i<size; i++){
// 		board+="<tr>";
// 		for (var x=0; x<size; x++){
// 			var id=i.toString()+"-"+x.toString();
// 			board+="<td data-status='not-selected' id='"+id+"'></td>"
// 		}
// 		board+="</tr>";
// 	}
// 	document.getElementById('grid').innerHTML=(board);

// }

// $scope.assign_letters=function(array){
// 	console.log('hi');
// 	for (var i=0; i<array.length; i++){
// 		for (var x=0; x<array[i].length; x++){
// 			console.log(array[i][x]);
// 			var Id=i.toString()+"-"+x.toString();
// 			var element=document.getElementById(Id);
// 			var node=document.createTextNode(array[i][x]);
// 			element.appendChild(node);
// 			element.onclick=function(){
// 				$scope.word+=element.children.toString();
// 				console.log($scope.word);
// 			}
// 		}
// 	}
// }
// $scope.setup=function(size, array){
// 	$scope.createGrid(size);
// 	$scope.assign_letters(array);
// }
// $scope.setup($scope.size, $scope.board);

})