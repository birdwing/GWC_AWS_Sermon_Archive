console.log('Loading function');

const aws = require('aws-sdk');

const s3 = new aws.S3({ apiVersion: '2006-03-01' });


exports.handler = async (event, context) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));

    // Get the object from the event and show its content type
    const bucket = event.Records[0].s3.bucket.name;
    const srckey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    // Break the key into parts
    const keyMatch = srckey.match(/(.*)\/([^\/]*)\/([^\/]*)$/);
    const mainFolder = keyMatch[1];
    const subFolder = keyMatch[2];
    const fileName = keyMatch[3];
    const destinationkey = "Greatshoutvideo/" + fileName;
    
    try {
        //Sanity Check
        if (mainFolder != 'sermonArchiveIncoming') {
            throw new Error(`Error moving object ${srckey} in bucket ${bucket}. The file was uploaded into the wrong folder, and should not have triggered this function.`);
        }
        
        //Count # of files in subFolder
        var sourceFolder = mainFolder + "/" + subFolder + "/";
        var getFiles = await s3.listObjectsV2({
            Bucket: bucket,
            MaxKeys: 10,
            Prefix: sourceFolder,
            StartAfter: sourceFolder,
            Delimiter: "/"
        }).promise();
        
        //If 3 files
        if(getFiles.Contents.length == 3) {
            //Loop through and copy each file
            for (var i = 0, len = getFiles.Contents.length; i < len; i++) {
                // Break the file key into parts to get filename
                var fileMatch = getFiles.Contents[i].Key.match(/(.*)\/([^\/]*)\/([^\/]*)$/);
                var currentFileName = fileMatch[3];
                
                try {
                    var copyFile = await s3.copyObject({
                        Bucket: bucket,
                        CopySource: "/" + bucket + "/" + getFiles.Contents[i].Key,
                        ACL: "public-read",
                        Key: "Greatshoutvideo/" + currentFileName
                    }).promise();
                    console.log(srckey + " moved to Greatshoutvideo/" + currentFileName + ". With ETag of: " + copyFile.ETag);
                } catch (copyerr) {
                    console.error(copyerr, copyerr.stack);
                    const message = `Error moving object ${srckey} in bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
                    throw new Error(message)
                }
            }
            return `All files in ${mainFolder}/${subFolder} moved.`;
        } else {
            return `Still waiting for files to be uploaded to: ${sourceFolder}. Expecting 3 files.`;
        }
    } catch (copyerr) {
        console.error(copyerr, copyerr.stack);
        const message = `Error moving object ${srckey} in bucket ${bucket}. Could not count how many files were in the Sub Folder.`;
        throw new Error(copyerr);
        //throw new Error(message)
    }
};