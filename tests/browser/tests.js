describe("front-end testing", function(){
	beforeEach(module('FullstackGeneratedApp'));

	var $httpBackend;
    var $rootScope;
    beforeEach('Get tools', inject(function (_$httpBackend_, _$rootScope_) {
        $httpBackend = _$httpBackend_;
        $rootScope = _$rootScope_;
    }));

    describe("game state", function(){
    	var Board_Factory, Lobby_Factory, Signup_Factory, User_Factory;
    	beforeEach("get factories", inject(function(SignupFactory, BoardFactory, LobbyFactory, UserFactory){
    		Board_Factory=BoardFactory;
        Lobby_Factory=LobbyFactory;
        Signup_Factory=SignupFactory;
        User_Factory=UserFactory;
    	}))
    	describe("BoardFactory", function(){
    		it ("exists", function(){
    			expect(Board_Factory).to.be.an('object');
    		})
        it ("has methods getStartBoard, submit, shuffle, getCurrentRoom, quitFromRoom", function(){
          expect(Board_Factory.getStartBoard).to.be.a('function');
          expect(Board_Factory.submit).to.be.a("function");
          expect(Board_Factory.shuffle).to.be.a('function');
          expect(Board_Factory.getCurrentRoom).to.be.a('function');
          expect(Board_Factory.quitFromRoom).to.be.a('function');
        })
    	})
      describe("LobbyFactory",function(){
        it ("exists", function(){
          expect(Lobby_Factory).to.be.an('object');
        })
        it ("has methods getAllRooms, joinGame, newGame, and AllPlayers", function(){
          expect(Lobby_Factory.getAllRooms).to.be.a("function");
          expect(Lobby_Factory.joinGame).to.be.a("function");
          expect(Lobby_Factory.newGame).to.be.a("function");
          expect(Lobby_Factory.AllPlayers).to.be.a("function");
        })
      })
      describe ("SignupFactory", function(){
        it ("exists", function(){
          expect(Signup_Factory).to.be.an('object');
        })
        it ("has method createUser", function(){
          expect(Signup_Factory.createUser).to.be.a('function');
        })
      })
      describe ("UserFactory", function(){
        it ("exists", function(){
          expect(User_Factory).to.be.an('object');
        })
        it ("has methods fetchInformation and fetchGames", function(){
          expect(User_Factory.fetchInformation).to.be.a("function");
          expect(User_Factory.fetchGames).to.be.a('function');
        })
      })
    	describe("GameCtrl", function(){
   			var scope, createController, controller;
   			beforeEach("create controller", inject(function($rootScope, $controller){
   				scope=$rootScope.$new();
   				controller=$controller("GameCtrl", {
   					'$scope': scope
   				})
   			}));
   			it("exists", function(){
   				expect(scope).to.be.an("object");
   			})
   			it("has submit, click, update, quit, clear, replay, and determineWinner methods", function(){
   				expect(scope.click).to.be.a('function');
   				expect(scope.submit).to.be.a('function');
          expect(scope.update).to.be.a('function');
          expect(scope.quit).to.be.a('function');
          expect(scope.clear).to.be.a('function');
          expect(scope.replay).to.be.a('function');
          expect(scope.determineWinner).to.be.a('function');
   			})
   			it("click adds letters to the word and wordObj", function(){
   				scope.click(scope.board[0][0],'0-0');
   				scope.click(scope.board[0][1], '0-1');
   				scope.click(scope.board[0][2], '0-2');
   				console.log(scope.exports.wordObj);
   				expect(scope.exports.word).to.be.equal("ABC");
   				expect(scope.exports.wordObj).to.deep.equal({'0-0': 'A', '0-1': 'B', '0-2': 'C'});
   			})
        it("clear clears the word and wordObj", function(){
          scope.click(scope.board[0][1], '0-1');
          scope.click(scope.board[1][1], '1-1');
          scope.click(scope.board[1][0], '1-0');
          expect(scope.exports.word).to.be.equal("BED");
          scope.clear();
          expect(scope.exports.word).to.be.equal("");
          expect(scope.exports.wordObj).to.deep.equal({});
        })
        it("determineWinner correctly sets the message", function(){
          var winnersArray=[51, 52];
          scope.user={id: 51, username: "boss"};
          scope.otherPlayers=[{id:52, username: "Your mom"}, {id: 49, username:"Morgoth"}];
          scope.determineWinner(winnersArray);
          expect(scope.message).to.be.equal("The game was a tie between boss and Your mom.");
          winnersArray=[49];
          scope.determineWinner(winnersArray);
          expect(scope.message).to.be.equal("Morgoth won. Better luck next time.");
          winnersArray=[51];
          scope.determineWinner(winnersArray);
          expect(scope.message).to.be.equal("Congratulations, you won!");
        })
        it("update correctly updates the board and the score", function(){
          scope.user={id: 51, username: 'boss'};
          expect(scope.board[0][0]+scope.board[0][1]+scope.board[0][2]).to.equal("ABC");
          expect(scope.score).to.equal(0);
          var updateObj={wordObj:{'0-0':'B', '0-1':'A', '0-2':'D'}, word:'', playerId:51, stateNumber:null, pointsEarned:55}
          scope.update(updateObj);
          expect(scope.board[0][0]+scope.board[0][1]+scope.board[0][2]).to.equal('BAD');
          expect(scope.score).to.equal(55);
        })
        it ("validSelect allows only legal clicks", function(){
          scope.click(scope.board[0][0], '0-0');
          scope.click(scope.board[3][3], '3-3');
          expect(scope.exports.word).to.be.equal('A');
          scope.click(scope.board[0][1], '0-1');
          expect(scope.exports.word).to.be.equal('AB');
          scope.click(scope.board[0][0], '0-0');
          expect(scope.exports.word).to.be.equal('A');
        })
      })
    // 	beforeEach("get Controllers", inject)
    // })
	})
})