app.factory('UserFactory', function($http){
  return {
    getUserId: function(userId){
      return $http.get('/api/users/' + userId)
      .then(function(res){
        return res.data;
      });
    }
  }
})
