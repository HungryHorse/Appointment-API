const fs = require('fs');

function createNewCounsellor(counseller) {	
	
}

function readInData(){
	fs.readFile('data.json', 'utf8', function(err, data) {

		let JSONdata = JSON.parse(data);

    	for (let i = 0; i < JSONdata.length; i++) {
    		createNewCounsellor(JSONdata[i]);
    	}
  	});
}

readInData();