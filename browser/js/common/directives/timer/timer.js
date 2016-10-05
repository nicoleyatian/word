app.directive("timer", function($q, $interval){
	return{
		restrict: 'E',
		templateUrl: "js/common/directives/timer/timer.html",
		link: function(scope){
			var time=10;
			scope.time_remaining=(Math.floor(time/60))+':'+(time%60)
			scope.messages=["Get Ready!", "Get Set!", "Go!", '/']
			scope.countdown=function(){
				var index=0;
					var prepare=$interval(function(){
					scope.time_remaining=scope.messages[index];
					index++;
					console.log(scope.time_remaining);
					if (scope.time_remaining==="/"){
						console.log("Hi");
						scope.time_remaining=(Math.floor(time/60))+':'+(time%60);
						console.log(scope.time_remaining);
						$interval.cancel(prepare);
						var timer=$interval(function(){
							console.log("timer!")
						time-=1;
						scope.time_remaining=(Math.floor(time/60))+':'+(time%60);
						if (time<1){
							scope.time_remaining="Time up!";
							$interval.cancel(timer);
						}}, 1000);
					}
				}, 1000)
			}
			// var convert=function(time){
			// 	var conversion=(Math.floor(time/60))+':'+(time%60);
			// }
		}
	}
})