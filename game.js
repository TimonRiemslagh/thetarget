var express = require('express'), 
app = express(), 
http = require('http'), 
server = http.createServer(app), 
io = require('socket.io').listen(server);
var configJSON = require('./lib/Config.json');

//var port = process.env.PORT || 5000;
server.listen(8080);
io.set('log level', 2);

var fs = require("fs");
app.use(express.static(__dirname + '/site'));

var clients = [];
var positions = [];
var config = JSON.parse(JSON.stringify(configJSON));

// random number for hq criminal
var ran = Math.floor(Math.random()*4);

var l = 0;
var coords = config.startPositions;

//routing
app.get('/', function (req, res) {
    fs.readFile(__dirname + '/site/index.html', 'utf8', function(err, text) {
    	res.send(text);
	});
});

io.sockets.on('connection', function(socket) {
	var counterCriminal = 360;
	var counterPolice = 180;

	// show all on police
	setInterval(function() {
		socket.emit('showCriminal');
		counterCriminal = 360;
	}, 362000);

	// show all on criminal
	setInterval(function() {
		counterPolice = 180;
		socket.emit('showPolice');
	}, 182000);

	setInterval(function() {
		counterPolice--;
		counterCriminal--;
		socket.emit('updateTimer', { 'cc': counterCriminal, 'cp': counterPolice });
	}, 1000);
	
	
	addClient(l, socket, coords[l], DrawMaps);
	l++;

	socket.on('disconnect', function() {
		disconnect(socket.id);
	});

	socket.on('updatePositions', function(data) {
		updatePositions(data);
	});

	socket.on('handleObject', function(data) {
		handleObject(data);
	});

	socket.on('handleCrime', function(data) {
		handleCrime(data);
	});

	socket.on('resetTimer', function() {

	});

	socket.on('shoot', function(data) {
		shoot(data);
	});

	socket.on('reviveReload', function(data) {
		reviveReload(data);
	});
});

function timer(socket, minutes, seconds) {
	this.socket = socket;
	this.minutes = minutes;
	this.seconds = seconds;

	this.startTimer = function() {
		socket.emit('updateTime', { 'minutes': minutes, 'seconds': seconds });
		this.interval = setInterval(function() {
			seconds--;
			socket.emit('updateTime', { 'minutes': minutes, 'seconds': seconds });
			if(seconds == 0) {
				seconds = 60;
				if(minutes == 0 && seconds == 0) {
					socket.emit('showPolice');
				}
				minutes--;
			}			
		}, 200);
	}

	this.resetTimer = function() {
		this.seconds = seconds;
		this.minutes = minutes;
		clearInterval(interval);
	}
	
}

function disconnect(socketId) {
	for(var t = 0; t < clients.length; t++) {
		if(clients[t].socketId == socketId) {
			clients.splice(t, 1);
		}
	}
}

function addClient(uid, socket, coord, callback) {
	var person;
	var personNoSocket;

	switch(uid) {
		case 0:
			person = new Person(uid, socket, 'boef', 'boef');
			break;
		case 1:
			person = new Person(uid, socket, 'politie1', 'politie1');
			break;
		case 2:
			person = new Person(uid, socket, 'politie2', 'politie2');
			break;
		case 3:
			person = new Person(uid, socket, 'politie3', 'politie3');
			break;
	}

	positions[uid] = coord;
	//positions.push({'uid': uid, 'position':coord});
	clients.push(person);
	callback(clients, positions);
}

// person
function Person(uid, socket, symbol, type) {
	this.uid = uid;
	this.socket = socket;
	this.symbol = symbol;
	this.type = type;
	this.objects = [];
	this.money = 0;
	this.isShot = false;
	this.bullets = 3;

	this.addObject = function(object) {
		this.objects.push(object);
	}

	this.addMoney = function(money) {
		parseInt(this.money += parseInt(money));
	}

	this.shotFired = function() {
		if(this.bullets > 0) {
			this.bullets--;
			return true;
		} else {
			return false;
		}
		
	}
}

