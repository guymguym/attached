var gulp = require('gulp');
var filter = require('gulp-filter');
var less = require('gulp-less');
var uglify = require('gulp-uglify');
var minify_css = require('gulp-minify-css');
var rename = require('gulp-rename');
var jshint = require('gulp-jshint');
var jshint_stylish = require('jshint-stylish');
var bower = require('gulp-bower');
var browserify = require('gulp-browserify');
var ng_template_cache = require('gulp-angular-templatecache');
var nodemon = require('gulp-nodemon');
var es = require('event-stream');
var gconcat = require('gulp-concat');

var paths = {
	css: './src/css/**/*',
	views_ng: './src/views_ng/**/*',
	scripts: ['./src/server/**/*', './src/client/**/*'],
	server_main: './src/server/server.js',
	client_main: './src/client/main.js',
	client_externals: [
		'./bower_components/alertify.js/lib/alertify.min.js',
	]
};

gulp.task('bower', function() {
	return bower();
});

gulp.task('css', function() {
	return gulp.src(paths.css)
		.pipe(less())
		.pipe(rename('styles.css'))
		.pipe(gulp.dest('build/public/css'))
		.pipe(minify_css())
		.pipe(rename('styles.min.css'))
		.pipe(gulp.dest('build/public/css'));
});

gulp.task('jshint', function() {
	return gulp.src(paths.scripts)
		.pipe(jshint())
		.pipe(jshint.reporter(jshint_stylish))
		.pipe(jshint.reporter('fail'));
});

gulp.task('ng', function() {
	return gulp.src(paths.views_ng)
		.pipe(ng_template_cache())
		.pipe(gulp.dest('build/'));
});

gulp.task('js', ['bower', 'jshint'], function() {
	// single entry point to browserify
	return es.merge(
		gulp.src(paths.client_main)
		.pipe(browserify({
			insertGlobals: true,
			debug: true
		})),
		gulp.src(paths.client_externals)
	).pipe(gconcat('bundle.js'))
		.pipe(gulp.dest('build/public/js'))
		.pipe(uglify())
		.pipe(rename('bundle.min.js'))
		.pipe(gulp.dest('build/public/js'));
});



gulp.task('install', ['css', 'js']);


var nodemon_instance;

gulp.task('serve', ['install'], function() {
	if (!nodemon_instance) {
		nodemon_instance = nodemon({
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
