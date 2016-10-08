app.config(function($stateProvider) {
    $stateProvider.state('Game', {
        url: '/game/:roomname',
        templateUrl: 'js/game-state/page.html',
        controller: "GameCtrl",
        data: {
            authenticate: true
        }
    });
});


app.controller('GameCtrl', function($scope, BoardFactory, Socket, $stateParams, AuthService, $state, LobbyFactory, $rootScope) {

    AuthService.getLoggedInUser()
        .then(function(user) {
            console.log('user from AuthService', user);
            $scope.user = user;
            $scope.exports.playerId = user.id;
        });

    $scope.roomName = $stateParams.roomname;

    $scope.otherPlayers = [];

    $scope.gameLength = 10;

    $scope.exports = {
        wordObj: {},
        word: "",
        playerId: null,
        stateNumber: 0,
        pointsEarned: null
    };

    $scope.mouseIsDown = false;
    $scope.draggingAllowed = false;

    $scope.style = null;
    $scope.message = '';
    $scope.freeze = false;

    $scope.checkSelected = function(id) {
        return id in $scope.exports.wordObj;
    };

    $scope.toggleDrag = function() {
        $scope.draggingAllowed = !$scope.draggingAllowed;
    };

    $scope.mouseDown = function() {
        $scope.mouseIsDown = true;
    };

    $scope.mouseUp = function() {
        $scope.mouseIsDown = false;
        if ($scope.draggingAllowed && $scope.exports.word.length > 1) $scope.submit($scope.exports);
    };

    $scope.drag = function(space, id) {
        if ($scope.mouseIsDown && $scope.draggingAllowed) {
            $scope.click(space, id);
        }
    };



    //get the current room info
    BoardFactory.getCurrentRoom($stateParams.roomname)
        .then(room => {
            console.log(room)
            $scope.gameId = room.id;
            $scope.otherPlayers = room.users.filter(user => user.id !== $scope.user.id);
            $scope.otherPlayers.forEach(player => { player.score = 0 })
            LobbyFactory.joinGame(room.id, $scope.user.id);
        });

    $scope.hideBoard = true;

    // Start the game when all players have joined room
    $scope.startGame = function() {
        var userIds = $scope.otherPlayers.map(user => user.id);
        userIds.push($scope.user.id);
        console.log('op', $scope.otherPlayers, 'ui', userIds);
        BoardFactory.getStartBoard($scope.gameLength, $scope.gameId, userIds);
    };


    //Quit the room, back to lobby
    $scope.quit = function() {
        $rootScope.hideNavbar = false;
        $state.go('lobby')
    };


    $scope.board = [
        ['b', 'a', 'd', 'e', 'a', 'r'],
        ['e', 'f', 'g', 'l', 'm', 'e'],
        ['h', 'i', 'j', 'f', 'o', 'a'],
        ['c', 'a', 'd', 'e', 'a', 'r'],
        ['e', 'f', 'g', 'l', 'd', 'e'],
        ['h', 'i', 'j', 'f', 'o', 'a']
    ];

    $scope.messages = null;

    $scope.size = 3;
    $scope.score = 0;


    $scope.click = function(space, id) {
        if ($scope.freeze) {
            return; }
        console.log('clicked ', space, id);
        var ltrsSelected = Object.keys($scope.exports.wordObj);
        var previousLtr = ltrsSelected[ltrsSelected.length - 2];
        var lastLtr = ltrsSelected[ltrsSelected.length - 1];
        if (!ltrsSelected.length || validSelect(id, ltrsSelected)) {
            $scope.exports.word += space;
            $scope.exports.wordObj[id] = space;
            console.log($scope.exports);
        } else if (id === previousLtr) {
            $scope.exports.word = $scope.exports.word.substring(0, $scope.exports.word.length - 1);
            delete $scope.exports.wordObj[lastLtr];
        } else if (ltrsSelected.length === 1 && id === lastLtr) {
            $scope.exports.word = "";
            delete $scope.exports.wordObj[lastLtr];
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
        var rowOffset = Math.abs(row - rowLast);
        var colOffset = Math.abs(col - colLast);
        return (rowOffset <= 1 && colOffset <= 1);
    }

    function clearIfConflicting(updateWordObj, exportWordObj) {
        var tilesMoved = Object.keys(updateWordObj);
        var myWordTiles = Object.keys(exportWordObj);
        if (tilesMoved.some(coord => myWordTiles.includes(coord))) $scope.clear();
    }

    $scope.clear = function() {
        $scope.exports.word = "";
        $scope.exports.wordObj = {};
    };


    $scope.submit = function(obj) {
        console.log('submitting ', obj);
        BoardFactory.submit(obj);
        $scope.clear();
    };

    $scope.shuffle = BoardFactory.shuffle;


    $scope.updateBoard = function(wordObj) {
        console.log('scope.board', $scope.board);
        for (var key in wordObj) {
            var coords = key.split('-');
            var row = coords[0];
            var col = coords[1];
            $scope.board[row][col] = wordObj[key];
        }
    };

    $scope.updateScore = function(points, playerId) {
        console.log('update score points', points);
        if (playerId === $scope.user.id) {
            $scope.score += points;
            $scope.exports.pointsEarned = null;
        } else {
            for (var player in $scope.otherPlayers) {
                if ($scope.otherPlayers[player].id === playerId) {
                    $scope.otherPlayers[player].score += points;
                    break;
                }
            }
            $scope.exports.pointsEarned = null;
        }
    };


    $scope.update = function(updateObj) {
        $scope.updateScore(updateObj.pointsEarned, updateObj.playerId);
        $scope.updateBoard(updateObj.wordObj);
        if (+$scope.user.id===+updateObj.playerId){
            //console.log("Not cool!");
            var player=$scope.user.username;
        }
        else{
            for (var key in $scope.otherPlayers){
                //console.log("The Others!", $scope.otherPlayers)
                if (+$scope.otherPlayers[key].id===+updateObj.playerId){
                    var player=$scope.otherPlayers[key].username;
                    break;
                }
            }
        }
        $scope.message=player+" played "+updateObj.word+" for "+updateObj.pointsEarned+" points!";
        console.log('its updating!');
        clearIfConflicting(updateObj, $scope.exports.wordObj);
        $scope.exports.stateNumber = updateObj.stateNumber;
        $scope.$evalAsync();
    };

    $scope.replay = function() {
        console.log("GO!");
        LobbyFactory.newGame($scope.roomName);
        $scope.startGame();
    };

    $rootScope.hideNavbar = true;

    $scope.$on('$destroy', function() { Socket.disconnect(); });
    console.log('update 1.1')
    Socket.on('connect', function() {

        Socket.emit('joinRoom', $scope.user, $scope.roomName, $scope.gameId);
        console.log('emitting "join room" event to server', $scope.roomName);

        Socket.on('roomJoinSuccess', function(user) {
            console.log('new user joining', user.id);
            user.score = 0;
            $scope.otherPlayers.push(user);
            $scope.$digest();

        });

        Socket.on('startBoard', function(board) {
            $scope.freeze = false;
            console.log('board! ', board);
            $scope.board = board;
            // setInterval(function(){
            $scope.hideBoard = false;
            $scope.$evalAsync();
            // }, 3000);
        });

        Socket.on('wordValidated', function(updateObj) {
            console.log('word is validated');
            $scope.update(updateObj);
            $scope.lastWordPlayed = updateObj.word;
            $scope.$evalAsync();
        });

        Socket.on('boardShuffled', function(board, userId, stateNumber) {
            $scope.board = board;
            $scope.updateScore(-5, userId);
            $scope.clear();
            $scope.exports.stateNumber = stateNumber;
            $scope.message = userId + " shuffled the board!";
            console.log($scope.message);
            $scope.$evalAsync();
        });

        Socket.on('playerDisconnected', function(user) {
            console.log('playerDisconnected', user.id);
            $scope.otherPlayers = $scope.otherPlayers.map(otherPlayers => otherPlayers.id !== user.id);

            $scope.$evalAsync();
        });

        Socket.on('gameOver', function(winnersArray, words) {
            $scope.clear();
            $scope.$digest();
            $scope.freeze = true;
            console.log('game is over, winners: ', winnersArray, words);
        });
    });
});
