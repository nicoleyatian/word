'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

window.app = angular.module('FullstackGeneratedApp', ['fsaPreBuilt', 'ui.router', 'ui.bootstrap', 'ngAnimate']);

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
        return window.io(window.location.origin, { 'forceNew': true });
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

    $scope.gameLength = 150;

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

    $scope.checkSelected = function (id) {
        return id in $scope.exports.wordObj;
    };

    $scope.toggleDrag = function () {
        $scope.draggingAllowed = !$scope.draggingAllowed;
    };

    $scope.mouseDown = function () {
        $scope.mouseIsDown = true;
    };

    $scope.mouseUp = function () {
        $scope.mouseIsDown = false;
        if ($scope.draggingAllowed && $scope.exports.word.length > 1) $scope.submit($scope.exports);
    };

    $scope.drag = function (space, id) {
        if ($scope.mouseIsDown && $scope.draggingAllowed) {
            $scope.click(space, id);
        }
    };

    $scope.hideBoard = true;

    // Start the game when all players have joined room
    $scope.startGame = function () {
        var userIds = $scope.otherPlayers.map(function (user) {
            return user.id;
        });
        userIds.push($scope.user.id);
        console.log('op', $scope.otherPlayers, 'ui', userIds);

        BoardFactory.getStartBoard($scope.gameLength, $scope.gameId, userIds);
    };

    //Quit the room, back to lobby
    $scope.quit = function () {
        $rootScope.hideNavbar = false;
        $state.go('lobby');
    };

    $scope.board = [['b', 'a', 'd', 'e', 'a', 'r'], ['e', 'f', 'g', 'l', 'm', 'e'], ['h', 'i', 'j', 'f', 'o', 'a'], ['c', 'a', 'd', 'e', 'a', 'r'], ['e', 'f', 'g', 'l', 'd', 'e'], ['h', 'i', 'j', 'f', 'o', 'a']];

    $scope.size = 3;
    $scope.score = 0;

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
        console.log('updated obj', updateObj);
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

    // $scope.$on('$stateChangeStart', function() {
    //     console.log('changestate', $scope.user.id);
    //     Socket.close();
    //     // Socket.reconnect();

    // });

    $scope.$on('$destroy', function () {
<<<<<<< HEAD
        Socket.emit('leaveRoom');
    });

    // Socket.on('connect', function() {
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
        $scope.message = '';
        $scope.winOrLose = null;
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
        $scope.otherPlayers = $scope.otherPlayers.filter(function (otherPlayer) {
            return otherPlayer.id !== user.id;
        });

=======
        console.log('changestate close', $scope.user.id);

        Socket.emit('leaveRoom');
    });

    $scope.checkConnect = function () {
        $scope.connected = true;
        $scope.$evalAsync();
    };

    console.log('update');

    // Socket.on('connect', function() {
    // $scope.checkConnect();
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
        $scope.message = '';
        $scope.winOrLose = null;
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
        $scope.otherPlayers = $scope.otherPlayers.filter(function (otherPlayer) {
            return otherPlayer.id !== user.id;
        });

>>>>>>> master
        $scope.$evalAsync();
    });

    Socket.on('gameOver', function (winnersArray) {
        $scope.clear();
        $scope.freeze = true;
        $scope.determineWinner(winnersArray);
        $scope.$evalAsync();
        console.log('game is over, winners: ', winnersArray);
    });
    // });
<<<<<<< HEAD
=======

    // if (!$scope.connected) {
    //     console.log('connect manually')
    //      Socket.connect();
    // }
>>>>>>> master
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

