//setup:
// 1. copy config.json from config.sample.js
// 2. edit config.json to change settings for this application

//load modules
var chromecast = require('./chromecast.js')
var fs = require('fs');
//var dot = require('dot');
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

var staticDir = path.join(__dirname + '/static');

var viewsDir = path.join(staticDir + '/app/views')

//dot.templateSettings.strip = false;

//app.set('views', path.join(__dirname + '/views'))

// define custom logging format
/*logger.format('detailed', function (token, req, res) {                                    
    return util.inspect(req.headers);
});  */

app.use(logger());

app.use('/static', express.static(staticDir));

app.use('/static_media', express.static( path.resolve(__dirname, config.media_folder) ));

var apiRouter = express.Router();

app.get('/', function(req, res){
	res.redirect('/app');
});

var appRouter = express.Router();

appRouter.get('*', function (req, res) {
	res.sendFile(path.join(viewsDir + '/index.html'));
});


app.use('/app', appRouter);

/*
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
	res.sendFile(path.join(viewsDir + 'design.html'));
});

app.get('/playfile', function(req, res){
	file_url = path.join('/static_media', req.query.f)
	transcode_url = path.join('/transcode?f=', req.query.f)

	chromecast.get_file_data(path.join(config.media_folder, req.query.f), function(compat, data){
        	if (data.ffprobe_data == undefined) data.ffprobe_data = {streams: []};
		res.sendFile(path.join(viewsDir + 'playfile.html'));
	});
});
*/

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

apiRouter.get('/media/all', function (req, res) {
	pathResolves = fs.existsSync(path.resolve(__dirname, config.media_folder));
	if (! pathResolves){
 		 res.json({statusCode: '404', message: 'Invalid media directory. Set "config.media_folder" var in server.js to a valid local path.'});
	}
 	else{
		chromecast.walkMedia(config.media_folder, '/', function(err, files){
			if (err) throw err;
			files = files.filter(function (el) {
				return !(/Thumbs.db$/.test(el.dir));
			});
			res.json({files: files, dir: config.media_folder});	
		});
	}
});

apiRouter.get('/media/:file_name', function (req, res) {
	var stats = fs.statSync(path.join(config.media_folder, req.params.file_name));
	if(stats && stats.isFile()) {
		file_url = path.join('/static_media', req.params.file_name)
		transcode_url = path.join('/transcode?f=', req.params.file_name)

		chromecast.get_file_data(path.join(config.media_folder, req.params.file_name), function(compat, data){
	        	if (data.ffprobe_data == undefined) data.ffprobe_data = {streams: []};
			var file = {
				query: req.query, 
				file_url: file_url,
				transcode_url: transcode_url,
				file_dir: path.dirname(req.params.file_name),
				file_name: path.basename(file_url),
				compatible: compat,
				compatibility_data: data
			};
			file.format_name = file.file_name.split(".").splice(-1)[0];
			file.file_name = file.file_name.replace(new RegExp("\\." + file.format_name+ "$"), "");
			res.json(file);
		});
	} else if (stats && stats.isDirectory()) {
		dir = path.join('/', req.params.file_name);
		//res.send(dir)
		parentdir = path.join(dir, '../');
		chromecast.get_dir_data(config.media_folder, dir, false, function(files){
			res.json({files: files, dir: dir, parentdir: parentdir})	
		});
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