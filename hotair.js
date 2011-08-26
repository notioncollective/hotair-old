// t is for twitter
var t = {
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
	// Twitter Lists API call
	// Documentation: https://dev.twitter.com/docs/api/1/get/lists/statuses
	q: function(u,l,c,p,o,cb) {
			var self = this;
			var uri='https://api.twitter.com/1/lists/statuses.json?owner_screen_name='+u+'&slug='+l+'&count='+c+'&page='+p+'&callback=?';
			$.getJSON(uri, function(r){cb(r,o,self);});
	},
}

// g is for THE GAME
var g = {
	fps: 12, // frames per second
	l: 1, // level
	level_loaded: false,
	data: {  // holds twitter data
		'republicans':[],
		'democrats':[]
	},
	score: 0,
	add_interval: 200,
	d_index: 0,
	r_index: 0,
	canvas: null,
	clock: null,
	
	init: function() {
		console.log("init");
		this.getLevel(1);
		this.canvas = $('#hotair');
		if(this.canvas[0].getContext) {
			this.clock = setInterval(this.drawCallback, Math.round(1000/this.fps));
		}
	},
	
	// draw method
	draw: function(c, self) {
		// check if level data is loaded
		if(self.level_loaded) {
			var o = self.getNextTweet();
			if(o == false) {
				self.stop();
			} else {
				var html = '<p class="'+o.type+'"><a target="_blank" href="http://twitter.com/'+o.tweet.user.screen_name+'/status/'+o.tweet.id_str+'">@'+o.tweet.user.screen_name+'</a>: '+o.tweet.text+'</p>';
				$('body').append(html);
			}
		} else { // stall
			console.log("stall");	
		}
		
		var showTweet = function() {
			
		}
	},
	
	drawCallback: function() {
		var self = g;
		var c = self.canvas[0].getContext('2d');
		self.draw(c, self); 
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
		t.get_page(l, this._levelLoaded);
	},
	levelLoadedCallback: function(data) {
		var self = g;
		g.level_loaded = true;
		g.data = data;
	},
	stop: function() {
		clearInterval(this.clock);
	}
}

t.callback = g.levelLoadedCallback;
g.init();
