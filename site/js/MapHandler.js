function MapHandler(socket, data) {
	var clientuid = data.uid;
	var map = document.getElementById('myMap');;
	var centerposition = new google.maps.LatLng('51', '4');
	var googleMap = null;
	var objectMarkers = [];
	var crimeMarkers = [];
	var markers = [];
	var hqpolice;
	this.p = data.clients;

	this.createMap = function() {
		var mapOptions = {
	        zoom: 14,
	        mapTypeId: google.maps.MapTypeId.ROADMAP,
	        draggable: false,
	        zoomControl: false,
	        scrollwheel: false,
	        disableDefaultUI: true,
	        disableDoubleClickZoom: true
	    };

	    googleMap = new google.maps.Map(map,
	        mapOptions);

	    googleMap.setCenter(centerposition);

	    // set the objects on the map
	    data.objects.forEach(function(object) {
	    	var pos = new google.maps.LatLng(object.place.x, object.place.y);

			var marker = new google.maps.Marker({
		        position: pos,
		        draggable: false,
		        icon: new google.maps.MarkerImage(object.symbol, null, null, new google.maps.Point(12, 12), new google.maps.Size(24, 24))
		    });

		    marker.setMap(googleMap);
		    objectMarkers.push({'uid': object.id, 'marker': marker});
	    });

	    data.crimes.forEach(function(crime) {
	    	var pos = new google.maps.LatLng(crime.place.x, crime.place.y);
			var marker = new google.maps.Marker({
		        position: pos,
		        icon: new google.maps.MarkerImage(crime.symbol, null, null, new google.maps.Point(12, 12), new google.maps.Size(24, 24))
		    });

		    marker.setMap(googleMap);
		    crimeMarkers.push({'uid': crime.id, 'marker': marker});
	    });

	    // add the HQ of police to map
	    var pos = new google.maps.LatLng(data.hqPolice.x, data.hqPolice.y);
		var marker = new google.maps.Marker({
	        position: pos,
	        icon: new google.maps.MarkerImage(data.hqPolice.symbol, null, null, new google.maps.Point(12, 12), new google.maps.Size(24, 24))
	    });
	    marker.setMap(googleMap);
	    hqpolice = pos;

	    // add the HQ of criminal to map
	    if(clientuid == 0) {
	    	var pos = new google.maps.LatLng(data.hqCriminal.x, data.hqCriminal.y);
			var marker = new google.maps.Marker({
		        position: pos,
		        icon: new google.maps.MarkerImage(data.hqCriminal.symbol, null, null, new google.maps.Point(12, 12), new google.maps.Size(24, 24))
		    });
		    marker.setMap(googleMap);
	    }

	    fillMarkers(this.p);
	}

	this.calculateDistance = function(uid, positionObject) {
		var point1 = new google.maps.LatLng(this.p[uid].x, this.p[uid].y);
		var point2 = new google.maps.LatLng(positionObject.jb, positionObject.kb);
		return google.maps.geometry.spherical.computeDistanceBetween(point1, point2);
	}

	this.updateMarkers = function(positions) {
		fillMarkers(positions);
		this.p = positions;
	}

	var fillMarkers = function(positions) {
		markers.forEach(function(marker) {
			marker.marker.setMap(null);
		});

		markers = [];
		
		for(var t = 0; t < positions.length; t++) {
			var pos = new google.maps.LatLng(positions[t].x, positions[t].y);
			var marker = new google.maps.Marker({
		        position: pos,
		        draggable: false,
		        id: t,
		        visible: false
		    });

		    if(t == 1) {
		    	marker.setIcon('http://maps.google.com/mapfiles/ms/icons/green-dot.png');
		    }
		    if(t == 2) {
		    	marker.setIcon('http://maps.google.com/mapfiles/ms/icons/yellow-dot.png');
		    }
		    if(t == 3) {
		    	marker.setIcon('http://maps.google.com/mapfiles/ms/icons/blue-dot.png');
		    }

		    markers.push({ 'uid': t, 'marker': marker });
		}

		setMarkers();
	}

	var setMarkers = function() {

		if(clientuid == 0) {
			markers.forEach(function(marker) {
				marker.marker.setMap(googleMap);
				if(marker.marker.id == 0) {
					marker.marker.draggable = true;
					marker.marker.visible = true;

					google.maps.event.addListener(marker.marker, 'dragend', function(e) {
						socket.emit('updatePositions', { 'uid': marker.uid, 'position': marker.marker.position });
						console.log(marker.marker.position);
					});
				}
			});
		} else {
			markers.forEach(function(marker) {
				marker.marker.setMap(googleMap);

				if(marker.marker.id > 0) {
					marker.marker.visible = true;
				}

				if(marker.marker.id == clientuid) {
					marker.marker.draggable = true;
					google.maps.event.addListener(marker.marker, 'dragend', function(e) {
						socket.emit('updatePositions', { 'uid': marker.uid, 'position': marker.marker.position });
					});
				}
			});
		}
	}

	this.getObjectMarkers = function() {
		return { 'markers': objectMarkers, 'objects': data.objects };
	}

	this.getCrimeMarkers = function() {
		return { 'markers': crimeMarkers, 'crimes': data.crimes };
	}

	this.showCriminal = function() {
		//console.log(clientuid);
		markers.forEach(function(marker) {
			if(marker.marker.id == 0) {
				marker.marker.setMap(googleMap);
				marker.marker.visible = true;
				setTimeout(function() {
					marker.marker.setMap(null); 
					marker.marker.visible = false;
				}, 2000);
			}
		});
	}

	this.showPolice = function() {
		markers.forEach(function(marker) {
			if(marker.marker.id > 0) {
				marker.marker.setMap(googleMap);
				marker.marker.visible = true;
				setTimeout(function() {
					marker.marker.setMap(null); 
					marker.marker.visible = false;
				}, 2000);
			}
		});
		socket.emit('resetTimer');
	}
}