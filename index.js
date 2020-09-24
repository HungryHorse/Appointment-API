const http = require('http');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const cryptoRandomString = require('crypto-random-string');const bodyParser = require('body-parser');

const PORT = 9000;

const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://JackBrewer:2ShHXqttQykzwUZ@appointment-api-cluster.xcvau.mongodb.net/appointment-api-cluster?retryWrites=true&w=majority', {useNewUrlParser: true, useUnifiedTopology: true});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("Database connected");
});

const counsellorSchema = new mongoose.Schema({
	counsellor_id: String,
	first_name: String,
	last_name: String,
	appointment_types: [String],
	appointment_mediums: [String],
	availability: [{id: String, datetime: String}]
})

function genNewID() {
	return cryptoRandomString({length: 22, type: 'alphanumeric'});
}

counsellorSchema.methods.addAvailability = function (dateTimes) {
	return new Promise(add => {
		let newId = genNewID();

		while(this.availability.includes({id: newId})){
			newId = genNewID();
		}

		this.availability.push({ "id": newId, "datetime": dateTimes });

		add('Added new availability');
	});
}

const Counsellor = mongoose.model('Counsellor', counsellorSchema);

const test = new Counsellor({
    "counsellor_id": "79590113-a6a3-45c3-9d5e-28472a8c4a74",
    "first_name": "Lettie",
    "last_name": "Wolland",
    "appointment_types": ["consultation", "one_off"],
    "appointment_mediums": ["phone"],
    "availability": [
    {
        "id": "88ZAQZbhu2Hf7CyVUmASLM",
        "datetime": "2020-10-25T19:00:00.000Z"
    }]
 });

app.use(express.static('./'));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

server.listen(PORT, function() {
    console.log("Server running at: http://localhost:" + PORT)
});

app.get('/', function(req,res){
	res.send("Welcome to the appointment API");
})

app.get('/checkAvailability', function(req,res){

	let body = req.body;
	let dateRange = body.date_range;
	let appointmentType = body.appointment_type;
	let appointmentMedium = body.appointment_medium;

	dateRange = dateRange.split('-');

	let startDate = dateRange[0];
	let endDate = dateRange[1];

	res.send({"Start Date":startDate, "End Date":endDate});
})

app.post('/addAvailability',async function(req,res){
	let body = req.body;
	let counsellorId = body.counsellor_id;
	let dates = body.dates;

	for (let i = 0; i < dates.length; i++) {
		let addAvailable = await test.addAvailability(dates[i]);
		console.log(addAvailable);
	}

	res.send(test);
})