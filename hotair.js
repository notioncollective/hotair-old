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
	page: 0,
	r: [],
	d: [],
	all: [],
	get_page: function(page) {
		if(this.callback == null) {
			console.log("ERROR: You need to set the callback function");
			return;
		}
		// reset result sets
		this.r = []; this.d = [];
		// get republicans
		console.log("COUNT: "+HA.g.levels[page].nt);
		this.q(this.user, this.r_list, HA.g.levels[page].nt, page, {type:'r'}, this.page_return);
		// get dems
		this.q(this.user, this.d_list, HA.g.levels[page].nt, page, {type:'d'}, this.page_return);
	},
	page_return: function(response, options, self) {
		$.each(response, function(i, val) {
			val.type = options.type;
		});
		self[options.type] = response;
		if(self.d.length > 0 && self.r.length > 0) {
			// merge the two arrays
			self.all = self.shuffle(self.d.concat(self.r));
			self.callback(self.all);
			return;
			// this callback needs to be set manually
			// also, explicitly using 't' because of
			// closure weirdness
			self.callback({
				'republicans':self.r,
				'democrats':self.d
			});
		}
	},
	shuffle: function(sourceArray) {
	    for (var n = 0; n < sourceArray.length - 1; n++) {
	        var k = n + Math.floor(Math.random() * (sourceArray.length - n));
	        var temp = sourceArray[k];
	        sourceArray[k] = sourceArray[n];
	        sourceArray[n] = temp;
	    }
		return sourceArray;
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
			var uri='https://api.twitter.com/1/lists/statuses.json?owner_screen_name='+u+'&slug='+l+'&per_page='+c+'&page='+p+'&callback=?';
			$.getJSON(uri, function(r){cb(r,o,self);});
	},
}

/**
 * HA.dom deals with DOM stuff
 */
