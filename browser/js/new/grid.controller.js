app.config(function($stateProvider) {
    $stateProvider.state('Game', {
        url: '/game/:roomname',
        templateUrl: 'js/new/page.html',
        controller: "GameCtrl"
    })
})

app.controller('GameCtrl', function($scope, BoardFactory) {
    $scope.exports = {
        wordObj: {},
        word: "",
        playerId: 3,
        stateNumber: 1
    }
    $scope.board = [
        ['a', 'b', 'c'],
        ['e', 'f', 'g'],
        ['h', 'i', 'j']
    ];
    $scope.word = "";
    $scope.size = 3;
    $scope.score = 0;
    $scope.playerName = 'Me';
    $scope.player = $scope.exports.playerId;
    $scope.otherPlayers = [
        ['You', 0],
        ['Him', 0],
        ['Her', 0]
    ];

    $scope.click = function(space, id) {
    	console.log('clicked ', space, id );
        var ltrsSelected = Object.keys($scope.exports.wordObj);
        if (!ltrsSelected.length || validSelect(id, ltrsSelected)) {
            $scope.exports.word += space;
            $scope.exports.wordObj[id] = space;
            console.log($scope.exports);
        }
    };

    //makes sure letter is adjacent to prev ltr, and hasn't been used yet
    function validSelect(ltrId, otherLtrsIds) {
    	if (otherLtrsIds.includes(ltrId)) return false;
        var coords = ltrId.split('-');
        var row = coords[0];
        var col = coords[1];
        var lastLtrId = otherLtrsIds.pop();
        var coordsLast = lastLtrId.split('-');
        var rowLast = coordsLast[0];
        var colLast = coordsLast[1];
        var rowOffset = Math.abs(row-rowLast);
        var colOffset = Math.abs(col-colLast);
        return (rowOffset<=1 && colOffset<=1);
    }

    function clearIfConflicting(updateWordObj, exportWordObj){
    	var tilesMoved = Object.keys(updateWordObj);
    	var myWordTiles = Object.keys(exportWordObj);
    	if (tilesMoved.some(coord => myWordTiles.includes(coord))) $scope.clear();
    }

    $scope.clear = function() {
    	$scope.exports.word = "";
    	$scope.exports.wordObj = {};
    };

    $scope.submit = function() {
        return BoardFactory.submit()
            .then(function(x) {
                $scope.exports.wordObj = {};
                $scope.exports.word = "";
            });
    };

    $scope.updateBoard = function(object) {
        console.log($scope.board);
        for (var key in object) {
            var coords = key.split('-');
            var row = coords[0];
            var col = coords[1];
            $scope.board[key[0]][key[2]] = object[key];
        }
    };

})
