app.factory('SignupFactory', function($http, $state, AuthService) {
	const SignupFactory = {};

	SignupFactory.createUser = function(signupInfo) {
		console.log(signupInfo)
		return $http.post('/signup', signupInfo)
		.then(res => {
			if (res.status === 201) {
				AuthService.login({email: signupInfo.email, password: signupInfo.password})
				.then(user => {
					$state.go('home')
				})
			} else {
				throw Error('An account with that email already exists');
			}
		})
	}

	return SignupFactory;
})