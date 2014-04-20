/* jshint browser:true, jquery:true, devel:true */
/* global angular:false */
/* global _:false */
/* jshint -W099 */
(function() {
	'use strict';

	// create our module
	var hash_app = angular.module('hash_app', [
		'ngRoute',
		// 'ngTouch',
		// 'ngSanitize',
		// 'ngAnimate',
	]);

	hash_app.controller('MainCtrl', ['$scope', '$http', '$window', '$location', '$q', '$timeout', '$interval',
		function($scope, $http, $window, $location, $q, $timeout, $interval) {

			$scope.items = [{
				k: 't',
				t: 'HAHAHAH',
				s: {
					top: 200,
					left: 400,
				}
			}, {
				k: 't',
				t: 'YEAHHH',
				s: {
					top: 500,
					left: 400,
				}
			}];

			$scope.edit_item_text = function(item) {
				alertify.prompt('Write something inspiring:', function(e, str) {
					if (e) {
						item.t = str;
						$scope.$apply();
					}
				}, item.t);
			};

			$scope.delete_item = function(item) {
				alertify.confirm('Are you sure you want to delete?', function(e) {
					if (e) {
						var index = _.indexOf($scope.items, item);
						if (index >= 0) {
							$scope.items.splice(index, 1);
							$scope.$apply();
						}
					}
				});
			};


			//////////
			//////////
			// TODO //
			//////////
			//////////


			var fields = [{
				name: 'video_id',
				short_name: 'v',
				default_value: null,
				// parse_form: parse_video_url_to_id,
				// format_form: format_video_url_from_id,
			}, {
				name: 'start_time',
				short_name: 't',
				default_value: 0,
				parse_form: parse_time,
				format_form: format_time,
			}, {
				name: 'end_time',
				short_name: 't',
				default_value: 0, // TODO make it start+10
				parse_form: parse_time,
				format_form: format_time,
			}, {
				name: 'headline',
				short_name: 'h',
				default_value: '',
			}, {
				name: 'bottomline',
				short_name: 'b',
				default_value: '',
			}, {
				name: 'fgcolor',
				short_name: 'fg',
				default_value: null,
			}, {
				name: 'bgcolor',
				short_name: 'bg',
				default_value: null,
			}];

			var player;
			var query = $location.search();
			console.log('QUERY', query);

			$scope.video_id = query.v;
			$scope.start_time = Number(query.t) || 0;
			$scope.end_time = Number(query.e) || ($scope.start_time + 10);
			$scope.headline = query.h;
			$scope.bottomline = query.b;
			$scope.fgcolor = query.fg;
			$scope.bgcolor = query.bg;
			// $scope.items = query.m ? JSON.parse(decodeURIComponent(query.m)) : [];

			$scope.editing = !$scope.video_id;
			$scope.cover = cover;
			$scope.make_link = make_link;
			$scope.play_video = play_video;

			$scope.video_url = $scope.video_id ? ('https://www.youtube.com/watch?v=' + $scope.video_id) : '';
			$scope.input_start_time = format_time($scope.start_time);
			$scope.input_end_time = format_time($scope.end_time);

			$scope.$watch('video_id', play_video);
			$scope.$watch('video_url', function(value) {
				var parser = document.createElement('a');
				parser.href = value;
				var i, pair;
				var search_query = {};
				var search_vars = parser.search.substring(1).split('&');
				for (i = 0; i < search_vars.length; i++) {
					pair = search_vars[i].split('=');
					search_query[pair[0]] = decodeURIComponent(pair[1]);
				}
				var hash_query = {};
				var hash_vars = parser.hash.substring(1).split('&');
				for (i = 0; i < hash_vars.length; i++) {
					pair = hash_vars[i].split('=');
					hash_query[pair[0]] = decodeURIComponent(pair[1]);
				}
				if (parser.host === 'youtu.be') {
					$scope.video_id = parser.pathname.substring(1);
					if (search_query.t) {
						$scope.input_start_time =
							search_query.t.replace('h', ':').replace('m', ':').replace('s', '');
					}
				} else if (parser.host === 'www.youtube.com') {
					$scope.video_id = search_query.v;
					if (hash_query.t) {
						var time = parseInt(hash_query.t, 10);
						$scope.input_start_time = format_time(time);
					}
				}
			});

			$scope.$watch('input_start_time', function() {
				$scope.start_time = parse_time($scope.input_start_time);
			});
			$scope.$watch('input_end_time', function() {
				$scope.end_time = parse_time($scope.input_end_time);
			});
			$scope.set_start_time_from_current = function() {
				var current_time = Math.floor(player.getCurrentTime());
				$scope.input_start_time = format_time(current_time);
			};
			$scope.set_end_time_from_current = function() {
				var current_time = Math.floor(player.getCurrentTime());
				$scope.input_end_time = format_time(current_time);
			};

			load_youtube_iframe_api();

			function cover() {
				$scope.covering = !$scope.covering;
				if ($scope.covering) {
					player.mute();
				} else {
					player.unMute();
				}
			}

			function make_link() {
				$location.search('v', $scope.video_id);
				$location.search('t', $scope.start_time);
				$location.search('e', $scope.end_time);
				$location.search('h', $scope.headline);
				$location.search('b', $scope.bottomline);
				$location.search('fg', $scope.fgcolor);
				$location.search('bg', $scope.bgcolor);
				// $location.search('m', encodeURIComponent(JSON.stringify($scope.items)));
			}

			function play_video() {
				if (!player) {
					return;
				}
				console.log('player_ready', event);
				player.loadVideoById({
					videoId: $scope.video_id,
					startSeconds: $scope.start_time,
					endSeconds: $scope.end_time,
				});
				player.pauseVideo();
			}

			function player_state_change(event) {
				if (event.data == YT.PlayerState.PLAYING) {
					$interval.cancel($scope.state_interval);
					$scope.state_interval = $interval(function() {
						var current_time = Math.floor(player.getCurrentTime());
						if (current_time === $scope.end_time) {
							player.pauseVideo();
						}
					}, 300);
				} else {
					$interval.cancel($scope.state_interval);
					$scope.state_interval = null;
				}
			}

			function load_youtube_iframe_api() {
				// callback when the youtube api loads 
				window.onYouTubeIframeAPIReady = function() {
					player = new YT.Player('player', {
						height: '100%',
						width: '100%',
						events: {
							onReady: function(event) {
								play_video();
							},
							onStateChange: player_state_change
						}
					});
				};
				// loads the iframe_api code asynchronously
				var tag = document.createElement('script');
				tag.src = "https://www.youtube.com/iframe_api";
				var first_script_tag = document.getElementsByTagName('script')[0];
				first_script_tag.parentNode.insertBefore(tag, first_script_tag);
			}



			/*
			function update_colors() {
				var elem = document.getElementById('bgcolor_styles');
				var styles = elem.sheet || elem.styleSheet;
				for (var i = 0; i < styles.cssRules.length; i++) {
					var rule = styles.cssRules[i];
					rule.cssRules[0].style.setProperty('background-color', $scope.bgcolor);
					rule.cssRules[1].style.setProperty('background-color', $scope.bgcolor2);
					rule.cssRules[2].style.setProperty('background-color', $scope.bgcolor);
					console.log('STYLE RULE', rule);
				}
			}
			*/
		}
	]);

	hash_app.directive('ngEditLayout', function() {
		return function(scope, elem, attr) {
			var options = scope.$eval(attr.ngEditLayout);
			var styles = options.s;

			function watch_style(key, suffix) {
				scope.$watch(function() {
					return styles[key];
				}, function() {
					console.log('WATCH', key, '=', styles[key]);
					elem.css(key, styles[key] + suffix);
				});
			}
			watch_style('left', 'px');
			watch_style('top', 'px');
			watch_style('right', 'px');
			watch_style('bottom', 'px');

			elem.draggable({
				containment: 'parent',
				cursor: 'move',
				opacity: 0.5,
				handle: options.handle,
				grid: [10, 10],
				stop: function(event, ui) {
					scope.$apply(function() {
						styles.top = ui.position.top;
						styles.left = ui.position.left;
					});
				}
			});
		};
	});

	hash_app.run(function($rootScope) {
		$rootScope.safe_apply = safe_apply;
		$rootScope.safe_callback = safe_callback;
		jQuery.fn.focusWithoutScrolling = function() {
			var x = window.scrollX;
			var y = window.scrollY;
			this.focus();
			window.scrollTo(x, y);
		};
		$('body').tooltip({
			selector: '[rel=tooltip]'
		});
		$('body').popover({
			selector: '[rel=popover]'
		});
	});

	hash_app.config(function($routeProvider, $locationProvider) {
		$locationProvider.html5Mode(true);
	});


	function safe_apply(func) {
		/* jshint validthis:true */
		var phase = this.$root.$$phase;
		if (phase == '$apply' || phase == '$digest') {
			return this.$eval(func);
		} else {
			return this.$apply(func);
		}
	}

	// safe_callback returns a function callback that performs the safe_apply
	// while propagating arguments to the given func.

	function safe_callback(func) {
		/* jshint validthis:true */
		var me = this;
		return function() {
			// build the args array to have null for 'this' 
			// and rest is taken from the callback arguments
			var args = new Array(arguments.length + 1);
			args[0] = null;
			for (var i = 0; i < arguments.length; i++) {
				args[i + 1] = arguments[i];
			}
			// the following is in fact calling func.bind(null, a1, a2, ...)
			var fn = Function.prototype.bind.apply(func, args);
			return me.safe_apply(fn);
		};
	}

	function event_completed(e) {
		if (e.preventDefault) {
			e.preventDefault();
		}
		if (e.stopPropagation) {
			e.stopPropagation();
		}
		return false;
	}

	function format_time(time) {
		var t = time;
		var h = Math.floor(t / 3600);
		t = t % 3600;
		var m = Math.floor(t / 60);
		var s = t % 60;
		if (h) {
			return '' + h + ':' + (m < 10 ? ('0' + m) : m) + ':' + (s < 10 ? ('0' + s) : s);
		} else {
			return '' + m + ':' + (s < 10 ? ('0' + s) : s);
		}
	}

	function parse_time(str) {
		if (!str) {
			return 0;
		}
		var fields = str.split(':');
		if (fields.length === 3) {
			return (3600 * parseInt(fields[0], 10)) +
				(60 * parseInt(fields[1], 10)) +
				parseInt(fields[2], 10);
		} else {
			return (60 * parseInt(fields[0], 10)) +
				parseInt(fields[1], 10);
		}
	}


})();
