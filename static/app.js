angular.module('myApp', [])
.factory('MediaFiles', function($http){
     
    // create a new object
	var fileSystem = {};

	// get a single user
	fileSystem.getRoot = function(id) {
		return $http.get('/api/media/');
	};

	// get all users
	fileSystem.getOne = function(file) {
		return $http.get('/api/media/' + encodeURIComponent(file));
	};

	// create a user
	fileSystem.create = function(userData) {
		return $http.post('/api/users/', userData);
	};

	// update a user
	fileSystem.update = function(id, userData) {
		return $http.put('/api/users/' + id, userData);
	};

	// delete a user
	fileSystem.delete = function(id) {
		return $http.delete('/api/users/' + id);
	};

	// return our entire userFactory object
	return fileSystem;
 
})
.controller('fileController', function(MediaFiles) {
    // do some stuff here
    var vm = this;
    MediaFiles.getRoot().then(function (data) {
    	console.log(data);
    	vm = angular.extend(vm, data.data);
    	console.log(vm);
    });

    vm.getURL = function (name) {
    	return "playfile?f=" + name;
    };

    vm.getParentDirectoryOfCurrentFiles = function () {
    	if(vm.parentdir) {
    		vm.getDirectory(vm.parentdir);
    	}
    };

    vm.getDirectory = function (name) {
    	MediaFiles.getOne(name).then(function (data) {
    		console.log(data);
    		vm = angular.extend(vm, data.data);
    	});
    };
})
.controller('playController', function (MediaFiles) {
	var vm = this;
	function getParameterByName(name) {
	    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
	    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
	        results = regex.exec(location.search);
	    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
	}
	MediaFiles.getOne(getParameterByName('f')).then(function (data) {
    	vm.file = data.data
    });
})
.filter('filter',function () {
    return function (input, filterStrings) {
    	if (typeof filterStrings)
        return input.filter()
    };
});