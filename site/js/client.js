var socket = io.connect(window.location.hostname);
var maphandler;
var objectMarkers;
var crimeMarkers;
var uid;
var hqPolice;
var hqCriminal;
var timer;

$(document).ready(function() {
	var map = document.getElementById('myMap');
	timer = $('#counter');

	socket.on('drawMap', function(data) {
		drawMap(data, map, socket);
	});

	socket.on('updatePositions', function(data) {
		updatePositions(data);
	});

	socket.on('updateObjects', function(data) {
		updateObjects(data);
	});

	socket.on('updateCrimes', function(data) {
		updateCrimes(data)
	});

	socket.on('showCriminal', function() {
		showCriminal();
	});

	socket.on('showPolice', function() {
		showPolice();
	});

	socket.on('updateTime', function(data) {
		updateTime(data);
	});

	socket.on('shot', function() {
		shot();
	});

	socket.on('gameOver', function() {
		gameOver();
	});

	socket.on('updateInfo', function(data) {
		updateInfo(data);
	});

	socket.on('returnHQ', function() {
		showAnnouncement('Herlaar in u hoofdkwartier!', 2500);
	});

	$('#revive').on('click', function() {
		if(uid != 0) {
			var dist = maphandler.calculateDistance(uid, hqPolice);
			socket.emit('reviveReload', { 'uid': uid, 'dist': dist });
		} else {
			var dist = maphandler.calculateDistance(uid, hqCriminal);
			socket.emit('reviveReload', { 'uid': uid, 'dist': dist });
		}
	});

	socket.on('reviveNo', function() {
		reviveNo();
	});

	socket.on('criminalWon', function() {
		criminalWon();
	});

	socket.on('updateTimer', function(data) {
		updateTimer(data);
	});

	$('.announcement').hide();
});

$(document).dblclick(function() {
	//calculate distances between police and criminal
	var distances = [];

	distances.push({'to': '1', 'dist': maphandler.calculateDistance(0, { 'jb': maphandler.p[1].x, 'kb': maphandler.p[1].y })});
	distances.push({'to': '2', 'dist': maphandler.calculateDistance(0, { 'jb': maphandler.p[2].x, 'kb': maphandler.p[2].y })});
	distances.push({'to': '3', 'dist': maphandler.calculateDistance(0, { 'jb': maphandler.p[3].x, 'kb': maphandler.p[3].y })});


	socket.emit('shoot', { 'clientId': uid, 'distances': distances });
});

function drawMap(data, map, socket) {
	// set some info in the title
	if(data.type == "boef") {
		$('.extra').html("- boef team - " + "<span>rood</span>");
	}
	if(data.type == "politie1") {
		$('.extra').html("- politieteam 1 - " + "<span>groen</span>");
	}
	if(data.type == "politie2") {
		$('.extra').html("- politieteam 2 - " + "<span>geel</span>");
	}
	if(data.type == "politie3") {
		$('.extra').html("- politieteam 3 - " + "<span>blauw</span>");
	}

	maphandler = new MapHandler(socket, data);
	maphandler.createMap();
	uid = data.uid;
	hqPolice = { 'jb': data.hqPolice.x, 'kb': data.hqPolice.y };
	hqCriminal = { 'jb': data.hqCriminal.x, 'kb': data.hqCriminal.y };

	//console.log(data);

	objectMarkers = maphandler.getObjectMarkers();
	crimeMarkers = maphandler.getCrimeMarkers();

	objectMarkers.markers.forEach(function(marker) {
		if(data.uid == 0) { //enable the pickup only for boef
			google.maps.event.addListener(marker.marker, 'click', function(e) {
				var dist = maphandler.calculateDistance(data.uid, e.latLng);

				objectMarkers.objects.forEach(function(object) {
					if(object.id == marker.uid) {
						var dist = maphandler.calculateDistance(data.uid, e.latLng);
						if(dist <= 50) {
							socket.emit('handleObject', object);
						}
					}
				});
			});
		}
	});

	crimeMarkers.markers.forEach(function(marker) {
		if(data.uid == 0) { //enable the pickup only for boef

			google.maps.event.addListener(marker.marker, 'mouseover', function(e) {
				var announc = data.crimes[marker.uid].name + ": ";
				data.crimes[marker.uid].objects.forEach(function(object){
					announc +=  object.obj + "   ";
				});
				showAnnouncement(announc);
			});

			google.maps.event.addListener(marker.marker, 'mouseout', function(e) {
				$('.announcement').hide();
			});

			google.maps.event.addListener(marker.marker, 'click', function(e) {
				var dist = maphandler.calculateDistance(data.uid, e.latLng);
				crimeMarkers.crimes.forEach(function(crime) {
					if(crime.id == marker.uid) {
						var dist = maphandler.calculateDistance(data.uid, e.latLng);
						if(dist <= 50) {
							socket.emit('handleCrime', crime);
						}
					}
				});
			});
		}
	});
}

