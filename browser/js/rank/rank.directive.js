app.directive('rankDirective', ()=> {
	return {
		restrict: 'E',
		scope: {
			rankName: '@',
			players: '='
		},
		templateUrl: '/js/rank/rank.template.html'
	}
});