/* jshint browser:true, jquery:true, devel:true */
/* global angular:false */
/* global _:false */
/* jshint -W099 */
(function() {
	'use strict';

	// create our module
	var app = angular.module('attached_app', [
		'ngRoute',
		// 'ngTouch',
		// 'ngSanitize',
		// 'ngAnimate',
	]);

	app.controller('MainCtrl', ['$scope', '$http', '$window', '$location', '$q', '$timeout', '$interval', '$sce',
		function($scope, $http, $window, $location, $q, $timeout, $interval, $sce) {

			$scope.attached = {
				bg: '#282828',
				fg: '#ffff00',
				p: [{ // pages
					i: [{ // items
						k: 't', // kind
						t: 'Tell your story...', // text
						l: { // layout
							l: 300, // left
							t: 50, // top
						},
						s: 50 // font size
					}, {
						k: 'i',
						u: '/public/images/giraffe.gif', // url
						l: {
							l: 300,
							t: 200,
							w: 400,
							h: 200,
						}
						/*}, {
						k: 'y',
						y: 'OprCOLuUPzY',
						l: {
							l: 0,
							t: 500,
							w: 400,
							h: 300,
						},
						s: 12, // start seconds
						e: 12, // end seconds
						p: 1, // pause
						*/
					}]
				}]
			};



			////////////////////////
			// HASH DATA HANDLING //
			////////////////////////


			if ($location.hash()) {
				$scope.attached = decode_hash($location.hash());
			} else {
				$scope.editing = true;
			}

			console.log('hash data', $scope.attached);

			$scope.page_index = 0;
			$scope.$watch('page_index', function() {
				$scope.page = $scope.attached.p[$scope.page_index];
			});


			$scope.$watch('attached', update_url_hash, true /*deep equality check*/ );

			function update_url_hash() {
				// ignore first watch because we just read the hash
				if (!$scope.ignored_first_update_hash) {
					$scope.ignored_first_update_hash = true;
					return;
				}
				// throttle down
				$timeout.cancel($scope.update_url_hash_timeout);
				$timeout(_update_url_hash, 250);
			}

			function _update_url_hash() {
				$location.hash(encode_hash($scope.attached));
			}

			function encode_hash(obj) {
				var json = angular.toJson(obj);
				var hash = LZString.compressToBase64(json);
				console.log('ENCODE HASH', json.length, '->', hash.length);
				return hash;
			}

			function decode_hash(hash) {
				var json = LZString.decompressFromBase64(hash);
				var obj = angular.fromJson(json);
				console.log('DECODE HASH', hash.length, '->', json.length);
				return obj;
			}



			////////////////////////
			// DROP ZONE HANDLING //
			////////////////////////


			var story_container = document.getElementById('story-container');
			// handling the drags events to allow drop on the element
			story_container.addEventListener('dragenter', event_completed);
			story_container.addEventListener('dragover', event_completed);
			story_container.addEventListener('dragleave', event_completed);
			story_container.addEventListener('drop', function(event) {
				console.log('DROP', event);
				_.each(event.dataTransfer.items, function(drop_item) {
					// copy the info to our closure because the drop_item object 
					// gets cleared once we complete the event
					var kind = drop_item.kind;
					var type = drop_item.type;
					var count = 0;
					if (kind === 'string') {
						drop_item.getAsString(function(str) {
							if (type !== 'text/uri-list') {
								return;
							}
							console.log('DROP', kind, type, str);
							var left = event.offsetX + (count * 20);
							var top = event.offsetY + (count * 20);
							var yt = parse_youtube_url(str);
							if (yt) {
								var item = {
									k: 'y',
									y: yt.videoId,
									l: {
										l: left,
										t: top,
										w: 400,
										h: 300,
									}
								};
								count++;
								$scope.page.i.push(item);
								$scope.safe_apply();
								return;
							}
							$http({
								method: 'HEAD',
								url: str,
								headers: {
									'Access-Control-Allow-Origin': '*',
									'Access-Control-Allow-Methods': 'HEAD',
									'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
									'X-Random-Shit': '123123123'
								}
							}).then(function(res) {
								var content_type = res.headers('content-type');
								console.log('HEAD', content_type);
								var kind = content_type.split('/')[0];
								if (kind === 'image') {
									var item = {
										k: 'i',
										u: str,
										l: {
											l: left,
											t: top,
										}
									};
									count++;
									$scope.page.i.push(item);
									$scope.safe_apply();
									return;
								} else {
									// TODO handle video/audio
								}
							});
						});
					} else {
						// kind === 'file'
						console.log('DROP unsupported item kind', kind, type);
					}
				});
				return event_completed(event);
			});


			function parse_youtube_url(url) {
				var parser = document.createElement('a');
				parser.href = url;
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
				var res = {};
				if (parser.host === 'youtu.be') {
					res.videoId = parser.pathname.substring(1);
					if (search_query.t) {
						var formatted_time = search_query.t.replace('h', ':').replace('m', ':').replace('s', '');
						res.startSeconds = parse_time(formatted_time);
					}
					return res;
				} else if (parser.host === 'www.youtube.com') {
					res.videoId = search_query.v;
					if (hash_query.t) {
						res.startSeconds = parseInt(hash_query.t, 10);
					}
					return res;
				}
			}


			////////////////////////////
			// ITEM EDITING FUNCTIONS //
			////////////////////////////


			$scope.edit_item_text = function(item) {
				alertify.prompt('Write something inspiring:', function(e, str) {
					if (e) {
						item.t = str;
						$scope.safe_apply();
					}
				}, item.t);
			};
			$scope.increase_font_size = function(item, event) {
				event.stopPropagation();
				var sz = item.s || 40;
				item.s = sz + 5;
				return event_completed(event);
			};
			$scope.decrease_font_size = function(item, event) {
				var sz = item.s || 40;
				item.s = sz - 5;
				return event_completed(event);
			};
			$scope.toggle_pause = function(item) {
				if (item.p) {
					delete item.p;
				} else {
					item.p = 1;
				}
			};
			$scope.set_yt_start_time = function(item, ytdata) {
				item.s = Math.floor(ytdata.player.getCurrentTime());
			};
			$scope.set_yt_end_time = function(item, ytdata) {
				item.e = Math.floor(ytdata.player.getCurrentTime());
			};
			$scope.send_to_front = function(item, index, event) {
				$scope.page.i.splice(index, 1);
				$scope.page.i.push(item);
			};
			$scope.send_to_back = function(item, index, event) {
				$scope.page.i.splice(index, 1);
				$scope.page.i.unshift(item);
			};
			$scope.delete_item = function(item, index, event) {
				alertify.confirm('Are you sure you want to delete?', function(e) {
					if (e) {
						$scope.safe_apply(function() {
							$scope.page.i.splice(index, 1);
						});
					}
				});
				return event_completed(event);
			};

		}
	]);




	/////////////////
	// EDIT LAYOUT //
	/////////////////


	app.directive('ngEditLayout', function() {
		return function(scope, elem, attr) {
			var options = scope.$eval(attr.ngEditLayout);
			var styles = options.l;
			var PXGRID = 15;

			function watch_style(key, css_key, pxgrid) {
				scope.$watch(function() {
					return styles[key];
				}, function() {
					// console.log('WATCH', key, '=', styles[key]);
					if (pxgrid && typeof(styles[key]) === 'number') {
						var x = Math.floor(styles[key]);
						x = x < 0 ? 0 : x;
						x -= x % pxgrid;
						elem.css(css_key, x + 'px');
					} else {
						elem.css(css_key, styles[key]);
					}
				});
			}
			watch_style('l', 'left', PXGRID);
			watch_style('t', 'top', PXGRID);
			watch_style('r', 'right', PXGRID);
			watch_style('b', 'bottom', PXGRID);
			watch_style('w', 'width', PXGRID);
			watch_style('h', 'height', PXGRID);

			elem.draggable({
				containment: 'parent',
				cursor: 'move',
				opacity: 0.7,
				handle: options.mover,
				grid: [PXGRID, PXGRID],
				iframeFix: true,
				stop: function(event, ui) {
					scope.safe_apply(function() {
						styles.l = ui.position.left;
						styles.t = ui.position.top;
					});
				}
			});

			elem.resizable({
				containment: 'parent',
				handles: {
					se: elem.find(options.resizer), // TODO doesn't work.
				},
				grid: [PXGRID, PXGRID],
				stop: function(event, ui) {
					scope.safe_apply(function() {
						styles.w = ui.size.width;
						styles.h = ui.size.height;
					});
				}
			});
		};
	});



	/////////////
	// YOUTUBE //
	/////////////


	app.directive('ngYoutube', ['youtube_api_load_promise', '$rootScope',
		function(youtube_api_load_promise, $rootScope) {
			return function(scope, elem, attr) {
				var options = scope.$eval(attr.ngYoutube);
				var data = options.ytdata;
				if (!_.isEmpty(data)) {
					console.log('ngYoutube DOUBLE INIT', options);
					return;
				}
				console.log('ngYoutube');
				youtube_api_load_promise.then(function() {
					var player = data.player = new YT.Player(elem[0], {
						height: '100%',
						width: '100%',
						playerVars: {
							iv_load_policy: 3, // hide video annotations
							rel: 0, // hide suggested related videos
							showinfo: 0, // hide title and uploader info
							theme: 'light',
							// wmode: 'opaque', // doesnt do anything
						},
						events: {
							onReady: function(event) {
								console.log('player_ready', event, data.loaded ? 'reload' : '');
								data.loaded = true;
								var args = {
									videoId: options.id,
									startSeconds: options.start,
									endSeconds: options.end,
								};
								if (options.pause) {
									player.cueVideoById(args);
								} else {
									player.loadVideoById(args);
								}
							},
							onStateChange: function(event) {
								console.log('state change', event);
								if (!data.duration && event.data === YT.PlayerState.PLAYING) {
									data.duration = player.getDuration();
									$rootScope.safe_apply();
								}
							},
							onPlaybackQualityChange: function(event) {
								console.log('playback quality change', event);
							},
							onError: function(event) {
								console.log('ERROR FROM YOUTUBE PLAYER', event);
							}
						}
					});
				});
			};
		}
	]);


	app.factory('youtube_api_load_promise', ['$q',
		function($q) {
			var defer = $q.defer();
			// callback when the youtube api loads 
			window.onYouTubeIframeAPIReady = function() {
				defer.resolve();
			};
			// loads the iframe_api code asynchronously
			var tag = document.createElement('script');
			tag.src = "https://www.youtube.com/iframe_api";
			var first_script_tag = document.getElementsByTagName('script')[0];
			first_script_tag.parentNode.insertBefore(tag, first_script_tag);
			// the service returning a promise
			return defer.promise;
		}
	]);





	/////////////
	// GENERAL //
	/////////////


	app.run(function($rootScope) {
		$rootScope.safe_apply = safe_apply;
		$rootScope.safe_callback = safe_callback;
		jQuery.fn.focusWithoutScrolling = function() {
			var x = window.scrollX;
			var y = window.scrollY;
			this.focus();
			window.scrollTo(x, y);
		};
		/* 
		using directive ng-tip instead
		$('body').tooltip({
			selector: '[rel=tooltip]',
		});
		*/
		$('body').popover({
			selector: '[rel=popover]',
		});
	});

	app.config(function($routeProvider, $locationProvider) {
		// $locationProvider.html5Mode(true);
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

	app.filter('format_time', function() {
		return format_time;
	});

	function format_time(time) {
		if (!time) {
			return '';
		}
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

	app.directive('ngTip', function() {
		return function(scope, elem, attr) {
			elem.tooltip({
				container: 'body'
			});
			elem.on('remove', function() {
				elem.tooltip('destroy');
			});
		};
	});



	// LZW Compression/Decompression for Strings
	// from http://rosettacode.org/wiki/LZW_compression#JavaScript
	// We use the lz-string library instead because this code encodes to integers (not chars), 
	// which requires more work to encode to base64.
	/*
	function LZW_compress(uncompressed) {
		"use strict";
		// Build the dictionary.
		var i,
			dictionary = {},
			c,
			wc,
			w = "",
			result = [],
			dictSize = 256;
		for (i = 0; i < 256; i += 1) {
			dictionary[String.fromCharCode(i)] = i;
		}

		for (i = 0; i < uncompressed.length; i += 1) {
			c = uncompressed.charAt(i);
			wc = w + c;
			//Do not use dictionary[wc] because javascript arrays 
			//will return values for array['pop'], array['push'] etc
			// if (dictionary[wc]) {
			if (dictionary.hasOwnProperty(wc)) {
				w = wc;
			} else {
				result.push(dictionary[w]);
				// Add wc to the dictionary.
				dictionary[wc] = dictSize++;
				w = String(c);
			}
		}

		// Output the code for w.
		if (w !== "") {
			result.push(dictionary[w]);
		}
		return result;
	}
	function LZW_decompress(compressed) {
		"use strict";
		// Build the dictionary.
		var i,
			dictionary = [],
			w,
			result,
			k,
			entry = "",
			dictSize = 256;
		for (i = 0; i < 256; i += 1) {
			dictionary[i] = String.fromCharCode(i);
		}

		w = String.fromCharCode(compressed[0]);
		result = w;
		for (i = 1; i < compressed.length; i += 1) {
			k = compressed[i];
			if (dictionary[k]) {
				entry = dictionary[k];
			} else {
				if (k === dictSize) {
					entry = w + w.charAt(0);
				} else {
					return null;
				}
			}

			result += entry;

			// Add w+entry[0] to the dictionary.
			dictionary[dictSize++] = w + entry.charAt(0);

			w = entry;
		}
		return result;
	}
	*/

})();
