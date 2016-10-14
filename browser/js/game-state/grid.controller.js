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


app.controller('GameCtrl', function($scope, BoardFactory, Socket, $stateParams, AuthService, $state, LobbyFactory, $rootScope, $q) {

    $scope.roomName = $stateParams.roomname;
    $scope.hideBoard = false; //true; REVERT
    $scope.hideStart = false; //false; REVERT
    $scope.hideCrabdance = true;
    $scope.crabdances = 0;
    $rootScope.hideNavbar = true;
    $scope.freeze = false; //false; REVERT
    $scope.gameOver = false;
    $scope.highlighted = [];

    $scope.otherPlayers = [];
    $scope.gameLength = 180;
    $scope.mouseIsDown = false;
    $scope.draggingAllowed = false;

    $scope.style = null;
    $scope.message = ' ';
    // $scope.winOrLose = null;
    //gets set to the timeout that displays a message
    $scope.timeout = null;
    //gets set to the timeout that displays crabdance
    var dancing;

    $scope.score = 0;

    $scope.board = [
        ['A', 'B', 'C', 'A', 'B', 'C'],
        ['D', 'E', 'F', 'A', 'B', 'C'],
        ['G', 'H', 'I', 'A', 'B', 'C'],
        ['A', 'B', 'C', 'A', 'B', 'C'],
        ['D', 'E', 'F', 'A', 'B', 'C'],
        ['G', 'H', 'I', 'A', 'B', 'C']
    ];

    $scope.exports = {
        wordObj: {},
        word: "",
        playerId: null,
        stateNumber: 0,
        pointsEarned: null
    };



    $scope.checkSelected = function(id) {
        return id in $scope.exports.wordObj;
    };

    $scope.toggleDrag = function() {
        $scope.draggingAllowed = !$scope.draggingAllowed;
    };

    $scope.mouseDown = function() {
        console.log('mouse is down')
        $scope.mouseIsDown = true;
    };

    $scope.mouseUp = function() {
        console.log('mouse is up');
        $scope.mouseIsDown = false;
        if ($scope.draggingAllowed && $scope.exports.word.length > 1) $scope.submit($scope.exports);
    };

    $scope.touchActivated = function() {
        console.log('touch is activated: ' + arguments);
        $scope.touchIsActivated = true;
    }

    $scope.touchStopped = function(e) {
        console.log('touch is stopped: ' + e);
        $scope.touchIsActivated = false;
        if ($scope.draggingAllowed && $scope.exports.word.length > 1) $scope.submit($scope.exports);
    }

    // $element.bind('touchstart', function (e) {
    //   $scope.isSelecting = true;
    //   $scope.click(e)
    // })


    // $element.bind('mousemove touchmove', function (e) {
    //   if ($scope.isSelecting) {
    //     $scope.click(e)
    //   }
    // })

    // $element.bind('mouseup touchend', function (e) {
    //   $scope.isSelecting = false;
    //   if ($scope.draggingAllowed && $scope.exports.word.length > 1) $scope.submit($scope.exports);
    // })


    $scope.drag = function(space, id) {
        //console.log('mouse enter: ' + id);
        if ($scope.mouseIsDown && $scope.draggingAllowed) {
            $scope.click(space, id);
        }
    };

    // function div_overlap(jqo, left, top) {
    //     console.log('div overlapped: ' + jqo);
    //     var d = jqo.offset();
    //     return top >= d.top && left >= d.left && left <= (d.left+jqo[0].offsetWidth) && top <= (d.top+jqo[0].offsetHeight);
    // }

    // touchmove = function(event) {
    //     // Prevent scrolling on this element
    //     event.preventDefault();
    // }

    // $(".cell").bind("mouseenter touchmove", function(evt){
    //     console.log('binding mouseenter and touchmove', evt);
    //     $(".cell").each(function() {
    //         console.log('for each element');
    //        if (div_overlap(this, evt.pageX, evt.pageY)){
    //         console.log('entering div_overlap');
    //           if (!this.hasClass('selected')) {
    //             this.addClass('selected');
    //           }
    //        }
    //     });
    // });

    // angular.element('.cell').on("click", function(evt){
    //     console.log('binding mouseenter and touchmove', evt);
    // $(".cell").each(function() {
    //     console.log('for each element');
    //    if (div_overlap(this, evt.pageX, evt.pageY)){
    //     console.log('entering div_overlap');
    //       if (!this.hasClass('selected')) {
    //         this.addClass('selected');
    //       }
    //    }
    // });
    // });

    // $element.children()(function(evt){
    //     console.log('binding mouseenter and touchmove', evt);
    // $(".cell").each(function() {
    //     console.log('for each element');
    //    if (div_overlap(this, evt.pageX, evt.pageY)){
    //     console.log('entering div_overlap');
    //       if (!this.hasClass('selected')) {
    //         this.addClass('selected');
    //       }
    //    }
    // });
    // });


    // $element.bind("touchmove", function(evt){
    //     console.log('binding mouseenter and touchmove', evt);
    //     // $(".cell").each(function() {
    //     //     console.log('for each element');
    //     //    if (div_overlap(this, evt.pageX, evt.pageY)){
    //     //     console.log('entering div_overlap');
    //     //       if (!this.hasClass('selected')) {
    //     //         this.addClass('selected');
    //     //       }
    //     //    }
    //     // });
    // });

    // angular.element('.cell').bind("touchmove", function(evt){
    //     console.log('binding mouseenter and touchmove', evt);
    //     angular.element('.cell').each(function() {
    //         console.log('for each element');
    //        if (div_overlap(this, evt.pageX, evt.pageY)){
    //         console.log('entering div_overlap');
    //           if (!this.hasClass('selected')) {
    //             this.addClass('selected');
    //           }
    //        }
    //     });
    // });

    $scope.mobileDrag = function(space, id) {
        console.log('touch is dragged: ' + space + " : " + id);
        if ($scope.touchIsActivated && $scope.draggingAllowed) {
            $scope.click(space, id);
        }
    };

    $scope.click = function(space, id) {
        if ($scope.freeze) {
            return;
        }
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


    //get the current room info
    // BoardFactory.getCurrentRoom($stateParams.roomname)
    //     .then(room => {
    //         console.log(room)
    //         $scope.gameId = room.id;
    //         $scope.otherPlayers = room.users.filter(user => user.id !== $scope.user.id);
    //         $scope.otherPlayers.forEach(player => { player.score = 0 })
    //         LobbyFactory.joinGame(room.id, $scope.user.id);
    //     });



    // Start the game when all players have joined room
    $scope.startGame = function() {
        var userIds = $scope.otherPlayers.map(user => user.id);
        userIds.push($scope.user.id);
        console.log('op', $scope.otherPlayers, 'ui', userIds);
        // $scope.winOrLose = null;
        BoardFactory.getStartBoard($scope.gameLength, $scope.gameId, userIds, $scope.roomName);
    };


    //Quit the room, back to lobby
    $scope.quit = function() {
        $rootScope.hideNavbar = false;
        $state.go('lobby', { reload: true })
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
        console.log("clear-if", tilesMoved, myWordTiles);
        if (tilesMoved.some(coord => myWordTiles.includes(coord))) {
            $scope.clear();
            console.log("cleared!");
        }
    }

    $scope.clear = function() {
        $scope.exports.word = "";
        $scope.exports.wordObj = {};
    };


    $scope.submit = function(obj) {
        console.log('submitting ', obj);
        BoardFactory.submit(obj, $scope.roomName);
        $scope.clear();
    };

    $scope.shuffle = BoardFactory.shuffle;

    //Shake logic: use Shake.js to allow mobile users to 
    //shuffle board by shaking
    var myShakeEvent = new Shake({
        threshold: 15
    });
    myShakeEvent.start();
    window.addEventListener('shake', function(){
        BoardFactory.shuffle($scope.user, $scope.roomName);
    }, false);


    $scope.updateBoard = function(wordObj) {
        console.log('scope.board', $scope.board);
        var coords = Object.keys(wordObj);
        coords.forEach(function(coord) {
            var parsedCoord = coord.split('-');
            var row = parsedCoord[0];
            var col = parsedCoord[1];
            $scope.board[row][col] = wordObj[coord];
        });
        highlightLetters(coords);
    };

    function highlightLetters(coordArray) {
        $scope.highlighted.push(...coordArray);
        $scope.$evalAsync();
        setTimeout(function() {
            var i;
            coordArray.forEach(function(coord) {
                i = $scope.highlighted.indexOf(coord);
                $scope.highlighted.splice(i, 1);
            });
        }, 1000);
    }

    $scope.checkHighlighted = function(coord){
        return $scope.highlighted.includes(coord);
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
        if (updateObj.word.length > 5 && updateObj.playerId != $scope.user.id) {
            if (!$scope.crabdances) crabdance();
            $scope.crabdances++;
        }
        if (+$scope.user.id === +updateObj.playerId) {
            var player = $scope.user.username;
        } else {
            for (var key in $scope.otherPlayers) {
                if (+$scope.otherPlayers[key].id === +updateObj.playerId) {
                    var player = $scope.otherPlayers[key].username;
                    break;
                }
            }
        }
        $scope.message = player + " played " + updateObj.word + " for " + updateObj.pointsEarned + " points!";
        if ($scope.timeout) {
            clearTimeout($scope.timeout);
        }
        $scope.timeout = setTimeout(function() {
            $scope.message = ' ';
        }, 3000);
        console.log('its updating!');
        clearIfConflicting(updateObj.wordObj, $scope.exports.wordObj);
        $scope.exports.stateNumber = updateObj.stateNumber;
        console.log('updated obj', updateObj);
    };

    function crabdance() {
        // $scope.hideBoard = true;
        $scope.freeze = true;
        $scope.hideCrabdance = false;
        console.log('dance crab!', $scope.crabdances);
        dancing = setTimeout(function() {
            $scope.crabdances--;
            if ($scope.crabdances) {
                crabdance();
            } else {
                $scope.hideCrabdance = true;
                // $scope.hideBoard = false;
                $scope.freeze = false;
            }
        }, 3000);
    }

    $scope.replay = function() {

        LobbyFactory.newGame({ roomname: $scope.roomName })
            .then(function(game) {
                console.log("replay game obj:", game);

                $scope.gameId = game.id;
                $scope.startGame();
                var allIds = $scope.otherPlayers.map(player => player.id);
                allIds.push($scope.user.id);
                $q.all(allIds.map(id => {
                    LobbyFactory.joinGame($scope.gameId, id);
                }));
            })
            .catch(function(e) {
                console.error('error restarting the game', e);
            });
    };

    $scope.determineWinner = function(winnersArray) {
        clearTimeout($scope.timeout);
        clearTimeout(dancing);
        if (winnersArray.length === 1) {
            if (+winnersArray[0] === +$scope.user.id) {
                $scope.message = "Congratulations, you won!";
            } else {
                for (var player in $scope.otherPlayers) {
                    if (+$scope.otherPlayers[player].id === +winnersArray[0]) {
                        var winner = $scope.otherPlayers[player].username;
                        $scope.message = winner + " won. Better Luck next time.";
                    }
                }
            }
        } else {
            let winners = [];
            for (var i in winnersArray) {
                if (+winnersArray[i] === +$scope.user.id) { winners.push($scope.user.username); } else {
                    for (var player in $scope.otherPlayers) {
                        if ($scope.otherPlayers[player].id == winnersArray[i]) {
                            winners.push($scope.otherPlayers[player].username);
                            break;
                        }
                    }
                }
                console.log(winners);
                $scope.message = "The game was a tie between " + winners.join(" and ") + ".";
                // for (var i = 0; i < winners.length; i++) {
                //     if (i === winners.length - 1) { $scope.winOrLose += "and " + winners[i] + "."; } else { $scope.winOrLose += winners[i] + ", "; }
                // }
            }
        }
    };


    // $scope.$on('$stateChangeStart', function() {
    //     console.log('changestate', $scope.user.id);
    //     Socket.close();
    //     // Socket.reconnect();

    // });

    $scope.$on('$destroy', function() {
        console.log('changestate close', $scope.user.id);
        Socket.emit('leaveRoom', $scope.user, $scope.roomName, $scope.gameId);
        Socket.removeAllListeners();
        // Socket.removeListener('playerDisconnected', removePlayer);
    });





    console.log('update 1.2')

    // Socket.on('connect', function() {
    // $scope.checkConnect();

    console.log('connecting');
    $q.all([
        AuthService.getLoggedInUser()
        .then(function(user) {
            console.log('user from AuthService', user);
            $scope.user = user;
            $scope.exports.playerId = user.id;
        }),

        //get the current room info
        BoardFactory.getCurrentRoom($stateParams.roomname)
        .then(room => {
            console.log(room);
            $scope.gameId = room.id;
            $scope.otherPlayers = room.users.filter(user => user.id !== $scope.user.id);
            //$scope.otherPlayers.forEach(player => { player.score = 0 });
            LobbyFactory.joinGame(room.id, $scope.user.id);
        })
    ]).then(function() {
        Socket.emit('joinRoom', $scope.user, $scope.roomName, $scope.gameId);
        console.log('emitting "join room" event to server 8P', $scope.roomName);
    }).catch(function(e) {
        console.error('error grabbing user or room from db: ', e);
    });


    Socket.on('roomJoinSuccess', function(user) {
        console.log('new user joining', user.id);
        user.score = 0;
        $scope.otherPlayers.push(user);
        // console.log('otherPlayers', $scope.otherPlayers)
        $scope.$evalAsync();

    });

    Socket.on('startBoard', function(board) {
        $scope.freeze = false; //false; REVERT
        $scope.gameOver = false;
        console.log('board! ', board);
        $scope.board = board;
        $scope.otherPlayers.forEach(player => { player.score = 0 });
        $scope.score = 0;
        $scope.hideBoard = false;
        $scope.hideStart = true;
        $scope.message = ' ';
        // $scope.winOrLose = null;

        $scope.$evalAsync();
    });

    Socket.on('wordValidated', function(updateObj) {
        console.log('word is validated');
        $scope.update(updateObj);
        $scope.lastWordPlayed = updateObj.word;
        $scope.$evalAsync();
    });

    Socket.on('boardShuffled', function(board, user, stateNumber) {
        $scope.board = board;
        $scope.updateScore(-5, user.id);
        $scope.clear();
        $scope.exports.stateNumber = stateNumber;
        $scope.message = user.username + " shuffled the board!";
        console.log($scope.message);
        $scope.$evalAsync();
    });

    function removePlayer(user) {
        console.log('playerDisconnected', user.id);
        var player = user.username;
        $scope.message = player + " has left the game!";
        if ($scope.timeout) {
            clearTimeout($scope.timeout);
        }
        $scope.timeout = setTimeout(function() {
            $scope.message = '';
        }, 3000);
        $scope.otherPlayers = $scope.otherPlayers.filter(otherPlayer => otherPlayer.id !== user.id);
        $scope.$evalAsync();
    }

    Socket.on('playerDisconnected', function(user) {
        console.log("!!!Player disconnected!!!");
        console.log(user);
        removePlayer(user);
        if (($scope.otherPlayers.length === 0) && ($scope.freeze === false)) {
            Socket.emit("lastPlayer", $scope.roomName, $scope.user);
        }
    });

    Socket.on('gameOver', function(winnersArray) {
        $scope.clear();
        $scope.freeze = true;
        $scope.gameOver = true;
        $scope.determineWinner(winnersArray);
        $scope.$evalAsync();
        console.log('game is over, winners: ', winnersArray);
    });
    // });

});
