angular.module('app.routes', ['ngRoute'])

.config(function($routeProvider, $locationProvider) {

	$routeProvider

		// route for the home page
		.when('/app', {
			templateUrl : 'static/app/views/pages/main.html',
			controller  : 'FileController',
			controllerAs: 'files'
		})

		.when('/app/directory', {
			templateUrl : 'static/app/views/pages/directory.html',
			controller  : 'FileController',
			controllerAs: 'files'
		})
		
		// login page
		.when('/app/settings', {
			templateUrl : 'static/app/views/pages/settings.html',
   			controller  : 'mainController',
			controllerAs: 'login'
		})

		// page to edit a user
		.when('/app/playfile', {
			templateUrl : 'static/app/views/pages/playfile.html',
			controller  : 'PlayController',
			controllerAs: 'play'
		})

		.when('/app/playfile/local', {
			templateUrl : 'static/app/views/pages/localplay.html',
			controller  : 'LocalPlayController',
			controllerAs: 'play'
		});

	$locationProvider.html5Mode(true);

});