function DrawMaps(clients, positions) {
	clients.forEach(function(client) {
		client.socket.emit('drawMap', { 'uid': client.uid, 'type': client.type, 'position': client.position, 'clients': positions, 'objects': config.objects, 'crimes': config.crimes, 'hqPolice': config.hqPolice, 'hqCriminal': config.hqCriminal[ran] });
		client.socket.emit('updateInfo', { 'bullets': client.bullets, 'objects': client.objects, 'money': client.money, 'isShot': client.isShot });
	});
}

function updatePositions(data) {
	positions[data.uid] = { 'x': data.position.jb, 'y': data.position.kb };

	clients.forEach(function(client) {
		client.socket.emit('updatePositions', positions);
	});
}

function handleObject(data) {
	//console.log(data);
	clients.forEach(function(client) {
		//this is the criminal
		if(client.uid == 0) {
			client.addObject(data);
		}
		client.socket.emit('updateObjects', data);
		client.socket.emit('updateInfo', { 'bullets': client.bullets, 'objects': client.objects, 'money': client.money, 'isShot': client.isShot });
	});
}

function handleCrime(data) {

	clients.forEach(function(client) {
		var objectArrayOwned = [];
		var objectArrayNeeded = [];
		//this is the criminal
		if(client.uid == 0) {
			client.objects.forEach(function(object) {
				objectArrayOwned.push(object.id);
			});

			data.listObjects.forEach(function(obj) {
				objectArrayNeeded.push(obj.id);
			});

			if(objectArrayOwned.length > 0) {
				for(var t = 0; t < objectArrayNeeded.length; t++) {
					if(!objectArrayOwned.contains(objectArrayNeeded[t])) {
						return;
					}
				}

				client.addMoney(data.reward);
				if(client.money >= 1000000){
					clients.forEach(function(client) {
						console.log(client);
						client.socket.emit('criminalWon');
					})
				} else {
					client.socket.emit('updateCrimes', data);
				}
				
				client.socket.emit('updateInfo', { 'bullets': client.bullets, 'objects': client.objects, 'money': client.money, 'isShot': client.isShot });
			}
		}
	});
}

Array.prototype.contains = function(k) {
    for(var p in this)
        if(this[p] === k)
            return true;
    return false;
}

function shoot(data) {
	// the criminal shot
	if(data.clientId == 0) {
		if(clients[0].isShot == false && clients[0].bullets > 0) {
			clients[0].bullets -= 1;
			clients[0].socket.emit('updateInfo', { 'bullets': clients[0].bullets, 'objects': clients[0].objects, 'money': clients[0].money, 'isShot': clients[0].isShot });
			data.distances.forEach(function(distance) {
				if(distance.dist < 30) {
					clients.forEach(function(client) {
						if(client.uid == distance.to) {
							client.socket.emit('shot');
							client.isShot = true;
							client.socket.emit('updateInfo', { 'bullets': client.bullets, 'objects': client.objects, 'money': client.money, 'isShot': client.isShot });
						}
					});
				}
			});
		} else {
			clients[0].socket.emit('returnHQ');
		}
	} else {
		
		if(clients[data.clientId].isShot == false && clients[data.clientId].bullets > 0) {
			clients[data.clientId].bullets -= 1;
			clients[data.clientId].socket.emit('updateInfo', { 'bullets': clients[data.clientId].bullets, 'objects': clients[data.clientId].objects, 'money': clients[data.clientId].money, 'isShot': clients[data.clientId].isShot });
			data.distances.forEach(function(distance) {
				if(distance.dist < 30) {
					clients[0].isShot = true;
					clients[0].socket.emit('shot');
					clients[0].socket.emit('updateInfo', { 'bullets': clients[0].bullets, 'objects': clients[0].objects, 'money': clients[0].money, 'isShot': clients[0].isShot });

					clients.forEach(function(client) {
						client.socket.emit('gameOver');
					});
				}
			});
		} else {
			clients[data.clientId].socket.emit('returnHQ');
		}
	}

	//console.log(clients);
}

function reviveReload(data) {
	if(data.dist <= 50) {
		clients[data.uid].bullets = 3;
		clients[data.uid].isShot = false;
		clients[data.uid].socket.emit('updateInfo', { 'bullets': clients[data.uid].bullets, 'objects': clients[data.uid].objects, 'money': clients[data.uid].money, 'isShot': clients[data.uid].isShot });
	} else {
		clients[data.uid].socket.emit('reviveNo');
	}
}