app.factory('SecretStash', function ($http) {

    var getStash = function getStash() {
        return $http.get('/api/members/secret-stash').then(function (response) {
            return response.data;
        });
    };

    return {
        getStash: getStash
    };
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

            scope.items = [{ label: 'Home', state: 'home' }, { label: 'Your Profile', state: 'UserProfile', auth: true }];

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
<<<<<<< HEAD
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiaG9tZS9ob21lLmNvbnRyb2xsZXIuanMiLCJob21lL2hvbWUuanMiLCJnYW1lLXN0YXRlL2dyaWQuY29udHJvbGxlci5qcyIsImdhbWUtc3RhdGUvZ3JpZC5mYWN0b3J5LmpzIiwibGVhZGVyQm9hcmQvbGVhZGVyQm9hcmQuY29udHJvbGxlci5qcyIsImxlYWRlckJvYXJkL2xlYWRlckJvYXJkLmZhY3RvcnkuanMiLCJsZWFkZXJCb2FyZC9sZWFkZXJCb2FyZC5zdGF0ZS5qcyIsImxvYmJ5L2xvYmJ5LmNvbnRyb2xsZXIuanMiLCJsb2JieS9sb2JieS5kaXJlY3RpdmUuanMiLCJsb2JieS9sb2JieS5mYWN0b3J5LmpzIiwibG9iYnkvbG9iYnkuc3RhdGUuanMiLCJsb2dpbi9sb2dpbi5qcyIsIm1lbWJlcnMtb25seS9tZW1iZXJzLW9ubHkuanMiLCJyYW5rL3JhbmsuZGlyZWN0aXZlLmpzIiwic2lnbnVwL3NpZ251cC5mYWN0b3J5LmpzIiwic2lnbnVwL3NpZ251cC5qcyIsInVzZXJfcHJvZmlsZS9wcm9maWxlLmNvbnRyb2xsZXIuanMiLCJ1c2VyX3Byb2ZpbGUvcHJvZmlsZS5mYWN0b3J5LmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvdGltZXIvdGltZXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsImFwcCIsImFuZ3VsYXIiLCJtb2R1bGUiLCJjb25maWciLCIkdXJsUm91dGVyUHJvdmlkZXIiLCIkbG9jYXRpb25Qcm92aWRlciIsImh0bWw1TW9kZSIsIm90aGVyd2lzZSIsIndoZW4iLCJsb2NhdGlvbiIsInJlbG9hZCIsInJ1biIsIiRyb290U2NvcGUiLCIkb24iLCJldmVudCIsInRvU3RhdGUiLCJ0b1BhcmFtcyIsImZyb21TdGF0ZSIsImZyb21QYXJhbXMiLCJ0aHJvd25FcnJvciIsImNvbnNvbGUiLCJpbmZvIiwibmFtZSIsImVycm9yIiwiQXV0aFNlcnZpY2UiLCIkc3RhdGUiLCJkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoIiwic3RhdGUiLCJkYXRhIiwiYXV0aGVudGljYXRlIiwiaXNBdXRoZW50aWNhdGVkIiwicHJldmVudERlZmF1bHQiLCJnZXRMb2dnZWRJblVzZXIiLCJ0aGVuIiwidXNlciIsImdvIiwiRXJyb3IiLCJmYWN0b3J5IiwiaW8iLCJvcmlnaW4iLCJjb25zdGFudCIsImxvZ2luU3VjY2VzcyIsImxvZ2luRmFpbGVkIiwibG9nb3V0U3VjY2VzcyIsInNlc3Npb25UaW1lb3V0Iiwibm90QXV0aGVudGljYXRlZCIsIm5vdEF1dGhvcml6ZWQiLCIkcSIsIkFVVEhfRVZFTlRTIiwic3RhdHVzRGljdCIsInJlc3BvbnNlRXJyb3IiLCJyZXNwb25zZSIsIiRicm9hZGNhc3QiLCJzdGF0dXMiLCJyZWplY3QiLCIkaHR0cFByb3ZpZGVyIiwiaW50ZXJjZXB0b3JzIiwicHVzaCIsIiRpbmplY3RvciIsImdldCIsInNlcnZpY2UiLCIkaHR0cCIsIlNlc3Npb24iLCJvblN1Y2Nlc3NmdWxMb2dpbiIsImNyZWF0ZSIsImZyb21TZXJ2ZXIiLCJjYXRjaCIsImxvZ2luIiwiY3JlZGVudGlhbHMiLCJwb3N0IiwibWVzc2FnZSIsImxvZ291dCIsImRlc3Ryb3kiLCJzZWxmIiwiY29udHJvbGxlciIsIiRzY29wZSIsIiRsb2NhdGlvbiIsImVudGVyTG9iYnkiLCIkc3RhdGVQcm92aWRlciIsInVybCIsInRlbXBsYXRlVXJsIiwiQm9hcmRGYWN0b3J5IiwiU29ja2V0IiwiJHN0YXRlUGFyYW1zIiwiTG9iYnlGYWN0b3J5Iiwicm9vbU5hbWUiLCJyb29tbmFtZSIsImhpZGVTdGFydCIsIm90aGVyUGxheWVycyIsImdhbWVMZW5ndGgiLCJleHBvcnRzIiwid29yZE9iaiIsIndvcmQiLCJwbGF5ZXJJZCIsInN0YXRlTnVtYmVyIiwicG9pbnRzRWFybmVkIiwibW91c2VJc0Rvd24iLCJkcmFnZ2luZ0FsbG93ZWQiLCJzdHlsZSIsImZyZWV6ZSIsIndpbk9yTG9zZSIsInRpbWVvdXQiLCJoaWRlTmF2YmFyIiwiY2hlY2tTZWxlY3RlZCIsImlkIiwidG9nZ2xlRHJhZyIsIm1vdXNlRG93biIsIm1vdXNlVXAiLCJsZW5ndGgiLCJzdWJtaXQiLCJkcmFnIiwic3BhY2UiLCJjbGljayIsImhpZGVCb2FyZCIsInN0YXJ0R2FtZSIsInVzZXJJZHMiLCJtYXAiLCJsb2ciLCJnZXRTdGFydEJvYXJkIiwiZ2FtZUlkIiwicXVpdCIsImJvYXJkIiwibWVzc2FnZXMiLCJzaXplIiwic2NvcmUiLCJsdHJzU2VsZWN0ZWQiLCJPYmplY3QiLCJrZXlzIiwicHJldmlvdXNMdHIiLCJsYXN0THRyIiwidmFsaWRTZWxlY3QiLCJzdWJzdHJpbmciLCJsdHJJZCIsIm90aGVyTHRyc0lkcyIsImluY2x1ZGVzIiwiY29vcmRzIiwic3BsaXQiLCJyb3ciLCJjb2wiLCJsYXN0THRySWQiLCJwb3AiLCJjb29yZHNMYXN0Iiwicm93TGFzdCIsImNvbExhc3QiLCJyb3dPZmZzZXQiLCJNYXRoIiwiYWJzIiwiY29sT2Zmc2V0IiwiY2xlYXJJZkNvbmZsaWN0aW5nIiwidXBkYXRlV29yZE9iaiIsImV4cG9ydFdvcmRPYmoiLCJ0aWxlc01vdmVkIiwibXlXb3JkVGlsZXMiLCJzb21lIiwiY29vcmQiLCJjbGVhciIsIm9iaiIsInNodWZmbGUiLCJ1cGRhdGVCb2FyZCIsImtleSIsInVwZGF0ZVNjb3JlIiwicG9pbnRzIiwicGxheWVyIiwidXBkYXRlIiwidXBkYXRlT2JqIiwidXNlcm5hbWUiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwiJGV2YWxBc3luYyIsInJlcGxheSIsIm5ld0dhbWUiLCJnYW1lIiwiYWxsSWRzIiwiYWxsIiwiam9pbkdhbWUiLCJlIiwiZGV0ZXJtaW5lV2lubmVyIiwid2lubmVyc0FycmF5Iiwid2lubmVyIiwid2lubmVycyIsImkiLCJlbWl0IiwiZ2V0Q3VycmVudFJvb20iLCJyb29tIiwidXNlcnMiLCJmaWx0ZXIiLCJmb3JFYWNoIiwib24iLCJsYXN0V29yZFBsYXllZCIsInVzZXJJZCIsIm90aGVyUGxheWVyIiwicmVzIiwicXVpdEZyb21Sb29tIiwiZGVsZXRlIiwiTGVhZGVyQm9hcmRGYWN0b3J5IiwiQWxsUGxheWVycyIsInBsYXllcnMiLCJnYW1lcyIsInNjb3JlcyIsInVzZXJHYW1lIiwiaGlnaGVzdFNjb3JlIiwibWF4IiwiZ2FtZXNfd29uIiwiZ2FtZXNfcGxheWVkIiwid2luX3BlcmNlbnRhZ2UiLCJ0b0ZpeGVkIiwicmVzb2x2ZSIsImFsbFBsYXllcnMiLCJyb29tcyIsInJvb21OYW1lRm9ybSIsIm5ld1Jvb20iLCJyb29tSW5mbyIsInNob3dGb3JtIiwiZGlyZWN0aXZlIiwicmVzdHJpY3QiLCJ0ZW1wUm9vbXMiLCJnZXRBbGxSb29tcyIsImNvcHkiLCJyb29tSWQiLCJwdXQiLCJzZW5kTG9naW4iLCJsb2dpbkluZm8iLCJ0ZW1wbGF0ZSIsIlNlY3JldFN0YXNoIiwiZ2V0U3Rhc2giLCJzdGFzaCIsInNjb3BlIiwicmFua05hbWUiLCJyYW5rQnkiLCJvcmRlciIsIlNpZ251cEZhY3RvcnkiLCJjcmVhdGVVc2VyIiwic2lnbnVwSW5mbyIsImVtYWlsIiwicGFzc3dvcmQiLCJzaWdudXAiLCJzZW5kU2lnbnVwIiwiVXNlckZhY3RvcnkiLCJmZXRjaEluZm9ybWF0aW9uIiwidXBkYXRlZCIsInVwZGF0ZWRBdCIsImdldERheSIsImZldGNoR2FtZXMiLCIkaW50ZXJ2YWwiLCJ0aW1lIiwibGluayIsInN0YXJ0IiwidGltZV9yZW1haW5pbmciLCJjb252ZXJ0IiwiY291bnRkb3duIiwidGltZXIiLCJjYW5jZWwiLCJzZWNvbmRzIiwidG9TdHJpbmciLCJjb252ZXJzaW9uIiwiZmxvb3IiLCJpdGVtcyIsImxhYmVsIiwiYXV0aCIsImlzTG9nZ2VkSW4iLCJzZXRVc2VyIiwicmVtb3ZlVXNlciJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7QUFDQUEsT0FBQUMsR0FBQSxHQUFBQyxRQUFBQyxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLGFB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O0FBSUFrTzs7QUFFQXhQLHVCQUFBQyxHQUFBLENBQUFtQyxZQUFBUCxZQUFBLEVBQUEyTixPQUFBO0FBQ0F4UCx1QkFBQUMsR0FBQSxDQUFBbUMsWUFBQUwsYUFBQSxFQUFBME4sVUFBQTtBQUNBelAsdUJBQUFDLEdBQUEsQ0FBQW1DLFlBQUFKLGNBQUEsRUFBQXlOLFVBQUE7QUFFQTs7QUF2Q0EsS0FBQTtBQTJDQSxDQTdDQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xud2luZG93LmFwcCA9IGFuZ3VsYXIubW9kdWxlKCdGdWxsc3RhY2tHZW5lcmF0ZWRBcHAnLCBbJ2ZzYVByZUJ1aWx0JywgJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnbmdBbmltYXRlJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG4gICAgLy8gVHJpZ2dlciBwYWdlIHJlZnJlc2ggd2hlbiBhY2Nlc3NpbmcgYW4gT0F1dGggcm91dGVcbiAgICAkdXJsUm91dGVyUHJvdmlkZXIud2hlbignL2F1dGgvOnByb3ZpZGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgfSk7XG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBsaXN0ZW5pbmcgdG8gZXJyb3JzIGJyb2FkY2FzdGVkIGJ5IHVpLXJvdXRlciwgdXN1YWxseSBvcmlnaW5hdGluZyBmcm9tIHJlc29sdmVzXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlKSB7XG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZUVycm9yJywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcywgZnJvbVN0YXRlLCBmcm9tUGFyYW1zLCB0aHJvd25FcnJvcikge1xuICAgICAgICBjb25zb2xlLmluZm8oYFRoZSBmb2xsb3dpbmcgZXJyb3Igd2FzIHRocm93biBieSB1aS1yb3V0ZXIgd2hpbGUgdHJhbnNpdGlvbmluZyB0byBzdGF0ZSBcIiR7dG9TdGF0ZS5uYW1lfVwiLiBUaGUgb3JpZ2luIG9mIHRoaXMgZXJyb3IgaXMgcHJvYmFibHkgYSByZXNvbHZlIGZ1bmN0aW9uOmApO1xuICAgICAgICBjb25zb2xlLmVycm9yKHRocm93bkVycm9yKTtcbiAgICB9KTtcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxuICAgIHZhciBkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xuICAgIH07XG5cbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMpIHtcblxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHVzZXIgaXMgcmV0cmlldmVkLCB0aGVuIHJlbmF2aWdhdGUgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXG4gICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59KTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBIb3BlIHlvdSBkaWRuJ3QgZm9yZ2V0IEFuZ3VsYXIhIER1aC1kb3kuXG4gICAgaWYgKCF3aW5kb3cuYW5ndWxhcikgdGhyb3cgbmV3IEVycm9yKCdJIGNhblxcJ3QgZmluZCBBbmd1bGFyIScpO1xuXG4gICAgdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdmc2FQcmVCdWlsdCcsIFtdKTtcblxuICAgIGFwcC5mYWN0b3J5KCdTb2NrZXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghd2luZG93LmlvKSB0aHJvdyBuZXcgRXJyb3IoJ3NvY2tldC5pbyBub3QgZm91bmQhJyk7XG4gICAgICAgIHJldHVybiB3aW5kb3cuaW8od2luZG93LmxvY2F0aW9uLm9yaWdpbik7XG4gICAgfSk7XG5cbiAgICAvLyBBVVRIX0VWRU5UUyBpcyB1c2VkIHRocm91Z2hvdXQgb3VyIGFwcCB0b1xuICAgIC8vIGJyb2FkY2FzdCBhbmQgbGlzdGVuIGZyb20gYW5kIHRvIHRoZSAkcm9vdFNjb3BlXG4gICAgLy8gZm9yIGltcG9ydGFudCBldmVudHMgYWJvdXQgYXV0aGVudGljYXRpb24gZmxvdy5cbiAgICBhcHAuY29uc3RhbnQoJ0FVVEhfRVZFTlRTJywge1xuICAgICAgICBsb2dpblN1Y2Nlc3M6ICdhdXRoLWxvZ2luLXN1Y2Nlc3MnLFxuICAgICAgICBsb2dpbkZhaWxlZDogJ2F1dGgtbG9naW4tZmFpbGVkJyxcbiAgICAgICAgbG9nb3V0U3VjY2VzczogJ2F1dGgtbG9nb3V0LXN1Y2Nlc3MnLFxuICAgICAgICBzZXNzaW9uVGltZW91dDogJ2F1dGgtc2Vzc2lvbi10aW1lb3V0JyxcbiAgICAgICAgbm90QXV0aGVudGljYXRlZDogJ2F1dGgtbm90LWF1dGhlbnRpY2F0ZWQnLFxuICAgICAgICBub3RBdXRob3JpemVkOiAnYXV0aC1ub3QtYXV0aG9yaXplZCdcbiAgICB9KTtcblxuICAgIGFwcC5mYWN0b3J5KCdBdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsIEFVVEhfRVZFTlRTKSB7XG4gICAgICAgIHZhciBzdGF0dXNEaWN0ID0ge1xuICAgICAgICAgICAgNDAxOiBBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLFxuICAgICAgICAgICAgNDAzOiBBVVRIX0VWRU5UUy5ub3RBdXRob3JpemVkLFxuICAgICAgICAgICAgNDE5OiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCxcbiAgICAgICAgICAgIDQ0MDogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXRcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChzdGF0dXNEaWN0W3Jlc3BvbnNlLnN0YXR1c10sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSkge1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgdXNlciA9IHJlc3BvbnNlLmRhdGEudXNlcjtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKHVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XG4gICAgICAgICAgICByZXR1cm4gdXNlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZXMgdGhlIHNlc3Npb24gZmFjdG9yeSB0byBzZWUgaWYgYW5cbiAgICAgICAgLy8gYXV0aGVudGljYXRlZCB1c2VyIGlzIGN1cnJlbnRseSByZWdpc3RlcmVkLlxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhIVNlc3Npb24udXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldExvZ2dlZEluVXNlciA9IGZ1bmN0aW9uIChmcm9tU2VydmVyKSB7XG5cbiAgICAgICAgICAgIC8vIElmIGFuIGF1dGhlbnRpY2F0ZWQgc2Vzc2lvbiBleGlzdHMsIHdlXG4gICAgICAgICAgICAvLyByZXR1cm4gdGhlIHVzZXIgYXR0YWNoZWQgdG8gdGhhdCBzZXNzaW9uXG4gICAgICAgICAgICAvLyB3aXRoIGEgcHJvbWlzZS4gVGhpcyBlbnN1cmVzIHRoYXQgd2UgY2FuXG4gICAgICAgICAgICAvLyBhbHdheXMgaW50ZXJmYWNlIHdpdGggdGhpcyBtZXRob2QgYXN5bmNocm9ub3VzbHkuXG5cbiAgICAgICAgICAgIC8vIE9wdGlvbmFsbHksIGlmIHRydWUgaXMgZ2l2ZW4gYXMgdGhlIGZyb21TZXJ2ZXIgcGFyYW1ldGVyLFxuICAgICAgICAgICAgLy8gdGhlbiB0aGlzIGNhY2hlZCB2YWx1ZSB3aWxsIG5vdCBiZSB1c2VkLlxuXG4gICAgICAgICAgICBpZiAodGhpcy5pc0F1dGhlbnRpY2F0ZWQoKSAmJiBmcm9tU2VydmVyICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4oU2Vzc2lvbi51c2VyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFrZSByZXF1ZXN0IEdFVCAvc2Vzc2lvbi5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIDQwMSByZXNwb25zZSwgd2UgY2F0Y2ggaXQgYW5kIGluc3RlYWQgcmVzb2x2ZSB0byBudWxsLlxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKS50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9naW4gPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbihvblN1Y2Nlc3NmdWxMb2dpbilcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHsgbWVzc2FnZTogJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJyB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9sb2dvdXQnKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBTZXNzaW9uLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9nb3V0U3VjY2Vzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcblxuICAgICAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSB1c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IG51bGw7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxufSgpKTtcbiIsImFwcC5jb250cm9sbGVyKCdIb21lQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlLCAkbG9jYXRpb24pe1xuICAkc2NvcGUuZW50ZXJMb2JieSA9IGZ1bmN0aW9uKCl7XG4gICAgJHN0YXRlLmdvKCdsb2JieScsIHtyZWxvYWQ6IHRydWV9KTtcbiAgfVxufSk7XG5cbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUnLCB7XG4gICAgICAgIHVybDogJy8nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJ1xuICAgIH0pO1xufSk7XG5cbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnR2FtZScsIHtcbiAgICAgICAgdXJsOiAnL2dhbWUvOnJvb21uYW1lJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9nYW1lLXN0YXRlL3BhZ2UuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6IFwiR2FtZUN0cmxcIixcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuXG5cbmFwcC5jb250cm9sbGVyKCdHYW1lQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgQm9hcmRGYWN0b3J5LCBTb2NrZXQsICRzdGF0ZVBhcmFtcywgQXV0aFNlcnZpY2UsICRzdGF0ZSwgTG9iYnlGYWN0b3J5LCAkcm9vdFNjb3BlLCAkcSkge1xuXG4gICAgJHNjb3BlLnJvb21OYW1lID0gJHN0YXRlUGFyYW1zLnJvb21uYW1lO1xuICAgICRzY29wZS5oaWRlU3RhcnQgPSB0cnVlO1xuXG4gICAgJHNjb3BlLm90aGVyUGxheWVycyA9IFtdO1xuXG4gICAgJHNjb3BlLmdhbWVMZW5ndGggPSAxNTA7XG5cbiAgICAkc2NvcGUuZXhwb3J0cyA9IHtcbiAgICAgICAgd29yZE9iajoge30sXG4gICAgICAgIHdvcmQ6IFwiXCIsXG4gICAgICAgIHBsYXllcklkOiBudWxsLFxuICAgICAgICBzdGF0ZU51bWJlcjogMCxcbiAgICAgICAgcG9pbnRzRWFybmVkOiBudWxsXG4gICAgfTtcblxuICAgICRzY29wZS5tb3VzZUlzRG93biA9IGZhbHNlO1xuICAgICRzY29wZS5kcmFnZ2luZ0FsbG93ZWQgPSBmYWxzZTtcbiAgICAkc2NvcGUuc3R5bGUgPSBudWxsO1xuICAgICRzY29wZS5tZXNzYWdlID0gJyc7XG4gICAgJHNjb3BlLmZyZWV6ZSA9IGZhbHNlO1xuICAgICRzY29wZS53aW5Pckxvc2UgPSBudWxsO1xuICAgICRzY29wZS50aW1lb3V0ID0gbnVsbDtcblxuICAgICRyb290U2NvcGUuaGlkZU5hdmJhciA9IHRydWU7XG5cbiAgICAkc2NvcGUuY2hlY2tTZWxlY3RlZCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIHJldHVybiBpZCBpbiAkc2NvcGUuZXhwb3J0cy53b3JkT2JqO1xuICAgIH07XG5cbiAgICAkc2NvcGUudG9nZ2xlRHJhZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkID0gISRzY29wZS5kcmFnZ2luZ0FsbG93ZWQ7XG4gICAgfTtcblxuICAgICRzY29wZS5tb3VzZURvd24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLm1vdXNlSXNEb3duID0gdHJ1ZTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm1vdXNlVXAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLm1vdXNlSXNEb3duID0gZmFsc2U7XG4gICAgICAgIGlmICgkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkICYmICRzY29wZS5leHBvcnRzLndvcmQubGVuZ3RoID4gMSkgJHNjb3BlLnN1Ym1pdCgkc2NvcGUuZXhwb3J0cyk7XG4gICAgfTtcblxuICAgICRzY29wZS5kcmFnID0gZnVuY3Rpb24oc3BhY2UsIGlkKSB7XG4gICAgICAgIGlmICgkc2NvcGUubW91c2VJc0Rvd24gJiYgJHNjb3BlLmRyYWdnaW5nQWxsb3dlZCkge1xuICAgICAgICAgICAgJHNjb3BlLmNsaWNrKHNwYWNlLCBpZCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmhpZGVCb2FyZCA9IHRydWU7XG5cbiAgICAvLyBTdGFydCB0aGUgZ2FtZSB3aGVuIGFsbCBwbGF5ZXJzIGhhdmUgam9pbmVkIHJvb21cbiAgICAkc2NvcGUuc3RhcnRHYW1lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB1c2VySWRzID0gJHNjb3BlLm90aGVyUGxheWVycy5tYXAodXNlciA9PiB1c2VyLmlkKTtcbiAgICAgICAgdXNlcklkcy5wdXNoKCRzY29wZS51c2VyLmlkKTtcbiAgICAgICAgY29uc29sZS5sb2coJ29wJywgJHNjb3BlLm90aGVyUGxheWVycywgJ3VpJywgdXNlcklkcyk7XG4gICAgICAgICRzY29wZS53aW5Pckxvc2U9bnVsbDtcbiAgICAgICAgQm9hcmRGYWN0b3J5LmdldFN0YXJ0Qm9hcmQoJHNjb3BlLmdhbWVMZW5ndGgsICRzY29wZS5nYW1lSWQsIHVzZXJJZHMpO1xuICAgIH07XG5cblxuICAgIC8vUXVpdCB0aGUgcm9vbSwgYmFjayB0byBsb2JieVxuICAgICRzY29wZS5xdWl0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRyb290U2NvcGUuaGlkZU5hdmJhciA9IGZhbHNlO1xuICAgICAgICAkc3RhdGUuZ28oJ2xvYmJ5JylcbiAgICB9O1xuXG5cbiAgICAkc2NvcGUuYm9hcmQgPSBbXG4gICAgICAgIFsnYicsICdhJywgJ2QnLCAnZScsICdhJywgJ3InXSxcbiAgICAgICAgWydlJywgJ2YnLCAnZycsICdsJywgJ20nLCAnZSddLFxuICAgICAgICBbJ2gnLCAnaScsICdqJywgJ2YnLCAnbycsICdhJ10sXG4gICAgICAgIFsnYycsICdhJywgJ2QnLCAnZScsICdhJywgJ3InXSxcbiAgICAgICAgWydlJywgJ2YnLCAnZycsICdsJywgJ2QnLCAnZSddLFxuICAgICAgICBbJ2gnLCAnaScsICdqJywgJ2YnLCAnbycsICdhJ11cbiAgICBdO1xuXG4gICAgJHNjb3BlLm1lc3NhZ2VzID0gbnVsbDtcblxuICAgICRzY29wZS5zaXplID0gMztcbiAgICAkc2NvcGUuc2NvcmUgPSAwO1xuXG5cbiAgICAkc2NvcGUuY2xpY2sgPSBmdW5jdGlvbihzcGFjZSwgaWQpIHtcbiAgICAgICAgaWYgKCRzY29wZS5mcmVlemUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZygnY2xpY2tlZCAnLCBzcGFjZSwgaWQpO1xuICAgICAgICB2YXIgbHRyc1NlbGVjdGVkID0gT2JqZWN0LmtleXMoJHNjb3BlLmV4cG9ydHMud29yZE9iaik7XG4gICAgICAgIHZhciBwcmV2aW91c0x0ciA9IGx0cnNTZWxlY3RlZFtsdHJzU2VsZWN0ZWQubGVuZ3RoIC0gMl07XG4gICAgICAgIHZhciBsYXN0THRyID0gbHRyc1NlbGVjdGVkW2x0cnNTZWxlY3RlZC5sZW5ndGggLSAxXTtcbiAgICAgICAgaWYgKCFsdHJzU2VsZWN0ZWQubGVuZ3RoIHx8IHZhbGlkU2VsZWN0KGlkLCBsdHJzU2VsZWN0ZWQpKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkICs9IHNwYWNlO1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZE9ialtpZF0gPSBzcGFjZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCRzY29wZS5leHBvcnRzKTtcbiAgICAgICAgfSBlbHNlIGlmIChpZCA9PT0gcHJldmlvdXNMdHIpIHtcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLndvcmQgPSAkc2NvcGUuZXhwb3J0cy53b3JkLnN1YnN0cmluZygwLCAkc2NvcGUuZXhwb3J0cy53b3JkLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgZGVsZXRlICRzY29wZS5leHBvcnRzLndvcmRPYmpbbGFzdEx0cl07XG4gICAgICAgIH0gZWxzZSBpZiAobHRyc1NlbGVjdGVkLmxlbmd0aCA9PT0gMSAmJiBpZCA9PT0gbGFzdEx0cikge1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZCA9IFwiXCI7XG4gICAgICAgICAgICBkZWxldGUgJHNjb3BlLmV4cG9ydHMud29yZE9ialtsYXN0THRyXTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvL21ha2VzIHN1cmUgbGV0dGVyIGlzIGFkamFjZW50IHRvIHByZXYgbHRyLCBhbmQgaGFzbid0IGJlZW4gdXNlZCB5ZXRcbiAgICBmdW5jdGlvbiB2YWxpZFNlbGVjdChsdHJJZCwgb3RoZXJMdHJzSWRzKSB7XG4gICAgICAgIGlmIChvdGhlckx0cnNJZHMuaW5jbHVkZXMobHRySWQpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHZhciBjb29yZHMgPSBsdHJJZC5zcGxpdCgnLScpO1xuICAgICAgICB2YXIgcm93ID0gY29vcmRzWzBdO1xuICAgICAgICB2YXIgY29sID0gY29vcmRzWzFdO1xuICAgICAgICB2YXIgbGFzdEx0cklkID0gb3RoZXJMdHJzSWRzLnBvcCgpO1xuICAgICAgICB2YXIgY29vcmRzTGFzdCA9IGxhc3RMdHJJZC5zcGxpdCgnLScpO1xuICAgICAgICB2YXIgcm93TGFzdCA9IGNvb3Jkc0xhc3RbMF07XG4gICAgICAgIHZhciBjb2xMYXN0ID0gY29vcmRzTGFzdFsxXTtcbiAgICAgICAgdmFyIHJvd09mZnNldCA9IE1hdGguYWJzKHJvdyAtIHJvd0xhc3QpO1xuICAgICAgICB2YXIgY29sT2Zmc2V0ID0gTWF0aC5hYnMoY29sIC0gY29sTGFzdCk7XG4gICAgICAgIHJldHVybiAocm93T2Zmc2V0IDw9IDEgJiYgY29sT2Zmc2V0IDw9IDEpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsZWFySWZDb25mbGljdGluZyh1cGRhdGVXb3JkT2JqLCBleHBvcnRXb3JkT2JqKSB7XG4gICAgICAgIHZhciB0aWxlc01vdmVkID0gT2JqZWN0LmtleXModXBkYXRlV29yZE9iaik7XG4gICAgICAgIHZhciBteVdvcmRUaWxlcyA9IE9iamVjdC5rZXlzKGV4cG9ydFdvcmRPYmopO1xuICAgICAgICBpZiAodGlsZXNNb3ZlZC5zb21lKGNvb3JkID0+IG15V29yZFRpbGVzLmluY2x1ZGVzKGNvb3JkKSkpICRzY29wZS5jbGVhcigpO1xuICAgIH1cblxuICAgICRzY29wZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkID0gXCJcIjtcbiAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZE9iaiA9IHt9O1xuICAgIH07XG5cblxuICAgICRzY29wZS5zdWJtaXQgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3N1Ym1pdHRpbmcgJywgb2JqKTtcbiAgICAgICAgQm9hcmRGYWN0b3J5LnN1Ym1pdChvYmopO1xuICAgICAgICAkc2NvcGUuY2xlYXIoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNodWZmbGUgPSBCb2FyZEZhY3Rvcnkuc2h1ZmZsZTtcblxuXG4gICAgJHNjb3BlLnVwZGF0ZUJvYXJkID0gZnVuY3Rpb24od29yZE9iaikge1xuICAgICAgICBjb25zb2xlLmxvZygnc2NvcGUuYm9hcmQnLCAkc2NvcGUuYm9hcmQpO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gd29yZE9iaikge1xuICAgICAgICAgICAgdmFyIGNvb3JkcyA9IGtleS5zcGxpdCgnLScpO1xuICAgICAgICAgICAgdmFyIHJvdyA9IGNvb3Jkc1swXTtcbiAgICAgICAgICAgIHZhciBjb2wgPSBjb29yZHNbMV07XG4gICAgICAgICAgICAkc2NvcGUuYm9hcmRbcm93XVtjb2xdID0gd29yZE9ialtrZXldO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS51cGRhdGVTY29yZSA9IGZ1bmN0aW9uKHBvaW50cywgcGxheWVySWQpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3VwZGF0ZSBzY29yZSBwb2ludHMnLCBwb2ludHMpO1xuICAgICAgICBpZiAocGxheWVySWQgPT09ICRzY29wZS51c2VyLmlkKSB7XG4gICAgICAgICAgICAkc2NvcGUuc2NvcmUgKz0gcG9pbnRzO1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMucG9pbnRzRWFybmVkID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIHBsYXllciBpbiAkc2NvcGUub3RoZXJQbGF5ZXJzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCRzY29wZS5vdGhlclBsYXllcnNbcGxheWVyXS5pZCA9PT0gcGxheWVySWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVyc1twbGF5ZXJdLnNjb3JlICs9IHBvaW50cztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMucG9pbnRzRWFybmVkID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgICRzY29wZS51cGRhdGUgPSBmdW5jdGlvbih1cGRhdGVPYmopIHtcbiAgICAgICAgJHNjb3BlLnVwZGF0ZVNjb3JlKHVwZGF0ZU9iai5wb2ludHNFYXJuZWQsIHVwZGF0ZU9iai5wbGF5ZXJJZCk7XG4gICAgICAgICRzY29wZS51cGRhdGVCb2FyZCh1cGRhdGVPYmoud29yZE9iaik7XG4gICAgICAgIGlmICgrJHNjb3BlLnVzZXIuaWQgPT09ICt1cGRhdGVPYmoucGxheWVySWQpIHtcbiAgICAgICAgICAgIHZhciBwbGF5ZXIgPSAkc2NvcGUudXNlci51c2VybmFtZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiAkc2NvcGUub3RoZXJQbGF5ZXJzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCskc2NvcGUub3RoZXJQbGF5ZXJzW2tleV0uaWQgPT09ICt1cGRhdGVPYmoucGxheWVySWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBsYXllciA9ICRzY29wZS5vdGhlclBsYXllcnNba2V5XS51c2VybmFtZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICRzY29wZS5tZXNzYWdlID0gcGxheWVyICsgXCIgcGxheWVkIFwiICsgdXBkYXRlT2JqLndvcmQgKyBcIiBmb3IgXCIgKyB1cGRhdGVPYmoucG9pbnRzRWFybmVkICsgXCIgcG9pbnRzIVwiO1xuICAgICAgICBpZiAoJHNjb3BlLnRpbWVvdXQpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCgkc2NvcGUudGltZW91dCk7XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHNjb3BlLm1lc3NhZ2UgPSAnJztcbiAgICAgICAgfSwgMzAwMClcbiAgICAgICAgY29uc29sZS5sb2coJ2l0cyB1cGRhdGluZyEnKTtcbiAgICAgICAgY2xlYXJJZkNvbmZsaWN0aW5nKHVwZGF0ZU9iaiwgJHNjb3BlLmV4cG9ydHMud29yZE9iaik7XG4gICAgICAgICRzY29wZS5leHBvcnRzLnN0YXRlTnVtYmVyID0gdXBkYXRlT2JqLnN0YXRlTnVtYmVyO1xuICAgICAgICBjb25zb2xlLmxvZygndXBkYXRlZCBvYmonLCB1cGRhdGVPYmopXG4gICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5yZXBsYXkgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgTG9iYnlGYWN0b3J5Lm5ld0dhbWUoeyByb29tbmFtZTogJHNjb3BlLnJvb21OYW1lIH0pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihnYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZXBsYXkgZ2FtZSBvYmo6XCIsIGdhbWUpO1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLmdhbWVJZCA9IGdhbWUuaWQ7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnN0YXJ0R2FtZSgpO1xuICAgICAgICAgICAgICAgIHZhciBhbGxJZHMgPSAkc2NvcGUub3RoZXJQbGF5ZXJzLm1hcChwbGF5ZXIgPT4gcGxheWVyLmlkKTtcbiAgICAgICAgICAgICAgICBhbGxJZHMucHVzaCgkc2NvcGUudXNlci5pZCk7XG4gICAgICAgICAgICAgICAgJHEuYWxsKGFsbElkcy5tYXAoaWQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBMb2JieUZhY3Rvcnkuam9pbkdhbWUoJHNjb3BlLmdhbWVJZCwgaWQpO1xuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2Vycm9yIHJlc3RhcnRpbmcgdGhlIGdhbWUnLCBlKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZGV0ZXJtaW5lV2lubmVyID0gZnVuY3Rpb24od2lubmVyc0FycmF5KSB7XG4gICAgICAgIGlmICh3aW5uZXJzQXJyYXkubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICBpZiAoK3dpbm5lcnNBcnJheVswXSA9PT0gKyRzY29wZS51c2VyLmlkKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLndpbk9yTG9zZSA9IFwiQ29uZ3JhdHVsYXRpb24hIFlvdSBhcmUgYSB3b3JkIHdpemFyZCEgWW91IHdvbiEhIVwiO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBwbGF5ZXIgaW4gJHNjb3BlLm90aGVyUGxheWVycykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKyRzY29wZS5vdGhlclBsYXllcnNbcGxheWVyXS5pZCA9PT0gK3dpbm5lcnNBcnJheVswXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHdpbm5lciA9ICRzY29wZS5vdGhlclBsYXllcnNbcGxheWVyXS51c2VybmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS53aW5Pckxvc2UgPSBcIlRvdWdoIGx1Y2suIFwiICsgd2lubmVyICsgXCIgaGFzIGJlYXRlbiB5b3UuIEJldHRlciBMdWNrIG5leHQgdGltZS4gOihcIlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IHdpbm5lcnMgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgaW4gd2lubmVyc0FycmF5KSB7XG4gICAgICAgICAgICAgICAgaWYgKCt3aW5uZXJzQXJyYXlbaV0gPT09ICskc2NvcGUudXNlci5pZCkgeyB3aW5uZXJzLnB1c2goJHNjb3BlLnVzZXIudXNlcm5hbWUpOyB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBwbGF5ZXIgaW4gJHNjb3BlLm90aGVyUGxheWVycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS5vdGhlclBsYXllcnNbcGxheWVyXS5pZCA9PSB3aW5uZXJzQXJyYXlbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5uZXJzLnB1c2goJHNjb3BlLm90aGVyUGxheWVyc1twbGF5ZXJdLnVzZXJuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh3aW5uZXJzKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUud2luT3JMb3NlID0gXCJUaGUgZ2FtZSB3YXMgYSB0aWUgYmV0d2VlbiBcIjtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHdpbm5lcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPT09IHdpbm5lcnMubGVuZ3RoIC0gMSkgeyAkc2NvcGUud2luT3JMb3NlICs9IFwiYW5kIFwiICsgd2lubmVyc1tpXSArIFwiLlwiOyB9IGVsc2UgeyAkc2NvcGUud2luT3JMb3NlICs9IHdpbm5lcnNbaV0gKyBcIiwgXCI7IH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIFNvY2tldC5lbWl0KCdsZWF2ZVJvb20nKSA7XG4gICAgfSk7XG5cbiAgICAvLyBTb2NrZXQub24oJ2Nvbm5lY3QnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2Nvbm5lY3RpbmcnKTtcbiAgICAgICAgJHEuYWxsKFtcbiAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3VzZXIgZnJvbSBBdXRoU2VydmljZScsIHVzZXIpO1xuICAgICAgICAgICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy5wbGF5ZXJJZCA9IHVzZXIuaWQ7XG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgLy9nZXQgdGhlIGN1cnJlbnQgcm9vbSBpbmZvXG4gICAgICAgICAgICBCb2FyZEZhY3RvcnkuZ2V0Q3VycmVudFJvb20oJHN0YXRlUGFyYW1zLnJvb21uYW1lKVxuICAgICAgICAgICAgLnRoZW4ocm9vbSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cocm9vbSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmdhbWVJZCA9IHJvb20uaWQ7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVycyA9IHJvb20udXNlcnMuZmlsdGVyKHVzZXIgPT4gdXNlci5pZCAhPT0gJHNjb3BlLnVzZXIuaWQpO1xuICAgICAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMuZm9yRWFjaChwbGF5ZXIgPT4geyBwbGF5ZXIuc2NvcmUgPSAwIH0pO1xuICAgICAgICAgICAgICAgIExvYmJ5RmFjdG9yeS5qb2luR2FtZShyb29tLmlkLCAkc2NvcGUudXNlci5pZCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICBdKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgU29ja2V0LmVtaXQoJ2pvaW5Sb29tJywgJHNjb3BlLnVzZXIsICRzY29wZS5yb29tTmFtZSwgJHNjb3BlLmdhbWVJZCk7XG4gICAgICAgICAgICAkc2NvcGUuaGlkZVN0YXJ0ID0gZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2VtaXR0aW5nIFwiam9pbiByb29tXCIgZXZlbnQgdG8gc2VydmVyIDhQJywgJHNjb3BlLnJvb21OYW1lKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignZXJyb3IgZ3JhYmJpbmcgdXNlciBvciByb29tIGZyb20gZGI6ICcsIGUpO1xuICAgICAgICB9KTtcblxuXG4gICAgICAgIFNvY2tldC5vbigncm9vbUpvaW5TdWNjZXNzJywgZnVuY3Rpb24odXNlcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ25ldyB1c2VyIGpvaW5pbmcnLCB1c2VyLmlkKTtcbiAgICAgICAgICAgIHVzZXIuc2NvcmUgPSAwO1xuICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVycy5wdXNoKHVzZXIpO1xuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcblxuICAgICAgICB9KTtcblxuICAgICAgICBTb2NrZXQub24oJ3N0YXJ0Qm9hcmQnLCBmdW5jdGlvbihib2FyZCkge1xuICAgICAgICAgICAgJHNjb3BlLmZyZWV6ZSA9IGZhbHNlO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2JvYXJkISAnLCBib2FyZCk7XG4gICAgICAgICAgICAkc2NvcGUuYm9hcmQgPSBib2FyZDtcbiAgICAgICAgICAgIC8vIHNldEludGVydmFsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzLmZvckVhY2gocGxheWVyID0+IHsgcGxheWVyLnNjb3JlID0gMCB9KTtcbiAgICAgICAgICAgICRzY29wZS5zY29yZSA9IDA7XG4gICAgICAgICAgICAkc2NvcGUuaGlkZUJvYXJkID0gZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUubWVzc2FnZSA9ICcnO1xuICAgICAgICAgICAgJHNjb3BlLndpbk9yTG9zZSA9IG51bGw7XG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgICAgICAgICAgLy8gfSwgMzAwMCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIFNvY2tldC5vbignd29yZFZhbGlkYXRlZCcsIGZ1bmN0aW9uKHVwZGF0ZU9iaikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3dvcmQgaXMgdmFsaWRhdGVkJyk7XG4gICAgICAgICAgICAkc2NvcGUudXBkYXRlKHVwZGF0ZU9iaik7XG4gICAgICAgICAgICAkc2NvcGUubGFzdFdvcmRQbGF5ZWQgPSB1cGRhdGVPYmoud29yZDtcbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIFNvY2tldC5vbignYm9hcmRTaHVmZmxlZCcsIGZ1bmN0aW9uKGJvYXJkLCB1c2VySWQsIHN0YXRlTnVtYmVyKSB7XG4gICAgICAgICAgICAkc2NvcGUuYm9hcmQgPSBib2FyZDtcbiAgICAgICAgICAgICRzY29wZS51cGRhdGVTY29yZSgtNSwgdXNlcklkKTtcbiAgICAgICAgICAgICRzY29wZS5jbGVhcigpO1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMuc3RhdGVOdW1iZXIgPSBzdGF0ZU51bWJlcjtcbiAgICAgICAgICAgICRzY29wZS5tZXNzYWdlID0gdXNlcklkICsgXCIgc2h1ZmZsZWQgdGhlIGJvYXJkIVwiO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJHNjb3BlLm1lc3NhZ2UpO1xuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCdwbGF5ZXJEaXNjb25uZWN0ZWQnLCBmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygncGxheWVyRGlzY29ubmVjdGVkJywgdXNlci5pZCk7XG4gICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzID0gJHNjb3BlLm90aGVyUGxheWVycy5maWx0ZXIob3RoZXJQbGF5ZXIgPT4gb3RoZXJQbGF5ZXIuaWQgIT09IHVzZXIuaWQpO1xuXG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICBTb2NrZXQub24oJ2dhbWVPdmVyJywgZnVuY3Rpb24od2lubmVyc0FycmF5KSB7XG4gICAgICAgICAgICAkc2NvcGUuY2xlYXIoKTtcbiAgICAgICAgICAgICRzY29wZS5mcmVlemUgPSB0cnVlO1xuICAgICAgICAgICAgJHNjb3BlLmRldGVybWluZVdpbm5lcih3aW5uZXJzQXJyYXkpO1xuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnYW1lIGlzIG92ZXIsIHdpbm5lcnM6ICcsIHdpbm5lcnNBcnJheSk7XG4gICAgICAgIH0pO1xuICAgIC8vIH0pO1xufSk7XG4iLCJhcHAuZmFjdG9yeSAoXCJCb2FyZEZhY3RvcnlcIiwgZnVuY3Rpb24oJGh0dHAsIFNvY2tldCl7XG5cdHJldHVybntcblx0XHRnZXRTdGFydEJvYXJkOiBmdW5jdGlvbihnYW1lTGVuZ3RoLCBnYW1lSWQsIHVzZXJJZHMpe1xuXHRcdFx0Y29uc29sZS5sb2coJ2ZhY3RvcnkuIGdsOiAnLCBnYW1lTGVuZ3RoKTtcblx0XHRcdFNvY2tldC5lbWl0KCdnZXRTdGFydEJvYXJkJywgZ2FtZUxlbmd0aCwgZ2FtZUlkLCB1c2VySWRzKTtcblx0XHR9LFxuXG5cdFx0c3VibWl0OiBmdW5jdGlvbihvYmope1xuXHRcdFx0U29ja2V0LmVtaXQoJ3N1Ym1pdFdvcmQnLCBvYmopO1xuXHRcdH0sXG5cblx0XHRzaHVmZmxlOiBmdW5jdGlvbih1c2VyKXtcblx0XHRcdGNvbnNvbGUubG9nKCdncmlkZmFjdG9yeSB1Jyx1c2VyLmlkKTtcblx0XHRcdFNvY2tldC5lbWl0KCdzaHVmZmxlQm9hcmQnLHVzZXIuaWQpO1xuXHRcdH0sXG5cblx0XHQvLyBmaW5kQWxsT3RoZXJVc2VyczogZnVuY3Rpb24oZ2FtZSkge1xuXHRcdC8vIFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS9nYW1lcy8nKyBnYW1lLmlkKVxuXHRcdC8vIFx0LnRoZW4ocmVzID0+IHJlcy5kYXRhKVxuXHRcdC8vIH0sXG5cblx0XHRnZXRDdXJyZW50Um9vbTogZnVuY3Rpb24ocm9vbW5hbWUpIHtcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvZ2FtZXMvcm9vbXMvJytyb29tbmFtZSlcblx0XHRcdC50aGVuKHJlcyA9PiByZXMuZGF0YSlcblx0XHR9LFxuXG5cdFx0cXVpdEZyb21Sb29tOiBmdW5jdGlvbihnYW1lSWQsIHVzZXJJZCkge1xuXHRcdFx0Ly8gU29ja2V0LmVtaXQoJ2Rpc2Nvbm5lY3QnLCByb29tTmFtZSwgdXNlcklkKTtcblx0XHRcdHJldHVybiAkaHR0cC5kZWxldGUoJy9hcGkvZ2FtZXMvJytnYW1lSWQrJy8nK3VzZXJJZClcblx0XHR9XG5cdH1cbn0pO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ0xlYWRlckJvYXJkQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgTGVhZGVyQm9hcmRGYWN0b3J5LCAkc3RhdGUsIEF1dGhTZXJ2aWNlKSB7XG4gICAgY29uc29sZS5sb2coJyAxJylcbiAgICBMZWFkZXJCb2FyZEZhY3RvcnkuQWxsUGxheWVycygpXG4gICAgLnRoZW4ocGxheWVycyA9PiB7XG4gICAgICAgIHBsYXllcnMuZm9yRWFjaChwbGF5ZXIgPT4ge1xuICAgICAgICAgICAgaWYgKHBsYXllci5nYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNjb3JlcyA9IHBsYXllci5nYW1lcy5tYXAoZ2FtZSA9PiBnYW1lLnVzZXJHYW1lLnNjb3JlKVxuICAgICAgICAgICAgICAgIHBsYXllci5oaWdoZXN0U2NvcmUgPSBNYXRoLm1heCguLi5zY29yZXMpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBsYXllci5oaWdoZXN0U2NvcmUgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGxheWVyLmdhbWVzX3dvbiA9IHBsYXllci53aW5uZXIubGVuZ3RoO1xuICAgICAgICAgICAgcGxheWVyLmdhbWVzX3BsYXllZCA9IHBsYXllci5nYW1lcy5sZW5ndGg7XG4gICAgICAgICAgICBpZihwbGF5ZXIuZ2FtZXMubGVuZ3RoPT09MCl7XG4gICAgICAgICAgICBcdHBsYXllci53aW5fcGVyY2VudGFnZSA9IDAgKyAnJSdcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBcdHBsYXllci53aW5fcGVyY2VudGFnZSA9ICgocGxheWVyLndpbm5lci5sZW5ndGgvcGxheWVyLmdhbWVzLmxlbmd0aCkqMTAwKS50b0ZpeGVkKDApICsgJyUnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pXG4gICAgICAgICRzY29wZS5wbGF5ZXJzID0gcGxheWVycztcbiAgICB9KVxufSk7XG4iLCJhcHAuZmFjdG9yeSgnTGVhZGVyQm9hcmRGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG5cdHZhciBMZWFkZXJCb2FyZEZhY3RvcnkgPSB7fTtcblxuXHRMZWFkZXJCb2FyZEZhY3RvcnkuQWxsUGxheWVycyA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvdXNlcnMnKVxuXHRcdC50aGVuKHJlcz0+cmVzLmRhdGEpXG5cdH1cblxuXHRyZXR1cm4gTGVhZGVyQm9hcmRGYWN0b3J5O1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xlYWRlckJvYXJkJywge1xuICAgICAgICB1cmw6ICcvbGVhZGVyQm9hcmQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xlYWRlckJvYXJkL2xlYWRlckJvYXJkLnRlbXBsYXRlLmh0bWwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgIFx0YWxsUGxheWVyczogZnVuY3Rpb24oTGVhZGVyQm9hcmRGYWN0b3J5KSB7XG4gICAgICAgIFx0XHRyZXR1cm4gTGVhZGVyQm9hcmRGYWN0b3J5LkFsbFBsYXllcnM7XG4gICAgICAgIFx0fSxcbiAgICAgICAgICAgIFxuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiAnTGVhZGVyQm9hcmRDdHJsJ1xuICAgIH0pO1xuXG59KTsiLCJhcHAuY29udHJvbGxlcignTG9iYnlDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBMb2JieUZhY3RvcnksIHJvb21zLCAkc3RhdGUsIEF1dGhTZXJ2aWNlKSB7XG5cbiAgICAvLyBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKVxuICAgIC8vICAgICAudGhlbihmdW5jdGlvbih1c2VyKSB7XG4gICAgLy8gICAgICAgICAkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgLy8gICAgIH0pO1xuXG4gICAgJHNjb3BlLnJvb21zID0gcm9vbXM7XG4gICAgJHNjb3BlLnJvb21OYW1lRm9ybSA9IGZhbHNlO1xuICAgIC8vICRzY29wZS51c2VyID0ge1xuICAgIC8vICBpZDogM1xuICAgIC8vIH1cblxuICAgIC8vICRzY29wZS5qb2luR2FtZSA9IGZ1bmN0aW9uKHJvb20pIHtcbiAgICAvLyAgICAgY29uc29sZS5sb2coXCJpbSBjaGFuZ2luZyBzdGF0ZSBhbmQgcmVsb2FkaW5nXCIpO1xuICAgIC8vICAgICAkc3RhdGUuZ28oJ0dhbWUnLCB7IHJvb21uYW1lOiByb29tLnJvb21uYW1lIH0sIHsgcmVsb2FkOiB0cnVlLCBub3RpZnk6IHRydWUgfSlcbiAgICAvLyB9O1xuXG4gICAgJHNjb3BlLm5ld1Jvb20gPSBmdW5jdGlvbihyb29tSW5mbykge1xuICAgICAgICBMb2JieUZhY3RvcnkubmV3R2FtZShyb29tSW5mbyk7XG4gICAgICAgICRzY29wZS5yb29tTmFtZUZvcm0gPSBmYWxzZTtcbiAgICB9O1xuICAgICRzY29wZS5zaG93Rm9ybSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUucm9vbU5hbWVGb3JtID0gdHJ1ZTtcbiAgICB9O1xuXG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ2VudGVyTG9iYnknLCBmdW5jdGlvbigpe1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgdGVtcGxhdGVVcmw6ICdqcy9sb2JieS9sb2JieS1idXR0b24uaHRtbCcsXG4gICAgY29udHJvbGxlcjogJ0hvbWVDdHJsJ1xuICB9XG59KVxuIiwiYXBwLmZhY3RvcnkoJ0xvYmJ5RmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuXHR2YXIgTG9iYnlGYWN0b3J5ID0ge307XG5cdHZhciB0ZW1wUm9vbXMgPSBbXTsgLy93b3JrIHdpdGggc29ja2V0P1xuXG5cdExvYmJ5RmFjdG9yeS5nZXRBbGxSb29tcyA9IGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS9nYW1lcy9yb29tcycpXG5cdFx0LnRoZW4ocmVzID0+IHJlcy5kYXRhKVxuXHRcdC50aGVuKHJvb21zID0+IHtcblx0XHRcdGFuZ3VsYXIuY29weShyb29tcywgdGVtcFJvb21zKTtcblx0XHRcdHJldHVybiB0ZW1wUm9vbXM7XG5cdFx0fSlcblx0fTtcblxuXHRMb2JieUZhY3Rvcnkuam9pbkdhbWUgPSBmdW5jdGlvbihyb29tSWQsIHVzZXJJZCkge1xuICAgIGNvbnNvbGUubG9nKCdsb2JieSBmYWN0b3J5IGpvaW4gZ2FtZScpO1xuXHRcdHJldHVybiAkaHR0cC5wdXQoJy9hcGkvZ2FtZXMvJysgcm9vbUlkICsnL3BsYXllcicsIHtpZDogdXNlcklkfSlcblx0XHQudGhlbihyZXM9PnJlcy5kYXRhKVxuXHR9O1xuXG5cdExvYmJ5RmFjdG9yeS5uZXdHYW1lID0gZnVuY3Rpb24ocm9vbUluZm8pIHtcblx0XHRyZXR1cm4gJGh0dHAucHV0KCcvYXBpL2dhbWVzJywgcm9vbUluZm8pXG5cdFx0LnRoZW4ocmVzID0+IHJlcy5kYXRhKVxuXHQgXHQudGhlbihyb29tID0+IHtcblx0IFx0XHR0ZW1wUm9vbXMucHVzaChyb29tKTtcblx0IFx0XHRyZXR1cm4gcm9vbTtcblx0IFx0XHR9KTtcblx0fTtcblxuXHRMb2JieUZhY3RvcnkuQWxsUGxheWVycyA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvdXNlcnMnKVxuXHRcdC50aGVuKHJlcz0+cmVzLmRhdGEpXG5cdH07XG5cblx0cmV0dXJuIExvYmJ5RmFjdG9yeTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsb2JieScsIHtcbiAgICAgICAgdXJsOiAnL2xvYmJ5JyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2JieS9sb2JieS50ZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICBcdHJvb21zOiBmdW5jdGlvbihMb2JieUZhY3RvcnkpIHtcbiAgICAgICAgXHRcdHJldHVybiBMb2JieUZhY3RvcnkuZ2V0QWxsUm9vbXMoKTtcbiAgICAgICAgXHR9XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2JieUN0cmwnXG4gICAgfSk7XG5cbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbiAobG9naW5JbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ21lbWJlcnNPbmx5Jywge1xuICAgICAgICB1cmw6ICcvbWVtYmVycy1hcmVhJyxcbiAgICAgICAgdGVtcGxhdGU6ICc8aW1nIG5nLXJlcGVhdD1cIml0ZW0gaW4gc3Rhc2hcIiB3aWR0aD1cIjMwMFwiIG5nLXNyYz1cInt7IGl0ZW0gfX1cIiAvPicsXG4gICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUsIFNlY3JldFN0YXNoKSB7XG4gICAgICAgICAgICBTZWNyZXRTdGFzaC5nZXRTdGFzaCgpLnRoZW4oZnVuY3Rpb24gKHN0YXNoKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnN0YXNoID0gc3Rhc2g7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBkYXRhLmF1dGhlbnRpY2F0ZSBpcyByZWFkIGJ5IGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KTtcblxufSk7XG5cbmFwcC5mYWN0b3J5KCdTZWNyZXRTdGFzaCcsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG4gICAgdmFyIGdldFN0YXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL21lbWJlcnMvc2VjcmV0LXN0YXNoJykudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0U3Rhc2g6IGdldFN0YXNoXG4gICAgfTtcblxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdyYW5rRGlyZWN0aXZlJywgKCk9PiB7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdFJyxcblx0XHRzY29wZToge1xuXHRcdFx0cmFua05hbWU6ICdAJyxcblx0XHRcdHBsYXllcnM6ICc9Jyxcblx0XHRcdHJhbmtCeTogJ0AnLFxuXHRcdFx0b3JkZXI6ICdAJ1xuXHRcdH0sXG5cdFx0dGVtcGxhdGVVcmw6ICcvanMvcmFuay9yYW5rLnRlbXBsYXRlLmh0bWwnXG5cdH1cbn0pOyIsImFwcC5mYWN0b3J5KCdTaWdudXBGYWN0b3J5JywgZnVuY3Rpb24oJGh0dHAsICRzdGF0ZSwgQXV0aFNlcnZpY2UpIHtcblx0Y29uc3QgU2lnbnVwRmFjdG9yeSA9IHt9O1xuXG5cdFNpZ251cEZhY3RvcnkuY3JlYXRlVXNlciA9IGZ1bmN0aW9uKHNpZ251cEluZm8pIHtcblx0XHRjb25zb2xlLmxvZyhzaWdudXBJbmZvKVxuXHRcdHJldHVybiAkaHR0cC5wb3N0KCcvc2lnbnVwJywgc2lnbnVwSW5mbylcblx0XHQudGhlbihyZXMgPT4ge1xuXHRcdFx0aWYgKHJlcy5zdGF0dXMgPT09IDIwMSkge1xuXHRcdFx0XHRBdXRoU2VydmljZS5sb2dpbih7ZW1haWw6IHNpZ251cEluZm8uZW1haWwsIHBhc3N3b3JkOiBzaWdudXBJbmZvLnBhc3N3b3JkfSlcblx0XHRcdFx0LnRoZW4odXNlciA9PiB7XG5cdFx0XHRcdFx0JHN0YXRlLmdvKCdob21lJylcblx0XHRcdFx0fSlcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRocm93IEVycm9yKCdBbiBhY2NvdW50IHdpdGggdGhhdCBlbWFpbCBhbHJlYWR5IGV4aXN0cycpO1xuXHRcdFx0fVxuXHRcdH0pXG5cdH1cblxuXHRyZXR1cm4gU2lnbnVwRmFjdG9yeTtcbn0pIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzaWdudXAnLCB7XG4gICAgICAgIHVybDogJy9zaWdudXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3NpZ251cC9zaWdudXAuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTaWdudXBDdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ1NpZ251cEN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlLCBTaWdudXBGYWN0b3J5KSB7XG5cbiAgICAkc2NvcGUuc2lnbnVwID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kU2lnbnVwID0gZnVuY3Rpb24oc2lnbnVwSW5mbyl7XG4gICAgICAgIFNpZ251cEZhY3RvcnkuY3JlYXRlVXNlcihzaWdudXBJbmZvKVxuICAgICAgICAuY2F0Y2goKCkgPT4ge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0FuIGFjY291bnQgd2l0aCB0aGF0IGVtYWlsIGFscmVhZHkgZXhpc3RzJztcbiAgICAgICAgfSlcbiAgICB9XG4gICAgXG5cblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKXtcblx0JHN0YXRlUHJvdmlkZXIuc3RhdGUoXCJVc2VyUHJvZmlsZVwiLHtcblx0XHR1cmw6IFwiL3VzZXJzLzp1c2VySWRcIixcblx0XHR0ZW1wbGF0ZVVybDpcImpzL3VzZXJfcHJvZmlsZS9wcm9maWxlLnRlbXBsYXRlLmh0bWxcIixcblx0XHRjb250cm9sbGVyOiBcIlVzZXJDdHJsXCJcblx0fSlcblx0JHN0YXRlUHJvdmlkZXIuc3RhdGUoXCJHYW1lUmVjb3JkXCIsIHtcblx0XHR1cmw6XCIvdXNlcnMvOnVzZXJJZC9nYW1lc1wiLFxuXHRcdHRlbXBsYXRlVXJsOiBcImpzL3VzZXJfcHJvZmlsZS9nYW1lcy5odG1sXCIsXG5cdFx0Y29udHJvbGxlcjogXCJHYW1lUmVjb3JkQ3RybFwiXG5cdH0pXG59KVxuXG5hcHAuY29udHJvbGxlcihcIlVzZXJDdHJsXCIsIGZ1bmN0aW9uKCRzY29wZSwgVXNlckZhY3RvcnksICRzdGF0ZVBhcmFtcyl7XG5cdFVzZXJGYWN0b3J5LmZldGNoSW5mb3JtYXRpb24oJHN0YXRlUGFyYW1zLnVzZXJJZClcblx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG5cdFx0JHNjb3BlLnVzZXI9dXNlcjtcblx0XHRyZXR1cm4gdXNlclxuXHR9KVxuXHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0XHQkc2NvcGUudXBkYXRlZD0kc2NvcGUudXNlci51cGRhdGVkQXQuZ2V0RGF5KCk7XG5cdH0pXG59KVxuXG5hcHAuY29udHJvbGxlcihcIkdhbWVSZWNvcmRDdHJsXCIsZnVuY3Rpb24oJHNjb3BlLCBVc2VyRmFjdG9yeSwgJHN0YXRlUGFyYW1zKXtcblx0VXNlckZhY3RvcnkuZmV0Y2hJbmZvcm1hdGlvbigkc3RhdGVQYXJhbXMudXNlcklkKVxuXHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0XHQkc2NvcGUudXNlcj11c2VyO1xuXHR9KVxuXHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0VXNlckZhY3RvcnkuZmV0Y2hHYW1lcygkc3RhdGVQYXJhbXMudXNlcklkKVxuXHR9KVxuXHQudGhlbihmdW5jdGlvbihnYW1lcyl7XG5cdFx0JHNjb3BlLmdhbWVzPWdhbWVzO1xuXHR9KVxufSkiLCJhcHAuZmFjdG9yeShcIlVzZXJGYWN0b3J5XCIsIGZ1bmN0aW9uKCRodHRwKXtcblx0cmV0dXJuIHtcblx0XHRmZXRjaEluZm9ybWF0aW9uOiBmdW5jdGlvbihpZCl7XG5cdFx0XHRyZXR1cm4gJGh0dHAuZ2V0KFwiL2FwaS91c2Vycy9cIitpZClcblx0XHRcdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHRcdFx0XHRyZXR1cm4gdXNlci5kYXRhO1xuXHRcdFx0fSlcblx0XHR9LFxuXHRcdGZldGNoR2FtZXM6IGZ1bmN0aW9uKGlkKXtcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoXCIvYXBpL3VzZXJzL1wiK2lkK1wiL2dhbWVzXCIpXG5cdFx0XHQudGhlbihmdW5jdGlvbihnYW1lcyl7XG5cdFx0XHRcdHJldHVybiBnYW1lcy5kYXRhO1xuXHRcdFx0fSlcblx0XHR9XG5cdH1cbn0pIiwiYXBwLmRpcmVjdGl2ZShcInRpbWVyXCIsIGZ1bmN0aW9uKCRxLCAkaW50ZXJ2YWwsIFNvY2tldCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICB0aW1lOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgdGVtcGxhdGVVcmw6IFwianMvY29tbW9uL2RpcmVjdGl2ZXMvdGltZXIvdGltZXIuaHRtbFwiLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICAgICAgdmFyIHRpbWUgPSBzY29wZS50aW1lO1xuICAgICAgICAgICAgdmFyIHN0YXJ0PXNjb3BlLnRpbWU7XG4gICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IGNvbnZlcnQodGltZSk7XG4gICAgICAgICAgICBzY29wZS5jb3VudGRvd24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGltZXIgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWUgLT0gMTtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBjb252ZXJ0KHRpbWUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGltZSA8IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gXCJUaW1lIHVwIVwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbCh0aW1lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lPXN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBzY29wZS5tZXNzYWdlcyA9IFtcIkdldCBSZWFkeSFcIiwgXCJHZXQgU2V0IVwiLCBcIkdvIVwiLCAnLyddO1xuICAgICAgICAgICAgLy8gICAgIHZhciBpbmRleCA9IDA7XG4gICAgICAgICAgICAvLyAgICAgdmFyIHByZXBhcmUgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gc2NvcGUubWVzc2FnZXNbaW5kZXhdO1xuICAgICAgICAgICAgLy8gICAgICAgICBpbmRleCsrO1xuICAgICAgICAgICAgLy8gICAgICAgICBjb25zb2xlLmxvZyhzY29wZS50aW1lX3JlbWFpbmluZyk7XG4gICAgICAgICAgICAvLyAgICAgICAgIGlmIChzY29wZS50aW1lX3JlbWFpbmluZyA9PT0gXCIvXCIpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gY29udmVydCh0aW1lKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwocHJlcGFyZSk7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICB2YXIgdGltZXIgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgdGltZSAtPSAxO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gY29udmVydCh0aW1lKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICBpZiAodGltZSA8IDEpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBcIlRpbWUgdXAhXCI7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwodGltZXIpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgLy8gICAgICAgICB9XG4gICAgICAgICAgICAvLyAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICAvLyB9O1xuXG4gICAgICAgICAgICBTb2NrZXQub24oJ3N0YXJ0Qm9hcmQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5jb3VudGRvd24odGltZSk7XG4gICAgICAgICAgICB9KTtcblxuXG4gICAgICAgICAgICBmdW5jdGlvbiBjb252ZXJ0KHRpbWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2Vjb25kcyA9ICh0aW1lICUgNjApLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgdmFyIGNvbnZlcnNpb24gPSAoTWF0aC5mbG9vcih0aW1lIC8gNjApKSArICc6JztcbiAgICAgICAgICAgICAgICBpZiAoc2Vjb25kcy5sZW5ndGggPCAyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnZlcnNpb24gKz0gJzAnICsgc2Vjb25kcztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb252ZXJzaW9uICs9IHNlY29uZHM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBjb252ZXJzaW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSlcbiIsImFwcC5kaXJlY3RpdmUoJ25hdmJhcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgQVVUSF9FVkVOVFMsICRzdGF0ZSkge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHt9LFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuXG4gICAgICAgICAgICBzY29wZS5pdGVtcyA9IFtcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnSG9tZScsIHN0YXRlOiAnaG9tZScgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnWW91ciBQcm9maWxlJywgc3RhdGU6ICdVc2VyUHJvZmlsZScsIGF1dGg6IHRydWUgfVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG5cbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciByZW1vdmVVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2V0VXNlcigpO1xuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldFVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2VzcywgcmVtb3ZlVXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxufSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
=======
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiZ2FtZS1zdGF0ZS9ncmlkLmNvbnRyb2xsZXIuanMiLCJnYW1lLXN0YXRlL2dyaWQuZmFjdG9yeS5qcyIsImhvbWUvaG9tZS5jb250cm9sbGVyLmpzIiwiaG9tZS9ob21lLmpzIiwibGVhZGVyQm9hcmQvbGVhZGVyQm9hcmQuY29udHJvbGxlci5qcyIsImxlYWRlckJvYXJkL2xlYWRlckJvYXJkLmZhY3RvcnkuanMiLCJsZWFkZXJCb2FyZC9sZWFkZXJCb2FyZC5zdGF0ZS5qcyIsImxvYmJ5L2xvYmJ5LmNvbnRyb2xsZXIuanMiLCJsb2JieS9sb2JieS5kaXJlY3RpdmUuanMiLCJsb2JieS9sb2JieS5mYWN0b3J5LmpzIiwibG9iYnkvbG9iYnkuc3RhdGUuanMiLCJsb2dpbi9sb2dpbi5qcyIsIm1lbWJlcnMtb25seS9tZW1iZXJzLW9ubHkuanMiLCJyYW5rL3JhbmsuZGlyZWN0aXZlLmpzIiwic2lnbnVwL3NpZ251cC5mYWN0b3J5LmpzIiwic2lnbnVwL3NpZ251cC5qcyIsInVzZXJfcHJvZmlsZS9wcm9maWxlLmNvbnRyb2xsZXIuanMiLCJ1c2VyX3Byb2ZpbGUvcHJvZmlsZS5mYWN0b3J5LmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvdGltZXIvdGltZXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsImFwcCIsImFuZ3VsYXIiLCJtb2R1bGUiLCJjb25maWciLCIkdXJsUm91dGVyUHJvdmlkZXIiLCIkbG9jYXRpb25Qcm92aWRlciIsImh0bWw1TW9kZSIsIm90aGVyd2lzZSIsIndoZW4iLCJsb2NhdGlvbiIsInJlbG9hZCIsInJ1biIsIiRyb290U2NvcGUiLCIkb24iLCJldmVudCIsInRvU3RhdGUiLCJ0b1BhcmFtcyIsImZyb21TdGF0ZSIsImZyb21QYXJhbXMiLCJ0aHJvd25FcnJvciIsImNvbnNvbGUiLCJpbmZvIiwibmFtZSIsImVycm9yIiwiQXV0aFNlcnZpY2UiLCIkc3RhdGUiLCJkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoIiwic3RhdGUiLCJkYXRhIiwiYXV0aGVudGljYXRlIiwiaXNBdXRoZW50aWNhdGVkIiwicHJldmVudERlZmF1bHQiLCJnZXRMb2dnZWRJblVzZXIiLCJ0aGVuIiwidXNlciIsImdvIiwiRXJyb3IiLCJmYWN0b3J5IiwiaW8iLCJvcmlnaW4iLCJjb25zdGFudCIsImxvZ2luU3VjY2VzcyIsImxvZ2luRmFpbGVkIiwibG9nb3V0U3VjY2VzcyIsInNlc3Npb25UaW1lb3V0Iiwibm90QXV0aGVudGljYXRlZCIsIm5vdEF1dGhvcml6ZWQiLCIkcSIsIkFVVEhfRVZFTlRTIiwic3RhdHVzRGljdCIsInJlc3BvbnNlRXJyb3IiLCJyZXNwb25zZSIsIiRicm9hZGNhc3QiLCJzdGF0dXMiLCJyZWplY3QiLCIkaHR0cFByb3ZpZGVyIiwiaW50ZXJjZXB0b3JzIiwicHVzaCIsIiRpbmplY3RvciIsImdldCIsInNlcnZpY2UiLCIkaHR0cCIsIlNlc3Npb24iLCJvblN1Y2Nlc3NmdWxMb2dpbiIsImNyZWF0ZSIsImZyb21TZXJ2ZXIiLCJjYXRjaCIsImxvZ2luIiwiY3JlZGVudGlhbHMiLCJwb3N0IiwibWVzc2FnZSIsImxvZ291dCIsImRlc3Ryb3kiLCJzZWxmIiwiJHN0YXRlUHJvdmlkZXIiLCJ1cmwiLCJ0ZW1wbGF0ZVVybCIsImNvbnRyb2xsZXIiLCIkc2NvcGUiLCJCb2FyZEZhY3RvcnkiLCJTb2NrZXQiLCIkc3RhdGVQYXJhbXMiLCJMb2JieUZhY3RvcnkiLCJyb29tTmFtZSIsInJvb21uYW1lIiwiaGlkZVN0YXJ0Iiwib3RoZXJQbGF5ZXJzIiwiZ2FtZUxlbmd0aCIsImV4cG9ydHMiLCJ3b3JkT2JqIiwid29yZCIsInBsYXllcklkIiwic3RhdGVOdW1iZXIiLCJwb2ludHNFYXJuZWQiLCJtb3VzZUlzRG93biIsImRyYWdnaW5nQWxsb3dlZCIsInN0eWxlIiwiZnJlZXplIiwid2luT3JMb3NlIiwidGltZW91dCIsImhpZGVOYXZiYXIiLCJjaGVja1NlbGVjdGVkIiwiaWQiLCJ0b2dnbGVEcmFnIiwibW91c2VEb3duIiwibW91c2VVcCIsImxlbmd0aCIsInN1Ym1pdCIsImRyYWciLCJzcGFjZSIsImNsaWNrIiwiaGlkZUJvYXJkIiwic3RhcnRHYW1lIiwidXNlcklkcyIsIm1hcCIsImxvZyIsImdldFN0YXJ0Qm9hcmQiLCJnYW1lSWQiLCJxdWl0IiwiYm9hcmQiLCJzaXplIiwic2NvcmUiLCJsdHJzU2VsZWN0ZWQiLCJPYmplY3QiLCJrZXlzIiwicHJldmlvdXNMdHIiLCJsYXN0THRyIiwidmFsaWRTZWxlY3QiLCJzdWJzdHJpbmciLCJsdHJJZCIsIm90aGVyTHRyc0lkcyIsImluY2x1ZGVzIiwiY29vcmRzIiwic3BsaXQiLCJyb3ciLCJjb2wiLCJsYXN0THRySWQiLCJwb3AiLCJjb29yZHNMYXN0Iiwicm93TGFzdCIsImNvbExhc3QiLCJyb3dPZmZzZXQiLCJNYXRoIiwiYWJzIiwiY29sT2Zmc2V0IiwiY2xlYXJJZkNvbmZsaWN0aW5nIiwidXBkYXRlV29yZE9iaiIsImV4cG9ydFdvcmRPYmoiLCJ0aWxlc01vdmVkIiwibXlXb3JkVGlsZXMiLCJzb21lIiwiY29vcmQiLCJjbGVhciIsIm9iaiIsInNodWZmbGUiLCJ1cGRhdGVCb2FyZCIsImtleSIsInVwZGF0ZVNjb3JlIiwicG9pbnRzIiwicGxheWVyIiwidXBkYXRlIiwidXBkYXRlT2JqIiwidXNlcm5hbWUiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwiJGV2YWxBc3luYyIsInJlcGxheSIsIm5ld0dhbWUiLCJnYW1lIiwiYWxsSWRzIiwiYWxsIiwiam9pbkdhbWUiLCJlIiwiZGV0ZXJtaW5lV2lubmVyIiwid2lubmVyc0FycmF5Iiwid2lubmVyIiwid2lubmVycyIsImkiLCJlbWl0IiwiY2hlY2tDb25uZWN0IiwiY29ubmVjdGVkIiwiZ2V0Q3VycmVudFJvb20iLCJyb29tIiwidXNlcnMiLCJmaWx0ZXIiLCJmb3JFYWNoIiwib24iLCJsYXN0V29yZFBsYXllZCIsInVzZXJJZCIsIm90aGVyUGxheWVyIiwicmVzIiwicXVpdEZyb21Sb29tIiwiZGVsZXRlIiwiJGxvY2F0aW9uIiwiZW50ZXJMb2JieSIsIkxlYWRlckJvYXJkRmFjdG9yeSIsIkFsbFBsYXllcnMiLCJwbGF5ZXJzIiwiZ2FtZXMiLCJzY29yZXMiLCJ1c2VyR2FtZSIsImhpZ2hlc3RTY29yZSIsIm1heCIsImdhbWVzX3dvbiIsImdhbWVzX3BsYXllZCIsIndpbl9wZXJjZW50YWdlIiwidG9GaXhlZCIsInJlc29sdmUiLCJhbGxQbGF5ZXJzIiwicm9vbXMiLCJyb29tTmFtZUZvcm0iLCJuZXdSb29tIiwicm9vbUluZm8iLCJzaG93Rm9ybSIsImRpcmVjdGl2ZSIsInJlc3RyaWN0IiwidGVtcFJvb21zIiwiZ2V0QWxsUm9vbXMiLCJjb3B5Iiwicm9vbUlkIiwicHV0Iiwic2VuZExvZ2luIiwibG9naW5JbmZvIiwidGVtcGxhdGUiLCJTZWNyZXRTdGFzaCIsImdldFN0YXNoIiwic3Rhc2giLCJzY29wZSIsInJhbmtOYW1lIiwicmFua0J5Iiwib3JkZXIiLCJTaWdudXBGYWN0b3J5IiwiY3JlYXRlVXNlciIsInNpZ251cEluZm8iLCJlbWFpbCIsInBhc3N3b3JkIiwic2lnbnVwIiwic2VuZFNpZ251cCIsIlVzZXJGYWN0b3J5IiwiZmV0Y2hJbmZvcm1hdGlvbiIsInVwZGF0ZWQiLCJ1cGRhdGVkQXQiLCJnZXREYXkiLCJmZXRjaEdhbWVzIiwiJGludGVydmFsIiwidGltZSIsImxpbmsiLCJzdGFydCIsInRpbWVfcmVtYWluaW5nIiwiY29udmVydCIsImNvdW50ZG93biIsInRpbWVyIiwiY2FuY2VsIiwic2Vjb25kcyIsInRvU3RyaW5nIiwiY29udmVyc2lvbiIsImZsb29yIiwiaXRlbXMiLCJsYWJlbCIsImF1dGgiLCJpc0xvZ2dlZEluIiwic2V0VXNlciIsInJlbW92ZVVzZXIiXSwibWFwcGluZ3MiOiJBQUFBOzs7O0FBQ0FBLE9BQUFDLEdBQUEsR0FBQUMsUUFBQUMsTUFBQSxDQUFBLHVC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QUFBQyxJQUFBLENBQUEsVUFBQUMsSUFBQSxFQUFBO0FBQ0FpTSwwQkFBQWpNLElBQUEsR0FBQUEsSUFBQTtBQUNBLGlCQUZBO0FBR0EsYUFKQTs7QUFNQSxnQkFBQW9PLGFBQUEsU0FBQUEsVUFBQSxHQUFBO0FBQ0FuQyxzQkFBQWpNLElBQUEsR0FBQSxJQUFBO0FBQ0EsYUFGQTs7QUFJQW1POztBQUVBelAsdUJBQUFDLEdBQUEsQ0FBQW1DLFlBQUFQLFlBQUEsRUFBQTROLE9BQUE7QUFDQXpQLHVCQUFBQyxHQUFBLENBQUFtQyxZQUFBTCxhQUFBLEVBQUEyTixVQUFBO0FBQ0ExUCx1QkFBQUMsR0FBQSxDQUFBbUMsWUFBQUosY0FBQSxFQUFBME4sVUFBQTtBQUVBOztBQXZDQSxLQUFBO0FBMkNBLENBN0NBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG53aW5kb3cuYXBwID0gYW5ndWxhci5tb2R1bGUoJ0Z1bGxzdGFja0dlbmVyYXRlZEFwcCcsIFsnZnNhUHJlQnVpbHQnLCAndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICduZ0FuaW1hdGUnXSk7XG5cbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcbiAgICAvLyBUcmlnZ2VyIHBhZ2UgcmVmcmVzaCB3aGVuIGFjY2Vzc2luZyBhbiBPQXV0aCByb3V0ZVxuICAgICR1cmxSb3V0ZXJQcm92aWRlci53aGVuKCcvYXV0aC86cHJvdmlkZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICB9KTtcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGxpc3RlbmluZyB0byBlcnJvcnMgYnJvYWRjYXN0ZWQgYnkgdWktcm91dGVyLCB1c3VhbGx5IG9yaWdpbmF0aW5nIGZyb20gcmVzb2x2ZXNcbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUpIHtcbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlRXJyb3InLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zLCBmcm9tU3RhdGUsIGZyb21QYXJhbXMsIHRocm93bkVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuaW5mbyhgVGhlIGZvbGxvd2luZyBlcnJvciB3YXMgdGhyb3duIGJ5IHVpLXJvdXRlciB3aGlsZSB0cmFuc2l0aW9uaW5nIHRvIHN0YXRlIFwiJHt0b1N0YXRlLm5hbWV9XCIuIFRoZSBvcmlnaW4gb2YgdGhpcyBlcnJvciBpcyBwcm9iYWJseSBhIHJlc29sdmUgZnVuY3Rpb246YCk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IodGhyb3duRXJyb3IpO1xuICAgIH0pO1xufSk7XG5cbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgY29udHJvbGxpbmcgYWNjZXNzIHRvIHNwZWNpZmljIHN0YXRlcy5cbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgIC8vIFRoZSBnaXZlbiBzdGF0ZSByZXF1aXJlcyBhbiBhdXRoZW50aWNhdGVkIHVzZXIuXG4gICAgdmFyIGRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGggPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmRhdGEgJiYgc3RhdGUuZGF0YS5hdXRoZW50aWNhdGU7XG4gICAgfTtcblxuICAgIC8vICRzdGF0ZUNoYW5nZVN0YXJ0IGlzIGFuIGV2ZW50IGZpcmVkXG4gICAgLy8gd2hlbmV2ZXIgdGhlIHByb2Nlc3Mgb2YgY2hhbmdpbmcgYSBzdGF0ZSBiZWdpbnMuXG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcykge1xuXG4gICAgICAgIGlmICghZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCh0b1N0YXRlKSkge1xuICAgICAgICAgICAgLy8gVGhlIGRlc3RpbmF0aW9uIHN0YXRlIGRvZXMgbm90IHJlcXVpcmUgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgICAgIC8vIFRoZSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWQuXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FuY2VsIG5hdmlnYXRpbmcgdG8gbmV3IHN0YXRlLlxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIC8vIElmIGEgdXNlciBpcyByZXRyaWV2ZWQsIHRoZW4gcmVuYXZpZ2F0ZSB0byB0aGUgZGVzdGluYXRpb25cbiAgICAgICAgICAgIC8vICh0aGUgc2Vjb25kIHRpbWUsIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpIHdpbGwgd29yaylcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgaWYgbm8gdXNlciBpcyBsb2dnZWQgaW4sIGdvIHRvIFwibG9naW5cIiBzdGF0ZS5cbiAgICAgICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKHRvU3RhdGUubmFtZSwgdG9QYXJhbXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbn0pO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgW10pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luLHsnZm9yY2VOZXcnOiB0cnVlfSk7XG4gICAgfSk7XG5cbiAgICAvLyBBVVRIX0VWRU5UUyBpcyB1c2VkIHRocm91Z2hvdXQgb3VyIGFwcCB0b1xuICAgIC8vIGJyb2FkY2FzdCBhbmQgbGlzdGVuIGZyb20gYW5kIHRvIHRoZSAkcm9vdFNjb3BlXG4gICAgLy8gZm9yIGltcG9ydGFudCBldmVudHMgYWJvdXQgYXV0aGVudGljYXRpb24gZmxvdy5cbiAgICBhcHAuY29uc3RhbnQoJ0FVVEhfRVZFTlRTJywge1xuICAgICAgICBsb2dpblN1Y2Nlc3M6ICdhdXRoLWxvZ2luLXN1Y2Nlc3MnLFxuICAgICAgICBsb2dpbkZhaWxlZDogJ2F1dGgtbG9naW4tZmFpbGVkJyxcbiAgICAgICAgbG9nb3V0U3VjY2VzczogJ2F1dGgtbG9nb3V0LXN1Y2Nlc3MnLFxuICAgICAgICBzZXNzaW9uVGltZW91dDogJ2F1dGgtc2Vzc2lvbi10aW1lb3V0JyxcbiAgICAgICAgbm90QXV0aGVudGljYXRlZDogJ2F1dGgtbm90LWF1dGhlbnRpY2F0ZWQnLFxuICAgICAgICBub3RBdXRob3JpemVkOiAnYXV0aC1ub3QtYXV0aG9yaXplZCdcbiAgICB9KTtcblxuICAgIGFwcC5mYWN0b3J5KCdBdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsIEFVVEhfRVZFTlRTKSB7XG4gICAgICAgIHZhciBzdGF0dXNEaWN0ID0ge1xuICAgICAgICAgICAgNDAxOiBBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLFxuICAgICAgICAgICAgNDAzOiBBVVRIX0VWRU5UUy5ub3RBdXRob3JpemVkLFxuICAgICAgICAgICAgNDE5OiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCxcbiAgICAgICAgICAgIDQ0MDogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXRcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChzdGF0dXNEaWN0W3Jlc3BvbnNlLnN0YXR1c10sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSkge1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgdXNlciA9IHJlc3BvbnNlLmRhdGEudXNlcjtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKHVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XG4gICAgICAgICAgICByZXR1cm4gdXNlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZXMgdGhlIHNlc3Npb24gZmFjdG9yeSB0byBzZWUgaWYgYW5cbiAgICAgICAgLy8gYXV0aGVudGljYXRlZCB1c2VyIGlzIGN1cnJlbnRseSByZWdpc3RlcmVkLlxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhIVNlc3Npb24udXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldExvZ2dlZEluVXNlciA9IGZ1bmN0aW9uIChmcm9tU2VydmVyKSB7XG5cbiAgICAgICAgICAgIC8vIElmIGFuIGF1dGhlbnRpY2F0ZWQgc2Vzc2lvbiBleGlzdHMsIHdlXG4gICAgICAgICAgICAvLyByZXR1cm4gdGhlIHVzZXIgYXR0YWNoZWQgdG8gdGhhdCBzZXNzaW9uXG4gICAgICAgICAgICAvLyB3aXRoIGEgcHJvbWlzZS4gVGhpcyBlbnN1cmVzIHRoYXQgd2UgY2FuXG4gICAgICAgICAgICAvLyBhbHdheXMgaW50ZXJmYWNlIHdpdGggdGhpcyBtZXRob2QgYXN5bmNocm9ub3VzbHkuXG5cbiAgICAgICAgICAgIC8vIE9wdGlvbmFsbHksIGlmIHRydWUgaXMgZ2l2ZW4gYXMgdGhlIGZyb21TZXJ2ZXIgcGFyYW1ldGVyLFxuICAgICAgICAgICAgLy8gdGhlbiB0aGlzIGNhY2hlZCB2YWx1ZSB3aWxsIG5vdCBiZSB1c2VkLlxuXG4gICAgICAgICAgICBpZiAodGhpcy5pc0F1dGhlbnRpY2F0ZWQoKSAmJiBmcm9tU2VydmVyICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4oU2Vzc2lvbi51c2VyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFrZSByZXF1ZXN0IEdFVCAvc2Vzc2lvbi5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIDQwMSByZXNwb25zZSwgd2UgY2F0Y2ggaXQgYW5kIGluc3RlYWQgcmVzb2x2ZSB0byBudWxsLlxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKS50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9naW4gPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbihvblN1Y2Nlc3NmdWxMb2dpbilcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHsgbWVzc2FnZTogJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJyB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9sb2dvdXQnKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBTZXNzaW9uLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9nb3V0U3VjY2Vzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcblxuICAgICAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSB1c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IG51bGw7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxufSgpKTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnR2FtZScsIHtcbiAgICAgICAgdXJsOiAnL2dhbWUvOnJvb21uYW1lJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9nYW1lLXN0YXRlL3BhZ2UuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6IFwiR2FtZUN0cmxcIixcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuXG5cbmFwcC5jb250cm9sbGVyKCdHYW1lQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgQm9hcmRGYWN0b3J5LCBTb2NrZXQsICRzdGF0ZVBhcmFtcywgQXV0aFNlcnZpY2UsICRzdGF0ZSwgTG9iYnlGYWN0b3J5LCAkcm9vdFNjb3BlLCAkcSkge1xuXG4gICAgJHNjb3BlLnJvb21OYW1lID0gJHN0YXRlUGFyYW1zLnJvb21uYW1lO1xuICAgICRzY29wZS5oaWRlU3RhcnQgPSB0cnVlO1xuXG4gICAgJHNjb3BlLm90aGVyUGxheWVycyA9IFtdO1xuXG4gICAgJHNjb3BlLmdhbWVMZW5ndGggPSAxNTA7XG5cbiAgICAkc2NvcGUuZXhwb3J0cyA9IHtcbiAgICAgICAgd29yZE9iajoge30sXG4gICAgICAgIHdvcmQ6IFwiXCIsXG4gICAgICAgIHBsYXllcklkOiBudWxsLFxuICAgICAgICBzdGF0ZU51bWJlcjogMCxcbiAgICAgICAgcG9pbnRzRWFybmVkOiBudWxsXG4gICAgfTtcblxuICAgICRzY29wZS5tb3VzZUlzRG93biA9IGZhbHNlO1xuICAgICRzY29wZS5kcmFnZ2luZ0FsbG93ZWQgPSBmYWxzZTtcbiAgICAkc2NvcGUuc3R5bGUgPSBudWxsO1xuICAgICRzY29wZS5tZXNzYWdlID0gJyc7XG4gICAgJHNjb3BlLmZyZWV6ZSA9IGZhbHNlO1xuICAgICRzY29wZS53aW5Pckxvc2UgPSBudWxsO1xuICAgICRzY29wZS50aW1lb3V0ID0gbnVsbDtcblxuICAgICRyb290U2NvcGUuaGlkZU5hdmJhciA9IHRydWU7XG5cbiAgICAkc2NvcGUuY2hlY2tTZWxlY3RlZCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIHJldHVybiBpZCBpbiAkc2NvcGUuZXhwb3J0cy53b3JkT2JqO1xuICAgIH07XG5cbiAgICAkc2NvcGUudG9nZ2xlRHJhZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkID0gISRzY29wZS5kcmFnZ2luZ0FsbG93ZWQ7XG4gICAgfTtcblxuICAgICRzY29wZS5tb3VzZURvd24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLm1vdXNlSXNEb3duID0gdHJ1ZTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm1vdXNlVXAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLm1vdXNlSXNEb3duID0gZmFsc2U7XG4gICAgICAgIGlmICgkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkICYmICRzY29wZS5leHBvcnRzLndvcmQubGVuZ3RoID4gMSkgJHNjb3BlLnN1Ym1pdCgkc2NvcGUuZXhwb3J0cyk7XG4gICAgfTtcblxuICAgICRzY29wZS5kcmFnID0gZnVuY3Rpb24oc3BhY2UsIGlkKSB7XG4gICAgICAgIGlmICgkc2NvcGUubW91c2VJc0Rvd24gJiYgJHNjb3BlLmRyYWdnaW5nQWxsb3dlZCkge1xuICAgICAgICAgICAgJHNjb3BlLmNsaWNrKHNwYWNlLCBpZCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmhpZGVCb2FyZCA9IHRydWU7XG5cbiAgICAvLyBTdGFydCB0aGUgZ2FtZSB3aGVuIGFsbCBwbGF5ZXJzIGhhdmUgam9pbmVkIHJvb21cbiAgICAkc2NvcGUuc3RhcnRHYW1lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB1c2VySWRzID0gJHNjb3BlLm90aGVyUGxheWVycy5tYXAodXNlciA9PiB1c2VyLmlkKTtcbiAgICAgICAgdXNlcklkcy5wdXNoKCRzY29wZS51c2VyLmlkKTtcbiAgICAgICAgY29uc29sZS5sb2coJ29wJywgJHNjb3BlLm90aGVyUGxheWVycywgJ3VpJywgdXNlcklkcyk7XG4gICAgICAgIFxuICAgICAgICBCb2FyZEZhY3RvcnkuZ2V0U3RhcnRCb2FyZCgkc2NvcGUuZ2FtZUxlbmd0aCwgJHNjb3BlLmdhbWVJZCwgdXNlcklkcyk7XG4gICAgfTtcblxuXG4gICAgLy9RdWl0IHRoZSByb29tLCBiYWNrIHRvIGxvYmJ5XG4gICAgJHNjb3BlLnF1aXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHJvb3RTY29wZS5oaWRlTmF2YmFyID0gZmFsc2U7XG4gICAgICAgICRzdGF0ZS5nbygnbG9iYnknKVxuICAgIH07XG5cblxuICAgICRzY29wZS5ib2FyZCA9IFtcbiAgICAgICAgWydiJywgJ2EnLCAnZCcsICdlJywgJ2EnLCAnciddLFxuICAgICAgICBbJ2UnLCAnZicsICdnJywgJ2wnLCAnbScsICdlJ10sXG4gICAgICAgIFsnaCcsICdpJywgJ2onLCAnZicsICdvJywgJ2EnXSxcbiAgICAgICAgWydjJywgJ2EnLCAnZCcsICdlJywgJ2EnLCAnciddLFxuICAgICAgICBbJ2UnLCAnZicsICdnJywgJ2wnLCAnZCcsICdlJ10sXG4gICAgICAgIFsnaCcsICdpJywgJ2onLCAnZicsICdvJywgJ2EnXVxuICAgIF07XG5cblxuXG4gICAgJHNjb3BlLnNpemUgPSAzO1xuICAgICRzY29wZS5zY29yZSA9IDA7XG5cblxuICAgICRzY29wZS5jbGljayA9IGZ1bmN0aW9uKHNwYWNlLCBpZCkge1xuICAgICAgICBpZiAoJHNjb3BlLmZyZWV6ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKCdjbGlja2VkICcsIHNwYWNlLCBpZCk7XG4gICAgICAgIHZhciBsdHJzU2VsZWN0ZWQgPSBPYmplY3Qua2V5cygkc2NvcGUuZXhwb3J0cy53b3JkT2JqKTtcbiAgICAgICAgdmFyIHByZXZpb3VzTHRyID0gbHRyc1NlbGVjdGVkW2x0cnNTZWxlY3RlZC5sZW5ndGggLSAyXTtcbiAgICAgICAgdmFyIGxhc3RMdHIgPSBsdHJzU2VsZWN0ZWRbbHRyc1NlbGVjdGVkLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAoIWx0cnNTZWxlY3RlZC5sZW5ndGggfHwgdmFsaWRTZWxlY3QoaWQsIGx0cnNTZWxlY3RlZCkpIHtcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLndvcmQgKz0gc3BhY2U7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkT2JqW2lkXSA9IHNwYWNlO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJHNjb3BlLmV4cG9ydHMpO1xuICAgICAgICB9IGVsc2UgaWYgKGlkID09PSBwcmV2aW91c0x0cikge1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZCA9ICRzY29wZS5leHBvcnRzLndvcmQuc3Vic3RyaW5nKDAsICRzY29wZS5leHBvcnRzLndvcmQubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICBkZWxldGUgJHNjb3BlLmV4cG9ydHMud29yZE9ialtsYXN0THRyXTtcbiAgICAgICAgfSBlbHNlIGlmIChsdHJzU2VsZWN0ZWQubGVuZ3RoID09PSAxICYmIGlkID09PSBsYXN0THRyKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkID0gXCJcIjtcbiAgICAgICAgICAgIGRlbGV0ZSAkc2NvcGUuZXhwb3J0cy53b3JkT2JqW2xhc3RMdHJdO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vbWFrZXMgc3VyZSBsZXR0ZXIgaXMgYWRqYWNlbnQgdG8gcHJldiBsdHIsIGFuZCBoYXNuJ3QgYmVlbiB1c2VkIHlldFxuICAgIGZ1bmN0aW9uIHZhbGlkU2VsZWN0KGx0cklkLCBvdGhlckx0cnNJZHMpIHtcbiAgICAgICAgaWYgKG90aGVyTHRyc0lkcy5pbmNsdWRlcyhsdHJJZCkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgdmFyIGNvb3JkcyA9IGx0cklkLnNwbGl0KCctJyk7XG4gICAgICAgIHZhciByb3cgPSBjb29yZHNbMF07XG4gICAgICAgIHZhciBjb2wgPSBjb29yZHNbMV07XG4gICAgICAgIHZhciBsYXN0THRySWQgPSBvdGhlckx0cnNJZHMucG9wKCk7XG4gICAgICAgIHZhciBjb29yZHNMYXN0ID0gbGFzdEx0cklkLnNwbGl0KCctJyk7XG4gICAgICAgIHZhciByb3dMYXN0ID0gY29vcmRzTGFzdFswXTtcbiAgICAgICAgdmFyIGNvbExhc3QgPSBjb29yZHNMYXN0WzFdO1xuICAgICAgICB2YXIgcm93T2Zmc2V0ID0gTWF0aC5hYnMocm93IC0gcm93TGFzdCk7XG4gICAgICAgIHZhciBjb2xPZmZzZXQgPSBNYXRoLmFicyhjb2wgLSBjb2xMYXN0KTtcbiAgICAgICAgcmV0dXJuIChyb3dPZmZzZXQgPD0gMSAmJiBjb2xPZmZzZXQgPD0gMSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYXJJZkNvbmZsaWN0aW5nKHVwZGF0ZVdvcmRPYmosIGV4cG9ydFdvcmRPYmopIHtcbiAgICAgICAgdmFyIHRpbGVzTW92ZWQgPSBPYmplY3Qua2V5cyh1cGRhdGVXb3JkT2JqKTtcbiAgICAgICAgdmFyIG15V29yZFRpbGVzID0gT2JqZWN0LmtleXMoZXhwb3J0V29yZE9iaik7XG4gICAgICAgIGlmICh0aWxlc01vdmVkLnNvbWUoY29vcmQgPT4gbXlXb3JkVGlsZXMuaW5jbHVkZXMoY29vcmQpKSkgJHNjb3BlLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgJHNjb3BlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5leHBvcnRzLndvcmQgPSBcIlwiO1xuICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkT2JqID0ge307XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLnN1Ym1pdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgICBjb25zb2xlLmxvZygnc3VibWl0dGluZyAnLCBvYmopO1xuICAgICAgICBCb2FyZEZhY3Rvcnkuc3VibWl0KG9iaik7XG4gICAgICAgICRzY29wZS5jbGVhcigpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc2h1ZmZsZSA9IEJvYXJkRmFjdG9yeS5zaHVmZmxlO1xuXG5cbiAgICAkc2NvcGUudXBkYXRlQm9hcmQgPSBmdW5jdGlvbih3b3JkT2JqKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdzY29wZS5ib2FyZCcsICRzY29wZS5ib2FyZCk7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB3b3JkT2JqKSB7XG4gICAgICAgICAgICB2YXIgY29vcmRzID0ga2V5LnNwbGl0KCctJyk7XG4gICAgICAgICAgICB2YXIgcm93ID0gY29vcmRzWzBdO1xuICAgICAgICAgICAgdmFyIGNvbCA9IGNvb3Jkc1sxXTtcbiAgICAgICAgICAgICRzY29wZS5ib2FyZFtyb3ddW2NvbF0gPSB3b3JkT2JqW2tleV07XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnVwZGF0ZVNjb3JlID0gZnVuY3Rpb24ocG9pbnRzLCBwbGF5ZXJJZCkge1xuICAgICAgICBjb25zb2xlLmxvZygndXBkYXRlIHNjb3JlIHBvaW50cycsIHBvaW50cyk7XG4gICAgICAgIGlmIChwbGF5ZXJJZCA9PT0gJHNjb3BlLnVzZXIuaWQpIHtcbiAgICAgICAgICAgICRzY29wZS5zY29yZSArPSBwb2ludHM7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy5wb2ludHNFYXJuZWQgPSBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIgcGxheWVyIGluICRzY29wZS5vdGhlclBsYXllcnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLm90aGVyUGxheWVyc1twbGF5ZXJdLmlkID09PSBwbGF5ZXJJZCkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzW3BsYXllcl0uc2NvcmUgKz0gcG9pbnRzO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy5wb2ludHNFYXJuZWQgPSBudWxsO1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLnVwZGF0ZSA9IGZ1bmN0aW9uKHVwZGF0ZU9iaikge1xuICAgICAgICAkc2NvcGUudXBkYXRlU2NvcmUodXBkYXRlT2JqLnBvaW50c0Vhcm5lZCwgdXBkYXRlT2JqLnBsYXllcklkKTtcbiAgICAgICAgJHNjb3BlLnVwZGF0ZUJvYXJkKHVwZGF0ZU9iai53b3JkT2JqKTtcbiAgICAgICAgaWYgKCskc2NvcGUudXNlci5pZCA9PT0gK3VwZGF0ZU9iai5wbGF5ZXJJZCkge1xuICAgICAgICAgICAgdmFyIHBsYXllciA9ICRzY29wZS51c2VyLnVzZXJuYW1lO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluICRzY29wZS5vdGhlclBsYXllcnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoKyRzY29wZS5vdGhlclBsYXllcnNba2V5XS5pZCA9PT0gK3VwZGF0ZU9iai5wbGF5ZXJJZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcGxheWVyID0gJHNjb3BlLm90aGVyUGxheWVyc1trZXldLnVzZXJuYW1lO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLm1lc3NhZ2UgPSBwbGF5ZXIgKyBcIiBwbGF5ZWQgXCIgKyB1cGRhdGVPYmoud29yZCArIFwiIGZvciBcIiArIHVwZGF0ZU9iai5wb2ludHNFYXJuZWQgKyBcIiBwb2ludHMhXCI7XG4gICAgICAgIGlmICgkc2NvcGUudGltZW91dCkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KCRzY29wZS50aW1lb3V0KTtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkc2NvcGUubWVzc2FnZSA9ICcnO1xuICAgICAgICB9LCAzMDAwKVxuICAgICAgICBjb25zb2xlLmxvZygnaXRzIHVwZGF0aW5nIScpO1xuICAgICAgICBjbGVhcklmQ29uZmxpY3RpbmcodXBkYXRlT2JqLCAkc2NvcGUuZXhwb3J0cy53b3JkT2JqKTtcbiAgICAgICAgJHNjb3BlLmV4cG9ydHMuc3RhdGVOdW1iZXIgPSB1cGRhdGVPYmouc3RhdGVOdW1iZXI7XG4gICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5yZXBsYXkgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgTG9iYnlGYWN0b3J5Lm5ld0dhbWUoeyByb29tbmFtZTogJHNjb3BlLnJvb21OYW1lIH0pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihnYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZXBsYXkgZ2FtZSBvYmo6XCIsIGdhbWUpO1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLmdhbWVJZCA9IGdhbWUuaWQ7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnN0YXJ0R2FtZSgpO1xuICAgICAgICAgICAgICAgIHZhciBhbGxJZHMgPSAkc2NvcGUub3RoZXJQbGF5ZXJzLm1hcChwbGF5ZXIgPT4gcGxheWVyLmlkKTtcbiAgICAgICAgICAgICAgICBhbGxJZHMucHVzaCgkc2NvcGUudXNlci5pZCk7XG4gICAgICAgICAgICAgICAgJHEuYWxsKGFsbElkcy5tYXAoaWQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBMb2JieUZhY3Rvcnkuam9pbkdhbWUoJHNjb3BlLmdhbWVJZCwgaWQpO1xuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2Vycm9yIHJlc3RhcnRpbmcgdGhlIGdhbWUnLCBlKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZGV0ZXJtaW5lV2lubmVyID0gZnVuY3Rpb24od2lubmVyc0FycmF5KSB7XG4gICAgICAgIGlmICh3aW5uZXJzQXJyYXkubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICBpZiAoK3dpbm5lcnNBcnJheVswXSA9PT0gKyRzY29wZS51c2VyLmlkKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLndpbk9yTG9zZSA9IFwiQ29uZ3JhdHVsYXRpb24hIFlvdSBhcmUgYSB3b3JkIHdpemFyZCEgWW91IHdvbiEhIVwiO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBwbGF5ZXIgaW4gJHNjb3BlLm90aGVyUGxheWVycykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKyRzY29wZS5vdGhlclBsYXllcnNbcGxheWVyXS5pZCA9PT0gK3dpbm5lcnNBcnJheVswXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHdpbm5lciA9ICRzY29wZS5vdGhlclBsYXllcnNbcGxheWVyXS51c2VybmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS53aW5Pckxvc2UgPSBcIlRvdWdoIGx1Y2suIFwiICsgd2lubmVyICsgXCIgaGFzIGJlYXRlbiB5b3UuIEJldHRlciBMdWNrIG5leHQgdGltZS4gOihcIlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IHdpbm5lcnMgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgaW4gd2lubmVyc0FycmF5KSB7XG4gICAgICAgICAgICAgICAgaWYgKCt3aW5uZXJzQXJyYXlbaV0gPT09ICskc2NvcGUudXNlci5pZCkgeyB3aW5uZXJzLnB1c2goJHNjb3BlLnVzZXIudXNlcm5hbWUpOyB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBwbGF5ZXIgaW4gJHNjb3BlLm90aGVyUGxheWVycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS5vdGhlclBsYXllcnNbcGxheWVyXS5pZCA9PSB3aW5uZXJzQXJyYXlbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5uZXJzLnB1c2goJHNjb3BlLm90aGVyUGxheWVyc1twbGF5ZXJdLnVzZXJuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh3aW5uZXJzKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUud2luT3JMb3NlID0gXCJUaGUgZ2FtZSB3YXMgYSB0aWUgYmV0d2VlbiBcIjtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHdpbm5lcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPT09IHdpbm5lcnMubGVuZ3RoIC0gMSkgeyAkc2NvcGUud2luT3JMb3NlICs9IFwiYW5kIFwiICsgd2lubmVyc1tpXSArIFwiLlwiOyB9IGVsc2UgeyAkc2NvcGUud2luT3JMb3NlICs9IHdpbm5lcnNbaV0gKyBcIiwgXCI7IH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIC8vICRzY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24oKSB7XG4gICAgLy8gICAgIGNvbnNvbGUubG9nKCdjaGFuZ2VzdGF0ZScsICRzY29wZS51c2VyLmlkKTtcbiAgICAvLyAgICAgU29ja2V0LmNsb3NlKCk7XG4gICAgLy8gICAgIC8vIFNvY2tldC5yZWNvbm5lY3QoKTtcblxuICAgIC8vIH0pO1xuXG4gICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2NoYW5nZXN0YXRlIGNsb3NlJywgJHNjb3BlLnVzZXIuaWQpO1xuXG4gICAgICAgIFNvY2tldC5lbWl0KCdsZWF2ZVJvb20nKTtcblxuICAgIH0pO1xuXG4gICAgJHNjb3BlLmNoZWNrQ29ubmVjdCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICRzY29wZS5jb25uZWN0ZWQgPSB0cnVlO1xuICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgIH1cblxuICAgIFxuXG5jb25zb2xlLmxvZygndXBkYXRlJylcblxuICAgIC8vIFNvY2tldC5vbignY29ubmVjdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAkc2NvcGUuY2hlY2tDb25uZWN0KCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdjb25uZWN0aW5nJyk7XG4gICAgICAgICRxLmFsbChbXG4gICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24odXNlcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd1c2VyIGZyb20gQXV0aFNlcnZpY2UnLCB1c2VyKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMucGxheWVySWQgPSB1c2VyLmlkO1xuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIC8vZ2V0IHRoZSBjdXJyZW50IHJvb20gaW5mb1xuICAgICAgICAgICAgQm9hcmRGYWN0b3J5LmdldEN1cnJlbnRSb29tKCRzdGF0ZVBhcmFtcy5yb29tbmFtZSlcbiAgICAgICAgICAgIC50aGVuKHJvb20gPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJvb20pO1xuICAgICAgICAgICAgICAgICRzY29wZS5nYW1lSWQgPSByb29tLmlkO1xuICAgICAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMgPSByb29tLnVzZXJzLmZpbHRlcih1c2VyID0+IHVzZXIuaWQgIT09ICRzY29wZS51c2VyLmlkKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzLmZvckVhY2gocGxheWVyID0+IHsgcGxheWVyLnNjb3JlID0gMCB9KTtcbiAgICAgICAgICAgICAgICBMb2JieUZhY3Rvcnkuam9pbkdhbWUocm9vbS5pZCwgJHNjb3BlLnVzZXIuaWQpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgXSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIFNvY2tldC5lbWl0KCdqb2luUm9vbScsICRzY29wZS51c2VyLCAkc2NvcGUucm9vbU5hbWUsICRzY29wZS5nYW1lSWQpO1xuICAgICAgICAgICAgJHNjb3BlLmhpZGVTdGFydCA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdlbWl0dGluZyBcImpvaW4gcm9vbVwiIGV2ZW50IHRvIHNlcnZlciA4UCcsICRzY29wZS5yb29tTmFtZSk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2Vycm9yIGdyYWJiaW5nIHVzZXIgb3Igcm9vbSBmcm9tIGRiOiAnLCBlKTtcbiAgICAgICAgfSk7XG5cblxuICAgICAgICBTb2NrZXQub24oJ3Jvb21Kb2luU3VjY2VzcycsIGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCduZXcgdXNlciBqb2luaW5nJywgdXNlci5pZCk7XG4gICAgICAgICAgICB1c2VyLnNjb3JlID0gMDtcbiAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMucHVzaCh1c2VyKTtcbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCdzdGFydEJvYXJkJywgZnVuY3Rpb24oYm9hcmQpIHtcbiAgICAgICAgICAgICRzY29wZS5mcmVlemUgPSBmYWxzZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdib2FyZCEgJywgYm9hcmQpO1xuICAgICAgICAgICAgJHNjb3BlLmJvYXJkID0gYm9hcmQ7XG4gICAgICAgICAgICAvLyBzZXRJbnRlcnZhbChmdW5jdGlvbigpe1xuICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVycy5mb3JFYWNoKHBsYXllciA9PiB7IHBsYXllci5zY29yZSA9IDAgfSk7XG4gICAgICAgICAgICAkc2NvcGUuc2NvcmUgPSAwO1xuICAgICAgICAgICAgJHNjb3BlLmhpZGVCb2FyZCA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLm1lc3NhZ2UgPSAnJztcbiAgICAgICAgICAgICRzY29wZS53aW5Pckxvc2U9bnVsbDtcbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgICAgICAvLyB9LCAzMDAwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCd3b3JkVmFsaWRhdGVkJywgZnVuY3Rpb24odXBkYXRlT2JqKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnd29yZCBpcyB2YWxpZGF0ZWQnKTtcbiAgICAgICAgICAgICRzY29wZS51cGRhdGUodXBkYXRlT2JqKTtcbiAgICAgICAgICAgICRzY29wZS5sYXN0V29yZFBsYXllZCA9IHVwZGF0ZU9iai53b3JkO1xuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCdib2FyZFNodWZmbGVkJywgZnVuY3Rpb24oYm9hcmQsIHVzZXJJZCwgc3RhdGVOdW1iZXIpIHtcbiAgICAgICAgICAgICRzY29wZS5ib2FyZCA9IGJvYXJkO1xuICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZVNjb3JlKC01LCB1c2VySWQpO1xuICAgICAgICAgICAgJHNjb3BlLmNsZWFyKCk7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy5zdGF0ZU51bWJlciA9IHN0YXRlTnVtYmVyO1xuICAgICAgICAgICAgJHNjb3BlLm1lc3NhZ2UgPSB1c2VySWQgKyBcIiBzaHVmZmxlZCB0aGUgYm9hcmQhXCI7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygkc2NvcGUubWVzc2FnZSk7XG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICBTb2NrZXQub24oJ3BsYXllckRpc2Nvbm5lY3RlZCcsIGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwbGF5ZXJEaXNjb25uZWN0ZWQnLCB1c2VyLmlkKTtcbiAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMgPSAkc2NvcGUub3RoZXJQbGF5ZXJzLmZpbHRlcihvdGhlclBsYXllciA9PiBvdGhlclBsYXllci5pZCAhPT0gdXNlci5pZCk7XG5cbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIFNvY2tldC5vbignZ2FtZU92ZXInLCBmdW5jdGlvbih3aW5uZXJzQXJyYXkpIHtcbiAgICAgICAgICAgICRzY29wZS5jbGVhcigpO1xuICAgICAgICAgICAgJHNjb3BlLmZyZWV6ZSA9IHRydWU7XG4gICAgICAgICAgICAkc2NvcGUuZGV0ZXJtaW5lV2lubmVyKHdpbm5lcnNBcnJheSk7XG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2dhbWUgaXMgb3Zlciwgd2lubmVyczogJywgd2lubmVyc0FycmF5KTtcbiAgICAgICAgfSk7XG4gICAgLy8gfSk7XG5cbiAgICAvLyBpZiAoISRzY29wZS5jb25uZWN0ZWQpIHtcbiAgICAvLyAgICAgY29uc29sZS5sb2coJ2Nvbm5lY3QgbWFudWFsbHknKVxuICAgIC8vICAgICAgU29ja2V0LmNvbm5lY3QoKTtcbiAgICAvLyB9XG59KTtcbiIsImFwcC5mYWN0b3J5IChcIkJvYXJkRmFjdG9yeVwiLCBmdW5jdGlvbigkaHR0cCwgU29ja2V0KXtcblx0cmV0dXJue1xuXHRcdGdldFN0YXJ0Qm9hcmQ6IGZ1bmN0aW9uKGdhbWVMZW5ndGgsIGdhbWVJZCwgdXNlcklkcyl7XG5cdFx0XHRjb25zb2xlLmxvZygnZmFjdG9yeS4gZ2w6ICcsIGdhbWVMZW5ndGgpO1xuXHRcdFx0U29ja2V0LmVtaXQoJ2dldFN0YXJ0Qm9hcmQnLCBnYW1lTGVuZ3RoLCBnYW1lSWQsIHVzZXJJZHMpO1xuXHRcdH0sXG5cblx0XHRzdWJtaXQ6IGZ1bmN0aW9uKG9iail7XG5cdFx0XHRTb2NrZXQuZW1pdCgnc3VibWl0V29yZCcsIG9iaik7XG5cdFx0fSxcblxuXHRcdHNodWZmbGU6IGZ1bmN0aW9uKHVzZXIpe1xuXHRcdFx0Y29uc29sZS5sb2coJ2dyaWRmYWN0b3J5IHUnLHVzZXIuaWQpO1xuXHRcdFx0U29ja2V0LmVtaXQoJ3NodWZmbGVCb2FyZCcsdXNlci5pZCk7XG5cdFx0fSxcblxuXHRcdC8vIGZpbmRBbGxPdGhlclVzZXJzOiBmdW5jdGlvbihnYW1lKSB7XG5cdFx0Ly8gXHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2dhbWVzLycrIGdhbWUuaWQpXG5cdFx0Ly8gXHQudGhlbihyZXMgPT4gcmVzLmRhdGEpXG5cdFx0Ly8gfSxcblxuXHRcdGdldEN1cnJlbnRSb29tOiBmdW5jdGlvbihyb29tbmFtZSkge1xuXHRcdFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS9nYW1lcy9yb29tcy8nK3Jvb21uYW1lKVxuXHRcdFx0LnRoZW4ocmVzID0+IHJlcy5kYXRhKVxuXHRcdH0sXG5cblx0XHRxdWl0RnJvbVJvb206IGZ1bmN0aW9uKGdhbWVJZCwgdXNlcklkKSB7XG5cdFx0XHQvLyBTb2NrZXQuZW1pdCgnZGlzY29ubmVjdCcsIHJvb21OYW1lLCB1c2VySWQpO1xuXHRcdFx0cmV0dXJuICRodHRwLmRlbGV0ZSgnL2FwaS9nYW1lcy8nK2dhbWVJZCsnLycrdXNlcklkKVxuXHRcdH1cblx0fVxufSk7XG4iLCJhcHAuY29udHJvbGxlcignSG9tZUN0cmwnLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZSwgJGxvY2F0aW9uKXtcbiAgJHNjb3BlLmVudGVyTG9iYnkgPSBmdW5jdGlvbigpe1xuICAgICRzdGF0ZS5nbygnbG9iYnknLCB7cmVsb2FkOiB0cnVlfSk7XG4gIH1cbn0pO1xuXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdob21lJywge1xuICAgICAgICB1cmw6ICcvJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ob21lL2hvbWUuaHRtbCdcbiAgICB9KTtcbn0pO1xuXG4iLCJhcHAuY29udHJvbGxlcignTGVhZGVyQm9hcmRDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBMZWFkZXJCb2FyZEZhY3RvcnksICRzdGF0ZSwgQXV0aFNlcnZpY2UpIHtcbiAgICBjb25zb2xlLmxvZygnIDEnKVxuICAgIExlYWRlckJvYXJkRmFjdG9yeS5BbGxQbGF5ZXJzKClcbiAgICAudGhlbihwbGF5ZXJzID0+IHtcbiAgICAgICAgcGxheWVycy5mb3JFYWNoKHBsYXllciA9PiB7XG4gICAgICAgICAgICBpZiAocGxheWVyLmdhbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgc2NvcmVzID0gcGxheWVyLmdhbWVzLm1hcChnYW1lID0+IGdhbWUudXNlckdhbWUuc2NvcmUpXG4gICAgICAgICAgICAgICAgcGxheWVyLmhpZ2hlc3RTY29yZSA9IE1hdGgubWF4KC4uLnNjb3JlcylcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGxheWVyLmhpZ2hlc3RTY29yZSA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwbGF5ZXIuZ2FtZXNfd29uID0gcGxheWVyLndpbm5lci5sZW5ndGg7XG4gICAgICAgICAgICBwbGF5ZXIuZ2FtZXNfcGxheWVkID0gcGxheWVyLmdhbWVzLmxlbmd0aDtcbiAgICAgICAgICAgIGlmKHBsYXllci5nYW1lcy5sZW5ndGg9PT0wKXtcbiAgICAgICAgICAgIFx0cGxheWVyLndpbl9wZXJjZW50YWdlID0gMCArICclJ1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFx0cGxheWVyLndpbl9wZXJjZW50YWdlID0gKChwbGF5ZXIud2lubmVyLmxlbmd0aC9wbGF5ZXIuZ2FtZXMubGVuZ3RoKSoxMDApLnRvRml4ZWQoMCkgKyAnJSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSlcbiAgICAgICAgJHNjb3BlLnBsYXllcnMgPSBwbGF5ZXJzO1xuICAgIH0pXG59KTtcbiIsImFwcC5mYWN0b3J5KCdMZWFkZXJCb2FyZEZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHApIHtcblx0dmFyIExlYWRlckJvYXJkRmFjdG9yeSA9IHt9O1xuXG5cdExlYWRlckJvYXJkRmFjdG9yeS5BbGxQbGF5ZXJzID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS91c2VycycpXG5cdFx0LnRoZW4ocmVzPT5yZXMuZGF0YSlcblx0fVxuXG5cdHJldHVybiBMZWFkZXJCb2FyZEZhY3Rvcnk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbGVhZGVyQm9hcmQnLCB7XG4gICAgICAgIHVybDogJy9sZWFkZXJCb2FyZCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbGVhZGVyQm9hcmQvbGVhZGVyQm9hcmQudGVtcGxhdGUuaHRtbCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgXHRhbGxQbGF5ZXJzOiBmdW5jdGlvbihMZWFkZXJCb2FyZEZhY3RvcnkpIHtcbiAgICAgICAgXHRcdHJldHVybiBMZWFkZXJCb2FyZEZhY3RvcnkuQWxsUGxheWVycztcbiAgICAgICAgXHR9LFxuICAgICAgICAgICAgXG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMZWFkZXJCb2FyZEN0cmwnXG4gICAgfSk7XG5cbn0pOyIsImFwcC5jb250cm9sbGVyKCdMb2JieUN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIExvYmJ5RmFjdG9yeSwgcm9vbXMsICRzdGF0ZSwgQXV0aFNlcnZpY2UpIHtcblxuICAgIC8vIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpXG4gICAgLy8gICAgIC50aGVuKGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAvLyAgICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcbiAgICAvLyAgICAgfSk7XG5cbiAgICAkc2NvcGUucm9vbXMgPSByb29tcztcbiAgICAkc2NvcGUucm9vbU5hbWVGb3JtID0gZmFsc2U7XG4gICAgLy8gJHNjb3BlLnVzZXIgPSB7XG4gICAgLy8gIGlkOiAzXG4gICAgLy8gfVxuXG4gICAgLy8gJHNjb3BlLmpvaW5HYW1lID0gZnVuY3Rpb24ocm9vbSkge1xuICAgIC8vICAgICBjb25zb2xlLmxvZyhcImltIGNoYW5naW5nIHN0YXRlIGFuZCByZWxvYWRpbmdcIik7XG4gICAgLy8gICAgICRzdGF0ZS5nbygnR2FtZScsIHsgcm9vbW5hbWU6IHJvb20ucm9vbW5hbWUgfSwgeyByZWxvYWQ6IHRydWUsIG5vdGlmeTogdHJ1ZSB9KVxuICAgIC8vIH07XG5cbiAgICAkc2NvcGUubmV3Um9vbSA9IGZ1bmN0aW9uKHJvb21JbmZvKSB7XG4gICAgICAgIExvYmJ5RmFjdG9yeS5uZXdHYW1lKHJvb21JbmZvKTtcbiAgICAgICAgJHNjb3BlLnJvb21OYW1lRm9ybSA9IGZhbHNlO1xuICAgIH07XG4gICAgJHNjb3BlLnNob3dGb3JtID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5yb29tTmFtZUZvcm0gPSB0cnVlO1xuICAgIH07XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnZW50ZXJMb2JieScsIGZ1bmN0aW9uKCl7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvYmJ5L2xvYmJ5LWJ1dHRvbi5odG1sJyxcbiAgICBjb250cm9sbGVyOiAnSG9tZUN0cmwnXG4gIH1cbn0pXG4iLCJhcHAuZmFjdG9yeSgnTG9iYnlGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG5cdHZhciBMb2JieUZhY3RvcnkgPSB7fTtcblx0dmFyIHRlbXBSb29tcyA9IFtdOyAvL3dvcmsgd2l0aCBzb2NrZXQ/XG5cblx0TG9iYnlGYWN0b3J5LmdldEFsbFJvb21zID0gZnVuY3Rpb24oKXtcblx0XHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2dhbWVzL3Jvb21zJylcblx0XHQudGhlbihyZXMgPT4gcmVzLmRhdGEpXG5cdFx0LnRoZW4ocm9vbXMgPT4ge1xuXHRcdFx0YW5ndWxhci5jb3B5KHJvb21zLCB0ZW1wUm9vbXMpO1xuXHRcdFx0cmV0dXJuIHRlbXBSb29tcztcblx0XHR9KVxuXHR9O1xuXG5cdExvYmJ5RmFjdG9yeS5qb2luR2FtZSA9IGZ1bmN0aW9uKHJvb21JZCwgdXNlcklkKSB7XG4gICAgY29uc29sZS5sb2coJ2xvYmJ5IGZhY3Rvcnkgam9pbiBnYW1lJyk7XG5cdFx0cmV0dXJuICRodHRwLnB1dCgnL2FwaS9nYW1lcy8nKyByb29tSWQgKycvcGxheWVyJywge2lkOiB1c2VySWR9KVxuXHRcdC50aGVuKHJlcz0+cmVzLmRhdGEpXG5cdH07XG5cblx0TG9iYnlGYWN0b3J5Lm5ld0dhbWUgPSBmdW5jdGlvbihyb29tSW5mbykge1xuXHRcdHJldHVybiAkaHR0cC5wdXQoJy9hcGkvZ2FtZXMnLCByb29tSW5mbylcblx0XHQudGhlbihyZXMgPT4gcmVzLmRhdGEpXG5cdCBcdC50aGVuKHJvb20gPT4ge1xuXHQgXHRcdHRlbXBSb29tcy5wdXNoKHJvb20pO1xuXHQgXHRcdHJldHVybiByb29tO1xuXHQgXHRcdH0pO1xuXHR9O1xuXG5cdExvYmJ5RmFjdG9yeS5BbGxQbGF5ZXJzID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS91c2VycycpXG5cdFx0LnRoZW4ocmVzPT5yZXMuZGF0YSlcblx0fTtcblxuXHRyZXR1cm4gTG9iYnlGYWN0b3J5O1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvYmJ5Jywge1xuICAgICAgICB1cmw6ICcvbG9iYnknLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvYmJ5L2xvYmJ5LnRlbXBsYXRlLmh0bWwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgIFx0cm9vbXM6IGZ1bmN0aW9uKExvYmJ5RmFjdG9yeSkge1xuICAgICAgICBcdFx0cmV0dXJuIExvYmJ5RmFjdG9yeS5nZXRBbGxSb29tcygpO1xuICAgICAgICBcdH1cbiAgICAgICAgfSxcbiAgICAgICAgY29udHJvbGxlcjogJ0xvYmJ5Q3RybCdcbiAgICB9KTtcblxufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsb2dpbicsIHtcbiAgICAgICAgdXJsOiAnL2xvZ2luJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2dpbi9sb2dpbi5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0xvZ2luQ3RybCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAkc2NvcGUubG9naW4gPSB7fTtcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uIChsb2dpbkluZm8pIHtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ2luKGxvZ2luSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbWVtYmVyc09ubHknLCB7XG4gICAgICAgIHVybDogJy9tZW1iZXJzLWFyZWEnLFxuICAgICAgICB0ZW1wbGF0ZTogJzxpbWcgbmctcmVwZWF0PVwiaXRlbSBpbiBzdGFzaFwiIHdpZHRoPVwiMzAwXCIgbmctc3JjPVwie3sgaXRlbSB9fVwiIC8+JyxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24gKCRzY29wZSwgU2VjcmV0U3Rhc2gpIHtcbiAgICAgICAgICAgIFNlY3JldFN0YXNoLmdldFN0YXNoKCkudGhlbihmdW5jdGlvbiAoc3Rhc2gpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc3Rhc2ggPSBzdGFzaDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGRhdGEuYXV0aGVudGljYXRlIGlzIHJlYWQgYnkgYW4gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgLy8gdGhhdCBjb250cm9scyBhY2Nlc3MgdG8gdGhpcyBzdGF0ZS4gUmVmZXIgdG8gYXBwLmpzLlxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBhdXRoZW50aWNhdGU6IHRydWVcbiAgICAgICAgfVxuICAgIH0pO1xuXG59KTtcblxuYXBwLmZhY3RvcnkoJ1NlY3JldFN0YXNoJywgZnVuY3Rpb24gKCRodHRwKSB7XG5cbiAgICB2YXIgZ2V0U3Rhc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvbWVtYmVycy9zZWNyZXQtc3Rhc2gnKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRTdGFzaDogZ2V0U3Rhc2hcbiAgICB9O1xuXG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ3JhbmtEaXJlY3RpdmUnLCAoKT0+IHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0UnLFxuXHRcdHNjb3BlOiB7XG5cdFx0XHRyYW5rTmFtZTogJ0AnLFxuXHRcdFx0cGxheWVyczogJz0nLFxuXHRcdFx0cmFua0J5OiAnQCcsXG5cdFx0XHRvcmRlcjogJ0AnXG5cdFx0fSxcblx0XHR0ZW1wbGF0ZVVybDogJy9qcy9yYW5rL3JhbmsudGVtcGxhdGUuaHRtbCdcblx0fVxufSk7IiwiYXBwLmZhY3RvcnkoJ1NpZ251cEZhY3RvcnknLCBmdW5jdGlvbigkaHR0cCwgJHN0YXRlLCBBdXRoU2VydmljZSkge1xuXHRjb25zdCBTaWdudXBGYWN0b3J5ID0ge307XG5cblx0U2lnbnVwRmFjdG9yeS5jcmVhdGVVc2VyID0gZnVuY3Rpb24oc2lnbnVwSW5mbykge1xuXHRcdGNvbnNvbGUubG9nKHNpZ251cEluZm8pXG5cdFx0cmV0dXJuICRodHRwLnBvc3QoJy9zaWdudXAnLCBzaWdudXBJbmZvKVxuXHRcdC50aGVuKHJlcyA9PiB7XG5cdFx0XHRpZiAocmVzLnN0YXR1cyA9PT0gMjAxKSB7XG5cdFx0XHRcdEF1dGhTZXJ2aWNlLmxvZ2luKHtlbWFpbDogc2lnbnVwSW5mby5lbWFpbCwgcGFzc3dvcmQ6IHNpZ251cEluZm8ucGFzc3dvcmR9KVxuXHRcdFx0XHQudGhlbih1c2VyID0+IHtcblx0XHRcdFx0XHQkc3RhdGUuZ28oJ2hvbWUnKVxuXHRcdFx0XHR9KVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhyb3cgRXJyb3IoJ0FuIGFjY291bnQgd2l0aCB0aGF0IGVtYWlsIGFscmVhZHkgZXhpc3RzJyk7XG5cdFx0XHR9XG5cdFx0fSlcblx0fVxuXG5cdHJldHVybiBTaWdudXBGYWN0b3J5O1xufSkiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3NpZ251cCcsIHtcbiAgICAgICAgdXJsOiAnL3NpZ251cCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvc2lnbnVwL3NpZ251cC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1NpZ251cEN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignU2lnbnVwQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUsIFNpZ251cEZhY3RvcnkpIHtcblxuICAgICRzY29wZS5zaWdudXAgPSB7fTtcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgJHNjb3BlLnNlbmRTaWdudXAgPSBmdW5jdGlvbihzaWdudXBJbmZvKXtcbiAgICAgICAgU2lnbnVwRmFjdG9yeS5jcmVhdGVVc2VyKHNpZ251cEluZm8pXG4gICAgICAgIC5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnQW4gYWNjb3VudCB3aXRoIHRoYXQgZW1haWwgYWxyZWFkeSBleGlzdHMnO1xuICAgICAgICB9KVxuICAgIH1cbiAgICBcblxuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpe1xuXHQkc3RhdGVQcm92aWRlci5zdGF0ZShcIlVzZXJQcm9maWxlXCIse1xuXHRcdHVybDogXCIvdXNlcnMvOnVzZXJJZFwiLFxuXHRcdHRlbXBsYXRlVXJsOlwianMvdXNlcl9wcm9maWxlL3Byb2ZpbGUudGVtcGxhdGUuaHRtbFwiLFxuXHRcdGNvbnRyb2xsZXI6IFwiVXNlckN0cmxcIlxuXHR9KVxuXHQkc3RhdGVQcm92aWRlci5zdGF0ZShcIkdhbWVSZWNvcmRcIiwge1xuXHRcdHVybDpcIi91c2Vycy86dXNlcklkL2dhbWVzXCIsXG5cdFx0dGVtcGxhdGVVcmw6IFwianMvdXNlcl9wcm9maWxlL2dhbWVzLmh0bWxcIixcblx0XHRjb250cm9sbGVyOiBcIkdhbWVSZWNvcmRDdHJsXCJcblx0fSlcbn0pXG5cbmFwcC5jb250cm9sbGVyKFwiVXNlckN0cmxcIiwgZnVuY3Rpb24oJHNjb3BlLCBVc2VyRmFjdG9yeSwgJHN0YXRlUGFyYW1zKXtcblx0VXNlckZhY3RvcnkuZmV0Y2hJbmZvcm1hdGlvbigkc3RhdGVQYXJhbXMudXNlcklkKVxuXHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0XHQkc2NvcGUudXNlcj11c2VyO1xuXHRcdHJldHVybiB1c2VyXG5cdH0pXG5cdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHRcdCRzY29wZS51cGRhdGVkPSRzY29wZS51c2VyLnVwZGF0ZWRBdC5nZXREYXkoKTtcblx0fSlcbn0pXG5cbmFwcC5jb250cm9sbGVyKFwiR2FtZVJlY29yZEN0cmxcIixmdW5jdGlvbigkc2NvcGUsIFVzZXJGYWN0b3J5LCAkc3RhdGVQYXJhbXMpe1xuXHRVc2VyRmFjdG9yeS5mZXRjaEluZm9ybWF0aW9uKCRzdGF0ZVBhcmFtcy51c2VySWQpXG5cdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHRcdCRzY29wZS51c2VyPXVzZXI7XG5cdH0pXG5cdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHRVc2VyRmFjdG9yeS5mZXRjaEdhbWVzKCRzdGF0ZVBhcmFtcy51c2VySWQpXG5cdH0pXG5cdC50aGVuKGZ1bmN0aW9uKGdhbWVzKXtcblx0XHQkc2NvcGUuZ2FtZXM9Z2FtZXM7XG5cdH0pXG59KSIsImFwcC5mYWN0b3J5KFwiVXNlckZhY3RvcnlcIiwgZnVuY3Rpb24oJGh0dHApe1xuXHRyZXR1cm4ge1xuXHRcdGZldGNoSW5mb3JtYXRpb246IGZ1bmN0aW9uKGlkKXtcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoXCIvYXBpL3VzZXJzL1wiK2lkKVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG5cdFx0XHRcdHJldHVybiB1c2VyLmRhdGE7XG5cdFx0XHR9KVxuXHRcdH0sXG5cdFx0ZmV0Y2hHYW1lczogZnVuY3Rpb24oaWQpe1xuXHRcdFx0cmV0dXJuICRodHRwLmdldChcIi9hcGkvdXNlcnMvXCIraWQrXCIvZ2FtZXNcIilcblx0XHRcdC50aGVuKGZ1bmN0aW9uKGdhbWVzKXtcblx0XHRcdFx0cmV0dXJuIGdhbWVzLmRhdGE7XG5cdFx0XHR9KVxuXHRcdH1cblx0fVxufSkiLCJhcHAuZGlyZWN0aXZlKFwidGltZXJcIiwgZnVuY3Rpb24oJHEsICRpbnRlcnZhbCwgU29ja2V0KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIHRpbWU6ICc9J1xuICAgICAgICB9LFxuICAgICAgICB0ZW1wbGF0ZVVybDogXCJqcy9jb21tb24vZGlyZWN0aXZlcy90aW1lci90aW1lci5odG1sXCIsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgICAgICB2YXIgdGltZSA9IHNjb3BlLnRpbWU7XG4gICAgICAgICAgICB2YXIgc3RhcnQ9c2NvcGUudGltZTtcbiAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gY29udmVydCh0aW1lKTtcbiAgICAgICAgICAgIHNjb3BlLmNvdW50ZG93biA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciB0aW1lciA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgdGltZSAtPSAxO1xuICAgICAgICAgICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IGNvbnZlcnQodGltZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aW1lIDwgMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBcIlRpbWUgdXAhXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKHRpbWVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWU9c3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIHNjb3BlLm1lc3NhZ2VzID0gW1wiR2V0IFJlYWR5IVwiLCBcIkdldCBTZXQhXCIsIFwiR28hXCIsICcvJ107XG4gICAgICAgICAgICAvLyAgICAgdmFyIGluZGV4ID0gMDtcbiAgICAgICAgICAgIC8vICAgICB2YXIgcHJlcGFyZSA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBzY29wZS5tZXNzYWdlc1tpbmRleF07XG4gICAgICAgICAgICAvLyAgICAgICAgIGluZGV4Kys7XG4gICAgICAgICAgICAvLyAgICAgICAgIGNvbnNvbGUubG9nKHNjb3BlLnRpbWVfcmVtYWluaW5nKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgaWYgKHNjb3BlLnRpbWVfcmVtYWluaW5nID09PSBcIi9cIikge1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBjb252ZXJ0KHRpbWUpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbChwcmVwYXJlKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIHZhciB0aW1lciA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICB0aW1lIC09IDE7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBjb252ZXJ0KHRpbWUpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgIGlmICh0aW1lIDwgMSkge1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IFwiVGltZSB1cCFcIjtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbCh0aW1lcik7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gICAgICAgICAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICAvLyAgICAgICAgIH1cbiAgICAgICAgICAgIC8vICAgICB9LCAxMDAwKTtcbiAgICAgICAgICAgIC8vIH07XG5cbiAgICAgICAgICAgIFNvY2tldC5vbignc3RhcnRCb2FyZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLmNvdW50ZG93bih0aW1lKTtcbiAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGNvbnZlcnQodGltZSkge1xuICAgICAgICAgICAgICAgIHZhciBzZWNvbmRzID0gKHRpbWUgJSA2MCkudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICB2YXIgY29udmVyc2lvbiA9IChNYXRoLmZsb29yKHRpbWUgLyA2MCkpICsgJzonO1xuICAgICAgICAgICAgICAgIGlmIChzZWNvbmRzLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udmVyc2lvbiArPSAnMCcgKyBzZWNvbmRzO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnZlcnNpb24gKz0gc2Vjb25kcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnZlcnNpb247XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdob21lJyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdZb3VyIFByb2ZpbGUnLCBzdGF0ZTogJ1VzZXJQcm9maWxlJywgYXV0aDogdHJ1ZSB9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcblxuICAgICAgICAgICAgc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UubG9nb3V0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHJlbW92ZVVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzZXRVc2VyKCk7XG5cbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0VXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCByZW1vdmVVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCByZW1vdmVVc2VyKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG59KTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
>>>>>>> master
