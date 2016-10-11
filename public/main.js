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

        console.log('changestate close', $scope.user.id);

        Socket.emit('leaveRoom');
    });

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiZ2FtZS1zdGF0ZS9ncmlkLmNvbnRyb2xsZXIuanMiLCJnYW1lLXN0YXRlL2dyaWQuZmFjdG9yeS5qcyIsImhvbWUvaG9tZS5jb250cm9sbGVyLmpzIiwiaG9tZS9ob21lLmpzIiwibGVhZGVyQm9hcmQvbGVhZGVyQm9hcmQuY29udHJvbGxlci5qcyIsImxlYWRlckJvYXJkL2xlYWRlckJvYXJkLmZhY3RvcnkuanMiLCJsZWFkZXJCb2FyZC9sZWFkZXJCb2FyZC5zdGF0ZS5qcyIsImxvYmJ5L2xvYmJ5LmNvbnRyb2xsZXIuanMiLCJsb2JieS9sb2JieS5kaXJlY3RpdmUuanMiLCJsb2JieS9sb2JieS5mYWN0b3J5LmpzIiwibG9iYnkvbG9iYnkuc3RhdGUuanMiLCJsb2dpbi9sb2dpbi5qcyIsIm1lbWJlcnMtb25seS9tZW1iZXJzLW9ubHkuanMiLCJyYW5rL3JhbmsuZGlyZWN0aXZlLmpzIiwic2lnbnVwL3NpZ251cC5mYWN0b3J5LmpzIiwic2lnbnVwL3NpZ251cC5qcyIsInVzZXJfcHJvZmlsZS9wcm9maWxlLmNvbnRyb2xsZXIuanMiLCJ1c2VyX3Byb2ZpbGUvcHJvZmlsZS5mYWN0b3J5LmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3RpbWVyL3RpbWVyLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsImFwcCIsImFuZ3VsYXIiLCJtb2R1bGUiLCJjb25maWciLCIkdXJsUm91dGVyUHJvdmlkZXIiLCIkbG9jYXRpb25Qcm92aWRlciIsImh0bWw1TW9kZSIsIm90aGVyd2lzZSIsIndoZW4iLCJsb2NhdGlvbiIsInJlbG9hZCIsInJ1biIsIiRyb290U2NvcGUiLCIkb24iLCJldmVudCIsInRvU3RhdGUiLCJ0b1BhcmFtcyIsImZyb21TdGF0ZSIsImZyb21QYXJhbXMiLCJ0aHJvd25FcnJvciIsImNvbnNvbGUiLCJpbmZvIiwibmFtZSIsImVycm9yIiwiQXV0aFNlcnZpY2UiLCIkc3RhdGUiLCJkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoIiwic3RhdGUiLCJkYXRhIiwiYXV0aGVudGljYXRlIiwiaXNBdXRoZW50aWNhdGVkIiwicHJldmVudERlZmF1bHQiLCJnZXRMb2dnZWRJblVzZXIiLCJ0aGVuIiwidXNlciIsImdvIiwiRXJyb3IiLCJmYWN0b3J5IiwiaW8iLCJvcmlnaW4iLCJjb25zdGFudCIsImxvZ2luU3VjY2VzcyIsImxvZ2luRmFpbGVkIiwibG9nb3V0U3VjY2VzcyIsInNlc3Npb25UaW1lb3V0Iiwibm90QXV0aGVudGljYXRlZCIsIm5vdEF1dGhvcml6ZWQiLCIkcSIsIkFVVEhfRVZFTlRTIiwic3RhdHVzRGljdCIsInJlc3BvbnNlRXJyb3IiLCJyZXNwb25zZSIsIiRicm9hZGNhc3QiLCJzdGF0dXMiLCJyZWplY3QiLCIkaHR0cFByb3ZpZGVyIiwiaW50ZXJjZXB0b3JzIiwicHVzaCIsIiRpbmplY3RvciIsImdldCIsInNlcnZpY2UiLCIkaHR0cCIsIlNlc3Npb24iLCJvblN1Y2Nlc3NmdWxMb2dpbiIsImNyZWF0ZSIsImZyb21TZXJ2ZXIiLCJjYXRjaCIsImxvZ2luIiwiY3JlZGVudGlhbHMiLCJwb3N0IiwibWVzc2FnZSIsImxvZ291dCIsImRlc3Ryb3kiLCJzZWxmIiwiJHN0YXRlUHJvdmlkZXIiLCJ1cmwiLCJ0ZW1wbGF0ZVVybCIsImNvbnRyb2xsZXIiLCIkc2NvcGUiLCJCb2FyZEZhY3RvcnkiLCJTb2NrZXQiLCIkc3RhdGVQYXJhbXMiLCJMb2JieUZhY3RvcnkiLCJyb29tTmFtZSIsInJvb21uYW1lIiwiaGlkZVN0YXJ0Iiwib3RoZXJQbGF5ZXJzIiwiZ2FtZUxlbmd0aCIsImV4cG9ydHMiLCJ3b3JkT2JqIiwid29yZCIsInBsYXllcklkIiwic3RhdGVOdW1iZXIiLCJwb2ludHNFYXJuZWQiLCJtb3VzZUlzRG93biIsImRyYWdnaW5nQWxsb3dlZCIsInN0eWxlIiwiZnJlZXplIiwid2luT3JMb3NlIiwidGltZW91dCIsImhpZGVOYXZiYXIiLCJjaGVja1NlbGVjdGVkIiwiaWQiLCJ0b2dnbGVEcmFnIiwibW91c2VEb3duIiwibW91c2VVcCIsImxlbmd0aCIsInN1Ym1pdCIsImRyYWciLCJzcGFjZSIsImNsaWNrIiwiaGlkZUJvYXJkIiwic3RhcnRHYW1lIiwidXNlcklkcyIsIm1hcCIsImxvZyIsImdldFN0YXJ0Qm9hcmQiLCJnYW1lSWQiLCJxdWl0IiwiYm9hcmQiLCJzaXplIiwic2NvcmUiLCJsdHJzU2VsZWN0ZWQiLCJPYmplY3QiLCJrZXlzIiwicHJldmlvdXNMdHIiLCJsYXN0THRyIiwidmFsaWRTZWxlY3QiLCJzdWJzdHJpbmciLCJsdHJJZCIsIm90aGVyTHRyc0lkcyIsImluY2x1ZGVzIiwiY29vcmRzIiwic3BsaXQiLCJyb3ciLCJjb2wiLCJsYXN0THRySWQiLCJwb3AiLCJjb29yZHNMYXN0Iiwicm93TGFzdCIsImNvbExhc3QiLCJyb3dPZmZzZXQiLCJNYXRoIiwiYWJzIiwiY29sT2Zmc2V0IiwiY2xlYXJJZkNvbmZsaWN0aW5nIiwidXBkYXRlV29yZE9iaiIsImV4cG9ydFdvcmRPYmoiLCJ0aWxlc01vdmVkIiwibXlXb3JkVGlsZXMiLCJzb21lIiwiY29vcmQiLCJjbGVhciIsIm9iaiIsInNodWZmbGUiLCJ1cGRhdGVCb2FyZCIsImtleSIsInVwZGF0ZVNjb3JlIiwicG9pbnRzIiwicGxheWVyIiwidXBkYXRlIiwidXBkYXRlT2JqIiwidXNlcm5hbWUiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwiJGV2YWxBc3luYyIsInJlcGxheSIsIm5ld0dhbWUiLCJnYW1lIiwiYWxsSWRzIiwiYWxsIiwiam9pbkdhbWUiLCJlIiwiZGV0ZXJtaW5lV2lubmVyIiwid2lubmVyc0FycmF5Iiwid2lubmVyIiwid2lubmVycyIsImkiLCJlbWl0IiwiZ2V0Q3VycmVudFJvb20iLCJyb29tIiwidXNlcnMiLCJmaWx0ZXIiLCJmb3JFYWNoIiwib24iLCJsYXN0V29yZFBsYXllZCIsInVzZXJJZCIsIm90aGVyUGxheWVyIiwicmVzIiwicXVpdEZyb21Sb29tIiwiZGVsZXRlIiwiJGxvY2F0aW9uIiwiZW50ZXJMb2JieSIsIkxlYWRlckJvYXJkRmFjdG9yeSIsIkFsbFBsYXllcnMiLCJwbGF5ZXJzIiwiZ2FtZXMiLCJzY29yZXMiLCJ1c2VyR2FtZSIsImhpZ2hlc3RTY29yZSIsIm1heCIsImdhbWVzX3dvbiIsImdhbWVzX3BsYXllZCIsIndpbl9wZXJjZW50YWdlIiwidG9GaXhlZCIsInJlc29sdmUiLCJhbGxQbGF5ZXJzIiwicm9vbXMiLCJyb29tTmFtZUZvcm0iLCJuZXdSb29tIiwicm9vbUluZm8iLCJzaG93Rm9ybSIsImRpcmVjdGl2ZSIsInJlc3RyaWN0IiwidGVtcFJvb21zIiwiZ2V0QWxsUm9vbXMiLCJjb3B5Iiwicm9vbUlkIiwicHV0Iiwic2VuZExvZ2luIiwibG9naW5JbmZvIiwidGVtcGxhdGUiLCJTZWNyZXRTdGFzaCIsImdldFN0YXNoIiwic3Rhc2giLCJzY29wZSIsInJhbmtOYW1lIiwicmFua0J5Iiwib3JkZXIiLCJTaWdudXBGYWN0b3J5IiwiY3JlYXRlVXNlciIsInNpZ251cEluZm8iLCJlbWFpbCIsInBhc3N3b3JkIiwic2lnbnVwIiwic2VuZFNpZ251cCIsIlVzZXJGYWN0b3J5IiwiZmV0Y2hJbmZvcm1hdGlvbiIsInVwZGF0ZWQiLCJ1cGRhdGVkQXQiLCJnZXREYXkiLCJmZXRjaEdhbWVzIiwibGluayIsIml0ZW1zIiwibGFiZWwiLCJhdXRoIiwiaXNMb2dnZWRJbiIsInNldFVzZXIiLCJyZW1vdmVVc2VyIiwiJGludGVydmFsIiwidGltZSIsInN0YXJ0IiwidGltZV9yZW1haW5pbmciLCJjb252ZXJ0IiwiY291bnRkb3duIiwidGltZXIiLCJjYW5jZWwiLCJzZWNvbmRzIiwidG9TdHJpbmciLCJjb252ZXJzaW9uIiwiZmxvb3IiXSwibWFwcGluZ3MiOiJBQUFBOzs7O0FBQ0FBLE9BQUFDLEdBQUEsR0FBQUMsUUFBQUMsTUFBQSxDQUFBLHVCQUFBLEVBQUEsQ0FBQSxhQUFBLEVBQUEsV0FB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TyxVQUFBLENBQUFQLE9BQUEsRUFBQSxFQUFBUSxRQUFBLEVBQUE7QUFDQSxvQkFBQUMsYUFBQXJILEtBQUFzSCxLQUFBLENBQUFWLE9BQUEsRUFBQSxDQUFBLEdBQUEsR0FBQTtBQUNBLG9CQUFBTyxRQUFBdkosTUFBQSxHQUFBLENBQUEsRUFBQTtBQUNBeUosa0NBQUEsTUFBQUYsT0FBQTtBQUNBLGlCQUZBLE1BRUE7QUFDQUUsa0NBQUFGLE9BQUE7QUFDQTtBQUNBLHVCQUFBRSxVQUFBO0FBQ0E7QUFDQTtBQTFEQSxLQUFBO0FBNERBLENBN0RBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG53aW5kb3cuYXBwID0gYW5ndWxhci5tb2R1bGUoJ0Z1bGxzdGFja0dlbmVyYXRlZEFwcCcsIFsnZnNhUHJlQnVpbHQnLCAndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICduZ0FuaW1hdGUnXSk7XG5cbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcbiAgICAvLyBUcmlnZ2VyIHBhZ2UgcmVmcmVzaCB3aGVuIGFjY2Vzc2luZyBhbiBPQXV0aCByb3V0ZVxuICAgICR1cmxSb3V0ZXJQcm92aWRlci53aGVuKCcvYXV0aC86cHJvdmlkZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICB9KTtcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGxpc3RlbmluZyB0byBlcnJvcnMgYnJvYWRjYXN0ZWQgYnkgdWktcm91dGVyLCB1c3VhbGx5IG9yaWdpbmF0aW5nIGZyb20gcmVzb2x2ZXNcbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUpIHtcbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlRXJyb3InLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zLCBmcm9tU3RhdGUsIGZyb21QYXJhbXMsIHRocm93bkVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuaW5mbyhgVGhlIGZvbGxvd2luZyBlcnJvciB3YXMgdGhyb3duIGJ5IHVpLXJvdXRlciB3aGlsZSB0cmFuc2l0aW9uaW5nIHRvIHN0YXRlIFwiJHt0b1N0YXRlLm5hbWV9XCIuIFRoZSBvcmlnaW4gb2YgdGhpcyBlcnJvciBpcyBwcm9iYWJseSBhIHJlc29sdmUgZnVuY3Rpb246YCk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IodGhyb3duRXJyb3IpO1xuICAgIH0pO1xufSk7XG5cbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgY29udHJvbGxpbmcgYWNjZXNzIHRvIHNwZWNpZmljIHN0YXRlcy5cbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgIC8vIFRoZSBnaXZlbiBzdGF0ZSByZXF1aXJlcyBhbiBhdXRoZW50aWNhdGVkIHVzZXIuXG4gICAgdmFyIGRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGggPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmRhdGEgJiYgc3RhdGUuZGF0YS5hdXRoZW50aWNhdGU7XG4gICAgfTtcblxuICAgIC8vICRzdGF0ZUNoYW5nZVN0YXJ0IGlzIGFuIGV2ZW50IGZpcmVkXG4gICAgLy8gd2hlbmV2ZXIgdGhlIHByb2Nlc3Mgb2YgY2hhbmdpbmcgYSBzdGF0ZSBiZWdpbnMuXG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcykge1xuXG4gICAgICAgIGlmICghZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCh0b1N0YXRlKSkge1xuICAgICAgICAgICAgLy8gVGhlIGRlc3RpbmF0aW9uIHN0YXRlIGRvZXMgbm90IHJlcXVpcmUgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgICAgIC8vIFRoZSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWQuXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FuY2VsIG5hdmlnYXRpbmcgdG8gbmV3IHN0YXRlLlxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIC8vIElmIGEgdXNlciBpcyByZXRyaWV2ZWQsIHRoZW4gcmVuYXZpZ2F0ZSB0byB0aGUgZGVzdGluYXRpb25cbiAgICAgICAgICAgIC8vICh0aGUgc2Vjb25kIHRpbWUsIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpIHdpbGwgd29yaylcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgaWYgbm8gdXNlciBpcyBsb2dnZWQgaW4sIGdvIHRvIFwibG9naW5cIiBzdGF0ZS5cbiAgICAgICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKHRvU3RhdGUubmFtZSwgdG9QYXJhbXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbn0pO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgW10pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luLHsnZm9yY2VOZXcnOiB0cnVlfSk7XG4gICAgfSk7XG5cbiAgICAvLyBBVVRIX0VWRU5UUyBpcyB1c2VkIHRocm91Z2hvdXQgb3VyIGFwcCB0b1xuICAgIC8vIGJyb2FkY2FzdCBhbmQgbGlzdGVuIGZyb20gYW5kIHRvIHRoZSAkcm9vdFNjb3BlXG4gICAgLy8gZm9yIGltcG9ydGFudCBldmVudHMgYWJvdXQgYXV0aGVudGljYXRpb24gZmxvdy5cbiAgICBhcHAuY29uc3RhbnQoJ0FVVEhfRVZFTlRTJywge1xuICAgICAgICBsb2dpblN1Y2Nlc3M6ICdhdXRoLWxvZ2luLXN1Y2Nlc3MnLFxuICAgICAgICBsb2dpbkZhaWxlZDogJ2F1dGgtbG9naW4tZmFpbGVkJyxcbiAgICAgICAgbG9nb3V0U3VjY2VzczogJ2F1dGgtbG9nb3V0LXN1Y2Nlc3MnLFxuICAgICAgICBzZXNzaW9uVGltZW91dDogJ2F1dGgtc2Vzc2lvbi10aW1lb3V0JyxcbiAgICAgICAgbm90QXV0aGVudGljYXRlZDogJ2F1dGgtbm90LWF1dGhlbnRpY2F0ZWQnLFxuICAgICAgICBub3RBdXRob3JpemVkOiAnYXV0aC1ub3QtYXV0aG9yaXplZCdcbiAgICB9KTtcblxuICAgIGFwcC5mYWN0b3J5KCdBdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsIEFVVEhfRVZFTlRTKSB7XG4gICAgICAgIHZhciBzdGF0dXNEaWN0ID0ge1xuICAgICAgICAgICAgNDAxOiBBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLFxuICAgICAgICAgICAgNDAzOiBBVVRIX0VWRU5UUy5ub3RBdXRob3JpemVkLFxuICAgICAgICAgICAgNDE5OiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCxcbiAgICAgICAgICAgIDQ0MDogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXRcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChzdGF0dXNEaWN0W3Jlc3BvbnNlLnN0YXR1c10sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSkge1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgdXNlciA9IHJlc3BvbnNlLmRhdGEudXNlcjtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKHVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XG4gICAgICAgICAgICByZXR1cm4gdXNlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZXMgdGhlIHNlc3Npb24gZmFjdG9yeSB0byBzZWUgaWYgYW5cbiAgICAgICAgLy8gYXV0aGVudGljYXRlZCB1c2VyIGlzIGN1cnJlbnRseSByZWdpc3RlcmVkLlxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhIVNlc3Npb24udXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldExvZ2dlZEluVXNlciA9IGZ1bmN0aW9uIChmcm9tU2VydmVyKSB7XG5cbiAgICAgICAgICAgIC8vIElmIGFuIGF1dGhlbnRpY2F0ZWQgc2Vzc2lvbiBleGlzdHMsIHdlXG4gICAgICAgICAgICAvLyByZXR1cm4gdGhlIHVzZXIgYXR0YWNoZWQgdG8gdGhhdCBzZXNzaW9uXG4gICAgICAgICAgICAvLyB3aXRoIGEgcHJvbWlzZS4gVGhpcyBlbnN1cmVzIHRoYXQgd2UgY2FuXG4gICAgICAgICAgICAvLyBhbHdheXMgaW50ZXJmYWNlIHdpdGggdGhpcyBtZXRob2QgYXN5bmNocm9ub3VzbHkuXG5cbiAgICAgICAgICAgIC8vIE9wdGlvbmFsbHksIGlmIHRydWUgaXMgZ2l2ZW4gYXMgdGhlIGZyb21TZXJ2ZXIgcGFyYW1ldGVyLFxuICAgICAgICAgICAgLy8gdGhlbiB0aGlzIGNhY2hlZCB2YWx1ZSB3aWxsIG5vdCBiZSB1c2VkLlxuXG4gICAgICAgICAgICBpZiAodGhpcy5pc0F1dGhlbnRpY2F0ZWQoKSAmJiBmcm9tU2VydmVyICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4oU2Vzc2lvbi51c2VyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFrZSByZXF1ZXN0IEdFVCAvc2Vzc2lvbi5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIDQwMSByZXNwb25zZSwgd2UgY2F0Y2ggaXQgYW5kIGluc3RlYWQgcmVzb2x2ZSB0byBudWxsLlxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKS50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9naW4gPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbihvblN1Y2Nlc3NmdWxMb2dpbilcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHsgbWVzc2FnZTogJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJyB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9sb2dvdXQnKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBTZXNzaW9uLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9nb3V0U3VjY2Vzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcblxuICAgICAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSB1c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IG51bGw7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxufSgpKTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnR2FtZScsIHtcbiAgICAgICAgdXJsOiAnL2dhbWUvOnJvb21uYW1lJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9nYW1lLXN0YXRlL3BhZ2UuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6IFwiR2FtZUN0cmxcIixcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuXG5cbmFwcC5jb250cm9sbGVyKCdHYW1lQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgQm9hcmRGYWN0b3J5LCBTb2NrZXQsICRzdGF0ZVBhcmFtcywgQXV0aFNlcnZpY2UsICRzdGF0ZSwgTG9iYnlGYWN0b3J5LCAkcm9vdFNjb3BlLCAkcSkge1xuXG4gICAgJHNjb3BlLnJvb21OYW1lID0gJHN0YXRlUGFyYW1zLnJvb21uYW1lO1xuICAgICRzY29wZS5oaWRlU3RhcnQgPSB0cnVlO1xuXG4gICAgJHNjb3BlLm90aGVyUGxheWVycyA9IFtdO1xuXG4gICAgJHNjb3BlLmdhbWVMZW5ndGggPSAxNTA7XG5cbiAgICAkc2NvcGUuZXhwb3J0cyA9IHtcbiAgICAgICAgd29yZE9iajoge30sXG4gICAgICAgIHdvcmQ6IFwiXCIsXG4gICAgICAgIHBsYXllcklkOiBudWxsLFxuICAgICAgICBzdGF0ZU51bWJlcjogMCxcbiAgICAgICAgcG9pbnRzRWFybmVkOiBudWxsXG4gICAgfTtcblxuICAgICRzY29wZS5tb3VzZUlzRG93biA9IGZhbHNlO1xuICAgICRzY29wZS5kcmFnZ2luZ0FsbG93ZWQgPSBmYWxzZTtcbiAgICAkc2NvcGUuc3R5bGUgPSBudWxsO1xuICAgICRzY29wZS5tZXNzYWdlID0gJyc7XG4gICAgJHNjb3BlLmZyZWV6ZSA9IGZhbHNlO1xuICAgICRzY29wZS53aW5Pckxvc2UgPSBudWxsO1xuICAgICRzY29wZS50aW1lb3V0ID0gbnVsbDtcblxuICAgICRyb290U2NvcGUuaGlkZU5hdmJhciA9IHRydWU7XG5cbiAgICAkc2NvcGUuY2hlY2tTZWxlY3RlZCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIHJldHVybiBpZCBpbiAkc2NvcGUuZXhwb3J0cy53b3JkT2JqO1xuICAgIH07XG5cbiAgICAkc2NvcGUudG9nZ2xlRHJhZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkID0gISRzY29wZS5kcmFnZ2luZ0FsbG93ZWQ7XG4gICAgfTtcblxuICAgICRzY29wZS5tb3VzZURvd24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLm1vdXNlSXNEb3duID0gdHJ1ZTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm1vdXNlVXAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLm1vdXNlSXNEb3duID0gZmFsc2U7XG4gICAgICAgIGlmICgkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkICYmICRzY29wZS5leHBvcnRzLndvcmQubGVuZ3RoID4gMSkgJHNjb3BlLnN1Ym1pdCgkc2NvcGUuZXhwb3J0cyk7XG4gICAgfTtcblxuICAgICRzY29wZS5kcmFnID0gZnVuY3Rpb24oc3BhY2UsIGlkKSB7XG4gICAgICAgIGlmICgkc2NvcGUubW91c2VJc0Rvd24gJiYgJHNjb3BlLmRyYWdnaW5nQWxsb3dlZCkge1xuICAgICAgICAgICAgJHNjb3BlLmNsaWNrKHNwYWNlLCBpZCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmhpZGVCb2FyZCA9IHRydWU7XG5cbiAgICAvLyBTdGFydCB0aGUgZ2FtZSB3aGVuIGFsbCBwbGF5ZXJzIGhhdmUgam9pbmVkIHJvb21cbiAgICAkc2NvcGUuc3RhcnRHYW1lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB1c2VySWRzID0gJHNjb3BlLm90aGVyUGxheWVycy5tYXAodXNlciA9PiB1c2VyLmlkKTtcbiAgICAgICAgdXNlcklkcy5wdXNoKCRzY29wZS51c2VyLmlkKTtcbiAgICAgICAgY29uc29sZS5sb2coJ29wJywgJHNjb3BlLm90aGVyUGxheWVycywgJ3VpJywgdXNlcklkcyk7XG4gICAgICAgIFxuICAgICAgICBCb2FyZEZhY3RvcnkuZ2V0U3RhcnRCb2FyZCgkc2NvcGUuZ2FtZUxlbmd0aCwgJHNjb3BlLmdhbWVJZCwgdXNlcklkcyk7XG4gICAgfTtcblxuXG4gICAgLy9RdWl0IHRoZSByb29tLCBiYWNrIHRvIGxvYmJ5XG4gICAgJHNjb3BlLnF1aXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHJvb3RTY29wZS5oaWRlTmF2YmFyID0gZmFsc2U7XG4gICAgICAgICRzdGF0ZS5nbygnbG9iYnknKVxuICAgIH07XG5cblxuICAgICRzY29wZS5ib2FyZCA9IFtcbiAgICAgICAgWydiJywgJ2EnLCAnZCcsICdlJywgJ2EnLCAnciddLFxuICAgICAgICBbJ2UnLCAnZicsICdnJywgJ2wnLCAnbScsICdlJ10sXG4gICAgICAgIFsnaCcsICdpJywgJ2onLCAnZicsICdvJywgJ2EnXSxcbiAgICAgICAgWydjJywgJ2EnLCAnZCcsICdlJywgJ2EnLCAnciddLFxuICAgICAgICBbJ2UnLCAnZicsICdnJywgJ2wnLCAnZCcsICdlJ10sXG4gICAgICAgIFsnaCcsICdpJywgJ2onLCAnZicsICdvJywgJ2EnXVxuICAgIF07XG5cblxuXG4gICAgJHNjb3BlLnNpemUgPSAzO1xuICAgICRzY29wZS5zY29yZSA9IDA7XG5cblxuICAgICRzY29wZS5jbGljayA9IGZ1bmN0aW9uKHNwYWNlLCBpZCkge1xuICAgICAgICBpZiAoJHNjb3BlLmZyZWV6ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKCdjbGlja2VkICcsIHNwYWNlLCBpZCk7XG4gICAgICAgIHZhciBsdHJzU2VsZWN0ZWQgPSBPYmplY3Qua2V5cygkc2NvcGUuZXhwb3J0cy53b3JkT2JqKTtcbiAgICAgICAgdmFyIHByZXZpb3VzTHRyID0gbHRyc1NlbGVjdGVkW2x0cnNTZWxlY3RlZC5sZW5ndGggLSAyXTtcbiAgICAgICAgdmFyIGxhc3RMdHIgPSBsdHJzU2VsZWN0ZWRbbHRyc1NlbGVjdGVkLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAoIWx0cnNTZWxlY3RlZC5sZW5ndGggfHwgdmFsaWRTZWxlY3QoaWQsIGx0cnNTZWxlY3RlZCkpIHtcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLndvcmQgKz0gc3BhY2U7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkT2JqW2lkXSA9IHNwYWNlO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJHNjb3BlLmV4cG9ydHMpO1xuICAgICAgICB9IGVsc2UgaWYgKGlkID09PSBwcmV2aW91c0x0cikge1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZCA9ICRzY29wZS5leHBvcnRzLndvcmQuc3Vic3RyaW5nKDAsICRzY29wZS5leHBvcnRzLndvcmQubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICBkZWxldGUgJHNjb3BlLmV4cG9ydHMud29yZE9ialtsYXN0THRyXTtcbiAgICAgICAgfSBlbHNlIGlmIChsdHJzU2VsZWN0ZWQubGVuZ3RoID09PSAxICYmIGlkID09PSBsYXN0THRyKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkID0gXCJcIjtcbiAgICAgICAgICAgIGRlbGV0ZSAkc2NvcGUuZXhwb3J0cy53b3JkT2JqW2xhc3RMdHJdO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vbWFrZXMgc3VyZSBsZXR0ZXIgaXMgYWRqYWNlbnQgdG8gcHJldiBsdHIsIGFuZCBoYXNuJ3QgYmVlbiB1c2VkIHlldFxuICAgIGZ1bmN0aW9uIHZhbGlkU2VsZWN0KGx0cklkLCBvdGhlckx0cnNJZHMpIHtcbiAgICAgICAgaWYgKG90aGVyTHRyc0lkcy5pbmNsdWRlcyhsdHJJZCkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgdmFyIGNvb3JkcyA9IGx0cklkLnNwbGl0KCctJyk7XG4gICAgICAgIHZhciByb3cgPSBjb29yZHNbMF07XG4gICAgICAgIHZhciBjb2wgPSBjb29yZHNbMV07XG4gICAgICAgIHZhciBsYXN0THRySWQgPSBvdGhlckx0cnNJZHMucG9wKCk7XG4gICAgICAgIHZhciBjb29yZHNMYXN0ID0gbGFzdEx0cklkLnNwbGl0KCctJyk7XG4gICAgICAgIHZhciByb3dMYXN0ID0gY29vcmRzTGFzdFswXTtcbiAgICAgICAgdmFyIGNvbExhc3QgPSBjb29yZHNMYXN0WzFdO1xuICAgICAgICB2YXIgcm93T2Zmc2V0ID0gTWF0aC5hYnMocm93IC0gcm93TGFzdCk7XG4gICAgICAgIHZhciBjb2xPZmZzZXQgPSBNYXRoLmFicyhjb2wgLSBjb2xMYXN0KTtcbiAgICAgICAgcmV0dXJuIChyb3dPZmZzZXQgPD0gMSAmJiBjb2xPZmZzZXQgPD0gMSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYXJJZkNvbmZsaWN0aW5nKHVwZGF0ZVdvcmRPYmosIGV4cG9ydFdvcmRPYmopIHtcbiAgICAgICAgdmFyIHRpbGVzTW92ZWQgPSBPYmplY3Qua2V5cyh1cGRhdGVXb3JkT2JqKTtcbiAgICAgICAgdmFyIG15V29yZFRpbGVzID0gT2JqZWN0LmtleXMoZXhwb3J0V29yZE9iaik7XG4gICAgICAgIGlmICh0aWxlc01vdmVkLnNvbWUoY29vcmQgPT4gbXlXb3JkVGlsZXMuaW5jbHVkZXMoY29vcmQpKSkgJHNjb3BlLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgJHNjb3BlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5leHBvcnRzLndvcmQgPSBcIlwiO1xuICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkT2JqID0ge307XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLnN1Ym1pdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgICBjb25zb2xlLmxvZygnc3VibWl0dGluZyAnLCBvYmopO1xuICAgICAgICBCb2FyZEZhY3Rvcnkuc3VibWl0KG9iaik7XG4gICAgICAgICRzY29wZS5jbGVhcigpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc2h1ZmZsZSA9IEJvYXJkRmFjdG9yeS5zaHVmZmxlO1xuXG5cbiAgICAkc2NvcGUudXBkYXRlQm9hcmQgPSBmdW5jdGlvbih3b3JkT2JqKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdzY29wZS5ib2FyZCcsICRzY29wZS5ib2FyZCk7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB3b3JkT2JqKSB7XG4gICAgICAgICAgICB2YXIgY29vcmRzID0ga2V5LnNwbGl0KCctJyk7XG4gICAgICAgICAgICB2YXIgcm93ID0gY29vcmRzWzBdO1xuICAgICAgICAgICAgdmFyIGNvbCA9IGNvb3Jkc1sxXTtcbiAgICAgICAgICAgICRzY29wZS5ib2FyZFtyb3ddW2NvbF0gPSB3b3JkT2JqW2tleV07XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnVwZGF0ZVNjb3JlID0gZnVuY3Rpb24ocG9pbnRzLCBwbGF5ZXJJZCkge1xuICAgICAgICBjb25zb2xlLmxvZygndXBkYXRlIHNjb3JlIHBvaW50cycsIHBvaW50cyk7XG4gICAgICAgIGlmIChwbGF5ZXJJZCA9PT0gJHNjb3BlLnVzZXIuaWQpIHtcbiAgICAgICAgICAgICRzY29wZS5zY29yZSArPSBwb2ludHM7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy5wb2ludHNFYXJuZWQgPSBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIgcGxheWVyIGluICRzY29wZS5vdGhlclBsYXllcnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLm90aGVyUGxheWVyc1twbGF5ZXJdLmlkID09PSBwbGF5ZXJJZCkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzW3BsYXllcl0uc2NvcmUgKz0gcG9pbnRzO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy5wb2ludHNFYXJuZWQgPSBudWxsO1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLnVwZGF0ZSA9IGZ1bmN0aW9uKHVwZGF0ZU9iaikge1xuICAgICAgICAkc2NvcGUudXBkYXRlU2NvcmUodXBkYXRlT2JqLnBvaW50c0Vhcm5lZCwgdXBkYXRlT2JqLnBsYXllcklkKTtcbiAgICAgICAgJHNjb3BlLnVwZGF0ZUJvYXJkKHVwZGF0ZU9iai53b3JkT2JqKTtcbiAgICAgICAgaWYgKCskc2NvcGUudXNlci5pZCA9PT0gK3VwZGF0ZU9iai5wbGF5ZXJJZCkge1xuICAgICAgICAgICAgdmFyIHBsYXllciA9ICRzY29wZS51c2VyLnVzZXJuYW1lO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluICRzY29wZS5vdGhlclBsYXllcnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoKyRzY29wZS5vdGhlclBsYXllcnNba2V5XS5pZCA9PT0gK3VwZGF0ZU9iai5wbGF5ZXJJZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcGxheWVyID0gJHNjb3BlLm90aGVyUGxheWVyc1trZXldLnVzZXJuYW1lO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLm1lc3NhZ2UgPSBwbGF5ZXIgKyBcIiBwbGF5ZWQgXCIgKyB1cGRhdGVPYmoud29yZCArIFwiIGZvciBcIiArIHVwZGF0ZU9iai5wb2ludHNFYXJuZWQgKyBcIiBwb2ludHMhXCI7XG4gICAgICAgIGlmICgkc2NvcGUudGltZW91dCkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KCRzY29wZS50aW1lb3V0KTtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkc2NvcGUubWVzc2FnZSA9ICcnO1xuICAgICAgICB9LCAzMDAwKVxuICAgICAgICBjb25zb2xlLmxvZygnaXRzIHVwZGF0aW5nIScpO1xuICAgICAgICBjbGVhcklmQ29uZmxpY3RpbmcodXBkYXRlT2JqLCAkc2NvcGUuZXhwb3J0cy53b3JkT2JqKTtcbiAgICAgICAgJHNjb3BlLmV4cG9ydHMuc3RhdGVOdW1iZXIgPSB1cGRhdGVPYmouc3RhdGVOdW1iZXI7XG4gICAgICAgIGNvbnNvbGUubG9nKCd1cGRhdGVkIG9iaicsIHVwZGF0ZU9iailcbiAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnJlcGxheSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBMb2JieUZhY3RvcnkubmV3R2FtZSh7IHJvb21uYW1lOiAkc2NvcGUucm9vbU5hbWUgfSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGdhbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInJlcGxheSBnYW1lIG9iajpcIiwgZ2FtZSk7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuZ2FtZUlkID0gZ2FtZS5pZDtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc3RhcnRHYW1lKCk7XG4gICAgICAgICAgICAgICAgdmFyIGFsbElkcyA9ICRzY29wZS5vdGhlclBsYXllcnMubWFwKHBsYXllciA9PiBwbGF5ZXIuaWQpO1xuICAgICAgICAgICAgICAgIGFsbElkcy5wdXNoKCRzY29wZS51c2VyLmlkKTtcbiAgICAgICAgICAgICAgICAkcS5hbGwoYWxsSWRzLm1hcChpZCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIExvYmJ5RmFjdG9yeS5qb2luR2FtZSgkc2NvcGUuZ2FtZUlkLCBpZCk7XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignZXJyb3IgcmVzdGFydGluZyB0aGUgZ2FtZScsIGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgfTtcblxuICAgICRzY29wZS5kZXRlcm1pbmVXaW5uZXIgPSBmdW5jdGlvbih3aW5uZXJzQXJyYXkpIHtcbiAgICAgICAgaWYgKHdpbm5lcnNBcnJheS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIGlmICgrd2lubmVyc0FycmF5WzBdID09PSArJHNjb3BlLnVzZXIuaWQpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUud2luT3JMb3NlID0gXCJDb25ncmF0dWxhdGlvbiEgWW91IGFyZSBhIHdvcmQgd2l6YXJkISBZb3Ugd29uISEhXCI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIHBsYXllciBpbiAkc2NvcGUub3RoZXJQbGF5ZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgrJHNjb3BlLm90aGVyUGxheWVyc1twbGF5ZXJdLmlkID09PSArd2lubmVyc0FycmF5WzBdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgd2lubmVyID0gJHNjb3BlLm90aGVyUGxheWVyc1twbGF5ZXJdLnVzZXJuYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLndpbk9yTG9zZSA9IFwiVG91Z2ggbHVjay4gXCIgKyB3aW5uZXIgKyBcIiBoYXMgYmVhdGVuIHlvdS4gQmV0dGVyIEx1Y2sgbmV4dCB0aW1lLiA6KFwiXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgd2lubmVycyA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIgaSBpbiB3aW5uZXJzQXJyYXkpIHtcbiAgICAgICAgICAgICAgICBpZiAoK3dpbm5lcnNBcnJheVtpXSA9PT0gKyRzY29wZS51c2VyLmlkKSB7IHdpbm5lcnMucHVzaCgkc2NvcGUudXNlci51c2VybmFtZSk7IH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIHBsYXllciBpbiAkc2NvcGUub3RoZXJQbGF5ZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLm90aGVyUGxheWVyc1twbGF5ZXJdLmlkID09IHdpbm5lcnNBcnJheVtpXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbm5lcnMucHVzaCgkc2NvcGUub3RoZXJQbGF5ZXJzW3BsYXllcl0udXNlcm5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHdpbm5lcnMpO1xuICAgICAgICAgICAgICAgICRzY29wZS53aW5Pckxvc2UgPSBcIlRoZSBnYW1lIHdhcyBhIHRpZSBiZXR3ZWVuIFwiO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgd2lubmVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaSA9PT0gd2lubmVycy5sZW5ndGggLSAxKSB7ICRzY29wZS53aW5Pckxvc2UgKz0gXCJhbmQgXCIgKyB3aW5uZXJzW2ldICsgXCIuXCI7IH0gZWxzZSB7ICRzY29wZS53aW5Pckxvc2UgKz0gd2lubmVyc1tpXSArIFwiLCBcIjsgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgLy8gJHNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbigpIHtcbiAgICAvLyAgICAgY29uc29sZS5sb2coJ2NoYW5nZXN0YXRlJywgJHNjb3BlLnVzZXIuaWQpO1xuICAgIC8vICAgICBTb2NrZXQuY2xvc2UoKTtcbiAgICAvLyAgICAgLy8gU29ja2V0LnJlY29ubmVjdCgpO1xuXG4gICAgLy8gfSk7XG5cbiAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdjaGFuZ2VzdGF0ZSBjbG9zZScsICRzY29wZS51c2VyLmlkKTtcblxuICAgICAgICBTb2NrZXQuZW1pdCgnbGVhdmVSb29tJyk7XG5cbiAgICB9KTtcblxuXG5cbiAgICBcblxuY29uc29sZS5sb2coJ3VwZGF0ZScpXG5cbiAgICAvLyBTb2NrZXQub24oJ2Nvbm5lY3QnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gJHNjb3BlLmNoZWNrQ29ubmVjdCgpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdjb25uZWN0aW5nJyk7XG4gICAgICAgICRxLmFsbChbXG4gICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24odXNlcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd1c2VyIGZyb20gQXV0aFNlcnZpY2UnLCB1c2VyKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMucGxheWVySWQgPSB1c2VyLmlkO1xuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIC8vZ2V0IHRoZSBjdXJyZW50IHJvb20gaW5mb1xuICAgICAgICAgICAgQm9hcmRGYWN0b3J5LmdldEN1cnJlbnRSb29tKCRzdGF0ZVBhcmFtcy5yb29tbmFtZSlcbiAgICAgICAgICAgIC50aGVuKHJvb20gPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJvb20pO1xuICAgICAgICAgICAgICAgICRzY29wZS5nYW1lSWQgPSByb29tLmlkO1xuICAgICAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMgPSByb29tLnVzZXJzLmZpbHRlcih1c2VyID0+IHVzZXIuaWQgIT09ICRzY29wZS51c2VyLmlkKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzLmZvckVhY2gocGxheWVyID0+IHsgcGxheWVyLnNjb3JlID0gMCB9KTtcbiAgICAgICAgICAgICAgICBMb2JieUZhY3Rvcnkuam9pbkdhbWUocm9vbS5pZCwgJHNjb3BlLnVzZXIuaWQpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgXSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIFNvY2tldC5lbWl0KCdqb2luUm9vbScsICRzY29wZS51c2VyLCAkc2NvcGUucm9vbU5hbWUsICRzY29wZS5nYW1lSWQpO1xuICAgICAgICAgICAgJHNjb3BlLmhpZGVTdGFydCA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdlbWl0dGluZyBcImpvaW4gcm9vbVwiIGV2ZW50IHRvIHNlcnZlciA4UCcsICRzY29wZS5yb29tTmFtZSk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2Vycm9yIGdyYWJiaW5nIHVzZXIgb3Igcm9vbSBmcm9tIGRiOiAnLCBlKTtcbiAgICAgICAgfSk7XG5cblxuICAgICAgICBTb2NrZXQub24oJ3Jvb21Kb2luU3VjY2VzcycsIGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCduZXcgdXNlciBqb2luaW5nJywgdXNlci5pZCk7XG4gICAgICAgICAgICB1c2VyLnNjb3JlID0gMDtcbiAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMucHVzaCh1c2VyKTtcbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCdzdGFydEJvYXJkJywgZnVuY3Rpb24oYm9hcmQpIHtcbiAgICAgICAgICAgICRzY29wZS5mcmVlemUgPSBmYWxzZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdib2FyZCEgJywgYm9hcmQpO1xuICAgICAgICAgICAgJHNjb3BlLmJvYXJkID0gYm9hcmQ7XG4gICAgICAgICAgICAvLyBzZXRJbnRlcnZhbChmdW5jdGlvbigpe1xuICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVycy5mb3JFYWNoKHBsYXllciA9PiB7IHBsYXllci5zY29yZSA9IDAgfSk7XG4gICAgICAgICAgICAkc2NvcGUuc2NvcmUgPSAwO1xuICAgICAgICAgICAgJHNjb3BlLmhpZGVCb2FyZCA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLm1lc3NhZ2UgPSAnJztcbiAgICAgICAgICAgICRzY29wZS53aW5Pckxvc2UgPSBudWxsO1xuXG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgICAgICAgICAgLy8gfSwgMzAwMCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIFNvY2tldC5vbignd29yZFZhbGlkYXRlZCcsIGZ1bmN0aW9uKHVwZGF0ZU9iaikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3dvcmQgaXMgdmFsaWRhdGVkJyk7XG4gICAgICAgICAgICAkc2NvcGUudXBkYXRlKHVwZGF0ZU9iaik7XG4gICAgICAgICAgICAkc2NvcGUubGFzdFdvcmRQbGF5ZWQgPSB1cGRhdGVPYmoud29yZDtcbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIFNvY2tldC5vbignYm9hcmRTaHVmZmxlZCcsIGZ1bmN0aW9uKGJvYXJkLCB1c2VySWQsIHN0YXRlTnVtYmVyKSB7XG4gICAgICAgICAgICAkc2NvcGUuYm9hcmQgPSBib2FyZDtcbiAgICAgICAgICAgICRzY29wZS51cGRhdGVTY29yZSgtNSwgdXNlcklkKTtcbiAgICAgICAgICAgICRzY29wZS5jbGVhcigpO1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMuc3RhdGVOdW1iZXIgPSBzdGF0ZU51bWJlcjtcbiAgICAgICAgICAgICRzY29wZS5tZXNzYWdlID0gdXNlcklkICsgXCIgc2h1ZmZsZWQgdGhlIGJvYXJkIVwiO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJHNjb3BlLm1lc3NhZ2UpO1xuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCdwbGF5ZXJEaXNjb25uZWN0ZWQnLCBmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygncGxheWVyRGlzY29ubmVjdGVkJywgdXNlci5pZCk7XG4gICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzID0gJHNjb3BlLm90aGVyUGxheWVycy5maWx0ZXIob3RoZXJQbGF5ZXIgPT4gb3RoZXJQbGF5ZXIuaWQgIT09IHVzZXIuaWQpO1xuXG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICBTb2NrZXQub24oJ2dhbWVPdmVyJywgZnVuY3Rpb24od2lubmVyc0FycmF5KSB7XG4gICAgICAgICAgICAkc2NvcGUuY2xlYXIoKTtcbiAgICAgICAgICAgICRzY29wZS5mcmVlemUgPSB0cnVlO1xuICAgICAgICAgICAgJHNjb3BlLmRldGVybWluZVdpbm5lcih3aW5uZXJzQXJyYXkpO1xuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnYW1lIGlzIG92ZXIsIHdpbm5lcnM6ICcsIHdpbm5lcnNBcnJheSk7XG4gICAgICAgIH0pO1xuICAgIC8vIH0pO1xuXG59KTtcbiIsImFwcC5mYWN0b3J5IChcIkJvYXJkRmFjdG9yeVwiLCBmdW5jdGlvbigkaHR0cCwgU29ja2V0KXtcblx0cmV0dXJue1xuXHRcdGdldFN0YXJ0Qm9hcmQ6IGZ1bmN0aW9uKGdhbWVMZW5ndGgsIGdhbWVJZCwgdXNlcklkcyl7XG5cdFx0XHRjb25zb2xlLmxvZygnZmFjdG9yeS4gZ2w6ICcsIGdhbWVMZW5ndGgpO1xuXHRcdFx0U29ja2V0LmVtaXQoJ2dldFN0YXJ0Qm9hcmQnLCBnYW1lTGVuZ3RoLCBnYW1lSWQsIHVzZXJJZHMpO1xuXHRcdH0sXG5cblx0XHRzdWJtaXQ6IGZ1bmN0aW9uKG9iail7XG5cdFx0XHRTb2NrZXQuZW1pdCgnc3VibWl0V29yZCcsIG9iaik7XG5cdFx0fSxcblxuXHRcdHNodWZmbGU6IGZ1bmN0aW9uKHVzZXIpe1xuXHRcdFx0Y29uc29sZS5sb2coJ2dyaWRmYWN0b3J5IHUnLHVzZXIuaWQpO1xuXHRcdFx0U29ja2V0LmVtaXQoJ3NodWZmbGVCb2FyZCcsdXNlci5pZCk7XG5cdFx0fSxcblxuXHRcdC8vIGZpbmRBbGxPdGhlclVzZXJzOiBmdW5jdGlvbihnYW1lKSB7XG5cdFx0Ly8gXHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2dhbWVzLycrIGdhbWUuaWQpXG5cdFx0Ly8gXHQudGhlbihyZXMgPT4gcmVzLmRhdGEpXG5cdFx0Ly8gfSxcblxuXHRcdGdldEN1cnJlbnRSb29tOiBmdW5jdGlvbihyb29tbmFtZSkge1xuXHRcdFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS9nYW1lcy9yb29tcy8nK3Jvb21uYW1lKVxuXHRcdFx0LnRoZW4ocmVzID0+IHJlcy5kYXRhKVxuXHRcdH0sXG5cblx0XHRxdWl0RnJvbVJvb206IGZ1bmN0aW9uKGdhbWVJZCwgdXNlcklkKSB7XG5cdFx0XHQvLyBTb2NrZXQuZW1pdCgnZGlzY29ubmVjdCcsIHJvb21OYW1lLCB1c2VySWQpO1xuXHRcdFx0cmV0dXJuICRodHRwLmRlbGV0ZSgnL2FwaS9nYW1lcy8nK2dhbWVJZCsnLycrdXNlcklkKVxuXHRcdH1cblx0fVxufSk7XG4iLCJhcHAuY29udHJvbGxlcignSG9tZUN0cmwnLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZSwgJGxvY2F0aW9uKXtcbiAgJHNjb3BlLmVudGVyTG9iYnkgPSBmdW5jdGlvbigpe1xuICAgICRzdGF0ZS5nbygnbG9iYnknLCB7cmVsb2FkOiB0cnVlfSk7XG4gIH1cbn0pO1xuXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdob21lJywge1xuICAgICAgICB1cmw6ICcvJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ob21lL2hvbWUuaHRtbCdcbiAgICB9KTtcbn0pO1xuXG4iLCJhcHAuY29udHJvbGxlcignTGVhZGVyQm9hcmRDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBMZWFkZXJCb2FyZEZhY3RvcnksICRzdGF0ZSwgQXV0aFNlcnZpY2UpIHtcbiAgICBjb25zb2xlLmxvZygnIDEnKVxuICAgIExlYWRlckJvYXJkRmFjdG9yeS5BbGxQbGF5ZXJzKClcbiAgICAudGhlbihwbGF5ZXJzID0+IHtcbiAgICAgICAgcGxheWVycy5mb3JFYWNoKHBsYXllciA9PiB7XG4gICAgICAgICAgICBpZiAocGxheWVyLmdhbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgc2NvcmVzID0gcGxheWVyLmdhbWVzLm1hcChnYW1lID0+IGdhbWUudXNlckdhbWUuc2NvcmUpXG4gICAgICAgICAgICAgICAgcGxheWVyLmhpZ2hlc3RTY29yZSA9IE1hdGgubWF4KC4uLnNjb3JlcylcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGxheWVyLmhpZ2hlc3RTY29yZSA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwbGF5ZXIuZ2FtZXNfd29uID0gcGxheWVyLndpbm5lci5sZW5ndGg7XG4gICAgICAgICAgICBwbGF5ZXIuZ2FtZXNfcGxheWVkID0gcGxheWVyLmdhbWVzLmxlbmd0aDtcbiAgICAgICAgICAgIGlmKHBsYXllci5nYW1lcy5sZW5ndGg9PT0wKXtcbiAgICAgICAgICAgIFx0cGxheWVyLndpbl9wZXJjZW50YWdlID0gMCArICclJ1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFx0cGxheWVyLndpbl9wZXJjZW50YWdlID0gKChwbGF5ZXIud2lubmVyLmxlbmd0aC9wbGF5ZXIuZ2FtZXMubGVuZ3RoKSoxMDApLnRvRml4ZWQoMCkgKyAnJSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSlcbiAgICAgICAgJHNjb3BlLnBsYXllcnMgPSBwbGF5ZXJzO1xuICAgIH0pXG59KTtcbiIsImFwcC5mYWN0b3J5KCdMZWFkZXJCb2FyZEZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHApIHtcblx0dmFyIExlYWRlckJvYXJkRmFjdG9yeSA9IHt9O1xuXG5cdExlYWRlckJvYXJkRmFjdG9yeS5BbGxQbGF5ZXJzID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS91c2VycycpXG5cdFx0LnRoZW4ocmVzPT5yZXMuZGF0YSlcblx0fVxuXG5cdHJldHVybiBMZWFkZXJCb2FyZEZhY3Rvcnk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbGVhZGVyQm9hcmQnLCB7XG4gICAgICAgIHVybDogJy9sZWFkZXJCb2FyZCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbGVhZGVyQm9hcmQvbGVhZGVyQm9hcmQudGVtcGxhdGUuaHRtbCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgXHRhbGxQbGF5ZXJzOiBmdW5jdGlvbihMZWFkZXJCb2FyZEZhY3RvcnkpIHtcbiAgICAgICAgXHRcdHJldHVybiBMZWFkZXJCb2FyZEZhY3RvcnkuQWxsUGxheWVycztcbiAgICAgICAgXHR9LFxuICAgICAgICAgICAgXG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMZWFkZXJCb2FyZEN0cmwnXG4gICAgfSk7XG5cbn0pOyIsImFwcC5jb250cm9sbGVyKCdMb2JieUN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIExvYmJ5RmFjdG9yeSwgcm9vbXMsICRzdGF0ZSwgQXV0aFNlcnZpY2UpIHtcblxuICAgIC8vIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpXG4gICAgLy8gICAgIC50aGVuKGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAvLyAgICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcbiAgICAvLyAgICAgfSk7XG5cbiAgICAkc2NvcGUucm9vbXMgPSByb29tcztcbiAgICAkc2NvcGUucm9vbU5hbWVGb3JtID0gZmFsc2U7XG4gICAgLy8gJHNjb3BlLnVzZXIgPSB7XG4gICAgLy8gIGlkOiAzXG4gICAgLy8gfVxuXG4gICAgLy8gJHNjb3BlLmpvaW5HYW1lID0gZnVuY3Rpb24ocm9vbSkge1xuICAgIC8vICAgICBjb25zb2xlLmxvZyhcImltIGNoYW5naW5nIHN0YXRlIGFuZCByZWxvYWRpbmdcIik7XG4gICAgLy8gICAgICRzdGF0ZS5nbygnR2FtZScsIHsgcm9vbW5hbWU6IHJvb20ucm9vbW5hbWUgfSwgeyByZWxvYWQ6IHRydWUsIG5vdGlmeTogdHJ1ZSB9KVxuICAgIC8vIH07XG5cbiAgICAkc2NvcGUubmV3Um9vbSA9IGZ1bmN0aW9uKHJvb21JbmZvKSB7XG4gICAgICAgIExvYmJ5RmFjdG9yeS5uZXdHYW1lKHJvb21JbmZvKTtcbiAgICAgICAgJHNjb3BlLnJvb21OYW1lRm9ybSA9IGZhbHNlO1xuICAgIH07XG4gICAgJHNjb3BlLnNob3dGb3JtID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5yb29tTmFtZUZvcm0gPSB0cnVlO1xuICAgIH07XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnZW50ZXJMb2JieScsIGZ1bmN0aW9uKCl7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvYmJ5L2xvYmJ5LWJ1dHRvbi5odG1sJyxcbiAgICBjb250cm9sbGVyOiAnSG9tZUN0cmwnXG4gIH1cbn0pXG4iLCJhcHAuZmFjdG9yeSgnTG9iYnlGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG5cdHZhciBMb2JieUZhY3RvcnkgPSB7fTtcblx0dmFyIHRlbXBSb29tcyA9IFtdOyAvL3dvcmsgd2l0aCBzb2NrZXQ/XG5cblx0TG9iYnlGYWN0b3J5LmdldEFsbFJvb21zID0gZnVuY3Rpb24oKXtcblx0XHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2dhbWVzL3Jvb21zJylcblx0XHQudGhlbihyZXMgPT4gcmVzLmRhdGEpXG5cdFx0LnRoZW4ocm9vbXMgPT4ge1xuXHRcdFx0YW5ndWxhci5jb3B5KHJvb21zLCB0ZW1wUm9vbXMpO1xuXHRcdFx0cmV0dXJuIHRlbXBSb29tcztcblx0XHR9KVxuXHR9O1xuXG5cdExvYmJ5RmFjdG9yeS5qb2luR2FtZSA9IGZ1bmN0aW9uKHJvb21JZCwgdXNlcklkKSB7XG4gICAgY29uc29sZS5sb2coJ2xvYmJ5IGZhY3Rvcnkgam9pbiBnYW1lJyk7XG5cdFx0cmV0dXJuICRodHRwLnB1dCgnL2FwaS9nYW1lcy8nKyByb29tSWQgKycvcGxheWVyJywge2lkOiB1c2VySWR9KVxuXHRcdC50aGVuKHJlcz0+cmVzLmRhdGEpXG5cdH07XG5cblx0TG9iYnlGYWN0b3J5Lm5ld0dhbWUgPSBmdW5jdGlvbihyb29tSW5mbykge1xuXHRcdHJldHVybiAkaHR0cC5wdXQoJy9hcGkvZ2FtZXMnLCByb29tSW5mbylcblx0XHQudGhlbihyZXMgPT4gcmVzLmRhdGEpXG5cdCBcdC50aGVuKHJvb20gPT4ge1xuXHQgXHRcdHRlbXBSb29tcy5wdXNoKHJvb20pO1xuXHQgXHRcdHJldHVybiByb29tO1xuXHQgXHRcdH0pO1xuXHR9O1xuXG5cdExvYmJ5RmFjdG9yeS5BbGxQbGF5ZXJzID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS91c2VycycpXG5cdFx0LnRoZW4ocmVzPT5yZXMuZGF0YSlcblx0fTtcblxuXHRyZXR1cm4gTG9iYnlGYWN0b3J5O1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvYmJ5Jywge1xuICAgICAgICB1cmw6ICcvbG9iYnknLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvYmJ5L2xvYmJ5LnRlbXBsYXRlLmh0bWwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgIFx0cm9vbXM6IGZ1bmN0aW9uKExvYmJ5RmFjdG9yeSkge1xuICAgICAgICBcdFx0cmV0dXJuIExvYmJ5RmFjdG9yeS5nZXRBbGxSb29tcygpO1xuICAgICAgICBcdH1cbiAgICAgICAgfSxcbiAgICAgICAgY29udHJvbGxlcjogJ0xvYmJ5Q3RybCdcbiAgICB9KTtcblxufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsb2dpbicsIHtcbiAgICAgICAgdXJsOiAnL2xvZ2luJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2dpbi9sb2dpbi5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0xvZ2luQ3RybCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAkc2NvcGUubG9naW4gPSB7fTtcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uIChsb2dpbkluZm8pIHtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ2luKGxvZ2luSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbWVtYmVyc09ubHknLCB7XG4gICAgICAgIHVybDogJy9tZW1iZXJzLWFyZWEnLFxuICAgICAgICB0ZW1wbGF0ZTogJzxpbWcgbmctcmVwZWF0PVwiaXRlbSBpbiBzdGFzaFwiIHdpZHRoPVwiMzAwXCIgbmctc3JjPVwie3sgaXRlbSB9fVwiIC8+JyxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24gKCRzY29wZSwgU2VjcmV0U3Rhc2gpIHtcbiAgICAgICAgICAgIFNlY3JldFN0YXNoLmdldFN0YXNoKCkudGhlbihmdW5jdGlvbiAoc3Rhc2gpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc3Rhc2ggPSBzdGFzaDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGRhdGEuYXV0aGVudGljYXRlIGlzIHJlYWQgYnkgYW4gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgLy8gdGhhdCBjb250cm9scyBhY2Nlc3MgdG8gdGhpcyBzdGF0ZS4gUmVmZXIgdG8gYXBwLmpzLlxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBhdXRoZW50aWNhdGU6IHRydWVcbiAgICAgICAgfVxuICAgIH0pO1xuXG59KTtcblxuYXBwLmZhY3RvcnkoJ1NlY3JldFN0YXNoJywgZnVuY3Rpb24gKCRodHRwKSB7XG5cbiAgICB2YXIgZ2V0U3Rhc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvbWVtYmVycy9zZWNyZXQtc3Rhc2gnKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRTdGFzaDogZ2V0U3Rhc2hcbiAgICB9O1xuXG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ3JhbmtEaXJlY3RpdmUnLCAoKT0+IHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0UnLFxuXHRcdHNjb3BlOiB7XG5cdFx0XHRyYW5rTmFtZTogJ0AnLFxuXHRcdFx0cGxheWVyczogJz0nLFxuXHRcdFx0cmFua0J5OiAnQCcsXG5cdFx0XHRvcmRlcjogJ0AnXG5cdFx0fSxcblx0XHR0ZW1wbGF0ZVVybDogJy9qcy9yYW5rL3JhbmsudGVtcGxhdGUuaHRtbCdcblx0fVxufSk7IiwiYXBwLmZhY3RvcnkoJ1NpZ251cEZhY3RvcnknLCBmdW5jdGlvbigkaHR0cCwgJHN0YXRlLCBBdXRoU2VydmljZSkge1xuXHRjb25zdCBTaWdudXBGYWN0b3J5ID0ge307XG5cblx0U2lnbnVwRmFjdG9yeS5jcmVhdGVVc2VyID0gZnVuY3Rpb24oc2lnbnVwSW5mbykge1xuXHRcdGNvbnNvbGUubG9nKHNpZ251cEluZm8pXG5cdFx0cmV0dXJuICRodHRwLnBvc3QoJy9zaWdudXAnLCBzaWdudXBJbmZvKVxuXHRcdC50aGVuKHJlcyA9PiB7XG5cdFx0XHRpZiAocmVzLnN0YXR1cyA9PT0gMjAxKSB7XG5cdFx0XHRcdEF1dGhTZXJ2aWNlLmxvZ2luKHtlbWFpbDogc2lnbnVwSW5mby5lbWFpbCwgcGFzc3dvcmQ6IHNpZ251cEluZm8ucGFzc3dvcmR9KVxuXHRcdFx0XHQudGhlbih1c2VyID0+IHtcblx0XHRcdFx0XHQkc3RhdGUuZ28oJ2hvbWUnKVxuXHRcdFx0XHR9KVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhyb3cgRXJyb3IoJ0FuIGFjY291bnQgd2l0aCB0aGF0IGVtYWlsIGFscmVhZHkgZXhpc3RzJyk7XG5cdFx0XHR9XG5cdFx0fSlcblx0fVxuXG5cdHJldHVybiBTaWdudXBGYWN0b3J5O1xufSkiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3NpZ251cCcsIHtcbiAgICAgICAgdXJsOiAnL3NpZ251cCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvc2lnbnVwL3NpZ251cC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1NpZ251cEN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignU2lnbnVwQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUsIFNpZ251cEZhY3RvcnkpIHtcblxuICAgICRzY29wZS5zaWdudXAgPSB7fTtcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgJHNjb3BlLnNlbmRTaWdudXAgPSBmdW5jdGlvbihzaWdudXBJbmZvKXtcbiAgICAgICAgU2lnbnVwRmFjdG9yeS5jcmVhdGVVc2VyKHNpZ251cEluZm8pXG4gICAgICAgIC5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnQW4gYWNjb3VudCB3aXRoIHRoYXQgZW1haWwgYWxyZWFkeSBleGlzdHMnO1xuICAgICAgICB9KVxuICAgIH1cbiAgICBcblxuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpe1xuXHQkc3RhdGVQcm92aWRlci5zdGF0ZShcIlVzZXJQcm9maWxlXCIse1xuXHRcdHVybDogXCIvdXNlcnMvOnVzZXJJZFwiLFxuXHRcdHRlbXBsYXRlVXJsOlwianMvdXNlcl9wcm9maWxlL3Byb2ZpbGUudGVtcGxhdGUuaHRtbFwiLFxuXHRcdGNvbnRyb2xsZXI6IFwiVXNlckN0cmxcIlxuXHR9KVxuXHQkc3RhdGVQcm92aWRlci5zdGF0ZShcIkdhbWVSZWNvcmRcIiwge1xuXHRcdHVybDpcIi91c2Vycy86dXNlcklkL2dhbWVzXCIsXG5cdFx0dGVtcGxhdGVVcmw6IFwianMvdXNlcl9wcm9maWxlL2dhbWVzLmh0bWxcIixcblx0XHRjb250cm9sbGVyOiBcIkdhbWVSZWNvcmRDdHJsXCJcblx0fSlcbn0pXG5cbmFwcC5jb250cm9sbGVyKFwiVXNlckN0cmxcIiwgZnVuY3Rpb24oJHNjb3BlLCBVc2VyRmFjdG9yeSwgJHN0YXRlUGFyYW1zKXtcblx0VXNlckZhY3RvcnkuZmV0Y2hJbmZvcm1hdGlvbigkc3RhdGVQYXJhbXMudXNlcklkKVxuXHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0XHQkc2NvcGUudXNlcj11c2VyO1xuXHRcdHJldHVybiB1c2VyXG5cdH0pXG5cdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHRcdCRzY29wZS51cGRhdGVkPSRzY29wZS51c2VyLnVwZGF0ZWRBdC5nZXREYXkoKTtcblx0fSlcbn0pXG5cbmFwcC5jb250cm9sbGVyKFwiR2FtZVJlY29yZEN0cmxcIixmdW5jdGlvbigkc2NvcGUsIFVzZXJGYWN0b3J5LCAkc3RhdGVQYXJhbXMpe1xuXHRVc2VyRmFjdG9yeS5mZXRjaEluZm9ybWF0aW9uKCRzdGF0ZVBhcmFtcy51c2VySWQpXG5cdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHRcdCRzY29wZS51c2VyPXVzZXI7XG5cdH0pXG5cdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHRVc2VyRmFjdG9yeS5mZXRjaEdhbWVzKCRzdGF0ZVBhcmFtcy51c2VySWQpXG5cdH0pXG5cdC50aGVuKGZ1bmN0aW9uKGdhbWVzKXtcblx0XHQkc2NvcGUuZ2FtZXM9Z2FtZXM7XG5cdH0pXG59KSIsImFwcC5mYWN0b3J5KFwiVXNlckZhY3RvcnlcIiwgZnVuY3Rpb24oJGh0dHApe1xuXHRyZXR1cm4ge1xuXHRcdGZldGNoSW5mb3JtYXRpb246IGZ1bmN0aW9uKGlkKXtcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoXCIvYXBpL3VzZXJzL1wiK2lkKVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG5cdFx0XHRcdHJldHVybiB1c2VyLmRhdGE7XG5cdFx0XHR9KVxuXHRcdH0sXG5cdFx0ZmV0Y2hHYW1lczogZnVuY3Rpb24oaWQpe1xuXHRcdFx0cmV0dXJuICRodHRwLmdldChcIi9hcGkvdXNlcnMvXCIraWQrXCIvZ2FtZXNcIilcblx0XHRcdC50aGVuKGZ1bmN0aW9uKGdhbWVzKXtcblx0XHRcdFx0cmV0dXJuIGdhbWVzLmRhdGE7XG5cdFx0XHR9KVxuXHRcdH1cblx0fVxufSkiLCJhcHAuZGlyZWN0aXZlKCduYXZiYXInLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsIEFVVEhfRVZFTlRTLCAkc3RhdGUpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7fSxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcblxuICAgICAgICAgICAgc2NvcGUuaXRlbXMgPSBbXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0hvbWUnLCBzdGF0ZTogJ2hvbWUnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ1lvdXIgUHJvZmlsZScsIHN0YXRlOiAnVXNlclByb2ZpbGUnLCBhdXRoOiB0cnVlIH1cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuXG4gICAgICAgICAgICBzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBzZXRVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgcmVtb3ZlVXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNldFVzZXIoKTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIHJlbW92ZVVzZXIpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZShcInRpbWVyXCIsIGZ1bmN0aW9uKCRxLCAkaW50ZXJ2YWwsIFNvY2tldCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICB0aW1lOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgdGVtcGxhdGVVcmw6IFwianMvY29tbW9uL2RpcmVjdGl2ZXMvdGltZXIvdGltZXIuaHRtbFwiLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICAgICAgdmFyIHRpbWUgPSBzY29wZS50aW1lO1xuICAgICAgICAgICAgdmFyIHN0YXJ0PXNjb3BlLnRpbWU7XG4gICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IGNvbnZlcnQodGltZSk7XG4gICAgICAgICAgICBzY29wZS5jb3VudGRvd24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGltZXIgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWUgLT0gMTtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBjb252ZXJ0KHRpbWUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGltZSA8IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gXCJUaW1lIHVwIVwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbCh0aW1lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lPXN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBzY29wZS5tZXNzYWdlcyA9IFtcIkdldCBSZWFkeSFcIiwgXCJHZXQgU2V0IVwiLCBcIkdvIVwiLCAnLyddO1xuICAgICAgICAgICAgLy8gICAgIHZhciBpbmRleCA9IDA7XG4gICAgICAgICAgICAvLyAgICAgdmFyIHByZXBhcmUgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gc2NvcGUubWVzc2FnZXNbaW5kZXhdO1xuICAgICAgICAgICAgLy8gICAgICAgICBpbmRleCsrO1xuICAgICAgICAgICAgLy8gICAgICAgICBjb25zb2xlLmxvZyhzY29wZS50aW1lX3JlbWFpbmluZyk7XG4gICAgICAgICAgICAvLyAgICAgICAgIGlmIChzY29wZS50aW1lX3JlbWFpbmluZyA9PT0gXCIvXCIpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gY29udmVydCh0aW1lKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwocHJlcGFyZSk7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICB2YXIgdGltZXIgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgdGltZSAtPSAxO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gY29udmVydCh0aW1lKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICBpZiAodGltZSA8IDEpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBcIlRpbWUgdXAhXCI7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwodGltZXIpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgLy8gICAgICAgICB9XG4gICAgICAgICAgICAvLyAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICAvLyB9O1xuXG4gICAgICAgICAgICBTb2NrZXQub24oJ3N0YXJ0Qm9hcmQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5jb3VudGRvd24odGltZSk7XG4gICAgICAgICAgICB9KTtcblxuXG4gICAgICAgICAgICBmdW5jdGlvbiBjb252ZXJ0KHRpbWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2Vjb25kcyA9ICh0aW1lICUgNjApLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgdmFyIGNvbnZlcnNpb24gPSAoTWF0aC5mbG9vcih0aW1lIC8gNjApKSArICc6JztcbiAgICAgICAgICAgICAgICBpZiAoc2Vjb25kcy5sZW5ndGggPCAyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnZlcnNpb24gKz0gJzAnICsgc2Vjb25kcztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb252ZXJzaW9uICs9IHNlY29uZHM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBjb252ZXJzaW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSlcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
