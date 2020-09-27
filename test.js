const mocha = require("mocha")
const chai = require("chai");
const chaiHttp = require("chai-http");
const app = require("./index.js").app;
chai.use(chaiHttp);


describe("Basic Entry To API", function(){
	it('should connect to the base get end point of the server', function(){
		chai.request('http://localhost:9000').get("/").end(function(err, res){
			chai.assert.equal(res.status, 200);
		});
	});
});

describe("GET endpoint", function(){
	it("should respond with a status code of 200", function(done){
		this.timeout(100000);
		chai.request('http://localhost:9000').get("/checkAvailability")
		.send({
			"start_date" : "2020-10-25T19:00:00.000Z",
    		"end_date" : "2020-11-20T12:00:00.000Z",
    		"appointment_type" : "consultation",
   			"appointment_medium" : "phone"
   		})
   		.end(function(err, res){
			chai.assert.equal(res.status, 200);
			done();
		});
	});
	it("should respond with a status code of 422 (start date is invalid)", function(done){
		this.timeout(20000);
		chai.request('http://localhost:9000').get("/checkAvailability")
		.send({
    		"start_date" : "test",
    		"end_date" : "2020-11-20T12:00:00.000Z",
    		"appointment_type" : "consultation",
    		"appointment_medium" : "phone"
		})
		.end(function(err, res){
			chai.assert.equal(res.status, 422);
			done();
		});
	});
	it("should respond with a status code of 422 (end date is invalid)", function(done){
		this.timeout(20000);
		chai.request('http://localhost:9000').get("/checkAvailability")
		.send({
    		"start_date" : "2020-11-20T12:00:00.000Z",
    		"end_date" : "test",
    		"appointment_type" : "consultation",
    		"appointment_medium" : "phone"
		})
		.end(function(err, res){
			chai.assert.equal(res.status, 422);
			done();
		});
	});
	it("should respond with a status code of 404 (No counsellors with this both this type and medium have been found)", function(done){
		this.timeout(20000);
		chai.request('http://localhost:9000').get("/checkAvailability")
		.send({
    		"start_date" : "2020-11-20T12:00:00.000Z",
    		"end_date" : "2020-11-20T12:00:00.000Z",
    		"appointment_type" : "test",
    		"appointment_medium" : "phone"
		})
		.end(function(err, res){
			chai.assert.equal(res.status, 404);
			done();
		});
	});
	it("should respond with a status code of 404 (No appointment times matching these parameters have been found)", function(done){
		this.timeout(20000);
		chai.request('http://localhost:9000').get("/checkAvailability")
		.send({
    		"start_date" : "2010-11-20T12:00:00.000Z",
    		"end_date" : "2010-11-20T12:00:00.000Z",
    		"appointment_type" : "consultation",
    		"appointment_medium" : "phone"
		})
		.end(function(err, res){
			chai.assert.equal(res.status, 404);
			done();
		});
	});
});

describe("POST endpoint", function(){
	it("should respond with a status code of 200", function(done){
		chai.request('http://localhost:9000').post("/addAvailability")
		.send({
    		"counsellor_id": "79590113-a6a3-45c3-9d5e-28472a8c4a74",
    		"dates": ["2021-10-10T20:00:00.000Z"],
    		"save": false
		})
		.end(function(err, res){
			chai.assert.equal(res.status, 200);
			done();
		});
	});
	it("should respond with a status code of 409 (Availability already exists)", function(done){
		chai.request('http://localhost:9000').post("/addAvailability")
		.send({
    		"counsellor_id": "79590113-a6a3-45c3-9d5e-28472a8c4a74",
    		"dates": ["2020-10-10T20:00:00.000Z"],
    		"save": true
		})
		.end(function(err, res){
			chai.assert.equal(res.status, 409);
			done();
		});
	});
	it("should respond with a status code of 404 (Counsellor with id: test not found)", function(done){
		chai.request('http://localhost:9000').post("/addAvailability")
		.send({
    		"counsellor_id": "test",
    		"dates": ["2020-10-10T20:00:00.000Z"],
    		"save": true
		})
		.end(function(err, res){
			chai.assert.equal(res.status, 404);
			done();
		});
	});
	it("should respond with a status code of 422 (Date 1 was invalid)", function(done){
		chai.request('http://localhost:9000').post("/addAvailability")
		.send({
    		"counsellor_id": "79590113-a6a3-45c3-9d5e-28472a8c4a74",
    		"dates": ["test"],
    		"save": true
		})
		.end(function(err, res){
			chai.assert.equal(res.status, 422);
			done();
		});
	});
});
