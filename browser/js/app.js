'use strict';
window.app = angular.module('FullstackGeneratedApp', ['fsaPreBuilt', 'ui.router', 'ui.bootstrap', 'ngAnimate']);

app.config(function($urlRouterProvider, $locationProvider) {
    // This turns off hashbang urls (/#about) and changes it to something normal (/about)
    $locationProvider.html5Mode(true);
    // If we go to a URL that ui-router doesn't have registered, go to the "/" url.
    $urlRouterProvider.otherwise('/');
    // Trigger page refresh when accessing an OAuth route
    $urlRouterProvider.when('/auth/:provider', function() {
        window.location.reload();
    });
});

// This app.run is for listening to errors broadcasted by ui-router, usually originating from resolves
app.run(function($rootScope) {
    $rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, thrownError) {
        console.info(`The following error was thrown by ui-router while transitioning to state "${toState.name}". The origin of this error is probably a resolve function:`);
        console.error(thrownError);
    });
});

// This app.run is for controlling access to specific states.
app.run(function($rootScope, AuthService, $state, BoardFactory) {

    // The given state requires an authenticated user.
    var destinationStateRequiresAuth = function(state) {
        return state.data && state.data.authenticate;
    };

    var destinationStateWithLimits = function(state) {
        return state.data && state.data.enterRoom;
    };

    // $stateChangeStart is an event fired
    // whenever the process of changing a state begins.
    $rootScope.$on('$stateChangeStart', function(event, toState, toParams) {

        if (!destinationStateRequiresAuth(toState) && !destinationStateWithLimits(toState)) {
                // The destination state does not require authentication
                // Short circuit with return.
            return;
        }

        if (!destinationStateWithLimits(toState) && destinationStateRequiresAuth(toState)) {
            console.log(AuthService.isAuthenticated())
            if (AuthService.isAuthenticated()) {
                    // The user is authenticated.
                    // Short circuit with return.
                return;
            }
            event.preventDefault();
            AuthService.getLoggedInUser().then(function(user) {
                // If a user is retrieved, then renavigate to the destination
                // (the second time, AuthService.isAuthenticated() will work)
                // otherwise, if no user is logged in, go to "login" state.
                if (user) {
                    $state.go(toState.name, toParams);

                } else {
                    $state.go('login');
                }
            });
        }


        if (destinationStateWithLimits(toState) && destinationStateRequiresAuth(toState)) {

            BoardFactory.getCurrentRoom(toParams.roomname)
                .then(room => {
                    let permit = false
                    if (room && room.users.length < 4) {
                        permit = true;
                    }
                    if (permit && AuthService.isAuthenticated()) {
                        return;
                    }

                    event.preventDefault();

                    AuthService.getLoggedInUser().then(function(user) {
                        // If a user is retrieved, then renavigate to the destination
                        // (the second time, AuthService.isAuthenticated() will work)
                        // otherwise, if no user is logged in, go to "login" state.
                        if (user && permit) {
                            $state.go(toState.name, toParams);
                        } else if (user && !permit) {
                            $state.go('lobby');
                        } else {
                            $state.go('login');
                        }
                    });

                })
        }
    });

});
