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

app.controller('GameCtrl', function ($scope, BoardFactory, Socket, $stateParams, AuthService, $state, LobbyFactory, $rootScope) {

    AuthService.getLoggedInUser().then(function (user) {
        console.log('user from AuthService', user);
        $scope.user = user;
        $scope.exports.playerId = user.id;
    });

    $scope.roomName = $stateParams.roomname;

    $scope.otherPlayers = [];

    $scope.gameLength = 330;

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
        $scope.message = updateObj.playerId + " played " + updateObj.word + " for " + updateObj.pointsEarned + " points!";
        console.log('its updating!');
        clearIfConflicting(updateObj, $scope.exports.wordObj);
        $scope.exports.stateNumber = updateObj.stateNumber;
        $scope.$evalAsync();
    };

    $scope.replay = function () {
        console.log("GO!");
        LobbyFactory.newGame($scope.roomName);
        $scope.startGame();
    };

    $rootScope.hideNavbar = true;

    $scope.$on('$destroy', function () {
        Socket.disconnect();
    });
    console.log('update 1.1');
    Socket.on('connect', function () {

        Socket.emit('joinRoom', $scope.user, $scope.roomName, $scope.gameId);
        console.log('emitting "join room" event to server', $scope.roomName);

        Socket.on('roomJoinSuccess', function (user) {
            console.log('new user joining', user.id);
            user.score = 0;
            $scope.otherPlayers.push(user);
            $scope.$digest();
        });

        Socket.on('startBoard', function (board) {
            $scope.freeze = false;
            console.log('board! ', board);
            $scope.board = board;
            // setInterval(function(){
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

        Socket.on('gameOver', function () {
            $scope.clear();
            $scope.$digest();
            $scope.freeze = true;
            console.log('game is over');
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

    AuthService.getLoggedInUser().then(function (user) {
        console.log('user from AuthService', user);
        $scope.user = user;
    });

    $scope.rooms = rooms;
    $scope.roomNameForm = false;
    // $scope.user = {
    //  id: 3
    // }

    $scope.joinGame = function (room) {
        $state.go('Game', { roomname: room.roomname });
    };

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

app.directive('logo', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/logo/logo.html'
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZG9jcy9kb2NzLmpzIiwiZnNhL2ZzYS1wcmUtYnVpbHQuanMiLCJnYW1lLXN0YXRlL2dyaWQuY29udHJvbGxlci5qcyIsImdhbWUtc3RhdGUvZ3JpZC5mYWN0b3J5LmpzIiwiaG9tZS9ob21lLmNvbnRyb2xsZXIuanMiLCJob21lL2hvbWUuanMiLCJsZWFkZXJCb2FyZC9sZWFkZXJCb2FyZC5jb250cm9sbGVyLmpzIiwibGVhZGVyQm9hcmQvbGVhZGVyQm9hcmQuZmFjdG9yeS5qcyIsImxlYWRlckJvYXJkL2xlYWRlckJvYXJkLnN0YXRlLmpzIiwibG9iYnkvbG9iYnkuY29udHJvbGxlci5qcyIsImxvYmJ5L2xvYmJ5LmRpcmVjdGl2ZS5qcyIsImxvYmJ5L2xvYmJ5LmZhY3RvcnkuanMiLCJsb2JieS9sb2JieS5zdGF0ZS5qcyIsImxvZ2luL2xvZ2luLmpzIiwibWVtYmVycy1vbmx5L21lbWJlcnMtb25seS5qcyIsInJhbmsvcmFuay5kaXJlY3RpdmUuanMiLCJzaWdudXAvc2lnbnVwLmZhY3RvcnkuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwidXNlcl9wcm9maWxlL3Byb2ZpbGUuY29udHJvbGxlci5qcyIsInVzZXJfcHJvZmlsZS9wcm9maWxlLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL0Z1bGxzdGFja1BpY3MuanMiLCJjb21tb24vZmFjdG9yaWVzL1JhbmRvbUdyZWV0aW5ncy5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvdGltZXIvdGltZXIuanMiXSwibmFtZXMiOlsid2luZG93IiwiYXBwIiwiYW5ndWxhciIsIm1vZHVsZSIsImNvbmZpZyIsIiR1cmxSb3V0ZXJQcm92aWRlciIsIiRsb2NhdGlvblByb3ZpZGVyIiwiaHRtbDVNb2RlIiwib3RoZXJ3aXNlIiwid2hlbiIsImxvY2F0aW9uIiwicmVsb2FkIiwicnVuIiwiJHJvb3RTY29wZSIsIiRvbiIsImV2ZW50IiwidG9TdGF0ZSIsInRvUGFyYW1zIiwiZnJvbVN0YXRlIiwiZnJvbVBhcmFtcyIsInRocm93bkVycm9yIiwiY29uc29sZSIsImluZm8iLCJuYW1lIiwiZXJyb3IiLCJBdXRoU2VydmljZSIsIiRzdGF0ZSIsImRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgiLCJzdGF0ZSIsImRhdGEiLCJhdXRoZW50aWNhdGUiLCJpc0F1dGhlbnRpY2F0ZWQiLCJwcmV2ZW50RGVmYXVsdCIsImdldExvZ2dlZEluVXNlciIsInRoZW4iLCJ1c2VyIiwiZ28iLCJFcnJvciIsImZhY3RvcnkiLCJpbyIsIm9yaWdpbiIsImNvbnN0YW50IiwibG9naW5TdWNjZXNzIiwibG9naW5GYWlsZWQiLCJsb2dvdXRTdWNjZXNzIiwic2Vzc2lvblRpbWVvdXQiLCJub3RBdXRoZW50aWNhdGVkIiwibm90QXV0aG9yaXplZCIsIiRxIiwiQVVUSF9FVkVOVFMiLCJzdGF0dXNEaWN0IiwicmVzcG9uc2VFcnJvciIsInJlc3BvbnNlIiwiJGJyb2FkY2FzdCIsInN0YXR1cyIsInJlamVjdCIsIiRodHRwUHJvdmlkZXIiLCJpbnRlcmNlcHRvcnMiLCJwdXNoIiwiJGluamVjdG9yIiwiZ2V0Iiwic2VydmljZSIsIiRodHRwIiwiU2Vzc2lvbiIsIm9uU3VjY2Vzc2Z1bExvZ2luIiwiY3JlYXRlIiwiZnJvbVNlcnZlciIsImNhdGNoIiwibG9naW4iLCJjcmVkZW50aWFscyIsInBvc3QiLCJtZXNzYWdlIiwibG9nb3V0IiwiZGVzdHJveSIsInNlbGYiLCIkc3RhdGVQcm92aWRlciIsInVybCIsInRlbXBsYXRlVXJsIiwiY29udHJvbGxlciIsIiRzY29wZSIsIkJvYXJkRmFjdG9yeSIsIlNvY2tldCIsIiRzdGF0ZVBhcmFtcyIsIkxvYmJ5RmFjdG9yeSIsImxvZyIsImV4cG9ydHMiLCJwbGF5ZXJJZCIsImlkIiwicm9vbU5hbWUiLCJyb29tbmFtZSIsIm90aGVyUGxheWVycyIsImdhbWVMZW5ndGgiLCJ3b3JkT2JqIiwid29yZCIsInN0YXRlTnVtYmVyIiwicG9pbnRzRWFybmVkIiwibW91c2VJc0Rvd24iLCJkcmFnZ2luZ0FsbG93ZWQiLCJzdHlsZSIsImZyZWV6ZSIsImNoZWNrU2VsZWN0ZWQiLCJ0b2dnbGVEcmFnIiwibW91c2VEb3duIiwibW91c2VVcCIsImxlbmd0aCIsInN1Ym1pdCIsImRyYWciLCJzcGFjZSIsImNsaWNrIiwiZ2V0Q3VycmVudFJvb20iLCJyb29tIiwiZ2FtZUlkIiwidXNlcnMiLCJmaWx0ZXIiLCJmb3JFYWNoIiwicGxheWVyIiwic2NvcmUiLCJqb2luR2FtZSIsImhpZGVCb2FyZCIsInN0YXJ0R2FtZSIsInVzZXJJZHMiLCJtYXAiLCJnZXRTdGFydEJvYXJkIiwicXVpdCIsImhpZGVOYXZiYXIiLCJib2FyZCIsIm1lc3NhZ2VzIiwic2l6ZSIsImx0cnNTZWxlY3RlZCIsIk9iamVjdCIsImtleXMiLCJwcmV2aW91c0x0ciIsImxhc3RMdHIiLCJ2YWxpZFNlbGVjdCIsInN1YnN0cmluZyIsImx0cklkIiwib3RoZXJMdHJzSWRzIiwiaW5jbHVkZXMiLCJjb29yZHMiLCJzcGxpdCIsInJvdyIsImNvbCIsImxhc3RMdHJJZCIsInBvcCIsImNvb3Jkc0xhc3QiLCJyb3dMYXN0IiwiY29sTGFzdCIsInJvd09mZnNldCIsIk1hdGgiLCJhYnMiLCJjb2xPZmZzZXQiLCJjbGVhcklmQ29uZmxpY3RpbmciLCJ1cGRhdGVXb3JkT2JqIiwiZXhwb3J0V29yZE9iaiIsInRpbGVzTW92ZWQiLCJteVdvcmRUaWxlcyIsInNvbWUiLCJjb29yZCIsImNsZWFyIiwib2JqIiwic2h1ZmZsZSIsInVwZGF0ZUJvYXJkIiwia2V5IiwidXBkYXRlU2NvcmUiLCJwb2ludHMiLCJ1cGRhdGUiLCJ1cGRhdGVPYmoiLCIkZXZhbEFzeW5jIiwicmVwbGF5IiwibmV3R2FtZSIsImRpc2Nvbm5lY3QiLCJvbiIsImVtaXQiLCIkZGlnZXN0IiwibGFzdFdvcmRQbGF5ZWQiLCJ1c2VySWQiLCJyZXMiLCJxdWl0RnJvbVJvb20iLCJkZWxldGUiLCIkbG9jYXRpb24iLCJlbnRlckxvYmJ5IiwiTGVhZGVyQm9hcmRGYWN0b3J5IiwiQWxsUGxheWVycyIsInBsYXllcnMiLCJnYW1lcyIsInNjb3JlcyIsImdhbWUiLCJ1c2VyR2FtZSIsImhpZ2hlc3RTY29yZSIsIm1heCIsImdhbWVzX3dvbiIsIndpbm5lciIsImdhbWVzX3BsYXllZCIsIndpbl9wZXJjZW50YWdlIiwidG9GaXhlZCIsInJlc29sdmUiLCJhbGxQbGF5ZXJzIiwicm9vbXMiLCJyb29tTmFtZUZvcm0iLCJuZXdSb29tIiwicm9vbUluZm8iLCJzaG93Rm9ybSIsImRpcmVjdGl2ZSIsInJlc3RyaWN0IiwidGVtcFJvb21zIiwiZ2V0QWxsUm9vbXMiLCJjb3B5Iiwicm9vbUlkIiwicHV0Iiwic2VuZExvZ2luIiwibG9naW5JbmZvIiwidGVtcGxhdGUiLCJTZWNyZXRTdGFzaCIsImdldFN0YXNoIiwic3Rhc2giLCJzY29wZSIsInJhbmtOYW1lIiwicmFua0J5Iiwib3JkZXIiLCJTaWdudXBGYWN0b3J5IiwiY3JlYXRlVXNlciIsInNpZ251cEluZm8iLCJlbWFpbCIsInBhc3N3b3JkIiwic2lnbnVwIiwic2VuZFNpZ251cCIsIlVzZXJGYWN0b3J5IiwiZmV0Y2hJbmZvcm1hdGlvbiIsInVwZGF0ZWQiLCJ1cGRhdGVkQXQiLCJnZXREYXkiLCJmZXRjaEdhbWVzIiwibGluayIsIml0ZW1zIiwibGFiZWwiLCJhdXRoIiwiaXNMb2dnZWRJbiIsInNldFVzZXIiLCJyZW1vdmVVc2VyIiwiJGludGVydmFsIiwidGltZSIsInN0YXJ0IiwidGltZV9yZW1haW5pbmciLCJjb252ZXJ0IiwiY291bnRkb3duIiwidGltZXIiLCJjYW5jZWwiLCJzZWNvbmRzIiwidG9TdHJpbmciLCJjb252ZXJzaW9uIiwiZmxv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RUE7QUFDQUUsa0NBQUFGLE9BQUE7QUFDQTtBQUNBLHVCQUFBRSxVQUFBO0FBQ0E7QUFDQTtBQTFEQSxLQUFBO0FBNERBLENBN0RBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG53aW5kb3cuYXBwID0gYW5ndWxhci5tb2R1bGUoJ0Z1bGxzdGFja0dlbmVyYXRlZEFwcCcsIFsnZnNhUHJlQnVpbHQnLCAndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICduZ0FuaW1hdGUnXSk7XG5cbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcbiAgICAvLyBUcmlnZ2VyIHBhZ2UgcmVmcmVzaCB3aGVuIGFjY2Vzc2luZyBhbiBPQXV0aCByb3V0ZVxuICAgICR1cmxSb3V0ZXJQcm92aWRlci53aGVuKCcvYXV0aC86cHJvdmlkZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICB9KTtcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGxpc3RlbmluZyB0byBlcnJvcnMgYnJvYWRjYXN0ZWQgYnkgdWktcm91dGVyLCB1c3VhbGx5IG9yaWdpbmF0aW5nIGZyb20gcmVzb2x2ZXNcbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUpIHtcbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlRXJyb3InLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zLCBmcm9tU3RhdGUsIGZyb21QYXJhbXMsIHRocm93bkVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuaW5mbyhgVGhlIGZvbGxvd2luZyBlcnJvciB3YXMgdGhyb3duIGJ5IHVpLXJvdXRlciB3aGlsZSB0cmFuc2l0aW9uaW5nIHRvIHN0YXRlIFwiJHt0b1N0YXRlLm5hbWV9XCIuIFRoZSBvcmlnaW4gb2YgdGhpcyBlcnJvciBpcyBwcm9iYWJseSBhIHJlc29sdmUgZnVuY3Rpb246YCk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IodGhyb3duRXJyb3IpO1xuICAgIH0pO1xufSk7XG5cbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgY29udHJvbGxpbmcgYWNjZXNzIHRvIHNwZWNpZmljIHN0YXRlcy5cbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgIC8vIFRoZSBnaXZlbiBzdGF0ZSByZXF1aXJlcyBhbiBhdXRoZW50aWNhdGVkIHVzZXIuXG4gICAgdmFyIGRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGggPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmRhdGEgJiYgc3RhdGUuZGF0YS5hdXRoZW50aWNhdGU7XG4gICAgfTtcblxuICAgIC8vICRzdGF0ZUNoYW5nZVN0YXJ0IGlzIGFuIGV2ZW50IGZpcmVkXG4gICAgLy8gd2hlbmV2ZXIgdGhlIHByb2Nlc3Mgb2YgY2hhbmdpbmcgYSBzdGF0ZSBiZWdpbnMuXG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcykge1xuXG4gICAgICAgIGlmICghZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCh0b1N0YXRlKSkge1xuICAgICAgICAgICAgLy8gVGhlIGRlc3RpbmF0aW9uIHN0YXRlIGRvZXMgbm90IHJlcXVpcmUgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgICAgIC8vIFRoZSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWQuXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FuY2VsIG5hdmlnYXRpbmcgdG8gbmV3IHN0YXRlLlxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIC8vIElmIGEgdXNlciBpcyByZXRyaWV2ZWQsIHRoZW4gcmVuYXZpZ2F0ZSB0byB0aGUgZGVzdGluYXRpb25cbiAgICAgICAgICAgIC8vICh0aGUgc2Vjb25kIHRpbWUsIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpIHdpbGwgd29yaylcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgaWYgbm8gdXNlciBpcyBsb2dnZWQgaW4sIGdvIHRvIFwibG9naW5cIiBzdGF0ZS5cbiAgICAgICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKHRvU3RhdGUubmFtZSwgdG9QYXJhbXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbn0pO1xuIiwiLy8gYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuLy8gICAgIC8vIFJlZ2lzdGVyIG91ciAqYWJvdXQqIHN0YXRlLlxuLy8gICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdhYm91dCcsIHtcbi8vICAgICAgICAgdXJsOiAnL2Fib3V0Jyxcbi8vICAgICAgICAgY29udHJvbGxlcjogJ0Fib3V0Q29udHJvbGxlcicsXG4vLyAgICAgICAgIHRlbXBsYXRlVXJsOiAnanMvYWJvdXQvYWJvdXQuaHRtbCdcbi8vICAgICB9KTtcblxuLy8gfSk7XG5cbi8vIGFwcC5jb250cm9sbGVyKCdBYm91dENvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlLCBGdWxsc3RhY2tQaWNzKSB7XG5cbi8vICAgICAvLyBJbWFnZXMgb2YgYmVhdXRpZnVsIEZ1bGxzdGFjayBwZW9wbGUuXG4vLyAgICAgJHNjb3BlLmltYWdlcyA9IF8uc2h1ZmZsZShGdWxsc3RhY2tQaWNzKTtcblxuLy8gfSk7XG4iLCIvLyBhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuLy8gICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdkb2NzJywge1xuLy8gICAgICAgICB1cmw6ICcvZG9jcycsXG4vLyAgICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZG9jcy9kb2NzLmh0bWwnXG4vLyAgICAgfSk7XG4vLyB9KTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBIb3BlIHlvdSBkaWRuJ3QgZm9yZ2V0IEFuZ3VsYXIhIER1aC1kb3kuXG4gICAgaWYgKCF3aW5kb3cuYW5ndWxhcikgdGhyb3cgbmV3IEVycm9yKCdJIGNhblxcJ3QgZmluZCBBbmd1bGFyIScpO1xuXG4gICAgdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdmc2FQcmVCdWlsdCcsIFtdKTtcblxuICAgIGFwcC5mYWN0b3J5KCdTb2NrZXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghd2luZG93LmlvKSB0aHJvdyBuZXcgRXJyb3IoJ3NvY2tldC5pbyBub3QgZm91bmQhJyk7XG4gICAgICAgIHJldHVybiB3aW5kb3cuaW8od2luZG93LmxvY2F0aW9uLm9yaWdpbik7XG4gICAgfSk7XG5cbiAgICAvLyBBVVRIX0VWRU5UUyBpcyB1c2VkIHRocm91Z2hvdXQgb3VyIGFwcCB0b1xuICAgIC8vIGJyb2FkY2FzdCBhbmQgbGlzdGVuIGZyb20gYW5kIHRvIHRoZSAkcm9vdFNjb3BlXG4gICAgLy8gZm9yIGltcG9ydGFudCBldmVudHMgYWJvdXQgYXV0aGVudGljYXRpb24gZmxvdy5cbiAgICBhcHAuY29uc3RhbnQoJ0FVVEhfRVZFTlRTJywge1xuICAgICAgICBsb2dpblN1Y2Nlc3M6ICdhdXRoLWxvZ2luLXN1Y2Nlc3MnLFxuICAgICAgICBsb2dpbkZhaWxlZDogJ2F1dGgtbG9naW4tZmFpbGVkJyxcbiAgICAgICAgbG9nb3V0U3VjY2VzczogJ2F1dGgtbG9nb3V0LXN1Y2Nlc3MnLFxuICAgICAgICBzZXNzaW9uVGltZW91dDogJ2F1dGgtc2Vzc2lvbi10aW1lb3V0JyxcbiAgICAgICAgbm90QXV0aGVudGljYXRlZDogJ2F1dGgtbm90LWF1dGhlbnRpY2F0ZWQnLFxuICAgICAgICBub3RBdXRob3JpemVkOiAnYXV0aC1ub3QtYXV0aG9yaXplZCdcbiAgICB9KTtcblxuICAgIGFwcC5mYWN0b3J5KCdBdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsIEFVVEhfRVZFTlRTKSB7XG4gICAgICAgIHZhciBzdGF0dXNEaWN0ID0ge1xuICAgICAgICAgICAgNDAxOiBBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLFxuICAgICAgICAgICAgNDAzOiBBVVRIX0VWRU5UUy5ub3RBdXRob3JpemVkLFxuICAgICAgICAgICAgNDE5OiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCxcbiAgICAgICAgICAgIDQ0MDogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXRcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChzdGF0dXNEaWN0W3Jlc3BvbnNlLnN0YXR1c10sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSkge1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgdXNlciA9IHJlc3BvbnNlLmRhdGEudXNlcjtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKHVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XG4gICAgICAgICAgICByZXR1cm4gdXNlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZXMgdGhlIHNlc3Npb24gZmFjdG9yeSB0byBzZWUgaWYgYW5cbiAgICAgICAgLy8gYXV0aGVudGljYXRlZCB1c2VyIGlzIGN1cnJlbnRseSByZWdpc3RlcmVkLlxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhIVNlc3Npb24udXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldExvZ2dlZEluVXNlciA9IGZ1bmN0aW9uIChmcm9tU2VydmVyKSB7XG5cbiAgICAgICAgICAgIC8vIElmIGFuIGF1dGhlbnRpY2F0ZWQgc2Vzc2lvbiBleGlzdHMsIHdlXG4gICAgICAgICAgICAvLyByZXR1cm4gdGhlIHVzZXIgYXR0YWNoZWQgdG8gdGhhdCBzZXNzaW9uXG4gICAgICAgICAgICAvLyB3aXRoIGEgcHJvbWlzZS4gVGhpcyBlbnN1cmVzIHRoYXQgd2UgY2FuXG4gICAgICAgICAgICAvLyBhbHdheXMgaW50ZXJmYWNlIHdpdGggdGhpcyBtZXRob2QgYXN5bmNocm9ub3VzbHkuXG5cbiAgICAgICAgICAgIC8vIE9wdGlvbmFsbHksIGlmIHRydWUgaXMgZ2l2ZW4gYXMgdGhlIGZyb21TZXJ2ZXIgcGFyYW1ldGVyLFxuICAgICAgICAgICAgLy8gdGhlbiB0aGlzIGNhY2hlZCB2YWx1ZSB3aWxsIG5vdCBiZSB1c2VkLlxuXG4gICAgICAgICAgICBpZiAodGhpcy5pc0F1dGhlbnRpY2F0ZWQoKSAmJiBmcm9tU2VydmVyICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4oU2Vzc2lvbi51c2VyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFrZSByZXF1ZXN0IEdFVCAvc2Vzc2lvbi5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIDQwMSByZXNwb25zZSwgd2UgY2F0Y2ggaXQgYW5kIGluc3RlYWQgcmVzb2x2ZSB0byBudWxsLlxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKS50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9naW4gPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbihvblN1Y2Nlc3NmdWxMb2dpbilcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHsgbWVzc2FnZTogJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJyB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9sb2dvdXQnKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBTZXNzaW9uLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9nb3V0U3VjY2Vzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcblxuICAgICAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSB1c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IG51bGw7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxufSgpKTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnR2FtZScsIHtcbiAgICAgICAgdXJsOiAnL2dhbWUvOnJvb21uYW1lJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9nYW1lLXN0YXRlL3BhZ2UuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6IFwiR2FtZUN0cmxcIixcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuXG5cbmFwcC5jb250cm9sbGVyKCdHYW1lQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgQm9hcmRGYWN0b3J5LCBTb2NrZXQsICRzdGF0ZVBhcmFtcywgQXV0aFNlcnZpY2UsICRzdGF0ZSwgTG9iYnlGYWN0b3J5LCAkcm9vdFNjb3BlKSB7XG5cbiAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKVxuICAgICAgICAudGhlbihmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygndXNlciBmcm9tIEF1dGhTZXJ2aWNlJywgdXNlcik7XG4gICAgICAgICAgICAkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy5wbGF5ZXJJZCA9IHVzZXIuaWQ7XG4gICAgICAgIH0pO1xuXG4gICAgJHNjb3BlLnJvb21OYW1lID0gJHN0YXRlUGFyYW1zLnJvb21uYW1lO1xuXG4gICAgJHNjb3BlLm90aGVyUGxheWVycyA9IFtdO1xuXG4gICAgJHNjb3BlLmdhbWVMZW5ndGggPSAzMzA7XG5cbiAgICAkc2NvcGUuZXhwb3J0cyA9IHtcbiAgICAgICAgd29yZE9iajoge30sXG4gICAgICAgIHdvcmQ6IFwiXCIsXG4gICAgICAgIHBsYXllcklkOiBudWxsLFxuICAgICAgICBzdGF0ZU51bWJlcjogMCxcbiAgICAgICAgcG9pbnRzRWFybmVkOiBudWxsXG4gICAgfTtcblxuICAgICRzY29wZS5tb3VzZUlzRG93biA9IGZhbHNlO1xuICAgICRzY29wZS5kcmFnZ2luZ0FsbG93ZWQgPSBmYWxzZTtcblxuICAgICRzY29wZS5zdHlsZSA9IG51bGw7XG4gICAgJHNjb3BlLm1lc3NhZ2UgPSAnJztcbiAgICAkc2NvcGUuZnJlZXplID0gZmFsc2U7XG5cbiAgICAkc2NvcGUuY2hlY2tTZWxlY3RlZCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIHJldHVybiBpZCBpbiAkc2NvcGUuZXhwb3J0cy53b3JkT2JqO1xuICAgIH07XG5cbiAgICAkc2NvcGUudG9nZ2xlRHJhZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkID0gISRzY29wZS5kcmFnZ2luZ0FsbG93ZWQ7XG4gICAgfTtcblxuICAgICRzY29wZS5tb3VzZURvd24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLm1vdXNlSXNEb3duID0gdHJ1ZTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm1vdXNlVXAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLm1vdXNlSXNEb3duID0gZmFsc2U7XG4gICAgICAgIGlmICgkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkICYmICRzY29wZS5leHBvcnRzLndvcmQubGVuZ3RoID4gMSkgJHNjb3BlLnN1Ym1pdCgkc2NvcGUuZXhwb3J0cyk7XG4gICAgfTtcblxuICAgICRzY29wZS5kcmFnID0gZnVuY3Rpb24oc3BhY2UsIGlkKSB7XG4gICAgICAgIGlmICgkc2NvcGUubW91c2VJc0Rvd24gJiYgJHNjb3BlLmRyYWdnaW5nQWxsb3dlZCkge1xuICAgICAgICAgICAgJHNjb3BlLmNsaWNrKHNwYWNlLCBpZCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cblxuICAgIC8vZ2V0IHRoZSBjdXJyZW50IHJvb20gaW5mb1xuICAgIEJvYXJkRmFjdG9yeS5nZXRDdXJyZW50Um9vbSgkc3RhdGVQYXJhbXMucm9vbW5hbWUpXG4gICAgICAgIC50aGVuKHJvb20gPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2cocm9vbSlcbiAgICAgICAgICAgICRzY29wZS5nYW1lSWQgPSByb29tLmlkO1xuICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVycyA9IHJvb20udXNlcnMuZmlsdGVyKHVzZXIgPT4gdXNlci5pZCAhPT0gJHNjb3BlLnVzZXIuaWQpO1xuICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVycy5mb3JFYWNoKHBsYXllciA9PiB7IHBsYXllci5zY29yZSA9IDAgfSlcbiAgICAgICAgICAgIExvYmJ5RmFjdG9yeS5qb2luR2FtZShyb29tLmlkLCAkc2NvcGUudXNlci5pZCk7XG4gICAgICAgIH0pO1xuXG4gICAgJHNjb3BlLmhpZGVCb2FyZCA9IHRydWU7XG5cbiAgICAvLyBTdGFydCB0aGUgZ2FtZSB3aGVuIGFsbCBwbGF5ZXJzIGhhdmUgam9pbmVkIHJvb21cbiAgICAkc2NvcGUuc3RhcnRHYW1lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB1c2VySWRzID0gJHNjb3BlLm90aGVyUGxheWVycy5tYXAodXNlciA9PiB1c2VyLmlkKTtcbiAgICAgICAgdXNlcklkcy5wdXNoKCRzY29wZS51c2VyLmlkKTtcbiAgICAgICAgY29uc29sZS5sb2coJ29wJywgJHNjb3BlLm90aGVyUGxheWVycywgJ3VpJywgdXNlcklkcyk7XG4gICAgICAgIEJvYXJkRmFjdG9yeS5nZXRTdGFydEJvYXJkKCRzY29wZS5nYW1lTGVuZ3RoLCAkc2NvcGUuZ2FtZUlkLCB1c2VySWRzKTtcbiAgICB9O1xuXG5cbiAgICAvL1F1aXQgdGhlIHJvb20sIGJhY2sgdG8gbG9iYnlcbiAgICAkc2NvcGUucXVpdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkcm9vdFNjb3BlLmhpZGVOYXZiYXIgPSBmYWxzZTtcbiAgICAgICAgJHN0YXRlLmdvKCdsb2JieScpXG4gICAgfTtcblxuXG4gICAgJHNjb3BlLmJvYXJkID0gW1xuICAgICAgICBbJ2InLCAnYScsICdkJywgJ2UnLCAnYScsICdyJ10sXG4gICAgICAgIFsnZScsICdmJywgJ2cnLCAnbCcsICdtJywgJ2UnXSxcbiAgICAgICAgWydoJywgJ2knLCAnaicsICdmJywgJ28nLCAnYSddLFxuICAgICAgICBbJ2MnLCAnYScsICdkJywgJ2UnLCAnYScsICdyJ10sXG4gICAgICAgIFsnZScsICdmJywgJ2cnLCAnbCcsICdkJywgJ2UnXSxcbiAgICAgICAgWydoJywgJ2knLCAnaicsICdmJywgJ28nLCAnYSddXG4gICAgXTtcblxuICAgICRzY29wZS5tZXNzYWdlcyA9IG51bGw7XG5cbiAgICAkc2NvcGUuc2l6ZSA9IDM7XG4gICAgJHNjb3BlLnNjb3JlID0gMDtcblxuXG4gICAgJHNjb3BlLmNsaWNrID0gZnVuY3Rpb24oc3BhY2UsIGlkKSB7XG4gICAgICAgIGlmICgkc2NvcGUuZnJlZXplKSB7XG4gICAgICAgICAgICByZXR1cm47IH1cbiAgICAgICAgY29uc29sZS5sb2coJ2NsaWNrZWQgJywgc3BhY2UsIGlkKTtcbiAgICAgICAgdmFyIGx0cnNTZWxlY3RlZCA9IE9iamVjdC5rZXlzKCRzY29wZS5leHBvcnRzLndvcmRPYmopO1xuICAgICAgICB2YXIgcHJldmlvdXNMdHIgPSBsdHJzU2VsZWN0ZWRbbHRyc1NlbGVjdGVkLmxlbmd0aCAtIDJdO1xuICAgICAgICB2YXIgbGFzdEx0ciA9IGx0cnNTZWxlY3RlZFtsdHJzU2VsZWN0ZWQubGVuZ3RoIC0gMV07XG4gICAgICAgIGlmICghbHRyc1NlbGVjdGVkLmxlbmd0aCB8fCB2YWxpZFNlbGVjdChpZCwgbHRyc1NlbGVjdGVkKSkge1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZCArPSBzcGFjZTtcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLndvcmRPYmpbaWRdID0gc3BhY2U7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygkc2NvcGUuZXhwb3J0cyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaWQgPT09IHByZXZpb3VzTHRyKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkID0gJHNjb3BlLmV4cG9ydHMud29yZC5zdWJzdHJpbmcoMCwgJHNjb3BlLmV4cG9ydHMud29yZC5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgIGRlbGV0ZSAkc2NvcGUuZXhwb3J0cy53b3JkT2JqW2xhc3RMdHJdO1xuICAgICAgICB9IGVsc2UgaWYgKGx0cnNTZWxlY3RlZC5sZW5ndGggPT09IDEgJiYgaWQgPT09IGxhc3RMdHIpIHtcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLndvcmQgPSBcIlwiO1xuICAgICAgICAgICAgZGVsZXRlICRzY29wZS5leHBvcnRzLndvcmRPYmpbbGFzdEx0cl07XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy9tYWtlcyBzdXJlIGxldHRlciBpcyBhZGphY2VudCB0byBwcmV2IGx0ciwgYW5kIGhhc24ndCBiZWVuIHVzZWQgeWV0XG4gICAgZnVuY3Rpb24gdmFsaWRTZWxlY3QobHRySWQsIG90aGVyTHRyc0lkcykge1xuICAgICAgICBpZiAob3RoZXJMdHJzSWRzLmluY2x1ZGVzKGx0cklkKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB2YXIgY29vcmRzID0gbHRySWQuc3BsaXQoJy0nKTtcbiAgICAgICAgdmFyIHJvdyA9IGNvb3Jkc1swXTtcbiAgICAgICAgdmFyIGNvbCA9IGNvb3Jkc1sxXTtcbiAgICAgICAgdmFyIGxhc3RMdHJJZCA9IG90aGVyTHRyc0lkcy5wb3AoKTtcbiAgICAgICAgdmFyIGNvb3Jkc0xhc3QgPSBsYXN0THRySWQuc3BsaXQoJy0nKTtcbiAgICAgICAgdmFyIHJvd0xhc3QgPSBjb29yZHNMYXN0WzBdO1xuICAgICAgICB2YXIgY29sTGFzdCA9IGNvb3Jkc0xhc3RbMV07XG4gICAgICAgIHZhciByb3dPZmZzZXQgPSBNYXRoLmFicyhyb3cgLSByb3dMYXN0KTtcbiAgICAgICAgdmFyIGNvbE9mZnNldCA9IE1hdGguYWJzKGNvbCAtIGNvbExhc3QpO1xuICAgICAgICByZXR1cm4gKHJvd09mZnNldCA8PSAxICYmIGNvbE9mZnNldCA8PSAxKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbGVhcklmQ29uZmxpY3RpbmcodXBkYXRlV29yZE9iaiwgZXhwb3J0V29yZE9iaikge1xuICAgICAgICB2YXIgdGlsZXNNb3ZlZCA9IE9iamVjdC5rZXlzKHVwZGF0ZVdvcmRPYmopO1xuICAgICAgICB2YXIgbXlXb3JkVGlsZXMgPSBPYmplY3Qua2V5cyhleHBvcnRXb3JkT2JqKTtcbiAgICAgICAgaWYgKHRpbGVzTW92ZWQuc29tZShjb29yZCA9PiBteVdvcmRUaWxlcy5pbmNsdWRlcyhjb29yZCkpKSAkc2NvcGUuY2xlYXIoKTtcbiAgICB9XG5cbiAgICAkc2NvcGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZCA9IFwiXCI7XG4gICAgICAgICRzY29wZS5leHBvcnRzLndvcmRPYmogPSB7fTtcbiAgICB9O1xuXG5cbiAgICAkc2NvcGUuc3VibWl0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdzdWJtaXR0aW5nICcsIG9iaik7XG4gICAgICAgIEJvYXJkRmFjdG9yeS5zdWJtaXQob2JqKTtcbiAgICAgICAgJHNjb3BlLmNsZWFyKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5zaHVmZmxlID0gQm9hcmRGYWN0b3J5LnNodWZmbGU7XG5cblxuICAgICRzY29wZS51cGRhdGVCb2FyZCA9IGZ1bmN0aW9uKHdvcmRPYmopIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3Njb3BlLmJvYXJkJywgJHNjb3BlLmJvYXJkKTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHdvcmRPYmopIHtcbiAgICAgICAgICAgIHZhciBjb29yZHMgPSBrZXkuc3BsaXQoJy0nKTtcbiAgICAgICAgICAgIHZhciByb3cgPSBjb29yZHNbMF07XG4gICAgICAgICAgICB2YXIgY29sID0gY29vcmRzWzFdO1xuICAgICAgICAgICAgJHNjb3BlLmJvYXJkW3Jvd11bY29sXSA9IHdvcmRPYmpba2V5XTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUudXBkYXRlU2NvcmUgPSBmdW5jdGlvbihwb2ludHMsIHBsYXllcklkKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCd1cGRhdGUgc2NvcmUgcG9pbnRzJywgcG9pbnRzKTtcbiAgICAgICAgaWYgKHBsYXllcklkID09PSAkc2NvcGUudXNlci5pZCkge1xuICAgICAgICAgICAgJHNjb3BlLnNjb3JlICs9IHBvaW50cztcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLnBvaW50c0Vhcm5lZCA9IG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBwbGF5ZXIgaW4gJHNjb3BlLm90aGVyUGxheWVycykge1xuICAgICAgICAgICAgICAgIGlmICgkc2NvcGUub3RoZXJQbGF5ZXJzW3BsYXllcl0uaWQgPT09IHBsYXllcklkKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnNbcGxheWVyXS5zY29yZSArPSBwb2ludHM7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLnBvaW50c0Vhcm5lZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICAkc2NvcGUudXBkYXRlID0gZnVuY3Rpb24odXBkYXRlT2JqKSB7XG4gICAgICAgICRzY29wZS51cGRhdGVTY29yZSh1cGRhdGVPYmoucG9pbnRzRWFybmVkLCB1cGRhdGVPYmoucGxheWVySWQpO1xuICAgICAgICAkc2NvcGUudXBkYXRlQm9hcmQodXBkYXRlT2JqLndvcmRPYmopO1xuICAgICAgICAkc2NvcGUubWVzc2FnZSA9IHVwZGF0ZU9iai5wbGF5ZXJJZCArIFwiIHBsYXllZCBcIiArIHVwZGF0ZU9iai53b3JkICsgXCIgZm9yIFwiICsgdXBkYXRlT2JqLnBvaW50c0Vhcm5lZCArIFwiIHBvaW50cyFcIjtcbiAgICAgICAgY29uc29sZS5sb2coJ2l0cyB1cGRhdGluZyEnKTtcbiAgICAgICAgY2xlYXJJZkNvbmZsaWN0aW5nKHVwZGF0ZU9iaiwgJHNjb3BlLmV4cG9ydHMud29yZE9iaik7XG4gICAgICAgICRzY29wZS5leHBvcnRzLnN0YXRlTnVtYmVyID0gdXBkYXRlT2JqLnN0YXRlTnVtYmVyO1xuICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgIH07XG5cbiAgICAkc2NvcGUucmVwbGF5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiR08hXCIpO1xuICAgICAgICBMb2JieUZhY3RvcnkubmV3R2FtZSgkc2NvcGUucm9vbU5hbWUpO1xuICAgICAgICAkc2NvcGUuc3RhcnRHYW1lKCk7XG4gICAgfTtcblxuICAgICRyb290U2NvcGUuaGlkZU5hdmJhciA9IHRydWU7XG5cbiAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkgeyBTb2NrZXQuZGlzY29ubmVjdCgpOyB9KTtcbiAgICBjb25zb2xlLmxvZygndXBkYXRlIDEuMScpXG4gICAgU29ja2V0Lm9uKCdjb25uZWN0JywgZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgU29ja2V0LmVtaXQoJ2pvaW5Sb29tJywgJHNjb3BlLnVzZXIsICRzY29wZS5yb29tTmFtZSwgJHNjb3BlLmdhbWVJZCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdlbWl0dGluZyBcImpvaW4gcm9vbVwiIGV2ZW50IHRvIHNlcnZlcicsICRzY29wZS5yb29tTmFtZSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCdyb29tSm9pblN1Y2Nlc3MnLCBmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnbmV3IHVzZXIgam9pbmluZycsIHVzZXIuaWQpO1xuICAgICAgICAgICAgdXNlci5zY29yZSA9IDA7XG4gICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzLnB1c2godXNlcik7XG4gICAgICAgICAgICAkc2NvcGUuJGRpZ2VzdCgpO1xuXG4gICAgICAgIH0pO1xuXG4gICAgICAgIFNvY2tldC5vbignc3RhcnRCb2FyZCcsIGZ1bmN0aW9uKGJvYXJkKSB7XG4gICAgICAgICAgICAkc2NvcGUuZnJlZXplID0gZmFsc2U7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnYm9hcmQhICcsIGJvYXJkKTtcbiAgICAgICAgICAgICRzY29wZS5ib2FyZCA9IGJvYXJkO1xuICAgICAgICAgICAgLy8gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICRzY29wZS5oaWRlQm9hcmQgPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgICAgICAvLyB9LCAzMDAwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCd3b3JkVmFsaWRhdGVkJywgZnVuY3Rpb24odXBkYXRlT2JqKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnd29yZCBpcyB2YWxpZGF0ZWQnKTtcbiAgICAgICAgICAgICRzY29wZS51cGRhdGUodXBkYXRlT2JqKTtcbiAgICAgICAgICAgICRzY29wZS5sYXN0V29yZFBsYXllZCA9IHVwZGF0ZU9iai53b3JkO1xuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCdib2FyZFNodWZmbGVkJywgZnVuY3Rpb24oYm9hcmQsIHVzZXJJZCwgc3RhdGVOdW1iZXIpIHtcbiAgICAgICAgICAgICRzY29wZS5ib2FyZCA9IGJvYXJkO1xuICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZVNjb3JlKC01LCB1c2VySWQpO1xuICAgICAgICAgICAgJHNjb3BlLmNsZWFyKCk7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy5zdGF0ZU51bWJlciA9IHN0YXRlTnVtYmVyO1xuICAgICAgICAgICAgJHNjb3BlLm1lc3NhZ2UgPSB1c2VySWQgKyBcIiBzaHVmZmxlZCB0aGUgYm9hcmQhXCI7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygkc2NvcGUubWVzc2FnZSk7XG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICBTb2NrZXQub24oJ3BsYXllckRpc2Nvbm5lY3RlZCcsIGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwbGF5ZXJEaXNjb25uZWN0ZWQnLCB1c2VyLmlkKTtcbiAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMgPSAkc2NvcGUub3RoZXJQbGF5ZXJzLm1hcChvdGhlclBsYXllcnMgPT4gb3RoZXJQbGF5ZXJzLmlkICE9PSB1c2VyLmlkKTtcblxuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCdnYW1lT3ZlcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHNjb3BlLmNsZWFyKCk7XG4gICAgICAgICAgICAkc2NvcGUuJGRpZ2VzdCgpO1xuICAgICAgICAgICAgJHNjb3BlLmZyZWV6ZSA9IHRydWU7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZ2FtZSBpcyBvdmVyJyk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSk7XG4iLCJhcHAuZmFjdG9yeSAoXCJCb2FyZEZhY3RvcnlcIiwgZnVuY3Rpb24oJGh0dHAsIFNvY2tldCl7XG5cdHJldHVybntcblx0XHRnZXRTdGFydEJvYXJkOiBmdW5jdGlvbihnYW1lTGVuZ3RoLCBnYW1lSWQsIHVzZXJJZHMpe1xuXHRcdFx0Y29uc29sZS5sb2coJ2ZhY3RvcnkuIGdsOiAnLCBnYW1lTGVuZ3RoKTtcblx0XHRcdFNvY2tldC5lbWl0KCdnZXRTdGFydEJvYXJkJywgZ2FtZUxlbmd0aCwgZ2FtZUlkLCB1c2VySWRzKTtcblx0XHR9LFxuXG5cdFx0c3VibWl0OiBmdW5jdGlvbihvYmope1xuXHRcdFx0U29ja2V0LmVtaXQoJ3N1Ym1pdFdvcmQnLCBvYmopO1xuXHRcdH0sXG5cblx0XHRzaHVmZmxlOiBmdW5jdGlvbih1c2VyKXtcblx0XHRcdGNvbnNvbGUubG9nKCdncmlkZmFjdG9yeSB1Jyx1c2VyLmlkKTtcblx0XHRcdFNvY2tldC5lbWl0KCdzaHVmZmxlQm9hcmQnLHVzZXIuaWQpO1xuXHRcdH0sXG5cblx0XHQvLyBmaW5kQWxsT3RoZXJVc2VyczogZnVuY3Rpb24oZ2FtZSkge1xuXHRcdC8vIFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS9nYW1lcy8nKyBnYW1lLmlkKVxuXHRcdC8vIFx0LnRoZW4ocmVzID0+IHJlcy5kYXRhKVxuXHRcdC8vIH0sXG5cblx0XHRnZXRDdXJyZW50Um9vbTogZnVuY3Rpb24ocm9vbW5hbWUpIHtcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvZ2FtZXMvcm9vbXMvJytyb29tbmFtZSlcblx0XHRcdC50aGVuKHJlcyA9PiByZXMuZGF0YSlcblx0XHR9LFxuXG5cdFx0cXVpdEZyb21Sb29tOiBmdW5jdGlvbihnYW1lSWQsIHVzZXJJZCkge1xuXHRcdFx0Ly8gU29ja2V0LmVtaXQoJ2Rpc2Nvbm5lY3QnLCByb29tTmFtZSwgdXNlcklkKTtcblx0XHRcdHJldHVybiAkaHR0cC5kZWxldGUoJy9hcGkvZ2FtZXMvJytnYW1lSWQrJy8nK3VzZXJJZClcblx0XHR9XG5cdH1cbn0pO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ0hvbWVDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGUsICRsb2NhdGlvbil7XG4gICRzY29wZS5lbnRlckxvYmJ5ID0gZnVuY3Rpb24oKXtcbiAgICAkc3RhdGUuZ28oJ2xvYmJ5Jywge3JlbG9hZDogdHJ1ZX0pO1xuICB9XG59KTtcblxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcbiAgICAgICAgdXJsOiAnLycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaG9tZS9ob21lLmh0bWwnXG4gICAgfSk7XG59KTtcblxuIiwiYXBwLmNvbnRyb2xsZXIoJ0xlYWRlckJvYXJkQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgTGVhZGVyQm9hcmRGYWN0b3J5LCAkc3RhdGUsIEF1dGhTZXJ2aWNlKSB7XG4gICAgY29uc29sZS5sb2coJyAxJylcbiAgICBMZWFkZXJCb2FyZEZhY3RvcnkuQWxsUGxheWVycygpXG4gICAgLnRoZW4ocGxheWVycyA9PiB7XG4gICAgICAgIHBsYXllcnMuZm9yRWFjaChwbGF5ZXIgPT4ge1xuICAgICAgICAgICAgaWYgKHBsYXllci5nYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNjb3JlcyA9IHBsYXllci5nYW1lcy5tYXAoZ2FtZSA9PiBnYW1lLnVzZXJHYW1lLnNjb3JlKVxuICAgICAgICAgICAgICAgIHBsYXllci5oaWdoZXN0U2NvcmUgPSBNYXRoLm1heCguLi5zY29yZXMpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBsYXllci5oaWdoZXN0U2NvcmUgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGxheWVyLmdhbWVzX3dvbiA9IHBsYXllci53aW5uZXIubGVuZ3RoO1xuICAgICAgICAgICAgcGxheWVyLmdhbWVzX3BsYXllZCA9IHBsYXllci5nYW1lcy5sZW5ndGg7XG4gICAgICAgICAgICBpZihwbGF5ZXIuZ2FtZXMubGVuZ3RoPT09MCl7XG4gICAgICAgICAgICBcdHBsYXllci53aW5fcGVyY2VudGFnZSA9IDAgKyAnJSdcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBcdHBsYXllci53aW5fcGVyY2VudGFnZSA9ICgocGxheWVyLndpbm5lci5sZW5ndGgvcGxheWVyLmdhbWVzLmxlbmd0aCkqMTAwKS50b0ZpeGVkKDApICsgJyUnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pXG4gICAgICAgICRzY29wZS5wbGF5ZXJzID0gcGxheWVycztcbiAgICB9KVxufSk7XG4iLCJhcHAuZmFjdG9yeSgnTGVhZGVyQm9hcmRGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG5cdHZhciBMZWFkZXJCb2FyZEZhY3RvcnkgPSB7fTtcblxuXHRMZWFkZXJCb2FyZEZhY3RvcnkuQWxsUGxheWVycyA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvdXNlcnMnKVxuXHRcdC50aGVuKHJlcz0+cmVzLmRhdGEpXG5cdH1cblxuXHRyZXR1cm4gTGVhZGVyQm9hcmRGYWN0b3J5O1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xlYWRlckJvYXJkJywge1xuICAgICAgICB1cmw6ICcvbGVhZGVyQm9hcmQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xlYWRlckJvYXJkL2xlYWRlckJvYXJkLnRlbXBsYXRlLmh0bWwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgIFx0YWxsUGxheWVyczogZnVuY3Rpb24oTGVhZGVyQm9hcmRGYWN0b3J5KSB7XG4gICAgICAgIFx0XHRyZXR1cm4gTGVhZGVyQm9hcmRGYWN0b3J5LkFsbFBsYXllcnM7XG4gICAgICAgIFx0fSxcbiAgICAgICAgICAgIFxuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiAnTGVhZGVyQm9hcmRDdHJsJ1xuICAgIH0pO1xuXG59KTsiLCJhcHAuY29udHJvbGxlcignTG9iYnlDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBMb2JieUZhY3RvcnksIHJvb21zLCAkc3RhdGUsIEF1dGhTZXJ2aWNlKSB7XG5cbiAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKVxuICAgICAgICAudGhlbihmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygndXNlciBmcm9tIEF1dGhTZXJ2aWNlJywgdXNlcik7XG4gICAgICAgICAgICAkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgIH0pO1xuXG4gICAgJHNjb3BlLnJvb21zID0gcm9vbXM7XG4gICAgJHNjb3BlLnJvb21OYW1lRm9ybSA9IGZhbHNlO1xuICAgIC8vICRzY29wZS51c2VyID0ge1xuICAgIC8vICBpZDogM1xuICAgIC8vIH1cblxuICAgICRzY29wZS5qb2luR2FtZSA9IGZ1bmN0aW9uKHJvb20pIHtcbiAgICAgICAgJHN0YXRlLmdvKCdHYW1lJywgeyByb29tbmFtZTogcm9vbS5yb29tbmFtZSB9KVxuICAgIH1cblxuICAgICRzY29wZS5uZXdSb29tID0gZnVuY3Rpb24ocm9vbUluZm8pIHtcbiAgICAgICAgTG9iYnlGYWN0b3J5Lm5ld0dhbWUocm9vbUluZm8pO1xuICAgICAgICAkc2NvcGUucm9vbU5hbWVGb3JtID0gZmFsc2U7XG4gICAgfVxuICAgICRzY29wZS5zaG93Rm9ybSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUucm9vbU5hbWVGb3JtID0gdHJ1ZTtcbiAgICB9XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnZW50ZXJMb2JieScsIGZ1bmN0aW9uKCl7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvYmJ5L2xvYmJ5LWJ1dHRvbi5odG1sJyxcbiAgICBjb250cm9sbGVyOiAnSG9tZUN0cmwnXG4gIH1cbn0pXG4iLCJhcHAuZmFjdG9yeSgnTG9iYnlGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG5cdHZhciBMb2JieUZhY3RvcnkgPSB7fTtcblx0dmFyIHRlbXBSb29tcyA9IFtdOyAvL3dvcmsgd2l0aCBzb2NrZXQ/XG5cblx0TG9iYnlGYWN0b3J5LmdldEFsbFJvb21zID0gZnVuY3Rpb24oKXtcblx0XHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2dhbWVzL3Jvb21zJylcblx0XHQudGhlbihyZXMgPT4gcmVzLmRhdGEpXG5cdFx0LnRoZW4ocm9vbXMgPT4ge1xuXHRcdFx0YW5ndWxhci5jb3B5KHJvb21zLCB0ZW1wUm9vbXMpO1xuXHRcdFx0cmV0dXJuIHRlbXBSb29tcztcblx0XHR9KVxuXHR9O1xuXG5cdExvYmJ5RmFjdG9yeS5qb2luR2FtZSA9IGZ1bmN0aW9uKHJvb21JZCwgdXNlcklkKSB7XG4gICAgY29uc29sZS5sb2coJ2xvYmJ5IGZhY3Rvcnkgam9pbiBnYW1lJyk7XG5cdFx0cmV0dXJuICRodHRwLnB1dCgnL2FwaS9nYW1lcy8nKyByb29tSWQgKycvcGxheWVyJywge2lkOiB1c2VySWR9KVxuXHRcdC50aGVuKHJlcz0+cmVzLmRhdGEpXG5cdH07XG5cblx0TG9iYnlGYWN0b3J5Lm5ld0dhbWUgPSBmdW5jdGlvbihyb29tSW5mbykge1xuXHRcdHJldHVybiAkaHR0cC5wdXQoJy9hcGkvZ2FtZXMnLCByb29tSW5mbylcblx0XHQudGhlbihyZXMgPT4gcmVzLmRhdGEpXG5cdFx0LnRoZW4ocm9vbSA9PiB7dGVtcFJvb21zLnB1c2gocm9vbSl9KVxuXHR9XG5cblx0TG9iYnlGYWN0b3J5LkFsbFBsYXllcnMgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3VzZXJzJylcblx0XHQudGhlbihyZXM9PnJlcy5kYXRhKVxuXHR9XG5cblx0cmV0dXJuIExvYmJ5RmFjdG9yeTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsb2JieScsIHtcbiAgICAgICAgdXJsOiAnL2xvYmJ5JyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2JieS9sb2JieS50ZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICBcdHJvb21zOiBmdW5jdGlvbihMb2JieUZhY3RvcnkpIHtcbiAgICAgICAgXHRcdHJldHVybiBMb2JieUZhY3RvcnkuZ2V0QWxsUm9vbXMoKTtcbiAgICAgICAgXHR9XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2JieUN0cmwnXG4gICAgfSk7XG5cbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbiAobG9naW5JbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ21lbWJlcnNPbmx5Jywge1xuICAgICAgICB1cmw6ICcvbWVtYmVycy1hcmVhJyxcbiAgICAgICAgdGVtcGxhdGU6ICc8aW1nIG5nLXJlcGVhdD1cIml0ZW0gaW4gc3Rhc2hcIiB3aWR0aD1cIjMwMFwiIG5nLXNyYz1cInt7IGl0ZW0gfX1cIiAvPicsXG4gICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUsIFNlY3JldFN0YXNoKSB7XG4gICAgICAgICAgICBTZWNyZXRTdGFzaC5nZXRTdGFzaCgpLnRoZW4oZnVuY3Rpb24gKHN0YXNoKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnN0YXNoID0gc3Rhc2g7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBkYXRhLmF1dGhlbnRpY2F0ZSBpcyByZWFkIGJ5IGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KTtcblxufSk7XG5cbmFwcC5mYWN0b3J5KCdTZWNyZXRTdGFzaCcsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG4gICAgdmFyIGdldFN0YXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL21lbWJlcnMvc2VjcmV0LXN0YXNoJykudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0U3Rhc2g6IGdldFN0YXNoXG4gICAgfTtcblxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdyYW5rRGlyZWN0aXZlJywgKCk9PiB7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdFJyxcblx0XHRzY29wZToge1xuXHRcdFx0cmFua05hbWU6ICdAJyxcblx0XHRcdHBsYXllcnM6ICc9Jyxcblx0XHRcdHJhbmtCeTogJ0AnLFxuXHRcdFx0b3JkZXI6ICdAJ1xuXHRcdH0sXG5cdFx0dGVtcGxhdGVVcmw6ICcvanMvcmFuay9yYW5rLnRlbXBsYXRlLmh0bWwnXG5cdH1cbn0pOyIsImFwcC5mYWN0b3J5KCdTaWdudXBGYWN0b3J5JywgZnVuY3Rpb24oJGh0dHAsICRzdGF0ZSwgQXV0aFNlcnZpY2UpIHtcblx0Y29uc3QgU2lnbnVwRmFjdG9yeSA9IHt9O1xuXG5cdFNpZ251cEZhY3RvcnkuY3JlYXRlVXNlciA9IGZ1bmN0aW9uKHNpZ251cEluZm8pIHtcblx0XHRjb25zb2xlLmxvZyhzaWdudXBJbmZvKVxuXHRcdHJldHVybiAkaHR0cC5wb3N0KCcvc2lnbnVwJywgc2lnbnVwSW5mbylcblx0XHQudGhlbihyZXMgPT4ge1xuXHRcdFx0aWYgKHJlcy5zdGF0dXMgPT09IDIwMSkge1xuXHRcdFx0XHRBdXRoU2VydmljZS5sb2dpbih7ZW1haWw6IHNpZ251cEluZm8uZW1haWwsIHBhc3N3b3JkOiBzaWdudXBJbmZvLnBhc3N3b3JkfSlcblx0XHRcdFx0LnRoZW4odXNlciA9PiB7XG5cdFx0XHRcdFx0JHN0YXRlLmdvKCdob21lJylcblx0XHRcdFx0fSlcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRocm93IEVycm9yKCdBbiBhY2NvdW50IHdpdGggdGhhdCBlbWFpbCBhbHJlYWR5IGV4aXN0cycpO1xuXHRcdFx0fVxuXHRcdH0pXG5cdH1cblxuXHRyZXR1cm4gU2lnbnVwRmFjdG9yeTtcbn0pIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzaWdudXAnLCB7XG4gICAgICAgIHVybDogJy9zaWdudXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3NpZ251cC9zaWdudXAuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTaWdudXBDdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ1NpZ251cEN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlLCBTaWdudXBGYWN0b3J5KSB7XG5cbiAgICAkc2NvcGUuc2lnbnVwID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kU2lnbnVwID0gZnVuY3Rpb24oc2lnbnVwSW5mbyl7XG4gICAgICAgIFNpZ251cEZhY3RvcnkuY3JlYXRlVXNlcihzaWdudXBJbmZvKVxuICAgICAgICAuY2F0Y2goKCkgPT4ge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0FuIGFjY291bnQgd2l0aCB0aGF0IGVtYWlsIGFscmVhZHkgZXhpc3RzJztcbiAgICAgICAgfSlcbiAgICB9XG4gICAgXG5cblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKXtcblx0JHN0YXRlUHJvdmlkZXIuc3RhdGUoXCJVc2VyUHJvZmlsZVwiLHtcblx0XHR1cmw6IFwiL3VzZXJzLzp1c2VySWRcIixcblx0XHR0ZW1wbGF0ZVVybDpcImpzL3VzZXJfcHJvZmlsZS9wcm9maWxlLnRlbXBsYXRlLmh0bWxcIixcblx0XHRjb250cm9sbGVyOiBcIlVzZXJDdHJsXCJcblx0fSlcblx0JHN0YXRlUHJvdmlkZXIuc3RhdGUoXCJHYW1lUmVjb3JkXCIsIHtcblx0XHR1cmw6XCIvdXNlcnMvOnVzZXJJZC9nYW1lc1wiLFxuXHRcdHRlbXBsYXRlVXJsOiBcImpzL3VzZXJfcHJvZmlsZS9nYW1lcy5odG1sXCIsXG5cdFx0Y29udHJvbGxlcjogXCJHYW1lUmVjb3JkQ3RybFwiXG5cdH0pXG59KVxuXG5hcHAuY29udHJvbGxlcihcIlVzZXJDdHJsXCIsIGZ1bmN0aW9uKCRzY29wZSwgVXNlckZhY3RvcnksICRzdGF0ZVBhcmFtcyl7XG5cdFVzZXJGYWN0b3J5LmZldGNoSW5mb3JtYXRpb24oJHN0YXRlUGFyYW1zLnVzZXJJZClcblx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG5cdFx0JHNjb3BlLnVzZXI9dXNlcjtcblx0XHRyZXR1cm4gdXNlclxuXHR9KVxuXHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0XHQkc2NvcGUudXBkYXRlZD0kc2NvcGUudXNlci51cGRhdGVkQXQuZ2V0RGF5KCk7XG5cdH0pXG59KVxuXG5hcHAuY29udHJvbGxlcihcIkdhbWVSZWNvcmRDdHJsXCIsZnVuY3Rpb24oJHNjb3BlLCBVc2VyRmFjdG9yeSwgJHN0YXRlUGFyYW1zKXtcblx0VXNlckZhY3RvcnkuZmV0Y2hJbmZvcm1hdGlvbigkc3RhdGVQYXJhbXMudXNlcklkKVxuXHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0XHQkc2NvcGUudXNlcj11c2VyO1xuXHR9KVxuXHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0VXNlckZhY3RvcnkuZmV0Y2hHYW1lcygkc3RhdGVQYXJhbXMudXNlcklkKVxuXHR9KVxuXHQudGhlbihmdW5jdGlvbihnYW1lcyl7XG5cdFx0JHNjb3BlLmdhbWVzPWdhbWVzO1xuXHR9KVxufSkiLCJhcHAuZmFjdG9yeShcIlVzZXJGYWN0b3J5XCIsIGZ1bmN0aW9uKCRodHRwKXtcblx0cmV0dXJuIHtcblx0XHRmZXRjaEluZm9ybWF0aW9uOiBmdW5jdGlvbihpZCl7XG5cdFx0XHRyZXR1cm4gJGh0dHAuZ2V0KFwiL2FwaS91c2Vycy9cIitpZClcblx0XHRcdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHRcdFx0XHRyZXR1cm4gdXNlci5kYXRhO1xuXHRcdFx0fSlcblx0XHR9LFxuXHRcdGZldGNoR2FtZXM6IGZ1bmN0aW9uKGlkKXtcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoXCIvYXBpL3VzZXJzL1wiK2lkK1wiL2dhbWVzXCIpXG5cdFx0XHQudGhlbihmdW5jdGlvbihnYW1lcyl7XG5cdFx0XHRcdHJldHVybiBnYW1lcy5kYXRhO1xuXHRcdFx0fSlcblx0XHR9XG5cdH1cbn0pIiwiLy8gYXBwLmZhY3RvcnkoJ0Z1bGxzdGFja1BpY3MnLCBmdW5jdGlvbiAoKSB7XG4vLyAgICAgcmV0dXJuIFtcbi8vICAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CN2dCWHVsQ0FBQVhRY0UuanBnOmxhcmdlJyxcbi8vICAgICAgICAgJ2h0dHBzOi8vZmJjZG4tc3Bob3Rvcy1jLWEuYWthbWFpaGQubmV0L2hwaG90b3MtYWsteGFwMS90MzEuMC04LzEwODYyNDUxXzEwMjA1NjIyOTkwMzU5MjQxXzgwMjcxNjg4NDMzMTI4NDExMzdfby5qcGcnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItTEtVc2hJZ0FFeTlTSy5qcGcnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I3OS1YN29DTUFBa3c3eS5qcGcnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItVWo5Q09JSUFJRkFoMC5qcGc6bGFyZ2UnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I2eUl5RmlDRUFBcWwxMi5qcGc6bGFyZ2UnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFLVQ3NWxXQUFBbXFxSi5qcGc6bGFyZ2UnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFdlpBZy1WQUFBazkzMi5qcGc6bGFyZ2UnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFZ05NZU9YSUFJZkRoSy5qcGc6bGFyZ2UnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFUXlJRE5XZ0FBdTYwQi5qcGc6bGFyZ2UnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NDRjNUNVFXOEFFMmxHSi5qcGc6bGFyZ2UnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBZVZ3NVNXb0FBQUxzai5qcGc6bGFyZ2UnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBYUpJUDdVa0FBbElHcy5qcGc6bGFyZ2UnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBUU93OWxXRUFBWTlGbC5qcGc6bGFyZ2UnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItT1FiVnJDTUFBTndJTS5qcGc6bGFyZ2UnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I5Yl9lcndDWUFBd1JjSi5wbmc6bGFyZ2UnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I1UFRkdm5DY0FFQWw0eC5qcGc6bGFyZ2UnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I0cXdDMGlDWUFBbFBHaC5qcGc6bGFyZ2UnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0IyYjMzdlJJVUFBOW8xRC5qcGc6bGFyZ2UnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0J3cEl3cjFJVUFBdk8yXy5qcGc6bGFyZ2UnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0JzU3NlQU5DWUFFT2hMdy5qcGc6bGFyZ2UnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NKNHZMZnVVd0FBZGE0TC5qcGc6bGFyZ2UnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJN3d6akVWRUFBT1BwUy5qcGc6bGFyZ2UnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJZEh2VDJVc0FBbm5IVi5qcGc6bGFyZ2UnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NHQ2lQX1lXWUFBbzc1Vi5qcGc6bGFyZ2UnLFxuLy8gICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJUzRKUElXSUFJMzdxdS5qcGc6bGFyZ2UnXG4vLyAgICAgXTtcbi8vIH0pO1xuIiwiLy8gYXBwLmZhY3RvcnkoJ1JhbmRvbUdyZWV0aW5ncycsIGZ1bmN0aW9uICgpIHtcblxuLy8gICAgIHZhciBnZXRSYW5kb21Gcm9tQXJyYXkgPSBmdW5jdGlvbiAoYXJyKSB7XG4vLyAgICAgICAgIHJldHVybiBhcnJbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogYXJyLmxlbmd0aCldO1xuLy8gICAgIH07XG5cbi8vICAgICB2YXIgZ3JlZXRpbmdzID0gW1xuLy8gICAgICAgICAnSGVsbG8sIHdvcmxkIScsXG4vLyAgICAgICAgICdBdCBsb25nIGxhc3QsIEkgbGl2ZSEnLFxuLy8gICAgICAgICAnSGVsbG8sIHNpbXBsZSBodW1hbi4nLFxuLy8gICAgICAgICAnV2hhdCBhIGJlYXV0aWZ1bCBkYXkhJyxcbi8vICAgICAgICAgJ0lcXCdtIGxpa2UgYW55IG90aGVyIHByb2plY3QsIGV4Y2VwdCB0aGF0IEkgYW0geW91cnMuIDopJyxcbi8vICAgICAgICAgJ1RoaXMgZW1wdHkgc3RyaW5nIGlzIGZvciBMaW5kc2F5IExldmluZS4nLFxuLy8gICAgICAgICAn44GT44KT44Gr44Gh44Gv44CB44Om44O844K244O85qeY44CCJyxcbi8vICAgICAgICAgJ1dlbGNvbWUuIFRvLiBXRUJTSVRFLicsXG4vLyAgICAgICAgICc6RCcsXG4vLyAgICAgICAgICdZZXMsIEkgdGhpbmsgd2VcXCd2ZSBtZXQgYmVmb3JlLicsXG4vLyAgICAgICAgICdHaW1tZSAzIG1pbnMuLi4gSSBqdXN0IGdyYWJiZWQgdGhpcyByZWFsbHkgZG9wZSBmcml0dGF0YScsXG4vLyAgICAgICAgICdJZiBDb29wZXIgY291bGQgb2ZmZXIgb25seSBvbmUgcGllY2Ugb2YgYWR2aWNlLCBpdCB3b3VsZCBiZSB0byBuZXZTUVVJUlJFTCEnLFxuLy8gICAgIF07XG5cbi8vICAgICByZXR1cm4ge1xuLy8gICAgICAgICBncmVldGluZ3M6IGdyZWV0aW5ncyxcbi8vICAgICAgICAgZ2V0UmFuZG9tR3JlZXRpbmc6IGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICAgICAgIHJldHVybiBnZXRSYW5kb21Gcm9tQXJyYXkoZ3JlZXRpbmdzKTtcbi8vICAgICAgICAgfVxuLy8gICAgIH07XG5cbi8vIH0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdob21lJyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdZb3VyIFByb2ZpbGUnLCBzdGF0ZTogJ1VzZXJQcm9maWxlJywgYXV0aDogdHJ1ZSB9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcblxuICAgICAgICAgICAgc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UubG9nb3V0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHJlbW92ZVVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzZXRVc2VyKCk7XG5cbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0VXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCByZW1vdmVVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCByZW1vdmVVc2VyKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ2Z1bGxzdGFja0xvZ28nLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5odG1sJ1xuICAgIH07XG59KTtcbiIsIi8vIGFwcC5kaXJlY3RpdmUoJ3JhbmRvR3JlZXRpbmcnLCBmdW5jdGlvbiAoUmFuZG9tR3JlZXRpbmdzKSB7XG5cbi8vICAgICByZXR1cm4ge1xuLy8gICAgICAgICByZXN0cmljdDogJ0UnLFxuLy8gICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmh0bWwnLFxuLy8gICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcbi8vICAgICAgICAgICAgIHNjb3BlLmdyZWV0aW5nID0gUmFuZG9tR3JlZXRpbmdzLmdldFJhbmRvbUdyZWV0aW5nKCk7XG4vLyAgICAgICAgIH1cbi8vICAgICB9O1xuXG4vLyB9KTtcbiIsImFwcC5kaXJlY3RpdmUoXCJ0aW1lclwiLCBmdW5jdGlvbigkcSwgJGludGVydmFsLCBTb2NrZXQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgdGltZTogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIHRlbXBsYXRlVXJsOiBcImpzL2NvbW1vbi9kaXJlY3RpdmVzL3RpbWVyL3RpbWVyLmh0bWxcIixcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgICAgIHZhciB0aW1lID0gc2NvcGUudGltZTtcbiAgICAgICAgICAgIHZhciBzdGFydD1zY29wZS50aW1lO1xuICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBjb252ZXJ0KHRpbWUpO1xuICAgICAgICAgICAgc2NvcGUuY291bnRkb3duID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRpbWVyID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB0aW1lIC09IDE7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gY29udmVydCh0aW1lKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRpbWUgPCAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IFwiVGltZSB1cCFcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwodGltZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGltZT1zdGFydDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gc2NvcGUubWVzc2FnZXMgPSBbXCJHZXQgUmVhZHkhXCIsIFwiR2V0IFNldCFcIiwgXCJHbyFcIiwgJy8nXTtcbiAgICAgICAgICAgIC8vICAgICB2YXIgaW5kZXggPSAwO1xuICAgICAgICAgICAgLy8gICAgIHZhciBwcmVwYXJlID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IHNjb3BlLm1lc3NhZ2VzW2luZGV4XTtcbiAgICAgICAgICAgIC8vICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICAgIC8vICAgICAgICAgY29uc29sZS5sb2coc2NvcGUudGltZV9yZW1haW5pbmcpO1xuICAgICAgICAgICAgLy8gICAgICAgICBpZiAoc2NvcGUudGltZV9yZW1haW5pbmcgPT09IFwiL1wiKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IGNvbnZlcnQodGltZSk7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKHByZXBhcmUpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgdmFyIHRpbWVyID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgIHRpbWUgLT0gMTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IGNvbnZlcnQodGltZSk7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgaWYgKHRpbWUgPCAxKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gXCJUaW1lIHVwIVwiO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKHRpbWVyKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgfVxuICAgICAgICAgICAgLy8gICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgLy8gfTtcblxuICAgICAgICAgICAgU29ja2V0Lm9uKCdzdGFydEJvYXJkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuY291bnRkb3duKHRpbWUpO1xuICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgZnVuY3Rpb24gY29udmVydCh0aW1lKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlY29uZHMgPSAodGltZSAlIDYwKS50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgIHZhciBjb252ZXJzaW9uID0gKE1hdGguZmxvb3IodGltZSAvIDYwKSkgKyAnOic7XG4gICAgICAgICAgICAgICAgaWYgKHNlY29uZHMubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgICAgICAgICBjb252ZXJzaW9uICs9ICcwJyArIHNlY29uZHM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29udmVyc2lvbiArPSBzZWNvbmRzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gY29udmVyc2lvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0pXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