HA.dom = {
	ss: $('#h'),
	sb: $('#sb'),
	i: $('#i'),
	ld: $("#l"), 	// container for level flash
	h: $("#h"), 	// container for home screen
	t: $("#t"), 	// container for tweet
	
	updateScore: function(n) {
		this.sb.html("<h4>Score: "+n+"</h4>");
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
	state: 1, // 1=home screen, 2=play
	data: [],  // holds twitter data
	gWidth: window.innerWidth,
	gHeight: window.innerHeight,
	sInc: 100,
	add_interval: 200,
	t_index: 0,
	canvas: null,

	// timing, etc.
	clock: null,
	isPaused: false,
	
	player: {
		team: "r",
		width: 50,
		height: 50,
		color: "#000000",
		score: 0
	},
	
	enemies: [],
	
	bullets: [],
	bulletSize: 3,
	
	// level parameters
	levels: {
		1: {
			dy: 2, // speed
			nt: 2 // number of tweets per party in this level	
		},
		2: {
			dy: 4,
			nt: 2
		},
		3: {
			dy: 6,
			nt: 2
		}
	},
	
	init: function() {
		console.log("init");
		this.canvas = $('#hotair'); // container for game animation
		this.canvas[0].mozImageSmoothingEnabled=false; // turn off anti-aliasing in ff
		
		// deal with full-size resizing
		var c = this.canvas[0].getContext('2d');
		c.canvas.width = this.gWidth;
		c.canvas.height = this.gHeight;
		
		// game start options
		$("#ibtn").click(function(e) {
			HA.dom.i.slideToggle();
			return false;
		});
		$("#cR").click(function(e) {
			HA.g.player.team = "r";
			HA.g.startGame();
		});
		$("#cD").click(function(e) {
			HA.g.player.team = "d";
			HA.g.startGame();
		});
	},
	
	startGame: function() {
		
		// handle mouse location
		$(document).mousedown(this.fire);
		$(document).mousemove(this.captureMouse);
		
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
		this.getLevel(this.l);
	},
	
	startLevel: function() {
		// reset things
		this.t_index = 0;
		
		// set animation
		this.addEnemy();
		if(this.canvas[0].getContext) {
			this.play();
			this.flashLevel();
			HA.dom.h.fadeOut();
			HA.dom.i.slideUp();
			HA.dom.sb.fadeIn();
		}
	},
	
	// flash the level at the beginning of the game
	flashLevel: function() {
		var text = "Level "+HA.g.l;
		HA.g.flashMessage(text);
	},
	
	flashMessage: function(message) {
		HA.dom.ld.text(message).fadeIn(1000).delay(800).fadeOut(1000);
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
		if(closestD < 200) {
			HA.dom.t.text(closestE.tweet.tweet.text);
			closestE.selected = true;
		} else {
			HA.dom.t.text("");
		}
	},

	addEnemy: function() {
		var o = HA.g.getNextTweet();
		// Enemy initialization - should be added incrementally, based on a setInterval
		
		if(o == false) {
			// game.stop();
		} else {
			// var x = Math.random()*game.canvas.width();
			// var y = Math.random()*game.canvas.height();
			// var newColor = o.type == 'r' ? "#F31A18" : "#2A24FF";
			var newColor = "#00aa00";
			var initX = ((Math.random()-Math.random())*HA.g.canvas.width()/3)+HA.g.canvas.width()/2;
			var initY = HA.g.canvas.height()+20;
			var newEnemyId = HA.g.enemies.length;
			var img = new Image();
			img.src = 'img/balloon.gif';
			HA.g.enemies[newEnemyId] = {
				tweet: o,
				color: newColor,
				x: initX,
				y: initY,
				r: 50,
				dy: HA.g.l,
				team: o.type,
				img: img
			};
		}
	},
	
	getNextTweet: function() {
		console.log("GET NEXT TWEET");
		
		if(this.t_index < this.data.length) {
			this.t_index++;
			return {
				'tweet': this.data[this.t_index],
				'type': this.data[this.t_index].type
			}
		}
		return false;
	},

	getLevel: function(l) {
		this.level_loaded = false;
		HA.t.get_page(l);
	},
	
	levelLoadedCallback: function(data) {
		var self = HA.g;
		HA.g.level_loaded = true;
		HA.g.data = data;
		self.startLevel();
	},
	// stop game
	stop: function() {
		clearInterval(this.clock);
		clearInterval(this.eFactor);
		// TODO: reset game, show start screen again
	},
	// pause game
	pause: function() {
		this.isPaused = true;
		clearInterval(this.clock);
		clearInterval(this.eFactory);
	},
	// unpause game
	play: function() {
		this.isPaused = false;
		this.clock = setInterval(this.callDrawLoop, Math.round(1000/this.fps));
		this.eFactory = setInterval(this.addEnemy, 5000);
	}
};

/**
 * HA.gfx contains all the graphic utility methods, etc. Mostly canvas stuff.
 */
HA.gfx = {
	// this is the amount to scale gif images
	gifScale: 2,
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
		
	},
	drawScope: function(context, x, y, width, height, color) {
		HA.gfx.drawSquare(context, x, y, width, height, color);
		context.strokeStyle = "#000";
		context.lineJoin = "round";
		context.lineWidth = 1;
		context.beginPath();
		context.moveTo(x-width/2, y-height/2);
		context.lineTo(x+width/2, y-height/2);
		context.lineTo(x+width/2, y+height/2);
		context.lineTo(x-width/2, y+height/2);
		context.lineTo(x-width/2, y-height/2);
		
		context.moveTo(x-10, y);
		context.lineTo(x+10, y);
		context.moveTo(x, y-10);
		context.lineTo(x, y+10);
		
		context.moveTo(x, y-height/2);
		context.lineTo(x, y-height/2+10);
		context.moveTo(x+width/2, y);
		context.lineTo(x+width/2-10, y);
		context.moveTo(x, y+height/2);
		context.lineTo(x, y+height/2-10);
		context.moveTo(x-width/2, y);
		context.lineTo(x-width/2+10, y);
		//context.endPath();
		context.stroke();
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
	switch(game.player.team) {
		case 'r':
			game.player.color = "#F31A18";
			break;
		case 'd':
			game.player.color = "#2A24FF";
			break;
	}
	HA.gfx.drawSquare(c, playerX, playerY, game.player.width, game.player.height, game.player.color);
	
	
	// check for level end - perhaps there is a better place/way to do this?
	if(game.t_index >= game.data.length && game.enemies.length == 0) {
		game.level_loaded = false;
	}
	
	
	// check if level data is loaded	
	if(game.level_loaded) {
		// Enemies loaded via separate timed loop
		// Enemy animation
		for(i=0;i<game.enemies.length; i++) {
			//console.log(game.enemies[i]);
			if(game.enemies[i].y < -50) {
				game.enemies.splice(i, 1);
				continue;
			}
			
			game.enemies[i].y -= game.levels[game.l].dy;
						
			// game.enemies[i].img.onload = function() { console.log("Ballon img loaded"); };
			
			// getting the image centered
			var imgw, imgh, imgx, imgy;
			// var imgw, imgh, imgx, imgy, imgscale;
			// imgscale = 8;
			imgw = 16*HA.gfx.gifScale;
			imgh =	24*HA.gfx.gifScale;
			imgx = game.enemies[i].x - (imgw / 2);
			imgy = game.enemies[i].y - (imgh / 2);
			
			c.drawImage(game.enemies[i].img, imgx, imgy, imgw, imgh);
						
			 // HA.gfx.drawCircle(c, game.enemies[i].x, game.enemies[i].y, game.nemies[i].r, game.enemies[i].color);
			if(game.enemies[i].selected) {
				HA.gfx.drawScope(c, game.enemies[i].x, game.enemies[i].y, imgw+10, imgh+10, "rgba(220, 230, 220, 0.5)");
				$("#t").offset({ top: imgy, left: imgx+imgw+15}).fadeIn(500);
			} else {
			}
			
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
			var hit = false;
			// projectiles
			for(j=0;j<game.bullets.length; j++) {
				var xDist = game.enemies[i].x - game.bullets[j].x;
				var yDist = game.enemies[i].y - game.bullets[j].y;
				var dist = Math.sqrt((xDist*xDist)+(yDist*yDist));
				// TODO: improve hit detection
				if(dist < (game.enemies[i].img.width*HA.gfx.gifScale)/2 && game.enemies[i].y < game.gHeight) {
					console.log('hit!');
					if(game.enemies[i].team == game.player.team) {
						game.player.score-=game.sInc;
					} else {
						game.player.score+=game.sInc;
					}
					hit = true;
					game.bullets.splice(j, 1);
				}
			}
			if(hit) {
				game.enemies.splice(i, 1);				
			}
		}
		
		// update score
		HA.dom.updateScore(game.player.score);
	
	} else { // loading
		game.l+=1;
		
		if(game.levels[game.l] != undefined) {
			game.pause();
			game.getLevel(game.l);
		} else {
			game.flashMessage('Game Over');
			game.stop();
		}
	}

}

$(document).ready(function(){
	HA.t.callback = HA.g.levelLoadedCallback;
	HA.g.init();
});

