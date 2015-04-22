//setup:
// 1. copy config.json from config.sample.js
// 2. edit config.json to change settings for this application

//load modules
var chromecast = require('./chromecast.js')
var fs = require('fs');
var dot = require('dot');
var express = require('express');
var path = require('path');
var util = require('util');
var http = require('http');
var os = require('os');
var logger = require('morgan');

//attempt to load config file
var config = {};
try {
 config = require('./config');
} catch(err){
	if(err.code == "MODULE_NOT_FOUND"){
		//not found, so set up the default settings
		console.log("Warning: config.js not found, using defaults.");
	} else {
		throw err;
	}
}

//set some default configurations if we didn't find them in config.
if(!config.media_folder){
	config.media_folder = "media";
}
if(!config.listenPort){
	config.listenPort = 3000;
}
console.log("Config settings:")
console.log(util.inspect(config));


//setup server
var app = express();

dot.templateSettings.strip = false;

dot.templateSettings = {
  evaluate:    /\(\{([\s\S]+?)\}\)/g,
  interpolate: /\(\{=([\s\S]+?)\}\)/g,
  encode:      /\(\{!([\s\S]+?)\}\)/g,
  use:         /\(\{#([\s\S]+?)\}\)/g,
  define:      /\(\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\)/g,
  conditional: /\(\{\?(\?)?\s*([\s\S]*?)\s*\}\)/g,
  iterate:     /\(\{~\s*(?:\}\)|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\))/g,
};

//declare simple templating engine using dot
app.engine('html', function(path, options, callback){
	fs.readFile(path, function(err, string){
		if (err) throw err;

		var tempFn = dot.template(string);
		options.app = app; //pass the app into the template
		options.require = require; //pass in require so we can use it in templates when we need it
		res = tempFn(options);
		callback(0, res);
	});
})

app.set('views', path.join(__dirname + '/views'))

// define custom logging format
/*logger.format('detailed', function (token, req, res) {                                    
    return util.inspect(req.headers);
});  */

app.use(logger());

app.use('/static', express.static(__dirname + '/static'));

app.use('/static_media', express.static( path.resolve(__dirname, config.media_folder) ));

app.get('/', function(req, res){
	res.render('index.html');
});

app.get('/queue', function(req, res){
	pathResolves = fs.existsSync(path.resolve(__dirname, media_folder));
	if (! pathResolves){
 		 res.render('error.html', {statusCode: '404', message: 'Invalid media directory. Set "media_folder" var in server.js to a valid local path.'});
	}
 	else{
		chromecast.get_dir_data(media_folder, '/', false, function(files){
			res.render('index_queue.html', {files: files, dir: media_folder})	
		});
	}
});

app.get('/design', function (req, res) {
	res.render('design.html');
});

app.get('/playfile', function(req, res){
	file_url = path.join('/static_media', req.query.f)
	transcode_url = path.join('/transcode?f=', req.query.f)

	chromecast.get_file_data(path.join(config.media_folder, req.query.f), function(compat, data){
        	if (data.ffprobe_data == undefined) data.ffprobe_data = {streams: []};
		res.render('playfile.html', {
			query: req.query, 
			file_url: file_url,
			transcode_url: transcode_url,
			file_dir: path.dirname(req.query.f),
			file_name: path.basename(file_url),
			compatible: compat,
			compatibility_data: data
		});
	});
});

app.get('/transcode', function(req, res) {
	// borrowed from the  ffmpeg-fluent examples
	pathToMovie = path.join(config.media_folder, req.query.f)

	options = { }
	if(req.query.audiotrack){
		options.audiotrack = req.query.audiotrack
	}
	if(req.query.videotrack){
		options.videotrack = req.query.videotrack
	}
	if(req.query.subtitles){
		options.subtitle_path = path.join(path.dirname(pathToMovie), req.query.subtitles)
	}
	if(req.query.subtitletrack){
		options.subtitletrack = req.query.subtitletrack
	}

	chromecast.transcode_stream(pathToMovie, res, options, '', function(err, ffmpeg_error_code, ffmpeg_output){
		if(err){
			console.log('transcode error:');
			console.log(ffmpeg_output);
		} else {
			console.log('transcoding finished ffmpeg_output: ');
			console.log(ffmpeg_output);
		}
	});
});

var apiRouter = express.Router();

apiRouter.get('/media', function (req, res) {
	pathResolves = fs.existsSync(path.resolve(__dirname, config.media_folder));
	if (! pathResolves){
 		 res.json({statusCode: '404', message: 'Invalid media directory. Set "config.media_folder" var in server.js to a valid local path.'});
	}
 	else{
		chromecast.get_dir_data(config.media_folder, '/', false, function(files){
			res.json({files: files, dir: config.media_folder});	
		});
	}
});

apiRouter.get('/media/:file_name', function (req, res) {
	if(req.params.file_name.indexOf(".") > 0) {
		file_url = path.join('/static_media', req.params.file_name)
		transcode_url = path.join('/transcode?f=', req.params.file_name)

		chromecast.get_file_data(path.join(config.media_folder, req.params.file_name), function(compat, data){
	        	if (data.ffprobe_data == undefined) data.ffprobe_data = {streams: []};
			res.json({
				query: req.query, 
				file_url: file_url,
				transcode_url: transcode_url,
				file_dir: path.dirname(req.params.file_name),
				file_name: path.basename(file_url),
				compatible: compat,
				compatibility_data: data
			});
		});
	} else {
		dir = path.join('/', req.params.file_name)
		//res.send(dir)
		parentdir = path.join(dir, '../');
		chromecast.get_dir_data(config.media_folder, dir, false, function(files){
			res.json({files: files, dir: dir, parentdir: parentdir})	
		})
	}
});

app.use('/api', apiRouter);

chromecast.check_dependencies(function(err){
	if(err){
		console.log("Error running ffmpeg:");
		console.log(err.message);
	} else {
		var server = http.createServer(app)
		server.on("listening", function(){
			console.log("Server listening, visit http://<local_network_ip>:"+config.listenPort)
			console.log("(Ensure that IP you use is accessible to the chromecast)")
		})
		server.listen(config.listenPort);
		//app.listen(config.listenPort);
	}
})
