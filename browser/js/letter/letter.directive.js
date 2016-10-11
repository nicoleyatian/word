app.directive('letter', () => {
    return {
        restrict: 'E',
        scope: {
            space: '=',
            x: '=',
            y: '=',
            draggingAllowed: '=',
            exports: '='
        },
        link: function(scope, el, attr) {
          console.log('scope.draggingAllowed: ' + scope.draggingAllowed);

            scope.mouseIsDown = false;
            scope.touchIsActivated = false;


            scope.mouseDown = function() {
                console.log('mouse is down')
                scope.mouseIsDown = true;
            };

            scope.mouseUp = function() {
                console.log('mouse is up');
                scope.mouseIsDown = false;
                if (scope.draggingAllowed && scope.exports.word.length > 1) scope.submit(scope.exports);
            };

            scope.touchActivated = function() {
                console.log('touch is activated: ' + arguments);
                scope.touchIsActivated = true;
            }

            scope.touchStopped = function(e) {
                console.log('touch is stopped: ' + e);
                scope.touchIsActivated = false;
                if (scope.draggingAllowed && scope.exports.word.length > 1) scope.submit(scope.exports);
            }


            scope.drag = function(space, id) {
                console.log('mouse enter: ' + id);
                if (scope.mouseIsDown && scope.draggingAllowed) {
                    scope.click(space, id);
                }
            };

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
                return (rowOffset <= 1 && colOffset <= 1);
            }


            scope.click = function(space, id) {
                if (scope.freeze) {
                    return;
                }
                console.log('clicked ', space, id);
                var ltrsSelected = Object.keys(scope.exports.wordObj);
                var previousLtr = ltrsSelected[ltrsSelected.length - 2];
                var lastLtr = ltrsSelected[ltrsSelected.length - 1];
                if (!ltrsSelected.length || validSelect(id, ltrsSelected)) {
                    scope.exports.word += space;
                    scope.exports.wordObj[id] = space;
                    console.log(scope.exports);
                } else if (id === previousLtr) {
                    scope.exports.word = scope.exports.word.substring(0, scope.exports.word.length - 1);
                    delete scope.exports.wordObj[lastLtr];
                } else if (ltrsSelected.length === 1 && id === lastLtr) {
                    scope.exports.word = "";
                    delete scope.exports.wordObj[lastLtr];
                }
            };

            function div_overlap(jqo, left, top) {
                console.log('div overlapped: ' + jqo);
                var d = jqo.offset();
                return top >= d.top && left >= d.left && left <= (d.left+jqo[0].offsetWidth) && top <= (d.top+jqo[0].offsetHeight);
            }

            el.bind("touchmove", function(evt) {
                console.log('binding mouseenter and touchmove', evt);
                el.each(function() {
                    console.log('for each element');
                    if (div_overlap(this, evt.pageX, evt.pageY)) {
                        console.log('entering div_overlap');
                        if (!this.hasClass('selected')) {
                            this.addClass('selected');
                        }
                    }
                });
            });


            // scope.mobileDrag = function(space, id) {
            //     console.log('touch is dragged: ' + space + " : " + id);
            //     if($scope.touchIsActivated && $scope.draggingAllowed){
            //         $scope.click(space, id);
            //     }
            // };



        },
        templateUrl: '/js/letter/letter.template.html'
    }
});
