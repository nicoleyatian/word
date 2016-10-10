'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

window.app = angular.module('FullstackGeneratedApp', ['fsaPreBuilt', 'ui.router', 'ui.bootstrap', 'ngAnimate', 'ngTouch']);

app.config(function ($urlRouterProvider, $locationProvider) {
    // This turns off hashbang urls (/#about) and changes it to something normal (/about)
    $locationProvider.html5Mode(true);
    // If we go to a URL that ui-router doesn't have registered, go to the "/" url.
    $urlRouterProvider.otherwise('/');
    // Trigger page refresh when accessing an OAuth route
    $urlRouterProvider.when('/auth/:provider', function () {
        window.location.reload();
    });
});

// This app.run is for listening to errors broadcasted by ui-router, usually originating from resolves
app.run(function ($rootScope) {
    $rootScope.$on('$stateChangeError', function (event, toState, toParams, fromState, fromParams, thrownError) {
        console.info('The following error was thrown by ui-router while transitioning to state "' + toState.name + '". The origin of this error is probably a resolve function:');
        console.error(thrownError);
    });
});

// This app.run is for controlling access to specific states.
app.run(function ($rootScope, AuthService, $state) {

    // The given state requires an authenticated user.
    var destinationStateRequiresAuth = function destinationStateRequiresAuth(state) {
        return state.data && state.data.authenticate;
    };

    // $stateChangeStart is an event fired
    // whenever the process of changing a state begins.
    $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {

        if (!destinationStateRequiresAuth(toState)) {
            // The destination state does not require authentication
            // Short circuit with return.
            return;
        }

        if (AuthService.isAuthenticated()) {
            // The user is authenticated.
            // Short circuit with return.
            return;
        }

        // Cancel navigating to new state.
        event.preventDefault();

        AuthService.getLoggedInUser().then(function (user) {
            // If a user is retrieved, then renavigate to the destination
            // (the second time, AuthService.isAuthenticated() will work)
            // otherwise, if no user is logged in, go to "login" state.
            if (user) {
                $state.go(toState.name, toParams);
            } else {
                $state.go('login');
            }
        });
    });
});

(function () {

    'use strict';

    // Hope you didn't forget Angular! Duh-doy.

    if (!window.angular) throw new Error('I can\'t find Angular!');

    var app = angular.module('fsaPreBuilt', []);

    app.factory('Socket', function () {
        if (!window.io) throw new Error('socket.io not found!');
        return window.io(window.location.origin);
    });

    // AUTH_EVENTS is used throughout our app to
    // broadcast and listen from and to the $rootScope
    // for important events about authentication flow.
    app.constant('AUTH_EVENTS', {
        loginSuccess: 'auth-login-success',
        loginFailed: 'auth-login-failed',
        logoutSuccess: 'auth-logout-success',
        sessionTimeout: 'auth-session-timeout',
        notAuthenticated: 'auth-not-authenticated',
        notAuthorized: 'auth-not-authorized'
    });

    app.factory('AuthInterceptor', function ($rootScope, $q, AUTH_EVENTS) {
        var statusDict = {
            401: AUTH_EVENTS.notAuthenticated,
            403: AUTH_EVENTS.notAuthorized,
            419: AUTH_EVENTS.sessionTimeout,
            440: AUTH_EVENTS.sessionTimeout
        };
        return {
            responseError: function responseError(response) {
                $rootScope.$broadcast(statusDict[response.status], response);
                return $q.reject(response);
            }
        };
    });

    app.config(function ($httpProvider) {
        $httpProvider.interceptors.push(['$injector', function ($injector) {
            return $injector.get('AuthInterceptor');
        }]);
    });

    app.service('AuthService', function ($http, Session, $rootScope, AUTH_EVENTS, $q) {

        function onSuccessfulLogin(response) {
            var user = response.data.user;
            Session.create(user);
            $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
            return user;
        }

        // Uses the session factory to see if an
        // authenticated user is currently registered.
        this.isAuthenticated = function () {
            return !!Session.user;
        };

        this.getLoggedInUser = function (fromServer) {

            // If an authenticated session exists, we
            // return the user attached to that session
            // with a promise. This ensures that we can
            // always interface with this method asynchronously.

            // Optionally, if true is given as the fromServer parameter,
            // then this cached value will not be used.

            if (this.isAuthenticated() && fromServer !== true) {
                return $q.when(Session.user);
            }

            // Make request GET /session.
            // If it returns a user, call onSuccessfulLogin with the response.
            // If it returns a 401 response, we catch it and instead resolve to null.
            return $http.get('/session').then(onSuccessfulLogin).catch(function () {
                return null;
            });
        };

        this.login = function (credentials) {
            return $http.post('/login', credentials).then(onSuccessfulLogin).catch(function () {
                return $q.reject({ message: 'Invalid login credentials.' });
            });
        };

        this.logout = function () {
            return $http.get('/logout').then(function () {
                Session.destroy();
                $rootScope.$broadcast(AUTH_EVENTS.logoutSuccess);
            });
        };
    });

    app.service('Session', function ($rootScope, AUTH_EVENTS) {

        var self = this;

        $rootScope.$on(AUTH_EVENTS.notAuthenticated, function () {
            self.destroy();
        });

        $rootScope.$on(AUTH_EVENTS.sessionTimeout, function () {
            self.destroy();
        });

        this.user = null;

        this.create = function (user) {
            this.user = user;
        };

        this.destroy = function () {
            this.user = null;
        };
    });
})();

app.controller('HomeCtrl', function ($scope, $state, $location) {
    $scope.enterLobby = function () {
        $state.go('lobby', { reload: true });
    };
});

app.config(function ($stateProvider) {
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html'
    });
});

app.config(function ($stateProvider) {
    $stateProvider.state('Game', {
        url: '/game/:roomname',
        templateUrl: 'js/game-state/page.html',
        controller: "GameCtrl",
        data: {
            authenticate: true
        }
    });
});

app.controller('GameCtrl', function ($scope, BoardFactory, Socket, $stateParams, AuthService, $state, LobbyFactory, $rootScope, $q) {

    $scope.roomName = $stateParams.roomname;
    $scope.hideStart = true;

    $scope.otherPlayers = [];
    $scope.gameLength = 1000;

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
    $scope.winOrLose = null;
    $scope.timeout = null;

    $rootScope.hideNavbar = true;

    // $scope.checkSelected = function(id) {
    //     return id in $scope.exports.wordObj;
    // };

    $scope.toggleDrag = function () {
        $scope.draggingAllowed = !$scope.draggingAllowed;
    };

    $scope.mouseDown = function () {
        console.log('mouse is down');
        $scope.mouseIsDown = true;
    };

    $scope.mouseUp = function () {
        console.log('mouse is up');
        $scope.mouseIsDown = false;
        if ($scope.draggingAllowed && $scope.exports.word.length > 1) $scope.submit($scope.exports);
    };

    $scope.touchActivated = function () {
        console.log('touch is activated: ' + arguments);
        $scope.touchIsActivated = true;
    };

    $scope.touchStopped = function (e) {
        console.log('touch is stopped: ' + e);
        $scope.touchIsActivated = false;
        if ($scope.draggingAllowed && $scope.exports.word.length > 1) $scope.submit($scope.exports);
    };

    // $element.bind('touchstart', function (e) {
    //   $scope.isSelecting = true;
    //   $scope.click(e)
    // })

    // $element.bind('mousemove touchmove', function (e) {
    //   if ($scope.isSelecting) {
    //     $scope.click(e)
    //   }
    // })x

    // $element.bind('mouseup touchend', function (e) {
    //   $scope.isSelecting = false;
    //   if ($scope.draggingAllowed && $scope.exports.word.length > 1) $scope.submit($scope.exports);
    // })


    $scope.drag = function (space, id) {
        console.log('mouse enter: ' + id);
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

    $scope.mobileDrag = function (space, id) {
        console.log('touch is dragged: ' + space + " : " + id);
        if ($scope.touchIsActivated && $scope.draggingAllowed) {
            $scope.click(space, id);
        }
    };

    $scope.click = function (space, id) {
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
    BoardFactory.getCurrentRoom($stateParams.roomname).then(function (room) {
        console.log(room);
        $scope.gameId = room.id;
        $scope.otherPlayers = room.users.filter(function (user) {
            return user.id !== $scope.user.id;
        });
        $scope.otherPlayers.forEach(function (player) {
            player.score = 0;
        });
        LobbyFactory.joinGame(room.id, $scope.user.id);
    });

    $scope.hideBoard = true;

    // Start the game when all players have joined room
    $scope.startGame = function () {
        var userIds = $scope.otherPlayers.map(function (user) {
            return user.id;
        });
        userIds.push($scope.user.id);
        console.log('op', $scope.otherPlayers, 'ui', userIds);
        $scope.winOrLose = null;
        BoardFactory.getStartBoard($scope.gameLength, $scope.gameId, userIds);
    };

    //Quit the room, back to lobby
    $scope.quit = function () {
        $rootScope.hideNavbar = false;
        $state.go('lobby');
    };

    $scope.board = [['b', 'a', 'd', 'e', 'a', 'r'], ['e', 'f', 'g', 'l', 'm', 'e'], ['h', 'i', 'j', 'f', 'o', 'a'], ['c', 'a', 'd', 'e', 'a', 'r'], ['e', 'f', 'g', 'l', 'd', 'e'], ['h', 'i', 'j', 'f', 'o', 'a']];

    $scope.messages = null;

    $scope.size = 3;
    $scope.score = 0;

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
        return rowOffset <= 1 && colOffset <= 1;
    }

    function clearIfConflicting(updateWordObj, exportWordObj) {
        var tilesMoved = Object.keys(updateWordObj);
        var myWordTiles = Object.keys(exportWordObj);
        if (tilesMoved.some(function (coord) {
            return myWordTiles.includes(coord);
        })) $scope.clear();
    }

    $scope.clear = function () {
        $scope.exports.word = "";
        $scope.exports.wordObj = {};
    };

    $scope.submit = function (obj) {
        console.log('submitting ', obj);
        BoardFactory.submit(obj);
        $scope.clear();
    };

    $scope.shuffle = BoardFactory.shuffle;

    $scope.updateBoard = function (wordObj) {
        console.log('scope.board', $scope.board);
        for (var key in wordObj) {
            var coords = key.split('-');
            var row = coords[0];
            var col = coords[1];
            $scope.board[row][col] = wordObj[key];
        }
    };

    $scope.updateScore = function (points, playerId) {
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

    $scope.update = function (updateObj) {
        $scope.updateScore(updateObj.pointsEarned, updateObj.playerId);
        $scope.updateBoard(updateObj.wordObj);
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
        $scope.timeout = setTimeout(function () {
            $scope.message = '';
        }, 3000);
        console.log('its updating!');
        clearIfConflicting(updateObj, $scope.exports.wordObj);
        $scope.exports.stateNumber = updateObj.stateNumber;
        $scope.$evalAsync();
    };

    $scope.replay = function () {

        LobbyFactory.newGame({ roomname: $scope.roomName }).then(function (game) {
            console.log("replay game obj:", game);

            $scope.gameId = game.id;
            $scope.startGame();
            var allIds = $scope.otherPlayers.map(function (player) {
                return player.id;
            });
            allIds.push($scope.user.id);
            $q.all(allIds.map(function (id) {
                LobbyFactory.joinGame($scope.gameId, id);
            }));
        }).catch(function (e) {
            console.error('error restarting the game', e);
        });
    };

    $scope.determineWinner = function (winnersArray) {
        if (winnersArray.length === 1) {
            if (+winnersArray[0] === +$scope.user.id) {
                $scope.winOrLose = "Congratulation! You are a word wizard! You won!!!";
            } else {
                for (var player in $scope.otherPlayers) {
                    if (+$scope.otherPlayers[player].id === +winnersArray[0]) {
                        var winner = $scope.otherPlayers[player].username;
                        $scope.winOrLose = "Tough luck. " + winner + " has beaten you. Better Luck next time. :(";
                    }
                }
            }
        } else {
            var winners = [];
            for (var i in winnersArray) {
                if (+winnersArray[i] === +$scope.user.id) {
                    winners.push($scope.user.username);
                } else {
                    for (var player in $scope.otherPlayers) {
                        if ($scope.otherPlayers[player].id == winnersArray[i]) {
                            winners.push($scope.otherPlayers[player].username);
                            break;
                        }
                    }
                }
                console.log(winners);
                $scope.winOrLose = "The game was a tie between ";
                for (var i = 0; i < winners.length; i++) {
                    if (i === winners.length - 1) {
                        $scope.winOrLose += "and " + winners[i] + ".";
                    } else {
                        $scope.winOrLose += winners[i] + ", ";
                    }
                }
            }
        }
    };

    $scope.$on('$destroy', function () {
        console.log('destroyed');
        Socket.disconnect();
    });

    Socket.on('connect', function () {
        console.log('connecting');
        $q.all([AuthService.getLoggedInUser().then(function (user) {
            console.log('user from AuthService', user);
            $scope.user = user;
            $scope.exports.playerId = user.id;
        }),

        //get the current room info
        BoardFactory.getCurrentRoom($stateParams.roomname).then(function (room) {
            console.log(room);
            $scope.gameId = room.id;
            $scope.otherPlayers = room.users.filter(function (user) {
                return user.id !== $scope.user.id;
            });
            $scope.otherPlayers.forEach(function (player) {
                player.score = 0;
            });
            LobbyFactory.joinGame(room.id, $scope.user.id);
        })]).then(function () {
            Socket.emit('joinRoom', $scope.user, $scope.roomName, $scope.gameId);
            $scope.hideStart = false;
            $scope.$evalAsync();
            console.log('emitting "join room" event to server 8P', $scope.roomName);
        }).catch(function (e) {
            console.error('error grabbing user or room from db: ', e);
        });

        Socket.on('roomJoinSuccess', function (user) {
            console.log('new user joining', user.id);
            user.score = 0;
            $scope.otherPlayers.push(user);
            $scope.$evalAsync();
        });

        Socket.on('startBoard', function (board) {
            $scope.freeze = false;
            console.log('board! ', board);
            $scope.board = board;
            // setInterval(function(){
            $scope.otherPlayers.forEach(function (player) {
                player.score = 0;
            });
            $scope.score = 0;
            $scope.hideBoard = false;
            $scope.$evalAsync();
            // }, 3000);
        });

        Socket.on('wordValidated', function (updateObj) {
            console.log('word is validated');
            $scope.update(updateObj);
            $scope.lastWordPlayed = updateObj.word;
            $scope.$evalAsync();
        });

        Socket.on('boardShuffled', function (board, userId, stateNumber) {
            $scope.board = board;
            $scope.updateScore(-5, userId);
            $scope.clear();
            $scope.exports.stateNumber = stateNumber;
            $scope.message = userId + " shuffled the board!";
            console.log($scope.message);
            $scope.$evalAsync();
        });

        Socket.on('playerDisconnected', function (user) {
            console.log('playerDisconnected', user.id);
            $scope.otherPlayers = $scope.otherPlayers.map(function (otherPlayers) {
                return otherPlayers.id !== user.id;
            });

            $scope.$evalAsync();
        });

        Socket.on('gameOver', function (winnersArray) {
            $scope.clear();
            $scope.freeze = true;
            $scope.determineWinner(winnersArray);
            $scope.$evalAsync();
            console.log('game is over, winners: ', winnersArray);
        });
    });
});

app.factory("BoardFactory", function ($http, Socket) {
    return {
        getStartBoard: function getStartBoard(gameLength, gameId, userIds) {
            console.log('factory. gl: ', gameLength);
            Socket.emit('getStartBoard', gameLength, gameId, userIds);
        },

        submit: function submit(obj) {
            Socket.emit('submitWord', obj);
        },

        shuffle: function shuffle(user) {
            console.log('gridfactory u', user.id);
            Socket.emit('shuffleBoard', user.id);
        },

        // findAllOtherUsers: function(game) {
        // 	return $http.get('/api/games/'+ game.id)
        // 	.then(res => res.data)
        // },

        getCurrentRoom: function getCurrentRoom(roomname) {
            return $http.get('/api/games/rooms/' + roomname).then(function (res) {
                return res.data;
            });
        },

        quitFromRoom: function quitFromRoom(gameId, userId) {
            // Socket.emit('disconnect', roomName, userId);
            return $http.delete('/api/games/' + gameId + '/' + userId);
        }
    };
});

app.controller('LeaderBoardCtrl', function ($scope, LeaderBoardFactory, $state, AuthService) {
    console.log(' 1');
    LeaderBoardFactory.AllPlayers().then(function (players) {
        players.forEach(function (player) {
            if (player.games.length > 0) {
                var scores = player.games.map(function (game) {
                    return game.userGame.score;
                });
                player.highestScore = Math.max.apply(Math, _toConsumableArray(scores));
            } else {
                player.highestScore = 0;
            }
            player.games_won = player.winner.length;
            player.games_played = player.games.length;
            if (player.games.length === 0) {
                player.win_percentage = 0 + '%';
            } else {
                player.win_percentage = (player.winner.length / player.games.length * 100).toFixed(0) + '%';
            }
        });
        $scope.players = players;
    });
});

app.factory('LeaderBoardFactory', function ($http) {
    var LeaderBoardFactory = {};

    LeaderBoardFactory.AllPlayers = function () {
        return $http.get('/api/users').then(function (res) {
            return res.data;
        });
    };

    return LeaderBoardFactory;
});

app.config(function ($stateProvider) {

    $stateProvider.state('leaderBoard', {
        url: '/leaderBoard',
        templateUrl: 'js/leaderBoard/leaderBoard.template.html',
        resolve: {
            allPlayers: function allPlayers(LeaderBoardFactory) {
                return LeaderBoardFactory.AllPlayers;
            }

        },
        controller: 'LeaderBoardCtrl'
    });
});
app.directive('letter', function () {
    return {
        restrict: 'E',
        scope: {
            space: '=',
            x: '=',
            y: '=',
            draggingAllowed: '=',
            exports: '='
        },
        link: function link(scope, el, attr) {
            console.log('scope.draggingAllowed: ' + scope.draggingAllowed);

            scope.mouseIsDown = false;
            scope.touchIsActivated = false;

            scope.mouseDown = function () {
                console.log('mouse is down');
                scope.mouseIsDown = true;
            };

            scope.mouseUp = function () {
                console.log('mouse is up');
                scope.mouseIsDown = false;
                if (scope.draggingAllowed && scope.exports.word.length > 1) scope.submit(scope.exports);
            };

            scope.touchActivated = function () {
                console.log('touch is activated: ' + arguments);
                scope.touchIsActivated = true;
            };

            scope.touchStopped = function (e) {
                console.log('touch is stopped: ' + e);
                scope.touchIsActivated = false;
                if (scope.draggingAllowed && scope.exports.word.length > 1) scope.submit(scope.exports);
            };

            scope.drag = function (space, id) {
                console.log('mouse enter: ' + id);
                if (scope.mouseIsDown && scope.draggingAllowed) {
                    scope.click(space, id);
                }
            };

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
                return rowOffset <= 1 && colOffset <= 1;
            }

            scope.click = function (space, id) {
                if (scope.freeze) {
                    return;
                }
                console.log('clicked ', space, id);
                var ltrsSelected = Object.keys(scope.exports.wordObj);
                var previousLtr = ltrsSelected[ltrsSelected.length - 2];
                var lastLtr = ltrsSelected[ltrsSelected.length - 1];
                if (!ltrsSelected.length || validSelect(id, ltrsSelected)) {
                    scope.exports.word += space;
                    scope.exports.wordObj[id] = space;
                    console.log(scope.exports);
                } else if (id === previousLtr) {
                    scope.exports.word = scope.exports.word.substring(0, scope.exports.word.length - 1);
                    delete scope.exports.wordObj[lastLtr];
                } else if (ltrsSelected.length === 1 && id === lastLtr) {
                    scope.exports.word = "";
                    delete scope.exports.wordObj[lastLtr];
                }
            };

            function div_overlap(jqo, left, top) {
                console.log('div overlapped: ' + jqo);
                var d = jqo.offset();
                return top >= d.top && left >= d.left && left <= d.left + jqo[0].offsetWidth && top <= d.top + jqo[0].offsetHeight;
            }

            el.bind("touchmove", function (evt) {
                console.log('binding mouseenter and touchmove', evt);
                el.each(function () {
                    console.log('for each element');
                    if (div_overlap(this, evt.pageX, evt.pageY)) {
                        console.log('entering div_overlap');
                        if (!this.hasClass('selected')) {
                            this.addClass('selected');
                        }
                    }
                });
            });

            // scope.mobileDrag = function(space, id) {
            //     console.log('touch is dragged: ' + space + " : " + id);
            //     if($scope.touchIsActivated && $scope.draggingAllowed){
            //         $scope.click(space, id);
            //     }
            // };

        },
        templateUrl: '/js/letter/letter.template.html'
    };
});

app.controller('LobbyCtrl', function ($scope, LobbyFactory, rooms, $state, AuthService) {

    // AuthService.getLoggedInUser()
    //     .then(function(user) {
    //         $scope.user = user;
    //     });

    $scope.rooms = rooms;
    $scope.roomNameForm = false;
    // $scope.user = {
    //  id: 3
    // }

    // $scope.joinGame = function(room) {
    //     console.log("im changing state and reloading");
    //     $state.go('Game', { roomname: room.roomname }, { reload: true, notify: true })
    // };

    $scope.newRoom = function (roomInfo) {
        LobbyFactory.newGame(roomInfo);
        $scope.roomNameForm = false;
    };
    $scope.showForm = function () {
        $scope.roomNameForm = true;
    };
});

app.directive('enterLobby', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/lobby/lobby-button.html',
        controller: 'HomeCtrl'
    };
});

