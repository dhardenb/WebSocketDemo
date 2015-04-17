var System = require("util");
var HTTP = require("http");
var WebSocketServer = require("./node_modules/websocket").server;
var Game = require("./game.js");

var Frame = 0;
var FramesPerGameStateTransmission = 1;
var MaxConnections = 10;
var Connections = {};

// Create an HTTP Server
var HTTPServer = HTTP.createServer(
	function(Request, Response)
	{
		Response.writeHead(200, {"Content-Type": "text/plain" });
		Response.end();
	}
);

// Start HTTP Server
HTTPServer.listen(9001, function() {System.log("Listening for connections on port 9001"); });

// Create WebSocket
var Server = new WebSocketServer(
	{
		httpServer: HTTPServer,
		closeTimeout: 2000
	}
);

Server.on("request",
	function(Request)
	{
		if (ObjectSize(Connections) >= MaxConnections)
		{
			Request.reject();
			return;
		}
		
		// Create the connection and store IP
		var Connection = null;
		Connection = Request.accept(null, Request.origin);
		Connection.IP = Request.remoteAddress;
		
		// Assign a random ID that has not been taken
		do
		{
			Connection.ID = Math.floor(Math.random() * 100000)
		} while (Connection.ID in Connections);
		
		// Add the new connection using the connection.ID
		// as the index.
		Connections[Connection.ID] = Connection;
		
		// Set up an event handler for Message events
		Connection.on("message",
			function(Message)
			{
				if (Message.type == "utf8")
				{
					HandleClientMessage(Connection.ID, Message.utf8Data);
				}
			}
		);
		
		// Set up an event handler for close events
		Connection.on("close",
			function()
			{
				HandleClientClosure(Connection.ID);
			}
		);
		
		System.log("Logged in " + Connection.IP + "; currently " + ObjectSize(Connections) + " users.");
	}
);

function ObjectSize(Obj)
{
	var Size = 0;
	
	for (var Key in Obj)
	{
		if (Obj.hasOwnProperty(Key))
		{
			Size++;
		}
	}
	
	return Size;
}

function HandleClientClosure(ID)
{
	if (ID in Connections)
	{
		System.log("Disconnect from " + Connections[ID].IP);
		delete Connections[ID];
	}
}

function HandleClientMessage(ID, Message)
{
	// Check if we know this client ID and that the message is in the format we expect.
	if (!(ID in Connections)) return;
	
	try
	{
		Message = JSON.parse(Message);
	}
	catch (Err)
	{
		return;
	}
	if (!("Type" in Message && "Data" in Message)) return;
	
	var C = Connections[ID];
	
	switch (Message.Type)
	{
		case "HI":
		// If this player already hasa car abort
		if (C.Car) break;
		
		// Create the player's car with random initial position.
		System.log("Game.GP.CarRadius = " + Game.GP.CarRadius);
		System.log("Game.GP.GameWidth = " + Game.GP.GameWidth);
		System.log("Game.GP.GameHeight = " + Game.GP.GameHeight);
		C.Car = {
			X: Game.GP.CarRadius + Math.random() * (Game.GP.GameWidth - 2 * Game.GP.CarRadius),
			Y: Game.GP.CarRadius + Math.random() * (Game.GP.GameHeight - 2 * Game.GP.CarRadius),
			VX: 0,
			VY: 0,
			OR: 0,
			// Put a reasonable length restriction on usernames.
			// Usernames will display to all players.
			Name: Message.Data.toString().substring(0,10)
		};
		
		System.log("X START = " + C.Car.X);
		System.log("Y START = " + C.Car.Y);
		
		// Initialize the input bitfield.
		C.KeysPressed = 0;
		System.log(C.Car.Name + " spawned a car!");
		
		SendGameState();
		break;
		
		case "U":
			
			if (typeof C.KeysPressed === "undefined")
			{
				break;
			}
			if (Message.Data == 37)
			{
				C.KeysPressed &= ~2;
			}
			else if (Message.Data == 39)
			{
				C.KeysPressed &= ~4;
			}
			else if (Message.Data == 38)
			{
				C.KeysPressed &= ~1;
			}
			break;
			
		case "D":
			
			if (typeof C.KeysPressed === "undefined")
			{
				break;
			}
			if (Message.Data == 37)
			{
				C.KeysPressed |= 2;
			}
			else if (Message.Data == 39)
			{
				C.KeysPressed |= 4;
			}
			else if (Message.Data == 38)
			{
				C.KeysPressed |= 1;
			}
			break;
		}
	}
	
function SendGameState()
{
		var CarData = [];
		var Indices = {};
		
		// Collect all the car objects to be sent out to the clients
		for (var ID in Connections)
		{
			// Some users may not have Car Objects yet (if they havn't done the handshake)
			var C = Connections[ID];
			
			if (!C.Car) continue;
			
			CarData.push(C.Car);
			
			// Each user will be sent the same list of car objects, but needs to be
			// able to pick out his car form the pack. Here we take notes of the 
			// index that belongs to him.
			Indices[ID] = CarData.length - 1;
		}
		
		// Go through all the connections and send them personalized messages.
		// Each user gets the list of all the cars, but also the index of his
		// car in that list.
		for (var ID in Connections)
		{
			Connections[ID].sendUTF(JSON.stringify({ MyIndex: Indices[ID], Cars: CarData}));
		}
	}
	
// Set Up game loop
setInterval(function()
	{
		// Make a copy of the car data suitable for RunGameFrame.
		var Cars = [];
		
		for (var ID in Connections)
		{
			var C = Connections[ID];
			
			if (!C.Car) continue;
			
			Cars.push(C.Car);
			
			if (C.KeysPressed & 2)
			{
				C.Car.OR -= Game.GP.TurnSpeed;
			}
			if (C.KeysPressed & 4)
			{
				C.Car.OR += Game.GP.TurnSpeed;
			}
			if (C.KeysPressed & 1)
			{
				C.Car.VX += Game.GP.Acceleration * Math.sin(C.Car.OR);
				C.Car.VY -= Game.GP.Acceleration * Math.cos(C.Car.OR);
			}
		}
		
		Game.RunGameFrame(Cars);
		
		// Increment the game frame, which is only used to time the
		// SendGameState calls.
		Frame = (Frame + 1) % FramesPerGameStateTransmission;
		
		if (Frame == 0)
		{
			SendGameState();
		}
	},
	Game.GP.GameFrameTime
	);