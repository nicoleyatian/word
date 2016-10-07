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

    $scope.roomName = $stateParams.roomname;

    $scope.otherPlayers = [];

    $scope.gameLength = 30;

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

    AuthService.getLoggedInUser().then(function (user) {
        console.log('user from AuthService', user);
        $scope.user = user;
        $scope.exports.playerId = user.id;
    });

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
        // BoardFactory.quitFromRoom($scope.gameId, $scope.user.id)
        //     .then(() => {
        //         $state.go('lobby');
        //     });

        $rootScope.hideNavbar = false;
        $state.go('lobby');
    };

    $scope.board = [['b', 'a', 'd', 'e', 'a', 'r'], ['e', 'f', 'g', 'l', 'm', 'e'], ['h', 'i', 'j', 'f', 'o', 'a'], ['c', 'a', 'd', 'e', 'a', 'r'], ['e', 'f', 'g', 'l', 'd', 'e'], ['h', 'i', 'j', 'f', 'o', 'a']];

    $scope.messages = null;

    $scope.size = 3;
    $scope.score = 0;
    // $scope.playerName = 'Me';
    // $scope.player = $scope.user.id;

    // $scope.otherPlayers = [{ name: 'You', score: 0, id: 1 },
    //     { name: 'Him', score: 0, id: 2 },
    //     { name: 'Her', score: 0, id: 3 }
    // ];

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

    // $scope.submit = function() {
    //     return BoardFactory.submit()
    //         // .then(function(x) {
    //         //     $scope.exports.wordObj = {};
    //         //     $scope.exports.word = "";
    //         });
    // };


    $scope.submit = function (obj) {
        console.log('submitting ', obj);
        BoardFactory.submit(obj);
        $scope.clear();
    };

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
            // var playerIds = [];
            // $scope.otherPlayers.forEach(otherPlayer => {
            //     playerIds.push(otherPlayer.id)
            // });
            // if (playerIds.indexOf(user.id) === -1) {
            // }
            $scope.otherPlayers.push(user);
            $scope.$digest();

            // BoardFactory.getCurrentRoom($stateParams.roomname)
            //     .then(room => {
            //         console.log(room)
            //         $scope.gameId = room.id;
            //         $scope.otherPlayers = room.users.filter(user => user.id !== $scope.user.id);
            //         $scope.otherPlayers.forEach(player => { player.score = 0 })
            //     })
        });

        // Socket.on('roomData', function(data) {
        //     console.log('listening for roomData event from server')
        //     if (data.count.length < 2) {
        //         $scope.messages = "Waiting for another player";
        //         console.log('scope message: ', $scope.messages)
        //     } else {
        //         $scope.messages = null;
        //     }
        // })

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

