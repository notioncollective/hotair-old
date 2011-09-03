/**
 * HA (Hot Air) parent namespace for the game
 */
var HA = {}

/**
 * HA.t namespace accesses the twitter API.
 * IMPORTANT: must set the callback property for it to work correctly.
 */
HA.t = {
	// this callback needs to be set
	callback: null,
	user: 'tweetcongress',
	r_list: 'republican',
	d_list: 'democrats',
	count: 20,
	page: 0,
	r: [],
	d: [],
	get_page: function(page) {
		if(this.callback == null) {
			console.log("ERROR: You need to set the callback function");
			return;
		}
		// reset result sets
		r = []; d = [];
		// get republicans
		this.q(this.user, this.r_list, this.count, page, {type:'r'}, this.page_return);
		// get dems
		this.q(this.user, this.d_list, this.count, page, {type:'d'}, this.page_return);
	},
	page_return: function(response, options, self) {
		self[options.type] = response;
		if(self.d.length > 0 && self.r.length > 0) {
			// this callback needs to be set manually
			// also, explicitly using 't' because of
			// closure weirdness
			self.callback({
				'republicans':self.r,
				'democrats':self.d
			});
		}
	},

	/**
	 * This method actually calls the Twitter Lists API. It takes a callback method with three parameters: response, configiration object, and a reference to the parent object.
	 * Twitter API documentation: https://dev.twitter.com/docs/api/1/get/lists/statuses
	 * @param String u Twitter user that maintains the list
	 * @param String l Name of the twitter list
	 * @param Int c Count of tweets requested
	 * @param Int p Page of tweets to request
	 * @param String o Object with additional configuraton options
	 * @param String cb Callback method
	 */
	
	q: function(u,l,c,p,o,cb) {
			var self = this;
			var uri='https://api.twitter.com/1/lists/statuses.json?owner_screen_name='+u+'&slug='+l+'&count='+c+'&page='+p+'&callback=?';
			$.getJSON(uri, function(r){cb(r,o,self);});
	},
}

/**
 * HA.g namespace contains all state information, etc. for the game.
 */
