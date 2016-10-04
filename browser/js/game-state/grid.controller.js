app.config(function($stateProvider) {
    $stateProvider.state('Game', {
        url: '/game/:roomname',
        templateUrl: 'js/game-state/page.html',
        controller: "GameCtrl"
    })
})

app.controller('GameCtrl', function($scope, BoardFactory, Socket, $stateParams, AuthService, $state) {

    $scope.exports = {
        wordObj: {},
        word: "",
        playerId: null,
        stateNumber: 1,
        pointsEarned: 500
    }

    AuthService.getLoggedInUser()
        .then(function(user) {
            console.log('user from AuthService', user);
            $scope.user = user;
            $scope.exports.playerId = user.id;
        });


    //get the current room info
    BoardFactory.getCurrentRoom($stateParams.roomname)
        .then(room => {
            console.log(room)
            $scope.gameId = room.id;
            $scope.otherPlayers = room.users.filter(user => user.id !== $scope.user.id);
            $scope.otherPlayers.forEach(player => { player.score = 0 })
        })


    $scope.hideBoard = true;


    // Start the game when all players have joined room
    $scope.startGame = function() {
        $scope.hideBoard = false;
    }

    //Quit the room, back to lobby
    $scope.quit = function() {
        BoardFactory.quitFromRoom($scope.gameId, $scope.user.id)
            .then(() => {
                $state.go('lobby');
            })
    }

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
    // $scope.playerName = 'Me';
    // $scope.player = $scope.user.id;

    // $scope.otherPlayers = [{ name: 'You', score: 0, id: 1 },
    //     { name: 'Him', score: 0, id: 2 },
    //     { name: 'Her', score: 0, id: 3 }
    // ];

    $scope.click = function(space, id) {
        console.log('clicked ', space, id);
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

    // $scope.submit = function() {
    //     return BoardFactory.submit()
    //         // .then(function(x) {
    //         //     $scope.exports.wordObj = {};
    //         //     $scope.exports.word = "";
    //         });
    // };
    $scope.submit = function(obj) {
        BoardFactory.submit(obj);
        $scope.clear();
    }

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
    }

    $scope.roomName = $stateParams.roomname;

    $scope.update = function(updateObj) {
        $scope.updateScore(updateObj.pointsEarned, updateObj.playerId);
        $scope.updateBoard(updateObj.wordObj);
        console.log('its updating!');
        clearIfConflicting(updateObj, $scope.exports.wordObj);
        $scope.exports.stateNumber = updateObj.stateNumber;
        $scope.$evalAsync();
    };


    Socket.on('connect', function() {

        Socket.emit('joinRoom', $scope.user, $scope.roomName);
        console.log('emitting "join room" event to server', $scope.roomName);

        Socket.on('roomJoinSuccess', function(user) {
            console.log('new user joining');
            // BoardFactory.getCurrentRoom($stateParams.roomname)
            //     .then(room => {
            //         console.log(room)
            //         $scope.gameId = room.id;
            //         $scope.otherPlayers = room.users.filter(user => user.id !== $scope.user.id);
            //         $scope.otherPlayers.forEach(player => { player.score = 0 })
            //     })
            user.score = 0;
            $scope.otherPlayers.push(user);
                $scope.$digest();
        })


        // Socket.on('roomData', function(data) {
        //     console.log('listening for roomData event from server')
        //     if (data.count.length < 2) {
        //         $scope.messages = "Waiting for another player";
        //         console.log('scope message: ', $scope.messages)
        //     } else {
        //         $scope.messages = null;
        //     }
        // })

        Socket.on('wordValidated', function(updateObj) {
            console.log('word is validated');
            $scope.update(updateObj);
        })
    })
});
