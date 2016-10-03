app.config(function($stateProvider) {
    $stateProvider.state('Game', {
        url: '/game/:roomname',
        templateUrl: 'js/new/page.html',
        controller: "GameCtrl"
    })
})

app.controller('GameCtrl', function($scope, BoardFactory, LobbyFactory, $stateParams, Socket) {

  // Socket.disconnect();
  // Socket.connect();


    $scope.playObj = {
        wordObj: {},
        word: "",
        playerId: 3,
        stateNumber: 1
    }
    $scope.board = [
        ['a', 'b', 'c'],
        ['e', 'f', 'g'],
        ['h', 'i', 'j']
    ];

    $scope.messages = null;

    $scope.word = "";
    $scope.size = 3;
    $scope.score = 0;
    $scope.playerName = 'Andy';
    $scope.player = $scope.playObj.playerId;
    $scope.click = function(space, id) {
          $scope.playObj.word += 'A';
          $scope.playObj.wordObj[id] = space;
          console.log('scope playObj', $scope.playObj);
    }

    $scope.submit = function() {
        return BoardFactory.submit()
            .then(function(x) {
                $scope.playObj.wordObj = {};
                $scope.playObj.word = "";
            })
    }

    $scope.updateBoard = function(object) {
        console.log('update board', $scope.board);
        for (var key in object) {
            $scope.board[key[0]][key[2]] = object[key];
        }
    }

     $scope.roomName = $stateParams.roomname;


    Socket.on('connect', function(){

       Socket.emit('joinRoom', $scope.roomName);
       console.log('emitting "join room" event to server');

       Socket.on('roomData', function(data){
        console.log('listening for roomData event from server')
          if(data.count.length < 2){
            $scope.messages = "Waiting for another player";
            console.log('scope message: ', $scope.messages)
          } else {
            $scope.messages = null;
          }
       })

       // Socket.emit('lettersClicked', $scope.click);


    })

})