HA.g = {
	fps: 24, // frames per second
	l: 1, // level
	level_loaded: false,
	team: "r",
	state: 1, // 1=home screen, 2=play
	score: 0,
	data: {  // holds twitter data
		'republicans':[],
		'democrats':[]
	},
	gWidth: window.innerWidth,
	gHeight: window.innerHeight,
	score: 0,
	add_interval: 200,
	d_index: 0,
	r_index: 0,
	canvas: null,
	clock: null,
	
	player: {
		width: 50,
		height: 50,
		color: "#000000"
	},
	
	enemies: [],
	
	bullets: [],
	bulletSize: 3,
	
	init: function() {
		console.log("init");
		this.getLevel(1);
		this.canvas = $('#hotair'); // container for game animation
		this.i = $("#i"); // container for instructions
		this.h = $("#h"); // container for home screen
		this.ld = $("#l"); // container for level flash
		this.t = $("#t"); // container for tweet
		this.s = $("#s"); // container for score
		
		// deal with full-size resizing
		var c = this.canvas[0].getContext('2d');
		c.canvas.width = this.gWidth;
		c.canvas.height = this.gHeight;
		
		// game start options
		$("#ibtn").click(function(e) {
			HA.g.i.slideToggle();
		});
		$("#cR").click(function(e) {
			HA.g.team = "r";
			HA.g.setState(2); // begin game
		});
		$("#cD").click(function(e) {
			HA.g.team = "d";
			HA.g.setState(2); // begin game
		});
	},
	setState: function(s) {
		this.state = s;
		switch(s)
		{
		case 1:
			this.h.fadeIn();
			this.stop();
			console.log("home screen");
			break;
		case 2:
			this.h.fadeOut();
			this.i.fadeOut();
			this.startGame();
			console.log("start game");
			break;
		default:
		
		}
	},
	startGame: function() {
		this.flashLevel();
		// handle mouse location
		$(document).mousedown(this.fire);
		$(document).mousemove(this.captureMouse);
		
		// set animation
		if(this.canvas[0].getContext) {
			this.clock = setInterval(this.callDrawLoop, Math.round(1000/this.fps));
		}
	},
	
	// flash the level at the beginning of the game
	flashLevel: function() {
		HA.g.ld.text("Level "+HA.g.l).fadeIn(100, function() {
			HA.g.ld.fadeOut(1000);
		});
	},
	
	// draw method, overwritten below
	draw: function(c, self) {},

	callDrawLoop: function() {
		var self = HA.g;
		var c = self.canvas[0].getContext('2d');

		// c.clearRect(0, 0, self.canvas.width(), self.canvas.height());
		self.draw(c, self); 
	},
	
	fire: function(e) {
		console.log("Fire at "+e.pageX+", "+e.pageY+"!");
		var xDist = -(HA.g.gWidth/2 - e.pageX);
		var yDist = (HA.g.player.height+HA.g.player.height/2) - e.pageY;
		HA.g.bullets.push({
			x: HA.g.gWidth/2,
			y: HA.g.player.height+HA.g.player.height/2,
			dx: xDist/50,
			dy: 1,
			ay: .5
		});
	},

	captureMouse: function(e) {
		// find closest enemy within 100px of mouse
		var closestE = null;
		var closestD = 1000;
		for(i=0;i<HA.g.enemies.length; i++) {
			var xDist = HA.g.enemies[i].x - e.pageX;
			var yDist = HA.g.enemies[i].y - e.pageY;
			var dist = Math.sqrt((xDist*xDist)+(yDist*yDist));
			// var html = $("<p>"+HA.g.enemies[i].tweet.tweet.text+"</p>");
			if(closestE == null ||  dist < closestD) {
			       closestE = HA.g.enemies[i];
			       closestD = dist; 
			}
			HA.g.enemies[i].selected = false;
		}
		if(closestD < 100) {
			HA.g.t.text(closestE.tweet.tweet.text);
			closestE.selected = true;
		} else {
			HA.g.t.text("");
		}
	},

	addEnemy: function() {
		
	},
	
	getNextTweet: function() {
		// if there are more left
		if(this.d_index < this.data.democrats.length-1 && this.r_index < this.data.republicans.length-1) {
			var tweet = {};
			var type = null;
			// check if dems are done
			if(this.d_index == this.data.democrats.length-1) {
				console.log("no more dems");
				this.r_index++;
				type = 'r';
				tweet = this.data.republicans[this.r_index];
			// check if repubs are done
			} else if (this.r_index == this.data['republicans'].length-1) {
				console.log("no more repubs");
				this.d_index++;
				type = 'd';
				tweet = this.data.democrats[this.d_index];			
			// otherwise, randomize	
			} else if (Math.random()<.5) {
				console.log("heads, republican!")
				this.r_index++;
				type = 'r';
				tweet = this.data.republicans[this.r_index];
			} else {
				console.log("tails, democrat!")
				this.d_index++;
				type = 'd';
				tweet = this.data.democrats[this.d_index];
			}
			console.log(type);
			return {
				'tweet':tweet,
				'type':type
			}
		} else {
			return false;
		}
	},

	getLevel: function(l) {
		this.level_loaded = false;
		HA.t.get_page(l, this._levelLoaded);
	},
	levelLoadedCallback: function(data) {
		var self = HA.g;
		HA.g.level_loaded = true;
		HA.g.data = data;
	},
	stop: function() {
		clearInterval(this.clock);
	}
};

/**
 * HA.gfx contains all the graphic utility methods, etc. Mostly canvas stuff.
 */
HA.gfx = {
	drawCircle: function(context, x, y, radius, color) {
	  context.fillStyle = color;
	  context.beginPath();
	  context.arc(x, y, radius, 0, Math.PI*2, true);
	  context.closePath();
	  context.fill();
	},
	// draws a square, x, y at center!
	drawSquare: function(context, x, y, width, height, color) {
		context.fillStyle = color;
		context.fillRect(x-width/2, y-height/2, width, height);
	},
	clearCanvas: function(context) {
		context.clearRect( 0 , 0 , HA.g.gWidth , HA.g.gHeight );
	},
	drawPlayer: function(context) {
		
	}
};



