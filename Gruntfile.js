var http = require('http');
var fs = require('fs');

module.exports = function(grunt) {

	// Load the plugins
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-bower-task');
	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-nodemon');
	// grunt.loadNpmTasks('grunt-browserify-bower');
	//grunt.loadNpmTasks('grunt-contrib-concat');
	//grunt.loadNpmTasks('grunt-contrib-uglify');
	//grunt.loadNpmTasks('grunt-contrib-nodeunit');

	// // Define custom tasks
	// grunt.task.registerMultiTask('bower', 'bower', function() {
	// 	// Force task into async mode and grab a handle to the "done" function.
	// 	var done = this.async();
	// 	grunt.util.spawn({
	// 		cmd: './node_modules/.bin/bower',
	// 		args: [this.target]
	// 	}, done);
	// });

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		bower: {
			install: {
				options: {
					copy: false
				}
			}
		},
		jshint: {
			all: [
				'Gruntfile.js',
				'lib/**/*.js'
			]
		},
		/*
		browserifyBower: {
			options: {
				file: 'public/js/bundle-bower.js',
				shim: {
					alertify: {
						exports: 'alertify'
					},
					jquery: {
						exports: '$'
					}
				}
			},
			// your_target: {
			// Target-specific file lists and/or options go here.
			// },
		},
		*/
		browserify: {
			all: {
				src: 'lib/client/main.js',
				dest: 'public/js/bundle.js',
				options: {
					debug: true,
					alias: [
						'./lib/shim/jquery.js:jquery',
						// './lib/shim/angular.js:angular'
					],
					external: [
						"jquery",
						// './lib/shim/jquery.js',
						// './lib/shim/angular.js'
					]
				},
				// options: {
				// transform: [
				// 'debowerify',
				// 'decomponentify', 
				// 'deamdify',
				// 'deglobalify'
				// ],
				// },
			},
			// dist: {
			// 	files: {
			// 		'public/js/bundle.js': ['lib/client/**/*.js'],
			// 	},
			// 	options: {
			// 		watch: true
			// 	}
			// }
		},
		watch: {
			scripts: {
				files: ['lib', 'public'],
				tasks: ['install'],
				options: {
					interrupt: true,
				},
			},
		},
		nodemon: {
			dev: {
				script: 'lib/server.js',
				options: {
					// cwd: __dirname,
					// args: ['dev'],
					// nodeArgs: ['--debug'],
					// env: {
					// PORT: '8181'
					// },
					watch: ['lib'],
					ext: 'js,coffee,html',
					ignore: ['node_modules/**', 'bower_components/**'],
					delay: 1000,
					// legacyWatch: true,
					callback: function(nodemon) {
						nodemon.on('log', function(event) {
							console.log(event.colour);
						});
					},
				}
			}
		},
	});

	// Project Tasks

	grunt.registerTask('install', [
		'jshint',
		'bower',
		'browserify',
		// 'concat',
		// 'uglify'
	]);

	grunt.registerTask('start', ['nodemon']);

	grunt.registerTask('default', [
		'install',
		'start',
	]);


};
