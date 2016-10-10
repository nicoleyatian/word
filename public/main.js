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

    $scope.gameLength = 15;

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiZ2FtZS1zdGF0ZS9ncmlkLmNvbnRyb2xsZXIuanMiLCJnYW1lLXN0YXRlL2dyaWQuZmFjdG9yeS5qcyIsImhvbWUvaG9tZS5jb250cm9sbGVyLmpzIiwiaG9tZS9ob21lLmpzIiwibGVhZGVyQm9hcmQvbGVhZGVyQm9hcmQuY29udHJvbGxlci5qcyIsImxlYWRlckJvYXJkL2xlYWRlckJvYXJkLmZhY3RvcnkuanMiLCJsZWFkZXJCb2FyZC9sZWFkZXJCb2FyZC5zdGF0ZS5qcyIsImxvYmJ5L2xvYmJ5LmNvbnRyb2xsZXIuanMiLCJsb2JieS9sb2JieS5kaXJlY3RpdmUuanMiLCJsb2JieS9sb2JieS5mYWN0b3J5LmpzIiwibG9iYnkvbG9iYnkuc3RhdGUuanMiLCJsb2dpbi9sb2dpbi5qcyIsIm1lbWJlcnMtb25seS9tZW1iZXJzLW9ubHkuanMiLCJyYW5rL3JhbmsuZGlyZWN0aXZlLmpzIiwic2lnbnVwL3NpZ251cC5mYWN0b3J5LmpzIiwic2lnbnVwL3NpZ251cC5qcyIsInVzZXJfcHJvZmlsZS9wcm9maWxlLmNvbnRyb2xsZXIuanMiLCJ1c2VyX3Byb2ZpbGUvcHJvZmlsZS5mYWN0b3J5LmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3RpbWVyL3RpbWVyLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsImFwcCIsImFuZ3VsYXIiLCJtb2R1bGUiLCJjb25maWciLCIkdXJsUm91dGVyUHJvdmlkZXIiLCIkbG9jYXRpb25Qcm92aWRlciIsImh0bWw1TW9kZSIsIm90aGVyd2lzZSIsIndoZW4iLCJsb2NhdGlvbiIsInJlbG9hZCIsInJ1biIsIiRyb290U2NvcGUiLCIkb24iLCJldmVudCIsInRvU3RhdGUiLCJ0b1BhcmFtcyIsImZyb21TdGF0ZSIsImZyb21QYXJhbXMiLCJ0aHJvd25FcnJvciIsImNvbnNvbGUiLCJpbmZvIiwibmFtZSIsImVycm9yIiwiQXV0aFNlcnZpY2UiLCIkc3RhdGUiLCJkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoIiwic3RhdGUiLCJkYXRhIiwiYXV0aGVudGljYXRlIiwiaXNBdXRoZW50aWNhdGVkIiwicHJldmVudERlZmF1bHQiLCJnZXRMb2dnZWRJblVzZXIiLCJ0aGVuIiwidXNlciIsImdvIiwiRXJyb3IiLCJmYWN0b3J5IiwiaW8iLCJvcmlnaW4iLCJjb25zdGFudCIsImxvZ2luU3VjY2VzcyIsImxvZ2luRmFpbGVkIiwibG9nb3V0U3VjY2VzcyIsInNlc3Npb25UaW1lb3V0Iiwibm90QXV0aGVudGljYXRlZCIsIm5vdEF1dGhvcml6ZWQiLCIkcSIsIkFVVEhfRVZFTlRTIiwic3RhdHVzRGljdCIsInJlc3BvbnNlRXJyb3IiLCJyZXNwb25zZSIsIiRicm9hZGNhc3QiLCJzdGF0dXMiLCJyZWplY3QiLCIkaHR0cFByb3ZpZGVyIiwiaW50ZXJjZXB0b3JzIiwicHVzaCIsIiRpbmplY3RvciIsImdldCIsInNlcnZpY2UiLCIkaHR0cCIsIlNlc3Npb24iLCJvblN1Y2Nlc3NmdWxMb2dpbiIsImNyZWF0ZSIsImZyb21TZXJ2ZXIiLCJjYXRjaCIsImxvZ2luIiwiY3JlZGVudGlhbHMiLCJwb3N0IiwibWVzc2FnZSIsImxvZ291dCIsImRlc3Ryb3kiLCJzZWxmIiwiJHN0YXRlUHJvdmlkZXIiLCJ1cmwiLCJ0ZW1wbGF0ZVVybCIsImNvbnRyb2xsZXIiLCIkc2NvcGUiLCJCb2FyZEZhY3RvcnkiLCJTb2NrZXQiLCIkc3RhdGVQYXJhbXMiLCJMb2JieUZhY3RvcnkiLCJyb29tTmFtZSIsInJvb21uYW1lIiwiaGlkZVN0YXJ0Iiwib3RoZXJQbGF5ZXJzIiwiZ2FtZUxlbmd0aCIsImV4cG9ydHMiLCJ3b3JkT2JqIiwid29yZCIsInBsYXllcklkIiwic3RhdGVOdW1iZXIiLCJwb2ludHNFYXJuZWQiLCJtb3VzZUlzRG93biIsImRyYWdnaW5nQWxsb3dlZCIsInN0eWxlIiwiZnJlZXplIiwid2luT3JMb3NlIiwidGltZW91dCIsImhpZGVOYXZiYXIiLCJjaGVja1NlbGVjdGVkIiwiaWQiLCJ0b2dnbGVEcmFnIiwibW91c2VEb3duIiwibW91c2VVcCIsImxlbmd0aCIsInN1Ym1pdCIsImRyYWciLCJzcGFjZSIsImNsaWNrIiwiaGlkZUJvYXJkIiwic3RhcnRHYW1lIiwidXNlcklkcyIsIm1hcCIsImxvZyIsImdldFN0YXJ0Qm9hcmQiLCJnYW1lSWQiLCJxdWl0IiwiYm9hcmQiLCJtZXNzYWdlcyIsInNpemUiLCJzY29yZSIsImx0cnNTZWxlY3RlZCIsIk9iamVjdCIsImtleXMiLCJwcmV2aW91c0x0ciIsImxhc3RMdHIiLCJ2YWxpZFNlbGVjdCIsInN1YnN0cmluZyIsImx0cklkIiwib3RoZXJMdHJzSWRzIiwiaW5jbHVkZXMiLCJjb29yZHMiLCJzcGxpdCIsInJvdyIsImNvbCIsImxhc3RMdHJJZCIsInBvcCIsImNvb3Jkc0xhc3QiLCJyb3dMYXN0IiwiY29sTGFzdCIsInJvd09mZnNldCIsIk1hdGgiLCJhYnMiLCJjb2xPZmZzZXQiLCJjbGVhcklmQ29uZmxpY3RpbmciLCJ1cGRhdGVXb3JkT2JqIiwiZXhwb3J0V29yZE9iaiIsInRpbGVzTW92ZWQiLCJteVdvcmRUaWxlcyIsInNvbWUiLCJjb29yZCIsImNsZWFyIiwib2JqIiwic2h1ZmZsZSIsInVwZGF0ZUJvYXJkIiwia2V5IiwidXBkYXRlU2NvcmUiLCJwb2ludHMiLCJwbGF5ZXIiLCJ1cGRhdGUiLCJ1cGRhdGVPYmoiLCJ1c2VybmFtZSIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCIkZXZhbEFzeW5jIiwicmVwbGF5IiwibmV3R2FtZSIsImdhbWUiLCJhbGxJZHMiLCJhbGwiLCJqb2luR2FtZSIsImUiLCJkZXRlcm1pbmVXaW5uZXIiLCJ3aW5uZXJzQXJyYXkiLCJ3aW5uZXIiLCJ3aW5uZXJzIiwiaSIsImRpc2Nvbm5lY3QiLCJvbiIsImdldEN1cnJlbnRSb29tIiwicm9vbSIsInVzZXJzIiwiZmlsdGVyIiwiZm9yRWFjaCIsImVtaXQiLCJsYXN0V29yZFBsYXllZCIsInVzZXJJZCIsInJlcyIsInF1aXRGcm9tUm9vbSIsImRlbGV0ZSIsIiRsb2NhdGlvbiIsImVudGVyTG9iYnkiLCJMZWFkZXJCb2FyZEZhY3RvcnkiLCJBbGxQbGF5ZXJzIiwicGxheWVycyIsImdhbWVzIiwic2NvcmVzIiwidXNlckdhbWUiLCJoaWdoZXN0U2NvcmUiLCJtYXgiLCJnYW1lc193b24iLCJnYW1lc19wbGF5ZWQiLCJ3aW5fcGVyY2VudGFnZSIsInRvRml4ZWQiLCJyZXNvbHZlIiwiYWxsUGxheWVycyIsInJvb21zIiwicm9vbU5hbWVGb3JtIiwibmV3Um9vbSIsInJvb21JbmZvIiwic2hvd0Zvcm0iLCJkaXJlY3RpdmUiLCJyZXN0cmljdCIsInRlbXBSb29tcyIsImdldEFsbFJvb21zIiwiY29weSIsInJvb21JZCIsInB1dCIsInNlbmRMb2dpbiIsImxvZ2luSW5mbyIsInRlbXBsYXRlIiwiU2VjcmV0U3Rhc2giLCJnZXRTdGFzaCIsInN0YXNoIiwic2NvcGUiLCJyYW5rTmFtZSIsInJhbmtCeSIsIm9yZGVyIiwiU2lnbnVwRmFjdG9yeSIsImNyZWF0ZVVzZXIiLCJzaWdudXBJbmZvIiwiZW1haWwiLCJwYXNzd29yZCIsInNpZ251cCIsInNlbmRTaWdudXAiLCJVc2VyRmFjdG9yeSIsImZldGNoSW5mb3JtYXRpb24iLCJ1cGRhdGVkIiwidXBkYXRlZEF0IiwiZ2V0RGF5IiwiZmV0Y2hHYW1lcyIsImxpbmsiLCJpdGVtcyIsImxhYmVsIiwiYXV0aCIsImlzTG9nZ2VkSW4iLCJzZXRVc2VyIiwicmVtb3ZlVXNlciIsIiRpbnRlcnZhbCIsInRpbWUiLCJzdGFydCIsInRpbWVfcmVtYWluaW5nIiwiY29udmVydCIsImNvdW50ZG93biIsInRpbWVyIiwiY2FuY2VsIiwic2Vjb25kcyIsInRvU3RyaW5nIiwiY29udmVyc2lvbiIsImZsb29yIl0sIm1hcHBpbmdzIjoiQUFBQTs7OztBQUNBQSxPQUFBQyxHQUFBLEdBQUFDLFFBQUFDLE1BQUEsQ0FBQSx1QkFBQSxFQUFBLENBQUEsYUFB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QUEsR0FBQSxHQUFBO0FBQ0Esb0JBQUFPLFFBQUF4SixNQUFBLEdBQUEsQ0FBQSxFQUFBO0FBQ0EwSixrQ0FBQSxNQUFBRixPQUFBO0FBQ0EsaUJBRkEsTUFFQTtBQUNBRSxrQ0FBQUYsT0FBQTtBQUNBO0FBQ0EsdUJBQUFFLFVBQUE7QUFDQTtBQUNBO0FBMURBLEtBQUE7QUE0REEsQ0E3REEiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcbndpbmRvdy5hcHAgPSBhbmd1bGFyLm1vZHVsZSgnRnVsbHN0YWNrR2VuZXJhdGVkQXBwJywgWydmc2FQcmVCdWlsdCcsICd1aS5yb3V0ZXInLCAndWkuYm9vdHN0cmFwJywgJ25nQW5pbWF0ZSddKTtcblxuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHVybFJvdXRlclByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlcikge1xuICAgIC8vIFRoaXMgdHVybnMgb2ZmIGhhc2hiYW5nIHVybHMgKC8jYWJvdXQpIGFuZCBjaGFuZ2VzIGl0IHRvIHNvbWV0aGluZyBub3JtYWwgKC9hYm91dClcbiAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XG4gICAgLy8gSWYgd2UgZ28gdG8gYSBVUkwgdGhhdCB1aS1yb3V0ZXIgZG9lc24ndCBoYXZlIHJlZ2lzdGVyZWQsIGdvIHRvIHRoZSBcIi9cIiB1cmwuXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xuICAgIC8vIFRyaWdnZXIgcGFnZSByZWZyZXNoIHdoZW4gYWNjZXNzaW5nIGFuIE9BdXRoIHJvdXRlXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLndoZW4oJy9hdXRoLzpwcm92aWRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgIH0pO1xufSk7XG5cbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgbGlzdGVuaW5nIHRvIGVycm9ycyBicm9hZGNhc3RlZCBieSB1aS1yb3V0ZXIsIHVzdWFsbHkgb3JpZ2luYXRpbmcgZnJvbSByZXNvbHZlc1xuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSkge1xuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VFcnJvcicsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMsIGZyb21TdGF0ZSwgZnJvbVBhcmFtcywgdGhyb3duRXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5pbmZvKGBUaGUgZm9sbG93aW5nIGVycm9yIHdhcyB0aHJvd24gYnkgdWktcm91dGVyIHdoaWxlIHRyYW5zaXRpb25pbmcgdG8gc3RhdGUgXCIke3RvU3RhdGUubmFtZX1cIi4gVGhlIG9yaWdpbiBvZiB0aGlzIGVycm9yIGlzIHByb2JhYmx5IGEgcmVzb2x2ZSBmdW5jdGlvbjpgKTtcbiAgICAgICAgY29uc29sZS5lcnJvcih0aHJvd25FcnJvcik7XG4gICAgfSk7XG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBjb250cm9sbGluZyBhY2Nlc3MgdG8gc3BlY2lmaWMgc3RhdGVzLlxuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgLy8gVGhlIGdpdmVuIHN0YXRlIHJlcXVpcmVzIGFuIGF1dGhlbnRpY2F0ZWQgdXNlci5cbiAgICB2YXIgZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICByZXR1cm4gc3RhdGUuZGF0YSAmJiBzdGF0ZS5kYXRhLmF1dGhlbnRpY2F0ZTtcbiAgICB9O1xuXG4gICAgLy8gJHN0YXRlQ2hhbmdlU3RhcnQgaXMgYW4gZXZlbnQgZmlyZWRcbiAgICAvLyB3aGVuZXZlciB0aGUgcHJvY2VzcyBvZiBjaGFuZ2luZyBhIHN0YXRlIGJlZ2lucy5cbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zKSB7XG5cbiAgICAgICAgaWYgKCFkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoKHRvU3RhdGUpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVzdGluYXRpb24gc3RhdGUgZG9lcyBub3QgcmVxdWlyZSBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSkge1xuICAgICAgICAgICAgLy8gVGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZC5cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYW5jZWwgbmF2aWdhdGluZyB0byBuZXcgc3RhdGUuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgLy8gSWYgYSB1c2VyIGlzIHJldHJpZXZlZCwgdGhlbiByZW5hdmlnYXRlIHRvIHRoZSBkZXN0aW5hdGlvblxuICAgICAgICAgICAgLy8gKHRoZSBzZWNvbmQgdGltZSwgQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkgd2lsbCB3b3JrKVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbiwgZ28gdG8gXCJsb2dpblwiIHN0YXRlLlxuICAgICAgICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28odG9TdGF0ZS5uYW1lLCB0b1BhcmFtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9KTtcblxufSk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxuICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHRocm93IG5ldyBFcnJvcignSSBjYW5cXCd0IGZpbmQgQW5ndWxhciEnKTtcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbXSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnU29ja2V0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXdpbmRvdy5pbykgdGhyb3cgbmV3IEVycm9yKCdzb2NrZXQuaW8gbm90IGZvdW5kIScpO1xuICAgICAgICByZXR1cm4gd2luZG93LmlvKHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pO1xuICAgIH0pO1xuXG4gICAgLy8gQVVUSF9FVkVOVFMgaXMgdXNlZCB0aHJvdWdob3V0IG91ciBhcHAgdG9cbiAgICAvLyBicm9hZGNhc3QgYW5kIGxpc3RlbiBmcm9tIGFuZCB0byB0aGUgJHJvb3RTY29wZVxuICAgIC8vIGZvciBpbXBvcnRhbnQgZXZlbnRzIGFib3V0IGF1dGhlbnRpY2F0aW9uIGZsb3cuXG4gICAgYXBwLmNvbnN0YW50KCdBVVRIX0VWRU5UUycsIHtcbiAgICAgICAgbG9naW5TdWNjZXNzOiAnYXV0aC1sb2dpbi1zdWNjZXNzJyxcbiAgICAgICAgbG9naW5GYWlsZWQ6ICdhdXRoLWxvZ2luLWZhaWxlZCcsXG4gICAgICAgIGxvZ291dFN1Y2Nlc3M6ICdhdXRoLWxvZ291dC1zdWNjZXNzJyxcbiAgICAgICAgc2Vzc2lvblRpbWVvdXQ6ICdhdXRoLXNlc3Npb24tdGltZW91dCcsXG4gICAgICAgIG5vdEF1dGhlbnRpY2F0ZWQ6ICdhdXRoLW5vdC1hdXRoZW50aWNhdGVkJyxcbiAgICAgICAgbm90QXV0aG9yaXplZDogJ2F1dGgtbm90LWF1dGhvcml6ZWQnXG4gICAgfSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnQXV0aEludGVyY2VwdG9yJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRxLCBBVVRIX0VWRU5UUykge1xuICAgICAgICB2YXIgc3RhdHVzRGljdCA9IHtcbiAgICAgICAgICAgIDQwMTogQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCxcbiAgICAgICAgICAgIDQwMzogQVVUSF9FVkVOVFMubm90QXV0aG9yaXplZCxcbiAgICAgICAgICAgIDQxOTogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsXG4gICAgICAgICAgICA0NDA6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3Qoc3RhdHVzRGljdFtyZXNwb25zZS5zdGF0dXNdLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIGFwcC5jb25maWcoZnVuY3Rpb24gKCRodHRwUHJvdmlkZXIpIHtcbiAgICAgICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaChbXG4gICAgICAgICAgICAnJGluamVjdG9yJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uICgkaW5qZWN0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGluamVjdG9yLmdldCgnQXV0aEludGVyY2VwdG9yJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIF0pO1xuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ0F1dGhTZXJ2aWNlJywgZnVuY3Rpb24gKCRodHRwLCBTZXNzaW9uLCAkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUywgJHEpIHtcblxuICAgICAgICBmdW5jdGlvbiBvblN1Y2Nlc3NmdWxMb2dpbihyZXNwb25zZSkge1xuICAgICAgICAgICAgdmFyIHVzZXIgPSByZXNwb25zZS5kYXRhLnVzZXI7XG4gICAgICAgICAgICBTZXNzaW9uLmNyZWF0ZSh1c2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MpO1xuICAgICAgICAgICAgcmV0dXJuIHVzZXI7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2VzIHRoZSBzZXNzaW9uIGZhY3RvcnkgdG8gc2VlIGlmIGFuXG4gICAgICAgIC8vIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBjdXJyZW50bHkgcmVnaXN0ZXJlZC5cbiAgICAgICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gISFTZXNzaW9uLnVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRMb2dnZWRJblVzZXIgPSBmdW5jdGlvbiAoZnJvbVNlcnZlcikge1xuXG4gICAgICAgICAgICAvLyBJZiBhbiBhdXRoZW50aWNhdGVkIHNlc3Npb24gZXhpc3RzLCB3ZVxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxuICAgICAgICAgICAgLy8gYWx3YXlzIGludGVyZmFjZSB3aXRoIHRoaXMgbWV0aG9kIGFzeW5jaHJvbm91c2x5LlxuXG4gICAgICAgICAgICAvLyBPcHRpb25hbGx5LCBpZiB0cnVlIGlzIGdpdmVuIGFzIHRoZSBmcm9tU2VydmVyIHBhcmFtZXRlcixcbiAgICAgICAgICAgIC8vIHRoZW4gdGhpcyBjYWNoZWQgdmFsdWUgd2lsbCBub3QgYmUgdXNlZC5cblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkgJiYgZnJvbVNlcnZlciAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKFNlc3Npb24udXNlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1ha2UgcmVxdWVzdCBHRVQgL3Nlc3Npb24uXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgdXNlciwgY2FsbCBvblN1Y2Nlc3NmdWxMb2dpbiB3aXRoIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSA0MDEgcmVzcG9uc2UsIHdlIGNhdGNoIGl0IGFuZCBpbnN0ZWFkIHJlc29sdmUgdG8gbnVsbC5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJykudGhlbihvblN1Y2Nlc3NmdWxMb2dpbikuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ2luID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZGVudGlhbHMpXG4gICAgICAgICAgICAgICAgLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLicgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgU2Vzc2lvbi5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMudXNlciA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgdGhpcy51c2VyID0gdXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbn0oKSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ0dhbWUnLCB7XG4gICAgICAgIHVybDogJy9nYW1lLzpyb29tbmFtZScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZ2FtZS1zdGF0ZS9wYWdlLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiBcIkdhbWVDdHJsXCIsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcblxuXG5hcHAuY29udHJvbGxlcignR2FtZUN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIEJvYXJkRmFjdG9yeSwgU29ja2V0LCAkc3RhdGVQYXJhbXMsIEF1dGhTZXJ2aWNlLCAkc3RhdGUsIExvYmJ5RmFjdG9yeSwgJHJvb3RTY29wZSwgJHEpIHtcblxuICAgICRzY29wZS5yb29tTmFtZSA9ICRzdGF0ZVBhcmFtcy5yb29tbmFtZTtcbiAgICAkc2NvcGUuaGlkZVN0YXJ0ID0gdHJ1ZTtcblxuICAgICRzY29wZS5vdGhlclBsYXllcnMgPSBbXTtcblxuICAgICRzY29wZS5nYW1lTGVuZ3RoID0gMTU7XG5cbiAgICAkc2NvcGUuZXhwb3J0cyA9IHtcbiAgICAgICAgd29yZE9iajoge30sXG4gICAgICAgIHdvcmQ6IFwiXCIsXG4gICAgICAgIHBsYXllcklkOiBudWxsLFxuICAgICAgICBzdGF0ZU51bWJlcjogMCxcbiAgICAgICAgcG9pbnRzRWFybmVkOiBudWxsXG4gICAgfTtcblxuICAgICRzY29wZS5tb3VzZUlzRG93biA9IGZhbHNlO1xuICAgICRzY29wZS5kcmFnZ2luZ0FsbG93ZWQgPSBmYWxzZTtcbiAgICAkc2NvcGUuc3R5bGUgPSBudWxsO1xuICAgICRzY29wZS5tZXNzYWdlID0gJyc7XG4gICAgJHNjb3BlLmZyZWV6ZSA9IGZhbHNlO1xuICAgICRzY29wZS53aW5Pckxvc2UgPSBudWxsO1xuICAgICRzY29wZS50aW1lb3V0ID0gbnVsbDtcblxuICAgICRyb290U2NvcGUuaGlkZU5hdmJhciA9IHRydWU7XG5cbiAgICAkc2NvcGUuY2hlY2tTZWxlY3RlZCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIHJldHVybiBpZCBpbiAkc2NvcGUuZXhwb3J0cy53b3JkT2JqO1xuICAgIH07XG5cbiAgICAkc2NvcGUudG9nZ2xlRHJhZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkID0gISRzY29wZS5kcmFnZ2luZ0FsbG93ZWQ7XG4gICAgfTtcblxuICAgICRzY29wZS5tb3VzZURvd24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLm1vdXNlSXNEb3duID0gdHJ1ZTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm1vdXNlVXAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLm1vdXNlSXNEb3duID0gZmFsc2U7XG4gICAgICAgIGlmICgkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkICYmICRzY29wZS5leHBvcnRzLndvcmQubGVuZ3RoID4gMSkgJHNjb3BlLnN1Ym1pdCgkc2NvcGUuZXhwb3J0cyk7XG4gICAgfTtcblxuICAgICRzY29wZS5kcmFnID0gZnVuY3Rpb24oc3BhY2UsIGlkKSB7XG4gICAgICAgIGlmICgkc2NvcGUubW91c2VJc0Rvd24gJiYgJHNjb3BlLmRyYWdnaW5nQWxsb3dlZCkge1xuICAgICAgICAgICAgJHNjb3BlLmNsaWNrKHNwYWNlLCBpZCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLmhpZGVCb2FyZCA9IHRydWU7XG5cbiAgICAvLyBTdGFydCB0aGUgZ2FtZSB3aGVuIGFsbCBwbGF5ZXJzIGhhdmUgam9pbmVkIHJvb21cbiAgICAkc2NvcGUuc3RhcnRHYW1lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB1c2VySWRzID0gJHNjb3BlLm90aGVyUGxheWVycy5tYXAodXNlciA9PiB1c2VyLmlkKTtcbiAgICAgICAgdXNlcklkcy5wdXNoKCRzY29wZS51c2VyLmlkKTtcbiAgICAgICAgY29uc29sZS5sb2coJ29wJywgJHNjb3BlLm90aGVyUGxheWVycywgJ3VpJywgdXNlcklkcyk7XG4gICAgICAgICRzY29wZS53aW5Pckxvc2U9bnVsbDtcbiAgICAgICAgQm9hcmRGYWN0b3J5LmdldFN0YXJ0Qm9hcmQoJHNjb3BlLmdhbWVMZW5ndGgsICRzY29wZS5nYW1lSWQsIHVzZXJJZHMpO1xuICAgIH07XG5cblxuICAgIC8vUXVpdCB0aGUgcm9vbSwgYmFjayB0byBsb2JieVxuICAgICRzY29wZS5xdWl0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRyb290U2NvcGUuaGlkZU5hdmJhciA9IGZhbHNlO1xuICAgICAgICAkc3RhdGUuZ28oJ2xvYmJ5JylcbiAgICB9O1xuXG5cbiAgICAkc2NvcGUuYm9hcmQgPSBbXG4gICAgICAgIFsnYicsICdhJywgJ2QnLCAnZScsICdhJywgJ3InXSxcbiAgICAgICAgWydlJywgJ2YnLCAnZycsICdsJywgJ20nLCAnZSddLFxuICAgICAgICBbJ2gnLCAnaScsICdqJywgJ2YnLCAnbycsICdhJ10sXG4gICAgICAgIFsnYycsICdhJywgJ2QnLCAnZScsICdhJywgJ3InXSxcbiAgICAgICAgWydlJywgJ2YnLCAnZycsICdsJywgJ2QnLCAnZSddLFxuICAgICAgICBbJ2gnLCAnaScsICdqJywgJ2YnLCAnbycsICdhJ11cbiAgICBdO1xuXG4gICAgJHNjb3BlLm1lc3NhZ2VzID0gbnVsbDtcblxuICAgICRzY29wZS5zaXplID0gMztcbiAgICAkc2NvcGUuc2NvcmUgPSAwO1xuXG5cbiAgICAkc2NvcGUuY2xpY2sgPSBmdW5jdGlvbihzcGFjZSwgaWQpIHtcbiAgICAgICAgaWYgKCRzY29wZS5mcmVlemUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZygnY2xpY2tlZCAnLCBzcGFjZSwgaWQpO1xuICAgICAgICB2YXIgbHRyc1NlbGVjdGVkID0gT2JqZWN0LmtleXMoJHNjb3BlLmV4cG9ydHMud29yZE9iaik7XG4gICAgICAgIHZhciBwcmV2aW91c0x0ciA9IGx0cnNTZWxlY3RlZFtsdHJzU2VsZWN0ZWQubGVuZ3RoIC0gMl07XG4gICAgICAgIHZhciBsYXN0THRyID0gbHRyc1NlbGVjdGVkW2x0cnNTZWxlY3RlZC5sZW5ndGggLSAxXTtcbiAgICAgICAgaWYgKCFsdHJzU2VsZWN0ZWQubGVuZ3RoIHx8IHZhbGlkU2VsZWN0KGlkLCBsdHJzU2VsZWN0ZWQpKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkICs9IHNwYWNlO1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZE9ialtpZF0gPSBzcGFjZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCRzY29wZS5leHBvcnRzKTtcbiAgICAgICAgfSBlbHNlIGlmIChpZCA9PT0gcHJldmlvdXNMdHIpIHtcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLndvcmQgPSAkc2NvcGUuZXhwb3J0cy53b3JkLnN1YnN0cmluZygwLCAkc2NvcGUuZXhwb3J0cy53b3JkLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgZGVsZXRlICRzY29wZS5leHBvcnRzLndvcmRPYmpbbGFzdEx0cl07XG4gICAgICAgIH0gZWxzZSBpZiAobHRyc1NlbGVjdGVkLmxlbmd0aCA9PT0gMSAmJiBpZCA9PT0gbGFzdEx0cikge1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZCA9IFwiXCI7XG4gICAgICAgICAgICBkZWxldGUgJHNjb3BlLmV4cG9ydHMud29yZE9ialtsYXN0THRyXTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvL21ha2VzIHN1cmUgbGV0dGVyIGlzIGFkamFjZW50IHRvIHByZXYgbHRyLCBhbmQgaGFzbid0IGJlZW4gdXNlZCB5ZXRcbiAgICBmdW5jdGlvbiB2YWxpZFNlbGVjdChsdHJJZCwgb3RoZXJMdHJzSWRzKSB7XG4gICAgICAgIGlmIChvdGhlckx0cnNJZHMuaW5jbHVkZXMobHRySWQpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHZhciBjb29yZHMgPSBsdHJJZC5zcGxpdCgnLScpO1xuICAgICAgICB2YXIgcm93ID0gY29vcmRzWzBdO1xuICAgICAgICB2YXIgY29sID0gY29vcmRzWzFdO1xuICAgICAgICB2YXIgbGFzdEx0cklkID0gb3RoZXJMdHJzSWRzLnBvcCgpO1xuICAgICAgICB2YXIgY29vcmRzTGFzdCA9IGxhc3RMdHJJZC5zcGxpdCgnLScpO1xuICAgICAgICB2YXIgcm93TGFzdCA9IGNvb3Jkc0xhc3RbMF07XG4gICAgICAgIHZhciBjb2xMYXN0ID0gY29vcmRzTGFzdFsxXTtcbiAgICAgICAgdmFyIHJvd09mZnNldCA9IE1hdGguYWJzKHJvdyAtIHJvd0xhc3QpO1xuICAgICAgICB2YXIgY29sT2Zmc2V0ID0gTWF0aC5hYnMoY29sIC0gY29sTGFzdCk7XG4gICAgICAgIHJldHVybiAocm93T2Zmc2V0IDw9IDEgJiYgY29sT2Zmc2V0IDw9IDEpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsZWFySWZDb25mbGljdGluZyh1cGRhdGVXb3JkT2JqLCBleHBvcnRXb3JkT2JqKSB7XG4gICAgICAgIHZhciB0aWxlc01vdmVkID0gT2JqZWN0LmtleXModXBkYXRlV29yZE9iaik7XG4gICAgICAgIHZhciBteVdvcmRUaWxlcyA9IE9iamVjdC5rZXlzKGV4cG9ydFdvcmRPYmopO1xuICAgICAgICBpZiAodGlsZXNNb3ZlZC5zb21lKGNvb3JkID0+IG15V29yZFRpbGVzLmluY2x1ZGVzKGNvb3JkKSkpICRzY29wZS5jbGVhcigpO1xuICAgIH1cblxuICAgICRzY29wZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkID0gXCJcIjtcbiAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZE9iaiA9IHt9O1xuICAgIH07XG5cblxuICAgICRzY29wZS5zdWJtaXQgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3N1Ym1pdHRpbmcgJywgb2JqKTtcbiAgICAgICAgQm9hcmRGYWN0b3J5LnN1Ym1pdChvYmopO1xuICAgICAgICAkc2NvcGUuY2xlYXIoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNodWZmbGUgPSBCb2FyZEZhY3Rvcnkuc2h1ZmZsZTtcblxuXG4gICAgJHNjb3BlLnVwZGF0ZUJvYXJkID0gZnVuY3Rpb24od29yZE9iaikge1xuICAgICAgICBjb25zb2xlLmxvZygnc2NvcGUuYm9hcmQnLCAkc2NvcGUuYm9hcmQpO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gd29yZE9iaikge1xuICAgICAgICAgICAgdmFyIGNvb3JkcyA9IGtleS5zcGxpdCgnLScpO1xuICAgICAgICAgICAgdmFyIHJvdyA9IGNvb3Jkc1swXTtcbiAgICAgICAgICAgIHZhciBjb2wgPSBjb29yZHNbMV07XG4gICAgICAgICAgICAkc2NvcGUuYm9hcmRbcm93XVtjb2xdID0gd29yZE9ialtrZXldO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS51cGRhdGVTY29yZSA9IGZ1bmN0aW9uKHBvaW50cywgcGxheWVySWQpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3VwZGF0ZSBzY29yZSBwb2ludHMnLCBwb2ludHMpO1xuICAgICAgICBpZiAocGxheWVySWQgPT09ICRzY29wZS51c2VyLmlkKSB7XG4gICAgICAgICAgICAkc2NvcGUuc2NvcmUgKz0gcG9pbnRzO1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMucG9pbnRzRWFybmVkID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIHBsYXllciBpbiAkc2NvcGUub3RoZXJQbGF5ZXJzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCRzY29wZS5vdGhlclBsYXllcnNbcGxheWVyXS5pZCA9PT0gcGxheWVySWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVyc1twbGF5ZXJdLnNjb3JlICs9IHBvaW50cztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMucG9pbnRzRWFybmVkID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgICRzY29wZS51cGRhdGUgPSBmdW5jdGlvbih1cGRhdGVPYmopIHtcbiAgICAgICAgJHNjb3BlLnVwZGF0ZVNjb3JlKHVwZGF0ZU9iai5wb2ludHNFYXJuZWQsIHVwZGF0ZU9iai5wbGF5ZXJJZCk7XG4gICAgICAgICRzY29wZS51cGRhdGVCb2FyZCh1cGRhdGVPYmoud29yZE9iaik7XG4gICAgICAgIGlmICgrJHNjb3BlLnVzZXIuaWQgPT09ICt1cGRhdGVPYmoucGxheWVySWQpIHtcbiAgICAgICAgICAgIHZhciBwbGF5ZXIgPSAkc2NvcGUudXNlci51c2VybmFtZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiAkc2NvcGUub3RoZXJQbGF5ZXJzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCskc2NvcGUub3RoZXJQbGF5ZXJzW2tleV0uaWQgPT09ICt1cGRhdGVPYmoucGxheWVySWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBsYXllciA9ICRzY29wZS5vdGhlclBsYXllcnNba2V5XS51c2VybmFtZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICRzY29wZS5tZXNzYWdlID0gcGxheWVyICsgXCIgcGxheWVkIFwiICsgdXBkYXRlT2JqLndvcmQgKyBcIiBmb3IgXCIgKyB1cGRhdGVPYmoucG9pbnRzRWFybmVkICsgXCIgcG9pbnRzIVwiO1xuICAgICAgICBpZiAoJHNjb3BlLnRpbWVvdXQpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCgkc2NvcGUudGltZW91dCk7XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHNjb3BlLm1lc3NhZ2UgPSAnJztcbiAgICAgICAgfSwgMzAwMClcbiAgICAgICAgY29uc29sZS5sb2coJ2l0cyB1cGRhdGluZyEnKTtcbiAgICAgICAgY2xlYXJJZkNvbmZsaWN0aW5nKHVwZGF0ZU9iaiwgJHNjb3BlLmV4cG9ydHMud29yZE9iaik7XG4gICAgICAgICRzY29wZS5leHBvcnRzLnN0YXRlTnVtYmVyID0gdXBkYXRlT2JqLnN0YXRlTnVtYmVyO1xuICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgIH07XG5cbiAgICAkc2NvcGUucmVwbGF5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIExvYmJ5RmFjdG9yeS5uZXdHYW1lKHsgcm9vbW5hbWU6ICRzY29wZS5yb29tTmFtZSB9KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZ2FtZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVwbGF5IGdhbWUgb2JqOlwiLCBnYW1lKTtcblxuICAgICAgICAgICAgICAgICRzY29wZS5nYW1lSWQgPSBnYW1lLmlkO1xuICAgICAgICAgICAgICAgICRzY29wZS5zdGFydEdhbWUoKTtcbiAgICAgICAgICAgICAgICB2YXIgYWxsSWRzID0gJHNjb3BlLm90aGVyUGxheWVycy5tYXAocGxheWVyID0+IHBsYXllci5pZCk7XG4gICAgICAgICAgICAgICAgYWxsSWRzLnB1c2goJHNjb3BlLnVzZXIuaWQpO1xuICAgICAgICAgICAgICAgICRxLmFsbChhbGxJZHMubWFwKGlkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgTG9iYnlGYWN0b3J5LmpvaW5HYW1lKCRzY29wZS5nYW1lSWQsIGlkKTtcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdlcnJvciByZXN0YXJ0aW5nIHRoZSBnYW1lJywgZSk7XG4gICAgICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmRldGVybWluZVdpbm5lciA9IGZ1bmN0aW9uKHdpbm5lcnNBcnJheSkge1xuICAgICAgICBpZiAod2lubmVyc0FycmF5Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgaWYgKCt3aW5uZXJzQXJyYXlbMF0gPT09ICskc2NvcGUudXNlci5pZCkge1xuICAgICAgICAgICAgICAgICRzY29wZS53aW5Pckxvc2UgPSBcIkNvbmdyYXR1bGF0aW9uISBZb3UgYXJlIGEgd29yZCB3aXphcmQhIFlvdSB3b24hISFcIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgcGxheWVyIGluICRzY29wZS5vdGhlclBsYXllcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCskc2NvcGUub3RoZXJQbGF5ZXJzW3BsYXllcl0uaWQgPT09ICt3aW5uZXJzQXJyYXlbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB3aW5uZXIgPSAkc2NvcGUub3RoZXJQbGF5ZXJzW3BsYXllcl0udXNlcm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUud2luT3JMb3NlID0gXCJUb3VnaCBsdWNrLiBcIiArIHdpbm5lciArIFwiIGhhcyBiZWF0ZW4geW91LiBCZXR0ZXIgTHVjayBuZXh0IHRpbWUuIDooXCJcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCB3aW5uZXJzID0gW107XG4gICAgICAgICAgICBmb3IgKHZhciBpIGluIHdpbm5lcnNBcnJheSkge1xuICAgICAgICAgICAgICAgIGlmICgrd2lubmVyc0FycmF5W2ldID09PSArJHNjb3BlLnVzZXIuaWQpIHsgd2lubmVycy5wdXNoKCRzY29wZS51c2VyLnVzZXJuYW1lKTsgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgcGxheWVyIGluICRzY29wZS5vdGhlclBsYXllcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkc2NvcGUub3RoZXJQbGF5ZXJzW3BsYXllcl0uaWQgPT0gd2lubmVyc0FycmF5W2ldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lubmVycy5wdXNoKCRzY29wZS5vdGhlclBsYXllcnNbcGxheWVyXS51c2VybmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cod2lubmVycyk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLndpbk9yTG9zZSA9IFwiVGhlIGdhbWUgd2FzIGEgdGllIGJldHdlZW4gXCI7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB3aW5uZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpID09PSB3aW5uZXJzLmxlbmd0aCAtIDEpIHsgJHNjb3BlLndpbk9yTG9zZSArPSBcImFuZCBcIiArIHdpbm5lcnNbaV0gKyBcIi5cIjsgfSBlbHNlIHsgJHNjb3BlLndpbk9yTG9zZSArPSB3aW5uZXJzW2ldICsgXCIsIFwiOyB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnZGVzdHJveWVkJyk7XG4gICAgICAgIFNvY2tldC5kaXNjb25uZWN0KCk7XG5cbiAgICB9KTtcblxuICAgIFNvY2tldC5vbignY29ubmVjdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnY29ubmVjdGluZycpO1xuICAgICAgICAkcS5hbGwoW1xuICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndXNlciBmcm9tIEF1dGhTZXJ2aWNlJywgdXNlcik7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgICAgICRzY29wZS5leHBvcnRzLnBsYXllcklkID0gdXNlci5pZDtcbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAvL2dldCB0aGUgY3VycmVudCByb29tIGluZm9cbiAgICAgICAgICAgIEJvYXJkRmFjdG9yeS5nZXRDdXJyZW50Um9vbSgkc3RhdGVQYXJhbXMucm9vbW5hbWUpXG4gICAgICAgICAgICAudGhlbihyb29tID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyb29tKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZ2FtZUlkID0gcm9vbS5pZDtcbiAgICAgICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzID0gcm9vbS51c2Vycy5maWx0ZXIodXNlciA9PiB1c2VyLmlkICE9PSAkc2NvcGUudXNlci5pZCk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVycy5mb3JFYWNoKHBsYXllciA9PiB7IHBsYXllci5zY29yZSA9IDAgfSk7XG4gICAgICAgICAgICAgICAgTG9iYnlGYWN0b3J5LmpvaW5HYW1lKHJvb20uaWQsICRzY29wZS51c2VyLmlkKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIF0pLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBTb2NrZXQuZW1pdCgnam9pblJvb20nLCAkc2NvcGUudXNlciwgJHNjb3BlLnJvb21OYW1lLCAkc2NvcGUuZ2FtZUlkKTtcbiAgICAgICAgICAgICRzY29wZS5oaWRlU3RhcnQgPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZW1pdHRpbmcgXCJqb2luIHJvb21cIiBldmVudCB0byBzZXJ2ZXIgOFAnLCAkc2NvcGUucm9vbU5hbWUpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdlcnJvciBncmFiYmluZyB1c2VyIG9yIHJvb20gZnJvbSBkYjogJywgZSk7XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgU29ja2V0Lm9uKCdyb29tSm9pblN1Y2Nlc3MnLCBmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnbmV3IHVzZXIgam9pbmluZycsIHVzZXIuaWQpO1xuICAgICAgICAgICAgdXNlci5zY29yZSA9IDA7XG4gICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzLnB1c2godXNlcik7XG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuXG4gICAgICAgIH0pO1xuXG4gICAgICAgIFNvY2tldC5vbignc3RhcnRCb2FyZCcsIGZ1bmN0aW9uKGJvYXJkKSB7XG4gICAgICAgICAgICAkc2NvcGUuZnJlZXplID0gZmFsc2U7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnYm9hcmQhICcsIGJvYXJkKTtcbiAgICAgICAgICAgICRzY29wZS5ib2FyZCA9IGJvYXJkO1xuICAgICAgICAgICAgLy8gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMuZm9yRWFjaChwbGF5ZXIgPT4geyBwbGF5ZXIuc2NvcmUgPSAwIH0pO1xuICAgICAgICAgICAgJHNjb3BlLnNjb3JlID0gMDtcbiAgICAgICAgICAgICRzY29wZS5oaWRlQm9hcmQgPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgICAgICAvLyB9LCAzMDAwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCd3b3JkVmFsaWRhdGVkJywgZnVuY3Rpb24odXBkYXRlT2JqKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnd29yZCBpcyB2YWxpZGF0ZWQnKTtcbiAgICAgICAgICAgICRzY29wZS51cGRhdGUodXBkYXRlT2JqKTtcbiAgICAgICAgICAgICRzY29wZS5sYXN0V29yZFBsYXllZCA9IHVwZGF0ZU9iai53b3JkO1xuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCdib2FyZFNodWZmbGVkJywgZnVuY3Rpb24oYm9hcmQsIHVzZXJJZCwgc3RhdGVOdW1iZXIpIHtcbiAgICAgICAgICAgICRzY29wZS5ib2FyZCA9IGJvYXJkO1xuICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZVNjb3JlKC01LCB1c2VySWQpO1xuICAgICAgICAgICAgJHNjb3BlLmNsZWFyKCk7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy5zdGF0ZU51bWJlciA9IHN0YXRlTnVtYmVyO1xuICAgICAgICAgICAgJHNjb3BlLm1lc3NhZ2UgPSB1c2VySWQgKyBcIiBzaHVmZmxlZCB0aGUgYm9hcmQhXCI7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygkc2NvcGUubWVzc2FnZSk7XG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICBTb2NrZXQub24oJ3BsYXllckRpc2Nvbm5lY3RlZCcsIGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwbGF5ZXJEaXNjb25uZWN0ZWQnLCB1c2VyLmlkKTtcbiAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMgPSAkc2NvcGUub3RoZXJQbGF5ZXJzLm1hcChvdGhlclBsYXllcnMgPT4gb3RoZXJQbGF5ZXJzLmlkICE9PSB1c2VyLmlkKTtcblxuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCdnYW1lT3ZlcicsIGZ1bmN0aW9uKHdpbm5lcnNBcnJheSkge1xuICAgICAgICAgICAgJHNjb3BlLmNsZWFyKCk7XG4gICAgICAgICAgICAkc2NvcGUuZnJlZXplID0gdHJ1ZTtcbiAgICAgICAgICAgICRzY29wZS5kZXRlcm1pbmVXaW5uZXIod2lubmVyc0FycmF5KTtcbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZ2FtZSBpcyBvdmVyLCB3aW5uZXJzOiAnLCB3aW5uZXJzQXJyYXkpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkgKFwiQm9hcmRGYWN0b3J5XCIsIGZ1bmN0aW9uKCRodHRwLCBTb2NrZXQpe1xuXHRyZXR1cm57XG5cdFx0Z2V0U3RhcnRCb2FyZDogZnVuY3Rpb24oZ2FtZUxlbmd0aCwgZ2FtZUlkLCB1c2VySWRzKXtcblx0XHRcdGNvbnNvbGUubG9nKCdmYWN0b3J5LiBnbDogJywgZ2FtZUxlbmd0aCk7XG5cdFx0XHRTb2NrZXQuZW1pdCgnZ2V0U3RhcnRCb2FyZCcsIGdhbWVMZW5ndGgsIGdhbWVJZCwgdXNlcklkcyk7XG5cdFx0fSxcblxuXHRcdHN1Ym1pdDogZnVuY3Rpb24ob2JqKXtcblx0XHRcdFNvY2tldC5lbWl0KCdzdWJtaXRXb3JkJywgb2JqKTtcblx0XHR9LFxuXG5cdFx0c2h1ZmZsZTogZnVuY3Rpb24odXNlcil7XG5cdFx0XHRjb25zb2xlLmxvZygnZ3JpZGZhY3RvcnkgdScsdXNlci5pZCk7XG5cdFx0XHRTb2NrZXQuZW1pdCgnc2h1ZmZsZUJvYXJkJyx1c2VyLmlkKTtcblx0XHR9LFxuXG5cdFx0Ly8gZmluZEFsbE90aGVyVXNlcnM6IGZ1bmN0aW9uKGdhbWUpIHtcblx0XHQvLyBcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvZ2FtZXMvJysgZ2FtZS5pZClcblx0XHQvLyBcdC50aGVuKHJlcyA9PiByZXMuZGF0YSlcblx0XHQvLyB9LFxuXG5cdFx0Z2V0Q3VycmVudFJvb206IGZ1bmN0aW9uKHJvb21uYW1lKSB7XG5cdFx0XHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2dhbWVzL3Jvb21zLycrcm9vbW5hbWUpXG5cdFx0XHQudGhlbihyZXMgPT4gcmVzLmRhdGEpXG5cdFx0fSxcblxuXHRcdHF1aXRGcm9tUm9vbTogZnVuY3Rpb24oZ2FtZUlkLCB1c2VySWQpIHtcblx0XHRcdC8vIFNvY2tldC5lbWl0KCdkaXNjb25uZWN0Jywgcm9vbU5hbWUsIHVzZXJJZCk7XG5cdFx0XHRyZXR1cm4gJGh0dHAuZGVsZXRlKCcvYXBpL2dhbWVzLycrZ2FtZUlkKycvJyt1c2VySWQpXG5cdFx0fVxuXHR9XG59KTtcbiIsImFwcC5jb250cm9sbGVyKCdIb21lQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlLCAkbG9jYXRpb24pe1xuICAkc2NvcGUuZW50ZXJMb2JieSA9IGZ1bmN0aW9uKCl7XG4gICAgJHN0YXRlLmdvKCdsb2JieScsIHtyZWxvYWQ6IHRydWV9KTtcbiAgfVxufSk7XG5cbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUnLCB7XG4gICAgICAgIHVybDogJy8nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJ1xuICAgIH0pO1xufSk7XG5cbiIsImFwcC5jb250cm9sbGVyKCdMZWFkZXJCb2FyZEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIExlYWRlckJvYXJkRmFjdG9yeSwgJHN0YXRlLCBBdXRoU2VydmljZSkge1xuICAgIGNvbnNvbGUubG9nKCcgMScpXG4gICAgTGVhZGVyQm9hcmRGYWN0b3J5LkFsbFBsYXllcnMoKVxuICAgIC50aGVuKHBsYXllcnMgPT4ge1xuICAgICAgICBwbGF5ZXJzLmZvckVhY2gocGxheWVyID0+IHtcbiAgICAgICAgICAgIGlmIChwbGF5ZXIuZ2FtZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciBzY29yZXMgPSBwbGF5ZXIuZ2FtZXMubWFwKGdhbWUgPT4gZ2FtZS51c2VyR2FtZS5zY29yZSlcbiAgICAgICAgICAgICAgICBwbGF5ZXIuaGlnaGVzdFNjb3JlID0gTWF0aC5tYXgoLi4uc2NvcmVzKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwbGF5ZXIuaGlnaGVzdFNjb3JlID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBsYXllci5nYW1lc193b24gPSBwbGF5ZXIud2lubmVyLmxlbmd0aDtcbiAgICAgICAgICAgIHBsYXllci5nYW1lc19wbGF5ZWQgPSBwbGF5ZXIuZ2FtZXMubGVuZ3RoO1xuICAgICAgICAgICAgaWYocGxheWVyLmdhbWVzLmxlbmd0aD09PTApe1xuICAgICAgICAgICAgXHRwbGF5ZXIud2luX3BlcmNlbnRhZ2UgPSAwICsgJyUnXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgXHRwbGF5ZXIud2luX3BlcmNlbnRhZ2UgPSAoKHBsYXllci53aW5uZXIubGVuZ3RoL3BsYXllci5nYW1lcy5sZW5ndGgpKjEwMCkudG9GaXhlZCgwKSArICclJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KVxuICAgICAgICAkc2NvcGUucGxheWVycyA9IHBsYXllcnM7XG4gICAgfSlcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ0xlYWRlckJvYXJkRmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuXHR2YXIgTGVhZGVyQm9hcmRGYWN0b3J5ID0ge307XG5cblx0TGVhZGVyQm9hcmRGYWN0b3J5LkFsbFBsYXllcnMgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3VzZXJzJylcblx0XHQudGhlbihyZXM9PnJlcy5kYXRhKVxuXHR9XG5cblx0cmV0dXJuIExlYWRlckJvYXJkRmFjdG9yeTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsZWFkZXJCb2FyZCcsIHtcbiAgICAgICAgdXJsOiAnL2xlYWRlckJvYXJkJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sZWFkZXJCb2FyZC9sZWFkZXJCb2FyZC50ZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICBcdGFsbFBsYXllcnM6IGZ1bmN0aW9uKExlYWRlckJvYXJkRmFjdG9yeSkge1xuICAgICAgICBcdFx0cmV0dXJuIExlYWRlckJvYXJkRmFjdG9yeS5BbGxQbGF5ZXJzO1xuICAgICAgICBcdH0sXG4gICAgICAgICAgICBcbiAgICAgICAgfSxcbiAgICAgICAgY29udHJvbGxlcjogJ0xlYWRlckJvYXJkQ3RybCdcbiAgICB9KTtcblxufSk7IiwiYXBwLmNvbnRyb2xsZXIoJ0xvYmJ5Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgTG9iYnlGYWN0b3J5LCByb29tcywgJHN0YXRlLCBBdXRoU2VydmljZSkge1xuXG4gICAgLy8gQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKClcbiAgICAvLyAgICAgLnRoZW4oZnVuY3Rpb24odXNlcikge1xuICAgIC8vICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgIC8vICAgICB9KTtcblxuICAgICRzY29wZS5yb29tcyA9IHJvb21zO1xuICAgICRzY29wZS5yb29tTmFtZUZvcm0gPSBmYWxzZTtcbiAgICAvLyAkc2NvcGUudXNlciA9IHtcbiAgICAvLyAgaWQ6IDNcbiAgICAvLyB9XG5cbiAgICAvLyAkc2NvcGUuam9pbkdhbWUgPSBmdW5jdGlvbihyb29tKSB7XG4gICAgLy8gICAgIGNvbnNvbGUubG9nKFwiaW0gY2hhbmdpbmcgc3RhdGUgYW5kIHJlbG9hZGluZ1wiKTtcbiAgICAvLyAgICAgJHN0YXRlLmdvKCdHYW1lJywgeyByb29tbmFtZTogcm9vbS5yb29tbmFtZSB9LCB7IHJlbG9hZDogdHJ1ZSwgbm90aWZ5OiB0cnVlIH0pXG4gICAgLy8gfTtcblxuICAgICRzY29wZS5uZXdSb29tID0gZnVuY3Rpb24ocm9vbUluZm8pIHtcbiAgICAgICAgTG9iYnlGYWN0b3J5Lm5ld0dhbWUocm9vbUluZm8pO1xuICAgICAgICAkc2NvcGUucm9vbU5hbWVGb3JtID0gZmFsc2U7XG4gICAgfTtcbiAgICAkc2NvcGUuc2hvd0Zvcm0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLnJvb21OYW1lRm9ybSA9IHRydWU7XG4gICAgfTtcblxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdlbnRlckxvYmJ5JywgZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlVXJsOiAnanMvbG9iYnkvbG9iYnktYnV0dG9uLmh0bWwnLFxuICAgIGNvbnRyb2xsZXI6ICdIb21lQ3RybCdcbiAgfVxufSlcbiIsImFwcC5mYWN0b3J5KCdMb2JieUZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHApIHtcblx0dmFyIExvYmJ5RmFjdG9yeSA9IHt9O1xuXHR2YXIgdGVtcFJvb21zID0gW107IC8vd29yayB3aXRoIHNvY2tldD9cblxuXHRMb2JieUZhY3RvcnkuZ2V0QWxsUm9vbXMgPSBmdW5jdGlvbigpe1xuXHRcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvZ2FtZXMvcm9vbXMnKVxuXHRcdC50aGVuKHJlcyA9PiByZXMuZGF0YSlcblx0XHQudGhlbihyb29tcyA9PiB7XG5cdFx0XHRhbmd1bGFyLmNvcHkocm9vbXMsIHRlbXBSb29tcyk7XG5cdFx0XHRyZXR1cm4gdGVtcFJvb21zO1xuXHRcdH0pXG5cdH07XG5cblx0TG9iYnlGYWN0b3J5LmpvaW5HYW1lID0gZnVuY3Rpb24ocm9vbUlkLCB1c2VySWQpIHtcbiAgICBjb25zb2xlLmxvZygnbG9iYnkgZmFjdG9yeSBqb2luIGdhbWUnKTtcblx0XHRyZXR1cm4gJGh0dHAucHV0KCcvYXBpL2dhbWVzLycrIHJvb21JZCArJy9wbGF5ZXInLCB7aWQ6IHVzZXJJZH0pXG5cdFx0LnRoZW4ocmVzPT5yZXMuZGF0YSlcblx0fTtcblxuXHRMb2JieUZhY3RvcnkubmV3R2FtZSA9IGZ1bmN0aW9uKHJvb21JbmZvKSB7XG5cdFx0cmV0dXJuICRodHRwLnB1dCgnL2FwaS9nYW1lcycsIHJvb21JbmZvKVxuXHRcdC50aGVuKHJlcyA9PiByZXMuZGF0YSlcblx0IFx0LnRoZW4ocm9vbSA9PiB7XG5cdCBcdFx0dGVtcFJvb21zLnB1c2gocm9vbSk7XG5cdCBcdFx0cmV0dXJuIHJvb207XG5cdCBcdFx0fSk7XG5cdH07XG5cblx0TG9iYnlGYWN0b3J5LkFsbFBsYXllcnMgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3VzZXJzJylcblx0XHQudGhlbihyZXM9PnJlcy5kYXRhKVxuXHR9O1xuXG5cdHJldHVybiBMb2JieUZhY3Rvcnk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9iYnknLCB7XG4gICAgICAgIHVybDogJy9sb2JieScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9iYnkvbG9iYnkudGVtcGxhdGUuaHRtbCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgXHRyb29tczogZnVuY3Rpb24oTG9iYnlGYWN0b3J5KSB7XG4gICAgICAgIFx0XHRyZXR1cm4gTG9iYnlGYWN0b3J5LmdldEFsbFJvb21zKCk7XG4gICAgICAgIFx0fVxuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiAnTG9iYnlDdHJsJ1xuICAgIH0pO1xuXG59KTsiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xuICAgICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0xvZ2luQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgICRzY29wZS5sb2dpbiA9IHt9O1xuICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAkc2NvcGUuc2VuZExvZ2luID0gZnVuY3Rpb24gKGxvZ2luSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UubG9naW4obG9naW5JbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdtZW1iZXJzT25seScsIHtcbiAgICAgICAgdXJsOiAnL21lbWJlcnMtYXJlYScsXG4gICAgICAgIHRlbXBsYXRlOiAnPGltZyBuZy1yZXBlYXQ9XCJpdGVtIGluIHN0YXNoXCIgd2lkdGg9XCIzMDBcIiBuZy1zcmM9XCJ7eyBpdGVtIH19XCIgLz4nLFxuICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlLCBTZWNyZXRTdGFzaCkge1xuICAgICAgICAgICAgU2VjcmV0U3Rhc2guZ2V0U3Rhc2goKS50aGVuKGZ1bmN0aW9uIChzdGFzaCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5zdGFzaCA9IHN0YXNoO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgZGF0YS5hdXRoZW50aWNhdGUgaXMgcmVhZCBieSBhbiBldmVudCBsaXN0ZW5lclxuICAgICAgICAvLyB0aGF0IGNvbnRyb2xzIGFjY2VzcyB0byB0aGlzIHN0YXRlLiBSZWZlciB0byBhcHAuanMuXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxuICAgICAgICB9XG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuZmFjdG9yeSgnU2VjcmV0U3Rhc2gnLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBnZXRTdGFzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9tZW1iZXJzL3NlY3JldC1zdGFzaCcpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGdldFN0YXNoOiBnZXRTdGFzaFxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgncmFua0RpcmVjdGl2ZScsICgpPT4ge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnRScsXG5cdFx0c2NvcGU6IHtcblx0XHRcdHJhbmtOYW1lOiAnQCcsXG5cdFx0XHRwbGF5ZXJzOiAnPScsXG5cdFx0XHRyYW5rQnk6ICdAJyxcblx0XHRcdG9yZGVyOiAnQCdcblx0XHR9LFxuXHRcdHRlbXBsYXRlVXJsOiAnL2pzL3JhbmsvcmFuay50ZW1wbGF0ZS5odG1sJ1xuXHR9XG59KTsiLCJhcHAuZmFjdG9yeSgnU2lnbnVwRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwLCAkc3RhdGUsIEF1dGhTZXJ2aWNlKSB7XG5cdGNvbnN0IFNpZ251cEZhY3RvcnkgPSB7fTtcblxuXHRTaWdudXBGYWN0b3J5LmNyZWF0ZVVzZXIgPSBmdW5jdGlvbihzaWdudXBJbmZvKSB7XG5cdFx0Y29uc29sZS5sb2coc2lnbnVwSW5mbylcblx0XHRyZXR1cm4gJGh0dHAucG9zdCgnL3NpZ251cCcsIHNpZ251cEluZm8pXG5cdFx0LnRoZW4ocmVzID0+IHtcblx0XHRcdGlmIChyZXMuc3RhdHVzID09PSAyMDEpIHtcblx0XHRcdFx0QXV0aFNlcnZpY2UubG9naW4oe2VtYWlsOiBzaWdudXBJbmZvLmVtYWlsLCBwYXNzd29yZDogc2lnbnVwSW5mby5wYXNzd29yZH0pXG5cdFx0XHRcdC50aGVuKHVzZXIgPT4ge1xuXHRcdFx0XHRcdCRzdGF0ZS5nbygnaG9tZScpXG5cdFx0XHRcdH0pXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aHJvdyBFcnJvcignQW4gYWNjb3VudCB3aXRoIHRoYXQgZW1haWwgYWxyZWFkeSBleGlzdHMnKTtcblx0XHRcdH1cblx0XHR9KVxuXHR9XG5cblx0cmV0dXJuIFNpZ251cEZhY3Rvcnk7XG59KSIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnc2lnbnVwJywge1xuICAgICAgICB1cmw6ICcvc2lnbnVwJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9zaWdudXAvc2lnbnVwLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnU2lnbnVwQ3RybCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdTaWdudXBDdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSwgU2lnbnVwRmFjdG9yeSkge1xuXG4gICAgJHNjb3BlLnNpZ251cCA9IHt9O1xuICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAkc2NvcGUuc2VuZFNpZ251cCA9IGZ1bmN0aW9uKHNpZ251cEluZm8pe1xuICAgICAgICBTaWdudXBGYWN0b3J5LmNyZWF0ZVVzZXIoc2lnbnVwSW5mbylcbiAgICAgICAgLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdBbiBhY2NvdW50IHdpdGggdGhhdCBlbWFpbCBhbHJlYWR5IGV4aXN0cyc7XG4gICAgICAgIH0pXG4gICAgfVxuICAgIFxuXG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcil7XG5cdCRzdGF0ZVByb3ZpZGVyLnN0YXRlKFwiVXNlclByb2ZpbGVcIix7XG5cdFx0dXJsOiBcIi91c2Vycy86dXNlcklkXCIsXG5cdFx0dGVtcGxhdGVVcmw6XCJqcy91c2VyX3Byb2ZpbGUvcHJvZmlsZS50ZW1wbGF0ZS5odG1sXCIsXG5cdFx0Y29udHJvbGxlcjogXCJVc2VyQ3RybFwiXG5cdH0pXG5cdCRzdGF0ZVByb3ZpZGVyLnN0YXRlKFwiR2FtZVJlY29yZFwiLCB7XG5cdFx0dXJsOlwiL3VzZXJzLzp1c2VySWQvZ2FtZXNcIixcblx0XHR0ZW1wbGF0ZVVybDogXCJqcy91c2VyX3Byb2ZpbGUvZ2FtZXMuaHRtbFwiLFxuXHRcdGNvbnRyb2xsZXI6IFwiR2FtZVJlY29yZEN0cmxcIlxuXHR9KVxufSlcblxuYXBwLmNvbnRyb2xsZXIoXCJVc2VyQ3RybFwiLCBmdW5jdGlvbigkc2NvcGUsIFVzZXJGYWN0b3J5LCAkc3RhdGVQYXJhbXMpe1xuXHRVc2VyRmFjdG9yeS5mZXRjaEluZm9ybWF0aW9uKCRzdGF0ZVBhcmFtcy51c2VySWQpXG5cdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHRcdCRzY29wZS51c2VyPXVzZXI7XG5cdFx0cmV0dXJuIHVzZXJcblx0fSlcblx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG5cdFx0JHNjb3BlLnVwZGF0ZWQ9JHNjb3BlLnVzZXIudXBkYXRlZEF0LmdldERheSgpO1xuXHR9KVxufSlcblxuYXBwLmNvbnRyb2xsZXIoXCJHYW1lUmVjb3JkQ3RybFwiLGZ1bmN0aW9uKCRzY29wZSwgVXNlckZhY3RvcnksICRzdGF0ZVBhcmFtcyl7XG5cdFVzZXJGYWN0b3J5LmZldGNoSW5mb3JtYXRpb24oJHN0YXRlUGFyYW1zLnVzZXJJZClcblx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG5cdFx0JHNjb3BlLnVzZXI9dXNlcjtcblx0fSlcblx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG5cdFVzZXJGYWN0b3J5LmZldGNoR2FtZXMoJHN0YXRlUGFyYW1zLnVzZXJJZClcblx0fSlcblx0LnRoZW4oZnVuY3Rpb24oZ2FtZXMpe1xuXHRcdCRzY29wZS5nYW1lcz1nYW1lcztcblx0fSlcbn0pIiwiYXBwLmZhY3RvcnkoXCJVc2VyRmFjdG9yeVwiLCBmdW5jdGlvbigkaHR0cCl7XG5cdHJldHVybiB7XG5cdFx0ZmV0Y2hJbmZvcm1hdGlvbjogZnVuY3Rpb24oaWQpe1xuXHRcdFx0cmV0dXJuICRodHRwLmdldChcIi9hcGkvdXNlcnMvXCIraWQpXG5cdFx0XHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0XHRcdFx0cmV0dXJuIHVzZXIuZGF0YTtcblx0XHRcdH0pXG5cdFx0fSxcblx0XHRmZXRjaEdhbWVzOiBmdW5jdGlvbihpZCl7XG5cdFx0XHRyZXR1cm4gJGh0dHAuZ2V0KFwiL2FwaS91c2Vycy9cIitpZCtcIi9nYW1lc1wiKVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24oZ2FtZXMpe1xuXHRcdFx0XHRyZXR1cm4gZ2FtZXMuZGF0YTtcblx0XHRcdH0pXG5cdFx0fVxuXHR9XG59KSIsImFwcC5kaXJlY3RpdmUoJ25hdmJhcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgQVVUSF9FVkVOVFMsICRzdGF0ZSkge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHt9LFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuXG4gICAgICAgICAgICBzY29wZS5pdGVtcyA9IFtcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnSG9tZScsIHN0YXRlOiAnaG9tZScgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnWW91ciBQcm9maWxlJywgc3RhdGU6ICdVc2VyUHJvZmlsZScsIGF1dGg6IHRydWUgfVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG5cbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciByZW1vdmVVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2V0VXNlcigpO1xuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldFVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2VzcywgcmVtb3ZlVXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKFwidGltZXJcIiwgZnVuY3Rpb24oJHEsICRpbnRlcnZhbCwgU29ja2V0KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIHRpbWU6ICc9J1xuICAgICAgICB9LFxuICAgICAgICB0ZW1wbGF0ZVVybDogXCJqcy9jb21tb24vZGlyZWN0aXZlcy90aW1lci90aW1lci5odG1sXCIsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgICAgICB2YXIgdGltZSA9IHNjb3BlLnRpbWU7XG4gICAgICAgICAgICB2YXIgc3RhcnQ9c2NvcGUudGltZTtcbiAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gY29udmVydCh0aW1lKTtcbiAgICAgICAgICAgIHNjb3BlLmNvdW50ZG93biA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciB0aW1lciA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgdGltZSAtPSAxO1xuICAgICAgICAgICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IGNvbnZlcnQodGltZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aW1lIDwgMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBcIlRpbWUgdXAhXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKHRpbWVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWU9c3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIHNjb3BlLm1lc3NhZ2VzID0gW1wiR2V0IFJlYWR5IVwiLCBcIkdldCBTZXQhXCIsIFwiR28hXCIsICcvJ107XG4gICAgICAgICAgICAvLyAgICAgdmFyIGluZGV4ID0gMDtcbiAgICAgICAgICAgIC8vICAgICB2YXIgcHJlcGFyZSA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBzY29wZS5tZXNzYWdlc1tpbmRleF07XG4gICAgICAgICAgICAvLyAgICAgICAgIGluZGV4Kys7XG4gICAgICAgICAgICAvLyAgICAgICAgIGNvbnNvbGUubG9nKHNjb3BlLnRpbWVfcmVtYWluaW5nKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgaWYgKHNjb3BlLnRpbWVfcmVtYWluaW5nID09PSBcIi9cIikge1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBjb252ZXJ0KHRpbWUpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbChwcmVwYXJlKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIHZhciB0aW1lciA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICB0aW1lIC09IDE7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBjb252ZXJ0KHRpbWUpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgIGlmICh0aW1lIDwgMSkge1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IFwiVGltZSB1cCFcIjtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbCh0aW1lcik7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gICAgICAgICAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICAvLyAgICAgICAgIH1cbiAgICAgICAgICAgIC8vICAgICB9LCAxMDAwKTtcbiAgICAgICAgICAgIC8vIH07XG5cbiAgICAgICAgICAgIFNvY2tldC5vbignc3RhcnRCb2FyZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLmNvdW50ZG93bih0aW1lKTtcbiAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGNvbnZlcnQodGltZSkge1xuICAgICAgICAgICAgICAgIHZhciBzZWNvbmRzID0gKHRpbWUgJSA2MCkudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICB2YXIgY29udmVyc2lvbiA9IChNYXRoLmZsb29yKHRpbWUgLyA2MCkpICsgJzonO1xuICAgICAgICAgICAgICAgIGlmIChzZWNvbmRzLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udmVyc2lvbiArPSAnMCcgKyBzZWNvbmRzO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnZlcnNpb24gKz0gc2Vjb25kcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnZlcnNpb247XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59KVxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
