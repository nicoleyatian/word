describe("front-end testing", function(){
	beforeEach(module('FullstackGeneratedApp'));

	var $httpBackend;
    var $rootScope;
    beforeEach('Get tools', inject(function (_$httpBackend_, _$rootScope_) {
        $httpBackend = _$httpBackend_;
        $rootScope = _$rootScope_;
    }));

    describe("game state", function(){
    	var Board_Factory;
    	beforeEach("get factories", inject(function(BoardFactory){
    		Board_Factory=BoardFactory;
    	}))
    	describe("BoardFactory", function(){
    		it ("exists", function(){
    			expect(Board_Factory).to.be.an('object');
    		})
    	})
    	describe("GameCtrl", function(){
   			var scope, createController, controller;
   			beforeEach("create controller", inject(function($rootScope, $controller){
   				scope=$rootScope.$new();
   				// createController=function(){
   				// 	return $controller("GameCtrl",{
   				// 		'$scope': scope
   				// 	})
   				// }
   				controller=$controller("GameCtrl", {
   					'$scope': scope
   				})
   			}));
   			it("exists", function(){
   				expect(scope).to.be.an("object");
   			})
   			it("has submit and click methods", function(){
   				expect(scope.click).to.be.a('function');
   				expect(scope.submit).to.be.a('function');
   			})
   			//it("")
    	})
    // 	beforeEach("get Controllers", inject)
    // })
	})
})