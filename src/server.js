/* jshint node:true */
'use strict';

process.on('uncaughtException', function(err) {
	console.log(err.stack);
});


// important - dot settings should run before any require() that might use dot
// or else the it will get mess up (like the email.js code)
var dot = require('dot');
dot.templateSettings.strip = false;
dot.templateSettings.cache = true;
// replace dot regexp to use <? ?> to avoid collision with angular {{ }}
for (var i in dot.templateSettings) {
	var reg = dot.templateSettings[i];
	if (!(reg instanceof RegExp)) {
		continue;
	}
	var pattern = reg.source;
	pattern = pattern.replace(/\\\{\\\{/g, '\\<\\?');
	pattern = pattern.replace(/\\\}\\\}/g, '\\?\\>');
	var flags = '';
	if (reg.global) {
		flags += 'g';
	}
	if (reg.ignoreCase) {
		flags += 'i';
	}
	if (reg.multiline) {
		flags += 'm';
	}
	dot.templateSettings[i] = new RegExp(pattern, flags);
}

var path = require('path');
var URL = require('url');
var http = require('http');
var dot_emc = require('dot-emc');
var express = require('express');
var fs = require('fs');
// var mongoose = require('mongoose');
// var passport = require('passport');
// var passport_http = require('passport-http');

var debug_mode = (process.env.DEBUG_MODE === 'true');

// connect to the database
// mongoose.connect(process.env.MONGOHQ_URL);
// mongoose.set('debug', debug_mode);


// create express app
var app = express();
var web_port = process.env.PORT || 6000;
app.set('port', web_port);

// setup view template engine with doT
var dot_emc_app = dot_emc.init({
	app: app
});
app.set('views', path.join(__dirname, 'views'));
app.engine('dot', dot_emc_app.__express);
app.engine('html', dot_emc_app.__express);

/*
passport.use(new passport_http.BasicStrategy(function(username, password, done) {
	if (username.valueOf() === process.env.ADMIN_USERNAME &&
		password.valueOf() === process.env.ADMIN_PASSWORD) {
		var user = {
			name: process.env.ADMIN_USERNAME,
			moderator: true
		};
		return done(null, user);
	}
	return done(null, false);
}));
passport.serializeUser(function(user, done) {
	return done(null, user);
});
passport.deserializeUser(function(user_data, done) {
	return done(null, user_data);
});
*/

////////////////
// MIDDLEWARE //
////////////////

// configure app middleware handlers in the order to use them

app.use(express.favicon('/public/images/ampbw.png'));
app.use(express.logger());
app.use(function(req, res, next) {
	// HTTPS redirect:
	var fwd_proto = req.get('X-Forwarded-Proto');
	// var fwd_port = req.get('X-Forwarded-Port');
	// var fwd_from = req.get('X-Forwarded-For');
	// var fwd_start = req.get('X-Request-Start');
	if (fwd_proto === 'https') {
		var host = req.get('Host');
		return res.redirect('http://' + host + req.url);
	}
	return next();
});
app.use(express.cookieParser(process.env.COOKIE_SECRET));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieSession({
	// no need for secret since its signed by cookieParser
	key: 'attached_session',
	cookie: {
		// TODO: setting max-age for all sessions although we prefer only for /auth.html
		// but express/connect seems broken to accept individual session maxAge,
		// although documented to work. people also report it fails.
		maxAge: 356 * 24 * 60 * 60 * 1000 // 1 year
	}
}));
// app.use(passport.initialize());
// app.use(passport.session());
app.use(express.compress());

// using router before static files is optimized
// since we have less routes then files, and the routes are in memory.
app.use(app.router);

function cache_control(seconds) {
	var millis = 1000 * seconds;
	return function(req, res, next) {
		res.setHeader("Cache-Control", "public, max-age=" + seconds);
		res.setHeader("Expires", new Date(Date.now() + millis).toUTCString());
		return next();
	};
}

// setup static files
if (!debug_mode) {
	// setup caching
	app.use(cache_control(10 * 60)); // 10 minutes
	app.use('/public/images/', cache_control(24 * 60 * 60)); // 24 hours
}


app.use('/public/', express.static(path.join(__dirname, 'public')));
app.use('/vendor/', express.static(path.join(__dirname, '..', 'vendor')));
app.use('/vendor-b/', express.static(path.join(__dirname, '..', 'bower_components')));
app.use('/vendor-n/', express.static(path.join(__dirname, '..', 'node_modules')));


// error handlers should be last
// roughly based on express.errorHandler from connect's errorHandler.js
app.use(error_404);
app.use(function(err, req, res, next) {
	console.error('ERROR:', err);
	var e = {};
	if (debug_mode) {
		// show internal info only on development
		e = err;
	}
	e.data = e.data || e.message;
	e.status = err.status || res.statusCode;
	if (e.status < 400) {
		e.status = 500;
	}
	res.status(e.status);

	if (req.xhr) {
		return res.json(e);
	} else if (req.accepts('html')) {
		return res.render('error.html', {
			data: e.data,
			status: e.status,
			stack: e.stack
		});
	} else if (req.accepts('json')) {
		return res.json(e);
	} else {
		return res.type('txt').send(e.data || e.toString());
	}
});

function error_404(req, res, next) {
	next({
		status: 404, // not found
		data: 'We dug the earth, but couldn\'t find ' + req.originalUrl
	});
}

function error_403(req, res, next) {
	if (req.accepts('html')) {
		return res.redirect(URL.format({
			pathname: '/login/',
			query: {
				state: req.originalUrl
			}
		}));
	}
	next({
		status: 403, // forbidden
		data: 'Forgot to login?'
	});
}

function error_501(req, res, next) {
	next({
		status: 501, // not implemented
		data: 'Working on it... ' + req.originalUrl
	});
}



////////////
// ROUTES //
////////////

/*
app.get('/login', passport.authenticate('basic'), function(req, res) {
	return res.redirect('/');
});

app.get('/logout', function(req, res) {
	req.logout();
	return res.redirect('/');
});
*/

app.get('/', function(req, res) {
	return res.render('index.html', {
		title: req.query.t
	});
});



// start http server
var server = http.createServer(app);
server.listen(web_port, function() {
	console.log('Web server on port ' + web_port);
});
