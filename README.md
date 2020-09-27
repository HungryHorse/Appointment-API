# Booking Challenge

## Instructions for use

1. Download the repository.
2. Enter the project directory from the command shell and run the command "npm install", this will install all the node dependancies.
3. Once the dependacies are installed you can start the server locally by running the command "npm start" from the command shell.
4. The server will start on local port 9000 and then connect to the database remotely (The database connection may take a short amount of time).
5. Send commands to the end points with a request following the schema listed below with the data contained within the body of the request: 
    1. GET "/checkAvailability":  
    {
      start_date : String,
      end_date : String,
      appointment_type : String,
      appointment_medium : String
    }
    2. POST "/addAvailability":  
    {
      counsellor_id: String,
      dates: [String],
      save: Bool
    }

6. You can start the test suite by running the command "npm test" from the command shell.

## Technical Choices

### Stack
For the creation of the API I used various different NPM packages, I used the packages becuase they are what is familar to me and have continuing and well documented support.

#### Database
I used MongoDB for the database as that is the data base software that I have the most experience with. It also easily allows for free database hosting and I wanted to try remote hosting as a way to test myself and improve my skills overall.

#### Testing Suite
I used mocha and chai for my testing suite because once again this is the suit I am most familar with and it allows easy http endpoint testing.

#### Coding descicions
In my implimentation of the GET request end point I separated each potential error point into a specific send response. I did this to avoid unnecessary database calls as they are costly and would slow down response times imensily. By sperating the server responses invaild data not only sends a taliored message with the error code it also allows for very fast response times in the case of an error.  

By using a promise for the creation of new availability that returns a response string. This response string can then be processed easily by a switch case statement. The reason for this is it allows for the easy expansion of the response code base if new erorrs or responses need to be sent to the user of the API.

When checking if counsellors are avaibale for the passed appointment type and medium the code removes them from the potential list. This means that garbage collection only needs to remove one list from data rather than the orignal list of found counsellors and the list of appropriate counsellors.
