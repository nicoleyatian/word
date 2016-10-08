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

app.config(function ($stateProvider) {

    // Register our *about* state.
    $stateProvider.state('about', {
        url: '/about',
        controller: 'AboutController',
        templateUrl: 'js/about/about.html'
    });
});

app.controller('AboutController', function ($scope, FullstackPics) {

    // Images of beautiful Fullstack people.
    $scope.images = _.shuffle(FullstackPics);
});

app.config(function ($stateProvider) {
    $stateProvider.state('docs', {
        url: '/docs',
        templateUrl: 'js/docs/docs.html'
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

        Socket.on('gameOver', function (winnersArray, words) {
            $scope.clear();
            $scope.$digest();
            $scope.freeze = true;
            console.log('game is over, winners: ', winnersArray, words);
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
app.factory('FullstackPics', function () {
    return ['https://pbs.twimg.com/media/B7gBXulCAAAXQcE.jpg:large', 'https://fbcdn-sphotos-c-a.akamaihd.net/hphotos-ak-xap1/t31.0-8/10862451_10205622990359241_8027168843312841137_o.jpg', 'https://pbs.twimg.com/media/B-LKUshIgAEy9SK.jpg', 'https://pbs.twimg.com/media/B79-X7oCMAAkw7y.jpg', 'https://pbs.twimg.com/media/B-Uj9COIIAIFAh0.jpg:large', 'https://pbs.twimg.com/media/B6yIyFiCEAAql12.jpg:large', 'https://pbs.twimg.com/media/CE-T75lWAAAmqqJ.jpg:large', 'https://pbs.twimg.com/media/CEvZAg-VAAAk932.jpg:large', 'https://pbs.twimg.com/media/CEgNMeOXIAIfDhK.jpg:large', 'https://pbs.twimg.com/media/CEQyIDNWgAAu60B.jpg:large', 'https://pbs.twimg.com/media/CCF3T5QW8AE2lGJ.jpg:large', 'https://pbs.twimg.com/media/CAeVw5SWoAAALsj.jpg:large', 'https://pbs.twimg.com/media/CAaJIP7UkAAlIGs.jpg:large', 'https://pbs.twimg.com/media/CAQOw9lWEAAY9Fl.jpg:large', 'https://pbs.twimg.com/media/B-OQbVrCMAANwIM.jpg:large', 'https://pbs.twimg.com/media/B9b_erwCYAAwRcJ.png:large', 'https://pbs.twimg.com/media/B5PTdvnCcAEAl4x.jpg:large', 'https://pbs.twimg.com/media/B4qwC0iCYAAlPGh.jpg:large', 'https://pbs.twimg.com/media/B2b33vRIUAA9o1D.jpg:large', 'https://pbs.twimg.com/media/BwpIwr1IUAAvO2_.jpg:large', 'https://pbs.twimg.com/media/BsSseANCYAEOhLw.jpg:large', 'https://pbs.twimg.com/media/CJ4vLfuUwAAda4L.jpg:large', 'https://pbs.twimg.com/media/CI7wzjEVEAAOPpS.jpg:large', 'https://pbs.twimg.com/media/CIdHvT2UsAAnnHV.jpg:large', 'https://pbs.twimg.com/media/CGCiP_YWYAAo75V.jpg:large', 'https://pbs.twimg.com/media/CIS4JPIWIAI37qu.jpg:large'];
});

app.factory('RandomGreetings', function () {

    var getRandomFromArray = function getRandomFromArray(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    };

    var greetings = ['Hello, world!', 'At long last, I live!', 'Hello, simple human.', 'What a beautiful day!', 'I\'m like any other project, except that I am yours. :)', 'This empty string is for Lindsay Levine.', 'こんにちは、ユーザー様。', 'Welcome. To. WEBSITE.', ':D', 'Yes, I think we\'ve met before.', 'Gimme 3 mins... I just grabbed this really dope frittata', 'If Cooper could offer only one piece of advice, it would be to nevSQUIRREL!'];

    return {
        greetings: greetings,
        getRandomGreeting: function getRandomGreeting() {
            return getRandomFromArray(greetings);
        }
    };
});

app.directive('navbar', function ($rootScope, AuthService, AUTH_EVENTS, $state) {

    return {
        restrict: 'E',
        scope: {},
        templateUrl: 'js/common/directives/navbar/navbar.html',
        link: function link(scope) {

            scope.items = [{ label: 'Home', state: 'home' }, { label: 'About', state: 'about' }, { label: 'Your Profile', state: 'UserProfile', auth: true }];

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

app.directive('fullstackLogo', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/fullstack-logo/fullstack-logo.html'
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZG9jcy9kb2NzLmpzIiwiZnNhL2ZzYS1wcmUtYnVpbHQuanMiLCJnYW1lLXN0YXRlL2dyaWQuY29udHJvbGxlci5qcyIsImdhbWUtc3RhdGUvZ3JpZC5mYWN0b3J5LmpzIiwiaG9tZS9ob21lLmNvbnRyb2xsZXIuanMiLCJob21lL2hvbWUuanMiLCJsZWFkZXJCb2FyZC9sZWFkZXJCb2FyZC5jb250cm9sbGVyLmpzIiwibGVhZGVyQm9hcmQvbGVhZGVyQm9hcmQuZmFjdG9yeS5qcyIsImxlYWRlckJvYXJkL2xlYWRlckJvYXJkLnN0YXRlLmpzIiwibG9iYnkvbG9iYnkuY29udHJvbGxlci5qcyIsImxvYmJ5L2xvYmJ5LmRpcmVjdGl2ZS5qcyIsImxvYmJ5L2xvYmJ5LmZhY3RvcnkuanMiLCJsb2JieS9sb2JieS5zdGF0ZS5qcyIsImxvZ2luL2xvZ2luLmpzIiwibWVtYmVycy1vbmx5L21lbWJlcnMtb25seS5qcyIsInJhbmsvcmFuay5kaXJlY3RpdmUuanMiLCJzaWdudXAvc2lnbnVwLmZhY3RvcnkuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwidXNlcl9wcm9maWxlL3Byb2ZpbGUuY29udHJvbGxlci5qcyIsInVzZXJfcHJvZmlsZS9wcm9maWxlLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL0Z1bGxzdGFja1BpY3MuanMiLCJjb21tb24vZmFjdG9yaWVzL1JhbmRvbUdyZWV0aW5ncy5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvdGltZXIvdGltZXIuanMiXSwibmFtZXMiOlsid2luZG93IiwiYXBwIiwiYW5ndWxhciIsIm1vZHVsZSIsImNvbmZpZyIsIiR1cmxSb3V0ZXJQcm92aWRlciIsIiRsb2NhdGlvblByb3ZpZGVyIiwiaHRtbDVNb2RlIiwib3RoZXJ3aXNlIiwid2hlbiIsImxvY2F0aW9uIiwicmVsb2FkIiwicnVuIiwiJHJvb3RTY29wZSIsIiRvbiIsImV2ZW50IiwidG9TdGF0ZSIsInRvUGFyYW1zIiwiZnJvbVN0YXRlIiwiZnJvbVBhcmFtcyIsInRocm93bkVycm9yIiwiY29uc29sZSIsImluZm8iLCJuYW1lIiwiZXJyb3IiLCJBdXRoU2VydmljZSIsIiRzdGF0ZSIsImRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgiLCJzdGF0ZSIsImRhdGEiLCJhdXRoZW50aWNhdGUiLCJpc0F1dGhlbnRpY2F0ZWQiLCJwcmV2ZW50RGVmYXVsdCIsImdldExvZ2dlZEluVXNlciIsInRoZW4iLCJ1c2VyIiwiZ28iLCIkc3RhdGVQcm92aWRlciIsInVybCIsImNvbnRyb2xsZXIiLCJ0ZW1wbGF0ZVVybCIsIiRzY29wZSIsIkZ1bGxzdGFja1BpY3MiLCJpbWFnZXMiLCJfIiwic2h1ZmZsZSIsIkVycm9yIiwiZmFjdG9yeSIsImlvIiwib3JpZ2luIiwiY29uc3RhbnQiLCJsb2dpblN1Y2Nlc3MiLCJsb2dpbkZhaWxlZCIsImxvZ291dFN1Y2Nlc3MiLCJzZXNzaW9uVGltZW91dCIsIm5vdEF1dGhlbnRpY2F0ZWQiLCJub3RBdXRob3JpemVkIiwiJHEiLCJBVVRIX0VWRU5UUyIsInN0YXR1c0RpY3QiLCJyZXNwb25zZUVycm9yIiwicmVzcG9uc2UiLCIkYnJvYWRjYXN0Iiwic3RhdHVzIiwicmVqZWN0IiwiJGh0dHBQcm92aWRlciIsImludGVyY2VwdG9ycyIsInB1c2giLCIkaW5qZWN0b3IiLCJnZXQiLCJzZXJ2aWNlIiwiJGh0dHAiLCJTZXNzaW9uIiwib25TdWNjZXNzZnVsTG9naW4iLCJjcmVhdGUiLCJmcm9tU2VydmVyIiwiY2F0Y2giLCJsb2dpbiIsImNyZWRlbnRpYWxzIiwicG9zdCIsIm1lc3NhZ2UiLCJsb2dvdXQiLCJkZXN0cm95Iiwic2VsZiIsIkJvYXJkRmFjdG9yeSIsIlNvY2tldCIsIiRzdGF0ZVBhcmFtcyIsIkxvYmJ5RmFjdG9yeSIsImxvZyIsImV4cG9ydHMiLCJwbGF5ZXJJZCIsImlkIiwicm9vbU5hbWUiLCJyb29tbmFtZSIsIm90aGVyUGxheWVycyIsImdhbWVMZW5ndGgiLCJ3b3JkT2JqIiwid29yZCIsInN0YXRlTnVtYmVyIiwicG9pbnRzRWFybmVkIiwibW91c2VJc0Rvd24iLCJkcmFnZ2luZ0FsbG93ZWQiLCJzdHlsZSIsImZyZWV6ZSIsImNoZWNrU2VsZWN0ZWQiLCJ0b2dnbGVEcmFnIiwibW91c2VEb3duIiwibW91c2VVcCIsImxlbmd0aCIsInN1Ym1pdCIsImRyYWciLCJzcGFjZSIsImNsaWNrIiwiZ2V0Q3VycmVudFJvb20iLCJyb29tIiwiZ2FtZUlkIiwidXNlcnMiLCJmaWx0ZXIiLCJmb3JFYWNoIiwicGxheWVyIiwic2NvcmUiLCJqb2luR2FtZSIsImhpZGVCb2FyZCIsInN0YXJ0R2FtZSIsInVzZXJJZHMiLCJtYXAiLCJnZXRTdGFydEJvYXJkIiwicXVpdCIsImhpZGVOYXZiYXIiLCJib2FyZCIsIm1lc3NhZ2VzIiwic2l6ZSIsImx0cnNTZWxlY3RlZCIsIk9iamVjdCIsImtleXMiLCJwcmV2aW91c0x0ciIsImxhc3RMdHIiLCJ2YWxpZFNlbGVjdCIsInN1YnN0cmluZyIsImx0cklkIiwib3RoZXJMdHJzSWRzIiwiaW5jbHVkZXMiLCJjb29yZHMiLCJzcGxpdCIsInJvdyIsImNvbCIsImxhc3RMdHJJZCIsInBvcCIsImNvb3Jkc0xhc3QiLCJyb3dMYXN0IiwiY29sTGFzdCIsInJvd09mZnNldCIsIk1hdGgiLCJhYnMiLCJjb2xPZmZzZXQiLCJjbGVhcklmQ29uZmxpY3RpbmciLCJ1cGRhdGVXb3JkT2JqIiwiZXhwb3J0V29yZE9iaiIsInRpbGVzTW92ZWQiLCJteVdvcmRUaWxlcyIsInNvbWUiLCJjb29yZCIsImNsZWFyIiwib2JqIiwidXBkYXRlQm9hcmQiLCJrZXkiLCJ1cGRhdGVTY29yZSIsInBvaW50cyIsInVwZGF0ZSIsInVwZGF0ZU9iaiIsIiRldmFsQXN5bmMiLCJyZXBsYXkiLCJuZXdHYW1lIiwiZGlzY29ubmVjdCIsIm9uIiwiZW1pdCIsIiRkaWdlc3QiLCJsYXN0V29yZFBsYXllZCIsInVzZXJJZCIsIndpbm5lcnNBcnJheSIsIndvcmRzIiwicmVzIiwicXVpdEZyb21Sb29tIiwiZGVsZXRlIiwiJGxvY2F0aW9uIiwiZW50ZXJMb2JieSIsIkxlYWRlckJvYXJkRmFjdG9yeSIsIkFsbFBsYXllcnMiLCJwbGF5ZXJzIiwiZ2FtZXMiLCJzY29yZXMiLCJnYW1lIiwidXNlckdhbWUiLCJoaWdoZXN0U2NvcmUiLCJtYXgiLCJnYW1lc193b24iLCJ3aW5uZXIiLCJnYW1lc19wbGF5ZWQiLCJ3aW5fcGVyY2VudGFnZSIsInRvRml4ZWQiLCJyZXNvbHZlIiwiYWxsUGxheWVycyIsInJvb21zIiwicm9vbU5hbWVGb3JtIiwibmV3Um9vbSIsInJvb21JbmZvIiwic2hvd0Zvcm0iLCJkaXJlY3RpdmUiLCJyZXN0cmljdCIsInRlbXBSb29tcyIsImdldEFsbFJvb21zIiwiY29weSIsInJvb21JZCIsInB1dCIsInNlbmRMb2dpbiIsImxvZ2luSW5mbyIsInRlbXBsYXRlIiwiU2VjcmV0U3Rhc2giLCJnZXRTdGFzaCIsInN0YXNoIiwic2NvcGUiLCJyYW5rTmFtZSIsInJhbmtCeSIsIm9yZGVyIiwiU2lnbnVwRmFjdG9yeSIsImNyZWF0ZVVzZXIiLCJzaWdudXBJbmZvIiwiZW1haWwiLCJwYXNzd29yZCIsInNpZ251cCIsInNlbmRTaWdudXAiLCJVc2VyRmFjdG9yeSIsImZldGNoSW5mb3JtYXRpb24iLCJ1cGRhdGVkIiwidXBkYXRlZEF0IiwiZ2V0RGF5IiwiZmV0Y2hHYW1lcyIsImdldFJhbmRvbUZyb21BcnJheSIsImFyciIsImZsb29yIiwicmFuZG9tIiwiZ3JlZXRpbmdzIiwiZ2V0UmFuZG9tR3JlZXRpbmciLCJsaW5rIiwiaXRlbXMiLCJsYWJlbCIsImF1dGgiLCJpc0xvZ2dlZEluIiwic2V0VXNlciIsInJlbW92ZVVzZXIiLCJSYW5kb21HcmVldGluZ3MiLCJncmVldGluZyIsIiRpbnRlcnZhbCIsInRpbWUiLCJzdGFydCIsInRpbWVfcmVtYWluaW5nIiwiY29udmVydCIsImNvdW50ZG93biIsInRpbWVyIiwiY2FuY2VsIiwic2Vjb25kcyIsInRvU3RyaW5nIiwiY29udmVyc2lvbiJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7QUFDQUEsT0FBQUMsR0FBQSxHQUFBQyxRQUFBQyxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLFdBQUEsQ0FBQSxDQUFBOztBQUVBRixJQUFBRyxNQUFBLENBQUEsVUFBQUMsa0JBQUEsRUFBQUMsaUJBQUEsRUFBQTtBQUNBO0FBQ0FBLHNCQUFBQyxTQUFBLENBQUEsSUFBQTtBQUNBO0FBQ0FGLHVCQUFBRyxTQUFBLENBQUEsR0FBQTtBQUNBO0FBQ0FILHVCQUFBSSxJQUFBLENBQUEsaUJBQUEsRUFBQSxZQUFBO0FBQ0FULGVBQUFVLFFBQUEsQ0FBQUMsTUFBQTtBQUNBLEtBRkE7QUFHQSxDQVRBOztBQVdBO0FBQ0FWLElBQUFXLEdBQUEsQ0FBQSxVQUFBQyxVQUFBLEVBQUE7QUFDQUEsZUFBQUMsR0FBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQUMsS0FBQSxFQUFBQyxPQUFBLEVBQUFDLFFBQUEsRUFBQUMsU0FBQSxFQUFBQyxVQUFBLEVBQUFDLFdBQUEsRUFBQTtBQUNBQyxnQkFBQUMsSUFBQSxnRkFBQU4sUUFBQU8sSUFBQTtBQUNBRixnQkFBQUcsS0FBQSxDQUFBSixXQUFBO0FBQ0EsS0FIQTtBQUlBLENBTEE7O0FBT0E7QUFDQW5CLElBQUFXLEdBQUEsQ0FBQSxVQUFBQyxVQUFBLEVBQUFZLFdBQUEsRUFBQUMsTUFBQSxFQUFBOztBQUVBO0FBQ0EsUUFBQUMsK0JBQUEsU0FBQUEsNEJBQUEsQ0FBQUMsS0FBQSxFQUFBO0FBQ0EsZUFBQUEsTUFBQUMsSUFBQSxJQUFBRCxNQUFBQyxJQUFBLENBQUFDLFlBQUE7QUFDQSxLQUZBOztBQUlB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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBekssbUJBQUF5RixFQUFBLENBQUEsWUFBQSxFQUFBLFlBQUE7QUFDQThDLHNCQUFBcUMsU0FBQSxDQUFBSixJQUFBO0FBQ0EsYUFGQTs7QUFLQSxxQkFBQUcsT0FBQSxDQUFBSCxJQUFBLEVBQUE7QUFDQSxvQkFBQU8sVUFBQSxDQUFBUCxPQUFBLEVBQUEsRUFBQVEsUUFBQSxFQUFBO0FBQ0Esb0JBQUFDLGFBQUE5RyxLQUFBdUYsS0FBQSxDQUFBYyxPQUFBLEVBQUEsQ0FBQSxHQUFBLEdBQUE7QUFDQSxvQkFBQU8sUUFBQXhKLE1BQUEsR0FBQSxDQUFBLEVBQUE7QUFDQTBKLGtDQUFBLE1BQUFGLE9BQUE7QUFDQSxpQkFGQSxNQUVBO0FBQ0FFLGtDQUFBRixPQUFBO0FBQ0E7QUFDQSx1QkFBQUUsVUFBQTtBQUNBO0FBQ0E7QUExREEsS0FBQTtBQTREQSxDQTdEQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xud2luZG93LmFwcCA9IGFuZ3VsYXIubW9kdWxlKCdGdWxsc3RhY2tHZW5lcmF0ZWRBcHAnLCBbJ2ZzYVByZUJ1aWx0JywgJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnbmdBbmltYXRlJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG4gICAgLy8gVHJpZ2dlciBwYWdlIHJlZnJlc2ggd2hlbiBhY2Nlc3NpbmcgYW4gT0F1dGggcm91dGVcbiAgICAkdXJsUm91dGVyUHJvdmlkZXIud2hlbignL2F1dGgvOnByb3ZpZGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgfSk7XG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBsaXN0ZW5pbmcgdG8gZXJyb3JzIGJyb2FkY2FzdGVkIGJ5IHVpLXJvdXRlciwgdXN1YWxseSBvcmlnaW5hdGluZyBmcm9tIHJlc29sdmVzXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlKSB7XG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZUVycm9yJywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcywgZnJvbVN0YXRlLCBmcm9tUGFyYW1zLCB0aHJvd25FcnJvcikge1xuICAgICAgICBjb25zb2xlLmluZm8oYFRoZSBmb2xsb3dpbmcgZXJyb3Igd2FzIHRocm93biBieSB1aS1yb3V0ZXIgd2hpbGUgdHJhbnNpdGlvbmluZyB0byBzdGF0ZSBcIiR7dG9TdGF0ZS5uYW1lfVwiLiBUaGUgb3JpZ2luIG9mIHRoaXMgZXJyb3IgaXMgcHJvYmFibHkgYSByZXNvbHZlIGZ1bmN0aW9uOmApO1xuICAgICAgICBjb25zb2xlLmVycm9yKHRocm93bkVycm9yKTtcbiAgICB9KTtcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxuICAgIHZhciBkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xuICAgIH07XG5cbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMpIHtcblxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHVzZXIgaXMgcmV0cmlldmVkLCB0aGVuIHJlbmF2aWdhdGUgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXG4gICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAvLyBSZWdpc3RlciBvdXIgKmFib3V0KiBzdGF0ZS5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnYWJvdXQnLCB7XG4gICAgICAgIHVybDogJy9hYm91dCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBYm91dENvbnRyb2xsZXInLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Fib3V0L2Fib3V0Lmh0bWwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignQWJvdXRDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgRnVsbHN0YWNrUGljcykge1xuXG4gICAgLy8gSW1hZ2VzIG9mIGJlYXV0aWZ1bCBGdWxsc3RhY2sgcGVvcGxlLlxuICAgICRzY29wZS5pbWFnZXMgPSBfLnNodWZmbGUoRnVsbHN0YWNrUGljcyk7XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZG9jcycsIHtcbiAgICAgICAgdXJsOiAnL2RvY3MnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2RvY3MvZG9jcy5odG1sJ1xuICAgIH0pO1xufSk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxuICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHRocm93IG5ldyBFcnJvcignSSBjYW5cXCd0IGZpbmQgQW5ndWxhciEnKTtcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbXSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnU29ja2V0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXdpbmRvdy5pbykgdGhyb3cgbmV3IEVycm9yKCdzb2NrZXQuaW8gbm90IGZvdW5kIScpO1xuICAgICAgICByZXR1cm4gd2luZG93LmlvKHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pO1xuICAgIH0pO1xuXG4gICAgLy8gQVVUSF9FVkVOVFMgaXMgdXNlZCB0aHJvdWdob3V0IG91ciBhcHAgdG9cbiAgICAvLyBicm9hZGNhc3QgYW5kIGxpc3RlbiBmcm9tIGFuZCB0byB0aGUgJHJvb3RTY29wZVxuICAgIC8vIGZvciBpbXBvcnRhbnQgZXZlbnRzIGFib3V0IGF1dGhlbnRpY2F0aW9uIGZsb3cuXG4gICAgYXBwLmNvbnN0YW50KCdBVVRIX0VWRU5UUycsIHtcbiAgICAgICAgbG9naW5TdWNjZXNzOiAnYXV0aC1sb2dpbi1zdWNjZXNzJyxcbiAgICAgICAgbG9naW5GYWlsZWQ6ICdhdXRoLWxvZ2luLWZhaWxlZCcsXG4gICAgICAgIGxvZ291dFN1Y2Nlc3M6ICdhdXRoLWxvZ291dC1zdWNjZXNzJyxcbiAgICAgICAgc2Vzc2lvblRpbWVvdXQ6ICdhdXRoLXNlc3Npb24tdGltZW91dCcsXG4gICAgICAgIG5vdEF1dGhlbnRpY2F0ZWQ6ICdhdXRoLW5vdC1hdXRoZW50aWNhdGVkJyxcbiAgICAgICAgbm90QXV0aG9yaXplZDogJ2F1dGgtbm90LWF1dGhvcml6ZWQnXG4gICAgfSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnQXV0aEludGVyY2VwdG9yJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRxLCBBVVRIX0VWRU5UUykge1xuICAgICAgICB2YXIgc3RhdHVzRGljdCA9IHtcbiAgICAgICAgICAgIDQwMTogQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCxcbiAgICAgICAgICAgIDQwMzogQVVUSF9FVkVOVFMubm90QXV0aG9yaXplZCxcbiAgICAgICAgICAgIDQxOTogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsXG4gICAgICAgICAgICA0NDA6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3Qoc3RhdHVzRGljdFtyZXNwb25zZS5zdGF0dXNdLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIGFwcC5jb25maWcoZnVuY3Rpb24gKCRodHRwUHJvdmlkZXIpIHtcbiAgICAgICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaChbXG4gICAgICAgICAgICAnJGluamVjdG9yJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uICgkaW5qZWN0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGluamVjdG9yLmdldCgnQXV0aEludGVyY2VwdG9yJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIF0pO1xuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ0F1dGhTZXJ2aWNlJywgZnVuY3Rpb24gKCRodHRwLCBTZXNzaW9uLCAkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUywgJHEpIHtcblxuICAgICAgICBmdW5jdGlvbiBvblN1Y2Nlc3NmdWxMb2dpbihyZXNwb25zZSkge1xuICAgICAgICAgICAgdmFyIHVzZXIgPSByZXNwb25zZS5kYXRhLnVzZXI7XG4gICAgICAgICAgICBTZXNzaW9uLmNyZWF0ZSh1c2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MpO1xuICAgICAgICAgICAgcmV0dXJuIHVzZXI7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2VzIHRoZSBzZXNzaW9uIGZhY3RvcnkgdG8gc2VlIGlmIGFuXG4gICAgICAgIC8vIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBjdXJyZW50bHkgcmVnaXN0ZXJlZC5cbiAgICAgICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gISFTZXNzaW9uLnVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRMb2dnZWRJblVzZXIgPSBmdW5jdGlvbiAoZnJvbVNlcnZlcikge1xuXG4gICAgICAgICAgICAvLyBJZiBhbiBhdXRoZW50aWNhdGVkIHNlc3Npb24gZXhpc3RzLCB3ZVxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxuICAgICAgICAgICAgLy8gYWx3YXlzIGludGVyZmFjZSB3aXRoIHRoaXMgbWV0aG9kIGFzeW5jaHJvbm91c2x5LlxuXG4gICAgICAgICAgICAvLyBPcHRpb25hbGx5LCBpZiB0cnVlIGlzIGdpdmVuIGFzIHRoZSBmcm9tU2VydmVyIHBhcmFtZXRlcixcbiAgICAgICAgICAgIC8vIHRoZW4gdGhpcyBjYWNoZWQgdmFsdWUgd2lsbCBub3QgYmUgdXNlZC5cblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkgJiYgZnJvbVNlcnZlciAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKFNlc3Npb24udXNlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1ha2UgcmVxdWVzdCBHRVQgL3Nlc3Npb24uXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgdXNlciwgY2FsbCBvblN1Y2Nlc3NmdWxMb2dpbiB3aXRoIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSA0MDEgcmVzcG9uc2UsIHdlIGNhdGNoIGl0IGFuZCBpbnN0ZWFkIHJlc29sdmUgdG8gbnVsbC5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJykudGhlbihvblN1Y2Nlc3NmdWxMb2dpbikuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ2luID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZGVudGlhbHMpXG4gICAgICAgICAgICAgICAgLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLicgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgU2Vzc2lvbi5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMudXNlciA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgdGhpcy51c2VyID0gdXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbn0oKSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ0dhbWUnLCB7XG4gICAgICAgIHVybDogJy9nYW1lLzpyb29tbmFtZScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZ2FtZS1zdGF0ZS9wYWdlLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiBcIkdhbWVDdHJsXCIsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcblxuXG5hcHAuY29udHJvbGxlcignR2FtZUN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIEJvYXJkRmFjdG9yeSwgU29ja2V0LCAkc3RhdGVQYXJhbXMsIEF1dGhTZXJ2aWNlLCAkc3RhdGUsIExvYmJ5RmFjdG9yeSwgJHJvb3RTY29wZSkge1xuXG4gICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24odXNlcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3VzZXIgZnJvbSBBdXRoU2VydmljZScsIHVzZXIpO1xuICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMucGxheWVySWQgPSB1c2VyLmlkO1xuICAgICAgICB9KTtcblxuICAgICRzY29wZS5yb29tTmFtZSA9ICRzdGF0ZVBhcmFtcy5yb29tbmFtZTtcblxuICAgICRzY29wZS5vdGhlclBsYXllcnMgPSBbXTtcblxuICAgICRzY29wZS5nYW1lTGVuZ3RoID0gMTA7XG5cbiAgICAkc2NvcGUuZXhwb3J0cyA9IHtcbiAgICAgICAgd29yZE9iajoge30sXG4gICAgICAgIHdvcmQ6IFwiXCIsXG4gICAgICAgIHBsYXllcklkOiBudWxsLFxuICAgICAgICBzdGF0ZU51bWJlcjogMCxcbiAgICAgICAgcG9pbnRzRWFybmVkOiBudWxsXG4gICAgfTtcblxuICAgICRzY29wZS5tb3VzZUlzRG93biA9IGZhbHNlO1xuICAgICRzY29wZS5kcmFnZ2luZ0FsbG93ZWQgPSBmYWxzZTtcblxuICAgICRzY29wZS5zdHlsZSA9IG51bGw7XG4gICAgJHNjb3BlLm1lc3NhZ2UgPSAnJztcbiAgICAkc2NvcGUuZnJlZXplID0gZmFsc2U7XG5cbiAgICAkc2NvcGUuY2hlY2tTZWxlY3RlZCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIHJldHVybiBpZCBpbiAkc2NvcGUuZXhwb3J0cy53b3JkT2JqO1xuICAgIH07XG5cbiAgICAkc2NvcGUudG9nZ2xlRHJhZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkID0gISRzY29wZS5kcmFnZ2luZ0FsbG93ZWQ7XG4gICAgfTtcblxuICAgICRzY29wZS5tb3VzZURvd24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLm1vdXNlSXNEb3duID0gdHJ1ZTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm1vdXNlVXAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLm1vdXNlSXNEb3duID0gZmFsc2U7XG4gICAgICAgIGlmICgkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkICYmICRzY29wZS5leHBvcnRzLndvcmQubGVuZ3RoID4gMSkgJHNjb3BlLnN1Ym1pdCgkc2NvcGUuZXhwb3J0cyk7XG4gICAgfTtcblxuICAgICRzY29wZS5kcmFnID0gZnVuY3Rpb24oc3BhY2UsIGlkKSB7XG4gICAgICAgIGlmICgkc2NvcGUubW91c2VJc0Rvd24gJiYgJHNjb3BlLmRyYWdnaW5nQWxsb3dlZCkge1xuICAgICAgICAgICAgJHNjb3BlLmNsaWNrKHNwYWNlLCBpZCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cblxuICAgIC8vZ2V0IHRoZSBjdXJyZW50IHJvb20gaW5mb1xuICAgIEJvYXJkRmFjdG9yeS5nZXRDdXJyZW50Um9vbSgkc3RhdGVQYXJhbXMucm9vbW5hbWUpXG4gICAgICAgIC50aGVuKHJvb20gPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2cocm9vbSlcbiAgICAgICAgICAgICRzY29wZS5nYW1lSWQgPSByb29tLmlkO1xuICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVycyA9IHJvb20udXNlcnMuZmlsdGVyKHVzZXIgPT4gdXNlci5pZCAhPT0gJHNjb3BlLnVzZXIuaWQpO1xuICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVycy5mb3JFYWNoKHBsYXllciA9PiB7IHBsYXllci5zY29yZSA9IDAgfSlcbiAgICAgICAgICAgIExvYmJ5RmFjdG9yeS5qb2luR2FtZShyb29tLmlkLCAkc2NvcGUudXNlci5pZCk7XG4gICAgICAgIH0pO1xuXG4gICAgJHNjb3BlLmhpZGVCb2FyZCA9IHRydWU7XG5cbiAgICAvLyBTdGFydCB0aGUgZ2FtZSB3aGVuIGFsbCBwbGF5ZXJzIGhhdmUgam9pbmVkIHJvb21cbiAgICAkc2NvcGUuc3RhcnRHYW1lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB1c2VySWRzID0gJHNjb3BlLm90aGVyUGxheWVycy5tYXAodXNlciA9PiB1c2VyLmlkKTtcbiAgICAgICAgdXNlcklkcy5wdXNoKCRzY29wZS51c2VyLmlkKTtcbiAgICAgICAgY29uc29sZS5sb2coJ29wJywgJHNjb3BlLm90aGVyUGxheWVycywgJ3VpJywgdXNlcklkcyk7XG4gICAgICAgIEJvYXJkRmFjdG9yeS5nZXRTdGFydEJvYXJkKCRzY29wZS5nYW1lTGVuZ3RoLCAkc2NvcGUuZ2FtZUlkLCB1c2VySWRzKTtcbiAgICB9O1xuXG5cbiAgICAvL1F1aXQgdGhlIHJvb20sIGJhY2sgdG8gbG9iYnlcbiAgICAkc2NvcGUucXVpdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkcm9vdFNjb3BlLmhpZGVOYXZiYXIgPSBmYWxzZTtcbiAgICAgICAgJHN0YXRlLmdvKCdsb2JieScpXG4gICAgfTtcblxuXG4gICAgJHNjb3BlLmJvYXJkID0gW1xuICAgICAgICBbJ2InLCAnYScsICdkJywgJ2UnLCAnYScsICdyJ10sXG4gICAgICAgIFsnZScsICdmJywgJ2cnLCAnbCcsICdtJywgJ2UnXSxcbiAgICAgICAgWydoJywgJ2knLCAnaicsICdmJywgJ28nLCAnYSddLFxuICAgICAgICBbJ2MnLCAnYScsICdkJywgJ2UnLCAnYScsICdyJ10sXG4gICAgICAgIFsnZScsICdmJywgJ2cnLCAnbCcsICdkJywgJ2UnXSxcbiAgICAgICAgWydoJywgJ2knLCAnaicsICdmJywgJ28nLCAnYSddXG4gICAgXTtcblxuICAgICRzY29wZS5tZXNzYWdlcyA9IG51bGw7XG5cbiAgICAkc2NvcGUuc2l6ZSA9IDM7XG4gICAgJHNjb3BlLnNjb3JlID0gMDtcblxuXG4gICAgJHNjb3BlLmNsaWNrID0gZnVuY3Rpb24oc3BhY2UsIGlkKSB7XG4gICAgICAgIGlmICgkc2NvcGUuZnJlZXplKSB7XG4gICAgICAgICAgICByZXR1cm47IH1cbiAgICAgICAgY29uc29sZS5sb2coJ2NsaWNrZWQgJywgc3BhY2UsIGlkKTtcbiAgICAgICAgdmFyIGx0cnNTZWxlY3RlZCA9IE9iamVjdC5rZXlzKCRzY29wZS5leHBvcnRzLndvcmRPYmopO1xuICAgICAgICB2YXIgcHJldmlvdXNMdHIgPSBsdHJzU2VsZWN0ZWRbbHRyc1NlbGVjdGVkLmxlbmd0aCAtIDJdO1xuICAgICAgICB2YXIgbGFzdEx0ciA9IGx0cnNTZWxlY3RlZFtsdHJzU2VsZWN0ZWQubGVuZ3RoIC0gMV07XG4gICAgICAgIGlmICghbHRyc1NlbGVjdGVkLmxlbmd0aCB8fCB2YWxpZFNlbGVjdChpZCwgbHRyc1NlbGVjdGVkKSkge1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZCArPSBzcGFjZTtcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLndvcmRPYmpbaWRdID0gc3BhY2U7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygkc2NvcGUuZXhwb3J0cyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaWQgPT09IHByZXZpb3VzTHRyKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkID0gJHNjb3BlLmV4cG9ydHMud29yZC5zdWJzdHJpbmcoMCwgJHNjb3BlLmV4cG9ydHMud29yZC5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgIGRlbGV0ZSAkc2NvcGUuZXhwb3J0cy53b3JkT2JqW2xhc3RMdHJdO1xuICAgICAgICB9IGVsc2UgaWYgKGx0cnNTZWxlY3RlZC5sZW5ndGggPT09IDEgJiYgaWQgPT09IGxhc3RMdHIpIHtcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLndvcmQgPSBcIlwiO1xuICAgICAgICAgICAgZGVsZXRlICRzY29wZS5leHBvcnRzLndvcmRPYmpbbGFzdEx0cl07XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy9tYWtlcyBzdXJlIGxldHRlciBpcyBhZGphY2VudCB0byBwcmV2IGx0ciwgYW5kIGhhc24ndCBiZWVuIHVzZWQgeWV0XG4gICAgZnVuY3Rpb24gdmFsaWRTZWxlY3QobHRySWQsIG90aGVyTHRyc0lkcykge1xuICAgICAgICBpZiAob3RoZXJMdHJzSWRzLmluY2x1ZGVzKGx0cklkKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB2YXIgY29vcmRzID0gbHRySWQuc3BsaXQoJy0nKTtcbiAgICAgICAgdmFyIHJvdyA9IGNvb3Jkc1swXTtcbiAgICAgICAgdmFyIGNvbCA9IGNvb3Jkc1sxXTtcbiAgICAgICAgdmFyIGxhc3RMdHJJZCA9IG90aGVyTHRyc0lkcy5wb3AoKTtcbiAgICAgICAgdmFyIGNvb3Jkc0xhc3QgPSBsYXN0THRySWQuc3BsaXQoJy0nKTtcbiAgICAgICAgdmFyIHJvd0xhc3QgPSBjb29yZHNMYXN0WzBdO1xuICAgICAgICB2YXIgY29sTGFzdCA9IGNvb3Jkc0xhc3RbMV07XG4gICAgICAgIHZhciByb3dPZmZzZXQgPSBNYXRoLmFicyhyb3cgLSByb3dMYXN0KTtcbiAgICAgICAgdmFyIGNvbE9mZnNldCA9IE1hdGguYWJzKGNvbCAtIGNvbExhc3QpO1xuICAgICAgICByZXR1cm4gKHJvd09mZnNldCA8PSAxICYmIGNvbE9mZnNldCA8PSAxKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbGVhcklmQ29uZmxpY3RpbmcodXBkYXRlV29yZE9iaiwgZXhwb3J0V29yZE9iaikge1xuICAgICAgICB2YXIgdGlsZXNNb3ZlZCA9IE9iamVjdC5rZXlzKHVwZGF0ZVdvcmRPYmopO1xuICAgICAgICB2YXIgbXlXb3JkVGlsZXMgPSBPYmplY3Qua2V5cyhleHBvcnRXb3JkT2JqKTtcbiAgICAgICAgaWYgKHRpbGVzTW92ZWQuc29tZShjb29yZCA9PiBteVdvcmRUaWxlcy5pbmNsdWRlcyhjb29yZCkpKSAkc2NvcGUuY2xlYXIoKTtcbiAgICB9XG5cbiAgICAkc2NvcGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZCA9IFwiXCI7XG4gICAgICAgICRzY29wZS5leHBvcnRzLndvcmRPYmogPSB7fTtcbiAgICB9O1xuXG5cbiAgICAkc2NvcGUuc3VibWl0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdzdWJtaXR0aW5nICcsIG9iaik7XG4gICAgICAgIEJvYXJkRmFjdG9yeS5zdWJtaXQob2JqKTtcbiAgICAgICAgJHNjb3BlLmNsZWFyKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5zaHVmZmxlID0gQm9hcmRGYWN0b3J5LnNodWZmbGU7XG5cblxuICAgICRzY29wZS51cGRhdGVCb2FyZCA9IGZ1bmN0aW9uKHdvcmRPYmopIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3Njb3BlLmJvYXJkJywgJHNjb3BlLmJvYXJkKTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHdvcmRPYmopIHtcbiAgICAgICAgICAgIHZhciBjb29yZHMgPSBrZXkuc3BsaXQoJy0nKTtcbiAgICAgICAgICAgIHZhciByb3cgPSBjb29yZHNbMF07XG4gICAgICAgICAgICB2YXIgY29sID0gY29vcmRzWzFdO1xuICAgICAgICAgICAgJHNjb3BlLmJvYXJkW3Jvd11bY29sXSA9IHdvcmRPYmpba2V5XTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUudXBkYXRlU2NvcmUgPSBmdW5jdGlvbihwb2ludHMsIHBsYXllcklkKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCd1cGRhdGUgc2NvcmUgcG9pbnRzJywgcG9pbnRzKTtcbiAgICAgICAgaWYgKHBsYXllcklkID09PSAkc2NvcGUudXNlci5pZCkge1xuICAgICAgICAgICAgJHNjb3BlLnNjb3JlICs9IHBvaW50cztcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLnBvaW50c0Vhcm5lZCA9IG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBwbGF5ZXIgaW4gJHNjb3BlLm90aGVyUGxheWVycykge1xuICAgICAgICAgICAgICAgIGlmICgkc2NvcGUub3RoZXJQbGF5ZXJzW3BsYXllcl0uaWQgPT09IHBsYXllcklkKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnNbcGxheWVyXS5zY29yZSArPSBwb2ludHM7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLnBvaW50c0Vhcm5lZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICAkc2NvcGUudXBkYXRlID0gZnVuY3Rpb24odXBkYXRlT2JqKSB7XG4gICAgICAgICRzY29wZS51cGRhdGVTY29yZSh1cGRhdGVPYmoucG9pbnRzRWFybmVkLCB1cGRhdGVPYmoucGxheWVySWQpO1xuICAgICAgICAkc2NvcGUudXBkYXRlQm9hcmQodXBkYXRlT2JqLndvcmRPYmopO1xuICAgICAgICAkc2NvcGUubWVzc2FnZSA9IHVwZGF0ZU9iai5wbGF5ZXJJZCArIFwiIHBsYXllZCBcIiArIHVwZGF0ZU9iai53b3JkICsgXCIgZm9yIFwiICsgdXBkYXRlT2JqLnBvaW50c0Vhcm5lZCArIFwiIHBvaW50cyFcIjtcbiAgICAgICAgY29uc29sZS5sb2coJ2l0cyB1cGRhdGluZyEnKTtcbiAgICAgICAgY2xlYXJJZkNvbmZsaWN0aW5nKHVwZGF0ZU9iaiwgJHNjb3BlLmV4cG9ydHMud29yZE9iaik7XG4gICAgICAgICRzY29wZS5leHBvcnRzLnN0YXRlTnVtYmVyID0gdXBkYXRlT2JqLnN0YXRlTnVtYmVyO1xuICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgIH07XG5cbiAgICAkc2NvcGUucmVwbGF5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiR08hXCIpO1xuICAgICAgICBMb2JieUZhY3RvcnkubmV3R2FtZSgkc2NvcGUucm9vbU5hbWUpO1xuICAgICAgICAkc2NvcGUuc3RhcnRHYW1lKCk7XG4gICAgfTtcblxuICAgICRyb290U2NvcGUuaGlkZU5hdmJhciA9IHRydWU7XG5cbiAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkgeyBTb2NrZXQuZGlzY29ubmVjdCgpOyB9KTtcbiAgICBjb25zb2xlLmxvZygndXBkYXRlIDEuMScpXG4gICAgU29ja2V0Lm9uKCdjb25uZWN0JywgZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgU29ja2V0LmVtaXQoJ2pvaW5Sb29tJywgJHNjb3BlLnVzZXIsICRzY29wZS5yb29tTmFtZSwgJHNjb3BlLmdhbWVJZCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdlbWl0dGluZyBcImpvaW4gcm9vbVwiIGV2ZW50IHRvIHNlcnZlcicsICRzY29wZS5yb29tTmFtZSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCdyb29tSm9pblN1Y2Nlc3MnLCBmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnbmV3IHVzZXIgam9pbmluZycsIHVzZXIuaWQpO1xuICAgICAgICAgICAgdXNlci5zY29yZSA9IDA7XG4gICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzLnB1c2godXNlcik7XG4gICAgICAgICAgICAkc2NvcGUuJGRpZ2VzdCgpO1xuXG4gICAgICAgIH0pO1xuXG4gICAgICAgIFNvY2tldC5vbignc3RhcnRCb2FyZCcsIGZ1bmN0aW9uKGJvYXJkKSB7XG4gICAgICAgICAgICAkc2NvcGUuZnJlZXplID0gZmFsc2U7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnYm9hcmQhICcsIGJvYXJkKTtcbiAgICAgICAgICAgICRzY29wZS5ib2FyZCA9IGJvYXJkO1xuICAgICAgICAgICAgLy8gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICRzY29wZS5oaWRlQm9hcmQgPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgICAgICAvLyB9LCAzMDAwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCd3b3JkVmFsaWRhdGVkJywgZnVuY3Rpb24odXBkYXRlT2JqKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnd29yZCBpcyB2YWxpZGF0ZWQnKTtcbiAgICAgICAgICAgICRzY29wZS51cGRhdGUodXBkYXRlT2JqKTtcbiAgICAgICAgICAgICRzY29wZS5sYXN0V29yZFBsYXllZCA9IHVwZGF0ZU9iai53b3JkO1xuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCdib2FyZFNodWZmbGVkJywgZnVuY3Rpb24oYm9hcmQsIHVzZXJJZCwgc3RhdGVOdW1iZXIpIHtcbiAgICAgICAgICAgICRzY29wZS5ib2FyZCA9IGJvYXJkO1xuICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZVNjb3JlKC01LCB1c2VySWQpO1xuICAgICAgICAgICAgJHNjb3BlLmNsZWFyKCk7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy5zdGF0ZU51bWJlciA9IHN0YXRlTnVtYmVyO1xuICAgICAgICAgICAgJHNjb3BlLm1lc3NhZ2UgPSB1c2VySWQgKyBcIiBzaHVmZmxlZCB0aGUgYm9hcmQhXCI7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygkc2NvcGUubWVzc2FnZSk7XG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICBTb2NrZXQub24oJ3BsYXllckRpc2Nvbm5lY3RlZCcsIGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwbGF5ZXJEaXNjb25uZWN0ZWQnLCB1c2VyLmlkKTtcbiAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMgPSAkc2NvcGUub3RoZXJQbGF5ZXJzLm1hcChvdGhlclBsYXllcnMgPT4gb3RoZXJQbGF5ZXJzLmlkICE9PSB1c2VyLmlkKTtcblxuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCdnYW1lT3ZlcicsIGZ1bmN0aW9uKHdpbm5lcnNBcnJheSwgd29yZHMpIHtcbiAgICAgICAgICAgICRzY29wZS5jbGVhcigpO1xuICAgICAgICAgICAgJHNjb3BlLiRkaWdlc3QoKTtcbiAgICAgICAgICAgICRzY29wZS5mcmVlemUgPSB0cnVlO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2dhbWUgaXMgb3Zlciwgd2lubmVyczogJywgd2lubmVyc0FycmF5LCB3b3Jkcyk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSk7XG4iLCJhcHAuZmFjdG9yeSAoXCJCb2FyZEZhY3RvcnlcIiwgZnVuY3Rpb24oJGh0dHAsIFNvY2tldCl7XG5cdHJldHVybntcblx0XHRnZXRTdGFydEJvYXJkOiBmdW5jdGlvbihnYW1lTGVuZ3RoLCBnYW1lSWQsIHVzZXJJZHMpe1xuXHRcdFx0Y29uc29sZS5sb2coJ2ZhY3RvcnkuIGdsOiAnLCBnYW1lTGVuZ3RoKTtcblx0XHRcdFNvY2tldC5lbWl0KCdnZXRTdGFydEJvYXJkJywgZ2FtZUxlbmd0aCwgZ2FtZUlkLCB1c2VySWRzKTtcblx0XHR9LFxuXG5cdFx0c3VibWl0OiBmdW5jdGlvbihvYmope1xuXHRcdFx0U29ja2V0LmVtaXQoJ3N1Ym1pdFdvcmQnLCBvYmopO1xuXHRcdH0sXG5cblx0XHRzaHVmZmxlOiBmdW5jdGlvbih1c2VyKXtcblx0XHRcdGNvbnNvbGUubG9nKCdncmlkZmFjdG9yeSB1Jyx1c2VyLmlkKTtcblx0XHRcdFNvY2tldC5lbWl0KCdzaHVmZmxlQm9hcmQnLHVzZXIuaWQpO1xuXHRcdH0sXG5cblx0XHQvLyBmaW5kQWxsT3RoZXJVc2VyczogZnVuY3Rpb24oZ2FtZSkge1xuXHRcdC8vIFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS9nYW1lcy8nKyBnYW1lLmlkKVxuXHRcdC8vIFx0LnRoZW4ocmVzID0+IHJlcy5kYXRhKVxuXHRcdC8vIH0sXG5cblx0XHRnZXRDdXJyZW50Um9vbTogZnVuY3Rpb24ocm9vbW5hbWUpIHtcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvZ2FtZXMvcm9vbXMvJytyb29tbmFtZSlcblx0XHRcdC50aGVuKHJlcyA9PiByZXMuZGF0YSlcblx0XHR9LFxuXG5cdFx0cXVpdEZyb21Sb29tOiBmdW5jdGlvbihnYW1lSWQsIHVzZXJJZCkge1xuXHRcdFx0Ly8gU29ja2V0LmVtaXQoJ2Rpc2Nvbm5lY3QnLCByb29tTmFtZSwgdXNlcklkKTtcblx0XHRcdHJldHVybiAkaHR0cC5kZWxldGUoJy9hcGkvZ2FtZXMvJytnYW1lSWQrJy8nK3VzZXJJZClcblx0XHR9XG5cdH1cbn0pO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ0hvbWVDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGUsICRsb2NhdGlvbil7XG4gICRzY29wZS5lbnRlckxvYmJ5ID0gZnVuY3Rpb24oKXtcbiAgICAkc3RhdGUuZ28oJ2xvYmJ5Jywge3JlbG9hZDogdHJ1ZX0pO1xuICB9XG59KTtcblxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcbiAgICAgICAgdXJsOiAnLycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaG9tZS9ob21lLmh0bWwnXG4gICAgfSk7XG59KTtcblxuIiwiYXBwLmNvbnRyb2xsZXIoJ0xlYWRlckJvYXJkQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgTGVhZGVyQm9hcmRGYWN0b3J5LCAkc3RhdGUsIEF1dGhTZXJ2aWNlKSB7XG4gICAgY29uc29sZS5sb2coJyAxJylcbiAgICBMZWFkZXJCb2FyZEZhY3RvcnkuQWxsUGxheWVycygpXG4gICAgLnRoZW4ocGxheWVycyA9PiB7XG4gICAgICAgIHBsYXllcnMuZm9yRWFjaChwbGF5ZXIgPT4ge1xuICAgICAgICAgICAgaWYgKHBsYXllci5nYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNjb3JlcyA9IHBsYXllci5nYW1lcy5tYXAoZ2FtZSA9PiBnYW1lLnVzZXJHYW1lLnNjb3JlKVxuICAgICAgICAgICAgICAgIHBsYXllci5oaWdoZXN0U2NvcmUgPSBNYXRoLm1heCguLi5zY29yZXMpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBsYXllci5oaWdoZXN0U2NvcmUgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGxheWVyLmdhbWVzX3dvbiA9IHBsYXllci53aW5uZXIubGVuZ3RoO1xuICAgICAgICAgICAgcGxheWVyLmdhbWVzX3BsYXllZCA9IHBsYXllci5nYW1lcy5sZW5ndGg7XG4gICAgICAgICAgICBpZihwbGF5ZXIuZ2FtZXMubGVuZ3RoPT09MCl7XG4gICAgICAgICAgICBcdHBsYXllci53aW5fcGVyY2VudGFnZSA9IDAgKyAnJSdcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBcdHBsYXllci53aW5fcGVyY2VudGFnZSA9ICgocGxheWVyLndpbm5lci5sZW5ndGgvcGxheWVyLmdhbWVzLmxlbmd0aCkqMTAwKS50b0ZpeGVkKDApICsgJyUnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pXG4gICAgICAgICRzY29wZS5wbGF5ZXJzID0gcGxheWVycztcbiAgICB9KVxufSk7XG4iLCJhcHAuZmFjdG9yeSgnTGVhZGVyQm9hcmRGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG5cdHZhciBMZWFkZXJCb2FyZEZhY3RvcnkgPSB7fTtcblxuXHRMZWFkZXJCb2FyZEZhY3RvcnkuQWxsUGxheWVycyA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvdXNlcnMnKVxuXHRcdC50aGVuKHJlcz0+cmVzLmRhdGEpXG5cdH1cblxuXHRyZXR1cm4gTGVhZGVyQm9hcmRGYWN0b3J5O1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xlYWRlckJvYXJkJywge1xuICAgICAgICB1cmw6ICcvbGVhZGVyQm9hcmQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xlYWRlckJvYXJkL2xlYWRlckJvYXJkLnRlbXBsYXRlLmh0bWwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgIFx0YWxsUGxheWVyczogZnVuY3Rpb24oTGVhZGVyQm9hcmRGYWN0b3J5KSB7XG4gICAgICAgIFx0XHRyZXR1cm4gTGVhZGVyQm9hcmRGYWN0b3J5LkFsbFBsYXllcnM7XG4gICAgICAgIFx0fSxcbiAgICAgICAgICAgIFxuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiAnTGVhZGVyQm9hcmRDdHJsJ1xuICAgIH0pO1xuXG59KTsiLCJhcHAuY29udHJvbGxlcignTG9iYnlDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBMb2JieUZhY3RvcnksIHJvb21zLCAkc3RhdGUsIEF1dGhTZXJ2aWNlKSB7XG5cbiAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKVxuICAgICAgICAudGhlbihmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygndXNlciBmcm9tIEF1dGhTZXJ2aWNlJywgdXNlcik7XG4gICAgICAgICAgICAkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgIH0pO1xuXG4gICAgJHNjb3BlLnJvb21zID0gcm9vbXM7XG4gICAgJHNjb3BlLnJvb21OYW1lRm9ybSA9IGZhbHNlO1xuICAgIC8vICRzY29wZS51c2VyID0ge1xuICAgIC8vICBpZDogM1xuICAgIC8vIH1cblxuICAgICRzY29wZS5qb2luR2FtZSA9IGZ1bmN0aW9uKHJvb20pIHtcbiAgICAgICAgJHN0YXRlLmdvKCdHYW1lJywgeyByb29tbmFtZTogcm9vbS5yb29tbmFtZSB9KVxuICAgIH1cblxuICAgICRzY29wZS5uZXdSb29tID0gZnVuY3Rpb24ocm9vbUluZm8pIHtcbiAgICAgICAgTG9iYnlGYWN0b3J5Lm5ld0dhbWUocm9vbUluZm8pO1xuICAgICAgICAkc2NvcGUucm9vbU5hbWVGb3JtID0gZmFsc2U7XG4gICAgfVxuICAgICRzY29wZS5zaG93Rm9ybSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUucm9vbU5hbWVGb3JtID0gdHJ1ZTtcbiAgICB9XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnZW50ZXJMb2JieScsIGZ1bmN0aW9uKCl7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvYmJ5L2xvYmJ5LWJ1dHRvbi5odG1sJyxcbiAgICBjb250cm9sbGVyOiAnSG9tZUN0cmwnXG4gIH1cbn0pXG4iLCJhcHAuZmFjdG9yeSgnTG9iYnlGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG5cdHZhciBMb2JieUZhY3RvcnkgPSB7fTtcblx0dmFyIHRlbXBSb29tcyA9IFtdOyAvL3dvcmsgd2l0aCBzb2NrZXQ/XG5cblx0TG9iYnlGYWN0b3J5LmdldEFsbFJvb21zID0gZnVuY3Rpb24oKXtcblx0XHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2dhbWVzL3Jvb21zJylcblx0XHQudGhlbihyZXMgPT4gcmVzLmRhdGEpXG5cdFx0LnRoZW4ocm9vbXMgPT4ge1xuXHRcdFx0YW5ndWxhci5jb3B5KHJvb21zLCB0ZW1wUm9vbXMpO1xuXHRcdFx0cmV0dXJuIHRlbXBSb29tcztcblx0XHR9KVxuXHR9O1xuXG5cdExvYmJ5RmFjdG9yeS5qb2luR2FtZSA9IGZ1bmN0aW9uKHJvb21JZCwgdXNlcklkKSB7XG4gICAgY29uc29sZS5sb2coJ2xvYmJ5IGZhY3Rvcnkgam9pbiBnYW1lJyk7XG5cdFx0cmV0dXJuICRodHRwLnB1dCgnL2FwaS9nYW1lcy8nKyByb29tSWQgKycvcGxheWVyJywge2lkOiB1c2VySWR9KVxuXHRcdC50aGVuKHJlcz0+cmVzLmRhdGEpXG5cdH07XG5cblx0TG9iYnlGYWN0b3J5Lm5ld0dhbWUgPSBmdW5jdGlvbihyb29tSW5mbykge1xuXHRcdHJldHVybiAkaHR0cC5wdXQoJy9hcGkvZ2FtZXMnLCByb29tSW5mbylcblx0XHQudGhlbihyZXMgPT4gcmVzLmRhdGEpXG5cdFx0LnRoZW4ocm9vbSA9PiB7dGVtcFJvb21zLnB1c2gocm9vbSl9KVxuXHR9XG5cblx0TG9iYnlGYWN0b3J5LkFsbFBsYXllcnMgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3VzZXJzJylcblx0XHQudGhlbihyZXM9PnJlcy5kYXRhKVxuXHR9XG5cblx0cmV0dXJuIExvYmJ5RmFjdG9yeTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsb2JieScsIHtcbiAgICAgICAgdXJsOiAnL2xvYmJ5JyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2JieS9sb2JieS50ZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICBcdHJvb21zOiBmdW5jdGlvbihMb2JieUZhY3RvcnkpIHtcbiAgICAgICAgXHRcdHJldHVybiBMb2JieUZhY3RvcnkuZ2V0QWxsUm9vbXMoKTtcbiAgICAgICAgXHR9XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2JieUN0cmwnXG4gICAgfSk7XG5cbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbiAobG9naW5JbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ21lbWJlcnNPbmx5Jywge1xuICAgICAgICB1cmw6ICcvbWVtYmVycy1hcmVhJyxcbiAgICAgICAgdGVtcGxhdGU6ICc8aW1nIG5nLXJlcGVhdD1cIml0ZW0gaW4gc3Rhc2hcIiB3aWR0aD1cIjMwMFwiIG5nLXNyYz1cInt7IGl0ZW0gfX1cIiAvPicsXG4gICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUsIFNlY3JldFN0YXNoKSB7XG4gICAgICAgICAgICBTZWNyZXRTdGFzaC5nZXRTdGFzaCgpLnRoZW4oZnVuY3Rpb24gKHN0YXNoKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnN0YXNoID0gc3Rhc2g7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBkYXRhLmF1dGhlbnRpY2F0ZSBpcyByZWFkIGJ5IGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KTtcblxufSk7XG5cbmFwcC5mYWN0b3J5KCdTZWNyZXRTdGFzaCcsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG4gICAgdmFyIGdldFN0YXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL21lbWJlcnMvc2VjcmV0LXN0YXNoJykudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0U3Rhc2g6IGdldFN0YXNoXG4gICAgfTtcblxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdyYW5rRGlyZWN0aXZlJywgKCk9PiB7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdFJyxcblx0XHRzY29wZToge1xuXHRcdFx0cmFua05hbWU6ICdAJyxcblx0XHRcdHBsYXllcnM6ICc9Jyxcblx0XHRcdHJhbmtCeTogJ0AnLFxuXHRcdFx0b3JkZXI6ICdAJ1xuXHRcdH0sXG5cdFx0dGVtcGxhdGVVcmw6ICcvanMvcmFuay9yYW5rLnRlbXBsYXRlLmh0bWwnXG5cdH1cbn0pOyIsImFwcC5mYWN0b3J5KCdTaWdudXBGYWN0b3J5JywgZnVuY3Rpb24oJGh0dHAsICRzdGF0ZSwgQXV0aFNlcnZpY2UpIHtcblx0Y29uc3QgU2lnbnVwRmFjdG9yeSA9IHt9O1xuXG5cdFNpZ251cEZhY3RvcnkuY3JlYXRlVXNlciA9IGZ1bmN0aW9uKHNpZ251cEluZm8pIHtcblx0XHRjb25zb2xlLmxvZyhzaWdudXBJbmZvKVxuXHRcdHJldHVybiAkaHR0cC5wb3N0KCcvc2lnbnVwJywgc2lnbnVwSW5mbylcblx0XHQudGhlbihyZXMgPT4ge1xuXHRcdFx0aWYgKHJlcy5zdGF0dXMgPT09IDIwMSkge1xuXHRcdFx0XHRBdXRoU2VydmljZS5sb2dpbih7ZW1haWw6IHNpZ251cEluZm8uZW1haWwsIHBhc3N3b3JkOiBzaWdudXBJbmZvLnBhc3N3b3JkfSlcblx0XHRcdFx0LnRoZW4odXNlciA9PiB7XG5cdFx0XHRcdFx0JHN0YXRlLmdvKCdob21lJylcblx0XHRcdFx0fSlcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRocm93IEVycm9yKCdBbiBhY2NvdW50IHdpdGggdGhhdCBlbWFpbCBhbHJlYWR5IGV4aXN0cycpO1xuXHRcdFx0fVxuXHRcdH0pXG5cdH1cblxuXHRyZXR1cm4gU2lnbnVwRmFjdG9yeTtcbn0pIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzaWdudXAnLCB7XG4gICAgICAgIHVybDogJy9zaWdudXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3NpZ251cC9zaWdudXAuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTaWdudXBDdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ1NpZ251cEN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlLCBTaWdudXBGYWN0b3J5KSB7XG5cbiAgICAkc2NvcGUuc2lnbnVwID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kU2lnbnVwID0gZnVuY3Rpb24oc2lnbnVwSW5mbyl7XG4gICAgICAgIFNpZ251cEZhY3RvcnkuY3JlYXRlVXNlcihzaWdudXBJbmZvKVxuICAgICAgICAuY2F0Y2goKCkgPT4ge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0FuIGFjY291bnQgd2l0aCB0aGF0IGVtYWlsIGFscmVhZHkgZXhpc3RzJztcbiAgICAgICAgfSlcbiAgICB9XG4gICAgXG5cblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKXtcblx0JHN0YXRlUHJvdmlkZXIuc3RhdGUoXCJVc2VyUHJvZmlsZVwiLHtcblx0XHR1cmw6IFwiL3VzZXJzLzp1c2VySWRcIixcblx0XHR0ZW1wbGF0ZVVybDpcImpzL3VzZXJfcHJvZmlsZS9wcm9maWxlLnRlbXBsYXRlLmh0bWxcIixcblx0XHRjb250cm9sbGVyOiBcIlVzZXJDdHJsXCJcblx0fSlcblx0JHN0YXRlUHJvdmlkZXIuc3RhdGUoXCJHYW1lUmVjb3JkXCIsIHtcblx0XHR1cmw6XCIvdXNlcnMvOnVzZXJJZC9nYW1lc1wiLFxuXHRcdHRlbXBsYXRlVXJsOiBcImpzL3VzZXJfcHJvZmlsZS9nYW1lcy5odG1sXCIsXG5cdFx0Y29udHJvbGxlcjogXCJHYW1lUmVjb3JkQ3RybFwiXG5cdH0pXG59KVxuXG5hcHAuY29udHJvbGxlcihcIlVzZXJDdHJsXCIsIGZ1bmN0aW9uKCRzY29wZSwgVXNlckZhY3RvcnksICRzdGF0ZVBhcmFtcyl7XG5cdFVzZXJGYWN0b3J5LmZldGNoSW5mb3JtYXRpb24oJHN0YXRlUGFyYW1zLnVzZXJJZClcblx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG5cdFx0JHNjb3BlLnVzZXI9dXNlcjtcblx0XHRyZXR1cm4gdXNlclxuXHR9KVxuXHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0XHQkc2NvcGUudXBkYXRlZD0kc2NvcGUudXNlci51cGRhdGVkQXQuZ2V0RGF5KCk7XG5cdH0pXG59KVxuXG5hcHAuY29udHJvbGxlcihcIkdhbWVSZWNvcmRDdHJsXCIsZnVuY3Rpb24oJHNjb3BlLCBVc2VyRmFjdG9yeSwgJHN0YXRlUGFyYW1zKXtcblx0VXNlckZhY3RvcnkuZmV0Y2hJbmZvcm1hdGlvbigkc3RhdGVQYXJhbXMudXNlcklkKVxuXHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0XHQkc2NvcGUudXNlcj11c2VyO1xuXHR9KVxuXHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0VXNlckZhY3RvcnkuZmV0Y2hHYW1lcygkc3RhdGVQYXJhbXMudXNlcklkKVxuXHR9KVxuXHQudGhlbihmdW5jdGlvbihnYW1lcyl7XG5cdFx0JHNjb3BlLmdhbWVzPWdhbWVzO1xuXHR9KVxufSkiLCJhcHAuZmFjdG9yeShcIlVzZXJGYWN0b3J5XCIsIGZ1bmN0aW9uKCRodHRwKXtcblx0cmV0dXJuIHtcblx0XHRmZXRjaEluZm9ybWF0aW9uOiBmdW5jdGlvbihpZCl7XG5cdFx0XHRyZXR1cm4gJGh0dHAuZ2V0KFwiL2FwaS91c2Vycy9cIitpZClcblx0XHRcdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHRcdFx0XHRyZXR1cm4gdXNlci5kYXRhO1xuXHRcdFx0fSlcblx0XHR9LFxuXHRcdGZldGNoR2FtZXM6IGZ1bmN0aW9uKGlkKXtcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoXCIvYXBpL3VzZXJzL1wiK2lkK1wiL2dhbWVzXCIpXG5cdFx0XHQudGhlbihmdW5jdGlvbihnYW1lcyl7XG5cdFx0XHRcdHJldHVybiBnYW1lcy5kYXRhO1xuXHRcdFx0fSlcblx0XHR9XG5cdH1cbn0pIiwiYXBwLmZhY3RvcnkoJ0Z1bGxzdGFja1BpY3MnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CN2dCWHVsQ0FBQVhRY0UuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vZmJjZG4tc3Bob3Rvcy1jLWEuYWthbWFpaGQubmV0L2hwaG90b3MtYWsteGFwMS90MzEuMC04LzEwODYyNDUxXzEwMjA1NjIyOTkwMzU5MjQxXzgwMjcxNjg4NDMzMTI4NDExMzdfby5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItTEtVc2hJZ0FFeTlTSy5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I3OS1YN29DTUFBa3c3eS5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItVWo5Q09JSUFJRkFoMC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I2eUl5RmlDRUFBcWwxMi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFLVQ3NWxXQUFBbXFxSi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFdlpBZy1WQUFBazkzMi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFZ05NZU9YSUFJZkRoSy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFUXlJRE5XZ0FBdTYwQi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NDRjNUNVFXOEFFMmxHSi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBZVZ3NVNXb0FBQUxzai5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBYUpJUDdVa0FBbElHcy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBUU93OWxXRUFBWTlGbC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItT1FiVnJDTUFBTndJTS5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I5Yl9lcndDWUFBd1JjSi5wbmc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I1UFRkdm5DY0FFQWw0eC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I0cXdDMGlDWUFBbFBHaC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0IyYjMzdlJJVUFBOW8xRC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0J3cEl3cjFJVUFBdk8yXy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0JzU3NlQU5DWUFFT2hMdy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NKNHZMZnVVd0FBZGE0TC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJN3d6akVWRUFBT1BwUy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJZEh2VDJVc0FBbm5IVi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NHQ2lQX1lXWUFBbzc1Vi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJUzRKUElXSUFJMzdxdS5qcGc6bGFyZ2UnXG4gICAgXTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1JhbmRvbUdyZWV0aW5ncycsIGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBnZXRSYW5kb21Gcm9tQXJyYXkgPSBmdW5jdGlvbiAoYXJyKSB7XG4gICAgICAgIHJldHVybiBhcnJbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogYXJyLmxlbmd0aCldO1xuICAgIH07XG5cbiAgICB2YXIgZ3JlZXRpbmdzID0gW1xuICAgICAgICAnSGVsbG8sIHdvcmxkIScsXG4gICAgICAgICdBdCBsb25nIGxhc3QsIEkgbGl2ZSEnLFxuICAgICAgICAnSGVsbG8sIHNpbXBsZSBodW1hbi4nLFxuICAgICAgICAnV2hhdCBhIGJlYXV0aWZ1bCBkYXkhJyxcbiAgICAgICAgJ0lcXCdtIGxpa2UgYW55IG90aGVyIHByb2plY3QsIGV4Y2VwdCB0aGF0IEkgYW0geW91cnMuIDopJyxcbiAgICAgICAgJ1RoaXMgZW1wdHkgc3RyaW5nIGlzIGZvciBMaW5kc2F5IExldmluZS4nLFxuICAgICAgICAn44GT44KT44Gr44Gh44Gv44CB44Om44O844K244O85qeY44CCJyxcbiAgICAgICAgJ1dlbGNvbWUuIFRvLiBXRUJTSVRFLicsXG4gICAgICAgICc6RCcsXG4gICAgICAgICdZZXMsIEkgdGhpbmsgd2VcXCd2ZSBtZXQgYmVmb3JlLicsXG4gICAgICAgICdHaW1tZSAzIG1pbnMuLi4gSSBqdXN0IGdyYWJiZWQgdGhpcyByZWFsbHkgZG9wZSBmcml0dGF0YScsXG4gICAgICAgICdJZiBDb29wZXIgY291bGQgb2ZmZXIgb25seSBvbmUgcGllY2Ugb2YgYWR2aWNlLCBpdCB3b3VsZCBiZSB0byBuZXZTUVVJUlJFTCEnLFxuICAgIF07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBncmVldGluZ3M6IGdyZWV0aW5ncyxcbiAgICAgICAgZ2V0UmFuZG9tR3JlZXRpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRSYW5kb21Gcm9tQXJyYXkoZ3JlZXRpbmdzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdob21lJyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdBYm91dCcsIHN0YXRlOiAnYWJvdXQnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ1lvdXIgUHJvZmlsZScsIHN0YXRlOiAnVXNlclByb2ZpbGUnLCBhdXRoOiB0cnVlIH1cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuXG4gICAgICAgICAgICBzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBzZXRVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgcmVtb3ZlVXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNldFVzZXIoKTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIHJlbW92ZVVzZXIpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnZnVsbHN0YWNrTG9nbycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmh0bWwnXG4gICAgfTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgncmFuZG9HcmVldGluZycsIGZ1bmN0aW9uIChSYW5kb21HcmVldGluZ3MpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICAgICAgc2NvcGUuZ3JlZXRpbmcgPSBSYW5kb21HcmVldGluZ3MuZ2V0UmFuZG9tR3JlZXRpbmcoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZShcInRpbWVyXCIsIGZ1bmN0aW9uKCRxLCAkaW50ZXJ2YWwsIFNvY2tldCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICB0aW1lOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgdGVtcGxhdGVVcmw6IFwianMvY29tbW9uL2RpcmVjdGl2ZXMvdGltZXIvdGltZXIuaHRtbFwiLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICAgICAgdmFyIHRpbWUgPSBzY29wZS50aW1lO1xuICAgICAgICAgICAgdmFyIHN0YXJ0PXNjb3BlLnRpbWU7XG4gICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IGNvbnZlcnQodGltZSk7XG4gICAgICAgICAgICBzY29wZS5jb3VudGRvd24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGltZXIgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWUgLT0gMTtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBjb252ZXJ0KHRpbWUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGltZSA8IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gXCJUaW1lIHVwIVwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbCh0aW1lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lPXN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBzY29wZS5tZXNzYWdlcyA9IFtcIkdldCBSZWFkeSFcIiwgXCJHZXQgU2V0IVwiLCBcIkdvIVwiLCAnLyddO1xuICAgICAgICAgICAgLy8gICAgIHZhciBpbmRleCA9IDA7XG4gICAgICAgICAgICAvLyAgICAgdmFyIHByZXBhcmUgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gc2NvcGUubWVzc2FnZXNbaW5kZXhdO1xuICAgICAgICAgICAgLy8gICAgICAgICBpbmRleCsrO1xuICAgICAgICAgICAgLy8gICAgICAgICBjb25zb2xlLmxvZyhzY29wZS50aW1lX3JlbWFpbmluZyk7XG4gICAgICAgICAgICAvLyAgICAgICAgIGlmIChzY29wZS50aW1lX3JlbWFpbmluZyA9PT0gXCIvXCIpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gY29udmVydCh0aW1lKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwocHJlcGFyZSk7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICB2YXIgdGltZXIgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgdGltZSAtPSAxO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gY29udmVydCh0aW1lKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICBpZiAodGltZSA8IDEpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBcIlRpbWUgdXAhXCI7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwodGltZXIpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgLy8gICAgICAgICB9XG4gICAgICAgICAgICAvLyAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICAvLyB9O1xuXG4gICAgICAgICAgICBTb2NrZXQub24oJ3N0YXJ0Qm9hcmQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5jb3VudGRvd24odGltZSk7XG4gICAgICAgICAgICB9KTtcblxuXG4gICAgICAgICAgICBmdW5jdGlvbiBjb252ZXJ0KHRpbWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2Vjb25kcyA9ICh0aW1lICUgNjApLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgdmFyIGNvbnZlcnNpb24gPSAoTWF0aC5mbG9vcih0aW1lIC8gNjApKSArICc6JztcbiAgICAgICAgICAgICAgICBpZiAoc2Vjb25kcy5sZW5ndGggPCAyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnZlcnNpb24gKz0gJzAnICsgc2Vjb25kcztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb252ZXJzaW9uICs9IHNlY29uZHM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBjb252ZXJzaW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSlcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
