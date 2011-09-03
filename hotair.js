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
 * HA.dom deals with DOM stuff
 */
HA.dom = {
	ss: $('#startscreen'),
	sb: $('#scoreboard'),
	
	updateScore: function(n) {
		this.sb.html(n);
	},
	
	showTweet: function(tweet, x, y) {
		// TODO: shows tweet next to enemy
	}
}

/**
 * HA.g namespace contains all state information, etc. for the game.
 */
HA.g = {
	fps: 24, // frames per second
	l: 1, // level
	level_loaded: false,
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
	
	mouseX: 0,
	mouseY: 0,
	
	player: {
		width: 50,
		height: 50,
		color: "#000000",
		team: null, // set to either 'r' or 'd'
		score: 0
	},
	
	enemies: [],
	
	bullets: [],
	bulletSize: 3,

	// timing, etc.
	clock: null,
	isPaused: false,

	
	init: function() {
		console.log("init");
		this.getLevel(1);
		this.canvas = $('#hotair');
		
		// deal with full-size resizing
		var c = this.canvas[0].getContext('2d');
		c.canvas.width = this.gWidth;
		c.canvas.height = this.gHeight;
		
		// this.start();
		$('#play_republican').click(function(e){
			e.preventDefault();
			HA.g.player.team = 'r';
			HA.dom.ss.hide();
			HA.g.start();
		});
		// this.start();
		$('#play_democrat').click(function(e){
			e.preventDefault();
			HA.g.player.team = 'd';
			HA.dom.ss.hide();
			HA.g.start();
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
			dx: xDist/30,
			dy: 1,
			ay: .5
		});
	},
	
	captureMouse: function(e) {
		HA.g.mouseX = e.pageX;
		HA.g.mouseY = e.pageY;
	},
	
	getNextTweet: function() {
		// if there are more left
		if(this.d_index < this.data.democrats.length-1 && this.r_index < this.data.republicans.length-1) {
			var tweet = {};
			var type = null;
			// check if dems are done
			if(this.d_index == this.data.democrats.length-1) {
				// console.log("no more dems");
				this.r_index++;
				type = 'r';
				tweet = this.data.republicans[this.r_index];
			// check if repubs are done
			} else if (this.r_index == this.data['republicans'].length-1) {
				// console.log("no more repubs");
				this.d_index++;
				type = 'd';
				tweet = this.data.democrats[this.d_index];			
			// otherwise, randomize	
			} else if (Math.random()<.5) {
				// console.log("heads, republican!")
				this.r_index++;
				type = 'r';
				tweet = this.data.republicans[this.r_index];
			} else {
				// console.log("tails, democrat!")
				this.d_index++;
				type = 'd';
				tweet = this.data.democrats[this.d_index];
			}
			// console.log(type);
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
	
	// start new game
	start: function() {
		console.log("Start new game");
		// handle mouse location
		// c.canvas.addEventListener('mousedown', this.fire, false);
		$(document).mousedown(this.fire);
		$(document).mousemove(this.captureMouse);
		
		// will handle keypresses
		$(document).keypress(function(e) {
			console.log(this);
			switch(e.which) {
				
				// SPACE BAR
				case 32:
					if(HA.g.isPaused) {
						HA.g.play();
						// TODO: hide pause screen
					} else {
						HA.g.pause();
						// TODO: show pause screen
					}
					break;
			}
		});
		
		
		if(this.canvas[0].getContext) {
			this.play();
		}
	},
	// stop game
	stop: function() {
		clearInterval(this.clock);
		// TODO: reset game, show start screen again
	},
	// pause game
	pause: function() {
		this.isPaused = true;
		clearInterval(this.clock);
	},
	// unpause game
	play: function() {
		this.isPaused = false;
		this.clock = setInterval(this.callDrawLoop, Math.round(1000/this.fps));
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
	drawSquare: function(context, x, y, width, height, color) {
		context.fillStyle = color;
		context.fillRect(x, y, width, height);
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
	var playerX = (game.canvas.width()/2) - (game.player.width/2);
	var playerY = 0 + game.player.height;
	//console.log(playerX, playerY);
	switch(game.player.team) {
		case 'r':
			game.player.color = "#F31A18";
			break;
		case 'd':
			game.player.color = "#2A24FF";
			break;
	}
	HA.gfx.drawSquare(c, playerX, playerY, game.player.width, game.player.height, game.player.color);
	
	// check if level data is loaded	
	if(game.level_loaded) {
		var o = game.getNextTweet();
		
		// var html = '<p class="'+o.type+'"><a target="_blank" href="http://twitter.com/'+o.tweet.user.screen_name+'/status/'+o.tweet.id_str+'">@'+o.tweet.user.screen_name+'</a>: '+o.tweet.text+'</p>';
		// $('body').append(html);
		
		
		// Enemy initialization
		if(o == false) {
			// game.stop();
		} else {
			// var x = Math.random()*game.canvas.width();
			// var y = Math.random()*game.canvas.height();
			var newColor = o.type == 'r' ? "#F31A18" : "#2A24FF";
			var initX = Math.random()*game.canvas.width();
			var initY = Math.random()*1000+game.canvas.height();
			var newEnemyId = game.enemies.length;
			game.enemies[newEnemyId] = {
				tweet: o,
				color: newColor,
				x: initX,
				y: initY,
				r: 50,
				dy: (Math.random()*game.l)+.2,
				team: o.type,
			};
		}
		
		// Enemy animation
		for(i=0;i<game.enemies.length; i++) {
			//console.log(game.enemies[i]);
			HA.gfx.drawCircle(c, game.enemies[i].x, game.enemies[i].y, game.enemies[i].r, game.enemies[i].color);
			game.enemies[i].y -= game.enemies[i].dy;
			if(game.enemies[i].y < -50) {
				game.enemies.splice(i, 1);
			}
		}
		
		// Projectile animation
		for(i=0;i<game.bullets.length; i++) {
			HA.gfx.drawCircle(c, game.bullets[i].x, game.bullets[i].y, game.bulletSize, "#000000");
			game.bullets[i].y += game.bullets[i].dy;
			game.bullets[i].x += game.bullets[i].dx;
			game.bullets[i].dy += game.bullets[i].ay;
		}
		
		// Hit detection & mouse overlap detection
		for(i=0;i<game.enemies.length; i++) {
			
			var xMDist = game.enemies[i].x - game.mouseX;
			var yMDist = game.enemies[i].y - game.mouseY;
			// console.log(xMDist);
			var mouseDist = Math.sqrt((xMDist*xMDist)+(yMDist*yMDist));
			if(mouseDist < 50) {
				// console.log("overlap!");
				HA.gfx.drawCircle(c, game.mouseX, game.mouseY, 20, "#000000");
			}
						
			for(j=0;j<game.bullets.length; j++) {
				var xDist = game.enemies[i].x - game.bullets[j].x;
				var yDist = game.enemies[i].y - game.bullets[j].y;
				var dist = Math.sqrt((xDist*xDist)+(yDist*yDist));
				if(dist < 50) {
					console.log('hit!');
					//game.enemies[i].y = -50;
					game.enemies.splice(i, 1);
					var html = '<p class="'+game.enemies[i].tweet.tweet.type+'"><a target="_blank" href="http://twitter.com/'+game.enemies[i].tweet.tweet.user.screen_name+'/status/'+game.enemies[i].tweet.tweet.id_str+'">@'+game.enemies[i].tweet.tweet.user.screen_name+'</a>: '+game.enemies[i].tweet.tweet.text+'</p>';
					$('body').append(html);
					if(game.player.team != game.enemies[i].team) {
						game.player.score++
						HA.dom.updateScore(game.player.score);
					} else {
						game.player.score--
						HA.dom.updateScore(game.player.score);
					}
					game.bullets.splice(j, 1);
				}
			}
		}
	
	} else { // loading
		
	}

}

$(document).ready(function(){
	HA.t.callback = HA.g.levelLoadedCallback;
	HA.g.init();
});