function updatePositions(data) {
	maphandler.updateMarkers(data);
}

function updateObjects(data) {
	objectMarkers.markers.forEach(function(marker) {
		if(marker.uid == data.id) {
			marker.marker.setMap(null);
		}
	});

	if(uid == 0) {
		var ann = $('.announcement');
		ann.css('visibility', 'visible');
		ann.html("Je hebt een " + data.name + " opgepakt!");
		ann.fadeIn('slow');

		setTimeout(function() {
			ann.fadeOut('slow');
		}, 2500);
	}

	if(uid > 0) {
		var ann = $('.announcement');
		ann.css('visibility', 'visible');
		ann.html("De boef heeft een " + data.name + " opgepakt!");
		ann.fadeIn('slow');

		setTimeout(function() {
			ann.fadeOut('slow');
		}, 2500);
	}
}

function updateCrimes(data) {
	crimeMarkers.markers.forEach(function(marker) {
		if(marker.uid == data.id) {
			marker.marker.setMap(null);
		}
	});

	// this is the criminal
	if(uid == 0) {
		showAnnouncement("Je hebt een misdaad " + parseInt(parseInt(data.id) + 1) + ": " + data.name + " gepleegd!", 2500);
	}

	if(uid > 0) {
		showAnnouncement("De boef heeft misdaad " + parseInt(parseInt(data.id) + 1) + ": " + data.name + " gepleegd!", 2500);
	}
}

function showCriminal() {
	if(uid > 0) {
		maphandler.showCriminal();
	}
}

function showPolice() {
	if(uid == 0) {
		maphandler.showPolice();
	}
}

function updateTime(data) {
	$('.timeuntil').html('minutes: ' + data.minutes + ' seconds: ' + data.seconds);
}

function shot() {
	showAnnouncement("Je bent geraakt!", 2500);
}

function showAnnouncement(announcement, delay) {
	var ann = $('.announcement');
	ann.css('visibility', 'visible');
	ann.html(announcement);
	ann.fadeIn('slow');

	if(delay > 0) {
		setTimeout(function() {
			ann.fadeOut('slow');
		}, delay);
	}
}

function gameOver() {
	showAnnouncement("Game Over! De politie heeft gewonnen!", 0);
}

function criminalWon() {
	showAnnouncement("Game Over! De boef heeft gewonnen!", 0);
}

function updateInfo(data) {
	var infoDiv = $('.info');
	infoDiv.html("");

	var htmlChunk = "<h2>Info</h2>";
	htmlChunk += "<ul>";
	

	if(uid == 0) {
		if(data.isShot) {
			htmlChunk += "<li>geschoten: ja</li>";
		} else {
			htmlChunk += "<li>geschoten: nee</li>";
		}
		
		htmlChunk += "<li>kogels: " + data.bullets + "</li>";
		htmlChunk += "<li>geld: " + data.money + "</li>";
		htmlChunk += "<li>voorwerpen: </li><ul>";
		data.objects.forEach(function(object) {
			console.log(object);
			htmlChunk += "<li>" + object.name + "</li>";
		});
		htmlChunk += "</ul>";
	} else {
		if(data.isShot) {
			htmlChunk += "<li>geschoten: ja</li>";
		} else {
			htmlChunk += "<li>geschoten: nee</li>";
		}
		
		htmlChunk += "<li>kogels: " + data.bullets + "</li>";
	}
	
	infoDiv.html(htmlChunk);
}

function reviveNo() {
	showAnnouncement("Je bent niet dicht genoeg bij het hoofdkwartier!", 2500);
}

function updateTimer(data) {
	if(uid == 0) {
		timer.html(data.cp);
	} else {
		timer.html(data.cc);
	}
}