app.factory('LobbyFactory', function ($http) {
    var LobbyFactory = {};
    var tempRooms = []; //work with socket?

    LobbyFactory.getAllRooms = function () {
        return $http.get('/api/games/rooms').then(function (res) {
            return res.data;
        }).then(function (rooms) {
            angular.copy(rooms, tempRooms);
            return tempRooms;
        });
    };

    LobbyFactory.joinGame = function (roomId, userId) {
        console.log('lobby factory join game');
        return $http.put('/api/games/' + roomId + '/player', { id: userId }).then(function (res) {
            return res.data;
        });
    };

    LobbyFactory.newGame = function (roomInfo) {
        return $http.put('/api/games', roomInfo).then(function (res) {
            return res.data;
        }).then(function (room) {
            tempRooms.push(room);
            return room;
        });
    };

    LobbyFactory.AllPlayers = function () {
        return $http.get('/api/users').then(function (res) {
            return res.data;
        });
    };

    return LobbyFactory;
});

app.config(function ($stateProvider) {

    $stateProvider.state('lobby', {
        url: '/lobby',
        templateUrl: 'js/lobby/lobby.template.html',
        resolve: {
            rooms: function rooms(LobbyFactory) {
                return LobbyFactory.getAllRooms();
            }
        },
        controller: 'LobbyCtrl'
    });
});
app.config(function ($stateProvider) {

    $stateProvider.state('login', {
        url: '/login',
        templateUrl: 'js/login/login.html',
        controller: 'LoginCtrl'
    });
});

app.controller('LoginCtrl', function ($scope, AuthService, $state) {

    $scope.login = {};
    $scope.error = null;

    $scope.sendLogin = function (loginInfo) {

        $scope.error = null;

        AuthService.login(loginInfo).then(function () {
            $state.go('home');
        }).catch(function () {
            $scope.error = 'Invalid login credentials.';
        });
    };
});

app.config(function ($stateProvider) {

    $stateProvider.state('membersOnly', {
        url: '/members-area',
        template: '<img ng-repeat="item in stash" width="300" ng-src="{{ item }}" />',
        controller: function controller($scope, SecretStash) {
            SecretStash.getStash().then(function (stash) {
                $scope.stash = stash;
            });
        },
        // The following data.authenticate is read by an event listener
        // that controls access to this state. Refer to app.js.
        data: {
            authenticate: true
        }
    });
});

app.directive('rankDirective', function () {
    return {
        restrict: 'E',
        scope: {
            rankName: '@',
            players: '=',
            rankBy: '@',
            order: '@'
        },
        templateUrl: '/js/rank/rank.template.html'
    };
});
app.factory('SignupFactory', function ($http, $state, AuthService) {
    var SignupFactory = {};

    SignupFactory.createUser = function (signupInfo) {
        console.log(signupInfo);
        return $http.post('/signup', signupInfo).then(function (res) {
            if (res.status === 201) {
                AuthService.login({ email: signupInfo.email, password: signupInfo.password }).then(function (user) {
                    $state.go('home');
                });
            } else {
                throw Error('An account with that email already exists');
            }
        });
    };

    return SignupFactory;
});
app.config(function ($stateProvider) {

    $stateProvider.state('signup', {
        url: '/signup',
        templateUrl: 'js/signup/signup.html',
        controller: 'SignupCtrl'
    });
});

app.controller('SignupCtrl', function ($scope, AuthService, $state, SignupFactory) {

    $scope.signup = {};
    $scope.error = null;

    $scope.sendSignup = function (signupInfo) {
        SignupFactory.createUser(signupInfo).catch(function () {
            $scope.error = 'An account with that email already exists';
        });
    };
});

app.config(function ($stateProvider) {
    $stateProvider.state("UserProfile", {
        url: "/users/:userId",
        templateUrl: "js/user_profile/profile.template.html",
        controller: "UserCtrl"
    });
    $stateProvider.state("GameRecord", {
        url: "/users/:userId/games",
        templateUrl: "js/user_profile/games.html",
        controller: "GameRecordCtrl"
    });
});

app.controller("UserCtrl", function ($scope, UserFactory, $stateParams) {
    UserFactory.fetchInformation($stateParams.userId).then(function (user) {
        $scope.user = user;
        return user;
    }).then(function (user) {
        $scope.updated = $scope.user.updatedAt.getDay();
    });
});

app.controller("GameRecordCtrl", function ($scope, UserFactory, $stateParams) {
    UserFactory.fetchInformation($stateParams.userId).then(function (user) {
        $scope.user = user;
    }).then(function (user) {
        UserFactory.fetchGames($stateParams.userId);
    }).then(function (games) {
        $scope.games = games;
    });
});
app.factory("UserFactory", function ($http) {
    return {
        fetchInformation: function fetchInformation(id) {
            return $http.get("/api/users/" + id).then(function (user) {
                return user.data;
            });
        },
        fetchGames: function fetchGames(id) {
            return $http.get("/api/users/" + id + "/games").then(function (games) {
                return games.data;
            });
        }
    };
});
app.directive('logo', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/logo/logo.html'
    };
});

'use strict';

app.directive('oauthButton', function () {
    return {
        scope: {
            providerName: '@'
        },
        restrict: 'E',
        templateUrl: 'js/common/directives/oauth-button/oauth-button.html'
    };
});

app.directive("timer", function ($q, $interval, Socket) {
    return {
        restrict: 'E',
        scope: {
            time: '='
        },
        templateUrl: "js/common/directives/timer/timer.html",
        link: function link(scope) {
            var time = scope.time;
            var start = scope.time;
            scope.time_remaining = convert(time);
            scope.countdown = function () {
                var timer = $interval(function () {
                    time -= 1;
                    scope.time_remaining = convert(time);
                    if (time < 1) {
                        scope.time_remaining = "Time up!";
                        $interval.cancel(timer);
                        time = start;
                    }
                }, 1000);
            };

            // scope.messages = ["Get Ready!", "Get Set!", "Go!", '/'];
            //     var index = 0;
            //     var prepare = $interval(function() {
            //         scope.time_remaining = scope.messages[index];
            //         index++;
            //         console.log(scope.time_remaining);
            //         if (scope.time_remaining === "/") {
            //             scope.time_remaining = convert(time);
            //             $interval.cancel(prepare);
            //             var timer = $interval(function() {
            //                 time -= 1;
            //                 scope.time_remaining = convert(time);
            //                 if (time < 1) {
            //                     scope.time_remaining = "Time up!";
            //                     $interval.cancel(timer);
            //                 }
            //             }, 1000);
            //         }
            //     }, 1000);
            // };

            Socket.on('startBoard', function () {
                scope.countdown(time);
            });

            function convert(time) {
                var seconds = (time % 60).toString();
                var conversion = Math.floor(time / 60) + ':';
                if (seconds.length < 2) {
                    conversion += '0' + seconds;
                } else {
                    conversion += seconds;
                }
                return conversion;
            }
        }
    };
});

