console.log('Loading function');

const aws = require('aws-sdk');

const s3 = new aws.S3({ apiVersion: '2006-03-01' });

async function getData(s3, bucket, key) {
	try {
		var getXML = await s3.getObject({
			Bucket: bucket,
			Key: key
		}).promise();
	} catch (xmlerr) {
		console.error(xmlerr, xmlerr.stack);
		const message = `Error parsing XML file ${key} in bucket ${bucket}. This sermon could not be added to the archive.`;
		throw new Error(message);
	}
	var XML = getXML.Body.toString();
	var Json = {
		Title: XML.match(/<title>(.+?)<\/title>/)[1],
		Speaker: XML.match(/<speaker>(.+?)<\/speaker>/)[1],
		Scripture: XML.match(/<scripture>(.+?)<\/scripture>/)[1],
		Date: XML.match(/<date>(.+?)<\/date>/)[1]
	};
	return Json;
};

async function moveFiles(s3, bucket, files, destination) {
	//Loop through and copy each file
	for (var i = 0, len = files.length; i < len; i++) {
		// Break the file key into parts to get filename
		var fileMatch = files[i].Key.match(/(.*)\/([^\/]*)\/([^\/]*)$/);
		var currentFileName = fileMatch[3];
		
		try {
			var copyFile = await s3.copyObject({
				Bucket: bucket,
				CopySource: "/" + bucket + "/" + files[i].Key,
				ACL: "public-read",
				Key: destination + currentFileName
			}).promise();
		} catch (copyerr) {
			console.error(copyerr, copyerr.stack);
			const message = `Error moving object ${files[i].Key} in bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
			throw new Error(message)
		}
	}
	//Files moved return original files to delete them
	return files;
};

async function deleteFiles(s3, bucket, folder, files) {
	//Loop through and delete each file
	for (var i = 0, len = files.length; i < len; i++) {
		try {
			var deleteFile = await s3.deleteObject({
				Bucket: bucket,
				Key: files[i].Key
			}).promise();
		} catch (delfileerr) {
			console.error(delfileerr, delfileerr.stack);
			const message = `Error deleting objects from the ${folder} folder in bucket ${bucket}. Make sure to delete this folder, so the sermon isn't re-added.`;
			throw new Error(message);
		}
	}
	//Files deleted return folder to delete italics
	return folder;
};

async function deleteFolder(s3, bucket, folder) {
	try {
		var deleteFolder = await s3.deleteObject({
			Bucket: bucket,
			Key: folder + "/"
		}).promise();
	} catch (delfoldererr) {
		console.error(delfoldererr, delfoldererr.stack);
		const message = `Error deleting folder ${folder} in bucket ${bucket}. Make sure to delete this folder, so the sermon isn't re-added.`;
		throw new Error(message);
	}
	return `Files moved to new location.`;
};

exports.handler = async (event, context) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));

    // Get the object from the event and show its content type
    const bucket = event.Records[0].s3.bucket.name;
    const srckey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    // Break the key into parts
    const keyMatch = srckey.match(/(.*)\/([^\/]*)\/([^\/]*)$/);
    const mainFolder = keyMatch[1];
    const subFolder = keyMatch[2];
    
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
			//Make sure there is one .mp4, one .mp3, and one .xml file
			var mp4 = false;
			var mp3 = false;
			var xml = false;
			var xmlKey = '';
			for (var i = 0, len = getFiles.Contents.length; i < len; i++) {
					var extension = getFiles.Contents[i].Key.match(/.*\.(.*)$/)[1];
					switch(extension) {
						case "mp4":
							mp4 = true;
							break;
						case "mp3":
							mp3 = true;
							break;
						case "xml":
							xml = true;
							xmlKey = getFiles.Contents[i].Key;
							break;
					}
			}
			if (!mp4 || !mp3 || !xml) {
				throw new Error(`Error moving object ${srckey} in bucket ${bucket}. one or more of the file types uploaded are incorrect.`);
			}
			//Get Data from .xml file
			var sermonData = await getData(s3, bucket, xmlKey);
			//Get Destination Folder from Sermon Date
			var dateMatch = sermonData.Date.match(/(.+?)-(.+?)-(.+?)\s/);
			var destination = dateMatch[1] + "/" + dateMatch[2] + "/" + dateMatch[3] + "/";
			//Move the returned files.
			var movedFiles = await moveFiles(s3, bucket, getFiles.Contents, destination);
			//All files moved, delete them.
			var folderToDelete = await deleteFiles(s3, bucket, mainFolder + "/" + subFolder, movedFiles);
			//All files deleted, delete folder.
			var deletedFolder = await deleteFolder(s3, bucket,folderToDelete,sermonData);
			return deletedFolder;
        } else {
            return `Still waiting for files to be uploaded to: ${sourceFolder}. Expecting 3 files.`;
        }
    } catch (counterr) {
        console.error(counterr, counterr.stack);
        const message = `Error moving object ${srckey} in bucket ${bucket}. Could not count how many files were in the Sub Folder.`;
        throw new Error(counterr);
        //throw new Error(message)
    }
};