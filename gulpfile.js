var gulp = require('gulp');
var gulp_debug = require('gulp-debug');
var gulp_size = require('gulp-size');
var gulp_concat = require('gulp-concat');
var gulp_cached = require('gulp-cached');
var gulp_newer = require('gulp-newer');
var gulp_filter = require('gulp-filter');
var gulp_less = require('gulp-less');
var gulp_uglify = require('gulp-uglify');
var gulp_minify_css = require('gulp-minify-css');
var gulp_rename = require('gulp-rename');
var gulp_bower = require('gulp-bower');
var gulp_ng_template = require('gulp-angular-templatecache');
var gulp_nodemon = require('gulp-nodemon');
var gulp_jshint = require('gulp-jshint');
var jshint_stylish = require('jshint-stylish');
var vinyl_buffer = require('vinyl-buffer');
var vinyl_source_stream = require('vinyl-source-stream');
var browserify = require('browserify');
var event_stream = require('event-stream');
var path = require('path');

var paths = {
	css: './src/css/**/*',
	views_ng: './src/views_ng/**/*',
	scripts: ['./src/server/**/*', './src/client/**/*', './gulpfile.js'],
	server_main: './src/server/server.js',
	client_main: './src/client/main.js',
	client_externals: [
		'./bower_components/alertify.js/lib/alertify.min.js',
	]
};

function gulp_size_log(title) {
	return gulp_size({
		title: title
	});
}

gulp.task('bower', function() {
	return gulp_bower();
});

gulp.task('css', function() {
	var DEST = 'build/public/css';
	var NAME = 'styles.css';
	var NAME_MIN = 'styles.min.css';
	return gulp.src(paths.css)
		.pipe(gulp_newer(path.join(DEST, NAME)))
		.pipe(gulp_less())
		.pipe(gulp_rename(NAME))
		.pipe(gulp_size_log(NAME))
		.pipe(gulp.dest(DEST))
		.pipe(gulp_minify_css())
		.pipe(gulp_rename(NAME_MIN))
		.pipe(gulp_size_log(NAME_MIN))
		.pipe(gulp.dest(DEST));
});

gulp.task('jshint', function() {
	return gulp.src(paths.scripts)
		.pipe(gulp_filter('*.js'))
		.pipe(gulp_cached('jshint'))
		.pipe(gulp_jshint())
		.pipe(gulp_jshint.reporter(jshint_stylish))
		.pipe(gulp_jshint.reporter('fail'));
});

gulp.task('ng', function() {
	var DEST = 'build/';
	var NAME = 'templates.js';
	return gulp.src(paths.views_ng)
		.pipe(gulp_newer(path.join(DEST, NAME)))
		.pipe(gulp_ng_template())
		.pipe(gulp_size_log(NAME))
		.pipe(gulp.dest(DEST));
});

gulp.task('js', ['bower', 'jshint', 'ng'], function() {
	var DEST = 'build/public/js';
	var NAME = 'bundle.js';
	var NAME_MIN = 'bundle.min.js';
	var bundler = browserify(paths.client_main);
	var bundle_options = {
		insertGlobals: true,
		list: true,
		debug: true
	};
	var client_bundle_stream = bundler.bundle(bundle_options)
		.pipe(vinyl_source_stream(NAME))
		.pipe(vinyl_buffer());
	var client_merged_stream = event_stream.merge(
		client_bundle_stream,
		gulp.src(paths.client_externals)
	);
	return client_merged_stream
		.pipe(gulp_concat(NAME))
		.pipe(gulp_size_log(NAME))
		.pipe(gulp.dest(DEST))
		.pipe(gulp_cached(NAME))
		.pipe(gulp_uglify())
		.pipe(gulp_rename(NAME_MIN))
		.pipe(gulp_size_log(NAME_MIN))
		.pipe(gulp.dest(DEST));
});



gulp.task('install', ['css', 'js']);


var nodemon_instance;

gulp.task('serve', ['install'], function() {
	if (!nodemon_instance) {
		nodemon_instance = gulp_nodemon({
			script: paths.server_main,
			watch: 'src/__manual_watch__/',
			ext: '__manual_watch__',
			verbose: true,
		}).on('restart', function() {
			console.log('~~~ restart server ~~~');
		});
	} else {
		nodemon_instance.emit('restart');
	}
});

gulp.task('start_dev', ['serve'], function() {
	return gulp.watch('src/**/*', ['serve']);
});

gulp.task('start_prod', function() {
	console.log('~~~ START PROD ~~~');
	require(paths.server_main);
});

if (process.env.DEV_MODE === 'dev') {
	gulp.task('start', ['start_dev']);
} else {
	gulp.task('start', ['start_prod']);
}

gulp.task('default', ['start']);