app.directive('navbar', function ($rootScope, AuthService, AUTH_EVENTS, $state) {

    return {
        restrict: 'E',
        scope: {},
        templateUrl: 'js/common/directives/navbar/navbar.html',
        link: function link(scope) {

            scope.items = [{ label: 'Home', state: 'home' }, { label: 'Leader Board', state: 'leaderBoard' }, { label: 'Your Profile', state: 'UserProfile', auth: true }];

            scope.user = null;

            scope.isLoggedIn = function () {
                return AuthService.isAuthenticated();
            };

            scope.logout = function () {
                AuthService.logout().then(function () {
                    $state.go('home');
                });
            };

            var setUser = function setUser() {
                AuthService.getLoggedInUser().then(function (user) {
                    scope.user = user;
                });
            };

            var removeUser = function removeUser() {
                scope.user = null;
            };

            setUser();

            $rootScope.$on(AUTH_EVENTS.loginSuccess, setUser);
            $rootScope.$on(AUTH_EVENTS.logoutSuccess, removeUser);
            $rootScope.$on(AUTH_EVENTS.sessionTimeout, removeUser);
        }

    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiaG9tZS9ob21lLmNvbnRyb2xsZXIuanMiLCJob21lL2hvbWUuanMiLCJnYW1lLXN0YXRlL2dyaWQuY29udHJvbGxlci5qcyIsImdhbWUtc3RhdGUvZ3JpZC5mYWN0b3J5LmpzIiwibGVhZGVyQm9hcmQvbGVhZGVyQm9hcmQuY29udHJvbGxlci5qcyIsImxlYWRlckJvYXJkL2xlYWRlckJvYXJkLmZhY3RvcnkuanMiLCJsZWFkZXJCb2FyZC9sZWFkZXJCb2FyZC5zdGF0ZS5qcyIsImxldHRlci9sZXR0ZXIuZGlyZWN0aXZlLmpzIiwibG9iYnkvbG9iYnkuY29udHJvbGxlci5qcyIsImxvYmJ5L2xvYmJ5LmRpcmVjdGl2ZS5qcyIsImxvYmJ5L2xvYmJ5LmZhY3RvcnkuanMiLCJsb2JieS9sb2JieS5zdGF0ZS5qcyIsImxvZ2luL2xvZ2luLmpzIiwibWVtYmVycy1vbmx5L21lbWJlcnMtb25seS5qcyIsInJhbmsvcmFuay5kaXJlY3RpdmUuanMiLCJzaWdudXAvc2lnbnVwLmZhY3RvcnkuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwidXNlcl9wcm9maWxlL3Byb2ZpbGUuY29udHJvbGxlci5qcyIsInVzZXJfcHJvZmlsZS9wcm9maWxlLmZhY3RvcnkuanMiLCJjb21tb24vZGlyZWN0aXZlcy9sb2dvL2xvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9vYXV0aC1idXR0b24vb2F1dGgtYnV0dG9uLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3RpbWVyL3RpbWVyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyJdLCJuYW1lcyI6WyJ3aW5kb3ciLCJhcHAiLCJhbmd1bGFyIiwibW9kdWxlIiwiY29uZmlnIiwiJHVybFJvdXRlclByb3ZpZGVyIiwiJGxvY2F0aW9uUHJvdmlkZXIiLCJodG1sNU1vZGUiLCJvdGhlcndpc2UiLCJ3aGVuIiwibG9jYXRpb24iLCJyZWxvYWQiLCJydW4iLCIkcm9vdFNjb3BlIiwiJG9uIiwiZXZlbnQiLCJ0b1N0YXRlIiwidG9QYXJhbXMiLCJmcm9tU3RhdGUiLCJmcm9tUGFyYW1zIiwidGhyb3duRXJyb3IiLCJjb25zb2xlIiwiaW5mbyIsIm5hbWUiLCJlcnJvciIsIkF1dGhTZXJ2aWNlIiwiJHN0YXRlIiwiZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCIsInN0YXRlIiwiZGF0YSIsImF1dGhlbnRpY2F0ZSIsImlzQXV0aGVudGljYXRlZCIsInByZXZlbnREZWZhdWx0IiwiZ2V0TG9nZ2VkSW5Vc2VyIiwidGhlbiIsInVzZXIiLCJnbyIsIkVycm9yIiwiZmFjdG9yeSIsImlvIiwib3JpZ2luIiwiY29uc3RhbnQiLCJsb2dpblN1Y2Nlc3MiLCJsb2dpbkZhaWxlZCIsImxvZ291dFN1Y2Nlc3MiLCJzZXNzaW9uVGltZW91dCIsIm5vdEF1dGhlbnRpY2F0ZWQiLCJub3RBdXRob3JpemVkIiwiJHEiLCJBVVRIX0VWRU5UUyIsInN0YXR1c0RpY3QiLCJyZXNwb25zZUVycm9yIiwicmVzcG9uc2UiLCIkYnJvYWRjYXN0Iiwic3RhdHVzIiwicmVqZWN0IiwiJGh0dHBQcm92aWRlciIsImludGVyY2VwdG9ycyIsInB1c2giLCIkaW5qZWN0b3IiLCJnZXQiLCJzZXJ2aWNlIiwiJGh0dHAiLCJTZXNzaW9uIiwib25TdWNjZXNzZnVsTG9naW4iLCJjcmVhdGUiLCJmcm9tU2VydmVyIiwiY2F0Y2giLCJsb2dpbiIsImNyZWRlbnRpYWxzIiwicG9zdCIsIm1lc3NhZ2UiLCJsb2dvdXQiLCJkZXN0cm95Iiwic2VsZiIsImNvbnRyb2xsZXIiLCIkc2NvcGUiLCIkbG9jYXRpb24iLCJlbnRlckxvYmJ5IiwiJHN0YXRlUHJvdmlkZXIiLCJ1cmwiLCJ0ZW1wbGF0ZVVybCIsIkJvYXJkRmFjdG9yeSIsIlNvY2tldCIsIiRzdGF0ZVBhcmFtcyIsIkxvYmJ5RmFjdG9yeSIsInJvb21OYW1lIiwicm9vbW5hbWUiLCJoaWRlU3RhcnQiLCJvdGhlclBsYXllcnMiLCJnYW1lTGVuZ3RoIiwiZXhwb3J0cyIsIndvcmRPYmoiLCJ3b3JkIiwicGxheWVySWQiLCJzdGF0ZU51bWJlciIsInBvaW50c0Vhcm5lZCIsIm1vdXNlSXNEb3duIiwiZHJhZ2dpbmdBbGxvd2VkIiwic3R5bGUiLCJmcmVlemUiLCJ3aW5Pckxvc2UiLCJ0aW1lb3V0IiwiaGlkZU5hdmJhciIsInRvZ2dsZURyYWciLCJtb3VzZURvd24iLCJsb2ciLCJtb3VzZVVwIiwibGVuZ3RoIiwic3VibWl0IiwidG91Y2hBY3RpdmF0ZWQiLCJhcmd1bWVudHMiLCJ0b3VjaElzQWN0aXZhdGVkIiwidG91Y2hTdG9wcGVkIiwiZSIsImRyYWciLCJzcGFjZSIsImlkIiwiY2xpY2siLCJtb2JpbGVEcmFnIiwibHRyc1NlbGVjdGVkIiwiT2JqZWN0Iiwia2V5cyIsInByZXZpb3VzTHRyIiwibGFzdEx0ciIsInZhbGlkU2VsZWN0Iiwic3Vic3RyaW5nIiwiZ2V0Q3VycmVudFJvb20iLCJyb29tIiwiZ2FtZUlkIiwidXNlcnMiLCJmaWx0ZXIiLCJmb3JFYWNoIiwicGxheWVyIiwic2NvcmUiLCJqb2luR2FtZSIsImhpZGVCb2FyZCIsInN0YXJ0R2FtZSIsInVzZXJJZHMiLCJtYXAiLCJnZXRTdGFydEJvYXJkIiwicXVpdCIsImJvYXJkIiwibWVzc2FnZXMiLCJzaXplIiwibHRySWQiLCJvdGhlckx0cnNJZHMiLCJpbmNsdWRlcyIsImNvb3JkcyIsInNwbGl0Iiwicm93IiwiY29sIiwibGFzdEx0cklkIiwicG9wIiwiY29vcmRzTGFzdCIsInJvd0xhc3QiLCJjb2xMYXN0Iiwicm93T2Zmc2V0IiwiTWF0aCIsImFicyIsImNvbE9mZnNldCIsImNsZWFySWZDb25mbGljdGluZyIsInVwZGF0ZVdvcmRPYmoiLCJleHBvcnRXb3JkT2JqIiwidGlsZXNNb3ZlZCIsIm15V29yZFRpbGVzIiwic29tZSIsImNvb3JkIiwiY2xlYXIiLCJvYmoiLCJzaHVmZmxlIiwidXBkYXRlQm9hcmQiLCJrZXkiLCJ1cGRhdGVTY29yZSIsInBvaW50cyIsInVwZGF0ZSIsInVwZGF0ZU9iaiIsInVzZXJuYW1lIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsIiRldmFsQXN5bmMiLCJyZXBsYXkiLCJuZXdHYW1lIiwiZ2FtZSIsImFsbElkcyIsImFsbCIsImRldGVybWluZVdpbm5lciIsIndpbm5lcnNBcnJheSIsIndpbm5lciIsIndpbm5lcnMiLCJpIiwiZGlzY29ubmVjdCIsIm9uIiwiZW1pdCIsImxhc3RXb3JkUGxheWVkIiwidXNlcklkIiwicmVzIiwicXVpdEZyb21Sb29tIiwiZGVsZXRlIiwiTGVhZGVyQm9hcmRGYWN0b3J5IiwiQWxsUGxheWVycyIsInBsYXllcnMiLCJnYW1lcyIsInNjb3JlcyIsInVzZXJHYW1lIiwiaGlnaGVzdFNjb3JlIiwibWF4IiwiZ2FtZXNfd29uIiwiZ2FtZXNfcGxheWVkIiwid2luX3BlcmNlbnRhZ2UiLCJ0b0ZpeGVkIiwicmVzb2x2ZSIsImFsbFBsYXllcnMiLCJkaXJlY3RpdmUiLCJyZXN0cmljdCIsInNjb3BlIiwieCIsInkiLCJsaW5rIiwiZWwiLCJhdHRyIiwiZGl2X292ZXJsYXAiLCJqcW8iLCJsZWZ0IiwidG9wIiwiZCIsIm9mZnNldCIsIm9mZnNldFdpZHRoIiwib2Zmc2V0SGVpZ2h0IiwiYmluZCIsImV2dCIsImVhY2giLCJwYWdlWCIsInBhZ2VZIiwiaGFzQ2xhc3MiLCJhZGRDbGFzcyIsInJvb21zIiwicm9vbU5hbWVGb3JtIiwibmV3Um9vbSIsInJvb21JbmZvIiwic2hvd0Zvcm0iLCJ0ZW1wUm9vbXMiLCJnZXRBbGxSb29tcyIsImNvcHkiLCJyb29tSWQiLCJwdXQiLCJzZW5kTG9naW4iLCJsb2dpbkluZm8iLCJ0ZW1wbGF0ZSIsIlNlY3JldFN0YXNoIiwiZ2V0U3Rhc2giLCJzdGFzaCIsInJhbmtOYW1lIiwicmFua0J5Iiwib3JkZXIiLCJTaWdudXBGYWN0b3J5IiwiY3JlYXRlVXNlciIsInNpZ251cEluZm8iLCJlbWFpbCIsInBhc3N3b3JkIiwic2lnbnVwIiwic2VuZFNpZ251cCIsIlVzZXJGYWN0b3J5IiwiZmV0Y2hJbmZvcm1hdGlvbiIsInVwZGF0ZWQiLCJ1cGRhdGVkQXQiLCJnZXREYXkiLCJmZXRjaEdhbWVzIiwicHJvdmlkZXJOYW1lIiwiJGludGVydmFsIiwidGltZSIsInN0YXJ0IiwidGltZV9yZW1haW5pbmciLCJjb252ZXJ0IiwiY291bnRkb3duIiwidGltZXIiLCJjYW5jZWwiLCJzZWNvbmRzIiwidG9TdHJpbmciLCJjb252ZXJzaW9uIiwiZmxvb3IiLCJpdGVtcyIsImxhYmVsIiwiYXV0aCIsImlzTG9nZ2VkSW4iLCJzZXRVc2VyIiwicmVtb3ZlVXNlciJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7QUFDQUEsT0FBQUMsR0FBQSxHQUFBQyxRQUFBQyxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLFdBQUEsRUFBQSxTQUFBLENBQUEsQ0FBQTs7QUFFQUYsSUFBQUcsTUFBQSxDQUFBLFVBQUFDLGtCQUFBLEVBQUFDLGlCQUFBLEVBQUE7QUFDQTtBQUNBQSxzQkFBQUMsU0FBQSxDQUFBLElBQUE7QUFDQTtBQUNBRix1QkFBQUcsU0FBQSxDQUFBLEdBQUE7QUFDQTtBQUNBSCx1QkFBQUksSUFBQSxDQUFBLGlCQUFBLEVBQUEsWUFBQTtBQUNBVCxlQUFBVSxRQUFBLENBQUFDLE1BQUE7QUFDQSxLQUZBO0FBR0EsQ0FUQTs7QUFXQTtBQUNBVixJQUFBVyxHQUFBLENBQUEsVUFBQUMsVUFBQSxFQUFBO0FBQ0FBLGVBQUFDLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLFVBQUFDLEtBQUEsRUFBQUMsT0FBQSxFQUFBQyxRQUFBLEVBQUFDLFNBQUEsRUFBQUMsVUFBQSxFQUFBQyxXQUFBLEVBQUE7QUFDQUMsZ0JBQUFDLElBQUEsZ0ZBQUFOLFFBQUFPLElBQUE7QUFDQUYsZ0JBQUFHLEtBQUEsQ0FBQUosV0FBQTtBQUNBLEtBSEE7QUFJQSxDQUxBOztBQU9BO0FBQ0FuQixJQUFBVyxHQUFBLENBQUEsVUFBQUMsVUFBQSxFQUFBWSxXQUFBLEVBQUFD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QkFBQWtFLEtBQUEsR0FBQSxDQUNBLEVBQUFDLE9BQUEsTUFBQSxFQUFBOVAsT0FBQSxNQUFBLEVBREEsRUFFQSxFQUFBOFAsT0FBQSxjQUFBLEVBQUE5UCxPQUFBLGFBQUEsRUFGQSxFQUdBLEVBQUE4UCxPQUFBLGNBQUEsRUFBQTlQLE9BQUEsYUFBQSxFQUFBK1AsTUFBQSxJQUFBLEVBSEEsQ0FBQTs7QUFNQXBFLGtCQUFBcEwsSUFBQSxHQUFBLElBQUE7O0FBRUFvTCxrQkFBQXFFLFVBQUEsR0FBQSxZQUFBO0FBQ0EsdUJBQUFuUSxZQUFBTSxlQUFBLEVBQUE7QUFDQSxhQUZBOztBQUlBd0wsa0JBQUEvSSxNQUFBLEdBQUEsWUFBQTtBQUNBL0MsNEJBQUErQyxNQUFBLEdBQUF0QyxJQUFBLENBQUEsWUFBQTtBQUNBUiwyQkFBQVUsRUFBQSxDQUFBLE1BQUE7QUFDQSxpQkFGQTtBQUdBLGFBSkE7O0FBTUEsZ0JBQUF5UCxVQUFBLFNBQUFBLE9BQUEsR0FBQTtBQUNBcFEsNEJBQUFRLGVBQUEsR0FBQUMsSUFBQSxDQUFBLFVBQUFDLElBQUEsRUFBQTtBQUNBb0wsMEJBQUFwTCxJQUFBLEdBQUFBLElBQUE7QUFDQSxpQkFGQTtBQUdBLGFBSkE7O0FBTUEsZ0JBQUEyUCxhQUFBLFNBQUFBLFVBQUEsR0FBQTtBQUNBdkUsc0JBQUFwTCxJQUFBLEdBQUEsSUFBQTtBQUNBLGFBRkE7O0FBSUEwUDs7QUFFQWhSLHVCQUFBQyxHQUFBLENBQUFtQyxZQUFBUCxZQUFBLEVBQUFtUCxPQUFBO0FBQ0FoUix1QkFBQUMsR0FBQSxDQUFBbUMsWUFBQUwsYUFBQSxFQUFBa1AsVUFBQTtBQUNBalIsdUJBQUFDLEdBQUEsQ0FBQW1DLFlBQUFKLGNBQUEsRUFBQWlQLFVBQUE7QUFFQTs7QUF4Q0EsS0FBQTtBQTRDQSxDQTlDQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xud2luZG93LmFwcCA9IGFuZ3VsYXIubW9kdWxlKCdGdWxsc3RhY2tHZW5lcmF0ZWRBcHAnLCBbJ2ZzYVByZUJ1aWx0JywgJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnbmdBbmltYXRlJywgJ25nVG91Y2gnXSk7XG5cbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcbiAgICAvLyBUcmlnZ2VyIHBhZ2UgcmVmcmVzaCB3aGVuIGFjY2Vzc2luZyBhbiBPQXV0aCByb3V0ZVxuICAgICR1cmxSb3V0ZXJQcm92aWRlci53aGVuKCcvYXV0aC86cHJvdmlkZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICB9KTtcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGxpc3RlbmluZyB0byBlcnJvcnMgYnJvYWRjYXN0ZWQgYnkgdWktcm91dGVyLCB1c3VhbGx5IG9yaWdpbmF0aW5nIGZyb20gcmVzb2x2ZXNcbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUpIHtcbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlRXJyb3InLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zLCBmcm9tU3RhdGUsIGZyb21QYXJhbXMsIHRocm93bkVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuaW5mbyhgVGhlIGZvbGxvd2luZyBlcnJvciB3YXMgdGhyb3duIGJ5IHVpLXJvdXRlciB3aGlsZSB0cmFuc2l0aW9uaW5nIHRvIHN0YXRlIFwiJHt0b1N0YXRlLm5hbWV9XCIuIFRoZSBvcmlnaW4gb2YgdGhpcyBlcnJvciBpcyBwcm9iYWJseSBhIHJlc29sdmUgZnVuY3Rpb246YCk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IodGhyb3duRXJyb3IpO1xuICAgIH0pO1xufSk7XG5cbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgY29udHJvbGxpbmcgYWNjZXNzIHRvIHNwZWNpZmljIHN0YXRlcy5cbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgIC8vIFRoZSBnaXZlbiBzdGF0ZSByZXF1aXJlcyBhbiBhdXRoZW50aWNhdGVkIHVzZXIuXG4gICAgdmFyIGRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGggPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmRhdGEgJiYgc3RhdGUuZGF0YS5hdXRoZW50aWNhdGU7XG4gICAgfTtcblxuICAgIC8vICRzdGF0ZUNoYW5nZVN0YXJ0IGlzIGFuIGV2ZW50IGZpcmVkXG4gICAgLy8gd2hlbmV2ZXIgdGhlIHByb2Nlc3Mgb2YgY2hhbmdpbmcgYSBzdGF0ZSBiZWdpbnMuXG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcykge1xuXG4gICAgICAgIGlmICghZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCh0b1N0YXRlKSkge1xuICAgICAgICAgICAgLy8gVGhlIGRlc3RpbmF0aW9uIHN0YXRlIGRvZXMgbm90IHJlcXVpcmUgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgICAgIC8vIFRoZSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWQuXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FuY2VsIG5hdmlnYXRpbmcgdG8gbmV3IHN0YXRlLlxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIC8vIElmIGEgdXNlciBpcyByZXRyaWV2ZWQsIHRoZW4gcmVuYXZpZ2F0ZSB0byB0aGUgZGVzdGluYXRpb25cbiAgICAgICAgICAgIC8vICh0aGUgc2Vjb25kIHRpbWUsIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpIHdpbGwgd29yaylcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgaWYgbm8gdXNlciBpcyBsb2dnZWQgaW4sIGdvIHRvIFwibG9naW5cIiBzdGF0ZS5cbiAgICAgICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKHRvU3RhdGUubmFtZSwgdG9QYXJhbXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbn0pO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgW10pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgICB9KTtcblxuICAgIC8vIEFVVEhfRVZFTlRTIGlzIHVzZWQgdGhyb3VnaG91dCBvdXIgYXBwIHRvXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxuICAgIGFwcC5jb25zdGFudCgnQVVUSF9FVkVOVFMnLCB7XG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxuICAgICAgICBsb2dvdXRTdWNjZXNzOiAnYXV0aC1sb2dvdXQtc3VjY2VzcycsXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXG4gICAgICAgIG5vdEF1dGhvcml6ZWQ6ICdhdXRoLW5vdC1hdXRob3JpemVkJ1xuICAgIH0pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ0F1dGhJbnRlcmNlcHRvcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgQVVUSF9FVkVOVFMpIHtcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXG4gICAgICAgICAgICA0MDM6IEFVVEhfRVZFTlRTLm5vdEF1dGhvcml6ZWQsXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KHN0YXR1c0RpY3RbcmVzcG9uc2Uuc3RhdHVzXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goW1xuICAgICAgICAgICAgJyRpbmplY3RvcicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoJGluamVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRpbmplY3Rvci5nZXQoJ0F1dGhJbnRlcmNlcHRvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdBdXRoU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgU2Vzc2lvbiwgJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMsICRxKSB7XG5cbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzZnVsTG9naW4ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHZhciB1c2VyID0gcmVzcG9uc2UuZGF0YS51c2VyO1xuICAgICAgICAgICAgU2Vzc2lvbi5jcmVhdGUodXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzKTtcbiAgICAgICAgICAgIHJldHVybiB1c2VyO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlcyB0aGUgc2Vzc2lvbiBmYWN0b3J5IHRvIHNlZSBpZiBhblxuICAgICAgICAvLyBhdXRoZW50aWNhdGVkIHVzZXIgaXMgY3VycmVudGx5IHJlZ2lzdGVyZWQuXG4gICAgICAgIHRoaXMuaXNBdXRoZW50aWNhdGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhU2Vzc2lvbi51c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyID0gZnVuY3Rpb24gKGZyb21TZXJ2ZXIpIHtcblxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcbiAgICAgICAgICAgIC8vIHJldHVybiB0aGUgdXNlciBhdHRhY2hlZCB0byB0aGF0IHNlc3Npb25cbiAgICAgICAgICAgIC8vIHdpdGggYSBwcm9taXNlLiBUaGlzIGVuc3VyZXMgdGhhdCB3ZSBjYW5cbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cblxuICAgICAgICAgICAgLy8gT3B0aW9uYWxseSwgaWYgdHJ1ZSBpcyBnaXZlbiBhcyB0aGUgZnJvbVNlcnZlciBwYXJhbWV0ZXIsXG4gICAgICAgICAgICAvLyB0aGVuIHRoaXMgY2FjaGVkIHZhbHVlIHdpbGwgbm90IGJlIHVzZWQuXG5cbiAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0aGVudGljYXRlZCgpICYmIGZyb21TZXJ2ZXIgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbihTZXNzaW9uLnVzZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYWtlIHJlcXVlc3QgR0VUIC9zZXNzaW9uLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIHVzZXIsIGNhbGwgb25TdWNjZXNzZnVsTG9naW4gd2l0aCB0aGUgcmVzcG9uc2UuXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgNDAxIHJlc3BvbnNlLCB3ZSBjYXRjaCBpdCBhbmQgaW5zdGVhZCByZXNvbHZlIHRvIG51bGwuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dpbiA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dpbicsIGNyZWRlbnRpYWxzKVxuICAgICAgICAgICAgICAgIC50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2xvZ291dCcpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnU2Vzc2lvbicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUykge1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG59KCkpO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ0hvbWVDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGUsICRsb2NhdGlvbil7XG4gICRzY29wZS5lbnRlckxvYmJ5ID0gZnVuY3Rpb24oKXtcbiAgICAkc3RhdGUuZ28oJ2xvYmJ5Jywge3JlbG9hZDogdHJ1ZX0pO1xuICB9XG59KTtcblxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcbiAgICAgICAgdXJsOiAnLycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaG9tZS9ob21lLmh0bWwnXG4gICAgfSk7XG59KTtcblxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdHYW1lJywge1xuICAgICAgICB1cmw6ICcvZ2FtZS86cm9vbW5hbWUnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2dhbWUtc3RhdGUvcGFnZS5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogXCJHYW1lQ3RybFwiLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBhdXRoZW50aWNhdGU6IHRydWVcbiAgICAgICAgfVxuICAgIH0pO1xufSk7XG5cblxuYXBwLmNvbnRyb2xsZXIoJ0dhbWVDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBCb2FyZEZhY3RvcnksIFNvY2tldCwgJHN0YXRlUGFyYW1zLCBBdXRoU2VydmljZSwgJHN0YXRlLCBMb2JieUZhY3RvcnksICRyb290U2NvcGUsICRxKSB7XG5cbiAgICAkc2NvcGUucm9vbU5hbWUgPSAkc3RhdGVQYXJhbXMucm9vbW5hbWU7XG4gICAgJHNjb3BlLmhpZGVTdGFydCA9IHRydWU7XG5cbiAgICAkc2NvcGUub3RoZXJQbGF5ZXJzID0gW107XG4gICAgJHNjb3BlLmdhbWVMZW5ndGggPSAxMDAwO1xuXG4gICAgJHNjb3BlLmV4cG9ydHMgPSB7XG4gICAgICAgIHdvcmRPYmo6IHt9LFxuICAgICAgICB3b3JkOiBcIlwiLFxuICAgICAgICBwbGF5ZXJJZDogbnVsbCxcbiAgICAgICAgc3RhdGVOdW1iZXI6IDAsXG4gICAgICAgIHBvaW50c0Vhcm5lZDogbnVsbFxuICAgIH07XG5cbiAgICAkc2NvcGUubW91c2VJc0Rvd24gPSBmYWxzZTtcbiAgICAkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkID0gZmFsc2U7XG4gICAgJHNjb3BlLnN0eWxlID0gbnVsbDtcbiAgICAkc2NvcGUubWVzc2FnZSA9ICcnO1xuICAgICRzY29wZS5mcmVlemUgPSBmYWxzZTtcbiAgICAkc2NvcGUud2luT3JMb3NlID0gbnVsbDtcbiAgICAkc2NvcGUudGltZW91dCA9IG51bGw7XG5cbiAgICAkcm9vdFNjb3BlLmhpZGVOYXZiYXIgPSB0cnVlO1xuXG5cbiAgICAvLyAkc2NvcGUuY2hlY2tTZWxlY3RlZCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgLy8gICAgIHJldHVybiBpZCBpbiAkc2NvcGUuZXhwb3J0cy53b3JkT2JqO1xuICAgIC8vIH07XG5cbiAgICAkc2NvcGUudG9nZ2xlRHJhZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkID0gISRzY29wZS5kcmFnZ2luZ0FsbG93ZWQ7XG4gICAgfTtcblxuICAgICRzY29wZS5tb3VzZURvd24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ21vdXNlIGlzIGRvd24nKVxuICAgICAgICAkc2NvcGUubW91c2VJc0Rvd24gPSB0cnVlO1xuICAgIH07XG5cbiAgICAkc2NvcGUubW91c2VVcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnbW91c2UgaXMgdXAnKTtcbiAgICAgICAgJHNjb3BlLm1vdXNlSXNEb3duID0gZmFsc2U7XG4gICAgICAgIGlmICgkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkICYmICRzY29wZS5leHBvcnRzLndvcmQubGVuZ3RoID4gMSkgJHNjb3BlLnN1Ym1pdCgkc2NvcGUuZXhwb3J0cyk7XG4gICAgfTtcblxuICAgICRzY29wZS50b3VjaEFjdGl2YXRlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZygndG91Y2ggaXMgYWN0aXZhdGVkOiAnICsgYXJndW1lbnRzKTtcbiAgICAgICAgJHNjb3BlLnRvdWNoSXNBY3RpdmF0ZWQgPSB0cnVlO1xuICAgIH1cblxuICAgICRzY29wZS50b3VjaFN0b3BwZWQgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCd0b3VjaCBpcyBzdG9wcGVkOiAnICsgZSk7XG4gICAgICAgICRzY29wZS50b3VjaElzQWN0aXZhdGVkID0gZmFsc2U7XG4gICAgICAgIGlmICgkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkICYmICRzY29wZS5leHBvcnRzLndvcmQubGVuZ3RoID4gMSkgJHNjb3BlLnN1Ym1pdCgkc2NvcGUuZXhwb3J0cyk7XG4gICAgfVxuXG4gICAgLy8gJGVsZW1lbnQuYmluZCgndG91Y2hzdGFydCcsIGZ1bmN0aW9uIChlKSB7XG4gICAgLy8gICAkc2NvcGUuaXNTZWxlY3RpbmcgPSB0cnVlO1xuICAgIC8vICAgJHNjb3BlLmNsaWNrKGUpXG4gICAgLy8gfSlcblxuICAgIC8vICRlbGVtZW50LmJpbmQoJ21vdXNlbW92ZSB0b3VjaG1vdmUnLCBmdW5jdGlvbiAoZSkge1xuICAgIC8vICAgaWYgKCRzY29wZS5pc1NlbGVjdGluZykge1xuICAgIC8vICAgICAkc2NvcGUuY2xpY2soZSlcbiAgICAvLyAgIH1cbiAgICAvLyB9KXhcblxuICAgIC8vICRlbGVtZW50LmJpbmQoJ21vdXNldXAgdG91Y2hlbmQnLCBmdW5jdGlvbiAoZSkge1xuICAgIC8vICAgJHNjb3BlLmlzU2VsZWN0aW5nID0gZmFsc2U7XG4gICAgLy8gICBpZiAoJHNjb3BlLmRyYWdnaW5nQWxsb3dlZCAmJiAkc2NvcGUuZXhwb3J0cy53b3JkLmxlbmd0aCA+IDEpICRzY29wZS5zdWJtaXQoJHNjb3BlLmV4cG9ydHMpO1xuICAgIC8vIH0pXG5cblxuICAgICRzY29wZS5kcmFnID0gZnVuY3Rpb24oc3BhY2UsIGlkKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdtb3VzZSBlbnRlcjogJyArIGlkKTtcbiAgICAgICAgaWYgKCRzY29wZS5tb3VzZUlzRG93biAmJiAkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkKSB7XG4gICAgICAgICAgICAkc2NvcGUuY2xpY2soc3BhY2UsIGlkKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBmdW5jdGlvbiBkaXZfb3ZlcmxhcChqcW8sIGxlZnQsIHRvcCkge1xuICAgIC8vICAgICBjb25zb2xlLmxvZygnZGl2IG92ZXJsYXBwZWQ6ICcgKyBqcW8pO1xuICAgIC8vICAgICB2YXIgZCA9IGpxby5vZmZzZXQoKTtcbiAgICAvLyAgICAgcmV0dXJuIHRvcCA+PSBkLnRvcCAmJiBsZWZ0ID49IGQubGVmdCAmJiBsZWZ0IDw9IChkLmxlZnQranFvWzBdLm9mZnNldFdpZHRoKSAmJiB0b3AgPD0gKGQudG9wK2pxb1swXS5vZmZzZXRIZWlnaHQpO1xuICAgIC8vIH1cblxuICAgIC8vIHRvdWNobW92ZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgLy8gICAgIC8vIFByZXZlbnQgc2Nyb2xsaW5nIG9uIHRoaXMgZWxlbWVudFxuICAgIC8vICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIC8vIH1cblxuICAgIC8vICQoXCIuY2VsbFwiKS5iaW5kKFwibW91c2VlbnRlciB0b3VjaG1vdmVcIiwgZnVuY3Rpb24oZXZ0KXtcbiAgICAvLyAgICAgY29uc29sZS5sb2coJ2JpbmRpbmcgbW91c2VlbnRlciBhbmQgdG91Y2htb3ZlJywgZXZ0KTtcbiAgICAvLyAgICAgJChcIi5jZWxsXCIpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgLy8gICAgICAgICBjb25zb2xlLmxvZygnZm9yIGVhY2ggZWxlbWVudCcpO1xuICAgIC8vICAgICAgICBpZiAoZGl2X292ZXJsYXAodGhpcywgZXZ0LnBhZ2VYLCBldnQucGFnZVkpKXtcbiAgICAvLyAgICAgICAgIGNvbnNvbGUubG9nKCdlbnRlcmluZyBkaXZfb3ZlcmxhcCcpO1xuICAgIC8vICAgICAgICAgICBpZiAoIXRoaXMuaGFzQ2xhc3MoJ3NlbGVjdGVkJykpIHtcbiAgICAvLyAgICAgICAgICAgICB0aGlzLmFkZENsYXNzKCdzZWxlY3RlZCcpO1xuICAgIC8vICAgICAgICAgICB9XG4gICAgLy8gICAgICAgIH1cbiAgICAvLyAgICAgfSk7XG4gICAgLy8gfSk7XG5cbiAgICAvLyBhbmd1bGFyLmVsZW1lbnQoJy5jZWxsJykub24oXCJjbGlja1wiLCBmdW5jdGlvbihldnQpe1xuICAgIC8vICAgICBjb25zb2xlLmxvZygnYmluZGluZyBtb3VzZWVudGVyIGFuZCB0b3VjaG1vdmUnLCBldnQpO1xuICAgICAgICAvLyAkKFwiLmNlbGxcIikuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKCdmb3IgZWFjaCBlbGVtZW50Jyk7XG4gICAgICAgIC8vICAgIGlmIChkaXZfb3ZlcmxhcCh0aGlzLCBldnQucGFnZVgsIGV2dC5wYWdlWSkpe1xuICAgICAgICAvLyAgICAgY29uc29sZS5sb2coJ2VudGVyaW5nIGRpdl9vdmVybGFwJyk7XG4gICAgICAgIC8vICAgICAgIGlmICghdGhpcy5oYXNDbGFzcygnc2VsZWN0ZWQnKSkge1xuICAgICAgICAvLyAgICAgICAgIHRoaXMuYWRkQ2xhc3MoJ3NlbGVjdGVkJyk7XG4gICAgICAgIC8vICAgICAgIH1cbiAgICAgICAgLy8gICAgfVxuICAgICAgICAvLyB9KTtcbiAgICAvLyB9KTtcblxuICAgIC8vICRlbGVtZW50LmNoaWxkcmVuKCkoZnVuY3Rpb24oZXZ0KXtcbiAgICAvLyAgICAgY29uc29sZS5sb2coJ2JpbmRpbmcgbW91c2VlbnRlciBhbmQgdG91Y2htb3ZlJywgZXZ0KTtcbiAgICAgICAgLy8gJChcIi5jZWxsXCIpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgICBjb25zb2xlLmxvZygnZm9yIGVhY2ggZWxlbWVudCcpO1xuICAgICAgICAvLyAgICBpZiAoZGl2X292ZXJsYXAodGhpcywgZXZ0LnBhZ2VYLCBldnQucGFnZVkpKXtcbiAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKCdlbnRlcmluZyBkaXZfb3ZlcmxhcCcpO1xuICAgICAgICAvLyAgICAgICBpZiAoIXRoaXMuaGFzQ2xhc3MoJ3NlbGVjdGVkJykpIHtcbiAgICAgICAgLy8gICAgICAgICB0aGlzLmFkZENsYXNzKCdzZWxlY3RlZCcpO1xuICAgICAgICAvLyAgICAgICB9XG4gICAgICAgIC8vICAgIH1cbiAgICAgICAgLy8gfSk7XG4gICAgLy8gfSk7XG5cblxuICAgIC8vICRlbGVtZW50LmJpbmQoXCJ0b3VjaG1vdmVcIiwgZnVuY3Rpb24oZXZ0KXtcbiAgICAvLyAgICAgY29uc29sZS5sb2coJ2JpbmRpbmcgbW91c2VlbnRlciBhbmQgdG91Y2htb3ZlJywgZXZ0KTtcbiAgICAvLyAgICAgLy8gJChcIi5jZWxsXCIpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgLy8gICAgIC8vICAgICBjb25zb2xlLmxvZygnZm9yIGVhY2ggZWxlbWVudCcpO1xuICAgIC8vICAgICAvLyAgICBpZiAoZGl2X292ZXJsYXAodGhpcywgZXZ0LnBhZ2VYLCBldnQucGFnZVkpKXtcbiAgICAvLyAgICAgLy8gICAgIGNvbnNvbGUubG9nKCdlbnRlcmluZyBkaXZfb3ZlcmxhcCcpO1xuICAgIC8vICAgICAvLyAgICAgICBpZiAoIXRoaXMuaGFzQ2xhc3MoJ3NlbGVjdGVkJykpIHtcbiAgICAvLyAgICAgLy8gICAgICAgICB0aGlzLmFkZENsYXNzKCdzZWxlY3RlZCcpO1xuICAgIC8vICAgICAvLyAgICAgICB9XG4gICAgLy8gICAgIC8vICAgIH1cbiAgICAvLyAgICAgLy8gfSk7XG4gICAgLy8gfSk7XG5cbiAgICAvLyBhbmd1bGFyLmVsZW1lbnQoJy5jZWxsJykuYmluZChcInRvdWNobW92ZVwiLCBmdW5jdGlvbihldnQpe1xuICAgIC8vICAgICBjb25zb2xlLmxvZygnYmluZGluZyBtb3VzZWVudGVyIGFuZCB0b3VjaG1vdmUnLCBldnQpO1xuICAgIC8vICAgICBhbmd1bGFyLmVsZW1lbnQoJy5jZWxsJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAvLyAgICAgICAgIGNvbnNvbGUubG9nKCdmb3IgZWFjaCBlbGVtZW50Jyk7XG4gICAgLy8gICAgICAgIGlmIChkaXZfb3ZlcmxhcCh0aGlzLCBldnQucGFnZVgsIGV2dC5wYWdlWSkpe1xuICAgIC8vICAgICAgICAgY29uc29sZS5sb2coJ2VudGVyaW5nIGRpdl9vdmVybGFwJyk7XG4gICAgLy8gICAgICAgICAgIGlmICghdGhpcy5oYXNDbGFzcygnc2VsZWN0ZWQnKSkge1xuICAgIC8vICAgICAgICAgICAgIHRoaXMuYWRkQ2xhc3MoJ3NlbGVjdGVkJyk7XG4gICAgLy8gICAgICAgICAgIH1cbiAgICAvLyAgICAgICAgfVxuICAgIC8vICAgICB9KTtcbiAgICAvLyB9KTtcblxuICAgICRzY29wZS5tb2JpbGVEcmFnID0gZnVuY3Rpb24oc3BhY2UsIGlkKXtcbiAgICAgICAgY29uc29sZS5sb2coJ3RvdWNoIGlzIGRyYWdnZWQ6ICcgKyBzcGFjZSArIFwiIDogXCIgKyBpZCk7XG4gICAgICAgIGlmKCRzY29wZS50b3VjaElzQWN0aXZhdGVkICYmICRzY29wZS5kcmFnZ2luZ0FsbG93ZWQpe1xuICAgICAgICAgICAgJHNjb3BlLmNsaWNrKHNwYWNlLCBpZCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsaWNrID0gZnVuY3Rpb24oc3BhY2UsIGlkKSB7XG4gICAgICAgIGlmICgkc2NvcGUuZnJlZXplKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coJ2NsaWNrZWQgJywgc3BhY2UsIGlkKTtcbiAgICAgICAgdmFyIGx0cnNTZWxlY3RlZCA9IE9iamVjdC5rZXlzKCRzY29wZS5leHBvcnRzLndvcmRPYmopO1xuICAgICAgICB2YXIgcHJldmlvdXNMdHIgPSBsdHJzU2VsZWN0ZWRbbHRyc1NlbGVjdGVkLmxlbmd0aCAtIDJdO1xuICAgICAgICB2YXIgbGFzdEx0ciA9IGx0cnNTZWxlY3RlZFtsdHJzU2VsZWN0ZWQubGVuZ3RoIC0gMV07XG4gICAgICAgIGlmICghbHRyc1NlbGVjdGVkLmxlbmd0aCB8fCB2YWxpZFNlbGVjdChpZCwgbHRyc1NlbGVjdGVkKSkge1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZCArPSBzcGFjZTtcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLndvcmRPYmpbaWRdID0gc3BhY2U7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygkc2NvcGUuZXhwb3J0cyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaWQgPT09IHByZXZpb3VzTHRyKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkID0gJHNjb3BlLmV4cG9ydHMud29yZC5zdWJzdHJpbmcoMCwgJHNjb3BlLmV4cG9ydHMud29yZC5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgIGRlbGV0ZSAkc2NvcGUuZXhwb3J0cy53b3JkT2JqW2xhc3RMdHJdO1xuICAgICAgICB9IGVsc2UgaWYgKGx0cnNTZWxlY3RlZC5sZW5ndGggPT09IDEgJiYgaWQgPT09IGxhc3RMdHIpIHtcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLndvcmQgPSBcIlwiO1xuICAgICAgICAgICAgZGVsZXRlICRzY29wZS5leHBvcnRzLndvcmRPYmpbbGFzdEx0cl07XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICAvL2dldCB0aGUgY3VycmVudCByb29tIGluZm9cbiAgICBCb2FyZEZhY3RvcnkuZ2V0Q3VycmVudFJvb20oJHN0YXRlUGFyYW1zLnJvb21uYW1lKVxuICAgICAgICAudGhlbihyb29tID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHJvb20pXG4gICAgICAgICAgICAkc2NvcGUuZ2FtZUlkID0gcm9vbS5pZDtcbiAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMgPSByb29tLnVzZXJzLmZpbHRlcih1c2VyID0+IHVzZXIuaWQgIT09ICRzY29wZS51c2VyLmlkKTtcbiAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMuZm9yRWFjaChwbGF5ZXIgPT4geyBwbGF5ZXIuc2NvcmUgPSAwIH0pXG4gICAgICAgICAgICBMb2JieUZhY3Rvcnkuam9pbkdhbWUocm9vbS5pZCwgJHNjb3BlLnVzZXIuaWQpO1xuICAgICAgICB9KTtcblxuXG4gICAgJHNjb3BlLmhpZGVCb2FyZCA9IHRydWU7XG5cbiAgICAvLyBTdGFydCB0aGUgZ2FtZSB3aGVuIGFsbCBwbGF5ZXJzIGhhdmUgam9pbmVkIHJvb21cbiAgICAkc2NvcGUuc3RhcnRHYW1lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB1c2VySWRzID0gJHNjb3BlLm90aGVyUGxheWVycy5tYXAodXNlciA9PiB1c2VyLmlkKTtcbiAgICAgICAgdXNlcklkcy5wdXNoKCRzY29wZS51c2VyLmlkKTtcbiAgICAgICAgY29uc29sZS5sb2coJ29wJywgJHNjb3BlLm90aGVyUGxheWVycywgJ3VpJywgdXNlcklkcyk7XG4gICAgICAgICRzY29wZS53aW5Pckxvc2U9bnVsbDtcbiAgICAgICAgQm9hcmRGYWN0b3J5LmdldFN0YXJ0Qm9hcmQoJHNjb3BlLmdhbWVMZW5ndGgsICRzY29wZS5nYW1lSWQsIHVzZXJJZHMpO1xuICAgIH07XG5cblxuICAgIC8vUXVpdCB0aGUgcm9vbSwgYmFjayB0byBsb2JieVxuICAgICRzY29wZS5xdWl0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRyb290U2NvcGUuaGlkZU5hdmJhciA9IGZhbHNlO1xuICAgICAgICAkc3RhdGUuZ28oJ2xvYmJ5JylcbiAgICB9O1xuXG5cbiAgICAkc2NvcGUuYm9hcmQgPSBbXG4gICAgICAgIFsnYicsICdhJywgJ2QnLCAnZScsICdhJywgJ3InXSxcbiAgICAgICAgWydlJywgJ2YnLCAnZycsICdsJywgJ20nLCAnZSddLFxuICAgICAgICBbJ2gnLCAnaScsICdqJywgJ2YnLCAnbycsICdhJ10sXG4gICAgICAgIFsnYycsICdhJywgJ2QnLCAnZScsICdhJywgJ3InXSxcbiAgICAgICAgWydlJywgJ2YnLCAnZycsICdsJywgJ2QnLCAnZSddLFxuICAgICAgICBbJ2gnLCAnaScsICdqJywgJ2YnLCAnbycsICdhJ11cbiAgICBdO1xuXG4gICAgJHNjb3BlLm1lc3NhZ2VzID0gbnVsbDtcblxuICAgICRzY29wZS5zaXplID0gMztcbiAgICAkc2NvcGUuc2NvcmUgPSAwO1xuXG5cbiAgICAvL21ha2VzIHN1cmUgbGV0dGVyIGlzIGFkamFjZW50IHRvIHByZXYgbHRyLCBhbmQgaGFzbid0IGJlZW4gdXNlZCB5ZXRcbiAgICBmdW5jdGlvbiB2YWxpZFNlbGVjdChsdHJJZCwgb3RoZXJMdHJzSWRzKSB7XG4gICAgICAgIGlmIChvdGhlckx0cnNJZHMuaW5jbHVkZXMobHRySWQpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHZhciBjb29yZHMgPSBsdHJJZC5zcGxpdCgnLScpO1xuICAgICAgICB2YXIgcm93ID0gY29vcmRzWzBdO1xuICAgICAgICB2YXIgY29sID0gY29vcmRzWzFdO1xuICAgICAgICB2YXIgbGFzdEx0cklkID0gb3RoZXJMdHJzSWRzLnBvcCgpO1xuICAgICAgICB2YXIgY29vcmRzTGFzdCA9IGxhc3RMdHJJZC5zcGxpdCgnLScpO1xuICAgICAgICB2YXIgcm93TGFzdCA9IGNvb3Jkc0xhc3RbMF07XG4gICAgICAgIHZhciBjb2xMYXN0ID0gY29vcmRzTGFzdFsxXTtcbiAgICAgICAgdmFyIHJvd09mZnNldCA9IE1hdGguYWJzKHJvdyAtIHJvd0xhc3QpO1xuICAgICAgICB2YXIgY29sT2Zmc2V0ID0gTWF0aC5hYnMoY29sIC0gY29sTGFzdCk7XG4gICAgICAgIHJldHVybiAocm93T2Zmc2V0IDw9IDEgJiYgY29sT2Zmc2V0IDw9IDEpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsZWFySWZDb25mbGljdGluZyh1cGRhdGVXb3JkT2JqLCBleHBvcnRXb3JkT2JqKSB7XG4gICAgICAgIHZhciB0aWxlc01vdmVkID0gT2JqZWN0LmtleXModXBkYXRlV29yZE9iaik7XG4gICAgICAgIHZhciBteVdvcmRUaWxlcyA9IE9iamVjdC5rZXlzKGV4cG9ydFdvcmRPYmopO1xuICAgICAgICBpZiAodGlsZXNNb3ZlZC5zb21lKGNvb3JkID0+IG15V29yZFRpbGVzLmluY2x1ZGVzKGNvb3JkKSkpICRzY29wZS5jbGVhcigpO1xuICAgIH1cblxuICAgICRzY29wZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkID0gXCJcIjtcbiAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZE9iaiA9IHt9O1xuICAgIH07XG5cblxuICAgICRzY29wZS5zdWJtaXQgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3N1Ym1pdHRpbmcgJywgb2JqKTtcbiAgICAgICAgQm9hcmRGYWN0b3J5LnN1Ym1pdChvYmopO1xuICAgICAgICAkc2NvcGUuY2xlYXIoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNodWZmbGUgPSBCb2FyZEZhY3Rvcnkuc2h1ZmZsZTtcblxuXG4gICAgJHNjb3BlLnVwZGF0ZUJvYXJkID0gZnVuY3Rpb24od29yZE9iaikge1xuICAgICAgICBjb25zb2xlLmxvZygnc2NvcGUuYm9hcmQnLCAkc2NvcGUuYm9hcmQpO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gd29yZE9iaikge1xuICAgICAgICAgICAgdmFyIGNvb3JkcyA9IGtleS5zcGxpdCgnLScpO1xuICAgICAgICAgICAgdmFyIHJvdyA9IGNvb3Jkc1swXTtcbiAgICAgICAgICAgIHZhciBjb2wgPSBjb29yZHNbMV07XG4gICAgICAgICAgICAkc2NvcGUuYm9hcmRbcm93XVtjb2xdID0gd29yZE9ialtrZXldO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS51cGRhdGVTY29yZSA9IGZ1bmN0aW9uKHBvaW50cywgcGxheWVySWQpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3VwZGF0ZSBzY29yZSBwb2ludHMnLCBwb2ludHMpO1xuICAgICAgICBpZiAocGxheWVySWQgPT09ICRzY29wZS51c2VyLmlkKSB7XG4gICAgICAgICAgICAkc2NvcGUuc2NvcmUgKz0gcG9pbnRzO1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMucG9pbnRzRWFybmVkID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIHBsYXllciBpbiAkc2NvcGUub3RoZXJQbGF5ZXJzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCRzY29wZS5vdGhlclBsYXllcnNbcGxheWVyXS5pZCA9PT0gcGxheWVySWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVyc1twbGF5ZXJdLnNjb3JlICs9IHBvaW50cztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMucG9pbnRzRWFybmVkID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgICRzY29wZS51cGRhdGUgPSBmdW5jdGlvbih1cGRhdGVPYmopIHtcbiAgICAgICAgJHNjb3BlLnVwZGF0ZVNjb3JlKHVwZGF0ZU9iai5wb2ludHNFYXJuZWQsIHVwZGF0ZU9iai5wbGF5ZXJJZCk7XG4gICAgICAgICRzY29wZS51cGRhdGVCb2FyZCh1cGRhdGVPYmoud29yZE9iaik7XG4gICAgICAgIGlmICgrJHNjb3BlLnVzZXIuaWQgPT09ICt1cGRhdGVPYmoucGxheWVySWQpIHtcbiAgICAgICAgICAgIHZhciBwbGF5ZXIgPSAkc2NvcGUudXNlci51c2VybmFtZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiAkc2NvcGUub3RoZXJQbGF5ZXJzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCskc2NvcGUub3RoZXJQbGF5ZXJzW2tleV0uaWQgPT09ICt1cGRhdGVPYmoucGxheWVySWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBsYXllciA9ICRzY29wZS5vdGhlclBsYXllcnNba2V5XS51c2VybmFtZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICRzY29wZS5tZXNzYWdlID0gcGxheWVyICsgXCIgcGxheWVkIFwiICsgdXBkYXRlT2JqLndvcmQgKyBcIiBmb3IgXCIgKyB1cGRhdGVPYmoucG9pbnRzRWFybmVkICsgXCIgcG9pbnRzIVwiO1xuICAgICAgICBpZiAoJHNjb3BlLnRpbWVvdXQpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCgkc2NvcGUudGltZW91dCk7XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHNjb3BlLm1lc3NhZ2UgPSAnJztcbiAgICAgICAgfSwgMzAwMClcbiAgICAgICAgY29uc29sZS5sb2coJ2l0cyB1cGRhdGluZyEnKTtcbiAgICAgICAgY2xlYXJJZkNvbmZsaWN0aW5nKHVwZGF0ZU9iaiwgJHNjb3BlLmV4cG9ydHMud29yZE9iaik7XG4gICAgICAgICRzY29wZS5leHBvcnRzLnN0YXRlTnVtYmVyID0gdXBkYXRlT2JqLnN0YXRlTnVtYmVyO1xuICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgIH07XG5cbiAgICAkc2NvcGUucmVwbGF5ID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgTG9iYnlGYWN0b3J5Lm5ld0dhbWUoeyByb29tbmFtZTogJHNjb3BlLnJvb21OYW1lIH0pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihnYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZXBsYXkgZ2FtZSBvYmo6XCIsIGdhbWUpO1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLmdhbWVJZCA9IGdhbWUuaWQ7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnN0YXJ0R2FtZSgpO1xuICAgICAgICAgICAgICAgIHZhciBhbGxJZHMgPSAkc2NvcGUub3RoZXJQbGF5ZXJzLm1hcChwbGF5ZXIgPT4gcGxheWVyLmlkKTtcbiAgICAgICAgICAgICAgICBhbGxJZHMucHVzaCgkc2NvcGUudXNlci5pZCk7XG4gICAgICAgICAgICAgICAgJHEuYWxsKGFsbElkcy5tYXAoaWQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBMb2JieUZhY3Rvcnkuam9pbkdhbWUoJHNjb3BlLmdhbWVJZCwgaWQpO1xuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2Vycm9yIHJlc3RhcnRpbmcgdGhlIGdhbWUnLCBlKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZGV0ZXJtaW5lV2lubmVyID0gZnVuY3Rpb24od2lubmVyc0FycmF5KSB7XG4gICAgICAgIGlmICh3aW5uZXJzQXJyYXkubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICBpZiAoK3dpbm5lcnNBcnJheVswXSA9PT0gKyRzY29wZS51c2VyLmlkKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLndpbk9yTG9zZSA9IFwiQ29uZ3JhdHVsYXRpb24hIFlvdSBhcmUgYSB3b3JkIHdpemFyZCEgWW91IHdvbiEhIVwiO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBwbGF5ZXIgaW4gJHNjb3BlLm90aGVyUGxheWVycykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKyRzY29wZS5vdGhlclBsYXllcnNbcGxheWVyXS5pZCA9PT0gK3dpbm5lcnNBcnJheVswXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHdpbm5lciA9ICRzY29wZS5vdGhlclBsYXllcnNbcGxheWVyXS51c2VybmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS53aW5Pckxvc2UgPSBcIlRvdWdoIGx1Y2suIFwiICsgd2lubmVyICsgXCIgaGFzIGJlYXRlbiB5b3UuIEJldHRlciBMdWNrIG5leHQgdGltZS4gOihcIlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IHdpbm5lcnMgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgaW4gd2lubmVyc0FycmF5KSB7XG4gICAgICAgICAgICAgICAgaWYgKCt3aW5uZXJzQXJyYXlbaV0gPT09ICskc2NvcGUudXNlci5pZCkgeyB3aW5uZXJzLnB1c2goJHNjb3BlLnVzZXIudXNlcm5hbWUpOyB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBwbGF5ZXIgaW4gJHNjb3BlLm90aGVyUGxheWVycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS5vdGhlclBsYXllcnNbcGxheWVyXS5pZCA9PSB3aW5uZXJzQXJyYXlbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5uZXJzLnB1c2goJHNjb3BlLm90aGVyUGxheWVyc1twbGF5ZXJdLnVzZXJuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh3aW5uZXJzKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUud2luT3JMb3NlID0gXCJUaGUgZ2FtZSB3YXMgYSB0aWUgYmV0d2VlbiBcIjtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHdpbm5lcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPT09IHdpbm5lcnMubGVuZ3RoIC0gMSkgeyAkc2NvcGUud2luT3JMb3NlICs9IFwiYW5kIFwiICsgd2lubmVyc1tpXSArIFwiLlwiOyB9IGVsc2UgeyAkc2NvcGUud2luT3JMb3NlICs9IHdpbm5lcnNbaV0gKyBcIiwgXCI7IH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdkZXN0cm95ZWQnKTtcbiAgICAgICAgU29ja2V0LmRpc2Nvbm5lY3QoKTtcblxuICAgIH0pO1xuXG4gICAgU29ja2V0Lm9uKCdjb25uZWN0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdjb25uZWN0aW5nJyk7XG4gICAgICAgICRxLmFsbChbXG4gICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24odXNlcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd1c2VyIGZyb20gQXV0aFNlcnZpY2UnLCB1c2VyKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMucGxheWVySWQgPSB1c2VyLmlkO1xuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIC8vZ2V0IHRoZSBjdXJyZW50IHJvb20gaW5mb1xuICAgICAgICAgICAgQm9hcmRGYWN0b3J5LmdldEN1cnJlbnRSb29tKCRzdGF0ZVBhcmFtcy5yb29tbmFtZSlcbiAgICAgICAgICAgIC50aGVuKHJvb20gPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJvb20pO1xuICAgICAgICAgICAgICAgICRzY29wZS5nYW1lSWQgPSByb29tLmlkO1xuICAgICAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMgPSByb29tLnVzZXJzLmZpbHRlcih1c2VyID0+IHVzZXIuaWQgIT09ICRzY29wZS51c2VyLmlkKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzLmZvckVhY2gocGxheWVyID0+IHsgcGxheWVyLnNjb3JlID0gMCB9KTtcbiAgICAgICAgICAgICAgICBMb2JieUZhY3Rvcnkuam9pbkdhbWUocm9vbS5pZCwgJHNjb3BlLnVzZXIuaWQpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgXSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIFNvY2tldC5lbWl0KCdqb2luUm9vbScsICRzY29wZS51c2VyLCAkc2NvcGUucm9vbU5hbWUsICRzY29wZS5nYW1lSWQpO1xuICAgICAgICAgICAgJHNjb3BlLmhpZGVTdGFydCA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdlbWl0dGluZyBcImpvaW4gcm9vbVwiIGV2ZW50IHRvIHNlcnZlciA4UCcsICRzY29wZS5yb29tTmFtZSk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2Vycm9yIGdyYWJiaW5nIHVzZXIgb3Igcm9vbSBmcm9tIGRiOiAnLCBlKTtcbiAgICAgICAgfSk7XG5cblxuICAgICAgICBTb2NrZXQub24oJ3Jvb21Kb2luU3VjY2VzcycsIGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCduZXcgdXNlciBqb2luaW5nJywgdXNlci5pZCk7XG4gICAgICAgICAgICB1c2VyLnNjb3JlID0gMDtcbiAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMucHVzaCh1c2VyKTtcbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCdzdGFydEJvYXJkJywgZnVuY3Rpb24oYm9hcmQpIHtcbiAgICAgICAgICAgICRzY29wZS5mcmVlemUgPSBmYWxzZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdib2FyZCEgJywgYm9hcmQpO1xuICAgICAgICAgICAgJHNjb3BlLmJvYXJkID0gYm9hcmQ7XG4gICAgICAgICAgICAvLyBzZXRJbnRlcnZhbChmdW5jdGlvbigpe1xuICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVycy5mb3JFYWNoKHBsYXllciA9PiB7IHBsYXllci5zY29yZSA9IDAgfSk7XG4gICAgICAgICAgICAkc2NvcGUuc2NvcmUgPSAwO1xuICAgICAgICAgICAgJHNjb3BlLmhpZGVCb2FyZCA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgICAgIC8vIH0sIDMwMDApO1xuICAgICAgICB9KTtcblxuICAgICAgICBTb2NrZXQub24oJ3dvcmRWYWxpZGF0ZWQnLCBmdW5jdGlvbih1cGRhdGVPYmopIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd3b3JkIGlzIHZhbGlkYXRlZCcpO1xuICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZSh1cGRhdGVPYmopO1xuICAgICAgICAgICAgJHNjb3BlLmxhc3RXb3JkUGxheWVkID0gdXBkYXRlT2JqLndvcmQ7XG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICBTb2NrZXQub24oJ2JvYXJkU2h1ZmZsZWQnLCBmdW5jdGlvbihib2FyZCwgdXNlcklkLCBzdGF0ZU51bWJlcikge1xuICAgICAgICAgICAgJHNjb3BlLmJvYXJkID0gYm9hcmQ7XG4gICAgICAgICAgICAkc2NvcGUudXBkYXRlU2NvcmUoLTUsIHVzZXJJZCk7XG4gICAgICAgICAgICAkc2NvcGUuY2xlYXIoKTtcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLnN0YXRlTnVtYmVyID0gc3RhdGVOdW1iZXI7XG4gICAgICAgICAgICAkc2NvcGUubWVzc2FnZSA9IHVzZXJJZCArIFwiIHNodWZmbGVkIHRoZSBib2FyZCFcIjtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCRzY29wZS5tZXNzYWdlKTtcbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIFNvY2tldC5vbigncGxheWVyRGlzY29ubmVjdGVkJywgZnVuY3Rpb24odXNlcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3BsYXllckRpc2Nvbm5lY3RlZCcsIHVzZXIuaWQpO1xuICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVycyA9ICRzY29wZS5vdGhlclBsYXllcnMubWFwKG90aGVyUGxheWVycyA9PiBvdGhlclBsYXllcnMuaWQgIT09IHVzZXIuaWQpO1xuXG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICBTb2NrZXQub24oJ2dhbWVPdmVyJywgZnVuY3Rpb24od2lubmVyc0FycmF5KSB7XG4gICAgICAgICAgICAkc2NvcGUuY2xlYXIoKTtcbiAgICAgICAgICAgICRzY29wZS5mcmVlemUgPSB0cnVlO1xuICAgICAgICAgICAgJHNjb3BlLmRldGVybWluZVdpbm5lcih3aW5uZXJzQXJyYXkpO1xuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnYW1lIGlzIG92ZXIsIHdpbm5lcnM6ICcsIHdpbm5lcnNBcnJheSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSk7XG4iLCJhcHAuZmFjdG9yeSAoXCJCb2FyZEZhY3RvcnlcIiwgZnVuY3Rpb24oJGh0dHAsIFNvY2tldCl7XG5cdHJldHVybntcblx0XHRnZXRTdGFydEJvYXJkOiBmdW5jdGlvbihnYW1lTGVuZ3RoLCBnYW1lSWQsIHVzZXJJZHMpe1xuXHRcdFx0Y29uc29sZS5sb2coJ2ZhY3RvcnkuIGdsOiAnLCBnYW1lTGVuZ3RoKTtcblx0XHRcdFNvY2tldC5lbWl0KCdnZXRTdGFydEJvYXJkJywgZ2FtZUxlbmd0aCwgZ2FtZUlkLCB1c2VySWRzKTtcblx0XHR9LFxuXG5cdFx0c3VibWl0OiBmdW5jdGlvbihvYmope1xuXHRcdFx0U29ja2V0LmVtaXQoJ3N1Ym1pdFdvcmQnLCBvYmopO1xuXHRcdH0sXG5cblx0XHRzaHVmZmxlOiBmdW5jdGlvbih1c2VyKXtcblx0XHRcdGNvbnNvbGUubG9nKCdncmlkZmFjdG9yeSB1Jyx1c2VyLmlkKTtcblx0XHRcdFNvY2tldC5lbWl0KCdzaHVmZmxlQm9hcmQnLHVzZXIuaWQpO1xuXHRcdH0sXG5cblx0XHQvLyBmaW5kQWxsT3RoZXJVc2VyczogZnVuY3Rpb24oZ2FtZSkge1xuXHRcdC8vIFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS9nYW1lcy8nKyBnYW1lLmlkKVxuXHRcdC8vIFx0LnRoZW4ocmVzID0+IHJlcy5kYXRhKVxuXHRcdC8vIH0sXG5cblx0XHRnZXRDdXJyZW50Um9vbTogZnVuY3Rpb24ocm9vbW5hbWUpIHtcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvZ2FtZXMvcm9vbXMvJytyb29tbmFtZSlcblx0XHRcdC50aGVuKHJlcyA9PiByZXMuZGF0YSlcblx0XHR9LFxuXG5cdFx0cXVpdEZyb21Sb29tOiBmdW5jdGlvbihnYW1lSWQsIHVzZXJJZCkge1xuXHRcdFx0Ly8gU29ja2V0LmVtaXQoJ2Rpc2Nvbm5lY3QnLCByb29tTmFtZSwgdXNlcklkKTtcblx0XHRcdHJldHVybiAkaHR0cC5kZWxldGUoJy9hcGkvZ2FtZXMvJytnYW1lSWQrJy8nK3VzZXJJZClcblx0XHR9XG5cdH1cbn0pO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ0xlYWRlckJvYXJkQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgTGVhZGVyQm9hcmRGYWN0b3J5LCAkc3RhdGUsIEF1dGhTZXJ2aWNlKSB7XG4gICAgY29uc29sZS5sb2coJyAxJylcbiAgICBMZWFkZXJCb2FyZEZhY3RvcnkuQWxsUGxheWVycygpXG4gICAgLnRoZW4ocGxheWVycyA9PiB7XG4gICAgICAgIHBsYXllcnMuZm9yRWFjaChwbGF5ZXIgPT4ge1xuICAgICAgICAgICAgaWYgKHBsYXllci5nYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNjb3JlcyA9IHBsYXllci5nYW1lcy5tYXAoZ2FtZSA9PiBnYW1lLnVzZXJHYW1lLnNjb3JlKVxuICAgICAgICAgICAgICAgIHBsYXllci5oaWdoZXN0U2NvcmUgPSBNYXRoLm1heCguLi5zY29yZXMpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBsYXllci5oaWdoZXN0U2NvcmUgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGxheWVyLmdhbWVzX3dvbiA9IHBsYXllci53aW5uZXIubGVuZ3RoO1xuICAgICAgICAgICAgcGxheWVyLmdhbWVzX3BsYXllZCA9IHBsYXllci5nYW1lcy5sZW5ndGg7XG4gICAgICAgICAgICBpZihwbGF5ZXIuZ2FtZXMubGVuZ3RoPT09MCl7XG4gICAgICAgICAgICBcdHBsYXllci53aW5fcGVyY2VudGFnZSA9IDAgKyAnJSdcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBcdHBsYXllci53aW5fcGVyY2VudGFnZSA9ICgocGxheWVyLndpbm5lci5sZW5ndGgvcGxheWVyLmdhbWVzLmxlbmd0aCkqMTAwKS50b0ZpeGVkKDApICsgJyUnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pXG4gICAgICAgICRzY29wZS5wbGF5ZXJzID0gcGxheWVycztcbiAgICB9KVxufSk7XG4iLCJhcHAuZmFjdG9yeSgnTGVhZGVyQm9hcmRGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG5cdHZhciBMZWFkZXJCb2FyZEZhY3RvcnkgPSB7fTtcblxuXHRMZWFkZXJCb2FyZEZhY3RvcnkuQWxsUGxheWVycyA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvdXNlcnMnKVxuXHRcdC50aGVuKHJlcz0+cmVzLmRhdGEpXG5cdH1cblxuXHRyZXR1cm4gTGVhZGVyQm9hcmRGYWN0b3J5O1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xlYWRlckJvYXJkJywge1xuICAgICAgICB1cmw6ICcvbGVhZGVyQm9hcmQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xlYWRlckJvYXJkL2xlYWRlckJvYXJkLnRlbXBsYXRlLmh0bWwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgIFx0YWxsUGxheWVyczogZnVuY3Rpb24oTGVhZGVyQm9hcmRGYWN0b3J5KSB7XG4gICAgICAgIFx0XHRyZXR1cm4gTGVhZGVyQm9hcmRGYWN0b3J5LkFsbFBsYXllcnM7XG4gICAgICAgIFx0fSxcbiAgICAgICAgICAgIFxuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiAnTGVhZGVyQm9hcmRDdHJsJ1xuICAgIH0pO1xuXG59KTsiLCJhcHAuZGlyZWN0aXZlKCdsZXR0ZXInLCAoKSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIHNwYWNlOiAnPScsXG4gICAgICAgICAgICB4OiAnPScsXG4gICAgICAgICAgICB5OiAnPScsXG4gICAgICAgICAgICBkcmFnZ2luZ0FsbG93ZWQ6ICc9JyxcbiAgICAgICAgICAgIGV4cG9ydHM6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWwsIGF0dHIpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnc2NvcGUuZHJhZ2dpbmdBbGxvd2VkOiAnICsgc2NvcGUuZHJhZ2dpbmdBbGxvd2VkKTtcblxuICAgICAgICAgICAgc2NvcGUubW91c2VJc0Rvd24gPSBmYWxzZTtcbiAgICAgICAgICAgIHNjb3BlLnRvdWNoSXNBY3RpdmF0ZWQgPSBmYWxzZTtcblxuXG4gICAgICAgICAgICBzY29wZS5tb3VzZURvd24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbW91c2UgaXMgZG93bicpXG4gICAgICAgICAgICAgICAgc2NvcGUubW91c2VJc0Rvd24gPSB0cnVlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubW91c2VVcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdtb3VzZSBpcyB1cCcpO1xuICAgICAgICAgICAgICAgIHNjb3BlLm1vdXNlSXNEb3duID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgaWYgKHNjb3BlLmRyYWdnaW5nQWxsb3dlZCAmJiBzY29wZS5leHBvcnRzLndvcmQubGVuZ3RoID4gMSkgc2NvcGUuc3VibWl0KHNjb3BlLmV4cG9ydHMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUudG91Y2hBY3RpdmF0ZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndG91Y2ggaXMgYWN0aXZhdGVkOiAnICsgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICBzY29wZS50b3VjaElzQWN0aXZhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2NvcGUudG91Y2hTdG9wcGVkID0gZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0b3VjaCBpcyBzdG9wcGVkOiAnICsgZSk7XG4gICAgICAgICAgICAgICAgc2NvcGUudG91Y2hJc0FjdGl2YXRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGlmIChzY29wZS5kcmFnZ2luZ0FsbG93ZWQgJiYgc2NvcGUuZXhwb3J0cy53b3JkLmxlbmd0aCA+IDEpIHNjb3BlLnN1Ym1pdChzY29wZS5leHBvcnRzKTtcbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICBzY29wZS5kcmFnID0gZnVuY3Rpb24oc3BhY2UsIGlkKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ21vdXNlIGVudGVyOiAnICsgaWQpO1xuICAgICAgICAgICAgICAgIGlmIChzY29wZS5tb3VzZUlzRG93biAmJiBzY29wZS5kcmFnZ2luZ0FsbG93ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuY2xpY2soc3BhY2UsIGlkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBmdW5jdGlvbiB2YWxpZFNlbGVjdChsdHJJZCwgb3RoZXJMdHJzSWRzKSB7XG4gICAgICAgICAgICAgICAgaWYgKG90aGVyTHRyc0lkcy5pbmNsdWRlcyhsdHJJZCkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgY29vcmRzID0gbHRySWQuc3BsaXQoJy0nKTtcbiAgICAgICAgICAgICAgICB2YXIgcm93ID0gY29vcmRzWzBdO1xuICAgICAgICAgICAgICAgIHZhciBjb2wgPSBjb29yZHNbMV07XG4gICAgICAgICAgICAgICAgdmFyIGxhc3RMdHJJZCA9IG90aGVyTHRyc0lkcy5wb3AoKTtcbiAgICAgICAgICAgICAgICB2YXIgY29vcmRzTGFzdCA9IGxhc3RMdHJJZC5zcGxpdCgnLScpO1xuICAgICAgICAgICAgICAgIHZhciByb3dMYXN0ID0gY29vcmRzTGFzdFswXTtcbiAgICAgICAgICAgICAgICB2YXIgY29sTGFzdCA9IGNvb3Jkc0xhc3RbMV07XG4gICAgICAgICAgICAgICAgdmFyIHJvd09mZnNldCA9IE1hdGguYWJzKHJvdyAtIHJvd0xhc3QpO1xuICAgICAgICAgICAgICAgIHZhciBjb2xPZmZzZXQgPSBNYXRoLmFicyhjb2wgLSBjb2xMYXN0KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHJvd09mZnNldCA8PSAxICYmIGNvbE9mZnNldCA8PSAxKTtcbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICBzY29wZS5jbGljayA9IGZ1bmN0aW9uKHNwYWNlLCBpZCkge1xuICAgICAgICAgICAgICAgIGlmIChzY29wZS5mcmVlemUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY2xpY2tlZCAnLCBzcGFjZSwgaWQpO1xuICAgICAgICAgICAgICAgIHZhciBsdHJzU2VsZWN0ZWQgPSBPYmplY3Qua2V5cyhzY29wZS5leHBvcnRzLndvcmRPYmopO1xuICAgICAgICAgICAgICAgIHZhciBwcmV2aW91c0x0ciA9IGx0cnNTZWxlY3RlZFtsdHJzU2VsZWN0ZWQubGVuZ3RoIC0gMl07XG4gICAgICAgICAgICAgICAgdmFyIGxhc3RMdHIgPSBsdHJzU2VsZWN0ZWRbbHRyc1NlbGVjdGVkLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgIGlmICghbHRyc1NlbGVjdGVkLmxlbmd0aCB8fCB2YWxpZFNlbGVjdChpZCwgbHRyc1NlbGVjdGVkKSkge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5leHBvcnRzLndvcmQgKz0gc3BhY2U7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmV4cG9ydHMud29yZE9ialtpZF0gPSBzcGFjZTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coc2NvcGUuZXhwb3J0cyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpZCA9PT0gcHJldmlvdXNMdHIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuZXhwb3J0cy53b3JkID0gc2NvcGUuZXhwb3J0cy53b3JkLnN1YnN0cmluZygwLCBzY29wZS5leHBvcnRzLndvcmQubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBzY29wZS5leHBvcnRzLndvcmRPYmpbbGFzdEx0cl07XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsdHJzU2VsZWN0ZWQubGVuZ3RoID09PSAxICYmIGlkID09PSBsYXN0THRyKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmV4cG9ydHMud29yZCA9IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBzY29wZS5leHBvcnRzLndvcmRPYmpbbGFzdEx0cl07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgZnVuY3Rpb24gZGl2X292ZXJsYXAoanFvLCBsZWZ0LCB0b3ApIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZGl2IG92ZXJsYXBwZWQ6ICcgKyBqcW8pO1xuICAgICAgICAgICAgICAgIHZhciBkID0ganFvLm9mZnNldCgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0b3AgPj0gZC50b3AgJiYgbGVmdCA+PSBkLmxlZnQgJiYgbGVmdCA8PSAoZC5sZWZ0K2pxb1swXS5vZmZzZXRXaWR0aCkgJiYgdG9wIDw9IChkLnRvcCtqcW9bMF0ub2Zmc2V0SGVpZ2h0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZWwuYmluZChcInRvdWNobW92ZVwiLCBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnYmluZGluZyBtb3VzZWVudGVyIGFuZCB0b3VjaG1vdmUnLCBldnQpO1xuICAgICAgICAgICAgICAgIGVsLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdmb3IgZWFjaCBlbGVtZW50Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkaXZfb3ZlcmxhcCh0aGlzLCBldnQucGFnZVgsIGV2dC5wYWdlWSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdlbnRlcmluZyBkaXZfb3ZlcmxhcCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmhhc0NsYXNzKCdzZWxlY3RlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRDbGFzcygnc2VsZWN0ZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgLy8gc2NvcGUubW9iaWxlRHJhZyA9IGZ1bmN0aW9uKHNwYWNlLCBpZCkge1xuICAgICAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKCd0b3VjaCBpcyBkcmFnZ2VkOiAnICsgc3BhY2UgKyBcIiA6IFwiICsgaWQpO1xuICAgICAgICAgICAgLy8gICAgIGlmKCRzY29wZS50b3VjaElzQWN0aXZhdGVkICYmICRzY29wZS5kcmFnZ2luZ0FsbG93ZWQpe1xuICAgICAgICAgICAgLy8gICAgICAgICAkc2NvcGUuY2xpY2soc3BhY2UsIGlkKTtcbiAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAvLyB9O1xuXG5cblxuICAgICAgICB9LFxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9qcy9sZXR0ZXIvbGV0dGVyLnRlbXBsYXRlLmh0bWwnXG4gICAgfVxufSk7XG4iLCJhcHAuY29udHJvbGxlcignTG9iYnlDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBMb2JieUZhY3RvcnksIHJvb21zLCAkc3RhdGUsIEF1dGhTZXJ2aWNlKSB7XG5cbiAgICAvLyBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKVxuICAgIC8vICAgICAudGhlbihmdW5jdGlvbih1c2VyKSB7XG4gICAgLy8gICAgICAgICAkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgLy8gICAgIH0pO1xuXG4gICAgJHNjb3BlLnJvb21zID0gcm9vbXM7XG4gICAgJHNjb3BlLnJvb21OYW1lRm9ybSA9IGZhbHNlO1xuICAgIC8vICRzY29wZS51c2VyID0ge1xuICAgIC8vICBpZDogM1xuICAgIC8vIH1cblxuICAgIC8vICRzY29wZS5qb2luR2FtZSA9IGZ1bmN0aW9uKHJvb20pIHtcbiAgICAvLyAgICAgY29uc29sZS5sb2coXCJpbSBjaGFuZ2luZyBzdGF0ZSBhbmQgcmVsb2FkaW5nXCIpO1xuICAgIC8vICAgICAkc3RhdGUuZ28oJ0dhbWUnLCB7IHJvb21uYW1lOiByb29tLnJvb21uYW1lIH0sIHsgcmVsb2FkOiB0cnVlLCBub3RpZnk6IHRydWUgfSlcbiAgICAvLyB9O1xuXG4gICAgJHNjb3BlLm5ld1Jvb20gPSBmdW5jdGlvbihyb29tSW5mbykge1xuICAgICAgICBMb2JieUZhY3RvcnkubmV3R2FtZShyb29tSW5mbyk7XG4gICAgICAgICRzY29wZS5yb29tTmFtZUZvcm0gPSBmYWxzZTtcbiAgICB9O1xuICAgICRzY29wZS5zaG93Rm9ybSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUucm9vbU5hbWVGb3JtID0gdHJ1ZTtcbiAgICB9O1xuXG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ2VudGVyTG9iYnknLCBmdW5jdGlvbigpe1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgdGVtcGxhdGVVcmw6ICdqcy9sb2JieS9sb2JieS1idXR0b24uaHRtbCcsXG4gICAgY29udHJvbGxlcjogJ0hvbWVDdHJsJ1xuICB9XG59KVxuIiwiYXBwLmZhY3RvcnkoJ0xvYmJ5RmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuXHR2YXIgTG9iYnlGYWN0b3J5ID0ge307XG5cdHZhciB0ZW1wUm9vbXMgPSBbXTsgLy93b3JrIHdpdGggc29ja2V0P1xuXG5cdExvYmJ5RmFjdG9yeS5nZXRBbGxSb29tcyA9IGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS9nYW1lcy9yb29tcycpXG5cdFx0LnRoZW4ocmVzID0+IHJlcy5kYXRhKVxuXHRcdC50aGVuKHJvb21zID0+IHtcblx0XHRcdGFuZ3VsYXIuY29weShyb29tcywgdGVtcFJvb21zKTtcblx0XHRcdHJldHVybiB0ZW1wUm9vbXM7XG5cdFx0fSlcblx0fTtcblxuXHRMb2JieUZhY3Rvcnkuam9pbkdhbWUgPSBmdW5jdGlvbihyb29tSWQsIHVzZXJJZCkge1xuICAgIGNvbnNvbGUubG9nKCdsb2JieSBmYWN0b3J5IGpvaW4gZ2FtZScpO1xuXHRcdHJldHVybiAkaHR0cC5wdXQoJy9hcGkvZ2FtZXMvJysgcm9vbUlkICsnL3BsYXllcicsIHtpZDogdXNlcklkfSlcblx0XHQudGhlbihyZXM9PnJlcy5kYXRhKVxuXHR9O1xuXG5cdExvYmJ5RmFjdG9yeS5uZXdHYW1lID0gZnVuY3Rpb24ocm9vbUluZm8pIHtcblx0XHRyZXR1cm4gJGh0dHAucHV0KCcvYXBpL2dhbWVzJywgcm9vbUluZm8pXG5cdFx0LnRoZW4ocmVzID0+IHJlcy5kYXRhKVxuXHQgXHQudGhlbihyb29tID0+IHtcblx0IFx0XHR0ZW1wUm9vbXMucHVzaChyb29tKTtcblx0IFx0XHRyZXR1cm4gcm9vbTtcblx0IFx0XHR9KTtcblx0fTtcblxuXHRMb2JieUZhY3RvcnkuQWxsUGxheWVycyA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvdXNlcnMnKVxuXHRcdC50aGVuKHJlcz0+cmVzLmRhdGEpXG5cdH07XG5cblx0cmV0dXJuIExvYmJ5RmFjdG9yeTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsb2JieScsIHtcbiAgICAgICAgdXJsOiAnL2xvYmJ5JyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2JieS9sb2JieS50ZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICBcdHJvb21zOiBmdW5jdGlvbihMb2JieUZhY3RvcnkpIHtcbiAgICAgICAgXHRcdHJldHVybiBMb2JieUZhY3RvcnkuZ2V0QWxsUm9vbXMoKTtcbiAgICAgICAgXHR9XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2JieUN0cmwnXG4gICAgfSk7XG5cbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbiAobG9naW5JbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ21lbWJlcnNPbmx5Jywge1xuICAgICAgICB1cmw6ICcvbWVtYmVycy1hcmVhJyxcbiAgICAgICAgdGVtcGxhdGU6ICc8aW1nIG5nLXJlcGVhdD1cIml0ZW0gaW4gc3Rhc2hcIiB3aWR0aD1cIjMwMFwiIG5nLXNyYz1cInt7IGl0ZW0gfX1cIiAvPicsXG4gICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUsIFNlY3JldFN0YXNoKSB7XG4gICAgICAgICAgICBTZWNyZXRTdGFzaC5nZXRTdGFzaCgpLnRoZW4oZnVuY3Rpb24gKHN0YXNoKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnN0YXNoID0gc3Rhc2g7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBkYXRhLmF1dGhlbnRpY2F0ZSBpcyByZWFkIGJ5IGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KTtcblxufSk7XG5cbiIsImFwcC5kaXJlY3RpdmUoJ3JhbmtEaXJlY3RpdmUnLCAoKT0+IHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0UnLFxuXHRcdHNjb3BlOiB7XG5cdFx0XHRyYW5rTmFtZTogJ0AnLFxuXHRcdFx0cGxheWVyczogJz0nLFxuXHRcdFx0cmFua0J5OiAnQCcsXG5cdFx0XHRvcmRlcjogJ0AnXG5cdFx0fSxcblx0XHR0ZW1wbGF0ZVVybDogJy9qcy9yYW5rL3JhbmsudGVtcGxhdGUuaHRtbCdcblx0fVxufSk7IiwiYXBwLmZhY3RvcnkoJ1NpZ251cEZhY3RvcnknLCBmdW5jdGlvbigkaHR0cCwgJHN0YXRlLCBBdXRoU2VydmljZSkge1xuXHRjb25zdCBTaWdudXBGYWN0b3J5ID0ge307XG5cblx0U2lnbnVwRmFjdG9yeS5jcmVhdGVVc2VyID0gZnVuY3Rpb24oc2lnbnVwSW5mbykge1xuXHRcdGNvbnNvbGUubG9nKHNpZ251cEluZm8pXG5cdFx0cmV0dXJuICRodHRwLnBvc3QoJy9zaWdudXAnLCBzaWdudXBJbmZvKVxuXHRcdC50aGVuKHJlcyA9PiB7XG5cdFx0XHRpZiAocmVzLnN0YXR1cyA9PT0gMjAxKSB7XG5cdFx0XHRcdEF1dGhTZXJ2aWNlLmxvZ2luKHtlbWFpbDogc2lnbnVwSW5mby5lbWFpbCwgcGFzc3dvcmQ6IHNpZ251cEluZm8ucGFzc3dvcmR9KVxuXHRcdFx0XHQudGhlbih1c2VyID0+IHtcblx0XHRcdFx0XHQkc3RhdGUuZ28oJ2hvbWUnKVxuXHRcdFx0XHR9KVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhyb3cgRXJyb3IoJ0FuIGFjY291bnQgd2l0aCB0aGF0IGVtYWlsIGFscmVhZHkgZXhpc3RzJyk7XG5cdFx0XHR9XG5cdFx0fSlcblx0fVxuXG5cdHJldHVybiBTaWdudXBGYWN0b3J5O1xufSkiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3NpZ251cCcsIHtcbiAgICAgICAgdXJsOiAnL3NpZ251cCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvc2lnbnVwL3NpZ251cC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1NpZ251cEN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignU2lnbnVwQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUsIFNpZ251cEZhY3RvcnkpIHtcblxuICAgICRzY29wZS5zaWdudXAgPSB7fTtcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgJHNjb3BlLnNlbmRTaWdudXAgPSBmdW5jdGlvbihzaWdudXBJbmZvKXtcbiAgICAgICAgU2lnbnVwRmFjdG9yeS5jcmVhdGVVc2VyKHNpZ251cEluZm8pXG4gICAgICAgIC5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnQW4gYWNjb3VudCB3aXRoIHRoYXQgZW1haWwgYWxyZWFkeSBleGlzdHMnO1xuICAgICAgICB9KVxuICAgIH1cbiAgICBcblxuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpe1xuXHQkc3RhdGVQcm92aWRlci5zdGF0ZShcIlVzZXJQcm9maWxlXCIse1xuXHRcdHVybDogXCIvdXNlcnMvOnVzZXJJZFwiLFxuXHRcdHRlbXBsYXRlVXJsOlwianMvdXNlcl9wcm9maWxlL3Byb2ZpbGUudGVtcGxhdGUuaHRtbFwiLFxuXHRcdGNvbnRyb2xsZXI6IFwiVXNlckN0cmxcIlxuXHR9KVxuXHQkc3RhdGVQcm92aWRlci5zdGF0ZShcIkdhbWVSZWNvcmRcIiwge1xuXHRcdHVybDpcIi91c2Vycy86dXNlcklkL2dhbWVzXCIsXG5cdFx0dGVtcGxhdGVVcmw6IFwianMvdXNlcl9wcm9maWxlL2dhbWVzLmh0bWxcIixcblx0XHRjb250cm9sbGVyOiBcIkdhbWVSZWNvcmRDdHJsXCJcblx0fSlcbn0pXG5cbmFwcC5jb250cm9sbGVyKFwiVXNlckN0cmxcIiwgZnVuY3Rpb24oJHNjb3BlLCBVc2VyRmFjdG9yeSwgJHN0YXRlUGFyYW1zKXtcblx0VXNlckZhY3RvcnkuZmV0Y2hJbmZvcm1hdGlvbigkc3RhdGVQYXJhbXMudXNlcklkKVxuXHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0XHQkc2NvcGUudXNlcj11c2VyO1xuXHRcdHJldHVybiB1c2VyXG5cdH0pXG5cdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHRcdCRzY29wZS51cGRhdGVkPSRzY29wZS51c2VyLnVwZGF0ZWRBdC5nZXREYXkoKTtcblx0fSlcbn0pXG5cbmFwcC5jb250cm9sbGVyKFwiR2FtZVJlY29yZEN0cmxcIixmdW5jdGlvbigkc2NvcGUsIFVzZXJGYWN0b3J5LCAkc3RhdGVQYXJhbXMpe1xuXHRVc2VyRmFjdG9yeS5mZXRjaEluZm9ybWF0aW9uKCRzdGF0ZVBhcmFtcy51c2VySWQpXG5cdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHRcdCRzY29wZS51c2VyPXVzZXI7XG5cdH0pXG5cdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHRVc2VyRmFjdG9yeS5mZXRjaEdhbWVzKCRzdGF0ZVBhcmFtcy51c2VySWQpXG5cdH0pXG5cdC50aGVuKGZ1bmN0aW9uKGdhbWVzKXtcblx0XHQkc2NvcGUuZ2FtZXM9Z2FtZXM7XG5cdH0pXG59KSIsImFwcC5mYWN0b3J5KFwiVXNlckZhY3RvcnlcIiwgZnVuY3Rpb24oJGh0dHApe1xuXHRyZXR1cm4ge1xuXHRcdGZldGNoSW5mb3JtYXRpb246IGZ1bmN0aW9uKGlkKXtcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoXCIvYXBpL3VzZXJzL1wiK2lkKVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG5cdFx0XHRcdHJldHVybiB1c2VyLmRhdGE7XG5cdFx0XHR9KVxuXHRcdH0sXG5cdFx0ZmV0Y2hHYW1lczogZnVuY3Rpb24oaWQpe1xuXHRcdFx0cmV0dXJuICRodHRwLmdldChcIi9hcGkvdXNlcnMvXCIraWQrXCIvZ2FtZXNcIilcblx0XHRcdC50aGVuKGZ1bmN0aW9uKGdhbWVzKXtcblx0XHRcdFx0cmV0dXJuIGdhbWVzLmRhdGE7XG5cdFx0XHR9KVxuXHRcdH1cblx0fVxufSkiLCJhcHAuZGlyZWN0aXZlKCdsb2dvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbG9nby9sb2dvLmh0bWwnXG4gICAgfTtcbn0pXG4iLCIndXNlIHN0cmljdCc7XG5cbmFwcC5kaXJlY3RpdmUoJ29hdXRoQnV0dG9uJywgZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIHNjb3BlOiB7XG4gICAgICBwcm92aWRlck5hbWU6ICdAJ1xuICAgIH0sXG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL29hdXRoLWJ1dHRvbi9vYXV0aC1idXR0b24uaHRtbCdcbiAgfVxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKFwidGltZXJcIiwgZnVuY3Rpb24oJHEsICRpbnRlcnZhbCwgU29ja2V0KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIHRpbWU6ICc9J1xuICAgICAgICB9LFxuICAgICAgICB0ZW1wbGF0ZVVybDogXCJqcy9jb21tb24vZGlyZWN0aXZlcy90aW1lci90aW1lci5odG1sXCIsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgICAgICB2YXIgdGltZSA9IHNjb3BlLnRpbWU7XG4gICAgICAgICAgICB2YXIgc3RhcnQ9c2NvcGUudGltZTtcbiAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gY29udmVydCh0aW1lKTtcbiAgICAgICAgICAgIHNjb3BlLmNvdW50ZG93biA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciB0aW1lciA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgdGltZSAtPSAxO1xuICAgICAgICAgICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IGNvbnZlcnQodGltZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aW1lIDwgMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBcIlRpbWUgdXAhXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKHRpbWVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWU9c3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIHNjb3BlLm1lc3NhZ2VzID0gW1wiR2V0IFJlYWR5IVwiLCBcIkdldCBTZXQhXCIsIFwiR28hXCIsICcvJ107XG4gICAgICAgICAgICAvLyAgICAgdmFyIGluZGV4ID0gMDtcbiAgICAgICAgICAgIC8vICAgICB2YXIgcHJlcGFyZSA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBzY29wZS5tZXNzYWdlc1tpbmRleF07XG4gICAgICAgICAgICAvLyAgICAgICAgIGluZGV4Kys7XG4gICAgICAgICAgICAvLyAgICAgICAgIGNvbnNvbGUubG9nKHNjb3BlLnRpbWVfcmVtYWluaW5nKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgaWYgKHNjb3BlLnRpbWVfcmVtYWluaW5nID09PSBcIi9cIikge1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBjb252ZXJ0KHRpbWUpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbChwcmVwYXJlKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIHZhciB0aW1lciA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICB0aW1lIC09IDE7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBjb252ZXJ0KHRpbWUpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgIGlmICh0aW1lIDwgMSkge1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IFwiVGltZSB1cCFcIjtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbCh0aW1lcik7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gICAgICAgICAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICAvLyAgICAgICAgIH1cbiAgICAgICAgICAgIC8vICAgICB9LCAxMDAwKTtcbiAgICAgICAgICAgIC8vIH07XG5cbiAgICAgICAgICAgIFNvY2tldC5vbignc3RhcnRCb2FyZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLmNvdW50ZG93bih0aW1lKTtcbiAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGNvbnZlcnQodGltZSkge1xuICAgICAgICAgICAgICAgIHZhciBzZWNvbmRzID0gKHRpbWUgJSA2MCkudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICB2YXIgY29udmVyc2lvbiA9IChNYXRoLmZsb29yKHRpbWUgLyA2MCkpICsgJzonO1xuICAgICAgICAgICAgICAgIGlmIChzZWNvbmRzLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udmVyc2lvbiArPSAnMCcgKyBzZWNvbmRzO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnZlcnNpb24gKz0gc2Vjb25kcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnZlcnNpb247XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdob21lJyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdMZWFkZXIgQm9hcmQnLCBzdGF0ZTogJ2xlYWRlckJvYXJkJyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdZb3VyIFByb2ZpbGUnLCBzdGF0ZTogJ1VzZXJQcm9maWxlJywgYXV0aDogdHJ1ZSB9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcblxuICAgICAgICAgICAgc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UubG9nb3V0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHJlbW92ZVVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzZXRVc2VyKCk7XG5cbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0VXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCByZW1vdmVVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCByZW1vdmVVc2VyKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG59KTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
