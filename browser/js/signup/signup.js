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

    $scope.sendSignup = function(signupInfo){
        SignupFactory.createUser(signupInfo)
        .catch(() => {
            $scope.error = 'An account with that email already exists';
        })
    }
    


});
