app.controller('HomeCtrl', function($scope, $state, $location){
  $scope.enterLobby = function(){
    $state.go('lobby', {reload: true});
  }
});

