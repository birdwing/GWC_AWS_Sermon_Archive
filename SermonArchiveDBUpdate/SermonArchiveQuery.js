var AWS = require("aws-sdk");
var myArgs = process.argv.slice(2);

AWS.config.update({
	region: "us-east-1",
	endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

if (myArgs.length > 0) {
	var year = parseInt(myArgs[0]);
} else {
	var year = 2019;
}

console.log("Querying for sermons from " + year + ".");

var params = {
	TableName : "Sermons",
	KeyConditionExpression: "#yr = :yyyy",
	ExpressionAttributeNames: {
		"#yr": "year"
	},
	ExpressionAttributeValues: {
		":yyyy": year
	},
	ScanIndexForward: false,
	Limit: 5,
}

docClient.query(params, function(err, data) {
	if (err) {
		console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
	} else {
		console.log("Query succeeded.");
		data.Items.forEach(function(item) {
			console.log(" -", item.info.speaker + ": " + item.date);
		});
		console.log(data.LastEvaluatedKey);
	}
});
