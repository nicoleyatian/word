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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiZ2FtZS1zdGF0ZS9ncmlkLmNvbnRyb2xsZXIuanMiLCJnYW1lLXN0YXRlL2dyaWQuZmFjdG9yeS5qcyIsImhvbWUvaG9tZS5jb250cm9sbGVyLmpzIiwiaG9tZS9ob21lLmpzIiwibGVhZGVyQm9hcmQvbGVhZGVyQm9hcmQuY29udHJvbGxlci5qcyIsImxlYWRlckJvYXJkL2xlYWRlckJvYXJkLmZhY3RvcnkuanMiLCJsZWFkZXJCb2FyZC9sZWFkZXJCb2FyZC5zdGF0ZS5qcyIsImxldHRlci9sZXR0ZXIuZGlyZWN0aXZlLmpzIiwibG9iYnkvbG9iYnkuY29udHJvbGxlci5qcyIsImxvYmJ5L2xvYmJ5LmRpcmVjdGl2ZS5qcyIsImxvYmJ5L2xvYmJ5LmZhY3RvcnkuanMiLCJsb2JieS9sb2JieS5zdGF0ZS5qcyIsImxvZ2luL2xvZ2luLmpzIiwibWVtYmVycy1vbmx5L21lbWJlcnMtb25seS5qcyIsInJhbmsvcmFuay5kaXJlY3RpdmUuanMiLCJzaWdudXAvc2lnbnVwLmZhY3RvcnkuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwidXNlcl9wcm9maWxlL3Byb2ZpbGUuY29udHJvbGxlci5qcyIsInVzZXJfcHJvZmlsZS9wcm9maWxlLmZhY3RvcnkuanMiLCJjb21tb24vZGlyZWN0aXZlcy9sb2dvL2xvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvb2F1dGgtYnV0dG9uL29hdXRoLWJ1dHRvbi5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy90aW1lci90aW1lci5qcyJdLCJuYW1lcyI6WyJ3aW5kb3ciLCJhcHAiLCJhbmd1bGFyIiwibW9kdWxlIiwiY29uZmlnIiwiJHVybFJvdXRlclByb3ZpZGVyIiwiJGxvY2F0aW9uUHJvdmlkZXIiLCJodG1sNU1vZGUiLCJvdGhlcndpc2UiLCJ3aGVuIiwibG9jYXRpb24iLCJyZWxvYWQiLCJydW4iLCIkcm9vdFNjb3BlIiwiJG9uIiwiZXZlbnQiLCJ0b1N0YXRlIiwidG9QYXJhbXMiLCJmcm9tU3RhdGUiLCJmcm9tUGFyYW1zIiwidGhyb3duRXJyb3IiLCJjb25zb2xlIiwiaW5mbyIsIm5hbWUiLCJlcnJvciIsIkF1dGhTZXJ2aWNlIiwiJHN0YXRlIiwiZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCIsInN0YXRlIiwiZGF0YSIsImF1dGhlbnRpY2F0ZSIsImlzQXV0aGVudGljYXRlZCIsInByZXZlbnREZWZhdWx0IiwiZ2V0TG9nZ2VkSW5Vc2VyIiwidGhlbiIsInVzZXIiLCJnbyIsIkVycm9yIiwiZmFjdG9yeSIsImlvIiwib3JpZ2luIiwiY29uc3RhbnQiLCJsb2dpblN1Y2Nlc3MiLCJsb2dpbkZhaWxlZCIsImxvZ291dFN1Y2Nlc3MiLCJzZXNzaW9uVGltZW91dCIsIm5vdEF1dGhlbnRpY2F0ZWQiLCJub3RBdXRob3JpemVkIiwiJHEiLCJBVVRIX0VWRU5UUyIsInN0YXR1c0RpY3QiLCJyZXNwb25zZUVycm9yIiwicmVzcG9uc2UiLCIkYnJvYWRjYXN0Iiwic3RhdHVzIiwicmVqZWN0IiwiJGh0dHBQcm92aWRlciIsImludGVyY2VwdG9ycyIsInB1c2giLCIkaW5qZWN0b3IiLCJnZXQiLCJzZXJ2aWNlIiwiJGh0dHAiLCJTZXNzaW9uIiwib25TdWNjZXNzZnVsTG9naW4iLCJjcmVhdGUiLCJmcm9tU2VydmVyIiwiY2F0Y2giLCJsb2dpbiIsImNyZWRlbnRpYWxzIiwicG9zdCIsIm1lc3NhZ2UiLCJsb2dvdXQiLCJkZXN0cm95Iiwic2VsZiIsIiRzdGF0ZVByb3ZpZGVyIiwidXJsIiwidGVtcGxhdGVVcmwiLCJjb250cm9sbGVyIiwiJHNjb3BlIiwiQm9hcmRGYWN0b3J5IiwiU29ja2V0IiwiJHN0YXRlUGFyYW1zIiwiTG9iYnlGYWN0b3J5Iiwicm9vbU5hbWUiLCJyb29tbmFtZSIsImhpZGVTdGFydCIsIm90aGVyUGxheWVycyIsImdhbWVMZW5ndGgiLCJleHBvcnRzIiwid29yZE9iaiIsIndvcmQiLCJwbGF5ZXJJZCIsInN0YXRlTnVtYmVyIiwicG9pbnRzRWFybmVkIiwibW91c2VJc0Rvd24iLCJkcmFnZ2luZ0FsbG93ZWQiLCJzdHlsZSIsImZyZWV6ZSIsIndpbk9yTG9zZSIsInRpbWVvdXQiLCJoaWRlTmF2YmFyIiwidG9nZ2xlRHJhZyIsIm1vdXNlRG93biIsImxvZyIsIm1vdXNlVXAiLCJsZW5ndGgiLCJzdWJtaXQiLCJ0b3VjaEFjdGl2YXRlZCIsImFyZ3VtZW50cyIsInRvdWNoSXNBY3RpdmF0ZWQiLCJ0b3VjaFN0b3BwZWQiLCJlIiwiZHJhZyIsInNwYWNlIiwiaWQiLCJjbGljayIsIm1vYmlsZURyYWciLCJsdHJzU2VsZWN0ZWQiLCJPYmplY3QiLCJrZXlzIiwicHJldmlvdXNMdHIiLCJsYXN0THRyIiwidmFsaWRTZWxlY3QiLCJzdWJzdHJpbmciLCJnZXRDdXJyZW50Um9vbSIsInJvb20iLCJnYW1lSWQiLCJ1c2VycyIsImZpbHRlciIsImZvckVhY2giLCJwbGF5ZXIiLCJzY29yZSIsImpvaW5HYW1lIiwiaGlkZUJvYXJkIiwic3RhcnRHYW1lIiwidXNlcklkcyIsIm1hcCIsImdldFN0YXJ0Qm9hcmQiLCJxdWl0IiwiYm9hcmQiLCJtZXNzYWdlcyIsInNpemUiLCJsdHJJZCIsIm90aGVyTHRyc0lkcyIsImluY2x1ZGVzIiwiY29vcmRzIiwic3BsaXQiLCJyb3ciLCJjb2wiLCJsYXN0THRySWQiLCJwb3AiLCJjb29yZHNMYXN0Iiwicm93TGFzdCIsImNvbExhc3QiLCJyb3dPZmZzZXQiLCJNYXRoIiwiYWJzIiwiY29sT2Zmc2V0IiwiY2xlYXJJZkNvbmZsaWN0aW5nIiwidXBkYXRlV29yZE9iaiIsImV4cG9ydFdvcmRPYmoiLCJ0aWxlc01vdmVkIiwibXlXb3JkVGlsZXMiLCJzb21lIiwiY29vcmQiLCJjbGVhciIsIm9iaiIsInNodWZmbGUiLCJ1cGRhdGVCb2FyZCIsImtleSIsInVwZGF0ZVNjb3JlIiwicG9pbnRzIiwidXBkYXRlIiwidXBkYXRlT2JqIiwidXNlcm5hbWUiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwiJGV2YWxBc3luYyIsInJlcGxheSIsIm5ld0dhbWUiLCJnYW1lIiwiYWxsSWRzIiwiYWxsIiwiZGV0ZXJtaW5lV2lubmVyIiwid2lubmVyc0FycmF5Iiwid2lubmVyIiwid2lubmVycyIsImkiLCJkaXNjb25uZWN0Iiwib24iLCJlbWl0IiwibGFzdFdvcmRQbGF5ZWQiLCJ1c2VySWQiLCJyZXMiLCJxdWl0RnJvbVJvb20iLCJkZWxldGUiLCIkbG9jYXRpb24iLCJlbnRlckxvYmJ5IiwiTGVhZGVyQm9hcmRGYWN0b3J5IiwiQWxsUGxheWVycyIsInBsYXllcnMiLCJnYW1lcyIsInNjb3JlcyIsInVzZXJHYW1lIiwiaGlnaGVzdFNjb3JlIiwibWF4IiwiZ2FtZXNfd29uIiwiZ2FtZXNfcGxheWVkIiwid2luX3BlcmNlbnRhZ2UiLCJ0b0ZpeGVkIiwicmVzb2x2ZSIsImFsbFBsYXllcnMiLCJkaXJlY3RpdmUiLCJyZXN0cmljdCIsInNjb3BlIiwieCIsInkiLCJsaW5rIiwiZWwiLCJhdHRyIiwiZGl2X292ZXJsYXAiLCJqcW8iLCJsZWZ0IiwidG9wIiwiZCIsIm9mZnNldCIsIm9mZnNldFdpZHRoIiwib2Zmc2V0SGVpZ2h0IiwiYmluZCIsImV2dCIsImVhY2giLCJwYWdlWCIsInBhZ2VZIiwiaGFzQ2xhc3MiLCJhZGRDbGFzcyIsInJvb21zIiwicm9vbU5hbWVGb3JtIiwibmV3Um9vbSIsInJvb21JbmZvIiwic2hvd0Zvcm0iLCJ0ZW1wUm9vbXMiLCJnZXRBbGxSb29tcyIsImNvcHkiLCJyb29tSWQiLCJwdXQiLCJzZW5kTG9naW4iLCJsb2dpbkluZm8iLCJ0ZW1wbGF0ZSIsIlNlY3JldFN0YXNoIiwiZ2V0U3Rhc2giLCJzdGFzaCIsInJhbmtOYW1lIiwicmFua0J5Iiwib3JkZXIiLCJTaWdudXBGYWN0b3J5IiwiY3JlYXRlVXNlciIsInNpZ251cEluZm8iLCJlbWFpbCIsInBhc3N3b3JkIiwic2lnbnVwIiwic2VuZFNpZ251cCIsIlVzZXJGYWN0b3J5IiwiZmV0Y2hJbmZvcm1hdGlvbiIsInVwZGF0ZWQiLCJ1cGRhdGVkQXQiLCJnZXREYXkiLCJmZXRjaEdhbWVzIiwiaXRlbXMiLCJsYWJlbCIsImF1dGgiLCJpc0xvZ2dlZEluIiwic2V0VXNlciIsInJlbW92ZVVzZXIiLCJwcm92aWRlck5hbWUiLCIkaW50ZXJ2YWwiLCJ0aW1lIiwic3RhcnQiLCJ0aW1lX3JlbWFpbmluZyIsImNvbnZlcnQiLCJjb3VudGRvd24iLCJ0aW1lciIsImNhbmNlbCIsInNlY29uZHMiLCJ0b1N0cmluZyIsImNvbnZlcnNpb24iLCJmbG9vciJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7QUFDQUEsT0FBQUMsR0FBQSxHQUFBQyxRQUFBQyxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLFdBQUEsRUFBQSxTQUFBLENBQUEsQ0FBQTs7QUFFQUYsSUFBQUcsTUFBQSxDQUFBLFVBQUFDLGtCQUFBLEVBQUFDLGlCQUFBLEVBQUE7QUFDQTtBQUNBQSxzQkFBQUMsU0FBQSxDQUFBLElBQUE7QUFDQTtBQUNBRix1QkFBQUcsU0FBQSxDQUFBLEdBQUE7QUFDQTtBQUNBSCx1QkFBQUksSUFBQSxDQUFBLGlCQUFBLEVBQUEsWUFBQTtBQUNBVCxlQUFBVSxRQUFBLENBQUFDLE1BQUE7QUFDQSxLQUZBO0FBR0EsQ0FUQTs7QUFXQTtBQUNBVixJQUFBVyxHQUFBLENBQUEsVUFBQUMsVUFBQSxFQUFBO0FBQ0FBLGVBQUFDLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLFVBQUFDLEtBQUEsRUFBQUMsT0FBQSxFQUFBQyxRQUFBLEVBQUFDLFNBQUEsRUFBQUMsVUFBQSxFQUFBQyxXQUFBLEVBQUE7QUFDQUMsZ0JBQUFDLElBQUEsZ0ZBQUFOLFFBQUFPLElBQUE7QUFDQUYsZ0JBQUFHLEtBQUEsQ0FBQUosV0FBQTtBQUNBLEtBSEE7QUFJQSxDQUxBOztBQU9BO0FBQ0FuQixJQUFBVyxHQUFBLENBQUEsVUFBQUMsVUFBQSxFQUFBWSxXQUFBLEVBQUFD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a0JBQUErRCxjQUFBLEdBQUFDLFFBQUFILElBQUEsQ0FBQTtBQUNBN0Qsa0JBQUFpRSxTQUFBLEdBQUEsWUFBQTtBQUNBLG9CQUFBQyxRQUFBTixVQUFBLFlBQUE7QUFDQUMsNEJBQUEsQ0FBQTtBQUNBN0QsMEJBQUErRCxjQUFBLEdBQUFDLFFBQUFILElBQUEsQ0FBQTtBQUNBLHdCQUFBQSxPQUFBLENBQUEsRUFBQTtBQUNBN0QsOEJBQUErRCxjQUFBLEdBQUEsVUFBQTtBQUNBSCxrQ0FBQU8sTUFBQSxDQUFBRCxLQUFBO0FBQ0FMLCtCQUFBQyxLQUFBO0FBQ0E7QUFDQSxpQkFSQSxFQVFBLElBUkEsQ0FBQTtBQVNBLGFBVkE7O0FBWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQXBNLG1CQUFBNkcsRUFBQSxDQUFBLFlBQUEsRUFBQSxZQUFBO0FBQ0F5QixzQkFBQWlFLFNBQUEsQ0FBQUosSUFBQTtBQUNBLGFBRkE7O0FBS0EscUJBQUFHLE9BQUEsQ0FBQUgsSUFBQSxFQUFBO0FBQ0Esb0JBQUFPLFVBQUEsQ0FBQVAsT0FBQSxFQUFBLEVBQUFRLFFBQUEsRUFBQTtBQUNBLG9CQUFBQyxhQUFBakksS0FBQWtJLEtBQUEsQ0FBQVYsT0FBQSxFQUFBLENBQUEsR0FBQSxHQUFBO0FBQ0Esb0JBQUFPLFFBQUFqTCxNQUFBLEdBQUEsQ0FBQSxFQUFBO0FBQ0FtTCxrQ0FBQSxNQUFBRixPQUFBO0FBQ0EsaUJBRkEsTUFFQTtBQUNBRSxrQ0FBQUYsT0FBQTtBQUNBO0FBQ0EsdUJBQUFFLFVBQUE7QUFDQTtBQUNBO0FBMURBLEtBQUE7QUE0REEsQ0E3REEiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcbndpbmRvdy5hcHAgPSBhbmd1bGFyLm1vZHVsZSgnRnVsbHN0YWNrR2VuZXJhdGVkQXBwJywgWydmc2FQcmVCdWlsdCcsICd1aS5yb3V0ZXInLCAndWkuYm9vdHN0cmFwJywgJ25nQW5pbWF0ZScsICduZ1RvdWNoJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG4gICAgLy8gVHJpZ2dlciBwYWdlIHJlZnJlc2ggd2hlbiBhY2Nlc3NpbmcgYW4gT0F1dGggcm91dGVcbiAgICAkdXJsUm91dGVyUHJvdmlkZXIud2hlbignL2F1dGgvOnByb3ZpZGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgfSk7XG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBsaXN0ZW5pbmcgdG8gZXJyb3JzIGJyb2FkY2FzdGVkIGJ5IHVpLXJvdXRlciwgdXN1YWxseSBvcmlnaW5hdGluZyBmcm9tIHJlc29sdmVzXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlKSB7XG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZUVycm9yJywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcywgZnJvbVN0YXRlLCBmcm9tUGFyYW1zLCB0aHJvd25FcnJvcikge1xuICAgICAgICBjb25zb2xlLmluZm8oYFRoZSBmb2xsb3dpbmcgZXJyb3Igd2FzIHRocm93biBieSB1aS1yb3V0ZXIgd2hpbGUgdHJhbnNpdGlvbmluZyB0byBzdGF0ZSBcIiR7dG9TdGF0ZS5uYW1lfVwiLiBUaGUgb3JpZ2luIG9mIHRoaXMgZXJyb3IgaXMgcHJvYmFibHkgYSByZXNvbHZlIGZ1bmN0aW9uOmApO1xuICAgICAgICBjb25zb2xlLmVycm9yKHRocm93bkVycm9yKTtcbiAgICB9KTtcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxuICAgIHZhciBkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xuICAgIH07XG5cbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMpIHtcblxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHVzZXIgaXMgcmV0cmlldmVkLCB0aGVuIHJlbmF2aWdhdGUgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXG4gICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59KTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBIb3BlIHlvdSBkaWRuJ3QgZm9yZ2V0IEFuZ3VsYXIhIER1aC1kb3kuXG4gICAgaWYgKCF3aW5kb3cuYW5ndWxhcikgdGhyb3cgbmV3IEVycm9yKCdJIGNhblxcJ3QgZmluZCBBbmd1bGFyIScpO1xuXG4gICAgdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdmc2FQcmVCdWlsdCcsIFtdKTtcblxuICAgIGFwcC5mYWN0b3J5KCdTb2NrZXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghd2luZG93LmlvKSB0aHJvdyBuZXcgRXJyb3IoJ3NvY2tldC5pbyBub3QgZm91bmQhJyk7XG4gICAgICAgIHJldHVybiB3aW5kb3cuaW8od2luZG93LmxvY2F0aW9uLm9yaWdpbik7XG4gICAgfSk7XG5cbiAgICAvLyBBVVRIX0VWRU5UUyBpcyB1c2VkIHRocm91Z2hvdXQgb3VyIGFwcCB0b1xuICAgIC8vIGJyb2FkY2FzdCBhbmQgbGlzdGVuIGZyb20gYW5kIHRvIHRoZSAkcm9vdFNjb3BlXG4gICAgLy8gZm9yIGltcG9ydGFudCBldmVudHMgYWJvdXQgYXV0aGVudGljYXRpb24gZmxvdy5cbiAgICBhcHAuY29uc3RhbnQoJ0FVVEhfRVZFTlRTJywge1xuICAgICAgICBsb2dpblN1Y2Nlc3M6ICdhdXRoLWxvZ2luLXN1Y2Nlc3MnLFxuICAgICAgICBsb2dpbkZhaWxlZDogJ2F1dGgtbG9naW4tZmFpbGVkJyxcbiAgICAgICAgbG9nb3V0U3VjY2VzczogJ2F1dGgtbG9nb3V0LXN1Y2Nlc3MnLFxuICAgICAgICBzZXNzaW9uVGltZW91dDogJ2F1dGgtc2Vzc2lvbi10aW1lb3V0JyxcbiAgICAgICAgbm90QXV0aGVudGljYXRlZDogJ2F1dGgtbm90LWF1dGhlbnRpY2F0ZWQnLFxuICAgICAgICBub3RBdXRob3JpemVkOiAnYXV0aC1ub3QtYXV0aG9yaXplZCdcbiAgICB9KTtcblxuICAgIGFwcC5mYWN0b3J5KCdBdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsIEFVVEhfRVZFTlRTKSB7XG4gICAgICAgIHZhciBzdGF0dXNEaWN0ID0ge1xuICAgICAgICAgICAgNDAxOiBBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLFxuICAgICAgICAgICAgNDAzOiBBVVRIX0VWRU5UUy5ub3RBdXRob3JpemVkLFxuICAgICAgICAgICAgNDE5OiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCxcbiAgICAgICAgICAgIDQ0MDogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXRcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChzdGF0dXNEaWN0W3Jlc3BvbnNlLnN0YXR1c10sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSkge1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgdXNlciA9IHJlc3BvbnNlLmRhdGEudXNlcjtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKHVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XG4gICAgICAgICAgICByZXR1cm4gdXNlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZXMgdGhlIHNlc3Npb24gZmFjdG9yeSB0byBzZWUgaWYgYW5cbiAgICAgICAgLy8gYXV0aGVudGljYXRlZCB1c2VyIGlzIGN1cnJlbnRseSByZWdpc3RlcmVkLlxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhIVNlc3Npb24udXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldExvZ2dlZEluVXNlciA9IGZ1bmN0aW9uIChmcm9tU2VydmVyKSB7XG5cbiAgICAgICAgICAgIC8vIElmIGFuIGF1dGhlbnRpY2F0ZWQgc2Vzc2lvbiBleGlzdHMsIHdlXG4gICAgICAgICAgICAvLyByZXR1cm4gdGhlIHVzZXIgYXR0YWNoZWQgdG8gdGhhdCBzZXNzaW9uXG4gICAgICAgICAgICAvLyB3aXRoIGEgcHJvbWlzZS4gVGhpcyBlbnN1cmVzIHRoYXQgd2UgY2FuXG4gICAgICAgICAgICAvLyBhbHdheXMgaW50ZXJmYWNlIHdpdGggdGhpcyBtZXRob2QgYXN5bmNocm9ub3VzbHkuXG5cbiAgICAgICAgICAgIC8vIE9wdGlvbmFsbHksIGlmIHRydWUgaXMgZ2l2ZW4gYXMgdGhlIGZyb21TZXJ2ZXIgcGFyYW1ldGVyLFxuICAgICAgICAgICAgLy8gdGhlbiB0aGlzIGNhY2hlZCB2YWx1ZSB3aWxsIG5vdCBiZSB1c2VkLlxuXG4gICAgICAgICAgICBpZiAodGhpcy5pc0F1dGhlbnRpY2F0ZWQoKSAmJiBmcm9tU2VydmVyICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4oU2Vzc2lvbi51c2VyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFrZSByZXF1ZXN0IEdFVCAvc2Vzc2lvbi5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIDQwMSByZXNwb25zZSwgd2UgY2F0Y2ggaXQgYW5kIGluc3RlYWQgcmVzb2x2ZSB0byBudWxsLlxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKS50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9naW4gPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbihvblN1Y2Nlc3NmdWxMb2dpbilcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHsgbWVzc2FnZTogJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJyB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9sb2dvdXQnKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBTZXNzaW9uLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9nb3V0U3VjY2Vzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcblxuICAgICAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSB1c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IG51bGw7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxufSgpKTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnR2FtZScsIHtcbiAgICAgICAgdXJsOiAnL2dhbWUvOnJvb21uYW1lJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9nYW1lLXN0YXRlL3BhZ2UuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6IFwiR2FtZUN0cmxcIixcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuXG5cbmFwcC5jb250cm9sbGVyKCdHYW1lQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgQm9hcmRGYWN0b3J5LCBTb2NrZXQsICRzdGF0ZVBhcmFtcywgQXV0aFNlcnZpY2UsICRzdGF0ZSwgTG9iYnlGYWN0b3J5LCAkcm9vdFNjb3BlLCAkcSkge1xuXG4gICAgJHNjb3BlLnJvb21OYW1lID0gJHN0YXRlUGFyYW1zLnJvb21uYW1lO1xuICAgICRzY29wZS5oaWRlU3RhcnQgPSB0cnVlO1xuXG4gICAgJHNjb3BlLm90aGVyUGxheWVycyA9IFtdO1xuICAgICRzY29wZS5nYW1lTGVuZ3RoID0gMTAwMDtcblxuICAgICRzY29wZS5leHBvcnRzID0ge1xuICAgICAgICB3b3JkT2JqOiB7fSxcbiAgICAgICAgd29yZDogXCJcIixcbiAgICAgICAgcGxheWVySWQ6IG51bGwsXG4gICAgICAgIHN0YXRlTnVtYmVyOiAwLFxuICAgICAgICBwb2ludHNFYXJuZWQ6IG51bGxcbiAgICB9O1xuXG4gICAgJHNjb3BlLm1vdXNlSXNEb3duID0gZmFsc2U7XG4gICAgJHNjb3BlLmRyYWdnaW5nQWxsb3dlZCA9IGZhbHNlO1xuICAgICRzY29wZS5zdHlsZSA9IG51bGw7XG4gICAgJHNjb3BlLm1lc3NhZ2UgPSAnJztcbiAgICAkc2NvcGUuZnJlZXplID0gZmFsc2U7XG4gICAgJHNjb3BlLndpbk9yTG9zZSA9IG51bGw7XG4gICAgJHNjb3BlLnRpbWVvdXQgPSBudWxsO1xuXG4gICAgJHJvb3RTY29wZS5oaWRlTmF2YmFyID0gdHJ1ZTtcblxuXG4gICAgLy8gJHNjb3BlLmNoZWNrU2VsZWN0ZWQgPSBmdW5jdGlvbihpZCkge1xuICAgIC8vICAgICByZXR1cm4gaWQgaW4gJHNjb3BlLmV4cG9ydHMud29yZE9iajtcbiAgICAvLyB9O1xuXG4gICAgJHNjb3BlLnRvZ2dsZURyYWcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLmRyYWdnaW5nQWxsb3dlZCA9ICEkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkO1xuICAgIH07XG5cbiAgICAkc2NvcGUubW91c2VEb3duID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdtb3VzZSBpcyBkb3duJylcbiAgICAgICAgJHNjb3BlLm1vdXNlSXNEb3duID0gdHJ1ZTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm1vdXNlVXAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ21vdXNlIGlzIHVwJyk7XG4gICAgICAgICRzY29wZS5tb3VzZUlzRG93biA9IGZhbHNlO1xuICAgICAgICBpZiAoJHNjb3BlLmRyYWdnaW5nQWxsb3dlZCAmJiAkc2NvcGUuZXhwb3J0cy53b3JkLmxlbmd0aCA+IDEpICRzY29wZS5zdWJtaXQoJHNjb3BlLmV4cG9ydHMpO1xuICAgIH07XG5cbiAgICAkc2NvcGUudG91Y2hBY3RpdmF0ZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3RvdWNoIGlzIGFjdGl2YXRlZDogJyArIGFyZ3VtZW50cyk7XG4gICAgICAgICRzY29wZS50b3VjaElzQWN0aXZhdGVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAkc2NvcGUudG91Y2hTdG9wcGVkID0gZnVuY3Rpb24oZSkge1xuICAgICAgICBjb25zb2xlLmxvZygndG91Y2ggaXMgc3RvcHBlZDogJyArIGUpO1xuICAgICAgICAkc2NvcGUudG91Y2hJc0FjdGl2YXRlZCA9IGZhbHNlO1xuICAgICAgICBpZiAoJHNjb3BlLmRyYWdnaW5nQWxsb3dlZCAmJiAkc2NvcGUuZXhwb3J0cy53b3JkLmxlbmd0aCA+IDEpICRzY29wZS5zdWJtaXQoJHNjb3BlLmV4cG9ydHMpO1xuICAgIH1cblxuICAgIC8vICRlbGVtZW50LmJpbmQoJ3RvdWNoc3RhcnQnLCBmdW5jdGlvbiAoZSkge1xuICAgIC8vICAgJHNjb3BlLmlzU2VsZWN0aW5nID0gdHJ1ZTtcbiAgICAvLyAgICRzY29wZS5jbGljayhlKVxuICAgIC8vIH0pXG5cbiAgICAvLyAkZWxlbWVudC5iaW5kKCdtb3VzZW1vdmUgdG91Y2htb3ZlJywgZnVuY3Rpb24gKGUpIHtcbiAgICAvLyAgIGlmICgkc2NvcGUuaXNTZWxlY3RpbmcpIHtcbiAgICAvLyAgICAgJHNjb3BlLmNsaWNrKGUpXG4gICAgLy8gICB9XG4gICAgLy8gfSl4XG5cbiAgICAvLyAkZWxlbWVudC5iaW5kKCdtb3VzZXVwIHRvdWNoZW5kJywgZnVuY3Rpb24gKGUpIHtcbiAgICAvLyAgICRzY29wZS5pc1NlbGVjdGluZyA9IGZhbHNlO1xuICAgIC8vICAgaWYgKCRzY29wZS5kcmFnZ2luZ0FsbG93ZWQgJiYgJHNjb3BlLmV4cG9ydHMud29yZC5sZW5ndGggPiAxKSAkc2NvcGUuc3VibWl0KCRzY29wZS5leHBvcnRzKTtcbiAgICAvLyB9KVxuXG5cbiAgICAkc2NvcGUuZHJhZyA9IGZ1bmN0aW9uKHNwYWNlLCBpZCkge1xuICAgICAgICBjb25zb2xlLmxvZygnbW91c2UgZW50ZXI6ICcgKyBpZCk7XG4gICAgICAgIGlmICgkc2NvcGUubW91c2VJc0Rvd24gJiYgJHNjb3BlLmRyYWdnaW5nQWxsb3dlZCkge1xuICAgICAgICAgICAgJHNjb3BlLmNsaWNrKHNwYWNlLCBpZCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gZnVuY3Rpb24gZGl2X292ZXJsYXAoanFvLCBsZWZ0LCB0b3ApIHtcbiAgICAvLyAgICAgY29uc29sZS5sb2coJ2RpdiBvdmVybGFwcGVkOiAnICsganFvKTtcbiAgICAvLyAgICAgdmFyIGQgPSBqcW8ub2Zmc2V0KCk7XG4gICAgLy8gICAgIHJldHVybiB0b3AgPj0gZC50b3AgJiYgbGVmdCA+PSBkLmxlZnQgJiYgbGVmdCA8PSAoZC5sZWZ0K2pxb1swXS5vZmZzZXRXaWR0aCkgJiYgdG9wIDw9IChkLnRvcCtqcW9bMF0ub2Zmc2V0SGVpZ2h0KTtcbiAgICAvLyB9XG5cbiAgICAvLyB0b3VjaG1vdmUgPSBmdW5jdGlvbihldmVudCkge1xuICAgIC8vICAgICAvLyBQcmV2ZW50IHNjcm9sbGluZyBvbiB0aGlzIGVsZW1lbnRcbiAgICAvLyAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAvLyB9XG5cbiAgICAvLyAkKFwiLmNlbGxcIikuYmluZChcIm1vdXNlZW50ZXIgdG91Y2htb3ZlXCIsIGZ1bmN0aW9uKGV2dCl7XG4gICAgLy8gICAgIGNvbnNvbGUubG9nKCdiaW5kaW5nIG1vdXNlZW50ZXIgYW5kIHRvdWNobW92ZScsIGV2dCk7XG4gICAgLy8gICAgICQoXCIuY2VsbFwiKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgIC8vICAgICAgICAgY29uc29sZS5sb2coJ2ZvciBlYWNoIGVsZW1lbnQnKTtcbiAgICAvLyAgICAgICAgaWYgKGRpdl9vdmVybGFwKHRoaXMsIGV2dC5wYWdlWCwgZXZ0LnBhZ2VZKSl7XG4gICAgLy8gICAgICAgICBjb25zb2xlLmxvZygnZW50ZXJpbmcgZGl2X292ZXJsYXAnKTtcbiAgICAvLyAgICAgICAgICAgaWYgKCF0aGlzLmhhc0NsYXNzKCdzZWxlY3RlZCcpKSB7XG4gICAgLy8gICAgICAgICAgICAgdGhpcy5hZGRDbGFzcygnc2VsZWN0ZWQnKTtcbiAgICAvLyAgICAgICAgICAgfVxuICAgIC8vICAgICAgICB9XG4gICAgLy8gICAgIH0pO1xuICAgIC8vIH0pO1xuXG4gICAgLy8gYW5ndWxhci5lbGVtZW50KCcuY2VsbCcpLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oZXZ0KXtcbiAgICAvLyAgICAgY29uc29sZS5sb2coJ2JpbmRpbmcgbW91c2VlbnRlciBhbmQgdG91Y2htb3ZlJywgZXZ0KTtcbiAgICAgICAgLy8gJChcIi5jZWxsXCIpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgICBjb25zb2xlLmxvZygnZm9yIGVhY2ggZWxlbWVudCcpO1xuICAgICAgICAvLyAgICBpZiAoZGl2X292ZXJsYXAodGhpcywgZXZ0LnBhZ2VYLCBldnQucGFnZVkpKXtcbiAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKCdlbnRlcmluZyBkaXZfb3ZlcmxhcCcpO1xuICAgICAgICAvLyAgICAgICBpZiAoIXRoaXMuaGFzQ2xhc3MoJ3NlbGVjdGVkJykpIHtcbiAgICAgICAgLy8gICAgICAgICB0aGlzLmFkZENsYXNzKCdzZWxlY3RlZCcpO1xuICAgICAgICAvLyAgICAgICB9XG4gICAgICAgIC8vICAgIH1cbiAgICAgICAgLy8gfSk7XG4gICAgLy8gfSk7XG5cbiAgICAvLyAkZWxlbWVudC5jaGlsZHJlbigpKGZ1bmN0aW9uKGV2dCl7XG4gICAgLy8gICAgIGNvbnNvbGUubG9nKCdiaW5kaW5nIG1vdXNlZW50ZXIgYW5kIHRvdWNobW92ZScsIGV2dCk7XG4gICAgICAgIC8vICQoXCIuY2VsbFwiKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgY29uc29sZS5sb2coJ2ZvciBlYWNoIGVsZW1lbnQnKTtcbiAgICAgICAgLy8gICAgaWYgKGRpdl9vdmVybGFwKHRoaXMsIGV2dC5wYWdlWCwgZXZ0LnBhZ2VZKSl7XG4gICAgICAgIC8vICAgICBjb25zb2xlLmxvZygnZW50ZXJpbmcgZGl2X292ZXJsYXAnKTtcbiAgICAgICAgLy8gICAgICAgaWYgKCF0aGlzLmhhc0NsYXNzKCdzZWxlY3RlZCcpKSB7XG4gICAgICAgIC8vICAgICAgICAgdGhpcy5hZGRDbGFzcygnc2VsZWN0ZWQnKTtcbiAgICAgICAgLy8gICAgICAgfVxuICAgICAgICAvLyAgICB9XG4gICAgICAgIC8vIH0pO1xuICAgIC8vIH0pO1xuXG5cbiAgICAvLyAkZWxlbWVudC5iaW5kKFwidG91Y2htb3ZlXCIsIGZ1bmN0aW9uKGV2dCl7XG4gICAgLy8gICAgIGNvbnNvbGUubG9nKCdiaW5kaW5nIG1vdXNlZW50ZXIgYW5kIHRvdWNobW92ZScsIGV2dCk7XG4gICAgLy8gICAgIC8vICQoXCIuY2VsbFwiKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgIC8vICAgICAvLyAgICAgY29uc29sZS5sb2coJ2ZvciBlYWNoIGVsZW1lbnQnKTtcbiAgICAvLyAgICAgLy8gICAgaWYgKGRpdl9vdmVybGFwKHRoaXMsIGV2dC5wYWdlWCwgZXZ0LnBhZ2VZKSl7XG4gICAgLy8gICAgIC8vICAgICBjb25zb2xlLmxvZygnZW50ZXJpbmcgZGl2X292ZXJsYXAnKTtcbiAgICAvLyAgICAgLy8gICAgICAgaWYgKCF0aGlzLmhhc0NsYXNzKCdzZWxlY3RlZCcpKSB7XG4gICAgLy8gICAgIC8vICAgICAgICAgdGhpcy5hZGRDbGFzcygnc2VsZWN0ZWQnKTtcbiAgICAvLyAgICAgLy8gICAgICAgfVxuICAgIC8vICAgICAvLyAgICB9XG4gICAgLy8gICAgIC8vIH0pO1xuICAgIC8vIH0pO1xuXG4gICAgLy8gYW5ndWxhci5lbGVtZW50KCcuY2VsbCcpLmJpbmQoXCJ0b3VjaG1vdmVcIiwgZnVuY3Rpb24oZXZ0KXtcbiAgICAvLyAgICAgY29uc29sZS5sb2coJ2JpbmRpbmcgbW91c2VlbnRlciBhbmQgdG91Y2htb3ZlJywgZXZ0KTtcbiAgICAvLyAgICAgYW5ndWxhci5lbGVtZW50KCcuY2VsbCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgLy8gICAgICAgICBjb25zb2xlLmxvZygnZm9yIGVhY2ggZWxlbWVudCcpO1xuICAgIC8vICAgICAgICBpZiAoZGl2X292ZXJsYXAodGhpcywgZXZ0LnBhZ2VYLCBldnQucGFnZVkpKXtcbiAgICAvLyAgICAgICAgIGNvbnNvbGUubG9nKCdlbnRlcmluZyBkaXZfb3ZlcmxhcCcpO1xuICAgIC8vICAgICAgICAgICBpZiAoIXRoaXMuaGFzQ2xhc3MoJ3NlbGVjdGVkJykpIHtcbiAgICAvLyAgICAgICAgICAgICB0aGlzLmFkZENsYXNzKCdzZWxlY3RlZCcpO1xuICAgIC8vICAgICAgICAgICB9XG4gICAgLy8gICAgICAgIH1cbiAgICAvLyAgICAgfSk7XG4gICAgLy8gfSk7XG5cbiAgICAkc2NvcGUubW9iaWxlRHJhZyA9IGZ1bmN0aW9uKHNwYWNlLCBpZCl7XG4gICAgICAgIGNvbnNvbGUubG9nKCd0b3VjaCBpcyBkcmFnZ2VkOiAnICsgc3BhY2UgKyBcIiA6IFwiICsgaWQpO1xuICAgICAgICBpZigkc2NvcGUudG91Y2hJc0FjdGl2YXRlZCAmJiAkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkKXtcbiAgICAgICAgICAgICRzY29wZS5jbGljayhzcGFjZSwgaWQpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5jbGljayA9IGZ1bmN0aW9uKHNwYWNlLCBpZCkge1xuICAgICAgICBpZiAoJHNjb3BlLmZyZWV6ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKCdjbGlja2VkICcsIHNwYWNlLCBpZCk7XG4gICAgICAgIHZhciBsdHJzU2VsZWN0ZWQgPSBPYmplY3Qua2V5cygkc2NvcGUuZXhwb3J0cy53b3JkT2JqKTtcbiAgICAgICAgdmFyIHByZXZpb3VzTHRyID0gbHRyc1NlbGVjdGVkW2x0cnNTZWxlY3RlZC5sZW5ndGggLSAyXTtcbiAgICAgICAgdmFyIGxhc3RMdHIgPSBsdHJzU2VsZWN0ZWRbbHRyc1NlbGVjdGVkLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAoIWx0cnNTZWxlY3RlZC5sZW5ndGggfHwgdmFsaWRTZWxlY3QoaWQsIGx0cnNTZWxlY3RlZCkpIHtcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLndvcmQgKz0gc3BhY2U7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkT2JqW2lkXSA9IHNwYWNlO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJHNjb3BlLmV4cG9ydHMpO1xuICAgICAgICB9IGVsc2UgaWYgKGlkID09PSBwcmV2aW91c0x0cikge1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZCA9ICRzY29wZS5leHBvcnRzLndvcmQuc3Vic3RyaW5nKDAsICRzY29wZS5leHBvcnRzLndvcmQubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICBkZWxldGUgJHNjb3BlLmV4cG9ydHMud29yZE9ialtsYXN0THRyXTtcbiAgICAgICAgfSBlbHNlIGlmIChsdHJzU2VsZWN0ZWQubGVuZ3RoID09PSAxICYmIGlkID09PSBsYXN0THRyKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkID0gXCJcIjtcbiAgICAgICAgICAgIGRlbGV0ZSAkc2NvcGUuZXhwb3J0cy53b3JkT2JqW2xhc3RMdHJdO1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgLy9nZXQgdGhlIGN1cnJlbnQgcm9vbSBpbmZvXG4gICAgQm9hcmRGYWN0b3J5LmdldEN1cnJlbnRSb29tKCRzdGF0ZVBhcmFtcy5yb29tbmFtZSlcbiAgICAgICAgLnRoZW4ocm9vbSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhyb29tKVxuICAgICAgICAgICAgJHNjb3BlLmdhbWVJZCA9IHJvb20uaWQ7XG4gICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzID0gcm9vbS51c2Vycy5maWx0ZXIodXNlciA9PiB1c2VyLmlkICE9PSAkc2NvcGUudXNlci5pZCk7XG4gICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzLmZvckVhY2gocGxheWVyID0+IHsgcGxheWVyLnNjb3JlID0gMCB9KVxuICAgICAgICAgICAgTG9iYnlGYWN0b3J5LmpvaW5HYW1lKHJvb20uaWQsICRzY29wZS51c2VyLmlkKTtcbiAgICAgICAgfSk7XG5cblxuICAgICRzY29wZS5oaWRlQm9hcmQgPSB0cnVlO1xuXG4gICAgLy8gU3RhcnQgdGhlIGdhbWUgd2hlbiBhbGwgcGxheWVycyBoYXZlIGpvaW5lZCByb29tXG4gICAgJHNjb3BlLnN0YXJ0R2FtZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdXNlcklkcyA9ICRzY29wZS5vdGhlclBsYXllcnMubWFwKHVzZXIgPT4gdXNlci5pZCk7XG4gICAgICAgIHVzZXJJZHMucHVzaCgkc2NvcGUudXNlci5pZCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdvcCcsICRzY29wZS5vdGhlclBsYXllcnMsICd1aScsIHVzZXJJZHMpO1xuICAgICAgICAkc2NvcGUud2luT3JMb3NlPW51bGw7XG4gICAgICAgIEJvYXJkRmFjdG9yeS5nZXRTdGFydEJvYXJkKCRzY29wZS5nYW1lTGVuZ3RoLCAkc2NvcGUuZ2FtZUlkLCB1c2VySWRzKTtcbiAgICB9O1xuXG5cbiAgICAvL1F1aXQgdGhlIHJvb20sIGJhY2sgdG8gbG9iYnlcbiAgICAkc2NvcGUucXVpdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkcm9vdFNjb3BlLmhpZGVOYXZiYXIgPSBmYWxzZTtcbiAgICAgICAgJHN0YXRlLmdvKCdsb2JieScpXG4gICAgfTtcblxuXG4gICAgJHNjb3BlLmJvYXJkID0gW1xuICAgICAgICBbJ2InLCAnYScsICdkJywgJ2UnLCAnYScsICdyJ10sXG4gICAgICAgIFsnZScsICdmJywgJ2cnLCAnbCcsICdtJywgJ2UnXSxcbiAgICAgICAgWydoJywgJ2knLCAnaicsICdmJywgJ28nLCAnYSddLFxuICAgICAgICBbJ2MnLCAnYScsICdkJywgJ2UnLCAnYScsICdyJ10sXG4gICAgICAgIFsnZScsICdmJywgJ2cnLCAnbCcsICdkJywgJ2UnXSxcbiAgICAgICAgWydoJywgJ2knLCAnaicsICdmJywgJ28nLCAnYSddXG4gICAgXTtcblxuICAgICRzY29wZS5tZXNzYWdlcyA9IG51bGw7XG5cbiAgICAkc2NvcGUuc2l6ZSA9IDM7XG4gICAgJHNjb3BlLnNjb3JlID0gMDtcblxuXG4gICAgLy9tYWtlcyBzdXJlIGxldHRlciBpcyBhZGphY2VudCB0byBwcmV2IGx0ciwgYW5kIGhhc24ndCBiZWVuIHVzZWQgeWV0XG4gICAgZnVuY3Rpb24gdmFsaWRTZWxlY3QobHRySWQsIG90aGVyTHRyc0lkcykge1xuICAgICAgICBpZiAob3RoZXJMdHJzSWRzLmluY2x1ZGVzKGx0cklkKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB2YXIgY29vcmRzID0gbHRySWQuc3BsaXQoJy0nKTtcbiAgICAgICAgdmFyIHJvdyA9IGNvb3Jkc1swXTtcbiAgICAgICAgdmFyIGNvbCA9IGNvb3Jkc1sxXTtcbiAgICAgICAgdmFyIGxhc3RMdHJJZCA9IG90aGVyTHRyc0lkcy5wb3AoKTtcbiAgICAgICAgdmFyIGNvb3Jkc0xhc3QgPSBsYXN0THRySWQuc3BsaXQoJy0nKTtcbiAgICAgICAgdmFyIHJvd0xhc3QgPSBjb29yZHNMYXN0WzBdO1xuICAgICAgICB2YXIgY29sTGFzdCA9IGNvb3Jkc0xhc3RbMV07XG4gICAgICAgIHZhciByb3dPZmZzZXQgPSBNYXRoLmFicyhyb3cgLSByb3dMYXN0KTtcbiAgICAgICAgdmFyIGNvbE9mZnNldCA9IE1hdGguYWJzKGNvbCAtIGNvbExhc3QpO1xuICAgICAgICByZXR1cm4gKHJvd09mZnNldCA8PSAxICYmIGNvbE9mZnNldCA8PSAxKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbGVhcklmQ29uZmxpY3RpbmcodXBkYXRlV29yZE9iaiwgZXhwb3J0V29yZE9iaikge1xuICAgICAgICB2YXIgdGlsZXNNb3ZlZCA9IE9iamVjdC5rZXlzKHVwZGF0ZVdvcmRPYmopO1xuICAgICAgICB2YXIgbXlXb3JkVGlsZXMgPSBPYmplY3Qua2V5cyhleHBvcnRXb3JkT2JqKTtcbiAgICAgICAgaWYgKHRpbGVzTW92ZWQuc29tZShjb29yZCA9PiBteVdvcmRUaWxlcy5pbmNsdWRlcyhjb29yZCkpKSAkc2NvcGUuY2xlYXIoKTtcbiAgICB9XG5cbiAgICAkc2NvcGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZCA9IFwiXCI7XG4gICAgICAgICRzY29wZS5leHBvcnRzLndvcmRPYmogPSB7fTtcbiAgICB9O1xuXG5cbiAgICAkc2NvcGUuc3VibWl0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdzdWJtaXR0aW5nICcsIG9iaik7XG4gICAgICAgIEJvYXJkRmFjdG9yeS5zdWJtaXQob2JqKTtcbiAgICAgICAgJHNjb3BlLmNsZWFyKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5zaHVmZmxlID0gQm9hcmRGYWN0b3J5LnNodWZmbGU7XG5cblxuICAgICRzY29wZS51cGRhdGVCb2FyZCA9IGZ1bmN0aW9uKHdvcmRPYmopIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3Njb3BlLmJvYXJkJywgJHNjb3BlLmJvYXJkKTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHdvcmRPYmopIHtcbiAgICAgICAgICAgIHZhciBjb29yZHMgPSBrZXkuc3BsaXQoJy0nKTtcbiAgICAgICAgICAgIHZhciByb3cgPSBjb29yZHNbMF07XG4gICAgICAgICAgICB2YXIgY29sID0gY29vcmRzWzFdO1xuICAgICAgICAgICAgJHNjb3BlLmJvYXJkW3Jvd11bY29sXSA9IHdvcmRPYmpba2V5XTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUudXBkYXRlU2NvcmUgPSBmdW5jdGlvbihwb2ludHMsIHBsYXllcklkKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCd1cGRhdGUgc2NvcmUgcG9pbnRzJywgcG9pbnRzKTtcbiAgICAgICAgaWYgKHBsYXllcklkID09PSAkc2NvcGUudXNlci5pZCkge1xuICAgICAgICAgICAgJHNjb3BlLnNjb3JlICs9IHBvaW50cztcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLnBvaW50c0Vhcm5lZCA9IG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBwbGF5ZXIgaW4gJHNjb3BlLm90aGVyUGxheWVycykge1xuICAgICAgICAgICAgICAgIGlmICgkc2NvcGUub3RoZXJQbGF5ZXJzW3BsYXllcl0uaWQgPT09IHBsYXllcklkKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnNbcGxheWVyXS5zY29yZSArPSBwb2ludHM7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLnBvaW50c0Vhcm5lZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICAkc2NvcGUudXBkYXRlID0gZnVuY3Rpb24odXBkYXRlT2JqKSB7XG4gICAgICAgICRzY29wZS51cGRhdGVTY29yZSh1cGRhdGVPYmoucG9pbnRzRWFybmVkLCB1cGRhdGVPYmoucGxheWVySWQpO1xuICAgICAgICAkc2NvcGUudXBkYXRlQm9hcmQodXBkYXRlT2JqLndvcmRPYmopO1xuICAgICAgICBpZiAoKyRzY29wZS51c2VyLmlkID09PSArdXBkYXRlT2JqLnBsYXllcklkKSB7XG4gICAgICAgICAgICB2YXIgcGxheWVyID0gJHNjb3BlLnVzZXIudXNlcm5hbWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gJHNjb3BlLm90aGVyUGxheWVycykge1xuICAgICAgICAgICAgICAgIGlmICgrJHNjb3BlLm90aGVyUGxheWVyc1trZXldLmlkID09PSArdXBkYXRlT2JqLnBsYXllcklkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwbGF5ZXIgPSAkc2NvcGUub3RoZXJQbGF5ZXJzW2tleV0udXNlcm5hbWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUubWVzc2FnZSA9IHBsYXllciArIFwiIHBsYXllZCBcIiArIHVwZGF0ZU9iai53b3JkICsgXCIgZm9yIFwiICsgdXBkYXRlT2JqLnBvaW50c0Vhcm5lZCArIFwiIHBvaW50cyFcIjtcbiAgICAgICAgaWYgKCRzY29wZS50aW1lb3V0KSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoJHNjb3BlLnRpbWVvdXQpO1xuICAgICAgICB9XG4gICAgICAgICRzY29wZS50aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICRzY29wZS5tZXNzYWdlID0gJyc7XG4gICAgICAgIH0sIDMwMDApXG4gICAgICAgIGNvbnNvbGUubG9nKCdpdHMgdXBkYXRpbmchJyk7XG4gICAgICAgIGNsZWFySWZDb25mbGljdGluZyh1cGRhdGVPYmosICRzY29wZS5leHBvcnRzLndvcmRPYmopO1xuICAgICAgICAkc2NvcGUuZXhwb3J0cy5zdGF0ZU51bWJlciA9IHVwZGF0ZU9iai5zdGF0ZU51bWJlcjtcbiAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnJlcGxheSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIExvYmJ5RmFjdG9yeS5uZXdHYW1lKHsgcm9vbW5hbWU6ICRzY29wZS5yb29tTmFtZSB9KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZ2FtZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVwbGF5IGdhbWUgb2JqOlwiLCBnYW1lKTtcblxuICAgICAgICAgICAgICAgICRzY29wZS5nYW1lSWQgPSBnYW1lLmlkO1xuICAgICAgICAgICAgICAgICRzY29wZS5zdGFydEdhbWUoKTtcbiAgICAgICAgICAgICAgICB2YXIgYWxsSWRzID0gJHNjb3BlLm90aGVyUGxheWVycy5tYXAocGxheWVyID0+IHBsYXllci5pZCk7XG4gICAgICAgICAgICAgICAgYWxsSWRzLnB1c2goJHNjb3BlLnVzZXIuaWQpO1xuICAgICAgICAgICAgICAgICRxLmFsbChhbGxJZHMubWFwKGlkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgTG9iYnlGYWN0b3J5LmpvaW5HYW1lKCRzY29wZS5nYW1lSWQsIGlkKTtcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdlcnJvciByZXN0YXJ0aW5nIHRoZSBnYW1lJywgZSk7XG4gICAgICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmRldGVybWluZVdpbm5lciA9IGZ1bmN0aW9uKHdpbm5lcnNBcnJheSkge1xuICAgICAgICBpZiAod2lubmVyc0FycmF5Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgaWYgKCt3aW5uZXJzQXJyYXlbMF0gPT09ICskc2NvcGUudXNlci5pZCkge1xuICAgICAgICAgICAgICAgICRzY29wZS53aW5Pckxvc2UgPSBcIkNvbmdyYXR1bGF0aW9uISBZb3UgYXJlIGEgd29yZCB3aXphcmQhIFlvdSB3b24hISFcIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgcGxheWVyIGluICRzY29wZS5vdGhlclBsYXllcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCskc2NvcGUub3RoZXJQbGF5ZXJzW3BsYXllcl0uaWQgPT09ICt3aW5uZXJzQXJyYXlbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB3aW5uZXIgPSAkc2NvcGUub3RoZXJQbGF5ZXJzW3BsYXllcl0udXNlcm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUud2luT3JMb3NlID0gXCJUb3VnaCBsdWNrLiBcIiArIHdpbm5lciArIFwiIGhhcyBiZWF0ZW4geW91LiBCZXR0ZXIgTHVjayBuZXh0IHRpbWUuIDooXCJcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCB3aW5uZXJzID0gW107XG4gICAgICAgICAgICBmb3IgKHZhciBpIGluIHdpbm5lcnNBcnJheSkge1xuICAgICAgICAgICAgICAgIGlmICgrd2lubmVyc0FycmF5W2ldID09PSArJHNjb3BlLnVzZXIuaWQpIHsgd2lubmVycy5wdXNoKCRzY29wZS51c2VyLnVzZXJuYW1lKTsgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgcGxheWVyIGluICRzY29wZS5vdGhlclBsYXllcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkc2NvcGUub3RoZXJQbGF5ZXJzW3BsYXllcl0uaWQgPT0gd2lubmVyc0FycmF5W2ldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lubmVycy5wdXNoKCRzY29wZS5vdGhlclBsYXllcnNbcGxheWVyXS51c2VybmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cod2lubmVycyk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLndpbk9yTG9zZSA9IFwiVGhlIGdhbWUgd2FzIGEgdGllIGJldHdlZW4gXCI7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB3aW5uZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpID09PSB3aW5uZXJzLmxlbmd0aCAtIDEpIHsgJHNjb3BlLndpbk9yTG9zZSArPSBcImFuZCBcIiArIHdpbm5lcnNbaV0gKyBcIi5cIjsgfSBlbHNlIHsgJHNjb3BlLndpbk9yTG9zZSArPSB3aW5uZXJzW2ldICsgXCIsIFwiOyB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnZGVzdHJveWVkJyk7XG4gICAgICAgIFNvY2tldC5kaXNjb25uZWN0KCk7XG5cbiAgICB9KTtcblxuICAgIFNvY2tldC5vbignY29ubmVjdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnY29ubmVjdGluZycpO1xuICAgICAgICAkcS5hbGwoW1xuICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndXNlciBmcm9tIEF1dGhTZXJ2aWNlJywgdXNlcik7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgICAgICRzY29wZS5leHBvcnRzLnBsYXllcklkID0gdXNlci5pZDtcbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAvL2dldCB0aGUgY3VycmVudCByb29tIGluZm9cbiAgICAgICAgICAgIEJvYXJkRmFjdG9yeS5nZXRDdXJyZW50Um9vbSgkc3RhdGVQYXJhbXMucm9vbW5hbWUpXG4gICAgICAgICAgICAudGhlbihyb29tID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyb29tKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZ2FtZUlkID0gcm9vbS5pZDtcbiAgICAgICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzID0gcm9vbS51c2Vycy5maWx0ZXIodXNlciA9PiB1c2VyLmlkICE9PSAkc2NvcGUudXNlci5pZCk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVycy5mb3JFYWNoKHBsYXllciA9PiB7IHBsYXllci5zY29yZSA9IDAgfSk7XG4gICAgICAgICAgICAgICAgTG9iYnlGYWN0b3J5LmpvaW5HYW1lKHJvb20uaWQsICRzY29wZS51c2VyLmlkKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIF0pLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBTb2NrZXQuZW1pdCgnam9pblJvb20nLCAkc2NvcGUudXNlciwgJHNjb3BlLnJvb21OYW1lLCAkc2NvcGUuZ2FtZUlkKTtcbiAgICAgICAgICAgICRzY29wZS5oaWRlU3RhcnQgPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZW1pdHRpbmcgXCJqb2luIHJvb21cIiBldmVudCB0byBzZXJ2ZXIgOFAnLCAkc2NvcGUucm9vbU5hbWUpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdlcnJvciBncmFiYmluZyB1c2VyIG9yIHJvb20gZnJvbSBkYjogJywgZSk7XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgU29ja2V0Lm9uKCdyb29tSm9pblN1Y2Nlc3MnLCBmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnbmV3IHVzZXIgam9pbmluZycsIHVzZXIuaWQpO1xuICAgICAgICAgICAgdXNlci5zY29yZSA9IDA7XG4gICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzLnB1c2godXNlcik7XG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuXG4gICAgICAgIH0pO1xuXG4gICAgICAgIFNvY2tldC5vbignc3RhcnRCb2FyZCcsIGZ1bmN0aW9uKGJvYXJkKSB7XG4gICAgICAgICAgICAkc2NvcGUuZnJlZXplID0gZmFsc2U7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnYm9hcmQhICcsIGJvYXJkKTtcbiAgICAgICAgICAgICRzY29wZS5ib2FyZCA9IGJvYXJkO1xuICAgICAgICAgICAgLy8gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMuZm9yRWFjaChwbGF5ZXIgPT4geyBwbGF5ZXIuc2NvcmUgPSAwIH0pO1xuICAgICAgICAgICAgJHNjb3BlLnNjb3JlID0gMDtcbiAgICAgICAgICAgICRzY29wZS5oaWRlQm9hcmQgPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgICAgICAvLyB9LCAzMDAwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCd3b3JkVmFsaWRhdGVkJywgZnVuY3Rpb24odXBkYXRlT2JqKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnd29yZCBpcyB2YWxpZGF0ZWQnKTtcbiAgICAgICAgICAgICRzY29wZS51cGRhdGUodXBkYXRlT2JqKTtcbiAgICAgICAgICAgICRzY29wZS5sYXN0V29yZFBsYXllZCA9IHVwZGF0ZU9iai53b3JkO1xuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCdib2FyZFNodWZmbGVkJywgZnVuY3Rpb24oYm9hcmQsIHVzZXJJZCwgc3RhdGVOdW1iZXIpIHtcbiAgICAgICAgICAgICRzY29wZS5ib2FyZCA9IGJvYXJkO1xuICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZVNjb3JlKC01LCB1c2VySWQpO1xuICAgICAgICAgICAgJHNjb3BlLmNsZWFyKCk7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy5zdGF0ZU51bWJlciA9IHN0YXRlTnVtYmVyO1xuICAgICAgICAgICAgJHNjb3BlLm1lc3NhZ2UgPSB1c2VySWQgKyBcIiBzaHVmZmxlZCB0aGUgYm9hcmQhXCI7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygkc2NvcGUubWVzc2FnZSk7XG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICBTb2NrZXQub24oJ3BsYXllckRpc2Nvbm5lY3RlZCcsIGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwbGF5ZXJEaXNjb25uZWN0ZWQnLCB1c2VyLmlkKTtcbiAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMgPSAkc2NvcGUub3RoZXJQbGF5ZXJzLm1hcChvdGhlclBsYXllcnMgPT4gb3RoZXJQbGF5ZXJzLmlkICE9PSB1c2VyLmlkKTtcblxuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCdnYW1lT3ZlcicsIGZ1bmN0aW9uKHdpbm5lcnNBcnJheSkge1xuICAgICAgICAgICAgJHNjb3BlLmNsZWFyKCk7XG4gICAgICAgICAgICAkc2NvcGUuZnJlZXplID0gdHJ1ZTtcbiAgICAgICAgICAgICRzY29wZS5kZXRlcm1pbmVXaW5uZXIod2lubmVyc0FycmF5KTtcbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZ2FtZSBpcyBvdmVyLCB3aW5uZXJzOiAnLCB3aW5uZXJzQXJyYXkpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkgKFwiQm9hcmRGYWN0b3J5XCIsIGZ1bmN0aW9uKCRodHRwLCBTb2NrZXQpe1xuXHRyZXR1cm57XG5cdFx0Z2V0U3RhcnRCb2FyZDogZnVuY3Rpb24oZ2FtZUxlbmd0aCwgZ2FtZUlkLCB1c2VySWRzKXtcblx0XHRcdGNvbnNvbGUubG9nKCdmYWN0b3J5LiBnbDogJywgZ2FtZUxlbmd0aCk7XG5cdFx0XHRTb2NrZXQuZW1pdCgnZ2V0U3RhcnRCb2FyZCcsIGdhbWVMZW5ndGgsIGdhbWVJZCwgdXNlcklkcyk7XG5cdFx0fSxcblxuXHRcdHN1Ym1pdDogZnVuY3Rpb24ob2JqKXtcblx0XHRcdFNvY2tldC5lbWl0KCdzdWJtaXRXb3JkJywgb2JqKTtcblx0XHR9LFxuXG5cdFx0c2h1ZmZsZTogZnVuY3Rpb24odXNlcil7XG5cdFx0XHRjb25zb2xlLmxvZygnZ3JpZGZhY3RvcnkgdScsdXNlci5pZCk7XG5cdFx0XHRTb2NrZXQuZW1pdCgnc2h1ZmZsZUJvYXJkJyx1c2VyLmlkKTtcblx0XHR9LFxuXG5cdFx0Ly8gZmluZEFsbE90aGVyVXNlcnM6IGZ1bmN0aW9uKGdhbWUpIHtcblx0XHQvLyBcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvZ2FtZXMvJysgZ2FtZS5pZClcblx0XHQvLyBcdC50aGVuKHJlcyA9PiByZXMuZGF0YSlcblx0XHQvLyB9LFxuXG5cdFx0Z2V0Q3VycmVudFJvb206IGZ1bmN0aW9uKHJvb21uYW1lKSB7XG5cdFx0XHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2dhbWVzL3Jvb21zLycrcm9vbW5hbWUpXG5cdFx0XHQudGhlbihyZXMgPT4gcmVzLmRhdGEpXG5cdFx0fSxcblxuXHRcdHF1aXRGcm9tUm9vbTogZnVuY3Rpb24oZ2FtZUlkLCB1c2VySWQpIHtcblx0XHRcdC8vIFNvY2tldC5lbWl0KCdkaXNjb25uZWN0Jywgcm9vbU5hbWUsIHVzZXJJZCk7XG5cdFx0XHRyZXR1cm4gJGh0dHAuZGVsZXRlKCcvYXBpL2dhbWVzLycrZ2FtZUlkKycvJyt1c2VySWQpXG5cdFx0fVxuXHR9XG59KTtcbiIsImFwcC5jb250cm9sbGVyKCdIb21lQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlLCAkbG9jYXRpb24pe1xuICAkc2NvcGUuZW50ZXJMb2JieSA9IGZ1bmN0aW9uKCl7XG4gICAgJHN0YXRlLmdvKCdsb2JieScsIHtyZWxvYWQ6IHRydWV9KTtcbiAgfVxufSk7XG5cbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUnLCB7XG4gICAgICAgIHVybDogJy8nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJ1xuICAgIH0pO1xufSk7XG5cbiIsImFwcC5jb250cm9sbGVyKCdMZWFkZXJCb2FyZEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIExlYWRlckJvYXJkRmFjdG9yeSwgJHN0YXRlLCBBdXRoU2VydmljZSkge1xuICAgIGNvbnNvbGUubG9nKCcgMScpXG4gICAgTGVhZGVyQm9hcmRGYWN0b3J5LkFsbFBsYXllcnMoKVxuICAgIC50aGVuKHBsYXllcnMgPT4ge1xuICAgICAgICBwbGF5ZXJzLmZvckVhY2gocGxheWVyID0+IHtcbiAgICAgICAgICAgIGlmIChwbGF5ZXIuZ2FtZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciBzY29yZXMgPSBwbGF5ZXIuZ2FtZXMubWFwKGdhbWUgPT4gZ2FtZS51c2VyR2FtZS5zY29yZSlcbiAgICAgICAgICAgICAgICBwbGF5ZXIuaGlnaGVzdFNjb3JlID0gTWF0aC5tYXgoLi4uc2NvcmVzKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwbGF5ZXIuaGlnaGVzdFNjb3JlID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBsYXllci5nYW1lc193b24gPSBwbGF5ZXIud2lubmVyLmxlbmd0aDtcbiAgICAgICAgICAgIHBsYXllci5nYW1lc19wbGF5ZWQgPSBwbGF5ZXIuZ2FtZXMubGVuZ3RoO1xuICAgICAgICAgICAgaWYocGxheWVyLmdhbWVzLmxlbmd0aD09PTApe1xuICAgICAgICAgICAgXHRwbGF5ZXIud2luX3BlcmNlbnRhZ2UgPSAwICsgJyUnXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgXHRwbGF5ZXIud2luX3BlcmNlbnRhZ2UgPSAoKHBsYXllci53aW5uZXIubGVuZ3RoL3BsYXllci5nYW1lcy5sZW5ndGgpKjEwMCkudG9GaXhlZCgwKSArICclJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KVxuICAgICAgICAkc2NvcGUucGxheWVycyA9IHBsYXllcnM7XG4gICAgfSlcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ0xlYWRlckJvYXJkRmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuXHR2YXIgTGVhZGVyQm9hcmRGYWN0b3J5ID0ge307XG5cblx0TGVhZGVyQm9hcmRGYWN0b3J5LkFsbFBsYXllcnMgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3VzZXJzJylcblx0XHQudGhlbihyZXM9PnJlcy5kYXRhKVxuXHR9XG5cblx0cmV0dXJuIExlYWRlckJvYXJkRmFjdG9yeTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsZWFkZXJCb2FyZCcsIHtcbiAgICAgICAgdXJsOiAnL2xlYWRlckJvYXJkJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sZWFkZXJCb2FyZC9sZWFkZXJCb2FyZC50ZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICBcdGFsbFBsYXllcnM6IGZ1bmN0aW9uKExlYWRlckJvYXJkRmFjdG9yeSkge1xuICAgICAgICBcdFx0cmV0dXJuIExlYWRlckJvYXJkRmFjdG9yeS5BbGxQbGF5ZXJzO1xuICAgICAgICBcdH0sXG4gICAgICAgICAgICBcbiAgICAgICAgfSxcbiAgICAgICAgY29udHJvbGxlcjogJ0xlYWRlckJvYXJkQ3RybCdcbiAgICB9KTtcblxufSk7IiwiYXBwLmRpcmVjdGl2ZSgnbGV0dGVyJywgKCkgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBzcGFjZTogJz0nLFxuICAgICAgICAgICAgeDogJz0nLFxuICAgICAgICAgICAgeTogJz0nLFxuICAgICAgICAgICAgZHJhZ2dpbmdBbGxvd2VkOiAnPScsXG4gICAgICAgICAgICBleHBvcnRzOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsLCBhdHRyKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ3Njb3BlLmRyYWdnaW5nQWxsb3dlZDogJyArIHNjb3BlLmRyYWdnaW5nQWxsb3dlZCk7XG5cbiAgICAgICAgICAgIHNjb3BlLm1vdXNlSXNEb3duID0gZmFsc2U7XG4gICAgICAgICAgICBzY29wZS50b3VjaElzQWN0aXZhdGVkID0gZmFsc2U7XG5cblxuICAgICAgICAgICAgc2NvcGUubW91c2VEb3duID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ21vdXNlIGlzIGRvd24nKVxuICAgICAgICAgICAgICAgIHNjb3BlLm1vdXNlSXNEb3duID0gdHJ1ZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLm1vdXNlVXAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbW91c2UgaXMgdXAnKTtcbiAgICAgICAgICAgICAgICBzY29wZS5tb3VzZUlzRG93biA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGlmIChzY29wZS5kcmFnZ2luZ0FsbG93ZWQgJiYgc2NvcGUuZXhwb3J0cy53b3JkLmxlbmd0aCA+IDEpIHNjb3BlLnN1Ym1pdChzY29wZS5leHBvcnRzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLnRvdWNoQWN0aXZhdGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3RvdWNoIGlzIGFjdGl2YXRlZDogJyArIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgc2NvcGUudG91Y2hJc0FjdGl2YXRlZCA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjb3BlLnRvdWNoU3RvcHBlZCA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndG91Y2ggaXMgc3RvcHBlZDogJyArIGUpO1xuICAgICAgICAgICAgICAgIHNjb3BlLnRvdWNoSXNBY3RpdmF0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBpZiAoc2NvcGUuZHJhZ2dpbmdBbGxvd2VkICYmIHNjb3BlLmV4cG9ydHMud29yZC5sZW5ndGggPiAxKSBzY29wZS5zdWJtaXQoc2NvcGUuZXhwb3J0cyk7XG4gICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgc2NvcGUuZHJhZyA9IGZ1bmN0aW9uKHNwYWNlLCBpZCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdtb3VzZSBlbnRlcjogJyArIGlkKTtcbiAgICAgICAgICAgICAgICBpZiAoc2NvcGUubW91c2VJc0Rvd24gJiYgc2NvcGUuZHJhZ2dpbmdBbGxvd2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmNsaWNrKHNwYWNlLCBpZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgZnVuY3Rpb24gdmFsaWRTZWxlY3QobHRySWQsIG90aGVyTHRyc0lkcykge1xuICAgICAgICAgICAgICAgIGlmIChvdGhlckx0cnNJZHMuaW5jbHVkZXMobHRySWQpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgdmFyIGNvb3JkcyA9IGx0cklkLnNwbGl0KCctJyk7XG4gICAgICAgICAgICAgICAgdmFyIHJvdyA9IGNvb3Jkc1swXTtcbiAgICAgICAgICAgICAgICB2YXIgY29sID0gY29vcmRzWzFdO1xuICAgICAgICAgICAgICAgIHZhciBsYXN0THRySWQgPSBvdGhlckx0cnNJZHMucG9wKCk7XG4gICAgICAgICAgICAgICAgdmFyIGNvb3Jkc0xhc3QgPSBsYXN0THRySWQuc3BsaXQoJy0nKTtcbiAgICAgICAgICAgICAgICB2YXIgcm93TGFzdCA9IGNvb3Jkc0xhc3RbMF07XG4gICAgICAgICAgICAgICAgdmFyIGNvbExhc3QgPSBjb29yZHNMYXN0WzFdO1xuICAgICAgICAgICAgICAgIHZhciByb3dPZmZzZXQgPSBNYXRoLmFicyhyb3cgLSByb3dMYXN0KTtcbiAgICAgICAgICAgICAgICB2YXIgY29sT2Zmc2V0ID0gTWF0aC5hYnMoY29sIC0gY29sTGFzdCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChyb3dPZmZzZXQgPD0gMSAmJiBjb2xPZmZzZXQgPD0gMSk7XG4gICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgc2NvcGUuY2xpY2sgPSBmdW5jdGlvbihzcGFjZSwgaWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2NvcGUuZnJlZXplKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NsaWNrZWQgJywgc3BhY2UsIGlkKTtcbiAgICAgICAgICAgICAgICB2YXIgbHRyc1NlbGVjdGVkID0gT2JqZWN0LmtleXMoc2NvcGUuZXhwb3J0cy53b3JkT2JqKTtcbiAgICAgICAgICAgICAgICB2YXIgcHJldmlvdXNMdHIgPSBsdHJzU2VsZWN0ZWRbbHRyc1NlbGVjdGVkLmxlbmd0aCAtIDJdO1xuICAgICAgICAgICAgICAgIHZhciBsYXN0THRyID0gbHRyc1NlbGVjdGVkW2x0cnNTZWxlY3RlZC5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICBpZiAoIWx0cnNTZWxlY3RlZC5sZW5ndGggfHwgdmFsaWRTZWxlY3QoaWQsIGx0cnNTZWxlY3RlZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuZXhwb3J0cy53b3JkICs9IHNwYWNlO1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5leHBvcnRzLndvcmRPYmpbaWRdID0gc3BhY2U7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHNjb3BlLmV4cG9ydHMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaWQgPT09IHByZXZpb3VzTHRyKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmV4cG9ydHMud29yZCA9IHNjb3BlLmV4cG9ydHMud29yZC5zdWJzdHJpbmcoMCwgc2NvcGUuZXhwb3J0cy53b3JkLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgc2NvcGUuZXhwb3J0cy53b3JkT2JqW2xhc3RMdHJdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobHRyc1NlbGVjdGVkLmxlbmd0aCA9PT0gMSAmJiBpZCA9PT0gbGFzdEx0cikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5leHBvcnRzLndvcmQgPSBcIlwiO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgc2NvcGUuZXhwb3J0cy53b3JkT2JqW2xhc3RMdHJdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGRpdl9vdmVybGFwKGpxbywgbGVmdCwgdG9wKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2RpdiBvdmVybGFwcGVkOiAnICsganFvKTtcbiAgICAgICAgICAgICAgICB2YXIgZCA9IGpxby5vZmZzZXQoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdG9wID49IGQudG9wICYmIGxlZnQgPj0gZC5sZWZ0ICYmIGxlZnQgPD0gKGQubGVmdCtqcW9bMF0ub2Zmc2V0V2lkdGgpICYmIHRvcCA8PSAoZC50b3AranFvWzBdLm9mZnNldEhlaWdodCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGVsLmJpbmQoXCJ0b3VjaG1vdmVcIiwgZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2JpbmRpbmcgbW91c2VlbnRlciBhbmQgdG91Y2htb3ZlJywgZXZ0KTtcbiAgICAgICAgICAgICAgICBlbC5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZm9yIGVhY2ggZWxlbWVudCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGl2X292ZXJsYXAodGhpcywgZXZ0LnBhZ2VYLCBldnQucGFnZVkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZW50ZXJpbmcgZGl2X292ZXJsYXAnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5oYXNDbGFzcygnc2VsZWN0ZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQ2xhc3MoJ3NlbGVjdGVkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgIC8vIHNjb3BlLm1vYmlsZURyYWcgPSBmdW5jdGlvbihzcGFjZSwgaWQpIHtcbiAgICAgICAgICAgIC8vICAgICBjb25zb2xlLmxvZygndG91Y2ggaXMgZHJhZ2dlZDogJyArIHNwYWNlICsgXCIgOiBcIiArIGlkKTtcbiAgICAgICAgICAgIC8vICAgICBpZigkc2NvcGUudG91Y2hJc0FjdGl2YXRlZCAmJiAkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkKXtcbiAgICAgICAgICAgIC8vICAgICAgICAgJHNjb3BlLmNsaWNrKHNwYWNlLCBpZCk7XG4gICAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgICAgLy8gfTtcblxuXG5cbiAgICAgICAgfSxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvanMvbGV0dGVyL2xldHRlci50ZW1wbGF0ZS5odG1sJ1xuICAgIH1cbn0pO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ0xvYmJ5Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgTG9iYnlGYWN0b3J5LCByb29tcywgJHN0YXRlLCBBdXRoU2VydmljZSkge1xuXG4gICAgLy8gQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKClcbiAgICAvLyAgICAgLnRoZW4oZnVuY3Rpb24odXNlcikge1xuICAgIC8vICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgIC8vICAgICB9KTtcblxuICAgICRzY29wZS5yb29tcyA9IHJvb21zO1xuICAgICRzY29wZS5yb29tTmFtZUZvcm0gPSBmYWxzZTtcbiAgICAvLyAkc2NvcGUudXNlciA9IHtcbiAgICAvLyAgaWQ6IDNcbiAgICAvLyB9XG5cbiAgICAvLyAkc2NvcGUuam9pbkdhbWUgPSBmdW5jdGlvbihyb29tKSB7XG4gICAgLy8gICAgIGNvbnNvbGUubG9nKFwiaW0gY2hhbmdpbmcgc3RhdGUgYW5kIHJlbG9hZGluZ1wiKTtcbiAgICAvLyAgICAgJHN0YXRlLmdvKCdHYW1lJywgeyByb29tbmFtZTogcm9vbS5yb29tbmFtZSB9LCB7IHJlbG9hZDogdHJ1ZSwgbm90aWZ5OiB0cnVlIH0pXG4gICAgLy8gfTtcblxuICAgICRzY29wZS5uZXdSb29tID0gZnVuY3Rpb24ocm9vbUluZm8pIHtcbiAgICAgICAgTG9iYnlGYWN0b3J5Lm5ld0dhbWUocm9vbUluZm8pO1xuICAgICAgICAkc2NvcGUucm9vbU5hbWVGb3JtID0gZmFsc2U7XG4gICAgfTtcbiAgICAkc2NvcGUuc2hvd0Zvcm0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLnJvb21OYW1lRm9ybSA9IHRydWU7XG4gICAgfTtcblxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdlbnRlckxvYmJ5JywgZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlVXJsOiAnanMvbG9iYnkvbG9iYnktYnV0dG9uLmh0bWwnLFxuICAgIGNvbnRyb2xsZXI6ICdIb21lQ3RybCdcbiAgfVxufSlcbiIsImFwcC5mYWN0b3J5KCdMb2JieUZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHApIHtcblx0dmFyIExvYmJ5RmFjdG9yeSA9IHt9O1xuXHR2YXIgdGVtcFJvb21zID0gW107IC8vd29yayB3aXRoIHNvY2tldD9cblxuXHRMb2JieUZhY3RvcnkuZ2V0QWxsUm9vbXMgPSBmdW5jdGlvbigpe1xuXHRcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvZ2FtZXMvcm9vbXMnKVxuXHRcdC50aGVuKHJlcyA9PiByZXMuZGF0YSlcblx0XHQudGhlbihyb29tcyA9PiB7XG5cdFx0XHRhbmd1bGFyLmNvcHkocm9vbXMsIHRlbXBSb29tcyk7XG5cdFx0XHRyZXR1cm4gdGVtcFJvb21zO1xuXHRcdH0pXG5cdH07XG5cblx0TG9iYnlGYWN0b3J5LmpvaW5HYW1lID0gZnVuY3Rpb24ocm9vbUlkLCB1c2VySWQpIHtcbiAgICBjb25zb2xlLmxvZygnbG9iYnkgZmFjdG9yeSBqb2luIGdhbWUnKTtcblx0XHRyZXR1cm4gJGh0dHAucHV0KCcvYXBpL2dhbWVzLycrIHJvb21JZCArJy9wbGF5ZXInLCB7aWQ6IHVzZXJJZH0pXG5cdFx0LnRoZW4ocmVzPT5yZXMuZGF0YSlcblx0fTtcblxuXHRMb2JieUZhY3RvcnkubmV3R2FtZSA9IGZ1bmN0aW9uKHJvb21JbmZvKSB7XG5cdFx0cmV0dXJuICRodHRwLnB1dCgnL2FwaS9nYW1lcycsIHJvb21JbmZvKVxuXHRcdC50aGVuKHJlcyA9PiByZXMuZGF0YSlcblx0IFx0LnRoZW4ocm9vbSA9PiB7XG5cdCBcdFx0dGVtcFJvb21zLnB1c2gocm9vbSk7XG5cdCBcdFx0cmV0dXJuIHJvb207XG5cdCBcdFx0fSk7XG5cdH07XG5cblx0TG9iYnlGYWN0b3J5LkFsbFBsYXllcnMgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3VzZXJzJylcblx0XHQudGhlbihyZXM9PnJlcy5kYXRhKVxuXHR9O1xuXG5cdHJldHVybiBMb2JieUZhY3Rvcnk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9iYnknLCB7XG4gICAgICAgIHVybDogJy9sb2JieScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9iYnkvbG9iYnkudGVtcGxhdGUuaHRtbCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgXHRyb29tczogZnVuY3Rpb24oTG9iYnlGYWN0b3J5KSB7XG4gICAgICAgIFx0XHRyZXR1cm4gTG9iYnlGYWN0b3J5LmdldEFsbFJvb21zKCk7XG4gICAgICAgIFx0fVxuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiAnTG9iYnlDdHJsJ1xuICAgIH0pO1xuXG59KTsiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xuICAgICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0xvZ2luQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgICRzY29wZS5sb2dpbiA9IHt9O1xuICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAkc2NvcGUuc2VuZExvZ2luID0gZnVuY3Rpb24gKGxvZ2luSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UubG9naW4obG9naW5JbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdtZW1iZXJzT25seScsIHtcbiAgICAgICAgdXJsOiAnL21lbWJlcnMtYXJlYScsXG4gICAgICAgIHRlbXBsYXRlOiAnPGltZyBuZy1yZXBlYXQ9XCJpdGVtIGluIHN0YXNoXCIgd2lkdGg9XCIzMDBcIiBuZy1zcmM9XCJ7eyBpdGVtIH19XCIgLz4nLFxuICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlLCBTZWNyZXRTdGFzaCkge1xuICAgICAgICAgICAgU2VjcmV0U3Rhc2guZ2V0U3Rhc2goKS50aGVuKGZ1bmN0aW9uIChzdGFzaCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5zdGFzaCA9IHN0YXNoO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgZGF0YS5hdXRoZW50aWNhdGUgaXMgcmVhZCBieSBhbiBldmVudCBsaXN0ZW5lclxuICAgICAgICAvLyB0aGF0IGNvbnRyb2xzIGFjY2VzcyB0byB0aGlzIHN0YXRlLiBSZWZlciB0byBhcHAuanMuXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxuICAgICAgICB9XG4gICAgfSk7XG5cbn0pO1xuXG4iLCJhcHAuZGlyZWN0aXZlKCdyYW5rRGlyZWN0aXZlJywgKCk9PiB7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdFJyxcblx0XHRzY29wZToge1xuXHRcdFx0cmFua05hbWU6ICdAJyxcblx0XHRcdHBsYXllcnM6ICc9Jyxcblx0XHRcdHJhbmtCeTogJ0AnLFxuXHRcdFx0b3JkZXI6ICdAJ1xuXHRcdH0sXG5cdFx0dGVtcGxhdGVVcmw6ICcvanMvcmFuay9yYW5rLnRlbXBsYXRlLmh0bWwnXG5cdH1cbn0pOyIsImFwcC5mYWN0b3J5KCdTaWdudXBGYWN0b3J5JywgZnVuY3Rpb24oJGh0dHAsICRzdGF0ZSwgQXV0aFNlcnZpY2UpIHtcblx0Y29uc3QgU2lnbnVwRmFjdG9yeSA9IHt9O1xuXG5cdFNpZ251cEZhY3RvcnkuY3JlYXRlVXNlciA9IGZ1bmN0aW9uKHNpZ251cEluZm8pIHtcblx0XHRjb25zb2xlLmxvZyhzaWdudXBJbmZvKVxuXHRcdHJldHVybiAkaHR0cC5wb3N0KCcvc2lnbnVwJywgc2lnbnVwSW5mbylcblx0XHQudGhlbihyZXMgPT4ge1xuXHRcdFx0aWYgKHJlcy5zdGF0dXMgPT09IDIwMSkge1xuXHRcdFx0XHRBdXRoU2VydmljZS5sb2dpbih7ZW1haWw6IHNpZ251cEluZm8uZW1haWwsIHBhc3N3b3JkOiBzaWdudXBJbmZvLnBhc3N3b3JkfSlcblx0XHRcdFx0LnRoZW4odXNlciA9PiB7XG5cdFx0XHRcdFx0JHN0YXRlLmdvKCdob21lJylcblx0XHRcdFx0fSlcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRocm93IEVycm9yKCdBbiBhY2NvdW50IHdpdGggdGhhdCBlbWFpbCBhbHJlYWR5IGV4aXN0cycpO1xuXHRcdFx0fVxuXHRcdH0pXG5cdH1cblxuXHRyZXR1cm4gU2lnbnVwRmFjdG9yeTtcbn0pIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzaWdudXAnLCB7XG4gICAgICAgIHVybDogJy9zaWdudXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3NpZ251cC9zaWdudXAuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTaWdudXBDdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ1NpZ251cEN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlLCBTaWdudXBGYWN0b3J5KSB7XG5cbiAgICAkc2NvcGUuc2lnbnVwID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kU2lnbnVwID0gZnVuY3Rpb24oc2lnbnVwSW5mbyl7XG4gICAgICAgIFNpZ251cEZhY3RvcnkuY3JlYXRlVXNlcihzaWdudXBJbmZvKVxuICAgICAgICAuY2F0Y2goKCkgPT4ge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0FuIGFjY291bnQgd2l0aCB0aGF0IGVtYWlsIGFscmVhZHkgZXhpc3RzJztcbiAgICAgICAgfSlcbiAgICB9XG4gICAgXG5cblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKXtcblx0JHN0YXRlUHJvdmlkZXIuc3RhdGUoXCJVc2VyUHJvZmlsZVwiLHtcblx0XHR1cmw6IFwiL3VzZXJzLzp1c2VySWRcIixcblx0XHR0ZW1wbGF0ZVVybDpcImpzL3VzZXJfcHJvZmlsZS9wcm9maWxlLnRlbXBsYXRlLmh0bWxcIixcblx0XHRjb250cm9sbGVyOiBcIlVzZXJDdHJsXCJcblx0fSlcblx0JHN0YXRlUHJvdmlkZXIuc3RhdGUoXCJHYW1lUmVjb3JkXCIsIHtcblx0XHR1cmw6XCIvdXNlcnMvOnVzZXJJZC9nYW1lc1wiLFxuXHRcdHRlbXBsYXRlVXJsOiBcImpzL3VzZXJfcHJvZmlsZS9nYW1lcy5odG1sXCIsXG5cdFx0Y29udHJvbGxlcjogXCJHYW1lUmVjb3JkQ3RybFwiXG5cdH0pXG59KVxuXG5hcHAuY29udHJvbGxlcihcIlVzZXJDdHJsXCIsIGZ1bmN0aW9uKCRzY29wZSwgVXNlckZhY3RvcnksICRzdGF0ZVBhcmFtcyl7XG5cdFVzZXJGYWN0b3J5LmZldGNoSW5mb3JtYXRpb24oJHN0YXRlUGFyYW1zLnVzZXJJZClcblx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG5cdFx0JHNjb3BlLnVzZXI9dXNlcjtcblx0XHRyZXR1cm4gdXNlclxuXHR9KVxuXHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0XHQkc2NvcGUudXBkYXRlZD0kc2NvcGUudXNlci51cGRhdGVkQXQuZ2V0RGF5KCk7XG5cdH0pXG59KVxuXG5hcHAuY29udHJvbGxlcihcIkdhbWVSZWNvcmRDdHJsXCIsZnVuY3Rpb24oJHNjb3BlLCBVc2VyRmFjdG9yeSwgJHN0YXRlUGFyYW1zKXtcblx0VXNlckZhY3RvcnkuZmV0Y2hJbmZvcm1hdGlvbigkc3RhdGVQYXJhbXMudXNlcklkKVxuXHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0XHQkc2NvcGUudXNlcj11c2VyO1xuXHR9KVxuXHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0VXNlckZhY3RvcnkuZmV0Y2hHYW1lcygkc3RhdGVQYXJhbXMudXNlcklkKVxuXHR9KVxuXHQudGhlbihmdW5jdGlvbihnYW1lcyl7XG5cdFx0JHNjb3BlLmdhbWVzPWdhbWVzO1xuXHR9KVxufSkiLCJhcHAuZmFjdG9yeShcIlVzZXJGYWN0b3J5XCIsIGZ1bmN0aW9uKCRodHRwKXtcblx0cmV0dXJuIHtcblx0XHRmZXRjaEluZm9ybWF0aW9uOiBmdW5jdGlvbihpZCl7XG5cdFx0XHRyZXR1cm4gJGh0dHAuZ2V0KFwiL2FwaS91c2Vycy9cIitpZClcblx0XHRcdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHRcdFx0XHRyZXR1cm4gdXNlci5kYXRhO1xuXHRcdFx0fSlcblx0XHR9LFxuXHRcdGZldGNoR2FtZXM6IGZ1bmN0aW9uKGlkKXtcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoXCIvYXBpL3VzZXJzL1wiK2lkK1wiL2dhbWVzXCIpXG5cdFx0XHQudGhlbihmdW5jdGlvbihnYW1lcyl7XG5cdFx0XHRcdHJldHVybiBnYW1lcy5kYXRhO1xuXHRcdFx0fSlcblx0XHR9XG5cdH1cbn0pIiwiYXBwLmRpcmVjdGl2ZSgnbG9nbycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2xvZ28vbG9nby5odG1sJ1xuICAgIH07XG59KVxuIiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdob21lJyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdMZWFkZXIgQm9hcmQnLCBzdGF0ZTogJ2xlYWRlckJvYXJkJyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdZb3VyIFByb2ZpbGUnLCBzdGF0ZTogJ1VzZXJQcm9maWxlJywgYXV0aDogdHJ1ZSB9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcblxuICAgICAgICAgICAgc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UubG9nb3V0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHJlbW92ZVVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzZXRVc2VyKCk7XG5cbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0VXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCByZW1vdmVVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCByZW1vdmVVc2VyKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYXBwLmRpcmVjdGl2ZSgnb2F1dGhCdXR0b24nLCBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgc2NvcGU6IHtcbiAgICAgIHByb3ZpZGVyTmFtZTogJ0AnXG4gICAgfSxcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvb2F1dGgtYnV0dG9uL29hdXRoLWJ1dHRvbi5odG1sJ1xuICB9XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoXCJ0aW1lclwiLCBmdW5jdGlvbigkcSwgJGludGVydmFsLCBTb2NrZXQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgdGltZTogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIHRlbXBsYXRlVXJsOiBcImpzL2NvbW1vbi9kaXJlY3RpdmVzL3RpbWVyL3RpbWVyLmh0bWxcIixcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgICAgIHZhciB0aW1lID0gc2NvcGUudGltZTtcbiAgICAgICAgICAgIHZhciBzdGFydD1zY29wZS50aW1lO1xuICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBjb252ZXJ0KHRpbWUpO1xuICAgICAgICAgICAgc2NvcGUuY291bnRkb3duID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRpbWVyID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB0aW1lIC09IDE7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gY29udmVydCh0aW1lKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRpbWUgPCAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IFwiVGltZSB1cCFcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwodGltZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGltZT1zdGFydDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gc2NvcGUubWVzc2FnZXMgPSBbXCJHZXQgUmVhZHkhXCIsIFwiR2V0IFNldCFcIiwgXCJHbyFcIiwgJy8nXTtcbiAgICAgICAgICAgIC8vICAgICB2YXIgaW5kZXggPSAwO1xuICAgICAgICAgICAgLy8gICAgIHZhciBwcmVwYXJlID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IHNjb3BlLm1lc3NhZ2VzW2luZGV4XTtcbiAgICAgICAgICAgIC8vICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICAgIC8vICAgICAgICAgY29uc29sZS5sb2coc2NvcGUudGltZV9yZW1haW5pbmcpO1xuICAgICAgICAgICAgLy8gICAgICAgICBpZiAoc2NvcGUudGltZV9yZW1haW5pbmcgPT09IFwiL1wiKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IGNvbnZlcnQodGltZSk7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKHByZXBhcmUpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgdmFyIHRpbWVyID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgIHRpbWUgLT0gMTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IGNvbnZlcnQodGltZSk7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgaWYgKHRpbWUgPCAxKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gXCJUaW1lIHVwIVwiO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKHRpbWVyKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgfVxuICAgICAgICAgICAgLy8gICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgLy8gfTtcblxuICAgICAgICAgICAgU29ja2V0Lm9uKCdzdGFydEJvYXJkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuY291bnRkb3duKHRpbWUpO1xuICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgZnVuY3Rpb24gY29udmVydCh0aW1lKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlY29uZHMgPSAodGltZSAlIDYwKS50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgIHZhciBjb252ZXJzaW9uID0gKE1hdGguZmxvb3IodGltZSAvIDYwKSkgKyAnOic7XG4gICAgICAgICAgICAgICAgaWYgKHNlY29uZHMubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgICAgICAgICBjb252ZXJzaW9uICs9ICcwJyArIHNlY29uZHM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29udmVyc2lvbiArPSBzZWNvbmRzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gY29udmVyc2lvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0pXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
