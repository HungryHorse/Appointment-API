const http = require('http');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const cryptoRandomString = require('crypto-random-string');
const bodyParser = require('body-parser');
const fs = require('fs');
const mongoose = require('mongoose');

const PORT = 9000;

/*  
	MongoDB database set up and initialisation using mongoose middleware
	The following code  is used to connect to the server and populate it with any new data from
	the data.json file.
*/

mongoose.connect('mongodb+srv://JackBrewer:2ShHXqttQykzwUZ@appointment-api-cluster.xcvau.mongodb.net/appointment-api-cluster?retryWrites=true&w=majority', {useNewUrlParser: true, useUnifiedTopology: true});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("Database connected");
});

// The schema for the creation of a new counsellor
const counsellorSchema = new mongoose.Schema({
	counsellor_id: String,
	first_name: String,
	last_name: String,
	appointment_types: [String],
	appointment_mediums: [String],
	availability: [{id: String, datetime: String}]
})

//Initialisation of the model that stores counsellors
const Counsellor = mongoose.model('Counsellor', counsellorSchema);

//This function updates any counsellors that already exist with the data from data.json and using 
//upsert it will create new entries for counsellors that don't exist
async function createNewCounsellor(counseller) {
	let filter = { "counsellor_id": counseller.counsellor_id };

	let existingCounsellor = await Counsellor.findOne(filter);

	if(existingCounsellor){
		counseller.availability = counseller.availability.concat(existingCounsellor.availability);
	}

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

//This function reads in the json data from data.json and passes it to the createNewCounsellor function
function readInData(){
	fs.readFile('data.json', 'utf8', function(err, data) {

		let JSONdata = JSON.parse(data);

    	for (let i = 0; i < JSONdata.length; i++) {
    		createNewCounsellor(JSONdata[i]);
    	}
  	});
}

//Calls readInData, if the data base is never being updated via json after the first initialisation
//then the read in data and it's call become redundant.
readInData();

/*
	Functions used to interact with the database during run time operations. This includes schema 
	attached methods and functions for general db searching.
*/

//Generates a new random id using the crypto-random-string middle ware
function genNewID() {
	return cryptoRandomString({length: 22, type: 'alphanumeric'});
}

//This function checks the data passed into it and if accepted attempts to
//add a date to the counsellors availability. If the data already exists
//or the data is in the improper format the function returns an erorr string.
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

//This function finds and returns all dates and times that this counsellor is 
//available between the given start and end date in the form of a js object array.
//The object has properties for id, name and the date, this allows for a more readable output.   
counsellorSchema.methods.findAvailableDates = function(startDate, endDate){
	return new Promise(dates => {

		let appointmentsBetweenDates = [];

		for (var i = 0; i < this.availability.length; i++) {

			let date = new Date(this.availability[i].datetime);

			if(date.getTime() >= startDate.getTime() && date.getTime() <= endDate.getTime()){

				appointmentsBetweenDates.push({
					"counsellor_id": this.counsellor_id,
					"counsellor_name": this.first_name + " " + this.last_name,
					"datetime": date.toString()
				});
			}
		}

		if(appointmentsBetweenDates.length > 1){
			dates(appointmentsBetweenDates);
		}
	});
}

//Given an appointment type and appointment medium this function will return all
//counsellors that can perform that type of appointment using the given medium.
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

/*
	Express options, functions and API implementation
*/

//Options for express
app.use(express.static('./'));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Server start up
server.listen(PORT, function() {
    console.log("Server running at: http://localhost:" + PORT)
});

//Server entry entry point
app.get('/', function(req,res){
	res.send("Welcome to the appointment API");
})

app.get('/checkAvailability', async function(req,res){

	let body = req.body;
	let appointmentType = body.appointment_type;
	let appointmentMedium = body.appointment_medium;

	let startDate = new Date(body.start_date);
	let endDate = new Date(body.end_date);

	//Used to check if the dates passed are valid as dates, if either date is 
	//not valid the server responds with a 422 (Unprocessable Entity) error.
	if (isNaN(startDate.getTime())) {  
		res.status(422).send('Start date is not valid');
		return;
  	}

  	if (isNaN(endDate.getTime())) {  
		res.status(422).send('End date is not valid');
		return;
  	}

  	//An array of counsellors that have the ability to perform an appointment 
  	//of the type and medium specified
	let potentialCounsellors = await findCounsellorsByAppointmentTypeAndMedium(appointmentType, appointmentMedium);
	let potentialAppointments = [];

	if(potentialCounsellors){
		for (var i = 0; i < potentialCounsellors.length; i++) {

			let potentialAppointment = await potentialCounsellors[i].findAvailableDates(startDate, endDate);

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

	let counsellor = await Counsellor.findOne({"counsellor_id": counsellorId});

	if(!counsellor){
		res.status(404).send("Counsellor with id: " + counsellorId + " not found");
		return;
	}

	for (var i =  0; i < dates.length; i++) {

		let addedAvailability = await counsellor.addAvailability(dates[i]);

		//Logs the promise response from the addAvailability to the server console
		console.log(addedAvailability);

		if(addedAvailability === "Invalid date"){
			res.status(422).send("Date " + (i + 1) + " was invalid");
			return;
		}
	}

	res.status(200).send("All dates successfully added");
})