'use strict';
var router = require('express').Router(); // eslint-disable-line new-cap
module.exports = router;

router.use('/members', require('./members'));

//I would expect to have what you have in /api/index here (mounting games and user). I would expect for each of those to have their own folder with a file (index.js) <-- this allows for your code base to expand more easily. If you don't expect expansion, then keeping the /api folder you have makes sense, but mount those two files here.
	//'/game' => require('/api/games.js')
	//'/user' => require('/api/user.js')

//Then the routes folder has an index.js that is meaningful and tells you what happens in this folder and how we organize our routes <-- does that make sense?

// Make sure this is after all of
// the registered routes!
router.use(function (req, res, next) { //because we have this line, we are going to want to make sure that the route mounting to here (routes/index) happens after everything else, except the error handling middleware in app/index
    var err = new Error('Not found.');
    err.status = 404;
    next(err);
});
