const http = require('http');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const cryptoRandomString = require('crypto-random-string');
const bodyParser = require('body-parser');
const fs = require('fs');

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

counsellorSchema.methods.addAvailability = function (passedDate) {
	return new Promise(add => {

		let dateTime = new Date(passedDate);

		if (isNaN(dateTime.getTime())) {  
			add('Invalid date');
			return;
  		}

		if(this.availability.filter(e => e.datetime === dateTime).length > 0){
			add('Availability already exists');
			return;
		}

		let newId = genNewID();

		while(this.availability.filter(e => e.id === newId).length > 0){
  			newId = genNewID();
		}

		this.availability.push({ "id": newId, "datetime": dateTime.toISOString() });
		this.save();

		add('Added new availability');
	});
}

const Counsellor = mongoose.model('Counsellor', counsellorSchema);

async function createNewCounsellor(counseller) {
	let filter = { "counsellor_id": counseller.counsellor_id };

	let update = {
    	"first_name": counseller.first_name,
    	"last_name": counseller.last_name,
    	"appointment_types": counseller.appointment_types,
    	"appointment_mediums": counseller.appointment_mediums,
    	"availability": counseller.availability
	}

	let newCounsellor = await Counsellor.findOneAndUpdate(filter, update, {
		new: true,
		upsert: true,
		useFindAndModify: false
	});
}

function readInData(){
	fs.readFile('data.json', 'utf8', function(err, data) {

		let JSONdata = JSON.parse(data);

    	for (let i = 0; i < JSONdata.length; i++) {
    		createNewCounsellor(JSONdata[i]);
    	}
  	});
}

async function findCounsellorsByAppointmentTypeAndMedium(appointmentType, appointmentMedium){

	let counsellors = await Counsellor.find();

	for (var i = 0; i < counsellors.length; i++) {
		if(!counsellors[i].appointment_types.includes(appointmentType)){
			counsellors.splice(i, 1);
			continue;
		}
		if(!counsellors[i].appointment_mediums.includes(appointmentMedium)){
			counsellors.splice(i, 1);
		}
	}

	return counsellors;
}

async function findAvailableDates(counsellor, startDate, endDate){
	
	let appointmentsBetweenDates = [];

	for (var i = 0; i < counsellor.availability.length; i++) {

		let date = new Date(counsellor.availability[i].datetime);

		if(date.getTime() >= startDate.getTime() && date.getTime() <= endDate.getTime()){

			appointmentsBetweenDates.push({
				"counsellor_id": counsellor.counsellor_id,
				"counsellor_name": counsellor.first_name + " " + counsellor.last_name,
				"datetime": date.toString()
			});
		}
	}

	if(appointmentsBetweenDates.length > 1){
		return appointmentsBetweenDates;
	}
}

readInData();

app.use(express.static('./'));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

server.listen(PORT, function() {
    console.log("Server running at: http://localhost:" + PORT)
});

app.get('/', function(req,res){
	res.send("Welcome to the appointment API");
})

app.get('/checkAvailability', async function(req,res){

	let body = req.body;
	let appointmentType = body.appointment_type;
	let appointmentMedium = body.appointment_medium;

	let startDate = new Date(body.start_date);
	let endDate = new Date(body.end_date);

	if (isNaN(startDate.getTime())) {  
		res.status(422).send('Start date is not valid');
		return;
  	}

  	if (isNaN(endDate.getTime())) {  
		res.status(422).send('End date is not valid');
		return;
  	}

	let potentialCounsellors = await findCounsellorsByAppointmentTypeAndMedium(appointmentType, appointmentMedium);
	let potentialAppointments = [];

	if(potentialCounsellors){
		for (var i = 0; i < potentialCounsellors.length; i++) {

			let potentialAppointment = await findAvailableDates(potentialCounsellors[i], startDate, endDate);

			if(potentialAppointment){
				potentialAppointments.push(potentialAppointment);				
			}
		}
	}
	else{
		res.status(404).send('No appointment times matching these parameters have been found');
		return;
	}

	if(potentialAppointments.length > 0){
		res.send(potentialAppointments);
	}
	else{
		res.status(404).send('No appointment times matching these parameters have been found');
	}
})

app.post('/addAvailability',async function(req,res){
	let body = req.body;
	let counsellorId = body.counsellor_id;
	let dates = body.dates;

	let test = await Counsellor.findOne({"counsellor_id": counsellorId});

	if(!test){
		res.status(404).send("Counsellor with id: " + counsellorId + " not found");
		return;
	}

	for (var i =  0; i < dates.length; i++) {

		let addedAvailability = await test.addAvailability(dates[i]);

		console.log(addedAvailability);
		if(addedAvailability === "Invalid date"){
			res.status(422).send("Date " + (i + 1) + " was invalid");
			return;
		}
	}

	res.status(200).send("All dates successfully added");
})