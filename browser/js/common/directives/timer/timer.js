app.directive("timer", function($q, $interval) {
    return {
        restrict: 'E',
        templateUrl: "js/common/directives/timer/timer.html",
        link: function(scope) {
            var time = 10;
            scope.time_remaining = convert(time);
            scope.messages = ["Get Ready!", "Get Set!", "Go!", '/']
            scope.countdown = function() {
                console.log(convert(64));
                var index = 0;
                var prepare = $interval(function() {
                    scope.time_remaining = scope.messages[index];
                    index++;
                    console.log(scope.time_remaining);
                    if (scope.time_remaining === "/") {
                        console.log("Hi");
                        scope.time_remaining = convert(time);
                        console.log(scope.time_remaining);
                        $interval.cancel(prepare);
                        var timer = $interval(function() {
                            console.log("timer!")
                            time -= 1;
                            scope.time_remaining = convert(time);
                            if (time < 1) {
                                scope.time_remaining = "Time up!";
                                $interval.cancel(timer);
                            }
                        }, 1000);
                    }
                }, 1000)
            }

            function convert(time) {
                var seconds = (time % 60).toString();
                var conversion = (Math.floor(time / 60)) + ':';
                if (seconds.length < 2) {
                    conversion += '0' + seconds;
                } else {
                    conversion += seconds;
                }
                return conversion;
            }
        }
    }
})
