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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZG9jcy9kb2NzLmpzIiwiZ2FtZS1zdGF0ZS9ncmlkLmNvbnRyb2xsZXIuanMiLCJnYW1lLXN0YXRlL2dyaWQuZmFjdG9yeS5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiaG9tZS9ob21lLmNvbnRyb2xsZXIuanMiLCJob21lL2hvbWUuanMiLCJsZWFkZXJCb2FyZC9sZWFkZXJCb2FyZC5jb250cm9sbGVyLmpzIiwibGVhZGVyQm9hcmQvbGVhZGVyQm9hcmQuZmFjdG9yeS5qcyIsImxlYWRlckJvYXJkL2xlYWRlckJvYXJkLnN0YXRlLmpzIiwibG9iYnkvbG9iYnkuY29udHJvbGxlci5qcyIsImxvYmJ5L2xvYmJ5LmRpcmVjdGl2ZS5qcyIsImxvYmJ5L2xvYmJ5LmZhY3RvcnkuanMiLCJsb2JieS9sb2JieS5zdGF0ZS5qcyIsImxvZ2luL2xvZ2luLmpzIiwibWVtYmVycy1vbmx5L21lbWJlcnMtb25seS5qcyIsInJhbmsvcmFuay5kaXJlY3RpdmUuanMiLCJzaWdudXAvc2lnbnVwLmZhY3RvcnkuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwidXNlcl9wcm9maWxlL3Byb2ZpbGUuY29udHJvbGxlci5qcyIsInVzZXJfcHJvZmlsZS9wcm9maWxlLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL0Z1bGxzdGFja1BpY3MuanMiLCJjb21tb24vZmFjdG9yaWVzL1JhbmRvbUdyZWV0aW5ncy5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvdGltZXIvdGltZXIuanMiXSwibmFtZXMiOlsid2luZG93IiwiYXBwIiwiYW5ndWxhciIsIm1vZHVsZSIsImNvbmZpZyIsIiR1cmxSb3V0ZXJQcm92aWRlciIsIiRsb2NhdGlvblByb3ZpZGVyIiwiaHRtbDVNb2RlIiwib3RoZXJ3aXNlIiwid2hlbiIsImxvY2F0aW9uIiwicmVsb2FkIiwicnVuIiwiJHJvb3RTY29wZSIsIiRvbiIsImV2ZW50IiwidG9TdGF0ZSIsInRvUGFyYW1zIiwiZnJvbVN0YXRlIiwiZnJvbVBhcmFtcyIsInRocm93bkVycm9yIiwiY29uc29sZSIsImluZm8iLCJuYW1lIiwiZXJyb3IiLCJBdXRoU2VydmljZSIsIiRzdGF0ZSIsImRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgiLCJzdGF0ZSIsImRhdGEiLCJhdXRoZW50aWNhdGUiLCJpc0F1dGhlbnRpY2F0ZWQiLCJwcmV2ZW50RGVmYXVsdCIsImdldExvZ2dlZEluVXNlciIsInRoZW4iLCJ1c2VyIiwiZ28iLCIkc3RhdGVQcm92aWRlciIsInVybCIsImNvbnRyb2xsZXIiLCJ0ZW1wbGF0ZVVybCIsIiRzY29wZSIsIkZ1bGxzdGFja1BpY3MiLCJpbWFnZXMiLCJfIiwic2h1ZmZsZSIsIkJvYXJkRmFjdG9yeSIsIlNvY2tldCIsIiRzdGF0ZVBhcmFtcyIsIkxvYmJ5RmFjdG9yeSIsInJvb21OYW1lIiwicm9vbW5hbWUiLCJvdGhlclBsYXllcnMiLCJnYW1lTGVuZ3RoIiwiZXhwb3J0cyIsIndvcmRPYmoiLCJ3b3JkIiwicGxheWVySWQiLCJzdGF0ZU51bWJlciIsInBvaW50c0Vhcm5lZCIsIm1vdXNlSXNEb3duIiwiZHJhZ2dpbmdBbGxvd2VkIiwic3R5bGUiLCJtZXNzYWdlIiwiZnJlZXplIiwiY2hlY2tTZWxlY3RlZCIsImlkIiwidG9nZ2xlRHJhZyIsIm1vdXNlRG93biIsIm1vdXNlVXAiLCJsZW5ndGgiLCJzdWJtaXQiLCJkcmFnIiwic3BhY2UiLCJjbGljayIsImxvZyIsImdldEN1cnJlbnRSb29tIiwicm9vbSIsImdhbWVJZCIsInVzZXJzIiwiZmlsdGVyIiwiZm9yRWFjaCIsInBsYXllciIsInNjb3JlIiwiam9pbkdhbWUiLCJoaWRlQm9hcmQiLCJzdGFydEdhbWUiLCJ1c2VySWRzIiwibWFwIiwicHVzaCIsImdldFN0YXJ0Qm9hcmQiLCJxdWl0IiwiaGlkZU5hdmJhciIsImJvYXJkIiwibWVzc2FnZXMiLCJzaXplIiwibHRyc1NlbGVjdGVkIiwiT2JqZWN0Iiwia2V5cyIsInByZXZpb3VzTHRyIiwibGFzdEx0ciIsInZhbGlkU2VsZWN0Iiwic3Vic3RyaW5nIiwibHRySWQiLCJvdGhlckx0cnNJZHMiLCJpbmNsdWRlcyIsImNvb3JkcyIsInNwbGl0Iiwicm93IiwiY29sIiwibGFzdEx0cklkIiwicG9wIiwiY29vcmRzTGFzdCIsInJvd0xhc3QiLCJjb2xMYXN0Iiwicm93T2Zmc2V0IiwiTWF0aCIsImFicyIsImNvbE9mZnNldCIsImNsZWFySWZDb25mbGljdGluZyIsInVwZGF0ZVdvcmRPYmoiLCJleHBvcnRXb3JkT2JqIiwidGlsZXNNb3ZlZCIsIm15V29yZFRpbGVzIiwic29tZSIsImNvb3JkIiwiY2xlYXIiLCJvYmoiLCJ1cGRhdGVCb2FyZCIsImtleSIsInVwZGF0ZVNjb3JlIiwicG9pbnRzIiwidXBkYXRlIiwidXBkYXRlT2JqIiwiJGV2YWxBc3luYyIsInJlcGxheSIsIm5ld0dhbWUiLCJkaXNjb25uZWN0Iiwib24iLCJlbWl0IiwiJGRpZ2VzdCIsImxhc3RXb3JkUGxheWVkIiwiZmFjdG9yeSIsIiRodHRwIiwiZ2V0IiwicmVzIiwicXVpdEZyb21Sb29tIiwidXNlcklkIiwiZGVsZXRlIiwiRXJyb3IiLCJpbyIsIm9yaWdpbiIsImNvbnN0YW50IiwibG9naW5TdWNjZXNzIiwibG9naW5GYWlsZWQiLCJsb2dvdXRTdWNjZXNzIiwic2Vzc2lvblRpbWVvdXQiLCJub3RBdXRoZW50aWNhdGVkIiwibm90QXV0aG9yaXplZCIsIiRxIiwiQVVUSF9FVkVOVFMiLCJzdGF0dXNEaWN0IiwicmVzcG9uc2VFcnJvciIsInJlc3BvbnNlIiwiJGJyb2FkY2FzdCIsInN0YXR1cyIsInJlamVjdCIsIiRodHRwUHJvdmlkZXIiLCJpbnRlcmNlcHRvcnMiLCIkaW5qZWN0b3IiLCJzZXJ2aWNlIiwiU2Vzc2lvbiIsIm9uU3VjY2Vzc2Z1bExvZ2luIiwiY3JlYXRlIiwiZnJvbVNlcnZlciIsImNhdGNoIiwibG9naW4iLCJjcmVkZW50aWFscyIsInBvc3QiLCJsb2dvdXQiLCJkZXN0cm95Iiwic2VsZiIsIiRsb2NhdGlvbiIsImVudGVyTG9iYnkiLCJMZWFkZXJCb2FyZEZhY3RvcnkiLCJBbGxQbGF5ZXJzIiwicGxheWVycyIsImdhbWVzIiwic2NvcmVzIiwiZ2FtZSIsInVzZXJHYW1lIiwiaGlnaGVzdFNjb3JlIiwibWF4IiwiZ2FtZXNfd29uIiwid2lubmVyIiwiZ2FtZXNfcGxheWVkIiwid2luX3BlcmNlbnRhZ2UiLCJ0b0ZpeGVkIiwicmVzb2x2ZSIsImFsbFBsYXllcnMiLCJyb29tcyIsInJvb21OYW1lRm9ybSIsIm5ld1Jvb20iLCJyb29tSW5mbyIsInNob3dGb3JtIiwiZGlyZWN0aXZlIiwicmVzdHJpY3QiLCJ0ZW1wUm9vbXMiLCJnZXRBbGxSb29tcyIsImNvcHkiLCJyb29tSWQiLCJwdXQiLCJzZW5kTG9naW4iLCJsb2dpbkluZm8iLCJ0ZW1wbGF0ZSIsIlNlY3JldFN0YXNoIiwiZ2V0U3Rhc2giLCJzdGFzaCIsInNjb3BlIiwicmFua05hbWUiLCJyYW5rQnkiLCJvcmRlciIsIlNpZ251cEZhY3RvcnkiLCJjcmVhdGVVc2VyIiwic2lnbnVwSW5mbyIsImVtYWlsIiwicGFzc3dvcmQiLCJzaWdudXAiLCJzZW5kU2lnbnVwIiwiVXNlckZhY3RvcnkiLCJmZXRjaEluZm9ybWF0aW9uIiwidXBkYXRlZCIsInVwZGF0ZWRBdCIsImdldERheSIsImZldGNoR2FtZXMiLCJnZXRSYW5kb21Gcm9tQXJyYXkiLCJhcnIiLCJmbG9vciIsInJhbmRvbSIsImdyZWV0aW5ncyIsImdldFJhbmRvbUdyZWV0aW5nIiwibGluayIsIml0ZW1zIiwibGFiZWwiLCJhdXRoIiwiaXNMb2dnZWRJbiIsInNldFVzZXIiLCJyZW1vdmVVc2VyIiwiUmFuZG9tR3JlZXRpbmdzIiwiZ3JlZXRpbmciLCIkaW50ZXJ2YWwiLCJ0aW1lIiwic3RhcnQiLCJ0aW1lX3JlbWFpbmluZyIsImNvbnZlcnQiLCJjb3VudGRvd24iLCJ0aW1lciIsImNhbmNlbCIsInNlY29uZHMiLCJ0b1N0cmluZyIsImNvbnZlcnNpb24iXSwibWFwcGluZ3MiOiJBQUFBOzs7O0FBQ0FBLE9BQUFDLEdBQUEsR0FBQUMsUUFBQUMsTUFBQSxDQUFBLHVCQUFBLEVBQUEsQ0FBQSxhQUFBLEVBQUEsV0FBQSxFQUFBLGNBQUEsRUFBQSxXQUFBLENBQUEsQ0FBQTs7QUFFQUYsSUFBQUcsTUFBQSxDQUFBLFVBQUFDLGtCQUFBLEVBQUFDLGlCQUFBLEVBQUE7QUFDQTtBQUNBQSxzQkFBQUMsU0FBQSxDQUFBLElBQUE7QUFDQTtBQUNBRix1QkFBQUcsU0FBQSxDQUFBLEdBQUE7QUFDQTtBQUNBSCx1QkFBQUksSUFBQSxDQUFBLGlCQUFBLEVBQUEsWUFBQTtBQUNBVCxlQUFBVSxRQUFBLENBQUFDLE1BQUE7QUFDQSxLQUZBO0FBR0EsQ0FUQTs7QUFXQTtBQUNBVixJQUFBVyxHQUFBLENBQUEsVUFBQUMsVUFBQSxFQUFBO0FBQ0FBLGVBQUFDLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLFVBQUFDLEtBQUEsRUFBQUMsT0FBQSxFQUFBQyxRQUFBLEVBQUFDLFNBQUEsRUFBQUMsVUFBQSxFQUFBQyxXQUFBLEVBQUE7QUFDQUMsZ0JBQUFDLElBQUEsZ0ZBQUFOLFFBQUFPLElBQUE7QUFDQUYsZ0JBQUFHLEtBQUEsQ0FBQUosV0FBQTtBQUNBLEtBSEE7QUFJQSxDQUxBOztBQU9BO0FBQ0FuQixJQUFBVyxHQUFBLENBQUEsVUFBQUMsVUFBQSxFQUFBWSxXQUFBLEVBQUFDLE1BQUEsRUFBQTs7QUFFQTtBQUNBLFFBQUFDLCtCQUFBLFNBQUFBLDRCQUFBLENBQUFDLEtBQUEsRUFBQTtBQUNBLGVBQUFBLE1BQUFDLElBQUEsSUFBQUQsTUFBQUMsSUFBQSxDQUFBQyxZQUFBO0FBQ0EsS0FGQTs7QUFJQTtBQUNBO0FBQ0FqQixlQUFBQyxHQUFB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QTREQSxDQTdEQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xud2luZG93LmFwcCA9IGFuZ3VsYXIubW9kdWxlKCdGdWxsc3RhY2tHZW5lcmF0ZWRBcHAnLCBbJ2ZzYVByZUJ1aWx0JywgJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnbmdBbmltYXRlJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG4gICAgLy8gVHJpZ2dlciBwYWdlIHJlZnJlc2ggd2hlbiBhY2Nlc3NpbmcgYW4gT0F1dGggcm91dGVcbiAgICAkdXJsUm91dGVyUHJvdmlkZXIud2hlbignL2F1dGgvOnByb3ZpZGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgfSk7XG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBsaXN0ZW5pbmcgdG8gZXJyb3JzIGJyb2FkY2FzdGVkIGJ5IHVpLXJvdXRlciwgdXN1YWxseSBvcmlnaW5hdGluZyBmcm9tIHJlc29sdmVzXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlKSB7XG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZUVycm9yJywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcywgZnJvbVN0YXRlLCBmcm9tUGFyYW1zLCB0aHJvd25FcnJvcikge1xuICAgICAgICBjb25zb2xlLmluZm8oYFRoZSBmb2xsb3dpbmcgZXJyb3Igd2FzIHRocm93biBieSB1aS1yb3V0ZXIgd2hpbGUgdHJhbnNpdGlvbmluZyB0byBzdGF0ZSBcIiR7dG9TdGF0ZS5uYW1lfVwiLiBUaGUgb3JpZ2luIG9mIHRoaXMgZXJyb3IgaXMgcHJvYmFibHkgYSByZXNvbHZlIGZ1bmN0aW9uOmApO1xuICAgICAgICBjb25zb2xlLmVycm9yKHRocm93bkVycm9yKTtcbiAgICB9KTtcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxuICAgIHZhciBkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xuICAgIH07XG5cbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMpIHtcblxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHVzZXIgaXMgcmV0cmlldmVkLCB0aGVuIHJlbmF2aWdhdGUgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXG4gICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAvLyBSZWdpc3RlciBvdXIgKmFib3V0KiBzdGF0ZS5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnYWJvdXQnLCB7XG4gICAgICAgIHVybDogJy9hYm91dCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBYm91dENvbnRyb2xsZXInLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Fib3V0L2Fib3V0Lmh0bWwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignQWJvdXRDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgRnVsbHN0YWNrUGljcykge1xuXG4gICAgLy8gSW1hZ2VzIG9mIGJlYXV0aWZ1bCBGdWxsc3RhY2sgcGVvcGxlLlxuICAgICRzY29wZS5pbWFnZXMgPSBfLnNodWZmbGUoRnVsbHN0YWNrUGljcyk7XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZG9jcycsIHtcbiAgICAgICAgdXJsOiAnL2RvY3MnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2RvY3MvZG9jcy5odG1sJ1xuICAgIH0pO1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ0dhbWUnLCB7XG4gICAgICAgIHVybDogJy9nYW1lLzpyb29tbmFtZScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZ2FtZS1zdGF0ZS9wYWdlLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiBcIkdhbWVDdHJsXCIsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcblxuXG5hcHAuY29udHJvbGxlcignR2FtZUN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIEJvYXJkRmFjdG9yeSwgU29ja2V0LCAkc3RhdGVQYXJhbXMsIEF1dGhTZXJ2aWNlLCAkc3RhdGUsIExvYmJ5RmFjdG9yeSwgJHJvb3RTY29wZSkge1xuXG4gICAgJHNjb3BlLnJvb21OYW1lID0gJHN0YXRlUGFyYW1zLnJvb21uYW1lO1xuXG4gICAgJHNjb3BlLm90aGVyUGxheWVycyA9IFtdO1xuXG4gICAgJHNjb3BlLmdhbWVMZW5ndGggPSAzMDtcblxuICAgICRzY29wZS5leHBvcnRzID0ge1xuICAgICAgICB3b3JkT2JqOiB7fSxcbiAgICAgICAgd29yZDogXCJcIixcbiAgICAgICAgcGxheWVySWQ6IG51bGwsXG4gICAgICAgIHN0YXRlTnVtYmVyOiAwLFxuICAgICAgICBwb2ludHNFYXJuZWQ6IG51bGxcbiAgICB9O1xuXG4gICAgJHNjb3BlLm1vdXNlSXNEb3duID0gZmFsc2U7XG4gICAgJHNjb3BlLmRyYWdnaW5nQWxsb3dlZCA9IGZhbHNlO1xuXG4gICAgJHNjb3BlLnN0eWxlPW51bGw7XG4gICAgJHNjb3BlLm1lc3NhZ2U9Jyc7XG4gICAgJHNjb3BlLmZyZWV6ZT1mYWxzZTtcblxuICAgICRzY29wZS5jaGVja1NlbGVjdGVkPWZ1bmN0aW9uKGlkKXtcbiAgICAgICAgcmV0dXJuIGlkIGluICRzY29wZS5leHBvcnRzLndvcmRPYmo7XG4gICAgfTtcblxuICAgICRzY29wZS50b2dnbGVEcmFnID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5kcmFnZ2luZ0FsbG93ZWQgPSAhJHNjb3BlLmRyYWdnaW5nQWxsb3dlZDtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm1vdXNlRG93biA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUubW91c2VJc0Rvd24gPSB0cnVlO1xuICAgIH07XG5cbiAgICAkc2NvcGUubW91c2VVcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUubW91c2VJc0Rvd24gPSBmYWxzZTtcbiAgICAgICAgaWYgKCRzY29wZS5kcmFnZ2luZ0FsbG93ZWQgJiYgJHNjb3BlLmV4cG9ydHMud29yZC5sZW5ndGggPiAxKSAkc2NvcGUuc3VibWl0KCRzY29wZS5leHBvcnRzKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmRyYWcgPSBmdW5jdGlvbihzcGFjZSwgaWQpIHtcbiAgICAgICAgaWYgKCRzY29wZS5tb3VzZUlzRG93biAmJiAkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkKSB7XG4gICAgICAgICAgICAkc2NvcGUuY2xpY2soc3BhY2UsIGlkKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKVxuICAgICAgICAudGhlbihmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygndXNlciBmcm9tIEF1dGhTZXJ2aWNlJywgdXNlcik7XG4gICAgICAgICAgICAkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy5wbGF5ZXJJZCA9IHVzZXIuaWQ7XG4gICAgICAgIH0pO1xuXG4gICAgLy9nZXQgdGhlIGN1cnJlbnQgcm9vbSBpbmZvXG4gICAgQm9hcmRGYWN0b3J5LmdldEN1cnJlbnRSb29tKCRzdGF0ZVBhcmFtcy5yb29tbmFtZSlcbiAgICAgICAgLnRoZW4ocm9vbSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhyb29tKVxuICAgICAgICAgICAgJHNjb3BlLmdhbWVJZCA9IHJvb20uaWQ7XG4gICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzID0gcm9vbS51c2Vycy5maWx0ZXIodXNlciA9PiB1c2VyLmlkICE9PSAkc2NvcGUudXNlci5pZCk7XG4gICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzLmZvckVhY2gocGxheWVyID0+IHsgcGxheWVyLnNjb3JlID0gMCB9KVxuICAgICAgICAgICAgTG9iYnlGYWN0b3J5LmpvaW5HYW1lKHJvb20uaWQsICRzY29wZS51c2VyLmlkKTtcbiAgICAgICAgfSk7XG5cbiAgICAkc2NvcGUuaGlkZUJvYXJkID0gdHJ1ZTtcblxuICAgIC8vIFN0YXJ0IHRoZSBnYW1lIHdoZW4gYWxsIHBsYXllcnMgaGF2ZSBqb2luZWQgcm9vbVxuICAgICRzY29wZS5zdGFydEdhbWUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHVzZXJJZHMgPSAkc2NvcGUub3RoZXJQbGF5ZXJzLm1hcCh1c2VyID0+IHVzZXIuaWQpO1xuICAgICAgICB1c2VySWRzLnB1c2goJHNjb3BlLnVzZXIuaWQpO1xuICAgICAgICBjb25zb2xlLmxvZygnb3AnLCAkc2NvcGUub3RoZXJQbGF5ZXJzLCAndWknLCB1c2VySWRzKTtcbiAgICAgICAgQm9hcmRGYWN0b3J5LmdldFN0YXJ0Qm9hcmQoJHNjb3BlLmdhbWVMZW5ndGgsICRzY29wZS5nYW1lSWQsIHVzZXJJZHMpO1xuICAgIH07XG5cblxuICAgIC8vUXVpdCB0aGUgcm9vbSwgYmFjayB0byBsb2JieVxuICAgICRzY29wZS5xdWl0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIEJvYXJkRmFjdG9yeS5xdWl0RnJvbVJvb20oJHNjb3BlLmdhbWVJZCwgJHNjb3BlLnVzZXIuaWQpXG4gICAgICAgIC8vICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgIC8vICAgICAgICAgJHN0YXRlLmdvKCdsb2JieScpO1xuICAgICAgICAvLyAgICAgfSk7XG5cbiAgICAgICAgJHJvb3RTY29wZS5oaWRlTmF2YmFyID0gZmFsc2U7XG4gICAgICAgICRzdGF0ZS5nbygnbG9iYnknKVxuICAgIH07XG5cblxuICAgICRzY29wZS5ib2FyZCA9IFtcbiAgICAgICAgWydiJywgJ2EnLCAnZCcsICdlJywgJ2EnLCAnciddLFxuICAgICAgICBbJ2UnLCAnZicsICdnJywgJ2wnLCAnbScsICdlJ10sXG4gICAgICAgIFsnaCcsICdpJywgJ2onLCAnZicsICdvJywgJ2EnXSxcbiAgICAgICAgWydjJywgJ2EnLCAnZCcsICdlJywgJ2EnLCAnciddLFxuICAgICAgICBbJ2UnLCAnZicsICdnJywgJ2wnLCAnZCcsICdlJ10sXG4gICAgICAgIFsnaCcsICdpJywgJ2onLCAnZicsICdvJywgJ2EnXVxuICAgIF07XG5cbiAgICAkc2NvcGUubWVzc2FnZXMgPSBudWxsO1xuXG4gICAgJHNjb3BlLnNpemUgPSAzO1xuICAgICRzY29wZS5zY29yZSA9IDA7XG4gICAgLy8gJHNjb3BlLnBsYXllck5hbWUgPSAnTWUnO1xuICAgIC8vICRzY29wZS5wbGF5ZXIgPSAkc2NvcGUudXNlci5pZDtcblxuICAgIC8vICRzY29wZS5vdGhlclBsYXllcnMgPSBbeyBuYW1lOiAnWW91Jywgc2NvcmU6IDAsIGlkOiAxIH0sXG4gICAgLy8gICAgIHsgbmFtZTogJ0hpbScsIHNjb3JlOiAwLCBpZDogMiB9LFxuICAgIC8vICAgICB7IG5hbWU6ICdIZXInLCBzY29yZTogMCwgaWQ6IDMgfVxuICAgIC8vIF07XG5cbiAgICAkc2NvcGUuY2xpY2sgPSBmdW5jdGlvbihzcGFjZSwgaWQpIHtcbiAgICAgICAgaWYgKCRzY29wZS5mcmVlemUpe3JldHVybiA7fVxuICAgICAgICBjb25zb2xlLmxvZygnY2xpY2tlZCAnLCBzcGFjZSwgaWQpO1xuICAgICAgICB2YXIgbHRyc1NlbGVjdGVkID0gT2JqZWN0LmtleXMoJHNjb3BlLmV4cG9ydHMud29yZE9iaik7XG4gICAgICAgIHZhciBwcmV2aW91c0x0ciA9IGx0cnNTZWxlY3RlZFtsdHJzU2VsZWN0ZWQubGVuZ3RoIC0gMl07XG4gICAgICAgIHZhciBsYXN0THRyID0gbHRyc1NlbGVjdGVkW2x0cnNTZWxlY3RlZC5sZW5ndGggLSAxXTtcbiAgICAgICAgaWYgKCFsdHJzU2VsZWN0ZWQubGVuZ3RoIHx8IHZhbGlkU2VsZWN0KGlkLCBsdHJzU2VsZWN0ZWQpKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkICs9IHNwYWNlO1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZE9ialtpZF0gPSBzcGFjZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCRzY29wZS5leHBvcnRzKTtcbiAgICAgICAgfSBlbHNlIGlmIChpZCA9PT0gcHJldmlvdXNMdHIpIHtcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLndvcmQgPSAkc2NvcGUuZXhwb3J0cy53b3JkLnN1YnN0cmluZygwLCAkc2NvcGUuZXhwb3J0cy53b3JkLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgZGVsZXRlICRzY29wZS5leHBvcnRzLndvcmRPYmpbbGFzdEx0cl07XG4gICAgICAgIH0gZWxzZSBpZiAobHRyc1NlbGVjdGVkLmxlbmd0aCA9PT0gMSAmJiBpZCA9PT0gbGFzdEx0cikge1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZD1cIlwiO1xuICAgICAgICAgICAgZGVsZXRlICRzY29wZS5leHBvcnRzLndvcmRPYmpbbGFzdEx0cl07XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy9tYWtlcyBzdXJlIGxldHRlciBpcyBhZGphY2VudCB0byBwcmV2IGx0ciwgYW5kIGhhc24ndCBiZWVuIHVzZWQgeWV0XG4gICAgZnVuY3Rpb24gdmFsaWRTZWxlY3QobHRySWQsIG90aGVyTHRyc0lkcykge1xuICAgICAgICBpZiAob3RoZXJMdHJzSWRzLmluY2x1ZGVzKGx0cklkKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB2YXIgY29vcmRzID0gbHRySWQuc3BsaXQoJy0nKTtcbiAgICAgICAgdmFyIHJvdyA9IGNvb3Jkc1swXTtcbiAgICAgICAgdmFyIGNvbCA9IGNvb3Jkc1sxXTtcbiAgICAgICAgdmFyIGxhc3RMdHJJZCA9IG90aGVyTHRyc0lkcy5wb3AoKTtcbiAgICAgICAgdmFyIGNvb3Jkc0xhc3QgPSBsYXN0THRySWQuc3BsaXQoJy0nKTtcbiAgICAgICAgdmFyIHJvd0xhc3QgPSBjb29yZHNMYXN0WzBdO1xuICAgICAgICB2YXIgY29sTGFzdCA9IGNvb3Jkc0xhc3RbMV07XG4gICAgICAgIHZhciByb3dPZmZzZXQgPSBNYXRoLmFicyhyb3cgLSByb3dMYXN0KTtcbiAgICAgICAgdmFyIGNvbE9mZnNldCA9IE1hdGguYWJzKGNvbCAtIGNvbExhc3QpO1xuICAgICAgICByZXR1cm4gKHJvd09mZnNldCA8PSAxICYmIGNvbE9mZnNldCA8PSAxKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbGVhcklmQ29uZmxpY3RpbmcodXBkYXRlV29yZE9iaiwgZXhwb3J0V29yZE9iaikge1xuICAgICAgICB2YXIgdGlsZXNNb3ZlZCA9IE9iamVjdC5rZXlzKHVwZGF0ZVdvcmRPYmopO1xuICAgICAgICB2YXIgbXlXb3JkVGlsZXMgPSBPYmplY3Qua2V5cyhleHBvcnRXb3JkT2JqKTtcbiAgICAgICAgaWYgKHRpbGVzTW92ZWQuc29tZShjb29yZCA9PiBteVdvcmRUaWxlcy5pbmNsdWRlcyhjb29yZCkpKSAkc2NvcGUuY2xlYXIoKTtcbiAgICB9XG5cbiAgICAkc2NvcGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZCA9IFwiXCI7XG4gICAgICAgICRzY29wZS5leHBvcnRzLndvcmRPYmogPSB7fTtcbiAgICB9O1xuXG4gICAgLy8gJHNjb3BlLnN1Ym1pdCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vICAgICByZXR1cm4gQm9hcmRGYWN0b3J5LnN1Ym1pdCgpXG4gICAgLy8gICAgICAgICAvLyAudGhlbihmdW5jdGlvbih4KSB7XG4gICAgLy8gICAgICAgICAvLyAgICAgJHNjb3BlLmV4cG9ydHMud29yZE9iaiA9IHt9O1xuICAgIC8vICAgICAgICAgLy8gICAgICRzY29wZS5leHBvcnRzLndvcmQgPSBcIlwiO1xuICAgIC8vICAgICAgICAgfSk7XG4gICAgLy8gfTtcblxuXG4gICAgJHNjb3BlLnN1Ym1pdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgICBjb25zb2xlLmxvZygnc3VibWl0dGluZyAnLCBvYmopO1xuICAgICAgICBCb2FyZEZhY3Rvcnkuc3VibWl0KG9iaik7XG4gICAgICAgICRzY29wZS5jbGVhcigpO1xuICAgIH07XG5cblxuICAgICRzY29wZS51cGRhdGVCb2FyZCA9IGZ1bmN0aW9uKHdvcmRPYmopIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3Njb3BlLmJvYXJkJywgJHNjb3BlLmJvYXJkKTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHdvcmRPYmopIHtcbiAgICAgICAgICAgIHZhciBjb29yZHMgPSBrZXkuc3BsaXQoJy0nKTtcbiAgICAgICAgICAgIHZhciByb3cgPSBjb29yZHNbMF07XG4gICAgICAgICAgICB2YXIgY29sID0gY29vcmRzWzFdO1xuICAgICAgICAgICAgJHNjb3BlLmJvYXJkW3Jvd11bY29sXSA9IHdvcmRPYmpba2V5XTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUudXBkYXRlU2NvcmUgPSBmdW5jdGlvbihwb2ludHMsIHBsYXllcklkKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCd1cGRhdGUgc2NvcmUgcG9pbnRzJywgcG9pbnRzKTtcbiAgICAgICAgaWYgKHBsYXllcklkID09PSAkc2NvcGUudXNlci5pZCkge1xuICAgICAgICAgICAgJHNjb3BlLnNjb3JlICs9IHBvaW50cztcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLnBvaW50c0Vhcm5lZCA9IG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBwbGF5ZXIgaW4gJHNjb3BlLm90aGVyUGxheWVycykge1xuICAgICAgICAgICAgICAgIGlmICgkc2NvcGUub3RoZXJQbGF5ZXJzW3BsYXllcl0uaWQgPT09IHBsYXllcklkKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnNbcGxheWVyXS5zY29yZSArPSBwb2ludHM7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLnBvaW50c0Vhcm5lZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICAkc2NvcGUudXBkYXRlID0gZnVuY3Rpb24odXBkYXRlT2JqKSB7XG4gICAgICAgICRzY29wZS51cGRhdGVTY29yZSh1cGRhdGVPYmoucG9pbnRzRWFybmVkLCB1cGRhdGVPYmoucGxheWVySWQpO1xuICAgICAgICAkc2NvcGUudXBkYXRlQm9hcmQodXBkYXRlT2JqLndvcmRPYmopO1xuICAgICAgICAkc2NvcGUubWVzc2FnZSA9IHVwZGF0ZU9iai5wbGF5ZXJJZCArIFwiIHBsYXllZCBcIiArIHVwZGF0ZU9iai53b3JkICsgXCIgZm9yIFwiICsgdXBkYXRlT2JqLnBvaW50c0Vhcm5lZCArIFwiIHBvaW50cyFcIjtcbiAgICAgICAgY29uc29sZS5sb2coJ2l0cyB1cGRhdGluZyEnKTtcbiAgICAgICAgY2xlYXJJZkNvbmZsaWN0aW5nKHVwZGF0ZU9iaiwgJHNjb3BlLmV4cG9ydHMud29yZE9iaik7XG4gICAgICAgICRzY29wZS5leHBvcnRzLnN0YXRlTnVtYmVyID0gdXBkYXRlT2JqLnN0YXRlTnVtYmVyO1xuICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgIH07XG5cbiAgICAkc2NvcGUucmVwbGF5PWZ1bmN0aW9uKCl7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiR08hXCIpO1xuICAgICAgICBMb2JieUZhY3RvcnkubmV3R2FtZSgkc2NvcGUucm9vbU5hbWUpO1xuICAgICAgICAkc2NvcGUuc3RhcnRHYW1lKCk7XG4gICAgfTtcblxuICAgICRyb290U2NvcGUuaGlkZU5hdmJhciA9IHRydWU7XG5cbiAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkgeyBTb2NrZXQuZGlzY29ubmVjdCgpOyB9KTtcbiAgICBjb25zb2xlLmxvZygndXBkYXRlIDEuMScpXG4gICAgU29ja2V0Lm9uKCdjb25uZWN0JywgZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgU29ja2V0LmVtaXQoJ2pvaW5Sb29tJywgJHNjb3BlLnVzZXIsICRzY29wZS5yb29tTmFtZSwgJHNjb3BlLmdhbWVJZCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdlbWl0dGluZyBcImpvaW4gcm9vbVwiIGV2ZW50IHRvIHNlcnZlcicsICRzY29wZS5yb29tTmFtZSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCdyb29tSm9pblN1Y2Nlc3MnLCBmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnbmV3IHVzZXIgam9pbmluZycsIHVzZXIuaWQpO1xuXG4gICAgICAgICAgICB1c2VyLnNjb3JlID0gMDtcbiAgICAgICAgICAgIC8vIHZhciBwbGF5ZXJJZHMgPSBbXTtcbiAgICAgICAgICAgIC8vICRzY29wZS5vdGhlclBsYXllcnMuZm9yRWFjaChvdGhlclBsYXllciA9PiB7XG4gICAgICAgICAgICAvLyAgICAgcGxheWVySWRzLnB1c2gob3RoZXJQbGF5ZXIuaWQpXG4gICAgICAgICAgICAvLyB9KTtcbiAgICAgICAgICAgIC8vIGlmIChwbGF5ZXJJZHMuaW5kZXhPZih1c2VyLmlkKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMucHVzaCh1c2VyKTtcbiAgICAgICAgICAgICRzY29wZS4kZGlnZXN0KCk7XG5cbiAgICAgICAgICAgIC8vIEJvYXJkRmFjdG9yeS5nZXRDdXJyZW50Um9vbSgkc3RhdGVQYXJhbXMucm9vbW5hbWUpXG4gICAgICAgICAgICAvLyAgICAgLnRoZW4ocm9vbSA9PiB7XG4gICAgICAgICAgICAvLyAgICAgICAgIGNvbnNvbGUubG9nKHJvb20pXG4gICAgICAgICAgICAvLyAgICAgICAgICRzY29wZS5nYW1lSWQgPSByb29tLmlkO1xuICAgICAgICAgICAgLy8gICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzID0gcm9vbS51c2Vycy5maWx0ZXIodXNlciA9PiB1c2VyLmlkICE9PSAkc2NvcGUudXNlci5pZCk7XG4gICAgICAgICAgICAvLyAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMuZm9yRWFjaChwbGF5ZXIgPT4geyBwbGF5ZXIuc2NvcmUgPSAwIH0pXG4gICAgICAgICAgICAvLyAgICAgfSlcblxuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIFNvY2tldC5vbigncm9vbURhdGEnLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIC8vICAgICBjb25zb2xlLmxvZygnbGlzdGVuaW5nIGZvciByb29tRGF0YSBldmVudCBmcm9tIHNlcnZlcicpXG4gICAgICAgIC8vICAgICBpZiAoZGF0YS5jb3VudC5sZW5ndGggPCAyKSB7XG4gICAgICAgIC8vICAgICAgICAgJHNjb3BlLm1lc3NhZ2VzID0gXCJXYWl0aW5nIGZvciBhbm90aGVyIHBsYXllclwiO1xuICAgICAgICAvLyAgICAgICAgIGNvbnNvbGUubG9nKCdzY29wZSBtZXNzYWdlOiAnLCAkc2NvcGUubWVzc2FnZXMpXG4gICAgICAgIC8vICAgICB9IGVsc2Uge1xuICAgICAgICAvLyAgICAgICAgICRzY29wZS5tZXNzYWdlcyA9IG51bGw7XG4gICAgICAgIC8vICAgICB9XG4gICAgICAgIC8vIH0pXG5cbiAgICAgICAgU29ja2V0Lm9uKCdzdGFydEJvYXJkJywgZnVuY3Rpb24oYm9hcmQpIHtcbiAgICAgICAgICAgICRzY29wZS5mcmVlemU9ZmFsc2U7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnYm9hcmQhICcsIGJvYXJkKTtcbiAgICAgICAgICAgICRzY29wZS5ib2FyZCA9IGJvYXJkO1xuICAgICAgICAgICAgLy8gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICRzY29wZS5oaWRlQm9hcmQgPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgICAgICAvLyB9LCAzMDAwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCd3b3JkVmFsaWRhdGVkJywgZnVuY3Rpb24odXBkYXRlT2JqKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnd29yZCBpcyB2YWxpZGF0ZWQnKTtcbiAgICAgICAgICAgICRzY29wZS51cGRhdGUodXBkYXRlT2JqKTtcbiAgICAgICAgICAgICRzY29wZS5sYXN0V29yZFBsYXllZCA9IHVwZGF0ZU9iai53b3JkO1xuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgfSk7XG5cblxuICAgICAgICBTb2NrZXQub24oJ3BsYXllckRpc2Nvbm5lY3RlZCcsIGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwbGF5ZXJEaXNjb25uZWN0ZWQnLCB1c2VyLmlkKTtcbiAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMgPSAkc2NvcGUub3RoZXJQbGF5ZXJzLm1hcChvdGhlclBsYXllcnMgPT4gb3RoZXJQbGF5ZXJzLmlkICE9PSB1c2VyLmlkKVxuXG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICBTb2NrZXQub24oJ2dhbWVPdmVyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkc2NvcGUuY2xlYXIoKTtcbiAgICAgICAgICAgICRzY29wZS4kZGlnZXN0KCk7XG4gICAgICAgICAgICAkc2NvcGUuZnJlZXplPXRydWU7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZ2FtZSBpcyBvdmVyJyk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSk7XG4iLCJhcHAuZmFjdG9yeSAoXCJCb2FyZEZhY3RvcnlcIiwgZnVuY3Rpb24oJGh0dHAsIFNvY2tldCl7XG5cdHJldHVybntcblx0XHRnZXRTdGFydEJvYXJkOiBmdW5jdGlvbihnYW1lTGVuZ3RoLCBnYW1lSWQsIHVzZXJJZHMpe1xuXHRcdFx0Y29uc29sZS5sb2coJ2ZhY3RvcnkuIGdsOiAnLCBnYW1lTGVuZ3RoKTtcblx0XHRcdFNvY2tldC5lbWl0KCdnZXRTdGFydEJvYXJkJywgZ2FtZUxlbmd0aCwgZ2FtZUlkLCB1c2VySWRzKTtcblx0XHR9LFxuXG5cdFx0c3VibWl0OiBmdW5jdGlvbihvYmope1xuXHRcdFx0U29ja2V0LmVtaXQoJ3N1Ym1pdFdvcmQnLCBvYmopO1xuXHRcdH0sXG5cblx0XHQvLyBmaW5kQWxsT3RoZXJVc2VyczogZnVuY3Rpb24oZ2FtZSkge1xuXHRcdC8vIFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS9nYW1lcy8nKyBnYW1lLmlkKVxuXHRcdC8vIFx0LnRoZW4ocmVzID0+IHJlcy5kYXRhKVxuXHRcdC8vIH0sXG5cblx0XHRnZXRDdXJyZW50Um9vbTogZnVuY3Rpb24ocm9vbW5hbWUpIHtcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvZ2FtZXMvcm9vbXMvJytyb29tbmFtZSlcblx0XHRcdC50aGVuKHJlcyA9PiByZXMuZGF0YSlcblx0XHR9LFxuXG5cdFx0cXVpdEZyb21Sb29tOiBmdW5jdGlvbihnYW1lSWQsIHVzZXJJZCkge1xuXHRcdFx0Ly8gU29ja2V0LmVtaXQoJ2Rpc2Nvbm5lY3QnLCByb29tTmFtZSwgdXNlcklkKTtcblx0XHRcdHJldHVybiAkaHR0cC5kZWxldGUoJy9hcGkvZ2FtZXMvJytnYW1lSWQrJy8nK3VzZXJJZClcblx0XHR9XG5cdH1cbn0pO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgW10pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgICB9KTtcblxuICAgIC8vIEFVVEhfRVZFTlRTIGlzIHVzZWQgdGhyb3VnaG91dCBvdXIgYXBwIHRvXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxuICAgIGFwcC5jb25zdGFudCgnQVVUSF9FVkVOVFMnLCB7XG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxuICAgICAgICBsb2dvdXRTdWNjZXNzOiAnYXV0aC1sb2dvdXQtc3VjY2VzcycsXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXG4gICAgICAgIG5vdEF1dGhvcml6ZWQ6ICdhdXRoLW5vdC1hdXRob3JpemVkJ1xuICAgIH0pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ0F1dGhJbnRlcmNlcHRvcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgQVVUSF9FVkVOVFMpIHtcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXG4gICAgICAgICAgICA0MDM6IEFVVEhfRVZFTlRTLm5vdEF1dGhvcml6ZWQsXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KHN0YXR1c0RpY3RbcmVzcG9uc2Uuc3RhdHVzXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goW1xuICAgICAgICAgICAgJyRpbmplY3RvcicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoJGluamVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRpbmplY3Rvci5nZXQoJ0F1dGhJbnRlcmNlcHRvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdBdXRoU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgU2Vzc2lvbiwgJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMsICRxKSB7XG5cbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzZnVsTG9naW4ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHZhciB1c2VyID0gcmVzcG9uc2UuZGF0YS51c2VyO1xuICAgICAgICAgICAgU2Vzc2lvbi5jcmVhdGUodXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzKTtcbiAgICAgICAgICAgIHJldHVybiB1c2VyO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlcyB0aGUgc2Vzc2lvbiBmYWN0b3J5IHRvIHNlZSBpZiBhblxuICAgICAgICAvLyBhdXRoZW50aWNhdGVkIHVzZXIgaXMgY3VycmVudGx5IHJlZ2lzdGVyZWQuXG4gICAgICAgIHRoaXMuaXNBdXRoZW50aWNhdGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhU2Vzc2lvbi51c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyID0gZnVuY3Rpb24gKGZyb21TZXJ2ZXIpIHtcblxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcbiAgICAgICAgICAgIC8vIHJldHVybiB0aGUgdXNlciBhdHRhY2hlZCB0byB0aGF0IHNlc3Npb25cbiAgICAgICAgICAgIC8vIHdpdGggYSBwcm9taXNlLiBUaGlzIGVuc3VyZXMgdGhhdCB3ZSBjYW5cbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cblxuICAgICAgICAgICAgLy8gT3B0aW9uYWxseSwgaWYgdHJ1ZSBpcyBnaXZlbiBhcyB0aGUgZnJvbVNlcnZlciBwYXJhbWV0ZXIsXG4gICAgICAgICAgICAvLyB0aGVuIHRoaXMgY2FjaGVkIHZhbHVlIHdpbGwgbm90IGJlIHVzZWQuXG5cbiAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0aGVudGljYXRlZCgpICYmIGZyb21TZXJ2ZXIgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbihTZXNzaW9uLnVzZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYWtlIHJlcXVlc3QgR0VUIC9zZXNzaW9uLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIHVzZXIsIGNhbGwgb25TdWNjZXNzZnVsTG9naW4gd2l0aCB0aGUgcmVzcG9uc2UuXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgNDAxIHJlc3BvbnNlLCB3ZSBjYXRjaCBpdCBhbmQgaW5zdGVhZCByZXNvbHZlIHRvIG51bGwuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dpbiA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dpbicsIGNyZWRlbnRpYWxzKVxuICAgICAgICAgICAgICAgIC50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2xvZ291dCcpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnU2Vzc2lvbicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUykge1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG59KCkpO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ0hvbWVDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGUsICRsb2NhdGlvbil7XG4gICRzY29wZS5lbnRlckxvYmJ5ID0gZnVuY3Rpb24oKXtcbiAgICAkc3RhdGUuZ28oJ2xvYmJ5Jywge3JlbG9hZDogdHJ1ZX0pO1xuICB9XG59KTtcblxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcbiAgICAgICAgdXJsOiAnLycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaG9tZS9ob21lLmh0bWwnXG4gICAgfSk7XG59KTtcblxuIiwiYXBwLmNvbnRyb2xsZXIoJ0xlYWRlckJvYXJkQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgTGVhZGVyQm9hcmRGYWN0b3J5LCAkc3RhdGUsIEF1dGhTZXJ2aWNlKSB7XG4gICAgY29uc29sZS5sb2coJyAxJylcbiAgICBMZWFkZXJCb2FyZEZhY3RvcnkuQWxsUGxheWVycygpXG4gICAgLnRoZW4ocGxheWVycyA9PiB7XG4gICAgICAgIHBsYXllcnMuZm9yRWFjaChwbGF5ZXIgPT4ge1xuICAgICAgICAgICAgaWYgKHBsYXllci5nYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNjb3JlcyA9IHBsYXllci5nYW1lcy5tYXAoZ2FtZSA9PiBnYW1lLnVzZXJHYW1lLnNjb3JlKVxuICAgICAgICAgICAgICAgIHBsYXllci5oaWdoZXN0U2NvcmUgPSBNYXRoLm1heCguLi5zY29yZXMpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBsYXllci5oaWdoZXN0U2NvcmUgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGxheWVyLmdhbWVzX3dvbiA9IHBsYXllci53aW5uZXIubGVuZ3RoO1xuICAgICAgICAgICAgcGxheWVyLmdhbWVzX3BsYXllZCA9IHBsYXllci5nYW1lcy5sZW5ndGg7XG4gICAgICAgICAgICBpZihwbGF5ZXIuZ2FtZXMubGVuZ3RoPT09MCl7XG4gICAgICAgICAgICBcdHBsYXllci53aW5fcGVyY2VudGFnZSA9IDAgKyAnJSdcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBcdHBsYXllci53aW5fcGVyY2VudGFnZSA9ICgocGxheWVyLndpbm5lci5sZW5ndGgvcGxheWVyLmdhbWVzLmxlbmd0aCkqMTAwKS50b0ZpeGVkKDApICsgJyUnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pXG4gICAgICAgICRzY29wZS5wbGF5ZXJzID0gcGxheWVycztcbiAgICB9KVxufSk7XG4iLCJhcHAuZmFjdG9yeSgnTGVhZGVyQm9hcmRGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG5cdHZhciBMZWFkZXJCb2FyZEZhY3RvcnkgPSB7fTtcblxuXHRMZWFkZXJCb2FyZEZhY3RvcnkuQWxsUGxheWVycyA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvdXNlcnMnKVxuXHRcdC50aGVuKHJlcz0+cmVzLmRhdGEpXG5cdH1cblxuXHRyZXR1cm4gTGVhZGVyQm9hcmRGYWN0b3J5O1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xlYWRlckJvYXJkJywge1xuICAgICAgICB1cmw6ICcvbGVhZGVyQm9hcmQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xlYWRlckJvYXJkL2xlYWRlckJvYXJkLnRlbXBsYXRlLmh0bWwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgIFx0YWxsUGxheWVyczogZnVuY3Rpb24oTGVhZGVyQm9hcmRGYWN0b3J5KSB7XG4gICAgICAgIFx0XHRyZXR1cm4gTGVhZGVyQm9hcmRGYWN0b3J5LkFsbFBsYXllcnM7XG4gICAgICAgIFx0fSxcbiAgICAgICAgICAgIFxuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiAnTGVhZGVyQm9hcmRDdHJsJ1xuICAgIH0pO1xuXG59KTsiLCJhcHAuY29udHJvbGxlcignTG9iYnlDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBMb2JieUZhY3RvcnksIHJvb21zLCAkc3RhdGUsIEF1dGhTZXJ2aWNlKSB7XG5cbiAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKVxuICAgICAgICAudGhlbihmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygndXNlciBmcm9tIEF1dGhTZXJ2aWNlJywgdXNlcik7XG4gICAgICAgICAgICAkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgIH0pO1xuXG4gICAgJHNjb3BlLnJvb21zID0gcm9vbXM7XG4gICAgJHNjb3BlLnJvb21OYW1lRm9ybSA9IGZhbHNlO1xuICAgIC8vICRzY29wZS51c2VyID0ge1xuICAgIC8vICBpZDogM1xuICAgIC8vIH1cblxuICAgICRzY29wZS5qb2luR2FtZSA9IGZ1bmN0aW9uKHJvb20pIHtcbiAgICAgICAgJHN0YXRlLmdvKCdHYW1lJywgeyByb29tbmFtZTogcm9vbS5yb29tbmFtZSB9KVxuICAgIH1cblxuICAgICRzY29wZS5uZXdSb29tID0gZnVuY3Rpb24ocm9vbUluZm8pIHtcbiAgICAgICAgTG9iYnlGYWN0b3J5Lm5ld0dhbWUocm9vbUluZm8pO1xuICAgICAgICAkc2NvcGUucm9vbU5hbWVGb3JtID0gZmFsc2U7XG4gICAgfVxuICAgICRzY29wZS5zaG93Rm9ybSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUucm9vbU5hbWVGb3JtID0gdHJ1ZTtcbiAgICB9XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnZW50ZXJMb2JieScsIGZ1bmN0aW9uKCl7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvYmJ5L2xvYmJ5LWJ1dHRvbi5odG1sJyxcbiAgICBjb250cm9sbGVyOiAnSG9tZUN0cmwnXG4gIH1cbn0pXG4iLCJhcHAuZmFjdG9yeSgnTG9iYnlGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG5cdHZhciBMb2JieUZhY3RvcnkgPSB7fTtcblx0dmFyIHRlbXBSb29tcyA9IFtdOyAvL3dvcmsgd2l0aCBzb2NrZXQ/XG5cblx0TG9iYnlGYWN0b3J5LmdldEFsbFJvb21zID0gZnVuY3Rpb24oKXtcblx0XHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2dhbWVzL3Jvb21zJylcblx0XHQudGhlbihyZXMgPT4gcmVzLmRhdGEpXG5cdFx0LnRoZW4ocm9vbXMgPT4ge1xuXHRcdFx0YW5ndWxhci5jb3B5KHJvb21zLCB0ZW1wUm9vbXMpO1xuXHRcdFx0cmV0dXJuIHRlbXBSb29tcztcblx0XHR9KVxuXHR9O1xuXG5cdExvYmJ5RmFjdG9yeS5qb2luR2FtZSA9IGZ1bmN0aW9uKHJvb21JZCwgdXNlcklkKSB7XG4gICAgY29uc29sZS5sb2coJ2xvYmJ5IGZhY3Rvcnkgam9pbiBnYW1lJyk7XG5cdFx0cmV0dXJuICRodHRwLnB1dCgnL2FwaS9nYW1lcy8nKyByb29tSWQgKycvcGxheWVyJywge2lkOiB1c2VySWR9KVxuXHRcdC50aGVuKHJlcz0+cmVzLmRhdGEpXG5cdH07XG5cblx0TG9iYnlGYWN0b3J5Lm5ld0dhbWUgPSBmdW5jdGlvbihyb29tSW5mbykge1xuXHRcdHJldHVybiAkaHR0cC5wdXQoJy9hcGkvZ2FtZXMnLCByb29tSW5mbylcblx0XHQudGhlbihyZXMgPT4gcmVzLmRhdGEpXG5cdFx0LnRoZW4ocm9vbSA9PiB7dGVtcFJvb21zLnB1c2gocm9vbSl9KVxuXHR9XG5cblx0TG9iYnlGYWN0b3J5LkFsbFBsYXllcnMgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3VzZXJzJylcblx0XHQudGhlbihyZXM9PnJlcy5kYXRhKVxuXHR9XG5cblx0cmV0dXJuIExvYmJ5RmFjdG9yeTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsb2JieScsIHtcbiAgICAgICAgdXJsOiAnL2xvYmJ5JyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2JieS9sb2JieS50ZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICBcdHJvb21zOiBmdW5jdGlvbihMb2JieUZhY3RvcnkpIHtcbiAgICAgICAgXHRcdHJldHVybiBMb2JieUZhY3RvcnkuZ2V0QWxsUm9vbXMoKTtcbiAgICAgICAgXHR9XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2JieUN0cmwnXG4gICAgfSk7XG5cbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbiAobG9naW5JbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ21lbWJlcnNPbmx5Jywge1xuICAgICAgICB1cmw6ICcvbWVtYmVycy1hcmVhJyxcbiAgICAgICAgdGVtcGxhdGU6ICc8aW1nIG5nLXJlcGVhdD1cIml0ZW0gaW4gc3Rhc2hcIiB3aWR0aD1cIjMwMFwiIG5nLXNyYz1cInt7IGl0ZW0gfX1cIiAvPicsXG4gICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUsIFNlY3JldFN0YXNoKSB7XG4gICAgICAgICAgICBTZWNyZXRTdGFzaC5nZXRTdGFzaCgpLnRoZW4oZnVuY3Rpb24gKHN0YXNoKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnN0YXNoID0gc3Rhc2g7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBkYXRhLmF1dGhlbnRpY2F0ZSBpcyByZWFkIGJ5IGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KTtcblxufSk7XG5cbmFwcC5mYWN0b3J5KCdTZWNyZXRTdGFzaCcsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG4gICAgdmFyIGdldFN0YXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL21lbWJlcnMvc2VjcmV0LXN0YXNoJykudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0U3Rhc2g6IGdldFN0YXNoXG4gICAgfTtcblxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdyYW5rRGlyZWN0aXZlJywgKCk9PiB7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdFJyxcblx0XHRzY29wZToge1xuXHRcdFx0cmFua05hbWU6ICdAJyxcblx0XHRcdHBsYXllcnM6ICc9Jyxcblx0XHRcdHJhbmtCeTogJ0AnLFxuXHRcdFx0b3JkZXI6ICdAJ1xuXHRcdH0sXG5cdFx0dGVtcGxhdGVVcmw6ICcvanMvcmFuay9yYW5rLnRlbXBsYXRlLmh0bWwnXG5cdH1cbn0pOyIsImFwcC5mYWN0b3J5KCdTaWdudXBGYWN0b3J5JywgZnVuY3Rpb24oJGh0dHAsICRzdGF0ZSwgQXV0aFNlcnZpY2UpIHtcblx0Y29uc3QgU2lnbnVwRmFjdG9yeSA9IHt9O1xuXG5cdFNpZ251cEZhY3RvcnkuY3JlYXRlVXNlciA9IGZ1bmN0aW9uKHNpZ251cEluZm8pIHtcblx0XHRjb25zb2xlLmxvZyhzaWdudXBJbmZvKVxuXHRcdHJldHVybiAkaHR0cC5wb3N0KCcvc2lnbnVwJywgc2lnbnVwSW5mbylcblx0XHQudGhlbihyZXMgPT4ge1xuXHRcdFx0aWYgKHJlcy5zdGF0dXMgPT09IDIwMSkge1xuXHRcdFx0XHRBdXRoU2VydmljZS5sb2dpbih7ZW1haWw6IHNpZ251cEluZm8uZW1haWwsIHBhc3N3b3JkOiBzaWdudXBJbmZvLnBhc3N3b3JkfSlcblx0XHRcdFx0LnRoZW4odXNlciA9PiB7XG5cdFx0XHRcdFx0JHN0YXRlLmdvKCdob21lJylcblx0XHRcdFx0fSlcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRocm93IEVycm9yKCdBbiBhY2NvdW50IHdpdGggdGhhdCBlbWFpbCBhbHJlYWR5IGV4aXN0cycpO1xuXHRcdFx0fVxuXHRcdH0pXG5cdH1cblxuXHRyZXR1cm4gU2lnbnVwRmFjdG9yeTtcbn0pIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzaWdudXAnLCB7XG4gICAgICAgIHVybDogJy9zaWdudXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3NpZ251cC9zaWdudXAuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTaWdudXBDdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ1NpZ251cEN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlLCBTaWdudXBGYWN0b3J5KSB7XG5cbiAgICAkc2NvcGUuc2lnbnVwID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kU2lnbnVwID0gZnVuY3Rpb24oc2lnbnVwSW5mbyl7XG4gICAgICAgIFNpZ251cEZhY3RvcnkuY3JlYXRlVXNlcihzaWdudXBJbmZvKVxuICAgICAgICAuY2F0Y2goKCkgPT4ge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0FuIGFjY291bnQgd2l0aCB0aGF0IGVtYWlsIGFscmVhZHkgZXhpc3RzJztcbiAgICAgICAgfSlcbiAgICB9XG4gICAgXG5cblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKXtcblx0JHN0YXRlUHJvdmlkZXIuc3RhdGUoXCJVc2VyUHJvZmlsZVwiLHtcblx0XHR1cmw6IFwiL3VzZXJzLzp1c2VySWRcIixcblx0XHR0ZW1wbGF0ZVVybDpcImpzL3VzZXJfcHJvZmlsZS9wcm9maWxlLnRlbXBsYXRlLmh0bWxcIixcblx0XHRjb250cm9sbGVyOiBcIlVzZXJDdHJsXCJcblx0fSlcblx0JHN0YXRlUHJvdmlkZXIuc3RhdGUoXCJHYW1lUmVjb3JkXCIsIHtcblx0XHR1cmw6XCIvdXNlcnMvOnVzZXJJZC9nYW1lc1wiLFxuXHRcdHRlbXBsYXRlVXJsOiBcImpzL3VzZXJfcHJvZmlsZS9nYW1lcy5odG1sXCIsXG5cdFx0Y29udHJvbGxlcjogXCJHYW1lUmVjb3JkQ3RybFwiXG5cdH0pXG59KVxuXG5hcHAuY29udHJvbGxlcihcIlVzZXJDdHJsXCIsIGZ1bmN0aW9uKCRzY29wZSwgVXNlckZhY3RvcnksICRzdGF0ZVBhcmFtcyl7XG5cdFVzZXJGYWN0b3J5LmZldGNoSW5mb3JtYXRpb24oJHN0YXRlUGFyYW1zLnVzZXJJZClcblx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG5cdFx0JHNjb3BlLnVzZXI9dXNlcjtcblx0XHRyZXR1cm4gdXNlclxuXHR9KVxuXHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0XHQkc2NvcGUudXBkYXRlZD0kc2NvcGUudXNlci51cGRhdGVkQXQuZ2V0RGF5KCk7XG5cdH0pXG59KVxuXG5hcHAuY29udHJvbGxlcihcIkdhbWVSZWNvcmRDdHJsXCIsZnVuY3Rpb24oJHNjb3BlLCBVc2VyRmFjdG9yeSwgJHN0YXRlUGFyYW1zKXtcblx0VXNlckZhY3RvcnkuZmV0Y2hJbmZvcm1hdGlvbigkc3RhdGVQYXJhbXMudXNlcklkKVxuXHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0XHQkc2NvcGUudXNlcj11c2VyO1xuXHR9KVxuXHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0VXNlckZhY3RvcnkuZmV0Y2hHYW1lcygkc3RhdGVQYXJhbXMudXNlcklkKVxuXHR9KVxuXHQudGhlbihmdW5jdGlvbihnYW1lcyl7XG5cdFx0JHNjb3BlLmdhbWVzPWdhbWVzO1xuXHR9KVxufSkiLCJhcHAuZmFjdG9yeShcIlVzZXJGYWN0b3J5XCIsIGZ1bmN0aW9uKCRodHRwKXtcblx0cmV0dXJuIHtcblx0XHRmZXRjaEluZm9ybWF0aW9uOiBmdW5jdGlvbihpZCl7XG5cdFx0XHRyZXR1cm4gJGh0dHAuZ2V0KFwiL2FwaS91c2Vycy9cIitpZClcblx0XHRcdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHRcdFx0XHRyZXR1cm4gdXNlci5kYXRhO1xuXHRcdFx0fSlcblx0XHR9LFxuXHRcdGZldGNoR2FtZXM6IGZ1bmN0aW9uKGlkKXtcblx0XHRcdHJldHVybiAkaHR0cC5nZXQoXCIvYXBpL3VzZXJzL1wiK2lkK1wiL2dhbWVzXCIpXG5cdFx0XHQudGhlbihmdW5jdGlvbihnYW1lcyl7XG5cdFx0XHRcdHJldHVybiBnYW1lcy5kYXRhO1xuXHRcdFx0fSlcblx0XHR9XG5cdH1cbn0pIiwiYXBwLmZhY3RvcnkoJ0Z1bGxzdGFja1BpY3MnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CN2dCWHVsQ0FBQVhRY0UuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vZmJjZG4tc3Bob3Rvcy1jLWEuYWthbWFpaGQubmV0L2hwaG90b3MtYWsteGFwMS90MzEuMC04LzEwODYyNDUxXzEwMjA1NjIyOTkwMzU5MjQxXzgwMjcxNjg4NDMzMTI4NDExMzdfby5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItTEtVc2hJZ0FFeTlTSy5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I3OS1YN29DTUFBa3c3eS5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItVWo5Q09JSUFJRkFoMC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I2eUl5RmlDRUFBcWwxMi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFLVQ3NWxXQUFBbXFxSi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFdlpBZy1WQUFBazkzMi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFZ05NZU9YSUFJZkRoSy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFUXlJRE5XZ0FBdTYwQi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NDRjNUNVFXOEFFMmxHSi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBZVZ3NVNXb0FBQUxzai5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBYUpJUDdVa0FBbElHcy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBUU93OWxXRUFBWTlGbC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItT1FiVnJDTUFBTndJTS5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I5Yl9lcndDWUFBd1JjSi5wbmc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I1UFRkdm5DY0FFQWw0eC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I0cXdDMGlDWUFBbFBHaC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0IyYjMzdlJJVUFBOW8xRC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0J3cEl3cjFJVUFBdk8yXy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0JzU3NlQU5DWUFFT2hMdy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NKNHZMZnVVd0FBZGE0TC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJN3d6akVWRUFBT1BwUy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJZEh2VDJVc0FBbm5IVi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NHQ2lQX1lXWUFBbzc1Vi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJUzRKUElXSUFJMzdxdS5qcGc6bGFyZ2UnXG4gICAgXTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1JhbmRvbUdyZWV0aW5ncycsIGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBnZXRSYW5kb21Gcm9tQXJyYXkgPSBmdW5jdGlvbiAoYXJyKSB7XG4gICAgICAgIHJldHVybiBhcnJbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogYXJyLmxlbmd0aCldO1xuICAgIH07XG5cbiAgICB2YXIgZ3JlZXRpbmdzID0gW1xuICAgICAgICAnSGVsbG8sIHdvcmxkIScsXG4gICAgICAgICdBdCBsb25nIGxhc3QsIEkgbGl2ZSEnLFxuICAgICAgICAnSGVsbG8sIHNpbXBsZSBodW1hbi4nLFxuICAgICAgICAnV2hhdCBhIGJlYXV0aWZ1bCBkYXkhJyxcbiAgICAgICAgJ0lcXCdtIGxpa2UgYW55IG90aGVyIHByb2plY3QsIGV4Y2VwdCB0aGF0IEkgYW0geW91cnMuIDopJyxcbiAgICAgICAgJ1RoaXMgZW1wdHkgc3RyaW5nIGlzIGZvciBMaW5kc2F5IExldmluZS4nLFxuICAgICAgICAn44GT44KT44Gr44Gh44Gv44CB44Om44O844K244O85qeY44CCJyxcbiAgICAgICAgJ1dlbGNvbWUuIFRvLiBXRUJTSVRFLicsXG4gICAgICAgICc6RCcsXG4gICAgICAgICdZZXMsIEkgdGhpbmsgd2VcXCd2ZSBtZXQgYmVmb3JlLicsXG4gICAgICAgICdHaW1tZSAzIG1pbnMuLi4gSSBqdXN0IGdyYWJiZWQgdGhpcyByZWFsbHkgZG9wZSBmcml0dGF0YScsXG4gICAgICAgICdJZiBDb29wZXIgY291bGQgb2ZmZXIgb25seSBvbmUgcGllY2Ugb2YgYWR2aWNlLCBpdCB3b3VsZCBiZSB0byBuZXZTUVVJUlJFTCEnLFxuICAgIF07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBncmVldGluZ3M6IGdyZWV0aW5ncyxcbiAgICAgICAgZ2V0UmFuZG9tR3JlZXRpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRSYW5kb21Gcm9tQXJyYXkoZ3JlZXRpbmdzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnZnVsbHN0YWNrTG9nbycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmh0bWwnXG4gICAgfTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdob21lJyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdBYm91dCcsIHN0YXRlOiAnYWJvdXQnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ1lvdXIgUHJvZmlsZScsIHN0YXRlOiAnVXNlclByb2ZpbGUnLCBhdXRoOiB0cnVlIH1cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuXG4gICAgICAgICAgICBzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBzZXRVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgcmVtb3ZlVXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNldFVzZXIoKTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIHJlbW92ZVVzZXIpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgncmFuZG9HcmVldGluZycsIGZ1bmN0aW9uIChSYW5kb21HcmVldGluZ3MpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICAgICAgc2NvcGUuZ3JlZXRpbmcgPSBSYW5kb21HcmVldGluZ3MuZ2V0UmFuZG9tR3JlZXRpbmcoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZShcInRpbWVyXCIsIGZ1bmN0aW9uKCRxLCAkaW50ZXJ2YWwsIFNvY2tldCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICB0aW1lOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgdGVtcGxhdGVVcmw6IFwianMvY29tbW9uL2RpcmVjdGl2ZXMvdGltZXIvdGltZXIuaHRtbFwiLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICAgICAgdmFyIHRpbWUgPSBzY29wZS50aW1lO1xuICAgICAgICAgICAgdmFyIHN0YXJ0PXNjb3BlLnRpbWU7XG4gICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IGNvbnZlcnQodGltZSk7XG4gICAgICAgICAgICBzY29wZS5jb3VudGRvd24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGltZXIgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWUgLT0gMTtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBjb252ZXJ0KHRpbWUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGltZSA8IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gXCJUaW1lIHVwIVwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbCh0aW1lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lPXN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBzY29wZS5tZXNzYWdlcyA9IFtcIkdldCBSZWFkeSFcIiwgXCJHZXQgU2V0IVwiLCBcIkdvIVwiLCAnLyddO1xuICAgICAgICAgICAgLy8gICAgIHZhciBpbmRleCA9IDA7XG4gICAgICAgICAgICAvLyAgICAgdmFyIHByZXBhcmUgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gc2NvcGUubWVzc2FnZXNbaW5kZXhdO1xuICAgICAgICAgICAgLy8gICAgICAgICBpbmRleCsrO1xuICAgICAgICAgICAgLy8gICAgICAgICBjb25zb2xlLmxvZyhzY29wZS50aW1lX3JlbWFpbmluZyk7XG4gICAgICAgICAgICAvLyAgICAgICAgIGlmIChzY29wZS50aW1lX3JlbWFpbmluZyA9PT0gXCIvXCIpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gY29udmVydCh0aW1lKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwocHJlcGFyZSk7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICB2YXIgdGltZXIgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgdGltZSAtPSAxO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gY29udmVydCh0aW1lKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICBpZiAodGltZSA8IDEpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBcIlRpbWUgdXAhXCI7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwodGltZXIpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgLy8gICAgICAgICB9XG4gICAgICAgICAgICAvLyAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICAvLyB9O1xuXG4gICAgICAgICAgICBTb2NrZXQub24oJ3N0YXJ0Qm9hcmQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5jb3VudGRvd24odGltZSk7XG4gICAgICAgICAgICB9KTtcblxuXG4gICAgICAgICAgICBmdW5jdGlvbiBjb252ZXJ0KHRpbWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2Vjb25kcyA9ICh0aW1lICUgNjApLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgdmFyIGNvbnZlcnNpb24gPSAoTWF0aC5mbG9vcih0aW1lIC8gNjApKSArICc6JztcbiAgICAgICAgICAgICAgICBpZiAoc2Vjb25kcy5sZW5ndGggPCAyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnZlcnNpb24gKz0gJzAnICsgc2Vjb25kcztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb252ZXJzaW9uICs9IHNlY29uZHM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBjb252ZXJzaW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSlcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
