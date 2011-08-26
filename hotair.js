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
	// Doucmentation: https://dev.twitter.com/docs/api/1/get/lists/statuses
	q: function(u,l,c,p,o,cb) {
			var self = this;
			var uri='https://api.twitter.com/1/lists/statuses.json?owner_screen_name='+u+'&slug='+l+'&count='+c+'&page='+p+'&callback=?';
			$.getJSON(uri, function(r){cb(r,o,self);});
	},
}

// g is for THE GAME
var g = {
	start: function() {
		this.getLevel(1);
	},
	getLevel: function(l) {
		t.get_page(l, this.levelLoaded);
	},
	levelLoaded: function(data) {
		console.log(data);
	}
}

t.callback = g.levelLoaded;
g.start();
