app.directive('rankDirective', ()=> {
	return {
		restrict: 'E',
		scope: {
			rankName: '@',
			players: '=',
			rankBy: '@',
			order: '@'
		},
		templateUrl: '/js/rank/rank.template.html'
	}
});