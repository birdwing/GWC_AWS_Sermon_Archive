# GWC_AWS_Sermon_Archive

This is the software that runs the online sermon archive for https://gatewaywc.com
It uses an AWS lambda function to detect files uploaded to an S3 instance and automatically add the sermon to a dynamo database.
The software developed to encode and upload the files can be found here : https://github.com/birdwing/SermonEncoder

The LambdaFunctions folder contains the lambda functions that fire when a file is uploaded to the AWS S3 bucket.
These functions read an xml file and load the sermon into a dynamo DB.

The SermonArchiveAPI folder contains the JavaScript api used to get the sermon data from the dynamo DB for displaying on the website, as well as the .html the API is used with.

The other folders are test functions and examples, as well as some of the code used to move the old sermon archive into this new one.
