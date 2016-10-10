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
    $scope.winOrLose = null;
    $scope.timeout = null;

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
        LobbyFactory.newGame($scope.roomName);
        $scope.startGame();
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

app.directive('randoGreeting', function (RandomGreetings) {

    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/rando-greeting/rando-greeting.html',
        link: function link(scope) {
            scope.greeting = RandomGreetings.getRandomGreeting();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiZ2FtZS1zdGF0ZS9ncmlkLmNvbnRyb2xsZXIuanMiLCJnYW1lLXN0YXRlL2dyaWQuZmFjdG9yeS5qcyIsImhvbWUvaG9tZS5jb250cm9sbGVyLmpzIiwiaG9tZS9ob21lLmpzIiwibGVhZGVyQm9hcmQvbGVhZGVyQm9hcmQuY29udHJvbGxlci5qcyIsImxlYWRlckJvYXJkL2xlYWRlckJvYXJkLmZhY3RvcnkuanMiLCJsZWFkZXJCb2FyZC9sZWFkZXJCb2FyZC5zdGF0ZS5qcyIsImxvYmJ5L2xvYmJ5LmNvbnRyb2xsZXIuanMiLCJsb2JieS9sb2JieS5kaXJlY3RpdmUuanMiLCJsb2JieS9sb2JieS5mYWN0b3J5LmpzIiwibG9iYnkvbG9iYnkuc3RhdGUuanMiLCJsb2dpbi9sb2dpbi5qcyIsIm1lbWJlcnMtb25seS9tZW1iZXJzLW9ubHkuanMiLCJyYW5rL3JhbmsuZGlyZWN0aXZlLmpzIiwic2lnbnVwL3NpZ251cC5mYWN0b3J5LmpzIiwic2lnbnVwL3NpZ251cC5qcyIsInVzZXJfcHJvZmlsZS9wcm9maWxlLmNvbnRyb2xsZXIuanMiLCJ1c2VyX3Byb2ZpbGUvcHJvZmlsZS5mYWN0b3J5LmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbG9nby9sb2dvLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvdGltZXIvdGltZXIuanMiXSwibmFtZXMiOlsid2luZG93IiwiYXBwIiwiYW5ndWxhciIsIm1vZHVsZSIsImNvbmZpZyIsIiR1cmxSb3V0ZXJQcm92aWRlciIsIiRsb2NhdGlvblByb3ZpZGVyIiwiaHRtbDVNb2RlIiwib3RoZXJ3aXNlIiwid2hlbiIsImxvY2F0aW9uIiwicmVsb2FkIiwicnVuIiwiJHJvb3RTY29wZSIsIiRvbiIsImV2ZW50IiwidG9TdGF0ZSIsInRvUGFyYW1zIiwiZnJvbVN0YXRlIiwiZnJvbVBhcmFtcyIsInRocm93bkVycm9yIiwiY29uc29sZSIsImluZm8iLCJuYW1lIiwiZXJyb3IiLCJBdXRoU2VydmljZSIsIiRzdGF0ZSIsImRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgiLCJzdGF0ZSIsImRhdGEiLCJhdXRoZW50aWNhdGUiLCJpc0F1dGhlbnRpY2F0ZWQiLCJwcmV2ZW50RGVmYXVsdCIsImdldExvZ2dlZEluVXNlciIsInRoZW4iLCJ1c2VyIiwiZ28iLCJFcnJvciIsImZhY3RvcnkiLCJpbyIsIm9yaWdpbiIsImNvbnN0YW50IiwibG9naW5TdWNjZXNzIiwibG9naW5GYWlsZWQiLCJsb2dvdXRTdWNjZXNzIiwic2Vzc2lvblRpbWVvdXQiLCJub3RBdXRoZW50aWNhdGVkIiwibm90QXV0aG9yaXplZCIsIiRxIiwiQVVUSF9FVkVOVFMiLCJzdGF0dXNEaWN0IiwicmVzcG9uc2VFcnJvciIsInJlc3BvbnNlIiwiJGJyb2FkY2FzdCIsInN0YXR1cyIsInJlamVjdCIsIiRodHRwUHJvdmlkZXIiLCJpbnRlcmNlcHRvcnMiLCJwdXNoIiwiJGluamVjdG9yIiwiZ2V0Iiwic2VydmljZSIsIiRodHRwIiwiU2Vzc2lvbiIsIm9uU3VjY2Vzc2Z1bExvZ2luIiwiY3JlYXRlIiwiZnJvbVNlcnZlciIsImNhdGNoIiwibG9naW4iLCJjcmVkZW50aWFscyIsInBvc3QiLCJtZXNzYWdlIiwibG9nb3V0IiwiZGVzdHJveSIsInNlbGYiLCIkc3RhdGVQcm92aWRlciIsInVybCIsInRlbXBsYXRlVXJsIiwiY29udHJvbGxlciIsIiRzY29wZSIsIkJvYXJkRmFjdG9yeSIsIlNvY2tldCIsIiRzdGF0ZVBhcmFtcyIsIkxvYmJ5RmFjdG9yeSIsImxvZyIsImV4cG9ydHMiLCJwbGF5ZXJJZCIsImlkIiwicm9vbU5hbWUiLCJyb29tbmFtZSIsIm90aGVyUGxheWVycyIsImdhbWVMZW5ndGgiLCJ3b3JkT2JqIiwid29yZCIsInN0YXRlTnVtYmVyIiwicG9pbnRzRWFybmVkIiwibW91c2VJc0Rvd24iLCJkcmFnZ2luZ0FsbG93ZWQiLCJzdHlsZSIsImZyZWV6ZSIsIndpbk9yTG9zZSIsInRpbWVvdXQiLCJjaGVja1NlbGVjdGVkIiwidG9nZ2xlRHJhZyIsIm1vdXNlRG93biIsIm1vdXNlVXAiLCJsZW5ndGgiLCJzdWJtaXQiLCJkcmFnIiwic3BhY2UiLCJjbGljayIsImdldEN1cnJlbnRSb29tIiwicm9vbSIsImdhbWVJZCIsInVzZXJzIiwiZmlsdGVyIiwiZm9yRWFjaCIsInBsYXllciIsInNjb3JlIiwiam9pbkdhbWUiLCJoaWRlQm9hcmQiLCJzdGFydEdhbWUiLCJ1c2VySWRzIiwibWFwIiwiZ2V0U3RhcnRCb2FyZCIsInF1aXQiLCJoaWRlTmF2YmFyIiwiYm9hcmQiLCJtZXNzYWdlcyIsInNpemUiLCJsdHJzU2VsZWN0ZWQiLCJPYmplY3QiLCJrZXlzIiwicHJldmlvdXNMdHIiLCJsYXN0THRyIiwidmFsaWRTZWxlY3QiLCJzdWJzdHJpbmciLCJsdHJJZCIsIm90aGVyTHRyc0lkcyIsImluY2x1ZGVzIiwiY29vcmRzIiwic3BsaXQiLCJyb3ciLCJjb2wiLCJsYXN0THRySWQiLCJwb3AiLCJjb29yZHNMYXN0Iiwicm93TGFzdCIsImNvbExhc3QiLCJyb3dPZmZzZXQiLCJNYXRoIiwiYWJzIiwiY29sT2Zmc2V0IiwiY2xlYXJJZkNvbmZsaWN0aW5nIiwidXBkYXRlV29yZE9iaiIsImV4cG9ydFdvcmRPYmoiLCJ0aWxlc01vdmVkIiwibXlXb3JkVGlsZXMiLCJzb21lIiwiY29vcmQiLCJjbGVhciIsIm9iaiIsInNodWZmbGUiLCJ1cGRhdGVCb2FyZCIsImtleSIsInVwZGF0ZVNjb3JlIiwicG9pbnRzIiwidXBkYXRlIiwidXBkYXRlT2JqIiwidXNlcm5hbWUiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwiJGV2YWxBc3luYyIsInJlcGxheSIsIm5ld0dhbWUiLCJkZXRlcm1pbmVXaW5uZXIiLCJ3aW5uZXJzQXJyYXkiLCJ3aW5uZXIiLCJ3aW5uZXJzIiwiaSIsImRpc2Nvbm5lY3QiLCJvbiIsImVtaXQiLCIkZGlnZXN0IiwibGFzdFdvcmRQbGF5ZWQiLCJ1c2VySWQiLCJyZXMiLCJxdWl0RnJvbVJvb20iLCJkZWxldGUiLCIkbG9jYXRpb24iLCJlbnRlckxvYmJ5IiwiTGVhZGVyQm9hcmRGYWN0b3J5IiwiQWxsUGxheWVycyIsInBsYXllcnMiLCJnYW1lcyIsInNjb3JlcyIsImdhbWUiLCJ1c2VyR2FtZSIsImhpZ2hlc3RTY29yZSIsIm1heCIsImdhbWVzX3dvbiIsImdhbWVzX3BsYXllZCIsIndpbl9wZXJjZW50YWdlIiwidG9GaXhlZCIsInJlc29sdmUiLCJhbGxQbGF5ZXJzIiwicm9vbXMiLCJyb29tTmFtZUZvcm0iLCJuZXdSb29tIiwicm9vbUluZm8iLCJzaG93Rm9ybSIsImRpcmVjdGl2ZSIsInJlc3RyaWN0IiwidGVtcFJvb21zIiwiZ2V0QWxsUm9vbXMiLCJjb3B5Iiwicm9vbUlkIiwicHV0Iiwic2VuZExvZ2luIiwibG9naW5JbmZvIiwidGVtcGxhdGUiLCJTZWNyZXRTdGFzaCIsImdldFN0YXNoIiwic3Rhc2giLCJzY29wZSIsInJhbmtOYW1lIiwicmFua0J5Iiwib3JkZXIiLCJTaWdudXBGYWN0b3J5IiwiY3JlYXRlVXNlciIsInNpZ251cEluZm8iLCJlbWFpbCIsInBhc3N3b3JkIiwic2lnbnVwIiwic2VuZFNpZ251cCIsIlVzZXJGYWN0b3J5IiwiZmV0Y2hJbmZvcm1hdGlvbiIsInVwZGF0ZWQiLCJ1cGRhdGVkQXQiLCJnZXREYXkiLCJmZXRjaEdhbWVzIiwibGluayIsIml0ZW1zIiwibGFiZWwiLCJhdXRoIiwiaXNMb2dnZWRJbiIsInNldFVzZXIiLCJyZW1vdmVVc2VyIiwiUmFuZG9tR3JlZXRpbmdzIiwiZ3JlZXRpbmciLCJnZXRSYW5kb21HcmVldGluZyIsIiRpbnRlcnZhbCIsInRpbWUiLCJzdGFydCIsInRpbWVfcmVtYWluaW5nIiwiY29udmVydCIsImNvdW50ZG93biIsInRpbWVyIiwiY2FuY2VsIiwic2Vjb25k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QSxHQUFBLFlBQUE7QUFDQSxvQkFBQUMsUUFBQU4sVUFBQSxZQUFBO0FBQ0FDLDRCQUFBLENBQUE7QUFDQTVCLDBCQUFBOEIsY0FBQSxHQUFBQyxRQUFBSCxJQUFBLENBQUE7QUFDQSx3QkFBQUEsT0FBQSxDQUFBLEVBQUE7QUFDQTVCLDhCQUFBOEIsY0FBQSxHQUFBLFVBQUE7QUFDQUgsa0NBQUFPLE1BQUEsQ0FBQUQsS0FBQTtBQUNBTCwrQkFBQUMsS0FBQTtBQUNBO0FBQ0EsaUJBUkEsRUFRQSxJQVJBLENBQUE7QUFTQSxhQVZBOztBQVlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE1SyxtQkFBQW9HLEVBQUEsQ0FBQSxZQUFBLEVBQUEsWUFBQTtBQUNBMkMsc0JBQUFnQyxTQUFBLENBQUFKLElBQUE7QUFDQSxhQUZBOztBQUtBLHFCQUFBRyxPQUFBLENBQUFILElBQUEsRUFBQTtBQUNBLG9CQUFBTyxVQUFBLENBQUFQLE9BQUEsRUFBQSxFQUFBUSxRQUFBLEVBQUE7QUFDQSxvQkFBQUMsYUFBQS9HLEtBQUFnSCxLQUFBLENBQUFWLE9BQUEsRUFBQSxDQUFBLEdBQUEsR0FBQTtBQUNBLG9CQUFBTyxRQUFBekosTUFBQSxHQUFBLENBQUEsRUFBQTtBQUNBMkosa0NBQUEsTUFBQUYsT0FBQTtBQUNBLGlCQUZBLE1BRUE7QUFDQUUsa0NBQUFGLE9BQUE7QUFDQTtBQUNBLHVCQUFBRSxVQUFBO0FBQ0E7QUFDQTtBQTFEQSxLQUFBO0FBNERBLENBN0RBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG53aW5kb3cuYXBwID0gYW5ndWxhci5tb2R1bGUoJ0Z1bGxzdGFja0dlbmVyYXRlZEFwcCcsIFsnZnNhUHJlQnVpbHQnLCAndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICduZ0FuaW1hdGUnXSk7XG5cbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcbiAgICAvLyBUcmlnZ2VyIHBhZ2UgcmVmcmVzaCB3aGVuIGFjY2Vzc2luZyBhbiBPQXV0aCByb3V0ZVxuICAgICR1cmxSb3V0ZXJQcm92aWRlci53aGVuKCcvYXV0aC86cHJvdmlkZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICB9KTtcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGxpc3RlbmluZyB0byBlcnJvcnMgYnJvYWRjYXN0ZWQgYnkgdWktcm91dGVyLCB1c3VhbGx5IG9yaWdpbmF0aW5nIGZyb20gcmVzb2x2ZXNcbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUpIHtcbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlRXJyb3InLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zLCBmcm9tU3RhdGUsIGZyb21QYXJhbXMsIHRocm93bkVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuaW5mbyhgVGhlIGZvbGxvd2luZyBlcnJvciB3YXMgdGhyb3duIGJ5IHVpLXJvdXRlciB3aGlsZSB0cmFuc2l0aW9uaW5nIHRvIHN0YXRlIFwiJHt0b1N0YXRlLm5hbWV9XCIuIFRoZSBvcmlnaW4gb2YgdGhpcyBlcnJvciBpcyBwcm9iYWJseSBhIHJlc29sdmUgZnVuY3Rpb246YCk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IodGhyb3duRXJyb3IpO1xuICAgIH0pO1xufSk7XG5cbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgY29udHJvbGxpbmcgYWNjZXNzIHRvIHNwZWNpZmljIHN0YXRlcy5cbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgIC8vIFRoZSBnaXZlbiBzdGF0ZSByZXF1aXJlcyBhbiBhdXRoZW50aWNhdGVkIHVzZXIuXG4gICAgdmFyIGRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGggPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmRhdGEgJiYgc3RhdGUuZGF0YS5hdXRoZW50aWNhdGU7XG4gICAgfTtcblxuICAgIC8vICRzdGF0ZUNoYW5nZVN0YXJ0IGlzIGFuIGV2ZW50IGZpcmVkXG4gICAgLy8gd2hlbmV2ZXIgdGhlIHByb2Nlc3Mgb2YgY2hhbmdpbmcgYSBzdGF0ZSBiZWdpbnMuXG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcykge1xuXG4gICAgICAgIGlmICghZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCh0b1N0YXRlKSkge1xuICAgICAgICAgICAgLy8gVGhlIGRlc3RpbmF0aW9uIHN0YXRlIGRvZXMgbm90IHJlcXVpcmUgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgICAgIC8vIFRoZSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWQuXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FuY2VsIG5hdmlnYXRpbmcgdG8gbmV3IHN0YXRlLlxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIC8vIElmIGEgdXNlciBpcyByZXRyaWV2ZWQsIHRoZW4gcmVuYXZpZ2F0ZSB0byB0aGUgZGVzdGluYXRpb25cbiAgICAgICAgICAgIC8vICh0aGUgc2Vjb25kIHRpbWUsIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpIHdpbGwgd29yaylcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgaWYgbm8gdXNlciBpcyBsb2dnZWQgaW4sIGdvIHRvIFwibG9naW5cIiBzdGF0ZS5cbiAgICAgICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKHRvU3RhdGUubmFtZSwgdG9QYXJhbXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbn0pO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgW10pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgICB9KTtcblxuICAgIC8vIEFVVEhfRVZFTlRTIGlzIHVzZWQgdGhyb3VnaG91dCBvdXIgYXBwIHRvXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxuICAgIGFwcC5jb25zdGFudCgnQVVUSF9FVkVOVFMnLCB7XG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxuICAgICAgICBsb2dvdXRTdWNjZXNzOiAnYXV0aC1sb2dvdXQtc3VjY2VzcycsXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXG4gICAgICAgIG5vdEF1dGhvcml6ZWQ6ICdhdXRoLW5vdC1hdXRob3JpemVkJ1xuICAgIH0pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ0F1dGhJbnRlcmNlcHRvcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgQVVUSF9FVkVOVFMpIHtcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXG4gICAgICAgICAgICA0MDM6IEFVVEhfRVZFTlRTLm5vdEF1dGhvcml6ZWQsXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KHN0YXR1c0RpY3RbcmVzcG9uc2Uuc3RhdHVzXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goW1xuICAgICAgICAgICAgJyRpbmplY3RvcicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoJGluamVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRpbmplY3Rvci5nZXQoJ0F1dGhJbnRlcmNlcHRvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdBdXRoU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgU2Vzc2lvbiwgJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMsICRxKSB7XG5cbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzZnVsTG9naW4ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHZhciB1c2VyID0gcmVzcG9uc2UuZGF0YS51c2VyO1xuICAgICAgICAgICAgU2Vzc2lvbi5jcmVhdGUodXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzKTtcbiAgICAgICAgICAgIHJldHVybiB1c2VyO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlcyB0aGUgc2Vzc2lvbiBmYWN0b3J5IHRvIHNlZSBpZiBhblxuICAgICAgICAvLyBhdXRoZW50aWNhdGVkIHVzZXIgaXMgY3VycmVudGx5IHJlZ2lzdGVyZWQuXG4gICAgICAgIHRoaXMuaXNBdXRoZW50aWNhdGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhU2Vzc2lvbi51c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyID0gZnVuY3Rpb24gKGZyb21TZXJ2ZXIpIHtcblxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcbiAgICAgICAgICAgIC8vIHJldHVybiB0aGUgdXNlciBhdHRhY2hlZCB0byB0aGF0IHNlc3Npb25cbiAgICAgICAgICAgIC8vIHdpdGggYSBwcm9taXNlLiBUaGlzIGVuc3VyZXMgdGhhdCB3ZSBjYW5cbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cblxuICAgICAgICAgICAgLy8gT3B0aW9uYWxseSwgaWYgdHJ1ZSBpcyBnaXZlbiBhcyB0aGUgZnJvbVNlcnZlciBwYXJhbWV0ZXIsXG4gICAgICAgICAgICAvLyB0aGVuIHRoaXMgY2FjaGVkIHZhbHVlIHdpbGwgbm90IGJlIHVzZWQuXG5cbiAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0aGVudGljYXRlZCgpICYmIGZyb21TZXJ2ZXIgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbihTZXNzaW9uLnVzZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYWtlIHJlcXVlc3QgR0VUIC9zZXNzaW9uLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIHVzZXIsIGNhbGwgb25TdWNjZXNzZnVsTG9naW4gd2l0aCB0aGUgcmVzcG9uc2UuXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgNDAxIHJlc3BvbnNlLCB3ZSBjYXRjaCBpdCBhbmQgaW5zdGVhZCByZXNvbHZlIHRvIG51bGwuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dpbiA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dpbicsIGNyZWRlbnRpYWxzKVxuICAgICAgICAgICAgICAgIC50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2xvZ291dCcpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnU2Vzc2lvbicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUykge1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG59KCkpO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdHYW1lJywge1xuICAgICAgICB1cmw6ICcvZ2FtZS86cm9vbW5hbWUnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2dhbWUtc3RhdGUvcGFnZS5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogXCJHYW1lQ3RybFwiLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBhdXRoZW50aWNhdGU6IHRydWVcbiAgICAgICAgfVxuICAgIH0pO1xufSk7XG5cblxuYXBwLmNvbnRyb2xsZXIoJ0dhbWVDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBCb2FyZEZhY3RvcnksIFNvY2tldCwgJHN0YXRlUGFyYW1zLCBBdXRoU2VydmljZSwgJHN0YXRlLCBMb2JieUZhY3RvcnksICRyb290U2NvcGUpIHtcblxuICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd1c2VyIGZyb20gQXV0aFNlcnZpY2UnLCB1c2VyKTtcbiAgICAgICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLnBsYXllcklkID0gdXNlci5pZDtcbiAgICAgICAgfSk7XG5cbiAgICAkc2NvcGUucm9vbU5hbWUgPSAkc3RhdGVQYXJhbXMucm9vbW5hbWU7XG5cbiAgICAkc2NvcGUub3RoZXJQbGF5ZXJzID0gW107XG5cbiAgICAkc2NvcGUuZ2FtZUxlbmd0aCA9IDEwO1xuXG4gICAgJHNjb3BlLmV4cG9ydHMgPSB7XG4gICAgICAgIHdvcmRPYmo6IHt9LFxuICAgICAgICB3b3JkOiBcIlwiLFxuICAgICAgICBwbGF5ZXJJZDogbnVsbCxcbiAgICAgICAgc3RhdGVOdW1iZXI6IDAsXG4gICAgICAgIHBvaW50c0Vhcm5lZDogbnVsbFxuICAgIH07XG5cbiAgICAkc2NvcGUubW91c2VJc0Rvd24gPSBmYWxzZTtcbiAgICAkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkID0gZmFsc2U7XG4gICAgJHNjb3BlLnN0eWxlPW51bGw7XG4gICAgJHNjb3BlLm1lc3NhZ2U9Jyc7XG4gICAgJHNjb3BlLmZyZWV6ZT1mYWxzZTtcbiAgICAkc2NvcGUud2luT3JMb3NlPW51bGw7XG4gICAgJHNjb3BlLnRpbWVvdXQ9bnVsbDtcblxuICAgICRzY29wZS5jaGVja1NlbGVjdGVkID0gZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgcmV0dXJuIGlkIGluICRzY29wZS5leHBvcnRzLndvcmRPYmo7XG4gICAgfTtcblxuICAgICRzY29wZS50b2dnbGVEcmFnID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5kcmFnZ2luZ0FsbG93ZWQgPSAhJHNjb3BlLmRyYWdnaW5nQWxsb3dlZDtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm1vdXNlRG93biA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUubW91c2VJc0Rvd24gPSB0cnVlO1xuICAgIH07XG5cbiAgICAkc2NvcGUubW91c2VVcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUubW91c2VJc0Rvd24gPSBmYWxzZTtcbiAgICAgICAgaWYgKCRzY29wZS5kcmFnZ2luZ0FsbG93ZWQgJiYgJHNjb3BlLmV4cG9ydHMud29yZC5sZW5ndGggPiAxKSAkc2NvcGUuc3VibWl0KCRzY29wZS5leHBvcnRzKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmRyYWcgPSBmdW5jdGlvbihzcGFjZSwgaWQpIHtcbiAgICAgICAgaWYgKCRzY29wZS5tb3VzZUlzRG93biAmJiAkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkKSB7XG4gICAgICAgICAgICAkc2NvcGUuY2xpY2soc3BhY2UsIGlkKTtcbiAgICAgICAgfVxuICAgIH07XG5cblxuXG4gICAgLy9nZXQgdGhlIGN1cnJlbnQgcm9vbSBpbmZvXG4gICAgQm9hcmRGYWN0b3J5LmdldEN1cnJlbnRSb29tKCRzdGF0ZVBhcmFtcy5yb29tbmFtZSlcbiAgICAgICAgLnRoZW4ocm9vbSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhyb29tKVxuICAgICAgICAgICAgJHNjb3BlLmdhbWVJZCA9IHJvb20uaWQ7XG4gICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzID0gcm9vbS51c2Vycy5maWx0ZXIodXNlciA9PiB1c2VyLmlkICE9PSAkc2NvcGUudXNlci5pZCk7XG4gICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzLmZvckVhY2gocGxheWVyID0+IHsgcGxheWVyLnNjb3JlID0gMCB9KVxuICAgICAgICAgICAgTG9iYnlGYWN0b3J5LmpvaW5HYW1lKHJvb20uaWQsICRzY29wZS51c2VyLmlkKTtcbiAgICAgICAgfSk7XG5cbiAgICAkc2NvcGUuaGlkZUJvYXJkID0gdHJ1ZTtcblxuICAgIC8vIFN0YXJ0IHRoZSBnYW1lIHdoZW4gYWxsIHBsYXllcnMgaGF2ZSBqb2luZWQgcm9vbVxuICAgICRzY29wZS5zdGFydEdhbWUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHVzZXJJZHMgPSAkc2NvcGUub3RoZXJQbGF5ZXJzLm1hcCh1c2VyID0+IHVzZXIuaWQpO1xuICAgICAgICB1c2VySWRzLnB1c2goJHNjb3BlLnVzZXIuaWQpO1xuICAgICAgICBjb25zb2xlLmxvZygnb3AnLCAkc2NvcGUub3RoZXJQbGF5ZXJzLCAndWknLCB1c2VySWRzKTtcbiAgICAgICAgJHNjb3BlLndpbk9yTG9zZT1udWxsO1xuICAgICAgICBCb2FyZEZhY3RvcnkuZ2V0U3RhcnRCb2FyZCgkc2NvcGUuZ2FtZUxlbmd0aCwgJHNjb3BlLmdhbWVJZCwgdXNlcklkcyk7XG4gICAgfTtcblxuXG4gICAgLy9RdWl0IHRoZSByb29tLCBiYWNrIHRvIGxvYmJ5XG4gICAgJHNjb3BlLnF1aXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHJvb3RTY29wZS5oaWRlTmF2YmFyID0gZmFsc2U7XG4gICAgICAgICRzdGF0ZS5nbygnbG9iYnknKVxuICAgIH07XG5cblxuICAgICRzY29wZS5ib2FyZCA9IFtcbiAgICAgICAgWydiJywgJ2EnLCAnZCcsICdlJywgJ2EnLCAnciddLFxuICAgICAgICBbJ2UnLCAnZicsICdnJywgJ2wnLCAnbScsICdlJ10sXG4gICAgICAgIFsnaCcsICdpJywgJ2onLCAnZicsICdvJywgJ2EnXSxcbiAgICAgICAgWydjJywgJ2EnLCAnZCcsICdlJywgJ2EnLCAnciddLFxuICAgICAgICBbJ2UnLCAnZicsICdnJywgJ2wnLCAnZCcsICdlJ10sXG4gICAgICAgIFsnaCcsICdpJywgJ2onLCAnZicsICdvJywgJ2EnXVxuICAgIF07XG5cbiAgICAkc2NvcGUubWVzc2FnZXMgPSBudWxsO1xuXG4gICAgJHNjb3BlLnNpemUgPSAzO1xuICAgICRzY29wZS5zY29yZSA9IDA7XG5cblxuICAgICRzY29wZS5jbGljayA9IGZ1bmN0aW9uKHNwYWNlLCBpZCkge1xuICAgICAgICBpZiAoJHNjb3BlLmZyZWV6ZSkge1xuICAgICAgICAgICAgcmV0dXJuOyB9XG4gICAgICAgIGNvbnNvbGUubG9nKCdjbGlja2VkICcsIHNwYWNlLCBpZCk7XG4gICAgICAgIHZhciBsdHJzU2VsZWN0ZWQgPSBPYmplY3Qua2V5cygkc2NvcGUuZXhwb3J0cy53b3JkT2JqKTtcbiAgICAgICAgdmFyIHByZXZpb3VzTHRyID0gbHRyc1NlbGVjdGVkW2x0cnNTZWxlY3RlZC5sZW5ndGggLSAyXTtcbiAgICAgICAgdmFyIGxhc3RMdHIgPSBsdHJzU2VsZWN0ZWRbbHRyc1NlbGVjdGVkLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAoIWx0cnNTZWxlY3RlZC5sZW5ndGggfHwgdmFsaWRTZWxlY3QoaWQsIGx0cnNTZWxlY3RlZCkpIHtcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLndvcmQgKz0gc3BhY2U7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkT2JqW2lkXSA9IHNwYWNlO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJHNjb3BlLmV4cG9ydHMpO1xuICAgICAgICB9IGVsc2UgaWYgKGlkID09PSBwcmV2aW91c0x0cikge1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZCA9ICRzY29wZS5leHBvcnRzLndvcmQuc3Vic3RyaW5nKDAsICRzY29wZS5leHBvcnRzLndvcmQubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICBkZWxldGUgJHNjb3BlLmV4cG9ydHMud29yZE9ialtsYXN0THRyXTtcbiAgICAgICAgfSBlbHNlIGlmIChsdHJzU2VsZWN0ZWQubGVuZ3RoID09PSAxICYmIGlkID09PSBsYXN0THRyKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkID0gXCJcIjtcbiAgICAgICAgICAgIGRlbGV0ZSAkc2NvcGUuZXhwb3J0cy53b3JkT2JqW2xhc3RMdHJdO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vbWFrZXMgc3VyZSBsZXR0ZXIgaXMgYWRqYWNlbnQgdG8gcHJldiBsdHIsIGFuZCBoYXNuJ3QgYmVlbiB1c2VkIHlldFxuICAgIGZ1bmN0aW9uIHZhbGlkU2VsZWN0KGx0cklkLCBvdGhlckx0cnNJZHMpIHtcbiAgICAgICAgaWYgKG90aGVyTHRyc0lkcy5pbmNsdWRlcyhsdHJJZCkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgdmFyIGNvb3JkcyA9IGx0cklkLnNwbGl0KCctJyk7XG4gICAgICAgIHZhciByb3cgPSBjb29yZHNbMF07XG4gICAgICAgIHZhciBjb2wgPSBjb29yZHNbMV07XG4gICAgICAgIHZhciBsYXN0THRySWQgPSBvdGhlckx0cnNJZHMucG9wKCk7XG4gICAgICAgIHZhciBjb29yZHNMYXN0ID0gbGFzdEx0cklkLnNwbGl0KCctJyk7XG4gICAgICAgIHZhciByb3dMYXN0ID0gY29vcmRzTGFzdFswXTtcbiAgICAgICAgdmFyIGNvbExhc3QgPSBjb29yZHNMYXN0WzFdO1xuICAgICAgICB2YXIgcm93T2Zmc2V0ID0gTWF0aC5hYnMocm93IC0gcm93TGFzdCk7XG4gICAgICAgIHZhciBjb2xPZmZzZXQgPSBNYXRoLmFicyhjb2wgLSBjb2xMYXN0KTtcbiAgICAgICAgcmV0dXJuIChyb3dPZmZzZXQgPD0gMSAmJiBjb2xPZmZzZXQgPD0gMSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYXJJZkNvbmZsaWN0aW5nKHVwZGF0ZVdvcmRPYmosIGV4cG9ydFdvcmRPYmopIHtcbiAgICAgICAgdmFyIHRpbGVzTW92ZWQgPSBPYmplY3Qua2V5cyh1cGRhdGVXb3JkT2JqKTtcbiAgICAgICAgdmFyIG15V29yZFRpbGVzID0gT2JqZWN0LmtleXMoZXhwb3J0V29yZE9iaik7XG4gICAgICAgIGlmICh0aWxlc01vdmVkLnNvbWUoY29vcmQgPT4gbXlXb3JkVGlsZXMuaW5jbHVkZXMoY29vcmQpKSkgJHNjb3BlLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgJHNjb3BlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5leHBvcnRzLndvcmQgPSBcIlwiO1xuICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkT2JqID0ge307XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLnN1Ym1pdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgICBjb25zb2xlLmxvZygnc3VibWl0dGluZyAnLCBvYmopO1xuICAgICAgICBCb2FyZEZhY3Rvcnkuc3VibWl0KG9iaik7XG4gICAgICAgICRzY29wZS5jbGVhcigpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc2h1ZmZsZSA9IEJvYXJkRmFjdG9yeS5zaHVmZmxlO1xuXG5cbiAgICAkc2NvcGUudXBkYXRlQm9hcmQgPSBmdW5jdGlvbih3b3JkT2JqKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdzY29wZS5ib2FyZCcsICRzY29wZS5ib2FyZCk7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB3b3JkT2JqKSB7XG4gICAgICAgICAgICB2YXIgY29vcmRzID0ga2V5LnNwbGl0KCctJyk7XG4gICAgICAgICAgICB2YXIgcm93ID0gY29vcmRzWzBdO1xuICAgICAgICAgICAgdmFyIGNvbCA9IGNvb3Jkc1sxXTtcbiAgICAgICAgICAgICRzY29wZS5ib2FyZFtyb3ddW2NvbF0gPSB3b3JkT2JqW2tleV07XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnVwZGF0ZVNjb3JlID0gZnVuY3Rpb24ocG9pbnRzLCBwbGF5ZXJJZCkge1xuICAgICAgICBjb25zb2xlLmxvZygndXBkYXRlIHNjb3JlIHBvaW50cycsIHBvaW50cyk7XG4gICAgICAgIGlmIChwbGF5ZXJJZCA9PT0gJHNjb3BlLnVzZXIuaWQpIHtcbiAgICAgICAgICAgICRzY29wZS5zY29yZSArPSBwb2ludHM7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy5wb2ludHNFYXJuZWQgPSBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIgcGxheWVyIGluICRzY29wZS5vdGhlclBsYXllcnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLm90aGVyUGxheWVyc1twbGF5ZXJdLmlkID09PSBwbGF5ZXJJZCkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzW3BsYXllcl0uc2NvcmUgKz0gcG9pbnRzO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy5wb2ludHNFYXJuZWQgPSBudWxsO1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLnVwZGF0ZSA9IGZ1bmN0aW9uKHVwZGF0ZU9iaikge1xuICAgICAgICAkc2NvcGUudXBkYXRlU2NvcmUodXBkYXRlT2JqLnBvaW50c0Vhcm5lZCwgdXBkYXRlT2JqLnBsYXllcklkKTtcbiAgICAgICAgJHNjb3BlLnVwZGF0ZUJvYXJkKHVwZGF0ZU9iai53b3JkT2JqKTtcbiAgICAgICAgaWYgKCskc2NvcGUudXNlci5pZD09PSt1cGRhdGVPYmoucGxheWVySWQpe1xuICAgICAgICAgICAgdmFyIHBsYXllcj0kc2NvcGUudXNlci51c2VybmFtZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluICRzY29wZS5vdGhlclBsYXllcnMpe1xuICAgICAgICAgICAgICAgIGlmICgrJHNjb3BlLm90aGVyUGxheWVyc1trZXldLmlkPT09K3VwZGF0ZU9iai5wbGF5ZXJJZCl7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwbGF5ZXI9JHNjb3BlLm90aGVyUGxheWVyc1trZXldLnVzZXJuYW1lO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLm1lc3NhZ2U9cGxheWVyK1wiIHBsYXllZCBcIit1cGRhdGVPYmoud29yZCtcIiBmb3IgXCIrdXBkYXRlT2JqLnBvaW50c0Vhcm5lZCtcIiBwb2ludHMhXCI7XG4gICAgICAgIGlmICgkc2NvcGUudGltZW91dCl7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoJHNjb3BlLnRpbWVvdXQpO1xuICAgICAgICB9XG4gICAgICAgICRzY29wZS50aW1lb3V0PXNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICRzY29wZS5tZXNzYWdlPScnO1xuICAgICAgICB9LCAzMDAwKVxuICAgICAgICBjb25zb2xlLmxvZygnaXRzIHVwZGF0aW5nIScpO1xuICAgICAgICBjbGVhcklmQ29uZmxpY3RpbmcodXBkYXRlT2JqLCAkc2NvcGUuZXhwb3J0cy53b3JkT2JqKTtcbiAgICAgICAgJHNjb3BlLmV4cG9ydHMuc3RhdGVOdW1iZXIgPSB1cGRhdGVPYmouc3RhdGVOdW1iZXI7XG4gICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5yZXBsYXk9ZnVuY3Rpb24oKXtcbiAgICAgICAgTG9iYnlGYWN0b3J5Lm5ld0dhbWUoJHNjb3BlLnJvb21OYW1lKTtcbiAgICAgICAgJHNjb3BlLnN0YXJ0R2FtZSgpO1xuICAgIH1cblxuICAgICRzY29wZS5kZXRlcm1pbmVXaW5uZXI9ZnVuY3Rpb24od2lubmVyc0FycmF5KXtcbiAgICAgICAgaWYgKHdpbm5lcnNBcnJheS5sZW5ndGg9PT0xKXtcbiAgICAgICAgICAgIGlmICgrd2lubmVyc0FycmF5WzBdPT09KyRzY29wZS51c2VyLmlkKXtcbiAgICAgICAgICAgICAgICAkc2NvcGUud2luT3JMb3NlPVwiQ29uZ3JhdHVsYXRpb24hIFlvdSBhcmUgYSB3b3JkIHdpemFyZCEgWW91IHdvbiEhIVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBwbGF5ZXIgaW4gJHNjb3BlLm90aGVyUGxheWVycyl7XG4gICAgICAgICAgICAgICAgICAgIGlmICgrJHNjb3BlLm90aGVyUGxheWVyc1twbGF5ZXJdLmlkPT09K3dpbm5lcnNBcnJheVswXSl7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgd2lubmVyPSRzY29wZS5vdGhlclBsYXllcnNbcGxheWVyXS51c2VybmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS53aW5Pckxvc2U9XCJUb3VnaCBsdWNrLiBcIit3aW5uZXIrXCIgaGFzIGJlYXRlbiB5b3UuIEJldHRlciBMdWNrIG5leHQgdGltZS4gOihcIlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICBsZXQgd2lubmVycz1bXTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgaW4gd2lubmVyc0FycmF5KXtcbiAgICAgICAgICAgICAgICBpZiAoK3dpbm5lcnNBcnJheVtpXT09PSskc2NvcGUudXNlci5pZCl7d2lubmVycy5wdXNoKCRzY29wZS51c2VyLnVzZXJuYW1lKTt9XG4gICAgICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgcGxheWVyIGluICRzY29wZS5vdGhlclBsYXllcnMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS5vdGhlclBsYXllcnNbcGxheWVyXS5pZD09d2lubmVyc0FycmF5W2ldKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5uZXJzLnB1c2goJHNjb3BlLm90aGVyUGxheWVyc1twbGF5ZXJdLnVzZXJuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS53aW5Pckxvc2U9XCJUaGUgZ2FtZSB3YXMgYSB0aWUgYmV0d2VlbiBcIjtcbiAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTx3aW5uZXJzLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgICAgICBpZiAoaT09PXdpbm5lcnMubGVuZ3RoLTEpeyRzY29wZS53aW5Pckxvc2UrPVwiYW5kIFwiK3dpbm5lcnNbaV0rXCIuXCI7fVxuICAgICAgICAgICAgICAgIGVsc2V7JHNjb3BlLndpbk9yTG9zZSs9d2lubmVyc1tpXStcIiwgXCI7fVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG4gICAgJHJvb3RTY29wZS5oaWRlTmF2YmFyID0gdHJ1ZTtcblxuICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7IFNvY2tldC5kaXNjb25uZWN0KCk7IH0pO1xuICAgIGNvbnNvbGUubG9nKCd1cGRhdGUgMS4xJylcbiAgICBTb2NrZXQub24oJ2Nvbm5lY3QnLCBmdW5jdGlvbigpIHtcblxuICAgICAgICBTb2NrZXQuZW1pdCgnam9pblJvb20nLCAkc2NvcGUudXNlciwgJHNjb3BlLnJvb21OYW1lLCAkc2NvcGUuZ2FtZUlkKTtcbiAgICAgICAgY29uc29sZS5sb2coJ2VtaXR0aW5nIFwiam9pbiByb29tXCIgZXZlbnQgdG8gc2VydmVyJywgJHNjb3BlLnJvb21OYW1lKTtcblxuICAgICAgICBTb2NrZXQub24oJ3Jvb21Kb2luU3VjY2VzcycsIGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCduZXcgdXNlciBqb2luaW5nJywgdXNlci5pZCk7XG4gICAgICAgICAgICB1c2VyLnNjb3JlID0gMDtcbiAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMucHVzaCh1c2VyKTtcbiAgICAgICAgICAgICRzY29wZS4kZGlnZXN0KCk7XG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCdzdGFydEJvYXJkJywgZnVuY3Rpb24oYm9hcmQpIHtcbiAgICAgICAgICAgICRzY29wZS5mcmVlemUgPSBmYWxzZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdib2FyZCEgJywgYm9hcmQpO1xuICAgICAgICAgICAgJHNjb3BlLmJvYXJkID0gYm9hcmQ7XG4gICAgICAgICAgICAvLyBzZXRJbnRlcnZhbChmdW5jdGlvbigpe1xuICAgICAgICAgICAgJHNjb3BlLmhpZGVCb2FyZCA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgICAgIC8vIH0sIDMwMDApO1xuICAgICAgICB9KTtcblxuICAgICAgICBTb2NrZXQub24oJ3dvcmRWYWxpZGF0ZWQnLCBmdW5jdGlvbih1cGRhdGVPYmopIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd3b3JkIGlzIHZhbGlkYXRlZCcpO1xuICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZSh1cGRhdGVPYmopO1xuICAgICAgICAgICAgJHNjb3BlLmxhc3RXb3JkUGxheWVkID0gdXBkYXRlT2JqLndvcmQ7XG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICBTb2NrZXQub24oJ2JvYXJkU2h1ZmZsZWQnLCBmdW5jdGlvbihib2FyZCwgdXNlcklkLCBzdGF0ZU51bWJlcikge1xuICAgICAgICAgICAgJHNjb3BlLmJvYXJkID0gYm9hcmQ7XG4gICAgICAgICAgICAkc2NvcGUudXBkYXRlU2NvcmUoLTUsIHVzZXJJZCk7XG4gICAgICAgICAgICAkc2NvcGUuY2xlYXIoKTtcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLnN0YXRlTnVtYmVyID0gc3RhdGVOdW1iZXI7XG4gICAgICAgICAgICAkc2NvcGUubWVzc2FnZSA9IHVzZXJJZCArIFwiIHNodWZmbGVkIHRoZSBib2FyZCFcIjtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCRzY29wZS5tZXNzYWdlKTtcbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIFNvY2tldC5vbigncGxheWVyRGlzY29ubmVjdGVkJywgZnVuY3Rpb24odXNlcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3BsYXllckRpc2Nvbm5lY3RlZCcsIHVzZXIuaWQpO1xuICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVycyA9ICRzY29wZS5vdGhlclBsYXllcnMubWFwKG90aGVyUGxheWVycyA9PiBvdGhlclBsYXllcnMuaWQgIT09IHVzZXIuaWQpO1xuXG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICBTb2NrZXQub24oJ2dhbWVPdmVyJywgZnVuY3Rpb24od2lubmVyc0FycmF5KSB7XG4gICAgICAgICAgICAkc2NvcGUuY2xlYXIoKTtcbiAgICAgICAgICAgICRzY29wZS5mcmVlemU9dHJ1ZTtcbiAgICAgICAgICAgICRzY29wZS5kZXRlcm1pbmVXaW5uZXIod2lubmVyc0FycmF5KTtcbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZ2FtZSBpcyBvdmVyLCB3aW5uZXJzOiAnLCB3aW5uZXJzQXJyYXkpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkgKFwiQm9hcmRGYWN0b3J5XCIsIGZ1bmN0aW9uKCRodHRwLCBTb2NrZXQpe1xuXHRyZXR1cm57XG5cdFx0Z2V0U3RhcnRCb2FyZDogZnVuY3Rpb24oZ2FtZUxlbmd0aCwgZ2FtZUlkLCB1c2VySWRzKXtcblx0XHRcdGNvbnNvbGUubG9nKCdmYWN0b3J5LiBnbDogJywgZ2FtZUxlbmd0aCk7XG5cdFx0XHRTb2NrZXQuZW1pdCgnZ2V0U3RhcnRCb2FyZCcsIGdhbWVMZW5ndGgsIGdhbWVJZCwgdXNlcklkcyk7XG5cdFx0fSxcblxuXHRcdHN1Ym1pdDogZnVuY3Rpb24ob2JqKXtcblx0XHRcdFNvY2tldC5lbWl0KCdzdWJtaXRXb3JkJywgb2JqKTtcblx0XHR9LFxuXG5cdFx0c2h1ZmZsZTogZnVuY3Rpb24odXNlcil7XG5cdFx0XHRjb25zb2xlLmxvZygnZ3JpZGZhY3RvcnkgdScsdXNlci5pZCk7XG5cdFx0XHRTb2NrZXQuZW1pdCgnc2h1ZmZsZUJvYXJkJyx1c2VyLmlkKTtcblx0XHR9LFxuXG5cdFx0Ly8gZmluZEFsbE90aGVyVXNlcnM6IGZ1bmN0aW9uKGdhbWUpIHtcblx0XHQvLyBcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvZ2FtZXMvJysgZ2FtZS5pZClcblx0XHQvLyBcdC50aGVuKHJlcyA9PiByZXMuZGF0YSlcblx0XHQvLyB9LFxuXG5cdFx0Z2V0Q3VycmVudFJvb206IGZ1bmN0aW9uKHJvb21uYW1lKSB7XG5cdFx0XHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2dhbWVzL3Jvb21zLycrcm9vbW5hbWUpXG5cdFx0XHQudGhlbihyZXMgPT4gcmVzLmRhdGEpXG5cdFx0fSxcblxuXHRcdHF1aXRGcm9tUm9vbTogZnVuY3Rpb24oZ2FtZUlkLCB1c2VySWQpIHtcblx0XHRcdC8vIFNvY2tldC5lbWl0KCdkaXNjb25uZWN0Jywgcm9vbU5hbWUsIHVzZXJJZCk7XG5cdFx0XHRyZXR1cm4gJGh0dHAuZGVsZXRlKCcvYXBpL2dhbWVzLycrZ2FtZUlkKycvJyt1c2VySWQpXG5cdFx0fVxuXHR9XG59KTtcbiIsImFwcC5jb250cm9sbGVyKCdIb21lQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlLCAkbG9jYXRpb24pe1xuICAkc2NvcGUuZW50ZXJMb2JieSA9IGZ1bmN0aW9uKCl7XG4gICAgJHN0YXRlLmdvKCdsb2JieScsIHtyZWxvYWQ6IHRydWV9KTtcbiAgfVxufSk7XG5cbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUnLCB7XG4gICAgICAgIHVybDogJy8nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJ1xuICAgIH0pO1xufSk7XG5cbiIsImFwcC5jb250cm9sbGVyKCdMZWFkZXJCb2FyZEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIExlYWRlckJvYXJkRmFjdG9yeSwgJHN0YXRlLCBBdXRoU2VydmljZSkge1xuICAgIGNvbnNvbGUubG9nKCcgMScpXG4gICAgTGVhZGVyQm9hcmRGYWN0b3J5LkFsbFBsYXllcnMoKVxuICAgIC50aGVuKHBsYXllcnMgPT4ge1xuICAgICAgICBwbGF5ZXJzLmZvckVhY2gocGxheWVyID0+IHtcbiAgICAgICAgICAgIGlmIChwbGF5ZXIuZ2FtZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciBzY29yZXMgPSBwbGF5ZXIuZ2FtZXMubWFwKGdhbWUgPT4gZ2FtZS51c2VyR2FtZS5zY29yZSlcbiAgICAgICAgICAgICAgICBwbGF5ZXIuaGlnaGVzdFNjb3JlID0gTWF0aC5tYXgoLi4uc2NvcmVzKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwbGF5ZXIuaGlnaGVzdFNjb3JlID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBsYXllci5nYW1lc193b24gPSBwbGF5ZXIud2lubmVyLmxlbmd0aDtcbiAgICAgICAgICAgIHBsYXllci5nYW1lc19wbGF5ZWQgPSBwbGF5ZXIuZ2FtZXMubGVuZ3RoO1xuICAgICAgICAgICAgaWYocGxheWVyLmdhbWVzLmxlbmd0aD09PTApe1xuICAgICAgICAgICAgXHRwbGF5ZXIud2luX3BlcmNlbnRhZ2UgPSAwICsgJyUnXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgXHRwbGF5ZXIud2luX3BlcmNlbnRhZ2UgPSAoKHBsYXllci53aW5uZXIubGVuZ3RoL3BsYXllci5nYW1lcy5sZW5ndGgpKjEwMCkudG9GaXhlZCgwKSArICclJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KVxuICAgICAgICAkc2NvcGUucGxheWVycyA9IHBsYXllcnM7XG4gICAgfSlcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ0xlYWRlckJvYXJkRmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuXHR2YXIgTGVhZGVyQm9hcmRGYWN0b3J5ID0ge307XG5cblx0TGVhZGVyQm9hcmRGYWN0b3J5LkFsbFBsYXllcnMgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3VzZXJzJylcblx0XHQudGhlbihyZXM9PnJlcy5kYXRhKVxuXHR9XG5cblx0cmV0dXJuIExlYWRlckJvYXJkRmFjdG9yeTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsZWFkZXJCb2FyZCcsIHtcbiAgICAgICAgdXJsOiAnL2xlYWRlckJvYXJkJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sZWFkZXJCb2FyZC9sZWFkZXJCb2FyZC50ZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICBcdGFsbFBsYXllcnM6IGZ1bmN0aW9uKExlYWRlckJvYXJkRmFjdG9yeSkge1xuICAgICAgICBcdFx0cmV0dXJuIExlYWRlckJvYXJkRmFjdG9yeS5BbGxQbGF5ZXJzO1xuICAgICAgICBcdH0sXG4gICAgICAgICAgICBcbiAgICAgICAgfSxcbiAgICAgICAgY29udHJvbGxlcjogJ0xlYWRlckJvYXJkQ3RybCdcbiAgICB9KTtcblxufSk7IiwiYXBwLmNvbnRyb2xsZXIoJ0xvYmJ5Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgTG9iYnlGYWN0b3J5LCByb29tcywgJHN0YXRlLCBBdXRoU2VydmljZSkge1xuXG4gICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24odXNlcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3VzZXIgZnJvbSBBdXRoU2VydmljZScsIHVzZXIpO1xuICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICB9KTtcblxuICAgICRzY29wZS5yb29tcyA9IHJvb21zO1xuICAgICRzY29wZS5yb29tTmFtZUZvcm0gPSBmYWxzZTtcbiAgICAvLyAkc2NvcGUudXNlciA9IHtcbiAgICAvLyAgaWQ6IDNcbiAgICAvLyB9XG5cbiAgICAkc2NvcGUuam9pbkdhbWUgPSBmdW5jdGlvbihyb29tKSB7XG4gICAgICAgICRzdGF0ZS5nbygnR2FtZScsIHsgcm9vbW5hbWU6IHJvb20ucm9vbW5hbWUgfSlcbiAgICB9XG5cbiAgICAkc2NvcGUubmV3Um9vbSA9IGZ1bmN0aW9uKHJvb21JbmZvKSB7XG4gICAgICAgIExvYmJ5RmFjdG9yeS5uZXdHYW1lKHJvb21JbmZvKTtcbiAgICAgICAgJHNjb3BlLnJvb21OYW1lRm9ybSA9IGZhbHNlO1xuICAgIH1cbiAgICAkc2NvcGUuc2hvd0Zvcm0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLnJvb21OYW1lRm9ybSA9IHRydWU7XG4gICAgfVxuXG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ2VudGVyTG9iYnknLCBmdW5jdGlvbigpe1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgdGVtcGxhdGVVcmw6ICdqcy9sb2JieS9sb2JieS1idXR0b24uaHRtbCcsXG4gICAgY29udHJvbGxlcjogJ0hvbWVDdHJsJ1xuICB9XG59KVxuIiwiYXBwLmZhY3RvcnkoJ0xvYmJ5RmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuXHR2YXIgTG9iYnlGYWN0b3J5ID0ge307XG5cdHZhciB0ZW1wUm9vbXMgPSBbXTsgLy93b3JrIHdpdGggc29ja2V0P1xuXG5cdExvYmJ5RmFjdG9yeS5nZXRBbGxSb29tcyA9IGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS9nYW1lcy9yb29tcycpXG5cdFx0LnRoZW4ocmVzID0+IHJlcy5kYXRhKVxuXHRcdC50aGVuKHJvb21zID0+IHtcblx0XHRcdGFuZ3VsYXIuY29weShyb29tcywgdGVtcFJvb21zKTtcblx0XHRcdHJldHVybiB0ZW1wUm9vbXM7XG5cdFx0fSlcblx0fTtcblxuXHRMb2JieUZhY3Rvcnkuam9pbkdhbWUgPSBmdW5jdGlvbihyb29tSWQsIHVzZXJJZCkge1xuICAgIGNvbnNvbGUubG9nKCdsb2JieSBmYWN0b3J5IGpvaW4gZ2FtZScpO1xuXHRcdHJldHVybiAkaHR0cC5wdXQoJy9hcGkvZ2FtZXMvJysgcm9vbUlkICsnL3BsYXllcicsIHtpZDogdXNlcklkfSlcblx0XHQudGhlbihyZXM9PnJlcy5kYXRhKVxuXHR9O1xuXG5cdExvYmJ5RmFjdG9yeS5uZXdHYW1lID0gZnVuY3Rpb24ocm9vbUluZm8pIHtcblx0XHRyZXR1cm4gJGh0dHAucHV0KCcvYXBpL2dhbWVzJywgcm9vbUluZm8pXG5cdFx0LnRoZW4ocmVzID0+IHJlcy5kYXRhKVxuXHRcdC50aGVuKHJvb20gPT4ge3RlbXBSb29tcy5wdXNoKHJvb20pfSlcblx0fVxuXG5cdExvYmJ5RmFjdG9yeS5BbGxQbGF5ZXJzID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS91c2VycycpXG5cdFx0LnRoZW4ocmVzPT5yZXMuZGF0YSlcblx0fVxuXG5cdHJldHVybiBMb2JieUZhY3Rvcnk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9iYnknLCB7XG4gICAgICAgIHVybDogJy9sb2JieScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9iYnkvbG9iYnkudGVtcGxhdGUuaHRtbCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgXHRyb29tczogZnVuY3Rpb24oTG9iYnlGYWN0b3J5KSB7XG4gICAgICAgIFx0XHRyZXR1cm4gTG9iYnlGYWN0b3J5LmdldEFsbFJvb21zKCk7XG4gICAgICAgIFx0fVxuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiAnTG9iYnlDdHJsJ1xuICAgIH0pO1xuXG59KTsiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xuICAgICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0xvZ2luQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgICRzY29wZS5sb2dpbiA9IHt9O1xuICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAkc2NvcGUuc2VuZExvZ2luID0gZnVuY3Rpb24gKGxvZ2luSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UubG9naW4obG9naW5JbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdtZW1iZXJzT25seScsIHtcbiAgICAgICAgdXJsOiAnL21lbWJlcnMtYXJlYScsXG4gICAgICAgIHRlbXBsYXRlOiAnPGltZyBuZy1yZXBlYXQ9XCJpdGVtIGluIHN0YXNoXCIgd2lkdGg9XCIzMDBcIiBuZy1zcmM9XCJ7eyBpdGVtIH19XCIgLz4nLFxuICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlLCBTZWNyZXRTdGFzaCkge1xuICAgICAgICAgICAgU2VjcmV0U3Rhc2guZ2V0U3Rhc2goKS50aGVuKGZ1bmN0aW9uIChzdGFzaCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5zdGFzaCA9IHN0YXNoO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgZGF0YS5hdXRoZW50aWNhdGUgaXMgcmVhZCBieSBhbiBldmVudCBsaXN0ZW5lclxuICAgICAgICAvLyB0aGF0IGNvbnRyb2xzIGFjY2VzcyB0byB0aGlzIHN0YXRlLiBSZWZlciB0byBhcHAuanMuXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxuICAgICAgICB9XG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuZmFjdG9yeSgnU2VjcmV0U3Rhc2gnLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBnZXRTdGFzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9tZW1iZXJzL3NlY3JldC1zdGFzaCcpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGdldFN0YXNoOiBnZXRTdGFzaFxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgncmFua0RpcmVjdGl2ZScsICgpPT4ge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnRScsXG5cdFx0c2NvcGU6IHtcblx0XHRcdHJhbmtOYW1lOiAnQCcsXG5cdFx0XHRwbGF5ZXJzOiAnPScsXG5cdFx0XHRyYW5rQnk6ICdAJyxcblx0XHRcdG9yZGVyOiAnQCdcblx0XHR9LFxuXHRcdHRlbXBsYXRlVXJsOiAnL2pzL3JhbmsvcmFuay50ZW1wbGF0ZS5odG1sJ1xuXHR9XG59KTsiLCJhcHAuZmFjdG9yeSgnU2lnbnVwRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwLCAkc3RhdGUsIEF1dGhTZXJ2aWNlKSB7XG5cdGNvbnN0IFNpZ251cEZhY3RvcnkgPSB7fTtcblxuXHRTaWdudXBGYWN0b3J5LmNyZWF0ZVVzZXIgPSBmdW5jdGlvbihzaWdudXBJbmZvKSB7XG5cdFx0Y29uc29sZS5sb2coc2lnbnVwSW5mbylcblx0XHRyZXR1cm4gJGh0dHAucG9zdCgnL3NpZ251cCcsIHNpZ251cEluZm8pXG5cdFx0LnRoZW4ocmVzID0+IHtcblx0XHRcdGlmIChyZXMuc3RhdHVzID09PSAyMDEpIHtcblx0XHRcdFx0QXV0aFNlcnZpY2UubG9naW4oe2VtYWlsOiBzaWdudXBJbmZvLmVtYWlsLCBwYXNzd29yZDogc2lnbnVwSW5mby5wYXNzd29yZH0pXG5cdFx0XHRcdC50aGVuKHVzZXIgPT4ge1xuXHRcdFx0XHRcdCRzdGF0ZS5nbygnaG9tZScpXG5cdFx0XHRcdH0pXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aHJvdyBFcnJvcignQW4gYWNjb3VudCB3aXRoIHRoYXQgZW1haWwgYWxyZWFkeSBleGlzdHMnKTtcblx0XHRcdH1cblx0XHR9KVxuXHR9XG5cblx0cmV0dXJuIFNpZ251cEZhY3Rvcnk7XG59KSIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnc2lnbnVwJywge1xuICAgICAgICB1cmw6ICcvc2lnbnVwJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9zaWdudXAvc2lnbnVwLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnU2lnbnVwQ3RybCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdTaWdudXBDdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSwgU2lnbnVwRmFjdG9yeSkge1xuXG4gICAgJHNjb3BlLnNpZ251cCA9IHt9O1xuICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAkc2NvcGUuc2VuZFNpZ251cCA9IGZ1bmN0aW9uKHNpZ251cEluZm8pe1xuICAgICAgICBTaWdudXBGYWN0b3J5LmNyZWF0ZVVzZXIoc2lnbnVwSW5mbylcbiAgICAgICAgLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdBbiBhY2NvdW50IHdpdGggdGhhdCBlbWFpbCBhbHJlYWR5IGV4aXN0cyc7XG4gICAgICAgIH0pXG4gICAgfVxuICAgIFxuXG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcil7XG5cdCRzdGF0ZVByb3ZpZGVyLnN0YXRlKFwiVXNlclByb2ZpbGVcIix7XG5cdFx0dXJsOiBcIi91c2Vycy86dXNlcklkXCIsXG5cdFx0dGVtcGxhdGVVcmw6XCJqcy91c2VyX3Byb2ZpbGUvcHJvZmlsZS50ZW1wbGF0ZS5odG1sXCIsXG5cdFx0Y29udHJvbGxlcjogXCJVc2VyQ3RybFwiXG5cdH0pXG5cdCRzdGF0ZVByb3ZpZGVyLnN0YXRlKFwiR2FtZVJlY29yZFwiLCB7XG5cdFx0dXJsOlwiL3VzZXJzLzp1c2VySWQvZ2FtZXNcIixcblx0XHR0ZW1wbGF0ZVVybDogXCJqcy91c2VyX3Byb2ZpbGUvZ2FtZXMuaHRtbFwiLFxuXHRcdGNvbnRyb2xsZXI6IFwiR2FtZVJlY29yZEN0cmxcIlxuXHR9KVxufSlcblxuYXBwLmNvbnRyb2xsZXIoXCJVc2VyQ3RybFwiLCBmdW5jdGlvbigkc2NvcGUsIFVzZXJGYWN0b3J5LCAkc3RhdGVQYXJhbXMpe1xuXHRVc2VyRmFjdG9yeS5mZXRjaEluZm9ybWF0aW9uKCRzdGF0ZVBhcmFtcy51c2VySWQpXG5cdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHRcdCRzY29wZS51c2VyPXVzZXI7XG5cdFx0cmV0dXJuIHVzZXJcblx0fSlcblx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG5cdFx0JHNjb3BlLnVwZGF0ZWQ9JHNjb3BlLnVzZXIudXBkYXRlZEF0LmdldERheSgpO1xuXHR9KVxufSlcblxuYXBwLmNvbnRyb2xsZXIoXCJHYW1lUmVjb3JkQ3RybFwiLGZ1bmN0aW9uKCRzY29wZSwgVXNlckZhY3RvcnksICRzdGF0ZVBhcmFtcyl7XG5cdFVzZXJGYWN0b3J5LmZldGNoSW5mb3JtYXRpb24oJHN0YXRlUGFyYW1zLnVzZXJJZClcblx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG5cdFx0JHNjb3BlLnVzZXI9dXNlcjtcblx0fSlcblx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG5cdFVzZXJGYWN0b3J5LmZldGNoR2FtZXMoJHN0YXRlUGFyYW1zLnVzZXJJZClcblx0fSlcblx0LnRoZW4oZnVuY3Rpb24oZ2FtZXMpe1xuXHRcdCRzY29wZS5nYW1lcz1nYW1lcztcblx0fSlcbn0pIiwiYXBwLmZhY3RvcnkoXCJVc2VyRmFjdG9yeVwiLCBmdW5jdGlvbigkaHR0cCl7XG5cdHJldHVybiB7XG5cdFx0ZmV0Y2hJbmZvcm1hdGlvbjogZnVuY3Rpb24oaWQpe1xuXHRcdFx0cmV0dXJuICRodHRwLmdldChcIi9hcGkvdXNlcnMvXCIraWQpXG5cdFx0XHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0XHRcdFx0cmV0dXJuIHVzZXIuZGF0YTtcblx0XHRcdH0pXG5cdFx0fSxcblx0XHRmZXRjaEdhbWVzOiBmdW5jdGlvbihpZCl7XG5cdFx0XHRyZXR1cm4gJGh0dHAuZ2V0KFwiL2FwaS91c2Vycy9cIitpZCtcIi9nYW1lc1wiKVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24oZ2FtZXMpe1xuXHRcdFx0XHRyZXR1cm4gZ2FtZXMuZGF0YTtcblx0XHRcdH0pXG5cdFx0fVxuXHR9XG59KSIsImFwcC5kaXJlY3RpdmUoJ2xvZ28nLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9sb2dvL2xvZ28uaHRtbCdcbiAgICB9O1xufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCduYXZiYXInLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsIEFVVEhfRVZFTlRTLCAkc3RhdGUpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7fSxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcblxuICAgICAgICAgICAgc2NvcGUuaXRlbXMgPSBbXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0hvbWUnLCBzdGF0ZTogJ2hvbWUnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ1lvdXIgUHJvZmlsZScsIHN0YXRlOiAnVXNlclByb2ZpbGUnLCBhdXRoOiB0cnVlIH1cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuXG4gICAgICAgICAgICBzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBzZXRVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgcmVtb3ZlVXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNldFVzZXIoKTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIHJlbW92ZVVzZXIpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgncmFuZG9HcmVldGluZycsIGZ1bmN0aW9uIChSYW5kb21HcmVldGluZ3MpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICAgICAgc2NvcGUuZ3JlZXRpbmcgPSBSYW5kb21HcmVldGluZ3MuZ2V0UmFuZG9tR3JlZXRpbmcoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZShcInRpbWVyXCIsIGZ1bmN0aW9uKCRxLCAkaW50ZXJ2YWwsIFNvY2tldCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICB0aW1lOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgdGVtcGxhdGVVcmw6IFwianMvY29tbW9uL2RpcmVjdGl2ZXMvdGltZXIvdGltZXIuaHRtbFwiLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICAgICAgdmFyIHRpbWUgPSBzY29wZS50aW1lO1xuICAgICAgICAgICAgdmFyIHN0YXJ0PXNjb3BlLnRpbWU7XG4gICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IGNvbnZlcnQodGltZSk7XG4gICAgICAgICAgICBzY29wZS5jb3VudGRvd24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGltZXIgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWUgLT0gMTtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBjb252ZXJ0KHRpbWUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGltZSA8IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gXCJUaW1lIHVwIVwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbCh0aW1lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lPXN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBzY29wZS5tZXNzYWdlcyA9IFtcIkdldCBSZWFkeSFcIiwgXCJHZXQgU2V0IVwiLCBcIkdvIVwiLCAnLyddO1xuICAgICAgICAgICAgLy8gICAgIHZhciBpbmRleCA9IDA7XG4gICAgICAgICAgICAvLyAgICAgdmFyIHByZXBhcmUgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gc2NvcGUubWVzc2FnZXNbaW5kZXhdO1xuICAgICAgICAgICAgLy8gICAgICAgICBpbmRleCsrO1xuICAgICAgICAgICAgLy8gICAgICAgICBjb25zb2xlLmxvZyhzY29wZS50aW1lX3JlbWFpbmluZyk7XG4gICAgICAgICAgICAvLyAgICAgICAgIGlmIChzY29wZS50aW1lX3JlbWFpbmluZyA9PT0gXCIvXCIpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gY29udmVydCh0aW1lKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwocHJlcGFyZSk7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICB2YXIgdGltZXIgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgdGltZSAtPSAxO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gY29udmVydCh0aW1lKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICBpZiAodGltZSA8IDEpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBcIlRpbWUgdXAhXCI7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwodGltZXIpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgLy8gICAgICAgICB9XG4gICAgICAgICAgICAvLyAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICAvLyB9O1xuXG4gICAgICAgICAgICBTb2NrZXQub24oJ3N0YXJ0Qm9hcmQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5jb3VudGRvd24odGltZSk7XG4gICAgICAgICAgICB9KTtcblxuXG4gICAgICAgICAgICBmdW5jdGlvbiBjb252ZXJ0KHRpbWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2Vjb25kcyA9ICh0aW1lICUgNjApLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgdmFyIGNvbnZlcnNpb24gPSAoTWF0aC5mbG9vcih0aW1lIC8gNjApKSArICc6JztcbiAgICAgICAgICAgICAgICBpZiAoc2Vjb25kcy5sZW5ndGggPCAyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnZlcnNpb24gKz0gJzAnICsgc2Vjb25kcztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb252ZXJzaW9uICs9IHNlY29uZHM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBjb252ZXJzaW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSlcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
