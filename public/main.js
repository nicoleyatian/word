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

    $scope.hideBoard = true;
    $scope.hideStart = true;
    $scope.hideCrabdance = true;
    $scope.crabdances = 0;
    $rootScope.hideNavbar = true;
    $scope.freeze = false;

    $scope.otherPlayers = [];
    $scope.messages = null;

    $scope.gameLength = 150;

    $scope.mouseIsDown = false;
    $scope.draggingAllowed = false;

    $scope.style = null;
    $scope.message = '';
    $scope.winOrLose = null;
    $scope.timeout = null;

    $scope.exports = {
        wordObj: {},
        word: "",
        playerId: null,
        stateNumber: 0,
        pointsEarned: null
    };

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
        if (updateObj.word.length > 3 && updateObj.playerId != $scope.user.id) {
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
        $scope.timeout = setTimeout(function () {
            $scope.message = '';
        }, 3000);
        console.log('its updating!');
        clearIfConflicting(updateObj, $scope.exports.wordObj);
        $scope.exports.stateNumber = updateObj.stateNumber;
        $scope.$evalAsync();
    };

    function crabdance() {
        $scope.hideBoard = true;
        $scope.hideCrabdance = false;
        console.log('dance crab!', $scope.crabdances);
        setTimeout(function () {
            $scope.crabdances--;
            if ($scope.crabdances) {
                crabdance();
            } else {
                $scope.hideCrabdance = true;
                $scope.hideBoard = false;
            }
        }, 3000);
    }

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
            $scope.otherPlayers.forEach(function (player) {
                player.score = 0;
            });
            $scope.score = 0;
            $scope.hideStart = true;
            $scope.hideBoard = false;
            $scope.$evalAsync();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiZ2FtZS1zdGF0ZS9ncmlkLmNvbnRyb2xsZXIuanMiLCJnYW1lLXN0YXRlL2dyaWQuZmFjdG9yeS5qcyIsImhvbWUvaG9tZS5jb250cm9sbGVyLmpzIiwiaG9tZS9ob21lLmpzIiwibGVhZGVyQm9hcmQvbGVhZGVyQm9hcmQuY29udHJvbGxlci5qcyIsImxlYWRlckJvYXJkL2xlYWRlckJvYXJkLmZhY3RvcnkuanMiLCJsZWFkZXJCb2FyZC9sZWFkZXJCb2FyZC5zdGF0ZS5qcyIsImxvYmJ5L2xvYmJ5LmNvbnRyb2xsZXIuanMiLCJsb2JieS9sb2JieS5kaXJlY3RpdmUuanMiLCJsb2JieS9sb2JieS5mYWN0b3J5LmpzIiwibG9iYnkvbG9iYnkuc3RhdGUuanMiLCJsb2dpbi9sb2dpbi5qcyIsIm1lbWJlcnMtb25seS9tZW1iZXJzLW9ubHkuanMiLCJyYW5rL3JhbmsuZGlyZWN0aXZlLmpzIiwic2lnbnVwL3NpZ251cC5mYWN0b3J5LmpzIiwic2lnbnVwL3NpZ251cC5qcyIsInVzZXJfcHJvZmlsZS9wcm9maWxlLmNvbnRyb2xsZXIuanMiLCJ1c2VyX3Byb2ZpbGUvcHJvZmlsZS5mYWN0b3J5LmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3RpbWVyL3RpbWVyLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsImFwcCIsImFuZ3VsYXIiLCJtb2R1bGUiLCJjb25maWciLCIkdXJsUm91dGVyUHJvdmlkZXIiLCIkbG9jYXRpb25Qcm92aWRlciIsImh0bWw1TW9kZSIsIm90aGVyd2lzZSIsIndoZW4iLCJsb2NhdGlvbiIsInJlbG9hZCIsInJ1biIsIiRyb290U2NvcGUiLCIkb24iLCJldmVudCIsInRvU3RhdGUiLCJ0b1BhcmFtcyIsImZyb21TdGF0ZSIsImZyb21QYXJhbXMiLCJ0aHJvd25FcnJvciIsImNvbnNvbGUiLCJpbmZvIiwibmFtZSIsImVycm9yIiwiQXV0aFNlcnZpY2UiLCIkc3RhdGUiLCJkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoIiwic3RhdGUiLCJkYXRhIiwiYXV0aGVudGljYXRlIiwiaXNBdXRoZW50aWNhdGVkIiwicHJldmVudERlZmF1bHQiLCJnZXRMb2dnZWRJblVzZXIiLCJ0aGVuIiwidXNlciIsImdvIiwiRXJyb3IiLCJmYWN0b3J5IiwiaW8iLCJvcmlnaW4iLCJjb25zdGFudCIsImxvZ2luU3VjY2VzcyIsImxvZ2luRmFpbGVkIiwibG9nb3V0U3VjY2VzcyIsInNlc3Npb25UaW1lb3V0Iiwibm90QXV0aGVudGljYXRlZCIsIm5vdEF1dGhvcml6ZWQiLCIkcSIsIkFVVEhfRVZFTlRTIiwic3RhdHVzRGljdCIsInJlc3BvbnNlRXJyb3IiLCJyZXNwb25zZSIsIiRicm9hZGNhc3QiLCJzdGF0dXMiLCJyZWplY3QiLCIkaHR0cFByb3ZpZGVyIiwiaW50ZXJjZXB0b3JzIiwicHVzaCIsIiRpbmplY3RvciIsImdldCIsInNlcnZpY2UiLCIkaHR0cCIsIlNlc3Npb24iLCJvblN1Y2Nlc3NmdWxMb2dpbiIsImNyZWF0ZSIsImZyb21TZXJ2ZXIiLCJjYXRjaCIsImxvZ2luIiwiY3JlZGVudGlhbHMiLCJwb3N0IiwibWVzc2FnZSIsImxvZ291dCIsImRlc3Ryb3kiLCJzZWxmIiwiJHN0YXRlUHJvdmlkZXIiLCJ1cmwiLCJ0ZW1wbGF0ZVVybCIsImNvbnRyb2xsZXIiLCIkc2NvcGUiLCJCb2FyZEZhY3RvcnkiLCJTb2NrZXQiLCIkc3RhdGVQYXJhbXMiLCJMb2JieUZhY3RvcnkiLCJyb29tTmFtZSIsInJvb21uYW1lIiwiaGlkZUJvYXJkIiwiaGlkZVN0YXJ0IiwiaGlkZUNyYWJkYW5jZSIsImNyYWJkYW5jZXMiLCJoaWRlTmF2YmFyIiwiZnJlZXplIiwib3RoZXJQbGF5ZXJzIiwibWVzc2FnZXMiLCJnYW1lTGVuZ3RoIiwibW91c2VJc0Rvd24iLCJkcmFnZ2luZ0FsbG93ZWQiLCJzdHlsZSIsIndpbk9yTG9zZSIsInRpbWVvdXQiLCJleHBvcnRzIiwid29yZE9iaiIsIndvcmQiLCJwbGF5ZXJJZCIsInN0YXRlTnVtYmVyIiwicG9pbnRzRWFybmVkIiwiY2hlY2tTZWxlY3RlZCIsImlkIiwidG9nZ2xlRHJhZyIsIm1vdXNlRG93biIsIm1vdXNlVXAiLCJsZW5ndGgiLCJzdWJtaXQiLCJkcmFnIiwic3BhY2UiLCJjbGljayIsInN0YXJ0R2FtZSIsInVzZXJJZHMiLCJtYXAiLCJsb2ciLCJnZXRTdGFydEJvYXJkIiwiZ2FtZUlkIiwicXVpdCIsImJvYXJkIiwic2l6ZSIsInNjb3JlIiwibHRyc1NlbGVjdGVkIiwiT2JqZWN0Iiwia2V5cyIsInByZXZpb3VzTHRyIiwibGFzdEx0ciIsInZhbGlkU2VsZWN0Iiwic3Vic3RyaW5nIiwibHRySWQiLCJvdGhlckx0cnNJZHMiLCJpbmNsdWRlcyIsImNvb3JkcyIsInNwbGl0Iiwicm93IiwiY29sIiwibGFzdEx0cklkIiwicG9wIiwiY29vcmRzTGFzdCIsInJvd0xhc3QiLCJjb2xMYXN0Iiwicm93T2Zmc2V0IiwiTWF0aCIsImFicyIsImNvbE9mZnNldCIsImNsZWFySWZDb25mbGljdGluZyIsInVwZGF0ZVdvcmRPYmoiLCJleHBvcnRXb3JkT2JqIiwidGlsZXNNb3ZlZCIsIm15V29yZFRpbGVzIiwic29tZSIsImNvb3JkIiwiY2xlYXIiLCJvYmoiLCJzaHVmZmxlIiwidXBkYXRlQm9hcmQiLCJrZXkiLCJ1cGRhdGVTY29yZSIsInBvaW50cyIsInBsYXllciIsInVwZGF0ZSIsInVwZGF0ZU9iaiIsImNyYWJkYW5jZSIsInVzZXJuYW1lIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsIiRldmFsQXN5bmMiLCJyZXBsYXkiLCJuZXdHYW1lIiwiZ2FtZSIsImFsbElkcyIsImFsbCIsImpvaW5HYW1lIiwiZSIsImRldGVybWluZVdpbm5lciIsIndpbm5lcnNBcnJheSIsIndpbm5lciIsIndpbm5lcnMiLCJpIiwiZGlzY29ubmVjdCIsIm9uIiwiZ2V0Q3VycmVudFJvb20iLCJyb29tIiwidXNlcnMiLCJmaWx0ZXIiLCJmb3JFYWNoIiwiZW1pdCIsImxhc3RXb3JkUGxheWVkIiwidXNlcklkIiwicmVzIiwicXVpdEZyb21Sb29tIiwiZGVsZXRlIiwiJGxvY2F0aW9uIiwiZW50ZXJMb2JieSIsIkxlYWRlckJvYXJkRmFjdG9yeSIsIkFsbFBsYXllcnMiLCJwbGF5ZXJzIiwiZ2FtZXMiLCJzY29yZXMiLCJ1c2VyR2FtZSIsImhpZ2hlc3RTY29yZSIsIm1heCIsImdhbWVzX3dvbiIsImdhbWVzX3BsYXllZCIsIndpbl9wZXJjZW50YWdlIiwidG9GaXhlZCIsInJlc29sdmUiLCJhbGxQbGF5ZXJzIiwicm9vbXMiLCJyb29tTmFtZUZvcm0iLCJuZXdSb29tIiwicm9vbUluZm8iLCJzaG93Rm9ybSIsImRpcmVjdGl2ZSIsInJlc3RyaWN0IiwidGVtcFJvb21zIiwiZ2V0QWxsUm9vbXMiLCJjb3B5Iiwicm9vbUlkIiwicHV0Iiwic2VuZExvZ2luIiwibG9naW5JbmZvIiwidGVtcGxhdGUiLCJTZWNyZXRTdGFzaCIsImdldFN0YXNoIiwic3Rhc2giLCJzY29wZSIsInJhbmtOYW1lIiwicmFua0J5Iiwib3JkZXIiLCJTaWdudXBGYWN0b3J5IiwiY3JlYXRlVXNlciIsInNpZ251cEluZm8iLCJlbWFpbCIsInBhc3N3b3JkIiwic2lnbnVwIiwic2VuZFNpZ251cCIsIlVzZXJGYWN0b3J5IiwiZmV0Y2hJbmZvcm1hdGlvbiIsInVwZGF0ZWQiLCJ1cGRhdGVkQXQiLCJnZXREYXkiLCJmZXRjaEdhbWVzIiwibGluayIsIml0ZW1zIiwibGFiZWwiLCJhdXRoIiwiaXNMb2dnZWRJbiIsInNldFVzZXIiLCJyZW1vdmVVc2VyIiwiJGludGVydmFsIiwidGltZSIsInN0YXJ0IiwidGltZV9yZW1haW5pbmciLCJjb252ZXJ0IiwiY291bnRkb3duIiwidGltZXIiLCJjYW5jZWwiLCJzZWNvbmRzIiwidG9TdHJpbmciLCJjb252ZXJzaW9uIiwiZmxvb3IiXSwibWFwcGluZ3MiOiJBQUFBOzs7O0FBQ0FBLE9BQUFDLEdBQUEs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SUFBQSxDQUFBO0FBQ0F6QixrQkFBQTZCLFNBQUEsR0FBQSxZQUFBO0FBQ0Esb0JBQUFDLFFBQUFOLFVBQUEsWUFBQTtBQUNBQyw0QkFBQSxDQUFBO0FBQ0F6QiwwQkFBQTJCLGNBQUEsR0FBQUMsUUFBQUgsSUFBQSxDQUFBO0FBQ0Esd0JBQUFBLE9BQUEsQ0FBQSxFQUFBO0FBQ0F6Qiw4QkFBQTJCLGNBQUEsR0FBQSxVQUFBO0FBQ0FILGtDQUFBTyxNQUFBLENBQUFELEtBQUE7QUFDQUwsK0JBQUFDLEtBQUE7QUFDQTtBQUNBLGlCQVJBLEVBUUEsSUFSQSxDQUFBO0FBU0EsYUFWQTs7QUFZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBL0ssbUJBQUF1RyxFQUFBLENBQUEsWUFBQSxFQUFBLFlBQUE7QUFDQThDLHNCQUFBNkIsU0FBQSxDQUFBSixJQUFBO0FBQ0EsYUFGQTs7QUFLQSxxQkFBQUcsT0FBQSxDQUFBSCxJQUFBLEVBQUE7QUFDQSxvQkFBQU8sVUFBQSxDQUFBUCxPQUFBLEVBQUEsRUFBQVEsUUFBQSxFQUFBO0FBQ0Esb0JBQUFDLGFBQUF0SCxLQUFBdUgsS0FBQSxDQUFBVixPQUFBLEVBQUEsQ0FBQSxHQUFBLEdBQUE7QUFDQSxvQkFBQU8sUUFBQXZKLE1BQUEsR0FBQSxDQUFBLEVBQUE7QUFDQXlKLGtDQUFBLE1BQUFGLE9BQUE7QUFDQSxpQkFGQSxNQUVBO0FBQ0FFLGtDQUFBRixPQUFBO0FBQ0E7QUFDQSx1QkFBQUUsVUFBQTtBQUNBO0FBQ0E7QUExREEsS0FBQTtBQTREQSxDQTdEQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xud2luZG93LmFwcCA9IGFuZ3VsYXIubW9kdWxlKCdGdWxsc3RhY2tHZW5lcmF0ZWRBcHAnLCBbJ2ZzYVByZUJ1aWx0JywgJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnbmdBbmltYXRlJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG4gICAgLy8gVHJpZ2dlciBwYWdlIHJlZnJlc2ggd2hlbiBhY2Nlc3NpbmcgYW4gT0F1dGggcm91dGVcbiAgICAkdXJsUm91dGVyUHJvdmlkZXIud2hlbignL2F1dGgvOnByb3ZpZGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgfSk7XG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBsaXN0ZW5pbmcgdG8gZXJyb3JzIGJyb2FkY2FzdGVkIGJ5IHVpLXJvdXRlciwgdXN1YWxseSBvcmlnaW5hdGluZyBmcm9tIHJlc29sdmVzXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlKSB7XG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZUVycm9yJywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcywgZnJvbVN0YXRlLCBmcm9tUGFyYW1zLCB0aHJvd25FcnJvcikge1xuICAgICAgICBjb25zb2xlLmluZm8oYFRoZSBmb2xsb3dpbmcgZXJyb3Igd2FzIHRocm93biBieSB1aS1yb3V0ZXIgd2hpbGUgdHJhbnNpdGlvbmluZyB0byBzdGF0ZSBcIiR7dG9TdGF0ZS5uYW1lfVwiLiBUaGUgb3JpZ2luIG9mIHRoaXMgZXJyb3IgaXMgcHJvYmFibHkgYSByZXNvbHZlIGZ1bmN0aW9uOmApO1xuICAgICAgICBjb25zb2xlLmVycm9yKHRocm93bkVycm9yKTtcbiAgICB9KTtcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxuICAgIHZhciBkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xuICAgIH07XG5cbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMpIHtcblxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHVzZXIgaXMgcmV0cmlldmVkLCB0aGVuIHJlbmF2aWdhdGUgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXG4gICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59KTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBIb3BlIHlvdSBkaWRuJ3QgZm9yZ2V0IEFuZ3VsYXIhIER1aC1kb3kuXG4gICAgaWYgKCF3aW5kb3cuYW5ndWxhcikgdGhyb3cgbmV3IEVycm9yKCdJIGNhblxcJ3QgZmluZCBBbmd1bGFyIScpO1xuXG4gICAgdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdmc2FQcmVCdWlsdCcsIFtdKTtcblxuICAgIGFwcC5mYWN0b3J5KCdTb2NrZXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghd2luZG93LmlvKSB0aHJvdyBuZXcgRXJyb3IoJ3NvY2tldC5pbyBub3QgZm91bmQhJyk7XG4gICAgICAgIHJldHVybiB3aW5kb3cuaW8od2luZG93LmxvY2F0aW9uLm9yaWdpbik7XG4gICAgfSk7XG5cbiAgICAvLyBBVVRIX0VWRU5UUyBpcyB1c2VkIHRocm91Z2hvdXQgb3VyIGFwcCB0b1xuICAgIC8vIGJyb2FkY2FzdCBhbmQgbGlzdGVuIGZyb20gYW5kIHRvIHRoZSAkcm9vdFNjb3BlXG4gICAgLy8gZm9yIGltcG9ydGFudCBldmVudHMgYWJvdXQgYXV0aGVudGljYXRpb24gZmxvdy5cbiAgICBhcHAuY29uc3RhbnQoJ0FVVEhfRVZFTlRTJywge1xuICAgICAgICBsb2dpblN1Y2Nlc3M6ICdhdXRoLWxvZ2luLXN1Y2Nlc3MnLFxuICAgICAgICBsb2dpbkZhaWxlZDogJ2F1dGgtbG9naW4tZmFpbGVkJyxcbiAgICAgICAgbG9nb3V0U3VjY2VzczogJ2F1dGgtbG9nb3V0LXN1Y2Nlc3MnLFxuICAgICAgICBzZXNzaW9uVGltZW91dDogJ2F1dGgtc2Vzc2lvbi10aW1lb3V0JyxcbiAgICAgICAgbm90QXV0aGVudGljYXRlZDogJ2F1dGgtbm90LWF1dGhlbnRpY2F0ZWQnLFxuICAgICAgICBub3RBdXRob3JpemVkOiAnYXV0aC1ub3QtYXV0aG9yaXplZCdcbiAgICB9KTtcblxuICAgIGFwcC5mYWN0b3J5KCdBdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsIEFVVEhfRVZFTlRTKSB7XG4gICAgICAgIHZhciBzdGF0dXNEaWN0ID0ge1xuICAgICAgICAgICAgNDAxOiBBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLFxuICAgICAgICAgICAgNDAzOiBBVVRIX0VWRU5UUy5ub3RBdXRob3JpemVkLFxuICAgICAgICAgICAgNDE5OiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCxcbiAgICAgICAgICAgIDQ0MDogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXRcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChzdGF0dXNEaWN0W3Jlc3BvbnNlLnN0YXR1c10sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSkge1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgdXNlciA9IHJlc3BvbnNlLmRhdGEudXNlcjtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKHVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XG4gICAgICAgICAgICByZXR1cm4gdXNlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZXMgdGhlIHNlc3Npb24gZmFjdG9yeSB0byBzZWUgaWYgYW5cbiAgICAgICAgLy8gYXV0aGVudGljYXRlZCB1c2VyIGlzIGN1cnJlbnRseSByZWdpc3RlcmVkLlxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhIVNlc3Npb24udXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldExvZ2dlZEluVXNlciA9IGZ1bmN0aW9uIChmcm9tU2VydmVyKSB7XG5cbiAgICAgICAgICAgIC8vIElmIGFuIGF1dGhlbnRpY2F0ZWQgc2Vzc2lvbiBleGlzdHMsIHdlXG4gICAgICAgICAgICAvLyByZXR1cm4gdGhlIHVzZXIgYXR0YWNoZWQgdG8gdGhhdCBzZXNzaW9uXG4gICAgICAgICAgICAvLyB3aXRoIGEgcHJvbWlzZS4gVGhpcyBlbnN1cmVzIHRoYXQgd2UgY2FuXG4gICAgICAgICAgICAvLyBhbHdheXMgaW50ZXJmYWNlIHdpdGggdGhpcyBtZXRob2QgYXN5bmNocm9ub3VzbHkuXG5cbiAgICAgICAgICAgIC8vIE9wdGlvbmFsbHksIGlmIHRydWUgaXMgZ2l2ZW4gYXMgdGhlIGZyb21TZXJ2ZXIgcGFyYW1ldGVyLFxuICAgICAgICAgICAgLy8gdGhlbiB0aGlzIGNhY2hlZCB2YWx1ZSB3aWxsIG5vdCBiZSB1c2VkLlxuXG4gICAgICAgICAgICBpZiAodGhpcy5pc0F1dGhlbnRpY2F0ZWQoKSAmJiBmcm9tU2VydmVyICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4oU2Vzc2lvbi51c2VyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFrZSByZXF1ZXN0IEdFVCAvc2Vzc2lvbi5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIDQwMSByZXNwb25zZSwgd2UgY2F0Y2ggaXQgYW5kIGluc3RlYWQgcmVzb2x2ZSB0byBudWxsLlxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKS50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9naW4gPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbihvblN1Y2Nlc3NmdWxMb2dpbilcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHsgbWVzc2FnZTogJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJyB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9sb2dvdXQnKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBTZXNzaW9uLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9nb3V0U3VjY2Vzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcblxuICAgICAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSB1c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IG51bGw7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxufSgpKTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnR2FtZScsIHtcbiAgICAgICAgdXJsOiAnL2dhbWUvOnJvb21uYW1lJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9nYW1lLXN0YXRlL3BhZ2UuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6IFwiR2FtZUN0cmxcIixcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuXG5cbmFwcC5jb250cm9sbGVyKCdHYW1lQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgQm9hcmRGYWN0b3J5LCBTb2NrZXQsICRzdGF0ZVBhcmFtcywgQXV0aFNlcnZpY2UsICRzdGF0ZSwgTG9iYnlGYWN0b3J5LCAkcm9vdFNjb3BlLCAkcSkge1xuXG4gICAgJHNjb3BlLnJvb21OYW1lID0gJHN0YXRlUGFyYW1zLnJvb21uYW1lO1xuXG4gICAgJHNjb3BlLmhpZGVCb2FyZCA9IHRydWU7XG4gICAgJHNjb3BlLmhpZGVTdGFydCA9IHRydWU7XG4gICAgJHNjb3BlLmhpZGVDcmFiZGFuY2UgPSB0cnVlO1xuICAgICRzY29wZS5jcmFiZGFuY2VzID0gMDtcbiAgICAkcm9vdFNjb3BlLmhpZGVOYXZiYXIgPSB0cnVlO1xuICAgICRzY29wZS5mcmVlemUgPSBmYWxzZTtcblxuICAgICRzY29wZS5vdGhlclBsYXllcnMgPSBbXTtcbiAgICAkc2NvcGUubWVzc2FnZXMgPSBudWxsO1xuXG4gICAgJHNjb3BlLmdhbWVMZW5ndGggPSAxNTA7XG5cbiAgICAkc2NvcGUubW91c2VJc0Rvd24gPSBmYWxzZTtcbiAgICAkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkID0gZmFsc2U7XG5cbiAgICAkc2NvcGUuc3R5bGUgPSBudWxsO1xuICAgICRzY29wZS5tZXNzYWdlID0gJyc7XG4gICAgJHNjb3BlLndpbk9yTG9zZSA9IG51bGw7XG4gICAgJHNjb3BlLnRpbWVvdXQgPSBudWxsO1xuXG4gICAgJHNjb3BlLmV4cG9ydHMgPSB7XG4gICAgICAgIHdvcmRPYmo6IHt9LFxuICAgICAgICB3b3JkOiBcIlwiLFxuICAgICAgICBwbGF5ZXJJZDogbnVsbCxcbiAgICAgICAgc3RhdGVOdW1iZXI6IDAsXG4gICAgICAgIHBvaW50c0Vhcm5lZDogbnVsbFxuICAgIH07XG5cblxuICAgICRzY29wZS5jaGVja1NlbGVjdGVkID0gZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgcmV0dXJuIGlkIGluICRzY29wZS5leHBvcnRzLndvcmRPYmo7XG4gICAgfTtcblxuICAgICRzY29wZS50b2dnbGVEcmFnID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5kcmFnZ2luZ0FsbG93ZWQgPSAhJHNjb3BlLmRyYWdnaW5nQWxsb3dlZDtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm1vdXNlRG93biA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUubW91c2VJc0Rvd24gPSB0cnVlO1xuICAgIH07XG5cbiAgICAkc2NvcGUubW91c2VVcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUubW91c2VJc0Rvd24gPSBmYWxzZTtcbiAgICAgICAgaWYgKCRzY29wZS5kcmFnZ2luZ0FsbG93ZWQgJiYgJHNjb3BlLmV4cG9ydHMud29yZC5sZW5ndGggPiAxKSAkc2NvcGUuc3VibWl0KCRzY29wZS5leHBvcnRzKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmRyYWcgPSBmdW5jdGlvbihzcGFjZSwgaWQpIHtcbiAgICAgICAgaWYgKCRzY29wZS5tb3VzZUlzRG93biAmJiAkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkKSB7XG4gICAgICAgICAgICAkc2NvcGUuY2xpY2soc3BhY2UsIGlkKTtcbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIC8vIFN0YXJ0IHRoZSBnYW1lIHdoZW4gYWxsIHBsYXllcnMgaGF2ZSBqb2luZWQgcm9vbVxuICAgICRzY29wZS5zdGFydEdhbWUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHVzZXJJZHMgPSAkc2NvcGUub3RoZXJQbGF5ZXJzLm1hcCh1c2VyID0+IHVzZXIuaWQpO1xuICAgICAgICB1c2VySWRzLnB1c2goJHNjb3BlLnVzZXIuaWQpO1xuICAgICAgICBjb25zb2xlLmxvZygnb3AnLCAkc2NvcGUub3RoZXJQbGF5ZXJzLCAndWknLCB1c2VySWRzKTtcbiAgICAgICAgJHNjb3BlLndpbk9yTG9zZSA9IG51bGw7XG4gICAgICAgIEJvYXJkRmFjdG9yeS5nZXRTdGFydEJvYXJkKCRzY29wZS5nYW1lTGVuZ3RoLCAkc2NvcGUuZ2FtZUlkLCB1c2VySWRzKTtcbiAgICB9O1xuXG5cbiAgICAvL1F1aXQgdGhlIHJvb20sIGJhY2sgdG8gbG9iYnlcbiAgICAkc2NvcGUucXVpdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkcm9vdFNjb3BlLmhpZGVOYXZiYXIgPSBmYWxzZTtcbiAgICAgICAgJHN0YXRlLmdvKCdsb2JieScpXG4gICAgfTtcblxuXG4gICAgJHNjb3BlLmJvYXJkID0gW1xuICAgICAgICBbJ2InLCAnYScsICdkJywgJ2UnLCAnYScsICdyJ10sXG4gICAgICAgIFsnZScsICdmJywgJ2cnLCAnbCcsICdtJywgJ2UnXSxcbiAgICAgICAgWydoJywgJ2knLCAnaicsICdmJywgJ28nLCAnYSddLFxuICAgICAgICBbJ2MnLCAnYScsICdkJywgJ2UnLCAnYScsICdyJ10sXG4gICAgICAgIFsnZScsICdmJywgJ2cnLCAnbCcsICdkJywgJ2UnXSxcbiAgICAgICAgWydoJywgJ2knLCAnaicsICdmJywgJ28nLCAnYSddXG4gICAgXTtcblxuXG4gICAgJHNjb3BlLnNpemUgPSAzO1xuICAgICRzY29wZS5zY29yZSA9IDA7XG5cblxuICAgICRzY29wZS5jbGljayA9IGZ1bmN0aW9uKHNwYWNlLCBpZCkge1xuICAgICAgICBpZiAoJHNjb3BlLmZyZWV6ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKCdjbGlja2VkICcsIHNwYWNlLCBpZCk7XG4gICAgICAgIHZhciBsdHJzU2VsZWN0ZWQgPSBPYmplY3Qua2V5cygkc2NvcGUuZXhwb3J0cy53b3JkT2JqKTtcbiAgICAgICAgdmFyIHByZXZpb3VzTHRyID0gbHRyc1NlbGVjdGVkW2x0cnNTZWxlY3RlZC5sZW5ndGggLSAyXTtcbiAgICAgICAgdmFyIGxhc3RMdHIgPSBsdHJzU2VsZWN0ZWRbbHRyc1NlbGVjdGVkLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAoIWx0cnNTZWxlY3RlZC5sZW5ndGggfHwgdmFsaWRTZWxlY3QoaWQsIGx0cnNTZWxlY3RlZCkpIHtcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLndvcmQgKz0gc3BhY2U7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkT2JqW2lkXSA9IHNwYWNlO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJHNjb3BlLmV4cG9ydHMpO1xuICAgICAgICB9IGVsc2UgaWYgKGlkID09PSBwcmV2aW91c0x0cikge1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZCA9ICRzY29wZS5leHBvcnRzLndvcmQuc3Vic3RyaW5nKDAsICRzY29wZS5leHBvcnRzLndvcmQubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICBkZWxldGUgJHNjb3BlLmV4cG9ydHMud29yZE9ialtsYXN0THRyXTtcbiAgICAgICAgfSBlbHNlIGlmIChsdHJzU2VsZWN0ZWQubGVuZ3RoID09PSAxICYmIGlkID09PSBsYXN0THRyKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkID0gXCJcIjtcbiAgICAgICAgICAgIGRlbGV0ZSAkc2NvcGUuZXhwb3J0cy53b3JkT2JqW2xhc3RMdHJdO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vbWFrZXMgc3VyZSBsZXR0ZXIgaXMgYWRqYWNlbnQgdG8gcHJldiBsdHIsIGFuZCBoYXNuJ3QgYmVlbiB1c2VkIHlldFxuICAgIGZ1bmN0aW9uIHZhbGlkU2VsZWN0KGx0cklkLCBvdGhlckx0cnNJZHMpIHtcbiAgICAgICAgaWYgKG90aGVyTHRyc0lkcy5pbmNsdWRlcyhsdHJJZCkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgdmFyIGNvb3JkcyA9IGx0cklkLnNwbGl0KCctJyk7XG4gICAgICAgIHZhciByb3cgPSBjb29yZHNbMF07XG4gICAgICAgIHZhciBjb2wgPSBjb29yZHNbMV07XG4gICAgICAgIHZhciBsYXN0THRySWQgPSBvdGhlckx0cnNJZHMucG9wKCk7XG4gICAgICAgIHZhciBjb29yZHNMYXN0ID0gbGFzdEx0cklkLnNwbGl0KCctJyk7XG4gICAgICAgIHZhciByb3dMYXN0ID0gY29vcmRzTGFzdFswXTtcbiAgICAgICAgdmFyIGNvbExhc3QgPSBjb29yZHNMYXN0WzFdO1xuICAgICAgICB2YXIgcm93T2Zmc2V0ID0gTWF0aC5hYnMocm93IC0gcm93TGFzdCk7XG4gICAgICAgIHZhciBjb2xPZmZzZXQgPSBNYXRoLmFicyhjb2wgLSBjb2xMYXN0KTtcbiAgICAgICAgcmV0dXJuIChyb3dPZmZzZXQgPD0gMSAmJiBjb2xPZmZzZXQgPD0gMSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYXJJZkNvbmZsaWN0aW5nKHVwZGF0ZVdvcmRPYmosIGV4cG9ydFdvcmRPYmopIHtcbiAgICAgICAgdmFyIHRpbGVzTW92ZWQgPSBPYmplY3Qua2V5cyh1cGRhdGVXb3JkT2JqKTtcbiAgICAgICAgdmFyIG15V29yZFRpbGVzID0gT2JqZWN0LmtleXMoZXhwb3J0V29yZE9iaik7XG4gICAgICAgIGlmICh0aWxlc01vdmVkLnNvbWUoY29vcmQgPT4gbXlXb3JkVGlsZXMuaW5jbHVkZXMoY29vcmQpKSkgJHNjb3BlLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgJHNjb3BlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5leHBvcnRzLndvcmQgPSBcIlwiO1xuICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkT2JqID0ge307XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLnN1Ym1pdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgICBjb25zb2xlLmxvZygnc3VibWl0dGluZyAnLCBvYmopO1xuICAgICAgICBCb2FyZEZhY3Rvcnkuc3VibWl0KG9iaik7XG4gICAgICAgICRzY29wZS5jbGVhcigpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc2h1ZmZsZSA9IEJvYXJkRmFjdG9yeS5zaHVmZmxlO1xuXG5cbiAgICAkc2NvcGUudXBkYXRlQm9hcmQgPSBmdW5jdGlvbih3b3JkT2JqKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdzY29wZS5ib2FyZCcsICRzY29wZS5ib2FyZCk7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB3b3JkT2JqKSB7XG4gICAgICAgICAgICB2YXIgY29vcmRzID0ga2V5LnNwbGl0KCctJyk7XG4gICAgICAgICAgICB2YXIgcm93ID0gY29vcmRzWzBdO1xuICAgICAgICAgICAgdmFyIGNvbCA9IGNvb3Jkc1sxXTtcbiAgICAgICAgICAgICRzY29wZS5ib2FyZFtyb3ddW2NvbF0gPSB3b3JkT2JqW2tleV07XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnVwZGF0ZVNjb3JlID0gZnVuY3Rpb24ocG9pbnRzLCBwbGF5ZXJJZCkge1xuICAgICAgICBjb25zb2xlLmxvZygndXBkYXRlIHNjb3JlIHBvaW50cycsIHBvaW50cyk7XG4gICAgICAgIGlmIChwbGF5ZXJJZCA9PT0gJHNjb3BlLnVzZXIuaWQpIHtcbiAgICAgICAgICAgICRzY29wZS5zY29yZSArPSBwb2ludHM7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy5wb2ludHNFYXJuZWQgPSBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIgcGxheWVyIGluICRzY29wZS5vdGhlclBsYXllcnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLm90aGVyUGxheWVyc1twbGF5ZXJdLmlkID09PSBwbGF5ZXJJZCkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzW3BsYXllcl0uc2NvcmUgKz0gcG9pbnRzO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy5wb2ludHNFYXJuZWQgPSBudWxsO1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLnVwZGF0ZSA9IGZ1bmN0aW9uKHVwZGF0ZU9iaikge1xuICAgICAgICAkc2NvcGUudXBkYXRlU2NvcmUodXBkYXRlT2JqLnBvaW50c0Vhcm5lZCwgdXBkYXRlT2JqLnBsYXllcklkKTtcbiAgICAgICAgJHNjb3BlLnVwZGF0ZUJvYXJkKHVwZGF0ZU9iai53b3JkT2JqKTtcbiAgICAgICAgaWYgKHVwZGF0ZU9iai53b3JkLmxlbmd0aCA+IDMgJiYgdXBkYXRlT2JqLnBsYXllcklkICE9ICRzY29wZS51c2VyLmlkKSB7XG4gICAgICAgICAgICBpZiAoISRzY29wZS5jcmFiZGFuY2VzKSBjcmFiZGFuY2UoKTtcbiAgICAgICAgICAgICRzY29wZS5jcmFiZGFuY2VzKys7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCskc2NvcGUudXNlci5pZCA9PT0gK3VwZGF0ZU9iai5wbGF5ZXJJZCkge1xuICAgICAgICAgICAgdmFyIHBsYXllciA9ICRzY29wZS51c2VyLnVzZXJuYW1lO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluICRzY29wZS5vdGhlclBsYXllcnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoKyRzY29wZS5vdGhlclBsYXllcnNba2V5XS5pZCA9PT0gK3VwZGF0ZU9iai5wbGF5ZXJJZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcGxheWVyID0gJHNjb3BlLm90aGVyUGxheWVyc1trZXldLnVzZXJuYW1lO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLm1lc3NhZ2UgPSBwbGF5ZXIgKyBcIiBwbGF5ZWQgXCIgKyB1cGRhdGVPYmoud29yZCArIFwiIGZvciBcIiArIHVwZGF0ZU9iai5wb2ludHNFYXJuZWQgKyBcIiBwb2ludHMhXCI7XG4gICAgICAgIGlmICgkc2NvcGUudGltZW91dCkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KCRzY29wZS50aW1lb3V0KTtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkc2NvcGUubWVzc2FnZSA9ICcnO1xuICAgICAgICB9LCAzMDAwKTtcbiAgICAgICAgY29uc29sZS5sb2coJ2l0cyB1cGRhdGluZyEnKTtcbiAgICAgICAgY2xlYXJJZkNvbmZsaWN0aW5nKHVwZGF0ZU9iaiwgJHNjb3BlLmV4cG9ydHMud29yZE9iaik7XG4gICAgICAgICRzY29wZS5leHBvcnRzLnN0YXRlTnVtYmVyID0gdXBkYXRlT2JqLnN0YXRlTnVtYmVyO1xuICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBjcmFiZGFuY2UoKSB7XG4gICAgICAgICRzY29wZS5oaWRlQm9hcmQgPSB0cnVlO1xuICAgICAgICAkc2NvcGUuaGlkZUNyYWJkYW5jZSA9IGZhbHNlO1xuICAgICAgICBjb25zb2xlLmxvZygnZGFuY2UgY3JhYiEnLCAkc2NvcGUuY3JhYmRhbmNlcyk7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkc2NvcGUuY3JhYmRhbmNlcy0tO1xuICAgICAgICAgICAgaWYgKCRzY29wZS5jcmFiZGFuY2VzKSB7XG4gICAgICAgICAgICAgICAgY3JhYmRhbmNlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuaGlkZUNyYWJkYW5jZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmhpZGVCb2FyZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAzMDAwKTtcbiAgICB9XG5cbiAgICAkc2NvcGUucmVwbGF5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIExvYmJ5RmFjdG9yeS5uZXdHYW1lKHsgcm9vbW5hbWU6ICRzY29wZS5yb29tTmFtZSB9KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZ2FtZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVwbGF5IGdhbWUgb2JqOlwiLCBnYW1lKTtcblxuICAgICAgICAgICAgICAgICRzY29wZS5nYW1lSWQgPSBnYW1lLmlkO1xuICAgICAgICAgICAgICAgICRzY29wZS5zdGFydEdhbWUoKTtcbiAgICAgICAgICAgICAgICB2YXIgYWxsSWRzID0gJHNjb3BlLm90aGVyUGxheWVycy5tYXAocGxheWVyID0+IHBsYXllci5pZCk7XG4gICAgICAgICAgICAgICAgYWxsSWRzLnB1c2goJHNjb3BlLnVzZXIuaWQpO1xuICAgICAgICAgICAgICAgICRxLmFsbChhbGxJZHMubWFwKGlkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgTG9iYnlGYWN0b3J5LmpvaW5HYW1lKCRzY29wZS5nYW1lSWQsIGlkKTtcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdlcnJvciByZXN0YXJ0aW5nIHRoZSBnYW1lJywgZSk7XG4gICAgICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmRldGVybWluZVdpbm5lciA9IGZ1bmN0aW9uKHdpbm5lcnNBcnJheSkge1xuICAgICAgICBpZiAod2lubmVyc0FycmF5Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgaWYgKCt3aW5uZXJzQXJyYXlbMF0gPT09ICskc2NvcGUudXNlci5pZCkge1xuICAgICAgICAgICAgICAgICRzY29wZS53aW5Pckxvc2UgPSBcIkNvbmdyYXR1bGF0aW9uISBZb3UgYXJlIGEgd29yZCB3aXphcmQhIFlvdSB3b24hISFcIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgcGxheWVyIGluICRzY29wZS5vdGhlclBsYXllcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCskc2NvcGUub3RoZXJQbGF5ZXJzW3BsYXllcl0uaWQgPT09ICt3aW5uZXJzQXJyYXlbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB3aW5uZXIgPSAkc2NvcGUub3RoZXJQbGF5ZXJzW3BsYXllcl0udXNlcm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUud2luT3JMb3NlID0gXCJUb3VnaCBsdWNrLiBcIiArIHdpbm5lciArIFwiIGhhcyBiZWF0ZW4geW91LiBCZXR0ZXIgTHVjayBuZXh0IHRpbWUuIDooXCJcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCB3aW5uZXJzID0gW107XG4gICAgICAgICAgICBmb3IgKHZhciBpIGluIHdpbm5lcnNBcnJheSkge1xuICAgICAgICAgICAgICAgIGlmICgrd2lubmVyc0FycmF5W2ldID09PSArJHNjb3BlLnVzZXIuaWQpIHsgd2lubmVycy5wdXNoKCRzY29wZS51c2VyLnVzZXJuYW1lKTsgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgcGxheWVyIGluICRzY29wZS5vdGhlclBsYXllcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkc2NvcGUub3RoZXJQbGF5ZXJzW3BsYXllcl0uaWQgPT0gd2lubmVyc0FycmF5W2ldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lubmVycy5wdXNoKCRzY29wZS5vdGhlclBsYXllcnNbcGxheWVyXS51c2VybmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cod2lubmVycyk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLndpbk9yTG9zZSA9IFwiVGhlIGdhbWUgd2FzIGEgdGllIGJldHdlZW4gXCI7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB3aW5uZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpID09PSB3aW5uZXJzLmxlbmd0aCAtIDEpIHsgJHNjb3BlLndpbk9yTG9zZSArPSBcImFuZCBcIiArIHdpbm5lcnNbaV0gKyBcIi5cIjsgfSBlbHNlIHsgJHNjb3BlLndpbk9yTG9zZSArPSB3aW5uZXJzW2ldICsgXCIsIFwiOyB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnZGVzdHJveWVkJyk7XG4gICAgICAgIFNvY2tldC5kaXNjb25uZWN0KCk7XG5cbiAgICB9KTtcblxuICAgIFNvY2tldC5vbignY29ubmVjdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnY29ubmVjdGluZycpO1xuICAgICAgICAkcS5hbGwoW1xuICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndXNlciBmcm9tIEF1dGhTZXJ2aWNlJywgdXNlcik7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgICAgICRzY29wZS5leHBvcnRzLnBsYXllcklkID0gdXNlci5pZDtcbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAvL2dldCB0aGUgY3VycmVudCByb29tIGluZm9cbiAgICAgICAgICAgIEJvYXJkRmFjdG9yeS5nZXRDdXJyZW50Um9vbSgkc3RhdGVQYXJhbXMucm9vbW5hbWUpXG4gICAgICAgICAgICAudGhlbihyb29tID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyb29tKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZ2FtZUlkID0gcm9vbS5pZDtcbiAgICAgICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzID0gcm9vbS51c2Vycy5maWx0ZXIodXNlciA9PiB1c2VyLmlkICE9PSAkc2NvcGUudXNlci5pZCk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVycy5mb3JFYWNoKHBsYXllciA9PiB7IHBsYXllci5zY29yZSA9IDAgfSk7XG4gICAgICAgICAgICAgICAgTG9iYnlGYWN0b3J5LmpvaW5HYW1lKHJvb20uaWQsICRzY29wZS51c2VyLmlkKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIF0pLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBTb2NrZXQuZW1pdCgnam9pblJvb20nLCAkc2NvcGUudXNlciwgJHNjb3BlLnJvb21OYW1lLCAkc2NvcGUuZ2FtZUlkKTtcbiAgICAgICAgICAgICRzY29wZS5oaWRlU3RhcnQgPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZW1pdHRpbmcgXCJqb2luIHJvb21cIiBldmVudCB0byBzZXJ2ZXIgOFAnLCAkc2NvcGUucm9vbU5hbWUpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdlcnJvciBncmFiYmluZyB1c2VyIG9yIHJvb20gZnJvbSBkYjogJywgZSk7XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgU29ja2V0Lm9uKCdyb29tSm9pblN1Y2Nlc3MnLCBmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnbmV3IHVzZXIgam9pbmluZycsIHVzZXIuaWQpO1xuICAgICAgICAgICAgdXNlci5zY29yZSA9IDA7XG4gICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzLnB1c2godXNlcik7XG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuXG4gICAgICAgIH0pO1xuXG4gICAgICAgIFNvY2tldC5vbignc3RhcnRCb2FyZCcsIGZ1bmN0aW9uKGJvYXJkKSB7XG4gICAgICAgICAgICAkc2NvcGUuZnJlZXplID0gZmFsc2U7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnYm9hcmQhICcsIGJvYXJkKTtcbiAgICAgICAgICAgICRzY29wZS5ib2FyZCA9IGJvYXJkO1xuICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVycy5mb3JFYWNoKHBsYXllciA9PiB7IHBsYXllci5zY29yZSA9IDAgfSk7XG4gICAgICAgICAgICAkc2NvcGUuc2NvcmUgPSAwO1xuICAgICAgICAgICAgJHNjb3BlLmhpZGVTdGFydCA9IHRydWU7XG4gICAgICAgICAgICAkc2NvcGUuaGlkZUJvYXJkID0gZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICBTb2NrZXQub24oJ3dvcmRWYWxpZGF0ZWQnLCBmdW5jdGlvbih1cGRhdGVPYmopIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd3b3JkIGlzIHZhbGlkYXRlZCcpO1xuICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZSh1cGRhdGVPYmopO1xuICAgICAgICAgICAgJHNjb3BlLmxhc3RXb3JkUGxheWVkID0gdXBkYXRlT2JqLndvcmQ7XG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICBTb2NrZXQub24oJ2JvYXJkU2h1ZmZsZWQnLCBmdW5jdGlvbihib2FyZCwgdXNlcklkLCBzdGF0ZU51bWJlcikge1xuICAgICAgICAgICAgJHNjb3BlLmJvYXJkID0gYm9hcmQ7XG4gICAgICAgICAgICAkc2NvcGUudXBkYXRlU2NvcmUoLTUsIHVzZXJJZCk7XG4gICAgICAgICAgICAkc2NvcGUuY2xlYXIoKTtcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLnN0YXRlTnVtYmVyID0gc3RhdGVOdW1iZXI7XG4gICAgICAgICAgICAkc2NvcGUubWVzc2FnZSA9IHVzZXJJZCArIFwiIHNodWZmbGVkIHRoZSBib2FyZCFcIjtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCRzY29wZS5tZXNzYWdlKTtcbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIFNvY2tldC5vbigncGxheWVyRGlzY29ubmVjdGVkJywgZnVuY3Rpb24odXNlcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3BsYXllckRpc2Nvbm5lY3RlZCcsIHVzZXIuaWQpO1xuICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVycyA9ICRzY29wZS5vdGhlclBsYXllcnMubWFwKG90aGVyUGxheWVycyA9PiBvdGhlclBsYXllcnMuaWQgIT09IHVzZXIuaWQpO1xuXG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICBTb2NrZXQub24oJ2dhbWVPdmVyJywgZnVuY3Rpb24od2lubmVyc0FycmF5KSB7XG4gICAgICAgICAgICAkc2NvcGUuY2xlYXIoKTtcbiAgICAgICAgICAgICRzY29wZS5mcmVlemUgPSB0cnVlO1xuICAgICAgICAgICAgJHNjb3BlLmRldGVybWluZVdpbm5lcih3aW5uZXJzQXJyYXkpO1xuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnYW1lIGlzIG92ZXIsIHdpbm5lcnM6ICcsIHdpbm5lcnNBcnJheSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSk7XG4iLCJhcHAuZmFjdG9yeSAoXCJCb2FyZEZhY3RvcnlcIiwgZnVuY3Rpb24oJGh0dHAsIFNvY2tldCl7XG5cdHJldHVybntcblx0XHRnZXRTdGFydEJvYXJkOiBmdW5jdGlvbihnYW1lTGVuZ3RoLCBnYW1lSWQsIHVzZXJJZHMpe1xuXHRcdFx0Y29uc29sZS5sb2coJ2ZhY3RvcnkuIGdsOiAnLCBnYW1lTGVuZ3RoKTtcblx0XHRcdFNvY2tldC5lbWl0KCdnZXRTdGFydEJvYXJkJywgZ2FtZUxlbmd0aCwgZ2FtZUlkLCB1c2VySWRzKTtcblx0XHR9LFxuXG5cdFx0c3VibWl0OiBmdW5jdGlvbihvYmope1xuXHRcdFx0U29ja2V0LmVtaXQoJ3N1Ym1pdFdvcmQnLCBvYmopO1xuXHRcdH0sXG5cblx0XHRzaHVmZmxlOiBmdW5jdGlvbih1c2VyKXtcblx0XHRcdGNvbnNvbGUubG9nKCdncmlkZmFjdG9yeSB1Jyx1c2VyLmlkKTtcblx0XHRcdFNvY2tldC5lbWl0KCdzaHVmZmxlQm9hcmQnLHVzZXIuaWQpO1xuXHRcdH0sXG5cblx0XHQvLyBmaW5kQWxsT3RoZXJVc2VyczogZnVuY3Rpb24oZ2FtZSkge1xuXHRcdC8vIFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS9nYW1lcy8nKyBnYW1lLmlkKVxuXHRcdC8vIFx0LnRoZW4ocmVzID0+IHJlcy5kYXRhKVxuXHRcdC8vIH0sXG5cblx0XHRnZXRDdXJyZW50Um9vbTogZnVuY3Rpb24ocm9vbW5hbWUpIHtcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvZ2FtZXMvcm9vbXMvJytyb29tbmFtZSlcblx0XHRcdC50aGVuKHJlcyA9PiByZXMuZGF0YSlcblx0XHR9LFxuXG5cdFx0cXVpdEZyb21Sb29tOiBmdW5jdGlvbihnYW1lSWQsIHVzZXJJZCkge1xuXHRcdFx0Ly8gU29ja2V0LmVtaXQoJ2Rpc2Nvbm5lY3QnLCByb29tTmFtZSwgdXNlcklkKTtcblx0XHRcdHJldHVybiAkaHR0cC5kZWxldGUoJy9hcGkvZ2FtZXMvJytnYW1lSWQrJy8nK3VzZXJJZClcblx0XHR9XG5cdH1cbn0pO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ0hvbWVDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGUsICRsb2NhdGlvbil7XG4gICRzY29wZS5lbnRlckxvYmJ5ID0gZnVuY3Rpb24oKXtcbiAgICAkc3RhdGUuZ28oJ2xvYmJ5Jywge3JlbG9hZDogdHJ1ZX0pO1xuICB9XG59KTtcblxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcbiAgICAgICAgdXJsOiAnLycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaG9tZS9ob21lLmh0bWwnXG4gICAgfSk7XG59KTtcblxuIiwiYXBwLmNvbnRyb2xsZXIoJ0xlYWRlckJvYXJkQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgTGVhZGVyQm9hcmRGYWN0b3J5LCAkc3RhdGUsIEF1dGhTZXJ2aWNlKSB7XG4gICAgY29uc29sZS5sb2coJyAxJylcbiAgICBMZWFkZXJCb2FyZEZhY3RvcnkuQWxsUGxheWVycygpXG4gICAgLnRoZW4ocGxheWVycyA9PiB7XG4gICAgICAgIHBsYXllcnMuZm9yRWFjaChwbGF5ZXIgPT4ge1xuICAgICAgICAgICAgaWYgKHBsYXllci5nYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNjb3JlcyA9IHBsYXllci5nYW1lcy5tYXAoZ2FtZSA9PiBnYW1lLnVzZXJHYW1lLnNjb3JlKVxuICAgICAgICAgICAgICAgIHBsYXllci5oaWdoZXN0U2NvcmUgPSBNYXRoLm1heCguLi5zY29yZXMpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBsYXllci5oaWdoZXN0U2NvcmUgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGxheWVyLmdhbWVzX3dvbiA9IHBsYXllci53aW5uZXIubGVuZ3RoO1xuICAgICAgICAgICAgcGxheWVyLmdhbWVzX3BsYXllZCA9IHBsYXllci5nYW1lcy5sZW5ndGg7XG4gICAgICAgICAgICBpZihwbGF5ZXIuZ2FtZXMubGVuZ3RoPT09MCl7XG4gICAgICAgICAgICBcdHBsYXllci53aW5fcGVyY2VudGFnZSA9IDAgKyAnJSdcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBcdHBsYXllci53aW5fcGVyY2VudGFnZSA9ICgocGxheWVyLndpbm5lci5sZW5ndGgvcGxheWVyLmdhbWVzLmxlbmd0aCkqMTAwKS50b0ZpeGVkKDApICsgJyUnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pXG4gICAgICAgICRzY29wZS5wbGF5ZXJzID0gcGxheWVycztcbiAgICB9KVxufSk7XG4iLCJhcHAuZmFjdG9yeSgnTGVhZGVyQm9hcmRGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG5cdHZhciBMZWFkZXJCb2FyZEZhY3RvcnkgPSB7fTtcblxuXHRMZWFkZXJCb2FyZEZhY3RvcnkuQWxsUGxheWVycyA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvdXNlcnMnKVxuXHRcdC50aGVuKHJlcz0+cmVzLmRhdGEpXG5cdH1cblxuXHRyZXR1cm4gTGVhZGVyQm9hcmRGYWN0b3J5O1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xlYWRlckJvYXJkJywge1xuICAgICAgICB1cmw6ICcvbGVhZGVyQm9hcmQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xlYWRlckJvYXJkL2xlYWRlckJvYXJkLnRlbXBsYXRlLmh0bWwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgIFx0YWxsUGxheWVyczogZnVuY3Rpb24oTGVhZGVyQm9hcmRGYWN0b3J5KSB7XG4gICAgICAgIFx0XHRyZXR1cm4gTGVhZGVyQm9hcmRGYWN0b3J5LkFsbFBsYXllcnM7XG4gICAgICAgIFx0fSxcbiAgICAgICAgICAgIFxuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiAnTGVhZGVyQm9hcmRDdHJsJ1xuICAgIH0pO1xuXG59KTsiLCJhcHAuY29udHJvbGxlcignTG9iYnlDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBMb2JieUZhY3RvcnksIHJvb21zLCAkc3RhdGUsIEF1dGhTZXJ2aWNlKSB7XG5cbiAgICAvLyBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKVxuICAgIC8vICAgICAudGhlbihmdW5jdGlvbih1c2VyKSB7XG4gICAgLy8gICAgICAgICAkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgLy8gICAgIH0pO1xuXG4gICAgJHNjb3BlLnJvb21zID0gcm9vbXM7XG4gICAgJHNjb3BlLnJvb21OYW1lRm9ybSA9IGZhbHNlO1xuICAgIC8vICRzY29wZS51c2VyID0ge1xuICAgIC8vICBpZDogM1xuICAgIC8vIH1cblxuICAgIC8vICRzY29wZS5qb2luR2FtZSA9IGZ1bmN0aW9uKHJvb20pIHtcbiAgICAvLyAgICAgY29uc29sZS5sb2coXCJpbSBjaGFuZ2luZyBzdGF0ZSBhbmQgcmVsb2FkaW5nXCIpO1xuICAgIC8vICAgICAkc3RhdGUuZ28oJ0dhbWUnLCB7IHJvb21uYW1lOiByb29tLnJvb21uYW1lIH0sIHsgcmVsb2FkOiB0cnVlLCBub3RpZnk6IHRydWUgfSlcbiAgICAvLyB9O1xuXG4gICAgJHNjb3BlLm5ld1Jvb20gPSBmdW5jdGlvbihyb29tSW5mbykge1xuICAgICAgICBMb2JieUZhY3RvcnkubmV3R2FtZShyb29tSW5mbyk7XG4gICAgICAgICRzY29wZS5yb29tTmFtZUZvcm0gPSBmYWxzZTtcbiAgICB9O1xuICAgICRzY29wZS5zaG93Rm9ybSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUucm9vbU5hbWVGb3JtID0gdHJ1ZTtcbiAgICB9O1xuXG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ2VudGVyTG9iYnknLCBmdW5jdGlvbigpe1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgdGVtcGxhdGVVcmw6ICdqcy9sb2JieS9sb2JieS1idXR0b24uaHRtbCcsXG4gICAgY29udHJvbGxlcjogJ0hvbWVDdHJsJ1xuICB9XG59KVxuIiwiYXBwLmZhY3RvcnkoJ0xvYmJ5RmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuXHR2YXIgTG9iYnlGYWN0b3J5ID0ge307XG5cdHZhciB0ZW1wUm9vbXMgPSBbXTsgLy93b3JrIHdpdGggc29ja2V0P1xuXG5cdExvYmJ5RmFjdG9yeS5nZXRBbGxSb29tcyA9IGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS9nYW1lcy9yb29tcycpXG5cdFx0LnRoZW4ocmVzID0+IHJlcy5kYXRhKVxuXHRcdC50aGVuKHJvb21zID0+IHtcblx0XHRcdGFuZ3VsYXIuY29weShyb29tcywgdGVtcFJvb21zKTtcblx0XHRcdHJldHVybiB0ZW1wUm9vbXM7XG5cdFx0fSlcblx0fTtcblxuXHRMb2JieUZhY3Rvcnkuam9pbkdhbWUgPSBmdW5jdGlvbihyb29tSWQsIHVzZXJJZCkge1xuICAgIGNvbnNvbGUubG9nKCdsb2JieSBmYWN0b3J5IGpvaW4gZ2FtZScpO1xuXHRcdHJldHVybiAkaHR0cC5wdXQoJy9hcGkvZ2FtZXMvJysgcm9vbUlkICsnL3BsYXllcicsIHtpZDogdXNlcklkfSlcblx0XHQudGhlbihyZXM9PnJlcy5kYXRhKVxuXHR9O1xuXG5cdExvYmJ5RmFjdG9yeS5uZXdHYW1lID0gZnVuY3Rpb24ocm9vbUluZm8pIHtcblx0XHRyZXR1cm4gJGh0dHAucHV0KCcvYXBpL2dhbWVzJywgcm9vbUluZm8pXG5cdFx0LnRoZW4ocmVzID0+IHJlcy5kYXRhKVxuXHQgXHQudGhlbihyb29tID0+IHtcblx0IFx0XHR0ZW1wUm9vbXMucHVzaChyb29tKTtcblx0IFx0XHRyZXR1cm4gcm9vbTtcblx0IFx0XHR9KTtcblx0fTtcblxuXHRMb2JieUZhY3RvcnkuQWxsUGxheWVycyA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvdXNlcnMnKVxuXHRcdC50aGVuKHJlcz0+cmVzLmRhdGEpXG5cdH07XG5cblx0cmV0dXJuIExvYmJ5RmFjdG9yeTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsb2JieScsIHtcbiAgICAgICAgdXJsOiAnL2xvYmJ5JyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2JieS9sb2JieS50ZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICBcdHJvb21zOiBmdW5jdGlvbihMb2JieUZhY3RvcnkpIHtcbiAgICAgICAgXHRcdHJldHVybiBMb2JieUZhY3RvcnkuZ2V0QWxsUm9vbXMoKTtcbiAgICAgICAgXHR9XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2JieUN0cmwnXG4gICAgfSk7XG5cbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbiAobG9naW5JbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ21lbWJlcnNPbmx5Jywge1xuICAgICAgICB1cmw6ICcvbWVtYmVycy1hcmVhJyxcbiAgICAgICAgdGVtcGxhdGU6ICc8aW1nIG5nLXJlcGVhdD1cIml0ZW0gaW4gc3Rhc2hcIiB3aWR0aD1cIjMwMFwiIG5nLXNyYz1cInt7IGl0ZW0gfX1cIiAvPicsXG4gICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUsIFNlY3JldFN0YXNoKSB7XG4gICAgICAgICAgICBTZWNyZXRTdGFzaC5nZXRTdGFzaCgpLnRoZW4oZnVuY3Rpb24gKHN0YXNoKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnN0YXNoID0gc3Rhc2g7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBkYXRhLmF1dGhlbnRpY2F0ZSBpcyByZWFkIGJ5IGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KTtcblxufSk7XG5cbmFwcC5mYWN0b3J5KCdTZWNyZXRTdGFzaCcsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG4gICAgdmFyIGdldFN0YXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL21lbWJlcnMvc2VjcmV0LXN0YXNoJykudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0U3Rhc2g6IGdldFN0YXNoXG4gICAgfTtcblxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdyYW5rRGlyZWN0aXZlJywgKCk9PiB7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdFJyxcblx0XHRzY29wZToge1xuXHRcdFx0cmFua05hbWU6ICdAJyxcblx0XHRcdHBsYXllcnM6ICc9Jyxcblx0XHRcdHJhbmtCeTogJ0AnLFxuXHRcdFx0b3JkZXI6ICdAJ1xuXHRcdH0sXG5cdFx0dGVtcGxhdGVVcmw6ICcvanMvcmFuay9yYW5rLnRlbXBsYXRlLmh0bWwnXG5cdH1cbn0pOyIsImFwcC5mYWN0b3J5KCdTaWdudXBGYWN0b3J5JywgZnVuY3Rpb24oJGh0dHAsICRzdGF0ZSwgQXV0aFNlcnZpY2UpIHtcblx0Y29uc3QgU2lnbnVwRmFjdG9yeSA9IHt9O1xuXG5cdFNpZ251cEZhY3RvcnkuY3JlYXRlVXNlciA9IGZ1bmN0aW9uKHNpZ251cEluZm8pIHtcblx0XHRjb25zb2xlLmxvZyhzaWdudXBJbmZvKVxuXHRcdHJldHVybiAkaHR0cC5wb3N0KCcvc2lnbnVwJywgc2lnbnVwSW5mbylcblx0XHQudGhlbihyZXMgPT4ge1xuXHRcdFx0aWYgKHJlcy5zdGF0dXMgPT09IDIwMSkge1xuXHRcdFx0XHRBdXRoU2VydmljZS5sb2dpbih7ZW1haWw6IHNpZ251cEluZm8uZW1haWwsIHBhc3N3b3JkOiBzaWdudXBJbmZvLnBhc3N3b3JkfSlcblx0XHRcdFx0LnRoZW4odXNlciA9PiB7XG5cdFx0XHRcdFx0JHN0YXRlLmdvKCdob21lJylcblx0XHRcdFx0fSlcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRocm93IEVycm9yKCdBbiBhY2NvdW50IHdpdGggdGhhdCBlbWFpbCBhbHJlYWR5IGV4aXN0cycpO1xuXHRcdFx0fVxuXHRcdH0pXG5cdH1cblxuXHRyZXR1cm4gU2lnbnVwRmFjdG9yeTtcbn0pIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzaWdudXAnLCB7XG4gICAgICAgIHVybDogJy9zaWdudXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3NpZ251cC9zaWdudXAuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTaWdudXBDdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ1NpZ251cEN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlLCBTaWdudXBGYWN0b3J5KSB7XG5cbiAgICAkc2NvcGUuc2lnbnVwID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kU2lnbnVwID0gZnVuY3Rpb24oc2lnbnVwSW5mbyl7XG4gICAgICAgIFNpZ251cEZhY3RvcnkuY3JlYXRlVXNlcihzaWdudXBJbmZvKVxuICAgICAgICAuY2F0Y2goKCkgPT4ge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0FuIGFjY291bnQgd2l0aCB0aGF0IGVtYWlsIGFscmVhZHkgZXhpc3RzJztcbiAgICAgICAgfSlcbiAgICB9XG4gICAgXG5cblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKXtcblx0JHN0YXRlUHJvdmlkZXIuc3RhdGUoXCJVc2VyUHJvZmlsZVwiLHtcblx0XHR1cmw6IFwiL3VzZXJzLzp1c2VySWRcIixcblx0XHR0ZW1wbGF0ZVVybDpcImpzL3VzZXJfcHJvZmlsZS9wcm9maWxlLnRlbXBsYXRlLmh0bWxcIixcblx0XHRjb250cm9sbGVyOiBcIlVzZXJDdHJsXCJcblx0fSlcblx0JHN0YXRlUHJvdmlkZXIuc3RhdGUoXCJHYW1lUmVjb3JkXCIsIHtcblx0XHR1cmw6XCIvdXNlcnMvOnVzZXJJZC9nYW1lc1wiLFxuXHRcdHRlbXBsYXRlVXJsOiBcImpzL3VzZXJfcHJvZmlsZS9nYW1lcy5odG1sXCIsXG5cdFx0Y29udHJvbGxlcjogXCJHYW1lUmVjb3JkQ3RybFwiXG5cdH0pXG59KVxuXG5hcHAuY29udHJvbGxlcihcIlVzZXJDdHJsXCIsIGZ1bmN0aW9uKCRzY29wZSwgVXNlckZhY3RvcnksICRzdGF0ZVBhcmFtcyl7XG5cdFVzZXJGYWN0b3J5LmZldGNoSW5mb3JtYXRpb24oJHN0YXRlUGFyYW1zLnVzZXJJZClcblx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG5cdFx0JHNjb3BlLnVzZXI9dXNlcjtcblx0XHRyZXR1cm4gdXNlclxuXHR9KVxuXHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0XHQkc2NvcGUudXBkYXRlZD0kc2NvcGUudXNlci51cGRhdGVkQXQuZ2V0RGF5KCk7XG5cdH0pXG59KVxuXG5hcHAuY29udHJvbGxlcihcIkdhbWVSZWNvcmRDdHJsXCIsZnVuY3Rpb24oJHNjb3BlLCBVc2VyRmFjdG9yeSwgJHN0YXRlUGFyYW1zKXtcblx0VXNlckZhY3RvcnkuZmV0Y2hJbmZvcm1hdGlvbigkc3RhdGVQYXJhbXMudXNlcklkKVxuXHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0XHQkc2NvcGUudXNlcj11c2VyO1xuXHR9KVxuXHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0VXNlckZhY3RvcnkuZmV0Y2hHYW1lcygkc3RhdGVQYXJhbXMudXNlcklkKVxuXHR9KVxuXHQudGhlbihmdW5jdGlvbihnYW1lcyl7XG5cdFx0JHNjb3BlLmdhbWVzPWdhbWVzO1xuXHR9KVxufSkiLCJhcHAuZmFjdG9yeShcIlVzZXJGYWN0b3J5XCIsIGZ1bmN0aW9uKCRodHRwKXtcblx0cmV0dXJuIHtcblx0XHRmZXRjaEluZm9ybWF0aW9uOiBmdW5jdGlvbihpZCl7XG5cdFx0XHRyZXR1cm4gJGh0dHAuZ2V0KFwiL2FwaS91c2Vycy9cIitpZClcblx0XHRcdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHRcdFx0XHRyZXR1cm4gdXNlci5kYXRhO1xuXHRcdFx0fSlcblx0XHR9LFxuXHRcdGZldGNoR2FtZXM6IGZ1bmN0aW9uKGlkKXtcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoXCIvYXBpL3VzZXJzL1wiK2lkK1wiL2dhbWVzXCIpXG5cdFx0XHQudGhlbihmdW5jdGlvbihnYW1lcyl7XG5cdFx0XHRcdHJldHVybiBnYW1lcy5kYXRhO1xuXHRcdFx0fSlcblx0XHR9XG5cdH1cbn0pIiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdob21lJyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdZb3VyIFByb2ZpbGUnLCBzdGF0ZTogJ1VzZXJQcm9maWxlJywgYXV0aDogdHJ1ZSB9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcblxuICAgICAgICAgICAgc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UubG9nb3V0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHJlbW92ZVVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzZXRVc2VyKCk7XG5cbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0VXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCByZW1vdmVVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCByZW1vdmVVc2VyKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG59KTtcbiIsImFwcC5kaXJlY3RpdmUoXCJ0aW1lclwiLCBmdW5jdGlvbigkcSwgJGludGVydmFsLCBTb2NrZXQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgdGltZTogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIHRlbXBsYXRlVXJsOiBcImpzL2NvbW1vbi9kaXJlY3RpdmVzL3RpbWVyL3RpbWVyLmh0bWxcIixcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgICAgIHZhciB0aW1lID0gc2NvcGUudGltZTtcbiAgICAgICAgICAgIHZhciBzdGFydD1zY29wZS50aW1lO1xuICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBjb252ZXJ0KHRpbWUpO1xuICAgICAgICAgICAgc2NvcGUuY291bnRkb3duID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRpbWVyID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB0aW1lIC09IDE7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gY29udmVydCh0aW1lKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRpbWUgPCAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IFwiVGltZSB1cCFcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwodGltZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGltZT1zdGFydDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gc2NvcGUubWVzc2FnZXMgPSBbXCJHZXQgUmVhZHkhXCIsIFwiR2V0IFNldCFcIiwgXCJHbyFcIiwgJy8nXTtcbiAgICAgICAgICAgIC8vICAgICB2YXIgaW5kZXggPSAwO1xuICAgICAgICAgICAgLy8gICAgIHZhciBwcmVwYXJlID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IHNjb3BlLm1lc3NhZ2VzW2luZGV4XTtcbiAgICAgICAgICAgIC8vICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICAgIC8vICAgICAgICAgY29uc29sZS5sb2coc2NvcGUudGltZV9yZW1haW5pbmcpO1xuICAgICAgICAgICAgLy8gICAgICAgICBpZiAoc2NvcGUudGltZV9yZW1haW5pbmcgPT09IFwiL1wiKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IGNvbnZlcnQodGltZSk7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKHByZXBhcmUpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgdmFyIHRpbWVyID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgIHRpbWUgLT0gMTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IGNvbnZlcnQodGltZSk7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgaWYgKHRpbWUgPCAxKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gXCJUaW1lIHVwIVwiO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKHRpbWVyKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgfVxuICAgICAgICAgICAgLy8gICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgLy8gfTtcblxuICAgICAgICAgICAgU29ja2V0Lm9uKCdzdGFydEJvYXJkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuY291bnRkb3duKHRpbWUpO1xuICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgZnVuY3Rpb24gY29udmVydCh0aW1lKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlY29uZHMgPSAodGltZSAlIDYwKS50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgIHZhciBjb252ZXJzaW9uID0gKE1hdGguZmxvb3IodGltZSAvIDYwKSkgKyAnOic7XG4gICAgICAgICAgICAgICAgaWYgKHNlY29uZHMubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgICAgICAgICBjb252ZXJzaW9uICs9ICcwJyArIHNlY29uZHM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29udmVyc2lvbiArPSBzZWNvbmRzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gY29udmVyc2lvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0pXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
