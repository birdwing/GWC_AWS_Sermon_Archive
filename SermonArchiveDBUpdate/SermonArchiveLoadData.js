var AWS = require("aws-sdk");
var fs = require('fs');

AWS.config.update({
	region: "us-east-1",
	endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

console.log("Importing Sermons into DynamoDB. Please wait.");

var allSermons = JSON.parse(fs.readFileSync('PageSearchIndex.json', 'utf8'));
allSermons.forEach(function(sermon) {
	var year = parseInt(sermon.date.substring(0,4));
	var params = {
		TableName: "Sermons",
		Item: {
			"year": year,
			"date": sermon.date,
			"info": {
				"title": sermon.title,
				"speaker": sermon.speaker,
				"scripture": sermon.scripture,
				"videoURL": sermon.videoURL,
				"aurioURL": sermon.audioURL
			}
		}
	};

	docClient.put(params, function(err, data) {
		if (err) {
			console.error("Unable to add sermon", sermon.title, ". Error JSON:", JSON.stringify(err, null, 2));
		} else {
			console.log("PutItem succeeded:", sermon.title);
		}
	});
});
