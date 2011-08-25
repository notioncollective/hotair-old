var t = {
	user: 'tweetcongress',
	r_list: 'republican',
	d_list: 'democrats',
	count: 20,
	page: 0,
	r: function(page, callback) {
		this.getListData(this.user, this.r_list, this.count, page, callback);
	},
	d: function(page, callback) {
		this.getListData(this.user, this.d_list, this.count, page, callback);		
	},
	getListData: function(u,l,c,p,cb) {
			// Doucmentation: https://dev.twitter.com/docs/api/1/get/lists/statuses
			uri='https://api.twitter.com/1/lists/statuses.json?owner_screen_name='+u+'&slug='+l+'&count='+c+'&page='+p+'&callback=?';
			$.getJSON(uri, function(r){cb(r);});
	}
}

var republicans = t.r(1, function(response) {
	console.log("Republicans loaded!");
	console.log(response);
});

var democrats = t.d(1, function(response) {
	console.log("Democrats loaded!")
	console.log(response);
});