app.directive('fullstackLogo', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/fullstack-logo/fullstack-logo.html'
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZG9jcy9kb2NzLmpzIiwiZnNhL2ZzYS1wcmUtYnVpbHQuanMiLCJnYW1lLXN0YXRlL2dyaWQuY29udHJvbGxlci5qcyIsImdhbWUtc3RhdGUvZ3JpZC5mYWN0b3J5LmpzIiwiaG9tZS9ob21lLmNvbnRyb2xsZXIuanMiLCJob21lL2hvbWUuanMiLCJsZWFkZXJCb2FyZC9sZWFkZXJCb2FyZC5jb250cm9sbGVyLmpzIiwibGVhZGVyQm9hcmQvbGVhZGVyQm9hcmQuZmFjdG9yeS5qcyIsImxlYWRlckJvYXJkL2xlYWRlckJvYXJkLnN0YXRlLmpzIiwibG9iYnkvbG9iYnkuY29udHJvbGxlci5qcyIsImxvYmJ5L2xvYmJ5LmRpcmVjdGl2ZS5qcyIsImxvYmJ5L2xvYmJ5LmZhY3RvcnkuanMiLCJsb2JieS9sb2JieS5zdGF0ZS5qcyIsImxvZ2luL2xvZ2luLmpzIiwibWVtYmVycy1vbmx5L21lbWJlcnMtb25seS5qcyIsInJhbmsvcmFuay5kaXJlY3RpdmUuanMiLCJzaWdudXAvc2lnbnVwLmZhY3RvcnkuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwidXNlcl9wcm9maWxlL3Byb2ZpbGUuY29udHJvbGxlci5qcyIsInVzZXJfcHJvZmlsZS9wcm9maWxlLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL0Z1bGxzdGFja1BpY3MuanMiLCJjb21tb24vZmFjdG9yaWVzL1JhbmRvbUdyZWV0aW5ncy5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvdGltZXIvdGltZXIuanMiXSwibmFtZXMiOlsid2luZG93IiwiYXBwIiwiYW5ndWxhciIsIm1vZHVsZSIsImNvbmZpZyIsIiR1cmxSb3V0ZXJQcm92aWRlciIsIiRsb2NhdGlvblByb3ZpZGVyIiwiaHRtbDVNb2RlIiwib3RoZXJ3aXNlIiwid2hlbiIsImxvY2F0aW9uIiwicmVsb2FkIiwicnVuIiwiJHJvb3RTY29wZSIsIiRvbiIsImV2ZW50IiwidG9TdGF0ZSIsInRvUGFyYW1zIiwiZnJvbVN0YXRlIiwiZnJvbVBhcmFtcyIsInRocm93bkVycm9yIiwiY29uc29sZSIsImluZm8iLCJuYW1lIiwiZXJyb3IiLCJBdXRoU2VydmljZSIsIiRzdGF0ZSIsImRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgiLCJzdGF0ZSIsImRhdGEiLCJhdXRoZW50aWNhdGUiLCJpc0F1dGhlbnRpY2F0ZWQiLCJwcmV2ZW50RGVmYXVsdCIsImdldExvZ2dlZEluVXNlciIsInRoZW4iLCJ1c2VyIiwiZ28iLCIkc3RhdGVQcm92aWRlciIsInVybCIsImNvbnRyb2xsZXIiLCJ0ZW1wbGF0ZVVybCIsIiRzY29wZSIsIkZ1bGxzdGFja1BpY3MiLCJpbWFnZXMiLCJfIiwic2h1ZmZsZSIsIkVycm9yIiwiZmFjdG9yeSIsImlvIiwib3JpZ2luIiwiY29uc3RhbnQiLCJsb2dpblN1Y2Nlc3MiLCJsb2dpbkZhaWxlZCIsImxvZ291dFN1Y2Nlc3MiLCJzZXNzaW9uVGltZW91dCIsIm5vdEF1dGhlbnRpY2F0ZWQiLCJub3RBdXRob3JpemVkIiwiJHEiLCJBVVRIX0VWRU5UUyIsInN0YXR1c0RpY3QiLCJyZXNwb25zZUVycm9yIiwicmVzcG9uc2UiLCIkYnJvYWRjYXN0Iiwic3RhdHVzIiwicmVqZWN0IiwiJGh0dHBQcm92aWRlciIsImludGVyY2VwdG9ycyIsInB1c2giLCIkaW5qZWN0b3IiLCJnZXQiLCJzZXJ2aWNlIiwiJGh0dHAiLCJTZXNzaW9uIiwib25TdWNjZXNzZnVsTG9naW4iLCJjcmVhdGUiLCJmcm9tU2VydmVyIiwiY2F0Y2giLCJsb2dpbiIsImNyZWRlbnRpYWxzIiwicG9zdCIsIm1lc3NhZ2UiLCJsb2dvdXQiLCJkZXN0cm95Iiwic2VsZiIsIkJvYXJkRmFjdG9yeSIsIlNvY2tldCIsIiRzdGF0ZVBhcmFtcyIsIkxvYmJ5RmFjdG9yeSIsInJvb21OYW1lIiwicm9vbW5hbWUiLCJvdGhlclBsYXllcnMiLCJnYW1lTGVuZ3RoIiwiZXhwb3J0cyIsIndvcmRPYmoiLCJ3b3JkIiwicGxheWVySWQiLCJzdGF0ZU51bWJlciIsInBvaW50c0Vhcm5lZCIsIm1vdXNlSXNEb3duIiwiZHJhZ2dpbmdBbGxvd2VkIiwic3R5bGUiLCJmcmVlemUiLCJjaGVja1NlbGVjdGVkIiwiaWQiLCJ0b2dnbGVEcmFnIiwibW91c2VEb3duIiwibW91c2VVcCIsImxlbmd0aCIsInN1Ym1pdCIsImRyYWciLCJzcGFjZSIsImNsaWNrIiwibG9nIiwiZ2V0Q3VycmVudFJvb20iLCJyb29tIiwiZ2FtZUlkIiwidXNlcnMiLCJmaWx0ZXIiLCJmb3JFYWNoIiwicGxheWVyIiwic2NvcmUiLCJqb2luR2FtZSIsImhpZGVCb2FyZCIsInN0YXJ0R2FtZSIsInVzZXJJZHMiLCJtYXAiLCJnZXRTdGFydEJvYXJkIiwicXVpdCIsImhpZGVOYXZiYXIiLCJib2FyZCIsIm1lc3NhZ2VzIiwic2l6ZSIsImx0cnNTZWxlY3RlZCIsIk9iamVjdCIsImtleXMiLCJwcmV2aW91c0x0ciIsImxhc3RMdHIiLCJ2YWxpZFNlbGVjdCIsInN1YnN0cmluZyIsImx0cklkIiwib3RoZXJMdHJzSWRzIiwiaW5jbHVkZXMiLCJjb29yZHMiLCJzcGxpdCIsInJvdyIsImNvbCIsImxhc3RMdHJJZCIsInBvcCIsImNvb3Jkc0xhc3QiLCJyb3dMYXN0IiwiY29sTGFzdCIsInJvd09mZnNldCIsIk1hdGgiLCJhYnMiLCJjb2xPZmZzZXQiLCJjbGVhcklmQ29uZmxpY3RpbmciLCJ1cGRhdGVXb3JkT2JqIiwiZXhwb3J0V29yZE9iaiIsInRpbGVzTW92ZWQiLCJteVdvcmRUaWxlcyIsInNvbWUiLCJjb29yZCIsImNsZWFyIiwib2JqIiwidXBkYXRlQm9hcmQiLCJrZXkiLCJ1cGRhdGVTY29yZSIsInBvaW50cyIsInVwZGF0ZSIsInVwZGF0ZU9iaiIsIiRldmFsQXN5bmMiLCJyZXBsYXkiLCJuZXdHYW1lIiwiZGlzY29ubmVjdCIsIm9uIiwiZW1pdCIsIiRkaWdlc3QiLCJsYXN0V29yZFBsYXllZCIsInJlcyIsInF1aXRGcm9tUm9vbSIsInVzZXJJZCIsImRlbGV0ZSIsIiRsb2NhdGlvbiIsImVudGVyTG9iYnkiLCJMZWFkZXJCb2FyZEZhY3RvcnkiLCJBbGxQbGF5ZXJzIiwicGxheWVycyIsImdhbWVzIiwic2NvcmVzIiwiZ2FtZSIsInVzZXJHYW1lIiwiaGlnaGVzdFNjb3JlIiwibWF4IiwiZ2FtZXNfd29uIiwid2lubmVyIiwiZ2FtZXNfcGxheWVkIiwid2luX3BlcmNlbnRhZ2UiLCJ0b0ZpeGVkIiwicmVzb2x2ZSIsImFsbFBsYXllcnMiLCJyb29tcyIsInJvb21OYW1lRm9ybSIsIm5ld1Jvb20iLCJyb29tSW5mbyIsInNob3dGb3JtIiwiZGlyZWN0aXZlIiwicmVzdHJpY3QiLCJ0ZW1wUm9vbXMiLCJnZXRBbGxSb29tcyIsImNvcHkiLCJyb29tSWQiLCJwdXQiLCJzZW5kTG9naW4iLCJsb2dpbkluZm8iLCJ0ZW1wbGF0ZSIsIlNlY3JldFN0YXNoIiwiZ2V0U3Rhc2giLCJzdGFzaCIsInNjb3BlIiwicmFua05hbWUiLCJyYW5rQnkiLCJvcmRlciIsIlNpZ251cEZhY3RvcnkiLCJjcmVhdGVVc2VyIiwic2lnbnVwSW5mbyIsImVtYWlsIiwicGFzc3dvcmQiLCJzaWdudXAiLCJzZW5kU2lnbnVwIiwiVXNlckZhY3RvcnkiLCJmZXRjaEluZm9ybWF0aW9uIiwidXBkYXRlZCIsInVwZGF0ZWRBdCIsImdldERheSIsImZldGNoR2FtZXMiLCJnZXRSYW5kb21Gcm9tQXJyYXkiLCJhcnIiLCJmbG9vciIsInJhbmRvbSIsImdyZWV0aW5ncyIsImdldFJhbmRvbUdyZWV0aW5nIiwibGluayIsIml0ZW1zIiwibGFiZWwiLCJhdXRoIiwiaXNMb2dnZWRJbiIsInNldFVzZXIiLCJyZW1vdmVVc2VyIiwiUmFuZG9tR3JlZXRpbmdzIiwiZ3JlZXRpbmciLCIkaW50ZXJ2YWwiLCJ0aW1lIiwic3RhcnQiLCJ0aW1lX3JlbWFpbmluZyIsImNvbnZlcnQiLCJjb3VudGRvd24iLCJ0aW1lciIsImNhbmNlbCIsInNlY29uZHMiLCJ0b1N0cmluZyIsImNvbnZlcnNpb24iXSwibWFwcGluZ3MiOiJBQUFBOzs7O0FBQ0FBLE9BQUFDLEdBQUEsR0FBQUMsUUFBQUMsTUFBQSxDQUFBLHVCQUFBLEVBQUEsQ0FBQSxhQUFBLEVBQUEsV0FBQSxFQUFBLGNBQUEsRUFBQSxXQUFBLENBQUEsQ0FBQTs7QUFFQUYsSUFBQUcsTUFBQSxDQUFBLFVBQUFDLGtCQUFBLEVBQUFDLGlCQUFBLEVBQUE7QUFDQTtBQUNBQSxzQkFBQUMsU0FBQSxDQUFBLElBQUE7QUFDQTtBQUNBRix1QkFBQUcsU0FBQSxDQUFBLEdBQUE7QUFDQTtBQUNBSCx1QkFBQUksSUFBQSxDQUFBLGlCQUFBLEVBQUEsWUFBQTtBQUNBVCxlQUFBVSxRQUFBLENBQUFDLE1BQUE7QUFDQSxLQUZBO0FBR0EsQ0FUQTs7QUFXQTtBQUNBVixJQUFBVyxHQUFBLENBQUEsVUFBQUMsVUFBQSxFQUFBO0FBQ0FBLGVBQUFDLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLFVBQUFDLEtBQUEsRUFBQUMsT0FBQSxFQUFBQyxRQUFBLEVBQUFDLFNBQUEsRUFBQUMsVUFBQSxFQUFBQyxXQUFBLEVBQUE7QUFDQUMsZ0JBQUFDLElBQUEsZ0ZBQUFOLFFBQUFPLElBQUE7QUFDQUYsZ0JBQUFHLEtBQUEsQ0FBQUosV0FBQTtBQUNBLEtBSEE7QUFJQSxDQUxBOztBQU9BO0FBQ0FuQixJQUFBVyxHQUFBLENBQUEsVUFBQUMsVUFBQSxFQUFBWSxXQUFBLEVBQUFDLE1BQUEsRUFBQTs7QUFFQTtBQUNBLFFBQUFDLCtCQUFBLFNBQUFBLDRCQUFBLENBQUFDLEtBQUEsRUFBQTtBQUNBLGVBQUFBLE1BQUFDLElBQUEsSUFBQUQsTUFBQUMsSUFBQSxDQUFBQyxZQUFBO0FBQ0EsS0FGQTs7QUFJQTtBQUNBO0FBQ0FqQixlQUFBQyxHQUFB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QUUsa0NBQUFGLE9BQUE7QUFDQTtBQUNBLHVCQUFBRSxVQUFBO0FBQ0E7QUFDQTtBQTFEQSxLQUFBO0FBNERBLENBN0RBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG53aW5kb3cuYXBwID0gYW5ndWxhci5tb2R1bGUoJ0Z1bGxzdGFja0dlbmVyYXRlZEFwcCcsIFsnZnNhUHJlQnVpbHQnLCAndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICduZ0FuaW1hdGUnXSk7XG5cbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcbiAgICAvLyBUcmlnZ2VyIHBhZ2UgcmVmcmVzaCB3aGVuIGFjY2Vzc2luZyBhbiBPQXV0aCByb3V0ZVxuICAgICR1cmxSb3V0ZXJQcm92aWRlci53aGVuKCcvYXV0aC86cHJvdmlkZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICB9KTtcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGxpc3RlbmluZyB0byBlcnJvcnMgYnJvYWRjYXN0ZWQgYnkgdWktcm91dGVyLCB1c3VhbGx5IG9yaWdpbmF0aW5nIGZyb20gcmVzb2x2ZXNcbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUpIHtcbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlRXJyb3InLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zLCBmcm9tU3RhdGUsIGZyb21QYXJhbXMsIHRocm93bkVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuaW5mbyhgVGhlIGZvbGxvd2luZyBlcnJvciB3YXMgdGhyb3duIGJ5IHVpLXJvdXRlciB3aGlsZSB0cmFuc2l0aW9uaW5nIHRvIHN0YXRlIFwiJHt0b1N0YXRlLm5hbWV9XCIuIFRoZSBvcmlnaW4gb2YgdGhpcyBlcnJvciBpcyBwcm9iYWJseSBhIHJlc29sdmUgZnVuY3Rpb246YCk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IodGhyb3duRXJyb3IpO1xuICAgIH0pO1xufSk7XG5cbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgY29udHJvbGxpbmcgYWNjZXNzIHRvIHNwZWNpZmljIHN0YXRlcy5cbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgIC8vIFRoZSBnaXZlbiBzdGF0ZSByZXF1aXJlcyBhbiBhdXRoZW50aWNhdGVkIHVzZXIuXG4gICAgdmFyIGRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGggPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmRhdGEgJiYgc3RhdGUuZGF0YS5hdXRoZW50aWNhdGU7XG4gICAgfTtcblxuICAgIC8vICRzdGF0ZUNoYW5nZVN0YXJ0IGlzIGFuIGV2ZW50IGZpcmVkXG4gICAgLy8gd2hlbmV2ZXIgdGhlIHByb2Nlc3Mgb2YgY2hhbmdpbmcgYSBzdGF0ZSBiZWdpbnMuXG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcykge1xuXG4gICAgICAgIGlmICghZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCh0b1N0YXRlKSkge1xuICAgICAgICAgICAgLy8gVGhlIGRlc3RpbmF0aW9uIHN0YXRlIGRvZXMgbm90IHJlcXVpcmUgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgICAgIC8vIFRoZSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWQuXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FuY2VsIG5hdmlnYXRpbmcgdG8gbmV3IHN0YXRlLlxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIC8vIElmIGEgdXNlciBpcyByZXRyaWV2ZWQsIHRoZW4gcmVuYXZpZ2F0ZSB0byB0aGUgZGVzdGluYXRpb25cbiAgICAgICAgICAgIC8vICh0aGUgc2Vjb25kIHRpbWUsIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpIHdpbGwgd29yaylcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgaWYgbm8gdXNlciBpcyBsb2dnZWQgaW4sIGdvIHRvIFwibG9naW5cIiBzdGF0ZS5cbiAgICAgICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKHRvU3RhdGUubmFtZSwgdG9QYXJhbXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgIC8vIFJlZ2lzdGVyIG91ciAqYWJvdXQqIHN0YXRlLlxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdhYm91dCcsIHtcbiAgICAgICAgdXJsOiAnL2Fib3V0JyxcbiAgICAgICAgY29udHJvbGxlcjogJ0Fib3V0Q29udHJvbGxlcicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvYWJvdXQvYWJvdXQuaHRtbCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdBYm91dENvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlLCBGdWxsc3RhY2tQaWNzKSB7XG5cbiAgICAvLyBJbWFnZXMgb2YgYmVhdXRpZnVsIEZ1bGxzdGFjayBwZW9wbGUuXG4gICAgJHNjb3BlLmltYWdlcyA9IF8uc2h1ZmZsZShGdWxsc3RhY2tQaWNzKTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdkb2NzJywge1xuICAgICAgICB1cmw6ICcvZG9jcycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZG9jcy9kb2NzLmh0bWwnXG4gICAgfSk7XG59KTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBIb3BlIHlvdSBkaWRuJ3QgZm9yZ2V0IEFuZ3VsYXIhIER1aC1kb3kuXG4gICAgaWYgKCF3aW5kb3cuYW5ndWxhcikgdGhyb3cgbmV3IEVycm9yKCdJIGNhblxcJ3QgZmluZCBBbmd1bGFyIScpO1xuXG4gICAgdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdmc2FQcmVCdWlsdCcsIFtdKTtcblxuICAgIGFwcC5mYWN0b3J5KCdTb2NrZXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghd2luZG93LmlvKSB0aHJvdyBuZXcgRXJyb3IoJ3NvY2tldC5pbyBub3QgZm91bmQhJyk7XG4gICAgICAgIHJldHVybiB3aW5kb3cuaW8od2luZG93LmxvY2F0aW9uLm9yaWdpbik7XG4gICAgfSk7XG5cbiAgICAvLyBBVVRIX0VWRU5UUyBpcyB1c2VkIHRocm91Z2hvdXQgb3VyIGFwcCB0b1xuICAgIC8vIGJyb2FkY2FzdCBhbmQgbGlzdGVuIGZyb20gYW5kIHRvIHRoZSAkcm9vdFNjb3BlXG4gICAgLy8gZm9yIGltcG9ydGFudCBldmVudHMgYWJvdXQgYXV0aGVudGljYXRpb24gZmxvdy5cbiAgICBhcHAuY29uc3RhbnQoJ0FVVEhfRVZFTlRTJywge1xuICAgICAgICBsb2dpblN1Y2Nlc3M6ICdhdXRoLWxvZ2luLXN1Y2Nlc3MnLFxuICAgICAgICBsb2dpbkZhaWxlZDogJ2F1dGgtbG9naW4tZmFpbGVkJyxcbiAgICAgICAgbG9nb3V0U3VjY2VzczogJ2F1dGgtbG9nb3V0LXN1Y2Nlc3MnLFxuICAgICAgICBzZXNzaW9uVGltZW91dDogJ2F1dGgtc2Vzc2lvbi10aW1lb3V0JyxcbiAgICAgICAgbm90QXV0aGVudGljYXRlZDogJ2F1dGgtbm90LWF1dGhlbnRpY2F0ZWQnLFxuICAgICAgICBub3RBdXRob3JpemVkOiAnYXV0aC1ub3QtYXV0aG9yaXplZCdcbiAgICB9KTtcblxuICAgIGFwcC5mYWN0b3J5KCdBdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsIEFVVEhfRVZFTlRTKSB7XG4gICAgICAgIHZhciBzdGF0dXNEaWN0ID0ge1xuICAgICAgICAgICAgNDAxOiBBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLFxuICAgICAgICAgICAgNDAzOiBBVVRIX0VWRU5UUy5ub3RBdXRob3JpemVkLFxuICAgICAgICAgICAgNDE5OiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCxcbiAgICAgICAgICAgIDQ0MDogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXRcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChzdGF0dXNEaWN0W3Jlc3BvbnNlLnN0YXR1c10sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSkge1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgdXNlciA9IHJlc3BvbnNlLmRhdGEudXNlcjtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKHVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XG4gICAgICAgICAgICByZXR1cm4gdXNlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZXMgdGhlIHNlc3Npb24gZmFjdG9yeSB0byBzZWUgaWYgYW5cbiAgICAgICAgLy8gYXV0aGVudGljYXRlZCB1c2VyIGlzIGN1cnJlbnRseSByZWdpc3RlcmVkLlxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhIVNlc3Npb24udXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldExvZ2dlZEluVXNlciA9IGZ1bmN0aW9uIChmcm9tU2VydmVyKSB7XG5cbiAgICAgICAgICAgIC8vIElmIGFuIGF1dGhlbnRpY2F0ZWQgc2Vzc2lvbiBleGlzdHMsIHdlXG4gICAgICAgICAgICAvLyByZXR1cm4gdGhlIHVzZXIgYXR0YWNoZWQgdG8gdGhhdCBzZXNzaW9uXG4gICAgICAgICAgICAvLyB3aXRoIGEgcHJvbWlzZS4gVGhpcyBlbnN1cmVzIHRoYXQgd2UgY2FuXG4gICAgICAgICAgICAvLyBhbHdheXMgaW50ZXJmYWNlIHdpdGggdGhpcyBtZXRob2QgYXN5bmNocm9ub3VzbHkuXG5cbiAgICAgICAgICAgIC8vIE9wdGlvbmFsbHksIGlmIHRydWUgaXMgZ2l2ZW4gYXMgdGhlIGZyb21TZXJ2ZXIgcGFyYW1ldGVyLFxuICAgICAgICAgICAgLy8gdGhlbiB0aGlzIGNhY2hlZCB2YWx1ZSB3aWxsIG5vdCBiZSB1c2VkLlxuXG4gICAgICAgICAgICBpZiAodGhpcy5pc0F1dGhlbnRpY2F0ZWQoKSAmJiBmcm9tU2VydmVyICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4oU2Vzc2lvbi51c2VyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFrZSByZXF1ZXN0IEdFVCAvc2Vzc2lvbi5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIDQwMSByZXNwb25zZSwgd2UgY2F0Y2ggaXQgYW5kIGluc3RlYWQgcmVzb2x2ZSB0byBudWxsLlxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKS50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9naW4gPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbihvblN1Y2Nlc3NmdWxMb2dpbilcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHsgbWVzc2FnZTogJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJyB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9sb2dvdXQnKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBTZXNzaW9uLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9nb3V0U3VjY2Vzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcblxuICAgICAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSB1c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IG51bGw7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxufSgpKTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnR2FtZScsIHtcbiAgICAgICAgdXJsOiAnL2dhbWUvOnJvb21uYW1lJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9nYW1lLXN0YXRlL3BhZ2UuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6IFwiR2FtZUN0cmxcIixcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuXG5cbmFwcC5jb250cm9sbGVyKCdHYW1lQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgQm9hcmRGYWN0b3J5LCBTb2NrZXQsICRzdGF0ZVBhcmFtcywgQXV0aFNlcnZpY2UsICRzdGF0ZSwgTG9iYnlGYWN0b3J5LCAkcm9vdFNjb3BlKSB7XG5cbiAgICAkc2NvcGUucm9vbU5hbWUgPSAkc3RhdGVQYXJhbXMucm9vbW5hbWU7XG5cbiAgICAkc2NvcGUub3RoZXJQbGF5ZXJzID0gW107XG5cbiAgICAkc2NvcGUuZ2FtZUxlbmd0aCA9IDMwO1xuXG4gICAgJHNjb3BlLmV4cG9ydHMgPSB7XG4gICAgICAgIHdvcmRPYmo6IHt9LFxuICAgICAgICB3b3JkOiBcIlwiLFxuICAgICAgICBwbGF5ZXJJZDogbnVsbCxcbiAgICAgICAgc3RhdGVOdW1iZXI6IDAsXG4gICAgICAgIHBvaW50c0Vhcm5lZDogbnVsbFxuICAgIH07XG5cbiAgICAkc2NvcGUubW91c2VJc0Rvd24gPSBmYWxzZTtcbiAgICAkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkID0gZmFsc2U7XG5cbiAgICAkc2NvcGUuc3R5bGU9bnVsbDtcbiAgICAkc2NvcGUubWVzc2FnZT0nJztcbiAgICAkc2NvcGUuZnJlZXplPWZhbHNlO1xuXG4gICAgJHNjb3BlLmNoZWNrU2VsZWN0ZWQ9ZnVuY3Rpb24oaWQpe1xuICAgICAgICByZXR1cm4gaWQgaW4gJHNjb3BlLmV4cG9ydHMud29yZE9iajtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnRvZ2dsZURyYWcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLmRyYWdnaW5nQWxsb3dlZCA9ICEkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkO1xuICAgIH07XG5cbiAgICAkc2NvcGUubW91c2VEb3duID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5tb3VzZUlzRG93biA9IHRydWU7XG4gICAgfTtcblxuICAgICRzY29wZS5tb3VzZVVwID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5tb3VzZUlzRG93biA9IGZhbHNlO1xuICAgICAgICBpZiAoJHNjb3BlLmRyYWdnaW5nQWxsb3dlZCAmJiAkc2NvcGUuZXhwb3J0cy53b3JkLmxlbmd0aCA+IDEpICRzY29wZS5zdWJtaXQoJHNjb3BlLmV4cG9ydHMpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZHJhZyA9IGZ1bmN0aW9uKHNwYWNlLCBpZCkge1xuICAgICAgICBpZiAoJHNjb3BlLm1vdXNlSXNEb3duICYmICRzY29wZS5kcmFnZ2luZ0FsbG93ZWQpIHtcbiAgICAgICAgICAgICRzY29wZS5jbGljayhzcGFjZSwgaWQpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd1c2VyIGZyb20gQXV0aFNlcnZpY2UnLCB1c2VyKTtcbiAgICAgICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLnBsYXllcklkID0gdXNlci5pZDtcbiAgICAgICAgfSk7XG5cbiAgICAvL2dldCB0aGUgY3VycmVudCByb29tIGluZm9cbiAgICBCb2FyZEZhY3RvcnkuZ2V0Q3VycmVudFJvb20oJHN0YXRlUGFyYW1zLnJvb21uYW1lKVxuICAgICAgICAudGhlbihyb29tID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHJvb20pXG4gICAgICAgICAgICAkc2NvcGUuZ2FtZUlkID0gcm9vbS5pZDtcbiAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMgPSByb29tLnVzZXJzLmZpbHRlcih1c2VyID0+IHVzZXIuaWQgIT09ICRzY29wZS51c2VyLmlkKTtcbiAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMuZm9yRWFjaChwbGF5ZXIgPT4geyBwbGF5ZXIuc2NvcmUgPSAwIH0pXG4gICAgICAgICAgICBMb2JieUZhY3Rvcnkuam9pbkdhbWUocm9vbS5pZCwgJHNjb3BlLnVzZXIuaWQpO1xuICAgICAgICB9KTtcblxuICAgICRzY29wZS5oaWRlQm9hcmQgPSB0cnVlO1xuXG4gICAgLy8gU3RhcnQgdGhlIGdhbWUgd2hlbiBhbGwgcGxheWVycyBoYXZlIGpvaW5lZCByb29tXG4gICAgJHNjb3BlLnN0YXJ0R2FtZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdXNlcklkcyA9ICRzY29wZS5vdGhlclBsYXllcnMubWFwKHVzZXIgPT4gdXNlci5pZCk7XG4gICAgICAgIHVzZXJJZHMucHVzaCgkc2NvcGUudXNlci5pZCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdvcCcsICRzY29wZS5vdGhlclBsYXllcnMsICd1aScsIHVzZXJJZHMpO1xuICAgICAgICBCb2FyZEZhY3RvcnkuZ2V0U3RhcnRCb2FyZCgkc2NvcGUuZ2FtZUxlbmd0aCwgJHNjb3BlLmdhbWVJZCwgdXNlcklkcyk7XG4gICAgfTtcblxuXG4gICAgLy9RdWl0IHRoZSByb29tLCBiYWNrIHRvIGxvYmJ5XG4gICAgJHNjb3BlLnF1aXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gQm9hcmRGYWN0b3J5LnF1aXRGcm9tUm9vbSgkc2NvcGUuZ2FtZUlkLCAkc2NvcGUudXNlci5pZClcbiAgICAgICAgLy8gICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgLy8gICAgICAgICAkc3RhdGUuZ28oJ2xvYmJ5Jyk7XG4gICAgICAgIC8vICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLmhpZGVOYXZiYXIgPSBmYWxzZTtcbiAgICAgICAgJHN0YXRlLmdvKCdsb2JieScpXG4gICAgfTtcblxuXG4gICAgJHNjb3BlLmJvYXJkID0gW1xuICAgICAgICBbJ2InLCAnYScsICdkJywgJ2UnLCAnYScsICdyJ10sXG4gICAgICAgIFsnZScsICdmJywgJ2cnLCAnbCcsICdtJywgJ2UnXSxcbiAgICAgICAgWydoJywgJ2knLCAnaicsICdmJywgJ28nLCAnYSddLFxuICAgICAgICBbJ2MnLCAnYScsICdkJywgJ2UnLCAnYScsICdyJ10sXG4gICAgICAgIFsnZScsICdmJywgJ2cnLCAnbCcsICdkJywgJ2UnXSxcbiAgICAgICAgWydoJywgJ2knLCAnaicsICdmJywgJ28nLCAnYSddXG4gICAgXTtcblxuICAgICRzY29wZS5tZXNzYWdlcyA9IG51bGw7XG5cbiAgICAkc2NvcGUuc2l6ZSA9IDM7XG4gICAgJHNjb3BlLnNjb3JlID0gMDtcbiAgICAvLyAkc2NvcGUucGxheWVyTmFtZSA9ICdNZSc7XG4gICAgLy8gJHNjb3BlLnBsYXllciA9ICRzY29wZS51c2VyLmlkO1xuXG4gICAgLy8gJHNjb3BlLm90aGVyUGxheWVycyA9IFt7IG5hbWU6ICdZb3UnLCBzY29yZTogMCwgaWQ6IDEgfSxcbiAgICAvLyAgICAgeyBuYW1lOiAnSGltJywgc2NvcmU6IDAsIGlkOiAyIH0sXG4gICAgLy8gICAgIHsgbmFtZTogJ0hlcicsIHNjb3JlOiAwLCBpZDogMyB9XG4gICAgLy8gXTtcblxuICAgICRzY29wZS5jbGljayA9IGZ1bmN0aW9uKHNwYWNlLCBpZCkge1xuICAgICAgICBpZiAoJHNjb3BlLmZyZWV6ZSl7cmV0dXJuIDt9XG4gICAgICAgIGNvbnNvbGUubG9nKCdjbGlja2VkICcsIHNwYWNlLCBpZCk7XG4gICAgICAgIHZhciBsdHJzU2VsZWN0ZWQgPSBPYmplY3Qua2V5cygkc2NvcGUuZXhwb3J0cy53b3JkT2JqKTtcbiAgICAgICAgdmFyIHByZXZpb3VzTHRyID0gbHRyc1NlbGVjdGVkW2x0cnNTZWxlY3RlZC5sZW5ndGggLSAyXTtcbiAgICAgICAgdmFyIGxhc3RMdHIgPSBsdHJzU2VsZWN0ZWRbbHRyc1NlbGVjdGVkLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAoIWx0cnNTZWxlY3RlZC5sZW5ndGggfHwgdmFsaWRTZWxlY3QoaWQsIGx0cnNTZWxlY3RlZCkpIHtcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLndvcmQgKz0gc3BhY2U7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkT2JqW2lkXSA9IHNwYWNlO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJHNjb3BlLmV4cG9ydHMpO1xuICAgICAgICB9IGVsc2UgaWYgKGlkID09PSBwcmV2aW91c0x0cikge1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZCA9ICRzY29wZS5leHBvcnRzLndvcmQuc3Vic3RyaW5nKDAsICRzY29wZS5leHBvcnRzLndvcmQubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICBkZWxldGUgJHNjb3BlLmV4cG9ydHMud29yZE9ialtsYXN0THRyXTtcbiAgICAgICAgfSBlbHNlIGlmIChsdHJzU2VsZWN0ZWQubGVuZ3RoID09PSAxICYmIGlkID09PSBsYXN0THRyKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkPVwiXCI7XG4gICAgICAgICAgICBkZWxldGUgJHNjb3BlLmV4cG9ydHMud29yZE9ialtsYXN0THRyXTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvL21ha2VzIHN1cmUgbGV0dGVyIGlzIGFkamFjZW50IHRvIHByZXYgbHRyLCBhbmQgaGFzbid0IGJlZW4gdXNlZCB5ZXRcbiAgICBmdW5jdGlvbiB2YWxpZFNlbGVjdChsdHJJZCwgb3RoZXJMdHJzSWRzKSB7XG4gICAgICAgIGlmIChvdGhlckx0cnNJZHMuaW5jbHVkZXMobHRySWQpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHZhciBjb29yZHMgPSBsdHJJZC5zcGxpdCgnLScpO1xuICAgICAgICB2YXIgcm93ID0gY29vcmRzWzBdO1xuICAgICAgICB2YXIgY29sID0gY29vcmRzWzFdO1xuICAgICAgICB2YXIgbGFzdEx0cklkID0gb3RoZXJMdHJzSWRzLnBvcCgpO1xuICAgICAgICB2YXIgY29vcmRzTGFzdCA9IGxhc3RMdHJJZC5zcGxpdCgnLScpO1xuICAgICAgICB2YXIgcm93TGFzdCA9IGNvb3Jkc0xhc3RbMF07XG4gICAgICAgIHZhciBjb2xMYXN0ID0gY29vcmRzTGFzdFsxXTtcbiAgICAgICAgdmFyIHJvd09mZnNldCA9IE1hdGguYWJzKHJvdyAtIHJvd0xhc3QpO1xuICAgICAgICB2YXIgY29sT2Zmc2V0ID0gTWF0aC5hYnMoY29sIC0gY29sTGFzdCk7XG4gICAgICAgIHJldHVybiAocm93T2Zmc2V0IDw9IDEgJiYgY29sT2Zmc2V0IDw9IDEpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsZWFySWZDb25mbGljdGluZyh1cGRhdGVXb3JkT2JqLCBleHBvcnRXb3JkT2JqKSB7XG4gICAgICAgIHZhciB0aWxlc01vdmVkID0gT2JqZWN0LmtleXModXBkYXRlV29yZE9iaik7XG4gICAgICAgIHZhciBteVdvcmRUaWxlcyA9IE9iamVjdC5rZXlzKGV4cG9ydFdvcmRPYmopO1xuICAgICAgICBpZiAodGlsZXNNb3ZlZC5zb21lKGNvb3JkID0+IG15V29yZFRpbGVzLmluY2x1ZGVzKGNvb3JkKSkpICRzY29wZS5jbGVhcigpO1xuICAgIH1cblxuICAgICRzY29wZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkID0gXCJcIjtcbiAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZE9iaiA9IHt9O1xuICAgIH07XG5cbiAgICAvLyAkc2NvcGUuc3VibWl0ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gICAgIHJldHVybiBCb2FyZEZhY3Rvcnkuc3VibWl0KClcbiAgICAvLyAgICAgICAgIC8vIC50aGVuKGZ1bmN0aW9uKHgpIHtcbiAgICAvLyAgICAgICAgIC8vICAgICAkc2NvcGUuZXhwb3J0cy53b3JkT2JqID0ge307XG4gICAgLy8gICAgICAgICAvLyAgICAgJHNjb3BlLmV4cG9ydHMud29yZCA9IFwiXCI7XG4gICAgLy8gICAgICAgICB9KTtcbiAgICAvLyB9O1xuXG5cbiAgICAkc2NvcGUuc3VibWl0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdzdWJtaXR0aW5nICcsIG9iaik7XG4gICAgICAgIEJvYXJkRmFjdG9yeS5zdWJtaXQob2JqKTtcbiAgICAgICAgJHNjb3BlLmNsZWFyKCk7XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLnVwZGF0ZUJvYXJkID0gZnVuY3Rpb24od29yZE9iaikge1xuICAgICAgICBjb25zb2xlLmxvZygnc2NvcGUuYm9hcmQnLCAkc2NvcGUuYm9hcmQpO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gd29yZE9iaikge1xuICAgICAgICAgICAgdmFyIGNvb3JkcyA9IGtleS5zcGxpdCgnLScpO1xuICAgICAgICAgICAgdmFyIHJvdyA9IGNvb3Jkc1swXTtcbiAgICAgICAgICAgIHZhciBjb2wgPSBjb29yZHNbMV07XG4gICAgICAgICAgICAkc2NvcGUuYm9hcmRbcm93XVtjb2xdID0gd29yZE9ialtrZXldO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS51cGRhdGVTY29yZSA9IGZ1bmN0aW9uKHBvaW50cywgcGxheWVySWQpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3VwZGF0ZSBzY29yZSBwb2ludHMnLCBwb2ludHMpO1xuICAgICAgICBpZiAocGxheWVySWQgPT09ICRzY29wZS51c2VyLmlkKSB7XG4gICAgICAgICAgICAkc2NvcGUuc2NvcmUgKz0gcG9pbnRzO1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMucG9pbnRzRWFybmVkID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIHBsYXllciBpbiAkc2NvcGUub3RoZXJQbGF5ZXJzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCRzY29wZS5vdGhlclBsYXllcnNbcGxheWVyXS5pZCA9PT0gcGxheWVySWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVyc1twbGF5ZXJdLnNjb3JlICs9IHBvaW50cztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMucG9pbnRzRWFybmVkID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgICRzY29wZS51cGRhdGUgPSBmdW5jdGlvbih1cGRhdGVPYmopIHtcbiAgICAgICAgJHNjb3BlLnVwZGF0ZVNjb3JlKHVwZGF0ZU9iai5wb2ludHNFYXJuZWQsIHVwZGF0ZU9iai5wbGF5ZXJJZCk7XG4gICAgICAgICRzY29wZS51cGRhdGVCb2FyZCh1cGRhdGVPYmoud29yZE9iaik7XG4gICAgICAgICRzY29wZS5tZXNzYWdlID0gdXBkYXRlT2JqLnBsYXllcklkICsgXCIgcGxheWVkIFwiICsgdXBkYXRlT2JqLndvcmQgKyBcIiBmb3IgXCIgKyB1cGRhdGVPYmoucG9pbnRzRWFybmVkICsgXCIgcG9pbnRzIVwiO1xuICAgICAgICBjb25zb2xlLmxvZygnaXRzIHVwZGF0aW5nIScpO1xuICAgICAgICBjbGVhcklmQ29uZmxpY3RpbmcodXBkYXRlT2JqLCAkc2NvcGUuZXhwb3J0cy53b3JkT2JqKTtcbiAgICAgICAgJHNjb3BlLmV4cG9ydHMuc3RhdGVOdW1iZXIgPSB1cGRhdGVPYmouc3RhdGVOdW1iZXI7XG4gICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5yZXBsYXk9ZnVuY3Rpb24oKXtcbiAgICAgICAgY29uc29sZS5sb2coXCJHTyFcIik7XG4gICAgICAgIExvYmJ5RmFjdG9yeS5uZXdHYW1lKCRzY29wZS5yb29tTmFtZSk7XG4gICAgICAgICRzY29wZS5zdGFydEdhbWUoKTtcbiAgICB9O1xuXG4gICAgJHJvb3RTY29wZS5oaWRlTmF2YmFyID0gdHJ1ZTtcblxuICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7IFNvY2tldC5kaXNjb25uZWN0KCk7IH0pO1xuICAgIGNvbnNvbGUubG9nKCd1cGRhdGUgMS4xJylcbiAgICBTb2NrZXQub24oJ2Nvbm5lY3QnLCBmdW5jdGlvbigpIHtcblxuICAgICAgICBTb2NrZXQuZW1pdCgnam9pblJvb20nLCAkc2NvcGUudXNlciwgJHNjb3BlLnJvb21OYW1lLCAkc2NvcGUuZ2FtZUlkKTtcbiAgICAgICAgY29uc29sZS5sb2coJ2VtaXR0aW5nIFwiam9pbiByb29tXCIgZXZlbnQgdG8gc2VydmVyJywgJHNjb3BlLnJvb21OYW1lKTtcblxuICAgICAgICBTb2NrZXQub24oJ3Jvb21Kb2luU3VjY2VzcycsIGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCduZXcgdXNlciBqb2luaW5nJywgdXNlci5pZCk7XG5cbiAgICAgICAgICAgIHVzZXIuc2NvcmUgPSAwO1xuICAgICAgICAgICAgLy8gdmFyIHBsYXllcklkcyA9IFtdO1xuICAgICAgICAgICAgLy8gJHNjb3BlLm90aGVyUGxheWVycy5mb3JFYWNoKG90aGVyUGxheWVyID0+IHtcbiAgICAgICAgICAgIC8vICAgICBwbGF5ZXJJZHMucHVzaChvdGhlclBsYXllci5pZClcbiAgICAgICAgICAgIC8vIH0pO1xuICAgICAgICAgICAgLy8gaWYgKHBsYXllcklkcy5pbmRleE9mKHVzZXIuaWQpID09PSAtMSkge1xuICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVycy5wdXNoKHVzZXIpO1xuICAgICAgICAgICAgJHNjb3BlLiRkaWdlc3QoKTtcblxuICAgICAgICAgICAgLy8gQm9hcmRGYWN0b3J5LmdldEN1cnJlbnRSb29tKCRzdGF0ZVBhcmFtcy5yb29tbmFtZSlcbiAgICAgICAgICAgIC8vICAgICAudGhlbihyb29tID0+IHtcbiAgICAgICAgICAgIC8vICAgICAgICAgY29uc29sZS5sb2cocm9vbSlcbiAgICAgICAgICAgIC8vICAgICAgICAgJHNjb3BlLmdhbWVJZCA9IHJvb20uaWQ7XG4gICAgICAgICAgICAvLyAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMgPSByb29tLnVzZXJzLmZpbHRlcih1c2VyID0+IHVzZXIuaWQgIT09ICRzY29wZS51c2VyLmlkKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVycy5mb3JFYWNoKHBsYXllciA9PiB7IHBsYXllci5zY29yZSA9IDAgfSlcbiAgICAgICAgICAgIC8vICAgICB9KVxuXG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLy8gU29ja2V0Lm9uKCdyb29tRGF0YScsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKCdsaXN0ZW5pbmcgZm9yIHJvb21EYXRhIGV2ZW50IGZyb20gc2VydmVyJylcbiAgICAgICAgLy8gICAgIGlmIChkYXRhLmNvdW50Lmxlbmd0aCA8IDIpIHtcbiAgICAgICAgLy8gICAgICAgICAkc2NvcGUubWVzc2FnZXMgPSBcIldhaXRpbmcgZm9yIGFub3RoZXIgcGxheWVyXCI7XG4gICAgICAgIC8vICAgICAgICAgY29uc29sZS5sb2coJ3Njb3BlIG1lc3NhZ2U6ICcsICRzY29wZS5tZXNzYWdlcylcbiAgICAgICAgLy8gICAgIH0gZWxzZSB7XG4gICAgICAgIC8vICAgICAgICAgJHNjb3BlLm1lc3NhZ2VzID0gbnVsbDtcbiAgICAgICAgLy8gICAgIH1cbiAgICAgICAgLy8gfSlcblxuICAgICAgICBTb2NrZXQub24oJ3N0YXJ0Qm9hcmQnLCBmdW5jdGlvbihib2FyZCkge1xuICAgICAgICAgICAgJHNjb3BlLmZyZWV6ZT1mYWxzZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdib2FyZCEgJywgYm9hcmQpO1xuICAgICAgICAgICAgJHNjb3BlLmJvYXJkID0gYm9hcmQ7XG4gICAgICAgICAgICAvLyBzZXRJbnRlcnZhbChmdW5jdGlvbigpe1xuICAgICAgICAgICAgJHNjb3BlLmhpZGVCb2FyZCA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgICAgIC8vIH0sIDMwMDApO1xuICAgICAgICB9KTtcblxuICAgICAgICBTb2NrZXQub24oJ3dvcmRWYWxpZGF0ZWQnLCBmdW5jdGlvbih1cGRhdGVPYmopIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd3b3JkIGlzIHZhbGlkYXRlZCcpO1xuICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZSh1cGRhdGVPYmopO1xuICAgICAgICAgICAgJHNjb3BlLmxhc3RXb3JkUGxheWVkID0gdXBkYXRlT2JqLndvcmQ7XG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgICAgICB9KTtcblxuXG4gICAgICAgIFNvY2tldC5vbigncGxheWVyRGlzY29ubmVjdGVkJywgZnVuY3Rpb24odXNlcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3BsYXllckRpc2Nvbm5lY3RlZCcsIHVzZXIuaWQpO1xuICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVycyA9ICRzY29wZS5vdGhlclBsYXllcnMubWFwKG90aGVyUGxheWVycyA9PiBvdGhlclBsYXllcnMuaWQgIT09IHVzZXIuaWQpXG5cbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIFNvY2tldC5vbignZ2FtZU92ZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICRzY29wZS5jbGVhcigpO1xuICAgICAgICAgICAgJHNjb3BlLiRkaWdlc3QoKTtcbiAgICAgICAgICAgICRzY29wZS5mcmVlemU9dHJ1ZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnYW1lIGlzIG92ZXInKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KTtcbiIsImFwcC5mYWN0b3J5IChcIkJvYXJkRmFjdG9yeVwiLCBmdW5jdGlvbigkaHR0cCwgU29ja2V0KXtcblx0cmV0dXJue1xuXHRcdGdldFN0YXJ0Qm9hcmQ6IGZ1bmN0aW9uKGdhbWVMZW5ndGgsIGdhbWVJZCwgdXNlcklkcyl7XG5cdFx0XHRjb25zb2xlLmxvZygnZmFjdG9yeS4gZ2w6ICcsIGdhbWVMZW5ndGgpO1xuXHRcdFx0U29ja2V0LmVtaXQoJ2dldFN0YXJ0Qm9hcmQnLCBnYW1lTGVuZ3RoLCBnYW1lSWQsIHVzZXJJZHMpO1xuXHRcdH0sXG5cblx0XHRzdWJtaXQ6IGZ1bmN0aW9uKG9iail7XG5cdFx0XHRTb2NrZXQuZW1pdCgnc3VibWl0V29yZCcsIG9iaik7XG5cdFx0fSxcblxuXHRcdC8vIGZpbmRBbGxPdGhlclVzZXJzOiBmdW5jdGlvbihnYW1lKSB7XG5cdFx0Ly8gXHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2dhbWVzLycrIGdhbWUuaWQpXG5cdFx0Ly8gXHQudGhlbihyZXMgPT4gcmVzLmRhdGEpXG5cdFx0Ly8gfSxcblxuXHRcdGdldEN1cnJlbnRSb29tOiBmdW5jdGlvbihyb29tbmFtZSkge1xuXHRcdFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS9nYW1lcy9yb29tcy8nK3Jvb21uYW1lKVxuXHRcdFx0LnRoZW4ocmVzID0+IHJlcy5kYXRhKVxuXHRcdH0sXG5cblx0XHRxdWl0RnJvbVJvb206IGZ1bmN0aW9uKGdhbWVJZCwgdXNlcklkKSB7XG5cdFx0XHQvLyBTb2NrZXQuZW1pdCgnZGlzY29ubmVjdCcsIHJvb21OYW1lLCB1c2VySWQpO1xuXHRcdFx0cmV0dXJuICRodHRwLmRlbGV0ZSgnL2FwaS9nYW1lcy8nK2dhbWVJZCsnLycrdXNlcklkKVxuXHRcdH1cblx0fVxufSk7XG4iLCJhcHAuY29udHJvbGxlcignSG9tZUN0cmwnLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZSwgJGxvY2F0aW9uKXtcbiAgJHNjb3BlLmVudGVyTG9iYnkgPSBmdW5jdGlvbigpe1xuICAgICRzdGF0ZS5nbygnbG9iYnknLCB7cmVsb2FkOiB0cnVlfSk7XG4gIH1cbn0pO1xuXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdob21lJywge1xuICAgICAgICB1cmw6ICcvJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ob21lL2hvbWUuaHRtbCdcbiAgICB9KTtcbn0pO1xuXG4iLCJhcHAuY29udHJvbGxlcignTGVhZGVyQm9hcmRDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBMZWFkZXJCb2FyZEZhY3RvcnksICRzdGF0ZSwgQXV0aFNlcnZpY2UpIHtcbiAgICBjb25zb2xlLmxvZygnIDEnKVxuICAgIExlYWRlckJvYXJkRmFjdG9yeS5BbGxQbGF5ZXJzKClcbiAgICAudGhlbihwbGF5ZXJzID0+IHtcbiAgICAgICAgcGxheWVycy5mb3JFYWNoKHBsYXllciA9PiB7XG4gICAgICAgICAgICBpZiAocGxheWVyLmdhbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgc2NvcmVzID0gcGxheWVyLmdhbWVzLm1hcChnYW1lID0+IGdhbWUudXNlckdhbWUuc2NvcmUpXG4gICAgICAgICAgICAgICAgcGxheWVyLmhpZ2hlc3RTY29yZSA9IE1hdGgubWF4KC4uLnNjb3JlcylcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGxheWVyLmhpZ2hlc3RTY29yZSA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwbGF5ZXIuZ2FtZXNfd29uID0gcGxheWVyLndpbm5lci5sZW5ndGg7XG4gICAgICAgICAgICBwbGF5ZXIuZ2FtZXNfcGxheWVkID0gcGxheWVyLmdhbWVzLmxlbmd0aDtcbiAgICAgICAgICAgIGlmKHBsYXllci5nYW1lcy5sZW5ndGg9PT0wKXtcbiAgICAgICAgICAgIFx0cGxheWVyLndpbl9wZXJjZW50YWdlID0gMCArICclJ1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFx0cGxheWVyLndpbl9wZXJjZW50YWdlID0gKChwbGF5ZXIud2lubmVyLmxlbmd0aC9wbGF5ZXIuZ2FtZXMubGVuZ3RoKSoxMDApLnRvRml4ZWQoMCkgKyAnJSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSlcbiAgICAgICAgJHNjb3BlLnBsYXllcnMgPSBwbGF5ZXJzO1xuICAgIH0pXG59KTtcbiIsImFwcC5mYWN0b3J5KCdMZWFkZXJCb2FyZEZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHApIHtcblx0dmFyIExlYWRlckJvYXJkRmFjdG9yeSA9IHt9O1xuXG5cdExlYWRlckJvYXJkRmFjdG9yeS5BbGxQbGF5ZXJzID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS91c2VycycpXG5cdFx0LnRoZW4ocmVzPT5yZXMuZGF0YSlcblx0fVxuXG5cdHJldHVybiBMZWFkZXJCb2FyZEZhY3Rvcnk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbGVhZGVyQm9hcmQnLCB7XG4gICAgICAgIHVybDogJy9sZWFkZXJCb2FyZCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbGVhZGVyQm9hcmQvbGVhZGVyQm9hcmQudGVtcGxhdGUuaHRtbCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgXHRhbGxQbGF5ZXJzOiBmdW5jdGlvbihMZWFkZXJCb2FyZEZhY3RvcnkpIHtcbiAgICAgICAgXHRcdHJldHVybiBMZWFkZXJCb2FyZEZhY3RvcnkuQWxsUGxheWVycztcbiAgICAgICAgXHR9LFxuICAgICAgICAgICAgXG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMZWFkZXJCb2FyZEN0cmwnXG4gICAgfSk7XG5cbn0pOyIsImFwcC5jb250cm9sbGVyKCdMb2JieUN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIExvYmJ5RmFjdG9yeSwgcm9vbXMsICRzdGF0ZSwgQXV0aFNlcnZpY2UpIHtcblxuICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd1c2VyIGZyb20gQXV0aFNlcnZpY2UnLCB1c2VyKTtcbiAgICAgICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgfSk7XG5cbiAgICAkc2NvcGUucm9vbXMgPSByb29tcztcbiAgICAkc2NvcGUucm9vbU5hbWVGb3JtID0gZmFsc2U7XG4gICAgLy8gJHNjb3BlLnVzZXIgPSB7XG4gICAgLy8gIGlkOiAzXG4gICAgLy8gfVxuXG4gICAgJHNjb3BlLmpvaW5HYW1lID0gZnVuY3Rpb24ocm9vbSkge1xuICAgICAgICAkc3RhdGUuZ28oJ0dhbWUnLCB7IHJvb21uYW1lOiByb29tLnJvb21uYW1lIH0pXG4gICAgfVxuXG4gICAgJHNjb3BlLm5ld1Jvb20gPSBmdW5jdGlvbihyb29tSW5mbykge1xuICAgICAgICBMb2JieUZhY3RvcnkubmV3R2FtZShyb29tSW5mbyk7XG4gICAgICAgICRzY29wZS5yb29tTmFtZUZvcm0gPSBmYWxzZTtcbiAgICB9XG4gICAgJHNjb3BlLnNob3dGb3JtID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5yb29tTmFtZUZvcm0gPSB0cnVlO1xuICAgIH1cblxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdlbnRlckxvYmJ5JywgZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlVXJsOiAnanMvbG9iYnkvbG9iYnktYnV0dG9uLmh0bWwnLFxuICAgIGNvbnRyb2xsZXI6ICdIb21lQ3RybCdcbiAgfVxufSlcbiIsImFwcC5mYWN0b3J5KCdMb2JieUZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHApIHtcblx0dmFyIExvYmJ5RmFjdG9yeSA9IHt9O1xuXHR2YXIgdGVtcFJvb21zID0gW107IC8vd29yayB3aXRoIHNvY2tldD9cblxuXHRMb2JieUZhY3RvcnkuZ2V0QWxsUm9vbXMgPSBmdW5jdGlvbigpe1xuXHRcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvZ2FtZXMvcm9vbXMnKVxuXHRcdC50aGVuKHJlcyA9PiByZXMuZGF0YSlcblx0XHQudGhlbihyb29tcyA9PiB7XG5cdFx0XHRhbmd1bGFyLmNvcHkocm9vbXMsIHRlbXBSb29tcyk7XG5cdFx0XHRyZXR1cm4gdGVtcFJvb21zO1xuXHRcdH0pXG5cdH07XG5cblx0TG9iYnlGYWN0b3J5LmpvaW5HYW1lID0gZnVuY3Rpb24ocm9vbUlkLCB1c2VySWQpIHtcbiAgICBjb25zb2xlLmxvZygnbG9iYnkgZmFjdG9yeSBqb2luIGdhbWUnKTtcblx0XHRyZXR1cm4gJGh0dHAucHV0KCcvYXBpL2dhbWVzLycrIHJvb21JZCArJy9wbGF5ZXInLCB7aWQ6IHVzZXJJZH0pXG5cdFx0LnRoZW4ocmVzPT5yZXMuZGF0YSlcblx0fTtcblxuXHRMb2JieUZhY3RvcnkubmV3R2FtZSA9IGZ1bmN0aW9uKHJvb21JbmZvKSB7XG5cdFx0cmV0dXJuICRodHRwLnB1dCgnL2FwaS9nYW1lcycsIHJvb21JbmZvKVxuXHRcdC50aGVuKHJlcyA9PiByZXMuZGF0YSlcblx0XHQudGhlbihyb29tID0+IHt0ZW1wUm9vbXMucHVzaChyb29tKX0pXG5cdH1cblxuXHRMb2JieUZhY3RvcnkuQWxsUGxheWVycyA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvdXNlcnMnKVxuXHRcdC50aGVuKHJlcz0+cmVzLmRhdGEpXG5cdH1cblxuXHRyZXR1cm4gTG9iYnlGYWN0b3J5O1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvYmJ5Jywge1xuICAgICAgICB1cmw6ICcvbG9iYnknLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvYmJ5L2xvYmJ5LnRlbXBsYXRlLmh0bWwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgIFx0cm9vbXM6IGZ1bmN0aW9uKExvYmJ5RmFjdG9yeSkge1xuICAgICAgICBcdFx0cmV0dXJuIExvYmJ5RmFjdG9yeS5nZXRBbGxSb29tcygpO1xuICAgICAgICBcdH1cbiAgICAgICAgfSxcbiAgICAgICAgY29udHJvbGxlcjogJ0xvYmJ5Q3RybCdcbiAgICB9KTtcblxufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsb2dpbicsIHtcbiAgICAgICAgdXJsOiAnL2xvZ2luJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2dpbi9sb2dpbi5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0xvZ2luQ3RybCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAkc2NvcGUubG9naW4gPSB7fTtcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uIChsb2dpbkluZm8pIHtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ2luKGxvZ2luSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbWVtYmVyc09ubHknLCB7XG4gICAgICAgIHVybDogJy9tZW1iZXJzLWFyZWEnLFxuICAgICAgICB0ZW1wbGF0ZTogJzxpbWcgbmctcmVwZWF0PVwiaXRlbSBpbiBzdGFzaFwiIHdpZHRoPVwiMzAwXCIgbmctc3JjPVwie3sgaXRlbSB9fVwiIC8+JyxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24gKCRzY29wZSwgU2VjcmV0U3Rhc2gpIHtcbiAgICAgICAgICAgIFNlY3JldFN0YXNoLmdldFN0YXNoKCkudGhlbihmdW5jdGlvbiAoc3Rhc2gpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc3Rhc2ggPSBzdGFzaDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGRhdGEuYXV0aGVudGljYXRlIGlzIHJlYWQgYnkgYW4gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgLy8gdGhhdCBjb250cm9scyBhY2Nlc3MgdG8gdGhpcyBzdGF0ZS4gUmVmZXIgdG8gYXBwLmpzLlxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBhdXRoZW50aWNhdGU6IHRydWVcbiAgICAgICAgfVxuICAgIH0pO1xuXG59KTtcblxuYXBwLmZhY3RvcnkoJ1NlY3JldFN0YXNoJywgZnVuY3Rpb24gKCRodHRwKSB7XG5cbiAgICB2YXIgZ2V0U3Rhc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvbWVtYmVycy9zZWNyZXQtc3Rhc2gnKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRTdGFzaDogZ2V0U3Rhc2hcbiAgICB9O1xuXG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ3JhbmtEaXJlY3RpdmUnLCAoKT0+IHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0UnLFxuXHRcdHNjb3BlOiB7XG5cdFx0XHRyYW5rTmFtZTogJ0AnLFxuXHRcdFx0cGxheWVyczogJz0nLFxuXHRcdFx0cmFua0J5OiAnQCcsXG5cdFx0XHRvcmRlcjogJ0AnXG5cdFx0fSxcblx0XHR0ZW1wbGF0ZVVybDogJy9qcy9yYW5rL3JhbmsudGVtcGxhdGUuaHRtbCdcblx0fVxufSk7IiwiYXBwLmZhY3RvcnkoJ1NpZ251cEZhY3RvcnknLCBmdW5jdGlvbigkaHR0cCwgJHN0YXRlLCBBdXRoU2VydmljZSkge1xuXHRjb25zdCBTaWdudXBGYWN0b3J5ID0ge307XG5cblx0U2lnbnVwRmFjdG9yeS5jcmVhdGVVc2VyID0gZnVuY3Rpb24oc2lnbnVwSW5mbykge1xuXHRcdGNvbnNvbGUubG9nKHNpZ251cEluZm8pXG5cdFx0cmV0dXJuICRodHRwLnBvc3QoJy9zaWdudXAnLCBzaWdudXBJbmZvKVxuXHRcdC50aGVuKHJlcyA9PiB7XG5cdFx0XHRpZiAocmVzLnN0YXR1cyA9PT0gMjAxKSB7XG5cdFx0XHRcdEF1dGhTZXJ2aWNlLmxvZ2luKHtlbWFpbDogc2lnbnVwSW5mby5lbWFpbCwgcGFzc3dvcmQ6IHNpZ251cEluZm8ucGFzc3dvcmR9KVxuXHRcdFx0XHQudGhlbih1c2VyID0+IHtcblx0XHRcdFx0XHQkc3RhdGUuZ28oJ2hvbWUnKVxuXHRcdFx0XHR9KVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhyb3cgRXJyb3IoJ0FuIGFjY291bnQgd2l0aCB0aGF0IGVtYWlsIGFscmVhZHkgZXhpc3RzJyk7XG5cdFx0XHR9XG5cdFx0fSlcblx0fVxuXG5cdHJldHVybiBTaWdudXBGYWN0b3J5O1xufSkiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3NpZ251cCcsIHtcbiAgICAgICAgdXJsOiAnL3NpZ251cCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvc2lnbnVwL3NpZ251cC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1NpZ251cEN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignU2lnbnVwQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUsIFNpZ251cEZhY3RvcnkpIHtcblxuICAgICRzY29wZS5zaWdudXAgPSB7fTtcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgJHNjb3BlLnNlbmRTaWdudXAgPSBmdW5jdGlvbihzaWdudXBJbmZvKXtcbiAgICAgICAgU2lnbnVwRmFjdG9yeS5jcmVhdGVVc2VyKHNpZ251cEluZm8pXG4gICAgICAgIC5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnQW4gYWNjb3VudCB3aXRoIHRoYXQgZW1haWwgYWxyZWFkeSBleGlzdHMnO1xuICAgICAgICB9KVxuICAgIH1cbiAgICBcblxuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpe1xuXHQkc3RhdGVQcm92aWRlci5zdGF0ZShcIlVzZXJQcm9maWxlXCIse1xuXHRcdHVybDogXCIvdXNlcnMvOnVzZXJJZFwiLFxuXHRcdHRlbXBsYXRlVXJsOlwianMvdXNlcl9wcm9maWxlL3Byb2ZpbGUudGVtcGxhdGUuaHRtbFwiLFxuXHRcdGNvbnRyb2xsZXI6IFwiVXNlckN0cmxcIlxuXHR9KVxuXHQkc3RhdGVQcm92aWRlci5zdGF0ZShcIkdhbWVSZWNvcmRcIiwge1xuXHRcdHVybDpcIi91c2Vycy86dXNlcklkL2dhbWVzXCIsXG5cdFx0dGVtcGxhdGVVcmw6IFwianMvdXNlcl9wcm9maWxlL2dhbWVzLmh0bWxcIixcblx0XHRjb250cm9sbGVyOiBcIkdhbWVSZWNvcmRDdHJsXCJcblx0fSlcbn0pXG5cbmFwcC5jb250cm9sbGVyKFwiVXNlckN0cmxcIiwgZnVuY3Rpb24oJHNjb3BlLCBVc2VyRmFjdG9yeSwgJHN0YXRlUGFyYW1zKXtcblx0VXNlckZhY3RvcnkuZmV0Y2hJbmZvcm1hdGlvbigkc3RhdGVQYXJhbXMudXNlcklkKVxuXHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0XHQkc2NvcGUudXNlcj11c2VyO1xuXHRcdHJldHVybiB1c2VyXG5cdH0pXG5cdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHRcdCRzY29wZS51cGRhdGVkPSRzY29wZS51c2VyLnVwZGF0ZWRBdC5nZXREYXkoKTtcblx0fSlcbn0pXG5cbmFwcC5jb250cm9sbGVyKFwiR2FtZVJlY29yZEN0cmxcIixmdW5jdGlvbigkc2NvcGUsIFVzZXJGYWN0b3J5LCAkc3RhdGVQYXJhbXMpe1xuXHRVc2VyRmFjdG9yeS5mZXRjaEluZm9ybWF0aW9uKCRzdGF0ZVBhcmFtcy51c2VySWQpXG5cdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHRcdCRzY29wZS51c2VyPXVzZXI7XG5cdH0pXG5cdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHRVc2VyRmFjdG9yeS5mZXRjaEdhbWVzKCRzdGF0ZVBhcmFtcy51c2VySWQpXG5cdH0pXG5cdC50aGVuKGZ1bmN0aW9uKGdhbWVzKXtcblx0XHQkc2NvcGUuZ2FtZXM9Z2FtZXM7XG5cdH0pXG59KSIsImFwcC5mYWN0b3J5KFwiVXNlckZhY3RvcnlcIiwgZnVuY3Rpb24oJGh0dHApe1xuXHRyZXR1cm4ge1xuXHRcdGZldGNoSW5mb3JtYXRpb246IGZ1bmN0aW9uKGlkKXtcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoXCIvYXBpL3VzZXJzL1wiK2lkKVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG5cdFx0XHRcdHJldHVybiB1c2VyLmRhdGE7XG5cdFx0XHR9KVxuXHRcdH0sXG5cdFx0ZmV0Y2hHYW1lczogZnVuY3Rpb24oaWQpe1xuXHRcdFx0cmV0dXJuICRodHRwLmdldChcIi9hcGkvdXNlcnMvXCIraWQrXCIvZ2FtZXNcIilcblx0XHRcdC50aGVuKGZ1bmN0aW9uKGdhbWVzKXtcblx0XHRcdFx0cmV0dXJuIGdhbWVzLmRhdGE7XG5cdFx0XHR9KVxuXHRcdH1cblx0fVxufSkiLCJhcHAuZmFjdG9yeSgnRnVsbHN0YWNrUGljcycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW1xuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I3Z0JYdWxDQUFBWFFjRS5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9mYmNkbi1zcGhvdG9zLWMtYS5ha2FtYWloZC5uZXQvaHBob3Rvcy1hay14YXAxL3QzMS4wLTgvMTA4NjI0NTFfMTAyMDU2MjI5OTAzNTkyNDFfODAyNzE2ODg0MzMxMjg0MTEzN19vLmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1MS1VzaElnQUV5OVNLLmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjc5LVg3b0NNQUFrdzd5LmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1VajlDT0lJQUlGQWgwLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjZ5SXlGaUNFQUFxbDEyLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0UtVDc1bFdBQUFtcXFKLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0V2WkFnLVZBQUFrOTMyLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0VnTk1lT1hJQUlmRGhLLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0VReUlETldnQUF1NjBCLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0NGM1Q1UVc4QUUybEdKLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FlVnc1U1dvQUFBTHNqLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FhSklQN1VrQUFsSUdzLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FRT3c5bFdFQUFZOUZsLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1PUWJWckNNQUFOd0lNLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjliX2Vyd0NZQUF3UmNKLnBuZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjVQVGR2bkNjQUVBbDR4LmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjRxd0MwaUNZQUFsUEdoLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjJiMzN2UklVQUE5bzFELmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQndwSXdyMUlVQUF2TzJfLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQnNTc2VBTkNZQUVPaEx3LmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0o0dkxmdVV3QUFkYTRMLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0k3d3pqRVZFQUFPUHBTLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0lkSHZUMlVzQUFubkhWLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0dDaVBfWVdZQUFvNzVWLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0lTNEpQSVdJQUkzN3F1LmpwZzpsYXJnZSdcbiAgICBdO1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnUmFuZG9tR3JlZXRpbmdzJywgZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGdldFJhbmRvbUZyb21BcnJheSA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgICAgICAgcmV0dXJuIGFycltNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBhcnIubGVuZ3RoKV07XG4gICAgfTtcblxuICAgIHZhciBncmVldGluZ3MgPSBbXG4gICAgICAgICdIZWxsbywgd29ybGQhJyxcbiAgICAgICAgJ0F0IGxvbmcgbGFzdCwgSSBsaXZlIScsXG4gICAgICAgICdIZWxsbywgc2ltcGxlIGh1bWFuLicsXG4gICAgICAgICdXaGF0IGEgYmVhdXRpZnVsIGRheSEnLFxuICAgICAgICAnSVxcJ20gbGlrZSBhbnkgb3RoZXIgcHJvamVjdCwgZXhjZXB0IHRoYXQgSSBhbSB5b3Vycy4gOiknLFxuICAgICAgICAnVGhpcyBlbXB0eSBzdHJpbmcgaXMgZm9yIExpbmRzYXkgTGV2aW5lLicsXG4gICAgICAgICfjgZPjgpPjgavjgaHjga/jgIHjg6bjg7zjgrbjg7zmp5jjgIInLFxuICAgICAgICAnV2VsY29tZS4gVG8uIFdFQlNJVEUuJyxcbiAgICAgICAgJzpEJyxcbiAgICAgICAgJ1llcywgSSB0aGluayB3ZVxcJ3ZlIG1ldCBiZWZvcmUuJyxcbiAgICAgICAgJ0dpbW1lIDMgbWlucy4uLiBJIGp1c3QgZ3JhYmJlZCB0aGlzIHJlYWxseSBkb3BlIGZyaXR0YXRhJyxcbiAgICAgICAgJ0lmIENvb3BlciBjb3VsZCBvZmZlciBvbmx5IG9uZSBwaWVjZSBvZiBhZHZpY2UsIGl0IHdvdWxkIGJlIHRvIG5ldlNRVUlSUkVMIScsXG4gICAgXTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGdyZWV0aW5nczogZ3JlZXRpbmdzLFxuICAgICAgICBnZXRSYW5kb21HcmVldGluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGdldFJhbmRvbUZyb21BcnJheShncmVldGluZ3MpO1xuICAgICAgICB9XG4gICAgfTtcblxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdmdWxsc3RhY2tMb2dvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uaHRtbCdcbiAgICB9O1xufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCduYXZiYXInLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsIEFVVEhfRVZFTlRTLCAkc3RhdGUpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7fSxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcblxuICAgICAgICAgICAgc2NvcGUuaXRlbXMgPSBbXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0hvbWUnLCBzdGF0ZTogJ2hvbWUnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0Fib3V0Jywgc3RhdGU6ICdhYm91dCcgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnWW91ciBQcm9maWxlJywgc3RhdGU6ICdVc2VyUHJvZmlsZScsIGF1dGg6IHRydWUgfVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG5cbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciByZW1vdmVVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2V0VXNlcigpO1xuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldFVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2VzcywgcmVtb3ZlVXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdyYW5kb0dyZWV0aW5nJywgZnVuY3Rpb24gKFJhbmRvbUdyZWV0aW5ncykge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9yYW5kby1ncmVldGluZy9yYW5kby1ncmVldGluZy5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG4gICAgICAgICAgICBzY29wZS5ncmVldGluZyA9IFJhbmRvbUdyZWV0aW5ncy5nZXRSYW5kb21HcmVldGluZygpO1xuICAgICAgICB9XG4gICAgfTtcblxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKFwidGltZXJcIiwgZnVuY3Rpb24oJHEsICRpbnRlcnZhbCwgU29ja2V0KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIHRpbWU6ICc9J1xuICAgICAgICB9LFxuICAgICAgICB0ZW1wbGF0ZVVybDogXCJqcy9jb21tb24vZGlyZWN0aXZlcy90aW1lci90aW1lci5odG1sXCIsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgICAgICB2YXIgdGltZSA9IHNjb3BlLnRpbWU7XG4gICAgICAgICAgICB2YXIgc3RhcnQ9c2NvcGUudGltZTtcbiAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gY29udmVydCh0aW1lKTtcbiAgICAgICAgICAgIHNjb3BlLmNvdW50ZG93biA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciB0aW1lciA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgdGltZSAtPSAxO1xuICAgICAgICAgICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IGNvbnZlcnQodGltZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aW1lIDwgMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBcIlRpbWUgdXAhXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKHRpbWVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWU9c3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIHNjb3BlLm1lc3NhZ2VzID0gW1wiR2V0IFJlYWR5IVwiLCBcIkdldCBTZXQhXCIsIFwiR28hXCIsICcvJ107XG4gICAgICAgICAgICAvLyAgICAgdmFyIGluZGV4ID0gMDtcbiAgICAgICAgICAgIC8vICAgICB2YXIgcHJlcGFyZSA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBzY29wZS5tZXNzYWdlc1tpbmRleF07XG4gICAgICAgICAgICAvLyAgICAgICAgIGluZGV4Kys7XG4gICAgICAgICAgICAvLyAgICAgICAgIGNvbnNvbGUubG9nKHNjb3BlLnRpbWVfcmVtYWluaW5nKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgaWYgKHNjb3BlLnRpbWVfcmVtYWluaW5nID09PSBcIi9cIikge1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBjb252ZXJ0KHRpbWUpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbChwcmVwYXJlKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIHZhciB0aW1lciA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICB0aW1lIC09IDE7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBjb252ZXJ0KHRpbWUpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgIGlmICh0aW1lIDwgMSkge1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IFwiVGltZSB1cCFcIjtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbCh0aW1lcik7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gICAgICAgICAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICAvLyAgICAgICAgIH1cbiAgICAgICAgICAgIC8vICAgICB9LCAxMDAwKTtcbiAgICAgICAgICAgIC8vIH07XG5cbiAgICAgICAgICAgIFNvY2tldC5vbignc3RhcnRCb2FyZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLmNvdW50ZG93bih0aW1lKTtcbiAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGNvbnZlcnQodGltZSkge1xuICAgICAgICAgICAgICAgIHZhciBzZWNvbmRzID0gKHRpbWUgJSA2MCkudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICB2YXIgY29udmVyc2lvbiA9IChNYXRoLmZsb29yKHRpbWUgLyA2MCkpICsgJzonO1xuICAgICAgICAgICAgICAgIGlmIChzZWNvbmRzLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udmVyc2lvbiArPSAnMCcgKyBzZWNvbmRzO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnZlcnNpb24gKz0gc2Vjb25kcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnZlcnNpb247XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59KVxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
