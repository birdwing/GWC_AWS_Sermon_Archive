var AWS = require("aws-sdk");

AWS.config.update({
	region: "us-east-1",
	endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

var dynamodb = new AWS.DynamoDB();

var params = {
	TableName : "Sermons",
	KeySchema : [
		{ AttributeName: "year", KeyType: "HASH" },
		{ AttributeName: "date", KeyType: "RANGE" }
	],
	AttributeDefinitions: [
		{ AttributeName: "year", AttributeType: "N" },
		{ AttributeName: "date", AttributeType: "S" }
	],
	BillingMode: "PAY_PER_REQUEST"
}

dynamodb.createTable(params, function(err, data) {
	if (err) {
		console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
	} else {
		console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
	}
});
