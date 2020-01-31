var AWS = require("aws-sdk");

AWS.config.update({
	region: "us-east-1"
});

var s3 = new AWS.S3({apiVersion: '2006-03-01'});

var params = {
	Bucket: "gwc-s3",
	CopySource: "/gwc-s3/sermonArchiveIncoming/TestFile.txt",
	Key: "Greatshoutvideo/TestFile.txt"
};

s3.copyObject(params, function(err, data) {
	if (err) console.log(err, err.stack);
	else console.log(data);
});