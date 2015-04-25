var vgAPI = {};
angular.module('myApp', [
    'ngRoute',
    'app.routes',
    "ngSanitize",
    "com.2fdevs.videogular",
    "com.2fdevs.videogular.plugins.controls",
    "com.2fdevs.videogular.plugins.overlayplay",
    "com.2fdevs.videogular.plugins.poster"
])
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
	fileSystem.getAll = function(userData) {
		return $http.get('/api/media/all');
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
.controller('MainController', function () {
    var vm = this;

    vm.data = {
        greeting: "Hello World!"
    }

})
.controller('FileController', function($route, MediaFiles) {
    // do some stuff here
    var vm = this;
    vm.filters = {
    	'music': false,
    	'video': false,
    	'directory': false
    };
    if($route.current.params.byDir || $route.current.params.dirName) {
        MediaFiles.getOne($route.current.params.dirName || "").then(function (data) {
            console.log(data);
            vm = angular.extend(vm, data.data);
            console.log(vm);
        });
    } else {
        MediaFiles.getAll($route.current.params.dirName || "").then(function (data) {
            console.log(data);
            vm = angular.extend(vm, data.data);
            console.log(vm);
        });
    }

    function isMusicExtension (str) {
    	return /^(3gp|act|aiff|aac|amr|au|awb|dct|dss|dvf|flac|gsm|iklax|ivs|m4a|m4p|mmf|mp3|mpc|msv|ogg|oga|opus|ra|rm|raw|sln|tta|vox|wav|wma|wv)$/.test(str);
    }

    function isVideoExtension (str) {
    	return /^(webm|mkv|flv|vob|ogv|ogg|drc|mng|avi|mov|qt|wmv|yuv|rm|rmvb|asf|mp4|m4p|m4v|mpg|mp2|mpeg|mpe|mpv|m2v|svi|3gp|3g2|mxf|roq|nsv)$/.test(str);
    }

    vm.getIconClass = function (file) {
    	var fa = "fa";
    	if(file.is_dir) {
    		fa += " fa-folder";
    	} else if (file.format_name && isMusicExtension(file.format_name)) {
    		fa += " fa-file-audio-o";
    	} else if (file.format_name && isVideoExtension(file.format_name)) {
    		fa += " fa-file-video-o";
    	} else {
    		fa += " fa-file-o";
    	}
    	return fa;
    };

    vm.mediaFilter = function (actual) {
		var atleast1 = false;
		if(vm.filters["music"]) {
			atleast1 = true;
			if(actual.format_name && isMusicExtension(actual.format_name)) return true;
		}
		if(vm.filters["video"]) {
			atleast1 = true;
			if(actual.format_name && isVideoExtension(actual.format_name)) return true;
		}
		if(vm.filters["directory"]) {
			atleast1 = true;
			if(actual.is_dir) return true;
		}
		return !atleast1;
    }

    vm.getURL = function (name) {
    	return "/app/playfile?fileName=" + name;
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
.controller('PlayController', function ($route, MediaFiles) {
	var vm = this;
    vm.fileName = $route.current.params.fileName;
    MediaFiles.getOne(vm.fileName).then(function (data) {
    	vm.file = data.data;
        console.log(data.data);
    });
})
.controller('LocalPlayController',
    ["$sce", "$route", "$rootScope", "MediaFiles", function ($sce, $route, $rootScope, MediaFiles) {
        var vm = this;
        MediaFiles.getOne($route.current.params.fileName).then(function (data) {
            vm.file = data.data;
            vm.file.file_url = vm.file.file_url.replace(/\\/, "/");
            console.log(data.data);
             vm.config = {
                sources: [
                    {src: $sce.trustAsResourceUrl(vm.file.file_url), type: "video/mp4"}
                ],
                theme: "/static/assets/bower_components/videogular-themes-default/videogular.css"
            };
        });
    }]
)
.directive("vgChromecast",
    ["VG_STATES", "VG_UTILS", "googleCastFactory", function (VG_STATES, VG_UTILS, googleCastFactory) {
        return {
            restrict: "E",
            require: "^videogular",
            transclude: true,
            template: function (elem, attrs) {
                return '<div style="padding: 20px; background-color: #ccc;" class="iconButton" ng-click="toggleChromeCast()">ChromeCast</div>';
            },
            link: function (scope, elem, attr, API) {
                var isSeeking = false;
                var isPlaying = false;
                var isPlayingWhenSeeking = false;
                var touchStartX = 0;
                var LEFT = 37;
                var RIGHT = 39;
                var NUM_PERCENT = 5;

                scope.API = API;
                vgAPI = API;

                googleCastFactory.mediaContents = [];

                function init () {
                    if(!API.isReady || !API.sources) {
                        setTimeout(init, 1000);
                        return;
                    }
                    API.sources.forEach(function (el) {
                        var src = document.location.origin + el.src.valueOf().replace(/\\/g, "/");
                        console.log(src);
                        googleCastFactory.mediaContents.push({sources: [src]});
                    });
                }

                init();

                console.log(googleCastFactory);

                console.log(API);

                scope.toggleChromeCast = function () {
                    googleCastFactory.launchApp();
                }
            }
        }
    }]
)
.factory('googleCastFactory', function(){
     'use strict';

    /**
     * Constants of states for Chromecast device 
     **/
    var DEVICE_STATE = {
      'IDLE' : 0, 
      'ACTIVE' : 1, 
      'WARNING' : 2, 
      'ERROR' : 3,
    };

    /**
     * Constants of states for CastPlayer 
     **/
    var PLAYER_STATE = {
      'IDLE' : 'IDLE', 
      'LOADING' : 'LOADING', 
      'LOADED' : 'LOADED', 
      'PLAYING' : 'PLAYING',
      'PAUSED' : 'PAUSED',
      'STOPPED' : 'STOPPED',
      'SEEKING' : 'SEEKING',
      'ERROR' : 'ERROR'
    };

    /**
     * Cast player object
     * main variables:
     *  - deviceState for Cast mode: 
     *    IDLE: Default state indicating that Cast extension is installed, but showing no current activity
     *    ACTIVE: Shown when Chrome has one or more local activities running on a receiver
     *    WARNING: Shown when the device is actively being used, but when one or more issues have occurred
     *    ERROR: Should not normally occur, but shown when there is a failure 
     *  - Cast player variables for controlling Cast mode media playback 
     *  - Local player variables for controlling local mode media playbacks
     *  - Current media variables for transition between Cast and local modes
     */
    var CastPlayer = function() {
      /* device variables */
      // @type {DEVICE_STATE} A state for device
      this.deviceState = DEVICE_STATE.IDLE;

      /* receivers available */
      // @type {boolean} A boolean to indicate availability of receivers
      this.receivers_available = false;

      /* Cast player variables */
      // @type {Object} a chrome.cast.media.Media object
      this.currentMediaSession = null;
      // @type {Number} volume
      this.currentVolume = 0.5;
      // @type {Boolean} A flag for autoplay after load
      this.autoplay = true;
      // @type {string} a chrome.cast.Session object
      this.session = null;
      // @type {PLAYER_STATE} A state for Cast media player
      this.castPlayerState = PLAYER_STATE.IDLE;

      /* Local player variables */
      // @type {PLAYER_STATE} A state for local media player
      this.localPlayerState = PLAYER_STATE.IDLE;
      // @type {Boolean} Fullscreen mode on/off
      this.fullscreen = false;

      /* Current media variables */
      // @type {Boolean} Audio on and off
      this.audio = true;
      // @type {Number} A number for current media index
      this.currentMediaIndex = 0;
      // @type {Number} A number for current media time
      this.currentMediaTime = 0;
      // @type {Number} A number for current media duration
      this.currentMediaDuration = -1;
      // @type {Timer} A timer for tracking progress of media
      this.timer = null;
      // @type {Boolean} A boolean to stop timer update of progress when triggered by media status event 
      this.progressFlag = true;
      // @type {Number} A number in milliseconds for minimal progress update
      this.timerStep = 1000;

      /* media contents from JSON */
      this.mediaContents = null;

      this.initializeCastPlayer();
    };

    /**
     * Initialize Cast media player 
     * Initializes the API. Note that either successCallback and errorCallback will be
     * invoked once the API has finished initialization. The sessionListener and 
     * receiverListener may be invoked at any time afterwards, and possibly more than once. 
     */
    CastPlayer.prototype.initializeCastPlayer = function() {

      if (!chrome.cast || !chrome.cast.isAvailable) {
        setTimeout(this.initializeCastPlayer.bind(this), 1000);
        return;
      }
      // default set to the default media receiver app ID
      // optional: you may change it to point to your own
      //var applicationID = chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID;
      var applicationID = '4F8B3483';

      // auto join policy can be one of the following three
      var autoJoinPolicy = chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED;
      //var autoJoinPolicy = chrome.cast.AutoJoinPolicy.PAGE_SCOPED;
      //var autoJoinPolicy = chrome.cast.AutoJoinPolicy.TAB_AND_ORIGIN_SCOPED;

      // request session
      var sessionRequest = new chrome.cast.SessionRequest(applicationID);
      var apiConfig = new chrome.cast.ApiConfig(sessionRequest,
        this.sessionListener.bind(this),
        this.receiverListener.bind(this),
        autoJoinPolicy);

      chrome.cast.initialize(apiConfig, this.onInitSuccess.bind(this), this.onError.bind(this));
    };

    /**
     * Callback function for init success 
     */
    CastPlayer.prototype.onInitSuccess = function() {
      console.log("init success");
    };

    /**
     * Generic error callback function 
     */
    CastPlayer.prototype.onError = function() {
      console.log("error");
    };

    /**
     * @param {!Object} e A new session
     * This handles auto-join when a page is reloaded
     * When active session is detected, playback will automatically
     * join existing session and occur in Cast mode and media
     * status gets synced up with current media of the session 
     */
    CastPlayer.prototype.sessionListener = function(e) {
      this.session = e;
      if( this.session ) {
        this.deviceState = DEVICE_STATE.ACTIVE;
        if( this.session.media[0] ) {
          this.onMediaDiscovered('activeSession', this.session.media[0]);
          this.syncCurrentMedia(this.session.media[0].media.contentId);
        }
        else {
          this.loadMedia(this.currentMediaIndex);
        }
        this.session.addUpdateListener(this.sessionUpdateListener.bind(this));
      }
    }

    /**
     * @param {string} currentMediaURL
     */
    CastPlayer.prototype.syncCurrentMedia = function(currentMediaURL) {
      for(var i=0; i < this.mediaContents.length; i++) {
        if( currentMediaURL == this.mediaContents[i]['sources'][0] ) {
          this.currentMediaIndex = i;
        }
      }
    }

    /**
     * @param {string} e Receiver availability
     * This indicates availability of receivers but
     * does not provide a list of device IDs
     */
    CastPlayer.prototype.receiverListener = function(e) {
      if( e === 'available' ) {
        this.receivers_available = true;
        console.log("receiver found");
      }
      else {
        console.log("receiver list empty");
      }
    };

    /**
     * session update listener
     */
    CastPlayer.prototype.sessionUpdateListener = function(isAlive) {
      if (!isAlive) {
        this.session = null;
        this.deviceState = DEVICE_STATE.IDLE;
        this.castPlayerState = PLAYER_STATE.IDLE;
        this.currentMediaSession = null;
        clearInterval(this.timer);

        var online = navigator.onLine;
        if( online == true ) {
          // continue to play media locally
          console.log("current time: " + this.currentMediaTime);
          this.playMediaLocally();
        }
      }
    };


    /**
     * Select a media content
     * @param {Number} mediaIndex A number for media index 
     */
    CastPlayer.prototype.selectMedia = function(mediaIndex) {
      console.log("media selected" + mediaIndex);

      this.currentMediaIndex = mediaIndex;

      // reset currentMediaTime
      this.currentMediaTime = 0;

      if( !this.currentMediaSession ) {
        this.localPlayerState = PLAYER_STATE.IDLE;
        this.playMediaLocally();
      }
      else {
        this.castPlayerState = PLAYER_STATE.IDLE;
        this.playMedia();
      }
    };

    /**
     * Requests that a receiver application session be created or joined. By default, the SessionRequest
     * passed to the API at initialization time is used; this may be overridden by passing a different
     * session request in opt_sessionRequest. 
     */
    CastPlayer.prototype.launchApp = function() {
      console.log("launching app...");
      chrome.cast.requestSession(
        this.sessionListener.bind(this),
        this.onLaunchError.bind(this));
      if( this.timer ) {
        clearInterval(this.timer);
      }
    };

    /**
     * Callback function for request session success 
     * @param {Object} e A chrome.cast.Session object
     */
    CastPlayer.prototype.onRequestSessionSuccess = function(e) {
      console.log("session success: " + e.sessionId);
      this.session = e;
      this.deviceState = DEVICE_STATE.ACTIVE;
      this.loadMedia(this.currentMediaIndex);
      this.session.addUpdateListener(this.sessionUpdateListener.bind(this));
    };

    /**
     * Callback function for launch error
     */
    CastPlayer.prototype.onLaunchError = function() {
      console.log("launch error");
      this.deviceState = DEVICE_STATE.ERROR;
    };

    /**
     * Stops the running receiver application associated with the session.
     */
    CastPlayer.prototype.stopApp = function() {
      this.session.stop(this.onStopAppSuccess.bind(this, 'Session stopped'),
          this.onError.bind(this));    

    };

    /**
     * Callback function for stop app success 
     */
    CastPlayer.prototype.onStopAppSuccess = function(message) {
      console.log(message);
      this.deviceState = DEVICE_STATE.IDLE;
      this.castPlayerState = PLAYER_STATE.IDLE;
      this.currentMediaSession = null;
      clearInterval(this.timer);

      // continue to play media locally
      console.log("current time: " + this.currentMediaTime);
      this.playMediaLocally();
    };

    /**
     * Loads media into a running receiver application
     * @param {Number} mediaIndex An index number to indicate current media content
     */
    CastPlayer.prototype.loadMedia = function(mediaIndex) {
      if (!this.session) {
        console.log("no session");
        return;
      }
      console.log("loading..." + this.mediaContents[mediaIndex]['title']);
      var mediaInfo = new chrome.cast.media.MediaInfo(this.mediaContents[mediaIndex]['sources'][0]);

      mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
      mediaInfo.metadata.metadataType = chrome.cast.media.MetadataType.GENERIC;
      mediaInfo.contentType = 'video/mp4';

      mediaInfo.metadata.title = this.mediaContents[mediaIndex]['title'];
      //mediaInfo.metadata.images = [{'url': MEDIA_SOURCE_ROOT + this.mediaContents[mediaIndex]['thumb']}];

      var request = new chrome.cast.media.LoadRequest(mediaInfo);
      request.autoplay = this.autoplay;
      if( this.localPlayerState == PLAYER_STATE.PLAYING ) {
        request.currentTime = this.localPlayer.currentTime;
        this.localPlayer.pause();
        this.localPlayerState = PLAYER_STATE.STOPPED;
      }
      else {
        request.currentTime = 0;
      } 

      this.castPlayerState = PLAYER_STATE.LOADING;
      this.session.loadMedia(request,
        this.onMediaDiscovered.bind(this, 'loadMedia'),
        this.onLoadMediaError.bind(this));

    };

    /**
     * Callback function for loadMedia success
     * @param {Object} mediaSession A new media object.
     */
    CastPlayer.prototype.onMediaDiscovered = function(how, mediaSession) {
      console.log("new media session ID:" + mediaSession.mediaSessionId + ' (' + how + ')');
      this.currentMediaSession = mediaSession;
      if( how == 'loadMedia' ) {
        if( this.autoplay ) {
          this.castPlayerState = PLAYER_STATE.PLAYING;
        }
        else {
          this.castPlayerState = PLAYER_STATE.LOADED;
        }
      }

      if( how == 'activeSession' ) {
        this.castPlayerState = this.session.media[0].playerState; 
        this.currentMediaTime = this.session.media[0].currentTime; 
      }

      if( this.castPlayerState == PLAYER_STATE.PLAYING ) {
        // start progress timer
        this.startProgressTimer(this.incrementMediaTime);
      }

      this.currentMediaSession.addUpdateListener(this.onMediaStatusUpdate.bind(this));

      this.currentMediaDuration = this.currentMediaSession.media.duration;
      var duration = this.currentMediaDuration;
      var hr = parseInt(duration/3600);
      duration -= hr * 3600;
      var min = parseInt(duration/60);
      var sec = parseInt(duration % 60);
      if ( hr > 0 ) {
        duration = hr + ":" + min + ":" + sec;
      }
      else {
        if( min > 0 ) {
          duration = min + ":" + sec;
        }
        else {
          duration = sec;
        }
      }

      if( this.localPlayerState == PLAYER_STATE.PLAYING ) {
        this.localPlayerState == PLAYER_STATE.STOPPED;
        // start progress timer
        this.startProgressTimer(this.incrementMediaTime);
      }
    };

    /**
     * Callback function when media load returns error 
     */
    CastPlayer.prototype.onLoadMediaError = function(e) {
      console.log("media error", e);
      this.castPlayerState = PLAYER_STATE.IDLE;
    };

    /**
     * Callback function for media status update from receiver
     * @param {!Boolean} e true/false
     */
    CastPlayer.prototype.onMediaStatusUpdate = function(e) {
      if( e == false ) {
        this.currentMediaTime = 0;
        this.castPlayerState = PLAYER_STATE.IDLE;
      }
      console.log("updating media");
    };

    /**
     * Helper function
     * Increment media current position by 1 second 
     */
    CastPlayer.prototype.incrementMediaTime = function() {
      if( this.castPlayerState == PLAYER_STATE.PLAYING || this.localPlayerState == PLAYER_STATE.PLAYING ) {
        if( this.currentMediaTime < this.currentMediaDuration ) {
          this.currentMediaTime += 1;
        }
        else {
          this.currentMediaTime = 0;
          clearInterval(this.timer);
        }
      }
    };

    /**
     * Play media in local player
     */
    CastPlayer.prototype.playMediaLocally = function() {
      vi.style.display = 'none';
      this.localPlayer.style.display = 'block';
      if( this.localPlayerState != PLAYER_STATE.PLAYING && this.localPlayerState != PLAYER_STATE.PAUSED ) { 
        this.localPlayer.src = this.mediaContents[this.currentMediaIndex]['sources'][0];
        this.localPlayer.load();
      }
      else {
        this.localPlayer.play();
        // start progress timer
        this.startProgressTimer(this.incrementMediaTime);
      }
      this.localPlayerState = PLAYER_STATE.PLAYING;
    };

    /**
     * Callback when media is loaded in local player 
     */
    CastPlayer.prototype.onMediaLoadedLocally = function() {
      this.currentMediaDuration = this.localPlayer.duration;
      var duration = this.currentMediaDuration;
          
      var hr = parseInt(duration/3600);
      duration -= hr * 3600;
      var min = parseInt(duration/60);
      var sec = parseInt(duration % 60);
      if ( hr > 0 ) {
        duration = hr + ":" + min + ":" + sec;
      }
      else {
        if( min > 0 ) {
          duration = min + ":" + sec;
        }
        else {
          duration = sec;
        }
      }
      this.localPlayer.currentTime = this.currentMediaTime;

      this.localPlayer.play();
      // start progress timer
      this.startProgressTimer(this.incrementMediaTime);
    };

    /**
     * Play media in Cast mode 
     */
    CastPlayer.prototype.playMedia = function() {
      if( !this.currentMediaSession ) {
        this.playMediaLocally();
        return;
      }

      switch( this.castPlayerState ) 
      {
        case PLAYER_STATE.LOADED:
        case PLAYER_STATE.PAUSED:
          this.currentMediaSession.play(null, 
            this.mediaCommandSuccessCallback.bind(this,"playing started for " + this.currentMediaSession.sessionId),
            this.onError.bind(this));
          this.currentMediaSession.addUpdateListener(this.onMediaStatusUpdate.bind(this));
          this.castPlayerState = PLAYER_STATE.PLAYING;
          // start progress timer
          this.startProgressTimer(this.incrementMediaTime);
          break;
        case PLAYER_STATE.IDLE:
        case PLAYER_STATE.LOADING:
        case PLAYER_STATE.STOPPED:
          this.loadMedia(this.currentMediaIndex);
          this.currentMediaSession.addUpdateListener(this.onMediaStatusUpdate.bind(this));
          this.castPlayerState = PLAYER_STATE.PLAYING;
          break;
        default:
          break;
      }
    };

    /**
     * Pause media playback in Cast mode  
     */
    CastPlayer.prototype.pauseMedia = function() {
      if( !this.currentMediaSession ) {
        this.pauseMediaLocally();
        return;
      }

      if( this.castPlayerState == PLAYER_STATE.PLAYING ) {
        this.castPlayerState = PLAYER_STATE.PAUSED;
        this.currentMediaSession.pause(null,
          this.mediaCommandSuccessCallback.bind(this,"paused " + this.currentMediaSession.sessionId),
          this.onError.bind(this));
        clearInterval(this.timer);
      }
    };

    /**
     * Pause media playback in local player 
     */
    CastPlayer.prototype.pauseMediaLocally = function() {
      this.localPlayerState = PLAYER_STATE.PAUSED;
      clearInterval(this.timer);
    };

    /**
     * Stop media playback in either Cast or local mode  
     */
    CastPlayer.prototype.stopMedia = function() {
      if( !this.currentMediaSession ) {
        return;
      }

      this.currentMediaSession.stop(null,
        this.mediaCommandSuccessCallback.bind(this,"stopped " + this.currentMediaSession.sessionId),
        this.onError.bind(this));
      this.castPlayerState = PLAYER_STATE.STOPPED;
      clearInterval(this.timer);
    };

    /**
     * Stop media playback in local player
     */
    CastPlayer.prototype.stopMediaLocally = function() {
      this.localPlayerState = PLAYER_STATE.STOPPED;
    };

    /**
     * Set media volume in Cast mode
     * @param {Boolean} mute A boolean  
     */
    CastPlayer.prototype.setReceiverVolume = function(mute) {
      var p = document.getElementById("audio_bg_level"); 
      if( event.currentTarget.id == 'audio_bg_track' ) {
        var pos = 100 - parseInt(event.offsetY);
      }
      else {
        var pos = parseInt(p.clientHeight) - parseInt(event.offsetY);
      }
      if( !this.currentMediaSession ) {
          this.localPlayer.volume = pos < 100 ? pos/100 : 1;
          p.style.height = pos + 'px';
          p.style.marginTop = -pos + 'px';
          return;
      }

      if( event.currentTarget.id == 'audio_bg_track' || event.currentTarget.id == 'audio_bg_level' ) {
        // add a drag to avoid loud volume
        if( pos < 100 ) {
          var vScale = this.currentVolume * 100;
          if( pos > vScale ) {
            pos = vScale + (pos - vScale)/2;
          }
          p.style.height = pos + 'px';
          p.style.marginTop = -pos + 'px';
          this.currentVolume = pos/100;
        }
        else {
          this.currentVolume = 1;
        }
      }

      if( !mute ) {
        this.session.setReceiverVolumeLevel(this.currentVolume,
          this.mediaCommandSuccessCallback.bind(this),
          this.onError.bind(this));
      }
      else {
        this.session.setReceiverMuted(true,
          this.mediaCommandSuccessCallback.bind(this),
          this.onError.bind(this));
      }
    };

    /**
     * Mute media function in either Cast or local mode 
     */
    CastPlayer.prototype.muteMedia = function() {
      if( this.audio == true ) {
        this.audio = false;
        if( this.currentMediaSession ) {
          this.setReceiverVolume(true);
        }
      }
      else {
        this.audio = true;
        if( this.currentMediaSession ) {
          this.setReceiverVolume(false);
        }
      } 
    };


    /**
     * media seek function in either Cast or local mode
     * @param {Event} e An event object from seek 
     */
    CastPlayer.prototype.seekMedia = function(event) {
      var pos = parseInt(event.offsetX);

      if( this.castPlayerState != PLAYER_STATE.PLAYING && this.castPlayerState != PLAYER_STATE.PAUSED ) {
        return;
      }

      this.currentMediaTime = curr;
      console.log('Seeking ' + this.currentMediaSession.sessionId + ':' +
        this.currentMediaSession.mediaSessionId + ' to ' + pos + "%");
      var request = new chrome.cast.media.SeekRequest();
      request.currentTime = this.currentMediaTime;
      this.currentMediaSession.seek(request,
        this.onSeekSuccess.bind(this, 'media seek done'),
        this.onError.bind(this));
      this.castPlayerState = PLAYER_STATE.SEEKING;

    };

    /**
     * Callback function for seek success
     * @param {String} info A string that describe seek event
     */
    CastPlayer.prototype.onSeekSuccess = function(info) {
      console.log(info);
      this.castPlayerState = PLAYER_STATE.PLAYING;
    };

    /**
     * Callback function for media command success 
     */
    CastPlayer.prototype.mediaCommandSuccessCallback = function(info, e) {
      console.log(info);
    };

    /**
     * Set progressFlag with a timeout of 1 second to avoid UI update
     * until a media status update from receiver 
     */
    CastPlayer.prototype.setProgressFlag = function() {
      this.progressFlag = true;
    }; 

    /**
     * @param {function} A callback function for the function to start timer 
     */
    CastPlayer.prototype.startProgressTimer = function(callback) {
      if( this.timer ) {
        clearInterval(this.timer);
        this.timer = null;
      }

      // start progress timer
      this.timer = setInterval(callback.bind(this), this.timerStep);
    };

    return new CastPlayer();
});