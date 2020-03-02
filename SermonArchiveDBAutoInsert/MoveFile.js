var AWS = require("aws-sdk");

AWS.config.update({
	region: "us-east-1"
});

var s3 = new AWS.S3({apiVersion: '2006-03-01'});

var bucket = "gwc-s3",
	SourceFile = "sermonArchiveIncoming/TestFile.txt";

s3.copyObject({
	Bucket: bucket,
	CopySource: "/" + bucket + "/" + SourceFile,
	ACL: "public-read",
	Key: "Greatshoutvideo/TestFile.txt"
}, function(copyerr, copydata) {
	if (copyerr) {
		console.log(copyerr, copyerr.stack);
	} else {
		console.log(copydata);
		s3.deleteObject({
			Bucket: bucket,
			Key: SourceFile
		}, function (deleteerr, deletedata) {
			if (deleteerr) {
				console.log(deleteerr, deleteerr.stack);
			} else {
				console.log(deletedata);
			}
		})
	}
});