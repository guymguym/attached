/* jshint browser:true, jquery:true, devel:true */
/* global angular:false */
/* global _:false */
/* jshint -W099 */
(function() {
	'use strict';

	// create our module
	var app = angular.module('attached_app', [
		// 'ngRoute',
		// 'ngTouch',
		// 'ngSanitize',
		// 'ngAnimate',
	]);

	app.controller('MainCtrl', ['$scope', '$http', '$window', '$location', '$q', '$timeout', '$interval', '$sce',
		function($scope, $http, $window, $location, $q, $timeout, $interval, $sce) {

			$scope.attached = {
				bg: '#282828', // dark grey
				fg: '#009194', // teal
				p: [{ // pages
					i: [{ // items
						k: 't', // kind
						t: 'Welcome to attach.io', // text
						l: { // layout
							l: 20, // left
							t: 50, // top
						},
						s: 50 // font size
					}, {
						k: 't',
						t: 'Drag & Drop youtube videos or web images into this window, or use the buttons on top.',
						l: {
							l: 20,
							t: 200,
						},
						s: 18
					}, {
						k: 't',
						t: 'Move and resize the items, change colors, undo/redo using the browser back/forward actions',
						l: {
							l: 20,
							t: 320,
						},
						s: 18
					}, {
						k: 't',
						t: 'When you\'re done editing, simply select the long browser address, and share it in your favorite way (email/socialnets/etc) and whoever will follow the link will see the same page you designed.',
						l: {
							l: 20,
							t: 440,
						},
						s: 18
					}, {
						k: 'i',
						u: '/public/images/joevscat.gif', // url
						l: {
							l: 710,
							t: 50,
							w: 250,
							h: 150,
						}
					}, {
						k: 'i',
						u: '/public/images/giraffe.gif',
						l: {
							l: 750,
							t: 250,
							w: 200,
							h: 150,
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
						*/
					}]
				}]
			};



			////////////////////////
			// HASH DATA HANDLING //
			////////////////////////

			$scope.$location = $location;
			if (!$location.hash()) {
				$scope.editing = true;
			}
			$scope.$watch('$location.hash()', function(hash_value) {
				// ignore watches when we just modified the hash
				if ($scope.ignore_hash_update) {
					console.log('hash change ignored');
					$scope.ignore_hash_update = false;
					return;
				}
				$scope.ignore_attached_update = true;
				var attached = decode_hash(hash_value);
				if (attached) {
					$scope.attached = attached;
					$scope.page = $scope.attached.p[$scope.page_index];
					console.log('hash data', $scope.attached);
				}
			});
			$scope.$watch('page_index', function() {
				console.log('page', $scope.page_index);
				$scope.page = $scope.attached.p[$scope.page_index];
			});
			$scope.$watch('attached', update_url_data, true /*deep equality check*/ );
			$scope.page_index = 0; // triggers page watch too

			function update_url_data() {
				// throttle down
				$timeout.cancel($scope.update_url_data_timeout);
				$timeout(_update_url_data, 250);
			}

			function _update_url_data() {
				// ignore watches when we just modified the attached data
				if ($scope.ignore_attached_update) {
					$scope.ignore_attached_update = false;
					return;
				}
				$scope.ignore_hash_update = true;
				$location.hash(encode_hash($scope.attached));
				// auto detect page title
				var top_title;
				var topest = -1;
				var big_title;
				var bigest = -1;
				_.each($scope.page.i, function(item) {
					if (item.k !== 't') {
						return;
					}
					if (topest < 0 || item.l.t < topest) {
						topest = item.l.t;
						top_title = item.t;
					}
					if (bigest < 0 || item.s > bigest) {
						bigest = item.l.t;
						big_title = item.t;
					}
				});
				var title = top_title || big_title || 'attached.io - amplify your message';
				console.log('TITLE', title);
				$location.search('t', title);
			}

			function encode_hash(obj) {
				var json = angular.toJson(obj);
				var coded = LZString.compressToBase64(json);
				var hash = encodeURIComponent(coded);
				console.log('ENCODE HASH', json.length, '->', coded.length, '->', hash.length);
				return hash;
			}

			function decode_hash(hash) {
				if (!hash) {
					return;
				}
				try {
					var coded = decodeURIComponent(hash);
					var json = LZString.decompressFromBase64(coded);
					var obj = angular.fromJson(json);
					console.log('DECODE HASH', hash.length, '->', coded.length, '->', json.length);
					return obj;
				} catch (err) {
					console.log('FAILED DECODE HASH', err);
					return;
				}
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
				var pos = {
					left: event.offsetX,
					top: event.offsetY,
				};
				_.each(event.dataTransfer.items, function(drop_item) {
					// copy the info to our closure because the drop_item object 
					// gets cleared once we complete the event
					var kind = drop_item.kind;
					var type = drop_item.type;
					if (kind === 'string') {
						drop_item.getAsString(function(str) {
							console.log('DROP', kind, type, str);
							if (type === 'text/uri-list') {
								create_item_from_url(str, pos);
							}
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

			function create_item_from_url(url, pos) {
				var yt = parse_youtube_url(url);
				if (yt) {
					add_item({
						k: 'y',
						y: yt.videoId,
						l: {
							w: 400,
							h: 300,
						}
					}, pos);
					return;
				}
				// check if url is image
				$('<img>', {
					src: url,
					width: 1,
					height: 1,
					load: function() {
						add_item({
							k: 'i',
							u: url,
							l: {
								w: 200,
							}
						}, pos);
					},
					error: function() {
						alertify.log('Unable to create item from URL. Try with image or youtube.');
					},
				});
				/*
				$http({
					method: 'HEAD',
					url: url,
					withCredentials: true,
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
						add_item({
							k: 'i',
							u: url,
							l: {}
						}, pos);
						return;
					} else {
						// TODO handle video/audio
					}
				});
				*/
			}

			function add_item(item, pos) {
				if (pos) {
					item.l.left = pos.left;
					item.l.top = pos.top;
					pos.left += 20;
					pos.top += 20;
				}
				$scope.page.i.push(item);
				$scope.safe_apply();
			}

			////////////////////////////
			// ITEM EDITING FUNCTIONS //
			////////////////////////////

			var zeroclip = new ZeroClipboard($('#finish_edit_btn'), {
				swfPath: '/vendor-n/zeroclipboard/ZeroClipboard.swf',
				moviePath: '/vendor-n/zeroclipboard/ZeroClipboard.swf'
			});
			zeroclip.on('load', function() {
				zeroclip.on('dataRequested', function(client, args) {
					console.log('ZEROCLIP dataRequested');
					$scope.editing = false;
					$scope.safe_apply();
					client.setText($location.absUrl());
				});
				zeroclip.on('complete', function(client, args) {
					$scope.editing = false;
					$scope.safe_apply();
					alertify.log('Copied URL to clipbaord');
				});
			});

			$scope.create_item_text = function() {
				alertify.prompt('Enter text:', function(e, text) {
					if (e) {
						add_item({
							k: 't',
							t: text,
							l: {
								l: 0,
								t: 0,
							}
						});
					}
				});
			};
			$scope.create_item_url = function() {
				alertify.prompt('Paste URL:', function(e, url) {
					if (e) {
						create_item_from_url(url, {
							left: 0,
							top: 0,
						});
					}
				});
			};
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
				var data = scope.$eval(attr.ngYoutubeData);
				scope.$watch(attr.ngYoutube, reload, true /*deep*/ );

				function reload(options) {
					console.log('ngYoutube', options);
					data.options = options;
					if (data.player) {
						data.player.destroy();
					}
					data.loaded = false;
					data.player = null;
					var play_btn = $('<div class="table-layout text-center" ' +
						'style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: pointer">' +
						'<div class="table-row expand-height"></div>' +
						'<div class="table-row"><i class="fa fa-youtube-play fa-4x"></i></div>' +
						'<div class="table-row expand-height"></div></div>')
						.on('click', play);
					elem.empty().append($('<img>', {
						src: 'https://img.youtube.com/vi/' + options.id + '/0.jpg',
						width: '100%',
						height: '100%'
					})).append(play_btn);
				}

				function play() {
					youtube_api_load_promise.then(function() {
						data.player = new YT.Player(elem[0], {
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
									if (data.player) {
										data.loaded = true;
										var args = {
											videoId: data.options.id,
											startSeconds: data.options.start,
											endSeconds: data.options.end,
										};
										data.player.loadVideoById(args);
									}
								},
								onStateChange: function(event) {
									console.log('state change', event);
									if (!data.duration && event.data === YT.PlayerState.PLAYING) {
										data.duration = data.player.getDuration();
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
				}
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


	app.run(['$rootScope',
		function($rootScope) {
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
		}
	]);

	app.config([
		'$locationProvider',
		// '$routeProvider',
		// '$httpProvider',
		function($locationProvider) {
			$locationProvider.html5Mode(true);
			$locationProvider.hashPrefix('#');
		}
	]);


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