// DRAW LOOP
// "c" is canvas context
// "game" references the g object
HA.g.draw = function(c, game) {
	
	// clear screen
	HA.gfx.clearCanvas(c);
	
	// set player
	var playerX = (game.canvas.width()/2);
	var playerY = 0 + game.player.height;
	//console.log(playerX, playerY);
	HA.gfx.drawSquare(c, playerX, playerY, game.player.width, game.player.height, game.player.color);
	
	// check if level data is loaded	
	if(game.level_loaded) {
		var o = game.getNextTweet();
		
		// var html = '<p class="'+o.type+'"><a target="_blank" href="http://twitter.com/'+o.tweet.user.screen_name+'/status/'+o.tweet.id_str+'">@'+o.tweet.user.screen_name+'</a>: '+o.tweet.text+'</p>';
		// $('body').append(html);
		
		
		// Enemy initialization - should be added incrementally, based on a setInterval
		
		if(o == false) {
			// game.stop();
		} else {
			// var x = Math.random()*game.canvas.width();
			// var y = Math.random()*game.canvas.height();
			var newColor = o.type == 'r' ? "#F31A18" : "#2A24FF";
			var initX = ((Math.random()-Math.random())*game.canvas.width()/3)+game.canvas.width()/2;
			var initY = Math.random()*1000+game.canvas.height();
			var newEnemyId = game.enemies.length;
			game.enemies[newEnemyId] = {
				tweet: o,
				color: newColor,
				x: initX,
				y: initY,
				r: 10,
				dy: (Math.random()*game.l)+.2
			};
		}
		
		// Enemy animation
		for(i=0;i<game.enemies.length; i++) {
			//console.log(game.enemies[i]);
			game.enemies[i].y -= game.enemies[i].dy;
			if(game.enemies[i].selected) {
				HA.gfx.drawSquare(c, game.enemies[i].x, game.enemies[i].y, 100, 100, "#eeeeee");
			}
			HA.gfx.drawCircle(c, game.enemies[i].x, game.enemies[i].y, game.enemies[i].r, game.enemies[i].color);
		}
		
		// Projectile animation
		for(i=0;i<game.bullets.length; i++) {
			HA.gfx.drawCircle(c, game.bullets[i].x, game.bullets[i].y, game.bulletSize, "#000000");
			game.bullets[i].y += game.bullets[i].dy;
			game.bullets[i].x += game.bullets[i].dx;
			game.bullets[i].dy += game.bullets[i].ay;
		}
		
		// Hit detection
		for(i=0;i<game.enemies.length; i++) {
			
			// projectiles
			for(j=0;j<game.bullets.length; j++) {
				var xDist = game.enemies[i].x - game.bullets[j].x;
				var yDist = game.enemies[i].y - game.bullets[j].y;
				var dist = Math.sqrt((xDist*xDist)+(yDist*yDist));
				if(dist < 50) {
					console.log('hit!');
					game.enemies[i].y = -100;
					if(game.enemies[i].tweet.type == game.team) {
						console.log("OH NO!");
						game.score --;
					} else {
						console.log("SCORE!");
						game.score ++;
					}
					// var html = '<p class="'+game.enemies[i].tweet.tweet.type+'"><a target="_blank" href="http://twitter.com/'+game.enemies[i].tweet.tweet.user.screen_name+'/status/'+game.enemies[i].tweet.tweet.id_str+'">@'+game.enemies[i].tweet.tweet.user.screen_name+'</a>: '+game.enemies[i].tweet.tweet.text+'</p>';
					// 					$('body').append(html);
					
				}
			}
		}
		
		// update score
		game.s.html("<h4>score: "+game.score+"</h4>");
	
	} else { // loading
		
	}

}

$(document).ready(function(){
	HA.t.callback = HA.g.levelLoadedCallback;
	HA.g.init();
});

