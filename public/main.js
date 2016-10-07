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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZG9jcy9kb2NzLmpzIiwiZnNhL2ZzYS1wcmUtYnVpbHQuanMiLCJnYW1lLXN0YXRlL2dyaWQuY29udHJvbGxlci5qcyIsImdhbWUtc3RhdGUvZ3JpZC5mYWN0b3J5LmpzIiwiaG9tZS9ob21lLmNvbnRyb2xsZXIuanMiLCJob21lL2hvbWUuanMiLCJsZWFkZXJCb2FyZC9sZWFkZXJCb2FyZC5jb250cm9sbGVyLmpzIiwibGVhZGVyQm9hcmQvbGVhZGVyQm9hcmQuZmFjdG9yeS5qcyIsImxlYWRlckJvYXJkL2xlYWRlckJvYXJkLnN0YXRlLmpzIiwibG9iYnkvbG9iYnkuY29udHJvbGxlci5qcyIsImxvYmJ5L2xvYmJ5LmRpcmVjdGl2ZS5qcyIsImxvYmJ5L2xvYmJ5LmZhY3RvcnkuanMiLCJsb2JieS9sb2JieS5zdGF0ZS5qcyIsImxvZ2luL2xvZ2luLmpzIiwibWVtYmVycy1vbmx5L21lbWJlcnMtb25seS5qcyIsInJhbmsvcmFuay5kaXJlY3RpdmUuanMiLCJzaWdudXAvc2lnbnVwLmZhY3RvcnkuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwidXNlcl9wcm9maWxlL3Byb2ZpbGUuY29udHJvbGxlci5qcyIsInVzZXJfcHJvZmlsZS9wcm9maWxlLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL0Z1bGxzdGFja1BpY3MuanMiLCJjb21tb24vZmFjdG9yaWVzL1JhbmRvbUdyZWV0aW5ncy5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvdGltZXIvdGltZXIuanMiXSwibmFtZXMiOlsid2luZG93IiwiYXBwIiwiYW5ndWxhciIsIm1vZHVsZSIsImNvbmZpZyIsIiR1cmxSb3V0ZXJQcm92aWRlciIsIiRsb2NhdGlvblByb3ZpZGVyIiwiaHRtbDVNb2RlIiwib3RoZXJ3aXNlIiwid2hlbiIsImxvY2F0aW9uIiwicmVsb2FkIiwicnVuIiwiJHJvb3RTY29wZSIsIiRvbiIsImV2ZW50IiwidG9TdGF0ZSIsInRvUGFyYW1zIiwiZnJvbVN0YXRlIiwiZnJvbVBhcmFtcyIsInRocm93bkVycm9yIiwiY29uc29sZSIsImluZm8iLCJuYW1lIiwiZXJyb3IiLCJBdXRoU2VydmljZSIsIiRzdGF0ZSIsImRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgiLCJzdGF0ZSIsImRhdGEiLCJhdXRoZW50aWNhdGUiLCJpc0F1dGhlbnRpY2F0ZWQiLCJwcmV2ZW50RGVmYXVsdCIsImdldExvZ2dlZEluVXNlciIsInRoZW4iLCJ1c2VyIiwiZ28iLCIkc3RhdGVQcm92aWRlciIsInVybCIsImNvbnRyb2xsZXIiLCJ0ZW1wbGF0ZVVybCIsIiRzY29wZSIsIkZ1bGxzdGFja1BpY3MiLCJpbWFnZXMiLCJfIiwic2h1ZmZsZSIsIkVycm9yIiwiZmFjdG9yeSIsImlvIiwib3JpZ2luIiwiY29uc3RhbnQiLCJsb2dpblN1Y2Nlc3MiLCJsb2dpbkZhaWxlZCIsImxvZ291dFN1Y2Nlc3MiLCJzZXNzaW9uVGltZW91dCIsIm5vdEF1dGhlbnRpY2F0ZWQiLCJub3RBdXRob3JpemVkIiwiJHEiLCJBVVRIX0VWRU5UUyIsInN0YXR1c0RpY3QiLCJyZXNwb25zZUVycm9yIiwicmVzcG9uc2UiLCIkYnJvYWRjYXN0Iiwic3RhdHVzIiwicmVqZWN0IiwiJGh0dHBQcm92aWRlciIsImludGVyY2VwdG9ycyIsInB1c2giLCIkaW5qZWN0b3IiLCJnZXQiLCJzZXJ2aWNlIiwiJGh0dHAiLCJTZXNzaW9uIiwib25TdWNjZXNzZnVsTG9naW4iLCJjcmVhdGUiLCJmcm9tU2VydmVyIiwiY2F0Y2giLCJsb2dpbiIsImNyZWRlbnRpYWxzIiwicG9zdCIsIm1lc3NhZ2UiLCJsb2dvdXQiLCJkZXN0cm95Iiwic2VsZiIsIkJvYXJkRmFjdG9yeSIsIlNvY2tldCIsIiRzdGF0ZVBhcmFtcyIsIkxvYmJ5RmFjdG9yeSIsImxvZyIsImV4cG9ydHMiLCJwbGF5ZXJJZCIsImlkIiwicm9vbU5hbWUiLCJyb29tbmFtZSIsIm90aGVyUGxheWVycyIsImdhbWVMZW5ndGgiLCJ3b3JkT2JqIiwid29yZCIsInN0YXRlTnVtYmVyIiwicG9pbnRzRWFybmVkIiwibW91c2VJc0Rvd24iLCJkcmFnZ2luZ0FsbG93ZWQiLCJzdHlsZSIsImZyZWV6ZSIsImNoZWNrU2VsZWN0ZWQiLCJ0b2dnbGVEcmFnIiwibW91c2VEb3duIiwibW91c2VVcCIsImxlbmd0aCIsInN1Ym1pdCIsImRyYWciLCJzcGFjZSIsImNsaWNrIiwiZ2V0Q3VycmVudFJvb20iLCJyb29tIiwiZ2FtZUlkIiwidXNlcnMiLCJmaWx0ZXIiLCJmb3JFYWNoIiwicGxheWVyIiwic2NvcmUiLCJqb2luR2FtZSIsImhpZGVCb2FyZCIsInN0YXJ0R2FtZSIsInVzZXJJZHMiLCJtYXAiLCJnZXRTdGFydEJvYXJkIiwicXVpdCIsImhpZGVOYXZiYXIiLCJib2FyZCIsIm1lc3NhZ2VzIiwic2l6ZSIsImx0cnNTZWxlY3RlZCIsIk9iamVjdCIsImtleXMiLCJwcmV2aW91c0x0ciIsImxhc3RMdHIiLCJ2YWxpZFNlbGVjdCIsInN1YnN0cmluZyIsImx0cklkIiwib3RoZXJMdHJzSWRzIiwiaW5jbHVkZXMiLCJjb29yZHMiLCJzcGxpdCIsInJvdyIsImNvbCIsImxhc3RMdHJJZCIsInBvcCIsImNvb3Jkc0xhc3QiLCJyb3dMYXN0IiwiY29sTGFzdCIsInJvd09mZnNldCIsIk1hdGgiLCJhYnMiLCJjb2xPZmZzZXQiLCJjbGVhcklmQ29uZmxpY3RpbmciLCJ1cGRhdGVXb3JkT2JqIiwiZXhwb3J0V29yZE9iaiIsInRpbGVzTW92ZWQiLCJteVdvcmRUaWxlcyIsInNvbWUiLCJjb29yZCIsImNsZWFyIiwib2JqIiwidXBkYXRlQm9hcmQiLCJrZXkiLCJ1cGRhdGVTY29yZSIsInBvaW50cyIsInVwZGF0ZSIsInVwZGF0ZU9iaiIsIiRldmFsQXN5bmMiLCJyZXBsYXkiLCJuZXdHYW1lIiwiZGlzY29ubmVjdCIsIm9uIiwiZW1pdCIsIiRkaWdlc3QiLCJsYXN0V29yZFBsYXllZCIsInVzZXJJZCIsInJlcyIsInF1aXRGcm9tUm9vbSIsImRlbGV0ZSIsIiRsb2NhdGlvbiIsImVudGVyTG9iYnkiLCJMZWFkZXJCb2FyZEZhY3RvcnkiLCJBbGxQbGF5ZXJzIiwicGxheWVycyIsImdhbWVzIiwic2NvcmVzIiwiZ2FtZSIsInVzZXJHYW1lIiwiaGlnaGVzdFNjb3JlIiwibWF4IiwiZ2FtZXNfd29uIiwid2lubmVyIiwiZ2FtZXNfcGxheWVkIiwid2luX3BlcmNlbnRhZ2UiLCJ0b0ZpeGVkIiwicmVzb2x2ZSIsImFsbFBsYXllcnMiLCJyb29tcyIsInJvb21OYW1lRm9ybSIsIm5ld1Jvb20iLCJyb29tSW5mbyIsInNob3dGb3JtIiwiZGlyZWN0aXZlIiwicmVzdHJpY3QiLCJ0ZW1wUm9vbXMiLCJnZXRBbGxSb29tcyIsImNvcHkiLCJyb29tSWQiLCJwdXQiLCJzZW5kTG9naW4iLCJsb2dpbkluZm8iLCJ0ZW1wbGF0ZSIsIlNlY3JldFN0YXNoIiwiZ2V0U3Rhc2giLCJzdGFzaCIsInNjb3BlIiwicmFua05hbWUiLCJyYW5rQnkiLCJvcmRlciIsIlNpZ251cEZhY3RvcnkiLCJjcmVhdGVVc2VyIiwic2lnbnVwSW5mbyIsImVtYWlsIiwicGFzc3dvcmQiLCJzaWdudXAiLCJzZW5kU2lnbnVwIiwiVXNlckZhY3RvcnkiLCJmZXRjaEluZm9ybWF0aW9uIiwidXBkYXRlZCIsInVwZGF0ZWRBdCIsImdldERheSIsImZldGNoR2FtZXMiLCJnZXRSYW5kb21Gcm9tQXJyYXkiLCJhcnIiLCJmbG9vciIsInJhbmRvbSIsImdyZWV0aW5ncyIsImdldFJhbmRvbUdyZWV0aW5nIiwibGluayIsIml0ZW1zIiwibGFiZWwiLCJhdXRoIiwiaXNMb2dnZWRJbiIsInNldFVzZXIiLCJyZW1vdmVVc2VyIiwiUmFuZG9tR3JlZXRpbmdzIiwiZ3JlZXRpbmciLCIkaW50ZXJ2YWwiLCJ0aW1lIiwic3RhcnQiLCJ0aW1lX3JlbWFpbmluZyIsImNvbnZlcnQiLCJjb3VudGRvd24iLCJ0aW1lciIsImNhbmNlbCIsInNlY29uZHMiLCJ0b1N0cmluZyIsImNvbnZlcnNpb24iXSwibWFwcGluZ3MiOiJBQUFBOzs7O0FBQ0FBLE9BQUFDLEdBQUEsR0FBQUMsUUFBQUMsTUFBQSxDQUFBLHVCQUFBLEVBQUEsQ0FBQSxhQUFBLEVBQUEsV0FBQSxFQUFBLGNBQUEsRUFBQSxXQUFBLENBQUEsQ0FBQTs7QUFFQUYsSUFBQUcsTUFBQSxDQUFBLFVBQUFDLGtCQUFBLEVBQUFDLGlCQUFBLEVBQUE7QUFDQTtBQUNBQSxzQkFBQUMsU0FBQSxDQUFBLElBQUE7QUFDQTtBQUNBRix1QkFBQUcsU0FBQSxDQUFBLEdBQUE7QUFDQTtBQUNBSCx1QkFBQUksSUFBQSxDQUFBLGlCQUFBLEVBQUEsWUFBQTtBQUNBVCxlQUFBVSxRQUFBLENBQUFDLE1BQUE7QUFDQSxLQUZBO0FBR0EsQ0FUQTs7QUFXQTtBQUNBVixJQUFBVyxHQUFBLENBQUEsVUFBQUMsVUFBQSxFQUFBO0FBQ0FBLGVBQUFDLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLFVBQUFDLEtBQUEsRUFBQUMsT0FBQSxFQUFBQyxRQUFBLEVBQUFDLFNBQUEsRUFBQUMsVUFBQSxFQUFBQyxXQUFBLEVBQUE7QUFDQUMsZ0JBQUFDLElBQUEsZ0ZBQUFOLFFBQUFPLElBQUE7QUFDQUYsZ0JBQUFHLEtBQUEsQ0FBQUosV0FBQTtBQUNBLEtBSEE7QUFJQSxDQUxBOztBQU9BO0FBQ0FuQixJQUFBVyxHQUFBLENBQUEsVUFBQUMsVUFBQSxFQUFBWSxXQUFBLEVBQUFDLE1BQUEsRUFBQTs7QUFFQTtBQUNBLFFBQUFDLCtCQUFBLFNBQUFBLDRCQUFBLENBQUFDLEtBQUEsRUFBQTtBQUNBLGVBQUFBLE1BQUFDLElBQUEsSUFBQUQsTUFBQUMsSUFBQSxDQUFBQyxZQUFBO0FBQ0EsS0FGQTs7QUFJQTtBQUNBO0FBQ0FqQixlQUFBQyxHQUFB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O0FBQ0FILGtDQUFBTyxNQUFBLENBQUFELEtBQUE7QUFDQUwsK0JBQUFDLEtBQUE7QUFDQTtBQUNBLGlCQVJBLEVBUUEsSUFSQSxDQUFBO0FBU0EsYUFWQTs7QUFZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBdkssbUJBQUF5RixFQUFBLENBQUEsWUFBQSxFQUFBLFlBQUE7QUFDQTRDLHNCQUFBcUMsU0FBQSxDQUFBSixJQUFBO0FBQ0EsYUFGQTs7QUFLQSxxQkFBQUcsT0FBQSxDQUFBSCxJQUFBLEVBQUE7QUFDQSxvQkFBQU8sVUFBQSxDQUFBUCxPQUFBLEVBQUEsRUFBQVEsUUFBQSxFQUFBO0FBQ0Esb0JBQUFDLGFBQUE1RyxLQUFBcUYsS0FBQSxDQUFBYyxPQUFBLEVBQUEsQ0FBQSxHQUFBLEdBQUE7QUFDQSxvQkFBQU8sUUFBQXRKLE1BQUEsR0FBQSxDQUFBLEVBQUE7QUFDQXdKLGtDQUFBLE1BQUFGLE9BQUE7QUFDQSxpQkFGQSxNQUVBO0FBQ0FFLGtDQUFBRixPQUFBO0FBQ0E7QUFDQSx1QkFBQUUsVUFBQTtBQUNBO0FBQ0E7QUExREEsS0FBQTtBQTREQSxDQTdEQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xud2luZG93LmFwcCA9IGFuZ3VsYXIubW9kdWxlKCdGdWxsc3RhY2tHZW5lcmF0ZWRBcHAnLCBbJ2ZzYVByZUJ1aWx0JywgJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnbmdBbmltYXRlJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG4gICAgLy8gVHJpZ2dlciBwYWdlIHJlZnJlc2ggd2hlbiBhY2Nlc3NpbmcgYW4gT0F1dGggcm91dGVcbiAgICAkdXJsUm91dGVyUHJvdmlkZXIud2hlbignL2F1dGgvOnByb3ZpZGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgfSk7XG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBsaXN0ZW5pbmcgdG8gZXJyb3JzIGJyb2FkY2FzdGVkIGJ5IHVpLXJvdXRlciwgdXN1YWxseSBvcmlnaW5hdGluZyBmcm9tIHJlc29sdmVzXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlKSB7XG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZUVycm9yJywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcywgZnJvbVN0YXRlLCBmcm9tUGFyYW1zLCB0aHJvd25FcnJvcikge1xuICAgICAgICBjb25zb2xlLmluZm8oYFRoZSBmb2xsb3dpbmcgZXJyb3Igd2FzIHRocm93biBieSB1aS1yb3V0ZXIgd2hpbGUgdHJhbnNpdGlvbmluZyB0byBzdGF0ZSBcIiR7dG9TdGF0ZS5uYW1lfVwiLiBUaGUgb3JpZ2luIG9mIHRoaXMgZXJyb3IgaXMgcHJvYmFibHkgYSByZXNvbHZlIGZ1bmN0aW9uOmApO1xuICAgICAgICBjb25zb2xlLmVycm9yKHRocm93bkVycm9yKTtcbiAgICB9KTtcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxuICAgIHZhciBkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xuICAgIH07XG5cbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMpIHtcblxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHVzZXIgaXMgcmV0cmlldmVkLCB0aGVuIHJlbmF2aWdhdGUgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXG4gICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAvLyBSZWdpc3RlciBvdXIgKmFib3V0KiBzdGF0ZS5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnYWJvdXQnLCB7XG4gICAgICAgIHVybDogJy9hYm91dCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBYm91dENvbnRyb2xsZXInLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Fib3V0L2Fib3V0Lmh0bWwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignQWJvdXRDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgRnVsbHN0YWNrUGljcykge1xuXG4gICAgLy8gSW1hZ2VzIG9mIGJlYXV0aWZ1bCBGdWxsc3RhY2sgcGVvcGxlLlxuICAgICRzY29wZS5pbWFnZXMgPSBfLnNodWZmbGUoRnVsbHN0YWNrUGljcyk7XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZG9jcycsIHtcbiAgICAgICAgdXJsOiAnL2RvY3MnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2RvY3MvZG9jcy5odG1sJ1xuICAgIH0pO1xufSk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxuICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHRocm93IG5ldyBFcnJvcignSSBjYW5cXCd0IGZpbmQgQW5ndWxhciEnKTtcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbXSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnU29ja2V0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXdpbmRvdy5pbykgdGhyb3cgbmV3IEVycm9yKCdzb2NrZXQuaW8gbm90IGZvdW5kIScpO1xuICAgICAgICByZXR1cm4gd2luZG93LmlvKHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pO1xuICAgIH0pO1xuXG4gICAgLy8gQVVUSF9FVkVOVFMgaXMgdXNlZCB0aHJvdWdob3V0IG91ciBhcHAgdG9cbiAgICAvLyBicm9hZGNhc3QgYW5kIGxpc3RlbiBmcm9tIGFuZCB0byB0aGUgJHJvb3RTY29wZVxuICAgIC8vIGZvciBpbXBvcnRhbnQgZXZlbnRzIGFib3V0IGF1dGhlbnRpY2F0aW9uIGZsb3cuXG4gICAgYXBwLmNvbnN0YW50KCdBVVRIX0VWRU5UUycsIHtcbiAgICAgICAgbG9naW5TdWNjZXNzOiAnYXV0aC1sb2dpbi1zdWNjZXNzJyxcbiAgICAgICAgbG9naW5GYWlsZWQ6ICdhdXRoLWxvZ2luLWZhaWxlZCcsXG4gICAgICAgIGxvZ291dFN1Y2Nlc3M6ICdhdXRoLWxvZ291dC1zdWNjZXNzJyxcbiAgICAgICAgc2Vzc2lvblRpbWVvdXQ6ICdhdXRoLXNlc3Npb24tdGltZW91dCcsXG4gICAgICAgIG5vdEF1dGhlbnRpY2F0ZWQ6ICdhdXRoLW5vdC1hdXRoZW50aWNhdGVkJyxcbiAgICAgICAgbm90QXV0aG9yaXplZDogJ2F1dGgtbm90LWF1dGhvcml6ZWQnXG4gICAgfSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnQXV0aEludGVyY2VwdG9yJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRxLCBBVVRIX0VWRU5UUykge1xuICAgICAgICB2YXIgc3RhdHVzRGljdCA9IHtcbiAgICAgICAgICAgIDQwMTogQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCxcbiAgICAgICAgICAgIDQwMzogQVVUSF9FVkVOVFMubm90QXV0aG9yaXplZCxcbiAgICAgICAgICAgIDQxOTogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsXG4gICAgICAgICAgICA0NDA6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3Qoc3RhdHVzRGljdFtyZXNwb25zZS5zdGF0dXNdLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIGFwcC5jb25maWcoZnVuY3Rpb24gKCRodHRwUHJvdmlkZXIpIHtcbiAgICAgICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaChbXG4gICAgICAgICAgICAnJGluamVjdG9yJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uICgkaW5qZWN0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGluamVjdG9yLmdldCgnQXV0aEludGVyY2VwdG9yJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIF0pO1xuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ0F1dGhTZXJ2aWNlJywgZnVuY3Rpb24gKCRodHRwLCBTZXNzaW9uLCAkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUywgJHEpIHtcblxuICAgICAgICBmdW5jdGlvbiBvblN1Y2Nlc3NmdWxMb2dpbihyZXNwb25zZSkge1xuICAgICAgICAgICAgdmFyIHVzZXIgPSByZXNwb25zZS5kYXRhLnVzZXI7XG4gICAgICAgICAgICBTZXNzaW9uLmNyZWF0ZSh1c2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MpO1xuICAgICAgICAgICAgcmV0dXJuIHVzZXI7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2VzIHRoZSBzZXNzaW9uIGZhY3RvcnkgdG8gc2VlIGlmIGFuXG4gICAgICAgIC8vIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBjdXJyZW50bHkgcmVnaXN0ZXJlZC5cbiAgICAgICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gISFTZXNzaW9uLnVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRMb2dnZWRJblVzZXIgPSBmdW5jdGlvbiAoZnJvbVNlcnZlcikge1xuXG4gICAgICAgICAgICAvLyBJZiBhbiBhdXRoZW50aWNhdGVkIHNlc3Npb24gZXhpc3RzLCB3ZVxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxuICAgICAgICAgICAgLy8gYWx3YXlzIGludGVyZmFjZSB3aXRoIHRoaXMgbWV0aG9kIGFzeW5jaHJvbm91c2x5LlxuXG4gICAgICAgICAgICAvLyBPcHRpb25hbGx5LCBpZiB0cnVlIGlzIGdpdmVuIGFzIHRoZSBmcm9tU2VydmVyIHBhcmFtZXRlcixcbiAgICAgICAgICAgIC8vIHRoZW4gdGhpcyBjYWNoZWQgdmFsdWUgd2lsbCBub3QgYmUgdXNlZC5cblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkgJiYgZnJvbVNlcnZlciAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKFNlc3Npb24udXNlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1ha2UgcmVxdWVzdCBHRVQgL3Nlc3Npb24uXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgdXNlciwgY2FsbCBvblN1Y2Nlc3NmdWxMb2dpbiB3aXRoIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSA0MDEgcmVzcG9uc2UsIHdlIGNhdGNoIGl0IGFuZCBpbnN0ZWFkIHJlc29sdmUgdG8gbnVsbC5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJykudGhlbihvblN1Y2Nlc3NmdWxMb2dpbikuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ2luID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZGVudGlhbHMpXG4gICAgICAgICAgICAgICAgLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLicgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgU2Vzc2lvbi5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMudXNlciA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgdGhpcy51c2VyID0gdXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbn0oKSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ0dhbWUnLCB7XG4gICAgICAgIHVybDogJy9nYW1lLzpyb29tbmFtZScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZ2FtZS1zdGF0ZS9wYWdlLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiBcIkdhbWVDdHJsXCIsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcblxuXG5hcHAuY29udHJvbGxlcignR2FtZUN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIEJvYXJkRmFjdG9yeSwgU29ja2V0LCAkc3RhdGVQYXJhbXMsIEF1dGhTZXJ2aWNlLCAkc3RhdGUsIExvYmJ5RmFjdG9yeSwgJHJvb3RTY29wZSkge1xuXG4gICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24odXNlcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3VzZXIgZnJvbSBBdXRoU2VydmljZScsIHVzZXIpO1xuICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMucGxheWVySWQgPSB1c2VyLmlkO1xuICAgICAgICB9KTtcblxuICAgICRzY29wZS5yb29tTmFtZSA9ICRzdGF0ZVBhcmFtcy5yb29tbmFtZTtcblxuICAgICRzY29wZS5vdGhlclBsYXllcnMgPSBbXTtcblxuICAgICRzY29wZS5nYW1lTGVuZ3RoID0gMzMwO1xuXG4gICAgJHNjb3BlLmV4cG9ydHMgPSB7XG4gICAgICAgIHdvcmRPYmo6IHt9LFxuICAgICAgICB3b3JkOiBcIlwiLFxuICAgICAgICBwbGF5ZXJJZDogbnVsbCxcbiAgICAgICAgc3RhdGVOdW1iZXI6IDAsXG4gICAgICAgIHBvaW50c0Vhcm5lZDogbnVsbFxuICAgIH07XG5cbiAgICAkc2NvcGUubW91c2VJc0Rvd24gPSBmYWxzZTtcbiAgICAkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkID0gZmFsc2U7XG5cbiAgICAkc2NvcGUuc3R5bGUgPSBudWxsO1xuICAgICRzY29wZS5tZXNzYWdlID0gJyc7XG4gICAgJHNjb3BlLmZyZWV6ZSA9IGZhbHNlO1xuXG4gICAgJHNjb3BlLmNoZWNrU2VsZWN0ZWQgPSBmdW5jdGlvbihpZCkge1xuICAgICAgICByZXR1cm4gaWQgaW4gJHNjb3BlLmV4cG9ydHMud29yZE9iajtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnRvZ2dsZURyYWcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLmRyYWdnaW5nQWxsb3dlZCA9ICEkc2NvcGUuZHJhZ2dpbmdBbGxvd2VkO1xuICAgIH07XG5cbiAgICAkc2NvcGUubW91c2VEb3duID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5tb3VzZUlzRG93biA9IHRydWU7XG4gICAgfTtcblxuICAgICRzY29wZS5tb3VzZVVwID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5tb3VzZUlzRG93biA9IGZhbHNlO1xuICAgICAgICBpZiAoJHNjb3BlLmRyYWdnaW5nQWxsb3dlZCAmJiAkc2NvcGUuZXhwb3J0cy53b3JkLmxlbmd0aCA+IDEpICRzY29wZS5zdWJtaXQoJHNjb3BlLmV4cG9ydHMpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZHJhZyA9IGZ1bmN0aW9uKHNwYWNlLCBpZCkge1xuICAgICAgICBpZiAoJHNjb3BlLm1vdXNlSXNEb3duICYmICRzY29wZS5kcmFnZ2luZ0FsbG93ZWQpIHtcbiAgICAgICAgICAgICRzY29wZS5jbGljayhzcGFjZSwgaWQpO1xuICAgICAgICB9XG4gICAgfTtcblxuXG5cbiAgICAvL2dldCB0aGUgY3VycmVudCByb29tIGluZm9cbiAgICBCb2FyZEZhY3RvcnkuZ2V0Q3VycmVudFJvb20oJHN0YXRlUGFyYW1zLnJvb21uYW1lKVxuICAgICAgICAudGhlbihyb29tID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHJvb20pXG4gICAgICAgICAgICAkc2NvcGUuZ2FtZUlkID0gcm9vbS5pZDtcbiAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMgPSByb29tLnVzZXJzLmZpbHRlcih1c2VyID0+IHVzZXIuaWQgIT09ICRzY29wZS51c2VyLmlkKTtcbiAgICAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMuZm9yRWFjaChwbGF5ZXIgPT4geyBwbGF5ZXIuc2NvcmUgPSAwIH0pXG4gICAgICAgICAgICBMb2JieUZhY3Rvcnkuam9pbkdhbWUocm9vbS5pZCwgJHNjb3BlLnVzZXIuaWQpO1xuICAgICAgICB9KTtcblxuICAgICRzY29wZS5oaWRlQm9hcmQgPSB0cnVlO1xuXG4gICAgLy8gU3RhcnQgdGhlIGdhbWUgd2hlbiBhbGwgcGxheWVycyBoYXZlIGpvaW5lZCByb29tXG4gICAgJHNjb3BlLnN0YXJ0R2FtZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdXNlcklkcyA9ICRzY29wZS5vdGhlclBsYXllcnMubWFwKHVzZXIgPT4gdXNlci5pZCk7XG4gICAgICAgIHVzZXJJZHMucHVzaCgkc2NvcGUudXNlci5pZCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdvcCcsICRzY29wZS5vdGhlclBsYXllcnMsICd1aScsIHVzZXJJZHMpO1xuICAgICAgICBCb2FyZEZhY3RvcnkuZ2V0U3RhcnRCb2FyZCgkc2NvcGUuZ2FtZUxlbmd0aCwgJHNjb3BlLmdhbWVJZCwgdXNlcklkcyk7XG4gICAgfTtcblxuXG4gICAgLy9RdWl0IHRoZSByb29tLCBiYWNrIHRvIGxvYmJ5XG4gICAgJHNjb3BlLnF1aXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gQm9hcmRGYWN0b3J5LnF1aXRGcm9tUm9vbSgkc2NvcGUuZ2FtZUlkLCAkc2NvcGUudXNlci5pZClcbiAgICAgICAgLy8gICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgLy8gICAgICAgICAkc3RhdGUuZ28oJ2xvYmJ5Jyk7XG4gICAgICAgIC8vICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLmhpZGVOYXZiYXIgPSBmYWxzZTtcbiAgICAgICAgJHN0YXRlLmdvKCdsb2JieScpXG4gICAgfTtcblxuXG4gICAgJHNjb3BlLmJvYXJkID0gW1xuICAgICAgICBbJ2InLCAnYScsICdkJywgJ2UnLCAnYScsICdyJ10sXG4gICAgICAgIFsnZScsICdmJywgJ2cnLCAnbCcsICdtJywgJ2UnXSxcbiAgICAgICAgWydoJywgJ2knLCAnaicsICdmJywgJ28nLCAnYSddLFxuICAgICAgICBbJ2MnLCAnYScsICdkJywgJ2UnLCAnYScsICdyJ10sXG4gICAgICAgIFsnZScsICdmJywgJ2cnLCAnbCcsICdkJywgJ2UnXSxcbiAgICAgICAgWydoJywgJ2knLCAnaicsICdmJywgJ28nLCAnYSddXG4gICAgXTtcblxuICAgICRzY29wZS5tZXNzYWdlcyA9IG51bGw7XG5cbiAgICAkc2NvcGUuc2l6ZSA9IDM7XG4gICAgJHNjb3BlLnNjb3JlID0gMDtcbiAgICAvLyAkc2NvcGUucGxheWVyTmFtZSA9ICdNZSc7XG4gICAgLy8gJHNjb3BlLnBsYXllciA9ICRzY29wZS51c2VyLmlkO1xuXG4gICAgLy8gJHNjb3BlLm90aGVyUGxheWVycyA9IFt7IG5hbWU6ICdZb3UnLCBzY29yZTogMCwgaWQ6IDEgfSxcbiAgICAvLyAgICAgeyBuYW1lOiAnSGltJywgc2NvcmU6IDAsIGlkOiAyIH0sXG4gICAgLy8gICAgIHsgbmFtZTogJ0hlcicsIHNjb3JlOiAwLCBpZDogMyB9XG4gICAgLy8gXTtcblxuICAgICRzY29wZS5jbGljayA9IGZ1bmN0aW9uKHNwYWNlLCBpZCkge1xuICAgICAgICBpZiAoJHNjb3BlLmZyZWV6ZSkge1xuICAgICAgICAgICAgcmV0dXJuOyB9XG4gICAgICAgIGNvbnNvbGUubG9nKCdjbGlja2VkICcsIHNwYWNlLCBpZCk7XG4gICAgICAgIHZhciBsdHJzU2VsZWN0ZWQgPSBPYmplY3Qua2V5cygkc2NvcGUuZXhwb3J0cy53b3JkT2JqKTtcbiAgICAgICAgdmFyIHByZXZpb3VzTHRyID0gbHRyc1NlbGVjdGVkW2x0cnNTZWxlY3RlZC5sZW5ndGggLSAyXTtcbiAgICAgICAgdmFyIGxhc3RMdHIgPSBsdHJzU2VsZWN0ZWRbbHRyc1NlbGVjdGVkLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAoIWx0cnNTZWxlY3RlZC5sZW5ndGggfHwgdmFsaWRTZWxlY3QoaWQsIGx0cnNTZWxlY3RlZCkpIHtcbiAgICAgICAgICAgICRzY29wZS5leHBvcnRzLndvcmQgKz0gc3BhY2U7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkT2JqW2lkXSA9IHNwYWNlO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJHNjb3BlLmV4cG9ydHMpO1xuICAgICAgICB9IGVsc2UgaWYgKGlkID09PSBwcmV2aW91c0x0cikge1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMud29yZCA9ICRzY29wZS5leHBvcnRzLndvcmQuc3Vic3RyaW5nKDAsICRzY29wZS5leHBvcnRzLndvcmQubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICBkZWxldGUgJHNjb3BlLmV4cG9ydHMud29yZE9ialtsYXN0THRyXTtcbiAgICAgICAgfSBlbHNlIGlmIChsdHJzU2VsZWN0ZWQubGVuZ3RoID09PSAxICYmIGlkID09PSBsYXN0THRyKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkID0gXCJcIjtcbiAgICAgICAgICAgIGRlbGV0ZSAkc2NvcGUuZXhwb3J0cy53b3JkT2JqW2xhc3RMdHJdO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vbWFrZXMgc3VyZSBsZXR0ZXIgaXMgYWRqYWNlbnQgdG8gcHJldiBsdHIsIGFuZCBoYXNuJ3QgYmVlbiB1c2VkIHlldFxuICAgIGZ1bmN0aW9uIHZhbGlkU2VsZWN0KGx0cklkLCBvdGhlckx0cnNJZHMpIHtcbiAgICAgICAgaWYgKG90aGVyTHRyc0lkcy5pbmNsdWRlcyhsdHJJZCkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgdmFyIGNvb3JkcyA9IGx0cklkLnNwbGl0KCctJyk7XG4gICAgICAgIHZhciByb3cgPSBjb29yZHNbMF07XG4gICAgICAgIHZhciBjb2wgPSBjb29yZHNbMV07XG4gICAgICAgIHZhciBsYXN0THRySWQgPSBvdGhlckx0cnNJZHMucG9wKCk7XG4gICAgICAgIHZhciBjb29yZHNMYXN0ID0gbGFzdEx0cklkLnNwbGl0KCctJyk7XG4gICAgICAgIHZhciByb3dMYXN0ID0gY29vcmRzTGFzdFswXTtcbiAgICAgICAgdmFyIGNvbExhc3QgPSBjb29yZHNMYXN0WzFdO1xuICAgICAgICB2YXIgcm93T2Zmc2V0ID0gTWF0aC5hYnMocm93IC0gcm93TGFzdCk7XG4gICAgICAgIHZhciBjb2xPZmZzZXQgPSBNYXRoLmFicyhjb2wgLSBjb2xMYXN0KTtcbiAgICAgICAgcmV0dXJuIChyb3dPZmZzZXQgPD0gMSAmJiBjb2xPZmZzZXQgPD0gMSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYXJJZkNvbmZsaWN0aW5nKHVwZGF0ZVdvcmRPYmosIGV4cG9ydFdvcmRPYmopIHtcbiAgICAgICAgdmFyIHRpbGVzTW92ZWQgPSBPYmplY3Qua2V5cyh1cGRhdGVXb3JkT2JqKTtcbiAgICAgICAgdmFyIG15V29yZFRpbGVzID0gT2JqZWN0LmtleXMoZXhwb3J0V29yZE9iaik7XG4gICAgICAgIGlmICh0aWxlc01vdmVkLnNvbWUoY29vcmQgPT4gbXlXb3JkVGlsZXMuaW5jbHVkZXMoY29vcmQpKSkgJHNjb3BlLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgJHNjb3BlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5leHBvcnRzLndvcmQgPSBcIlwiO1xuICAgICAgICAkc2NvcGUuZXhwb3J0cy53b3JkT2JqID0ge307XG4gICAgfTtcblxuICAgIC8vICRzY29wZS5zdWJtaXQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyAgICAgcmV0dXJuIEJvYXJkRmFjdG9yeS5zdWJtaXQoKVxuICAgIC8vICAgICAgICAgLy8gLnRoZW4oZnVuY3Rpb24oeCkge1xuICAgIC8vICAgICAgICAgLy8gICAgICRzY29wZS5leHBvcnRzLndvcmRPYmogPSB7fTtcbiAgICAvLyAgICAgICAgIC8vICAgICAkc2NvcGUuZXhwb3J0cy53b3JkID0gXCJcIjtcbiAgICAvLyAgICAgICAgIH0pO1xuICAgIC8vIH07XG5cblxuICAgICRzY29wZS5zdWJtaXQgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3N1Ym1pdHRpbmcgJywgb2JqKTtcbiAgICAgICAgQm9hcmRGYWN0b3J5LnN1Ym1pdChvYmopO1xuICAgICAgICAkc2NvcGUuY2xlYXIoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNodWZmbGUgPSBCb2FyZEZhY3Rvcnkuc2h1ZmZsZTtcblxuXG4gICAgJHNjb3BlLnVwZGF0ZUJvYXJkID0gZnVuY3Rpb24od29yZE9iaikge1xuICAgICAgICBjb25zb2xlLmxvZygnc2NvcGUuYm9hcmQnLCAkc2NvcGUuYm9hcmQpO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gd29yZE9iaikge1xuICAgICAgICAgICAgdmFyIGNvb3JkcyA9IGtleS5zcGxpdCgnLScpO1xuICAgICAgICAgICAgdmFyIHJvdyA9IGNvb3Jkc1swXTtcbiAgICAgICAgICAgIHZhciBjb2wgPSBjb29yZHNbMV07XG4gICAgICAgICAgICAkc2NvcGUuYm9hcmRbcm93XVtjb2xdID0gd29yZE9ialtrZXldO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS51cGRhdGVTY29yZSA9IGZ1bmN0aW9uKHBvaW50cywgcGxheWVySWQpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3VwZGF0ZSBzY29yZSBwb2ludHMnLCBwb2ludHMpO1xuICAgICAgICBpZiAocGxheWVySWQgPT09ICRzY29wZS51c2VyLmlkKSB7XG4gICAgICAgICAgICAkc2NvcGUuc2NvcmUgKz0gcG9pbnRzO1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMucG9pbnRzRWFybmVkID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIHBsYXllciBpbiAkc2NvcGUub3RoZXJQbGF5ZXJzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCRzY29wZS5vdGhlclBsYXllcnNbcGxheWVyXS5pZCA9PT0gcGxheWVySWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVyc1twbGF5ZXJdLnNjb3JlICs9IHBvaW50cztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMucG9pbnRzRWFybmVkID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgICRzY29wZS51cGRhdGUgPSBmdW5jdGlvbih1cGRhdGVPYmopIHtcbiAgICAgICAgJHNjb3BlLnVwZGF0ZVNjb3JlKHVwZGF0ZU9iai5wb2ludHNFYXJuZWQsIHVwZGF0ZU9iai5wbGF5ZXJJZCk7XG4gICAgICAgICRzY29wZS51cGRhdGVCb2FyZCh1cGRhdGVPYmoud29yZE9iaik7XG4gICAgICAgICRzY29wZS5tZXNzYWdlID0gdXBkYXRlT2JqLnBsYXllcklkICsgXCIgcGxheWVkIFwiICsgdXBkYXRlT2JqLndvcmQgKyBcIiBmb3IgXCIgKyB1cGRhdGVPYmoucG9pbnRzRWFybmVkICsgXCIgcG9pbnRzIVwiO1xuICAgICAgICBjb25zb2xlLmxvZygnaXRzIHVwZGF0aW5nIScpO1xuICAgICAgICBjbGVhcklmQ29uZmxpY3RpbmcodXBkYXRlT2JqLCAkc2NvcGUuZXhwb3J0cy53b3JkT2JqKTtcbiAgICAgICAgJHNjb3BlLmV4cG9ydHMuc3RhdGVOdW1iZXIgPSB1cGRhdGVPYmouc3RhdGVOdW1iZXI7XG4gICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5yZXBsYXkgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJHTyFcIik7XG4gICAgICAgIExvYmJ5RmFjdG9yeS5uZXdHYW1lKCRzY29wZS5yb29tTmFtZSk7XG4gICAgICAgICRzY29wZS5zdGFydEdhbWUoKTtcbiAgICB9O1xuXG4gICAgJHJvb3RTY29wZS5oaWRlTmF2YmFyID0gdHJ1ZTtcblxuICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7IFNvY2tldC5kaXNjb25uZWN0KCk7IH0pO1xuICAgIGNvbnNvbGUubG9nKCd1cGRhdGUgMS4xJylcbiAgICBTb2NrZXQub24oJ2Nvbm5lY3QnLCBmdW5jdGlvbigpIHtcblxuICAgICAgICBTb2NrZXQuZW1pdCgnam9pblJvb20nLCAkc2NvcGUudXNlciwgJHNjb3BlLnJvb21OYW1lLCAkc2NvcGUuZ2FtZUlkKTtcbiAgICAgICAgY29uc29sZS5sb2coJ2VtaXR0aW5nIFwiam9pbiByb29tXCIgZXZlbnQgdG8gc2VydmVyJywgJHNjb3BlLnJvb21OYW1lKTtcblxuICAgICAgICBTb2NrZXQub24oJ3Jvb21Kb2luU3VjY2VzcycsIGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCduZXcgdXNlciBqb2luaW5nJywgdXNlci5pZCk7XG5cbiAgICAgICAgICAgIHVzZXIuc2NvcmUgPSAwO1xuICAgICAgICAgICAgLy8gdmFyIHBsYXllcklkcyA9IFtdO1xuICAgICAgICAgICAgLy8gJHNjb3BlLm90aGVyUGxheWVycy5mb3JFYWNoKG90aGVyUGxheWVyID0+IHtcbiAgICAgICAgICAgIC8vICAgICBwbGF5ZXJJZHMucHVzaChvdGhlclBsYXllci5pZClcbiAgICAgICAgICAgIC8vIH0pO1xuICAgICAgICAgICAgLy8gaWYgKHBsYXllcklkcy5pbmRleE9mKHVzZXIuaWQpID09PSAtMSkge1xuICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVycy5wdXNoKHVzZXIpO1xuICAgICAgICAgICAgJHNjb3BlLiRkaWdlc3QoKTtcblxuICAgICAgICAgICAgLy8gQm9hcmRGYWN0b3J5LmdldEN1cnJlbnRSb29tKCRzdGF0ZVBhcmFtcy5yb29tbmFtZSlcbiAgICAgICAgICAgIC8vICAgICAudGhlbihyb29tID0+IHtcbiAgICAgICAgICAgIC8vICAgICAgICAgY29uc29sZS5sb2cocm9vbSlcbiAgICAgICAgICAgIC8vICAgICAgICAgJHNjb3BlLmdhbWVJZCA9IHJvb20uaWQ7XG4gICAgICAgICAgICAvLyAgICAgICAgICRzY29wZS5vdGhlclBsYXllcnMgPSByb29tLnVzZXJzLmZpbHRlcih1c2VyID0+IHVzZXIuaWQgIT09ICRzY29wZS51c2VyLmlkKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgJHNjb3BlLm90aGVyUGxheWVycy5mb3JFYWNoKHBsYXllciA9PiB7IHBsYXllci5zY29yZSA9IDAgfSlcbiAgICAgICAgICAgIC8vICAgICB9KVxuXG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLy8gU29ja2V0Lm9uKCdyb29tRGF0YScsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKCdsaXN0ZW5pbmcgZm9yIHJvb21EYXRhIGV2ZW50IGZyb20gc2VydmVyJylcbiAgICAgICAgLy8gICAgIGlmIChkYXRhLmNvdW50Lmxlbmd0aCA8IDIpIHtcbiAgICAgICAgLy8gICAgICAgICAkc2NvcGUubWVzc2FnZXMgPSBcIldhaXRpbmcgZm9yIGFub3RoZXIgcGxheWVyXCI7XG4gICAgICAgIC8vICAgICAgICAgY29uc29sZS5sb2coJ3Njb3BlIG1lc3NhZ2U6ICcsICRzY29wZS5tZXNzYWdlcylcbiAgICAgICAgLy8gICAgIH0gZWxzZSB7XG4gICAgICAgIC8vICAgICAgICAgJHNjb3BlLm1lc3NhZ2VzID0gbnVsbDtcbiAgICAgICAgLy8gICAgIH1cbiAgICAgICAgLy8gfSlcblxuICAgICAgICBTb2NrZXQub24oJ3N0YXJ0Qm9hcmQnLCBmdW5jdGlvbihib2FyZCkge1xuICAgICAgICAgICAgJHNjb3BlLmZyZWV6ZSA9IGZhbHNlO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2JvYXJkISAnLCBib2FyZCk7XG4gICAgICAgICAgICAkc2NvcGUuYm9hcmQgPSBib2FyZDtcbiAgICAgICAgICAgIC8vIHNldEludGVydmFsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkc2NvcGUuaGlkZUJvYXJkID0gZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUuJGV2YWxBc3luYygpO1xuICAgICAgICAgICAgLy8gfSwgMzAwMCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIFNvY2tldC5vbignd29yZFZhbGlkYXRlZCcsIGZ1bmN0aW9uKHVwZGF0ZU9iaikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3dvcmQgaXMgdmFsaWRhdGVkJyk7XG4gICAgICAgICAgICAkc2NvcGUudXBkYXRlKHVwZGF0ZU9iaik7XG4gICAgICAgICAgICAkc2NvcGUubGFzdFdvcmRQbGF5ZWQgPSB1cGRhdGVPYmoud29yZDtcbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIFNvY2tldC5vbignYm9hcmRTaHVmZmxlZCcsIGZ1bmN0aW9uKGJvYXJkLCB1c2VySWQsIHN0YXRlTnVtYmVyKSB7XG4gICAgICAgICAgICAkc2NvcGUuYm9hcmQgPSBib2FyZDtcbiAgICAgICAgICAgICRzY29wZS51cGRhdGVTY29yZSgtNSwgdXNlcklkKTtcbiAgICAgICAgICAgICRzY29wZS5jbGVhcigpO1xuICAgICAgICAgICAgJHNjb3BlLmV4cG9ydHMuc3RhdGVOdW1iZXIgPSBzdGF0ZU51bWJlcjtcbiAgICAgICAgICAgICRzY29wZS5tZXNzYWdlID0gdXNlcklkICsgXCIgc2h1ZmZsZWQgdGhlIGJvYXJkIVwiO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJHNjb3BlLm1lc3NhZ2UpO1xuICAgICAgICAgICAgJHNjb3BlLiRldmFsQXN5bmMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgU29ja2V0Lm9uKCdwbGF5ZXJEaXNjb25uZWN0ZWQnLCBmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygncGxheWVyRGlzY29ubmVjdGVkJywgdXNlci5pZCk7XG4gICAgICAgICAgICAkc2NvcGUub3RoZXJQbGF5ZXJzID0gJHNjb3BlLm90aGVyUGxheWVycy5tYXAob3RoZXJQbGF5ZXJzID0+IG90aGVyUGxheWVycy5pZCAhPT0gdXNlci5pZCk7XG5cbiAgICAgICAgICAgICRzY29wZS4kZXZhbEFzeW5jKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIFNvY2tldC5vbignZ2FtZU92ZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICRzY29wZS5jbGVhcigpO1xuICAgICAgICAgICAgJHNjb3BlLiRkaWdlc3QoKTtcbiAgICAgICAgICAgICRzY29wZS5mcmVlemUgPSB0cnVlO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2dhbWUgaXMgb3ZlcicpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkgKFwiQm9hcmRGYWN0b3J5XCIsIGZ1bmN0aW9uKCRodHRwLCBTb2NrZXQpe1xuXHRyZXR1cm57XG5cdFx0Z2V0U3RhcnRCb2FyZDogZnVuY3Rpb24oZ2FtZUxlbmd0aCwgZ2FtZUlkLCB1c2VySWRzKXtcblx0XHRcdGNvbnNvbGUubG9nKCdmYWN0b3J5LiBnbDogJywgZ2FtZUxlbmd0aCk7XG5cdFx0XHRTb2NrZXQuZW1pdCgnZ2V0U3RhcnRCb2FyZCcsIGdhbWVMZW5ndGgsIGdhbWVJZCwgdXNlcklkcyk7XG5cdFx0fSxcblxuXHRcdHN1Ym1pdDogZnVuY3Rpb24ob2JqKXtcblx0XHRcdFNvY2tldC5lbWl0KCdzdWJtaXRXb3JkJywgb2JqKTtcblx0XHR9LFxuXG5cdFx0c2h1ZmZsZTogZnVuY3Rpb24odXNlcil7XG5cdFx0XHRjb25zb2xlLmxvZygnZ3JpZGZhY3RvcnkgdScsdXNlci5pZCk7XG5cdFx0XHRTb2NrZXQuZW1pdCgnc2h1ZmZsZUJvYXJkJyx1c2VyLmlkKTtcblx0XHR9LFxuXG5cdFx0Ly8gZmluZEFsbE90aGVyVXNlcnM6IGZ1bmN0aW9uKGdhbWUpIHtcblx0XHQvLyBcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvZ2FtZXMvJysgZ2FtZS5pZClcblx0XHQvLyBcdC50aGVuKHJlcyA9PiByZXMuZGF0YSlcblx0XHQvLyB9LFxuXG5cdFx0Z2V0Q3VycmVudFJvb206IGZ1bmN0aW9uKHJvb21uYW1lKSB7XG5cdFx0XHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2dhbWVzL3Jvb21zLycrcm9vbW5hbWUpXG5cdFx0XHQudGhlbihyZXMgPT4gcmVzLmRhdGEpXG5cdFx0fSxcblxuXHRcdHF1aXRGcm9tUm9vbTogZnVuY3Rpb24oZ2FtZUlkLCB1c2VySWQpIHtcblx0XHRcdC8vIFNvY2tldC5lbWl0KCdkaXNjb25uZWN0Jywgcm9vbU5hbWUsIHVzZXJJZCk7XG5cdFx0XHRyZXR1cm4gJGh0dHAuZGVsZXRlKCcvYXBpL2dhbWVzLycrZ2FtZUlkKycvJyt1c2VySWQpXG5cdFx0fVxuXHR9XG59KTtcbiIsImFwcC5jb250cm9sbGVyKCdIb21lQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlLCAkbG9jYXRpb24pe1xuICAkc2NvcGUuZW50ZXJMb2JieSA9IGZ1bmN0aW9uKCl7XG4gICAgJHN0YXRlLmdvKCdsb2JieScsIHtyZWxvYWQ6IHRydWV9KTtcbiAgfVxufSk7XG5cbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUnLCB7XG4gICAgICAgIHVybDogJy8nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJ1xuICAgIH0pO1xufSk7XG5cbiIsImFwcC5jb250cm9sbGVyKCdMZWFkZXJCb2FyZEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIExlYWRlckJvYXJkRmFjdG9yeSwgJHN0YXRlLCBBdXRoU2VydmljZSkge1xuICAgIGNvbnNvbGUubG9nKCcgMScpXG4gICAgTGVhZGVyQm9hcmRGYWN0b3J5LkFsbFBsYXllcnMoKVxuICAgIC50aGVuKHBsYXllcnMgPT4ge1xuICAgICAgICBwbGF5ZXJzLmZvckVhY2gocGxheWVyID0+IHtcbiAgICAgICAgICAgIGlmIChwbGF5ZXIuZ2FtZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciBzY29yZXMgPSBwbGF5ZXIuZ2FtZXMubWFwKGdhbWUgPT4gZ2FtZS51c2VyR2FtZS5zY29yZSlcbiAgICAgICAgICAgICAgICBwbGF5ZXIuaGlnaGVzdFNjb3JlID0gTWF0aC5tYXgoLi4uc2NvcmVzKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwbGF5ZXIuaGlnaGVzdFNjb3JlID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBsYXllci5nYW1lc193b24gPSBwbGF5ZXIud2lubmVyLmxlbmd0aDtcbiAgICAgICAgICAgIHBsYXllci5nYW1lc19wbGF5ZWQgPSBwbGF5ZXIuZ2FtZXMubGVuZ3RoO1xuICAgICAgICAgICAgaWYocGxheWVyLmdhbWVzLmxlbmd0aD09PTApe1xuICAgICAgICAgICAgXHRwbGF5ZXIud2luX3BlcmNlbnRhZ2UgPSAwICsgJyUnXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgXHRwbGF5ZXIud2luX3BlcmNlbnRhZ2UgPSAoKHBsYXllci53aW5uZXIubGVuZ3RoL3BsYXllci5nYW1lcy5sZW5ndGgpKjEwMCkudG9GaXhlZCgwKSArICclJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KVxuICAgICAgICAkc2NvcGUucGxheWVycyA9IHBsYXllcnM7XG4gICAgfSlcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ0xlYWRlckJvYXJkRmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuXHR2YXIgTGVhZGVyQm9hcmRGYWN0b3J5ID0ge307XG5cblx0TGVhZGVyQm9hcmRGYWN0b3J5LkFsbFBsYXllcnMgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3VzZXJzJylcblx0XHQudGhlbihyZXM9PnJlcy5kYXRhKVxuXHR9XG5cblx0cmV0dXJuIExlYWRlckJvYXJkRmFjdG9yeTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsZWFkZXJCb2FyZCcsIHtcbiAgICAgICAgdXJsOiAnL2xlYWRlckJvYXJkJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sZWFkZXJCb2FyZC9sZWFkZXJCb2FyZC50ZW1wbGF0ZS5odG1sJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICBcdGFsbFBsYXllcnM6IGZ1bmN0aW9uKExlYWRlckJvYXJkRmFjdG9yeSkge1xuICAgICAgICBcdFx0cmV0dXJuIExlYWRlckJvYXJkRmFjdG9yeS5BbGxQbGF5ZXJzO1xuICAgICAgICBcdH0sXG4gICAgICAgICAgICBcbiAgICAgICAgfSxcbiAgICAgICAgY29udHJvbGxlcjogJ0xlYWRlckJvYXJkQ3RybCdcbiAgICB9KTtcblxufSk7IiwiYXBwLmNvbnRyb2xsZXIoJ0xvYmJ5Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgTG9iYnlGYWN0b3J5LCByb29tcywgJHN0YXRlLCBBdXRoU2VydmljZSkge1xuXG4gICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24odXNlcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3VzZXIgZnJvbSBBdXRoU2VydmljZScsIHVzZXIpO1xuICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICB9KTtcblxuICAgICRzY29wZS5yb29tcyA9IHJvb21zO1xuICAgICRzY29wZS5yb29tTmFtZUZvcm0gPSBmYWxzZTtcbiAgICAvLyAkc2NvcGUudXNlciA9IHtcbiAgICAvLyAgaWQ6IDNcbiAgICAvLyB9XG5cbiAgICAkc2NvcGUuam9pbkdhbWUgPSBmdW5jdGlvbihyb29tKSB7XG4gICAgICAgICRzdGF0ZS5nbygnR2FtZScsIHsgcm9vbW5hbWU6IHJvb20ucm9vbW5hbWUgfSlcbiAgICB9XG5cbiAgICAkc2NvcGUubmV3Um9vbSA9IGZ1bmN0aW9uKHJvb21JbmZvKSB7XG4gICAgICAgIExvYmJ5RmFjdG9yeS5uZXdHYW1lKHJvb21JbmZvKTtcbiAgICAgICAgJHNjb3BlLnJvb21OYW1lRm9ybSA9IGZhbHNlO1xuICAgIH1cbiAgICAkc2NvcGUuc2hvd0Zvcm0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLnJvb21OYW1lRm9ybSA9IHRydWU7XG4gICAgfVxuXG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ2VudGVyTG9iYnknLCBmdW5jdGlvbigpe1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgdGVtcGxhdGVVcmw6ICdqcy9sb2JieS9sb2JieS1idXR0b24uaHRtbCcsXG4gICAgY29udHJvbGxlcjogJ0hvbWVDdHJsJ1xuICB9XG59KVxuIiwiYXBwLmZhY3RvcnkoJ0xvYmJ5RmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuXHR2YXIgTG9iYnlGYWN0b3J5ID0ge307XG5cdHZhciB0ZW1wUm9vbXMgPSBbXTsgLy93b3JrIHdpdGggc29ja2V0P1xuXG5cdExvYmJ5RmFjdG9yeS5nZXRBbGxSb29tcyA9IGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS9nYW1lcy9yb29tcycpXG5cdFx0LnRoZW4ocmVzID0+IHJlcy5kYXRhKVxuXHRcdC50aGVuKHJvb21zID0+IHtcblx0XHRcdGFuZ3VsYXIuY29weShyb29tcywgdGVtcFJvb21zKTtcblx0XHRcdHJldHVybiB0ZW1wUm9vbXM7XG5cdFx0fSlcblx0fTtcblxuXHRMb2JieUZhY3Rvcnkuam9pbkdhbWUgPSBmdW5jdGlvbihyb29tSWQsIHVzZXJJZCkge1xuICAgIGNvbnNvbGUubG9nKCdsb2JieSBmYWN0b3J5IGpvaW4gZ2FtZScpO1xuXHRcdHJldHVybiAkaHR0cC5wdXQoJy9hcGkvZ2FtZXMvJysgcm9vbUlkICsnL3BsYXllcicsIHtpZDogdXNlcklkfSlcblx0XHQudGhlbihyZXM9PnJlcy5kYXRhKVxuXHR9O1xuXG5cdExvYmJ5RmFjdG9yeS5uZXdHYW1lID0gZnVuY3Rpb24ocm9vbUluZm8pIHtcblx0XHRyZXR1cm4gJGh0dHAucHV0KCcvYXBpL2dhbWVzJywgcm9vbUluZm8pXG5cdFx0LnRoZW4ocmVzID0+IHJlcy5kYXRhKVxuXHRcdC50aGVuKHJvb20gPT4ge3RlbXBSb29tcy5wdXNoKHJvb20pfSlcblx0fVxuXG5cdExvYmJ5RmFjdG9yeS5BbGxQbGF5ZXJzID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS91c2VycycpXG5cdFx0LnRoZW4ocmVzPT5yZXMuZGF0YSlcblx0fVxuXG5cdHJldHVybiBMb2JieUZhY3Rvcnk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9iYnknLCB7XG4gICAgICAgIHVybDogJy9sb2JieScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9iYnkvbG9iYnkudGVtcGxhdGUuaHRtbCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgXHRyb29tczogZnVuY3Rpb24oTG9iYnlGYWN0b3J5KSB7XG4gICAgICAgIFx0XHRyZXR1cm4gTG9iYnlGYWN0b3J5LmdldEFsbFJvb21zKCk7XG4gICAgICAgIFx0fVxuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiAnTG9iYnlDdHJsJ1xuICAgIH0pO1xuXG59KTsiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xuICAgICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0xvZ2luQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgICRzY29wZS5sb2dpbiA9IHt9O1xuICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAkc2NvcGUuc2VuZExvZ2luID0gZnVuY3Rpb24gKGxvZ2luSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UubG9naW4obG9naW5JbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdtZW1iZXJzT25seScsIHtcbiAgICAgICAgdXJsOiAnL21lbWJlcnMtYXJlYScsXG4gICAgICAgIHRlbXBsYXRlOiAnPGltZyBuZy1yZXBlYXQ9XCJpdGVtIGluIHN0YXNoXCIgd2lkdGg9XCIzMDBcIiBuZy1zcmM9XCJ7eyBpdGVtIH19XCIgLz4nLFxuICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlLCBTZWNyZXRTdGFzaCkge1xuICAgICAgICAgICAgU2VjcmV0U3Rhc2guZ2V0U3Rhc2goKS50aGVuKGZ1bmN0aW9uIChzdGFzaCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5zdGFzaCA9IHN0YXNoO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgZGF0YS5hdXRoZW50aWNhdGUgaXMgcmVhZCBieSBhbiBldmVudCBsaXN0ZW5lclxuICAgICAgICAvLyB0aGF0IGNvbnRyb2xzIGFjY2VzcyB0byB0aGlzIHN0YXRlLiBSZWZlciB0byBhcHAuanMuXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxuICAgICAgICB9XG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuZmFjdG9yeSgnU2VjcmV0U3Rhc2gnLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBnZXRTdGFzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9tZW1iZXJzL3NlY3JldC1zdGFzaCcpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGdldFN0YXNoOiBnZXRTdGFzaFxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgncmFua0RpcmVjdGl2ZScsICgpPT4ge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnRScsXG5cdFx0c2NvcGU6IHtcblx0XHRcdHJhbmtOYW1lOiAnQCcsXG5cdFx0XHRwbGF5ZXJzOiAnPScsXG5cdFx0XHRyYW5rQnk6ICdAJyxcblx0XHRcdG9yZGVyOiAnQCdcblx0XHR9LFxuXHRcdHRlbXBsYXRlVXJsOiAnL2pzL3JhbmsvcmFuay50ZW1wbGF0ZS5odG1sJ1xuXHR9XG59KTsiLCJhcHAuZmFjdG9yeSgnU2lnbnVwRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwLCAkc3RhdGUsIEF1dGhTZXJ2aWNlKSB7XG5cdGNvbnN0IFNpZ251cEZhY3RvcnkgPSB7fTtcblxuXHRTaWdudXBGYWN0b3J5LmNyZWF0ZVVzZXIgPSBmdW5jdGlvbihzaWdudXBJbmZvKSB7XG5cdFx0Y29uc29sZS5sb2coc2lnbnVwSW5mbylcblx0XHRyZXR1cm4gJGh0dHAucG9zdCgnL3NpZ251cCcsIHNpZ251cEluZm8pXG5cdFx0LnRoZW4ocmVzID0+IHtcblx0XHRcdGlmIChyZXMuc3RhdHVzID09PSAyMDEpIHtcblx0XHRcdFx0QXV0aFNlcnZpY2UubG9naW4oe2VtYWlsOiBzaWdudXBJbmZvLmVtYWlsLCBwYXNzd29yZDogc2lnbnVwSW5mby5wYXNzd29yZH0pXG5cdFx0XHRcdC50aGVuKHVzZXIgPT4ge1xuXHRcdFx0XHRcdCRzdGF0ZS5nbygnaG9tZScpXG5cdFx0XHRcdH0pXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aHJvdyBFcnJvcignQW4gYWNjb3VudCB3aXRoIHRoYXQgZW1haWwgYWxyZWFkeSBleGlzdHMnKTtcblx0XHRcdH1cblx0XHR9KVxuXHR9XG5cblx0cmV0dXJuIFNpZ251cEZhY3Rvcnk7XG59KSIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnc2lnbnVwJywge1xuICAgICAgICB1cmw6ICcvc2lnbnVwJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9zaWdudXAvc2lnbnVwLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnU2lnbnVwQ3RybCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdTaWdudXBDdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSwgU2lnbnVwRmFjdG9yeSkge1xuXG4gICAgJHNjb3BlLnNpZ251cCA9IHt9O1xuICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAkc2NvcGUuc2VuZFNpZ251cCA9IGZ1bmN0aW9uKHNpZ251cEluZm8pe1xuICAgICAgICBTaWdudXBGYWN0b3J5LmNyZWF0ZVVzZXIoc2lnbnVwSW5mbylcbiAgICAgICAgLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdBbiBhY2NvdW50IHdpdGggdGhhdCBlbWFpbCBhbHJlYWR5IGV4aXN0cyc7XG4gICAgICAgIH0pXG4gICAgfVxuICAgIFxuXG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcil7XG5cdCRzdGF0ZVByb3ZpZGVyLnN0YXRlKFwiVXNlclByb2ZpbGVcIix7XG5cdFx0dXJsOiBcIi91c2Vycy86dXNlcklkXCIsXG5cdFx0dGVtcGxhdGVVcmw6XCJqcy91c2VyX3Byb2ZpbGUvcHJvZmlsZS50ZW1wbGF0ZS5odG1sXCIsXG5cdFx0Y29udHJvbGxlcjogXCJVc2VyQ3RybFwiXG5cdH0pXG5cdCRzdGF0ZVByb3ZpZGVyLnN0YXRlKFwiR2FtZVJlY29yZFwiLCB7XG5cdFx0dXJsOlwiL3VzZXJzLzp1c2VySWQvZ2FtZXNcIixcblx0XHR0ZW1wbGF0ZVVybDogXCJqcy91c2VyX3Byb2ZpbGUvZ2FtZXMuaHRtbFwiLFxuXHRcdGNvbnRyb2xsZXI6IFwiR2FtZVJlY29yZEN0cmxcIlxuXHR9KVxufSlcblxuYXBwLmNvbnRyb2xsZXIoXCJVc2VyQ3RybFwiLCBmdW5jdGlvbigkc2NvcGUsIFVzZXJGYWN0b3J5LCAkc3RhdGVQYXJhbXMpe1xuXHRVc2VyRmFjdG9yeS5mZXRjaEluZm9ybWF0aW9uKCRzdGF0ZVBhcmFtcy51c2VySWQpXG5cdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuXHRcdCRzY29wZS51c2VyPXVzZXI7XG5cdFx0cmV0dXJuIHVzZXJcblx0fSlcblx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG5cdFx0JHNjb3BlLnVwZGF0ZWQ9JHNjb3BlLnVzZXIudXBkYXRlZEF0LmdldERheSgpO1xuXHR9KVxufSlcblxuYXBwLmNvbnRyb2xsZXIoXCJHYW1lUmVjb3JkQ3RybFwiLGZ1bmN0aW9uKCRzY29wZSwgVXNlckZhY3RvcnksICRzdGF0ZVBhcmFtcyl7XG5cdFVzZXJGYWN0b3J5LmZldGNoSW5mb3JtYXRpb24oJHN0YXRlUGFyYW1zLnVzZXJJZClcblx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG5cdFx0JHNjb3BlLnVzZXI9dXNlcjtcblx0fSlcblx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG5cdFVzZXJGYWN0b3J5LmZldGNoR2FtZXMoJHN0YXRlUGFyYW1zLnVzZXJJZClcblx0fSlcblx0LnRoZW4oZnVuY3Rpb24oZ2FtZXMpe1xuXHRcdCRzY29wZS5nYW1lcz1nYW1lcztcblx0fSlcbn0pIiwiYXBwLmZhY3RvcnkoXCJVc2VyRmFjdG9yeVwiLCBmdW5jdGlvbigkaHR0cCl7XG5cdHJldHVybiB7XG5cdFx0ZmV0Y2hJbmZvcm1hdGlvbjogZnVuY3Rpb24oaWQpe1xuXHRcdFx0cmV0dXJuICRodHRwLmdldChcIi9hcGkvdXNlcnMvXCIraWQpXG5cdFx0XHQudGhlbihmdW5jdGlvbih1c2VyKXtcblx0XHRcdFx0cmV0dXJuIHVzZXIuZGF0YTtcblx0XHRcdH0pXG5cdFx0fSxcblx0XHRmZXRjaEdhbWVzOiBmdW5jdGlvbihpZCl7XG5cdFx0XHRyZXR1cm4gJGh0dHAuZ2V0KFwiL2FwaS91c2Vycy9cIitpZCtcIi9nYW1lc1wiKVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24oZ2FtZXMpe1xuXHRcdFx0XHRyZXR1cm4gZ2FtZXMuZGF0YTtcblx0XHRcdH0pXG5cdFx0fVxuXHR9XG59KSIsImFwcC5mYWN0b3J5KCdGdWxsc3RhY2tQaWNzJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjdnQlh1bENBQUFYUWNFLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL2ZiY2RuLXNwaG90b3MtYy1hLmFrYW1haWhkLm5ldC9ocGhvdG9zLWFrLXhhcDEvdDMxLjAtOC8xMDg2MjQ1MV8xMDIwNTYyMjk5MDM1OTI0MV84MDI3MTY4ODQzMzEyODQxMTM3X28uanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLUxLVXNoSWdBRXk5U0suanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNzktWDdvQ01BQWt3N3kuanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLVVqOUNPSUlBSUZBaDAuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNnlJeUZpQ0VBQXFsMTIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRS1UNzVsV0FBQW1xcUouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRXZaQWctVkFBQWs5MzIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRWdOTWVPWElBSWZEaEsuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRVF5SUROV2dBQXU2MEIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQ0YzVDVRVzhBRTJsR0ouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQWVWdzVTV29BQUFMc2ouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQWFKSVA3VWtBQWxJR3MuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQVFPdzlsV0VBQVk5RmwuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLU9RYlZyQ01BQU53SU0uanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9COWJfZXJ3Q1lBQXdSY0oucG5nOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNVBUZHZuQ2NBRUFsNHguanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNHF3QzBpQ1lBQWxQR2guanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CMmIzM3ZSSVVBQTlvMUQuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9Cd3BJd3IxSVVBQXZPMl8uanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9Cc1NzZUFOQ1lBRU9oTHcuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSjR2TGZ1VXdBQWRhNEwuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSTd3empFVkVBQU9QcFMuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSWRIdlQyVXNBQW5uSFYuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DR0NpUF9ZV1lBQW83NVYuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSVM0SlBJV0lBSTM3cXUuanBnOmxhcmdlJ1xuICAgIF07XG59KTtcbiIsImFwcC5mYWN0b3J5KCdSYW5kb21HcmVldGluZ3MnLCBmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgZ2V0UmFuZG9tRnJvbUFycmF5ID0gZnVuY3Rpb24gKGFycikge1xuICAgICAgICByZXR1cm4gYXJyW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGFyci5sZW5ndGgpXTtcbiAgICB9O1xuXG4gICAgdmFyIGdyZWV0aW5ncyA9IFtcbiAgICAgICAgJ0hlbGxvLCB3b3JsZCEnLFxuICAgICAgICAnQXQgbG9uZyBsYXN0LCBJIGxpdmUhJyxcbiAgICAgICAgJ0hlbGxvLCBzaW1wbGUgaHVtYW4uJyxcbiAgICAgICAgJ1doYXQgYSBiZWF1dGlmdWwgZGF5IScsXG4gICAgICAgICdJXFwnbSBsaWtlIGFueSBvdGhlciBwcm9qZWN0LCBleGNlcHQgdGhhdCBJIGFtIHlvdXJzLiA6KScsXG4gICAgICAgICdUaGlzIGVtcHR5IHN0cmluZyBpcyBmb3IgTGluZHNheSBMZXZpbmUuJyxcbiAgICAgICAgJ+OBk+OCk+OBq+OBoeOBr+OAgeODpuODvOOCtuODvOanmOOAgicsXG4gICAgICAgICdXZWxjb21lLiBUby4gV0VCU0lURS4nLFxuICAgICAgICAnOkQnLFxuICAgICAgICAnWWVzLCBJIHRoaW5rIHdlXFwndmUgbWV0IGJlZm9yZS4nLFxuICAgICAgICAnR2ltbWUgMyBtaW5zLi4uIEkganVzdCBncmFiYmVkIHRoaXMgcmVhbGx5IGRvcGUgZnJpdHRhdGEnLFxuICAgICAgICAnSWYgQ29vcGVyIGNvdWxkIG9mZmVyIG9ubHkgb25lIHBpZWNlIG9mIGFkdmljZSwgaXQgd291bGQgYmUgdG8gbmV2U1FVSVJSRUwhJyxcbiAgICBdO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ3JlZXRpbmdzOiBncmVldGluZ3MsXG4gICAgICAgIGdldFJhbmRvbUdyZWV0aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0UmFuZG9tRnJvbUFycmF5KGdyZWV0aW5ncyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ2Z1bGxzdGFja0xvZ28nLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5odG1sJ1xuICAgIH07XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ25hdmJhcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgQVVUSF9FVkVOVFMsICRzdGF0ZSkge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHt9LFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuXG4gICAgICAgICAgICBzY29wZS5pdGVtcyA9IFtcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnSG9tZScsIHN0YXRlOiAnaG9tZScgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnQWJvdXQnLCBzdGF0ZTogJ2Fib3V0JyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdZb3VyIFByb2ZpbGUnLCBzdGF0ZTogJ1VzZXJQcm9maWxlJywgYXV0aDogdHJ1ZSB9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcblxuICAgICAgICAgICAgc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UubG9nb3V0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHJlbW92ZVVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzZXRVc2VyKCk7XG5cbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0VXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCByZW1vdmVVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCByZW1vdmVVc2VyKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ3JhbmRvR3JlZXRpbmcnLCBmdW5jdGlvbiAoUmFuZG9tR3JlZXRpbmdzKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcbiAgICAgICAgICAgIHNjb3BlLmdyZWV0aW5nID0gUmFuZG9tR3JlZXRpbmdzLmdldFJhbmRvbUdyZWV0aW5nKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59KTtcbiIsImFwcC5kaXJlY3RpdmUoXCJ0aW1lclwiLCBmdW5jdGlvbigkcSwgJGludGVydmFsLCBTb2NrZXQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgdGltZTogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIHRlbXBsYXRlVXJsOiBcImpzL2NvbW1vbi9kaXJlY3RpdmVzL3RpbWVyL3RpbWVyLmh0bWxcIixcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgICAgIHZhciB0aW1lID0gc2NvcGUudGltZTtcbiAgICAgICAgICAgIHZhciBzdGFydD1zY29wZS50aW1lO1xuICAgICAgICAgICAgc2NvcGUudGltZV9yZW1haW5pbmcgPSBjb252ZXJ0KHRpbWUpO1xuICAgICAgICAgICAgc2NvcGUuY291bnRkb3duID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRpbWVyID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB0aW1lIC09IDE7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gY29udmVydCh0aW1lKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRpbWUgPCAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IFwiVGltZSB1cCFcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwodGltZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGltZT1zdGFydDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gc2NvcGUubWVzc2FnZXMgPSBbXCJHZXQgUmVhZHkhXCIsIFwiR2V0IFNldCFcIiwgXCJHbyFcIiwgJy8nXTtcbiAgICAgICAgICAgIC8vICAgICB2YXIgaW5kZXggPSAwO1xuICAgICAgICAgICAgLy8gICAgIHZhciBwcmVwYXJlID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IHNjb3BlLm1lc3NhZ2VzW2luZGV4XTtcbiAgICAgICAgICAgIC8vICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICAgIC8vICAgICAgICAgY29uc29sZS5sb2coc2NvcGUudGltZV9yZW1haW5pbmcpO1xuICAgICAgICAgICAgLy8gICAgICAgICBpZiAoc2NvcGUudGltZV9yZW1haW5pbmcgPT09IFwiL1wiKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IGNvbnZlcnQodGltZSk7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKHByZXBhcmUpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgdmFyIHRpbWVyID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgIHRpbWUgLT0gMTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICBzY29wZS50aW1lX3JlbWFpbmluZyA9IGNvbnZlcnQodGltZSk7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgaWYgKHRpbWUgPCAxKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnRpbWVfcmVtYWluaW5nID0gXCJUaW1lIHVwIVwiO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKHRpbWVyKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgfVxuICAgICAgICAgICAgLy8gICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgLy8gfTtcblxuICAgICAgICAgICAgU29ja2V0Lm9uKCdzdGFydEJvYXJkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuY291bnRkb3duKHRpbWUpO1xuICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgZnVuY3Rpb24gY29udmVydCh0aW1lKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlY29uZHMgPSAodGltZSAlIDYwKS50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgIHZhciBjb252ZXJzaW9uID0gKE1hdGguZmxvb3IodGltZSAvIDYwKSkgKyAnOic7XG4gICAgICAgICAgICAgICAgaWYgKHNlY29uZHMubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgICAgICAgICBjb252ZXJzaW9uICs9ICcwJyArIHNlY29uZHM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29udmVyc2lvbiArPSBzZWNvbmRzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gY29udmVyc2lvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0pXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
