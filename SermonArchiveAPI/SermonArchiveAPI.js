//Create a List object to store properties and information about the sermon list.
function SermonList(Options) {
	/* -------------------------------------------------- *|
	|* Check options and set defaults for missing options *|
	|* -------------------------------------------------- */
	//If no options were passed in create an empty object to fill later
	if(typeof Options === 'undefined' || Options == null) {
		var Options = {};
	}
	//If Options variable passed was not an object
	if(typeof Options !== 'object') {
		throw new TypeError('Options variable must be an object.'); 
	}
	//See if ItemsPerPage was passed, if not set it to a default of 6.
	if(typeof Options.ItemsPerPage === 'undefined' || Options.ItemsPerPage == null) {
		Options.ItemsPerPage = 6;
	}
	//Make sure ItemsPerPage is a number.
	if(typeof Options.ItemsPerPage !== 'number') {
		throw new TypeError('ItemsPerPage option must be a number.');
	}
	//Make sure Region Option exists
	if(typeof Options.Region === 'undefined' || Options.Region == null) {
		throw new TypeError('Region option must be defined, and be a valid AWS region.');
	}
	//Make sure Identity option exists
	if(typeof Options.Identity === 'undefined' || Options.Identity == null) {
		throw new TypeError('Identity option must be defined, and be a valid AWS Cognito Identity Pool Id.');
	}
		
	/* Setup Events */
	//If onSermonArchiveError function was not passed set it a function that throws the error
	if(typeof Options.onSermonArchiveError === 'undefined' || Options.onSermonArchiveError == null) {
		Options.onSermonArchiveError = function(data) {
			throw new Error(data.msg);
		}
	}
	//Make sure onSermonArchiveError is a function
	if(typeof Options.onSermonArchiveError !== 'function') {
		throw new TypeError('onSermonArhiveError must be a function.');
	}
	//If onSermonArchiveInit function was not passed set it to a blank function
	if(typeof Options.onSermonArchiveInit === 'undefined' || Options.onSermonArchiveInit == null) {
		Options.onSermonArchiveInit = function() {};
	}
	//Make sure onSermonArchiveInit is a function
	if(typeof Options.onSermonArchiveInit !== 'function') {
		throw new TypeError('onSermonArhiveInit must be a function.');
	}
	//If afterSermonArchiveInit function was not passed set it to a blank function
	if(typeof Options.afterSermonArchiveInit === 'undefined' || Options.afterSermonArchiveInit == null) {
		Options.afterSermonArchiveInit = function(data) {};
	}
	//Make sure afterSermonArchiveInit is a function
	if(typeof Options.afterSermonArchiveInit !== 'function') {
		throw new TypeError('afterSermonArchiveInit must be a function.');
	}
	//If onSermonArchiveRequest function was not passed set it to a blank function
	if(typeof Options.onSermonArchiveRequest === 'undefined' || Options.onSermonArchiveRequest == null) {
		Options.onSermonArchiveRequest = function() {};
	}
	//Make sure onSermonArchiveRequest is a function
	if(typeof Options.onSermonArchiveRequest !== 'function') {
		throw new TypeError('onSermonArchiveRequest must be a function.');
	}
	//If afterSermonArchiveRequest function was not passed set it to a blank function
	if(typeof Options.afterSermonArchiveRequest === 'undefined' || Options.afterSermonArchiveRequest == null) {
		Options.afterSermonArchiveRequest = function(data) {};
	}
	//Make sure afterSermonArchiveRequest is a function
	if(typeof Options.afterSermonArchiveRequest !== 'function') {
		throw new TypeError('afterSermonArchiveRequest must be a function.');
	}
	//Caller Function for afterSermonArchiveRequest
	var afterRequest = function(source) {
		Options.afterSermonArchiveRequest({
			Source: source,
			Sermons: Sermons,
			LastPage: LastPage,
			CurrentPage: CurrentPage,
			PerPage: PerPage
		});
	}
	
	//Setup internal AWS object
	var _AWS = AWS;
	_AWS.config.region = Options.Region;
	_AWS.config.credentials = new _AWS.CognitoIdentityCredentials({IdentityPoolId: Options.Identity});
	var docClient = new _AWS.DynamoDB.DocumentClient();

	//Create variables to store information about where a user is in the list.
	var LastEvaluatedKey = null;
	var CurrentYear = new Date().getFullYear();
	var Sermons = new Array();
	var PerPage = Options.ItemsPerPage;
	var CurrentPage = 1;
	var Limit = PerPage;
	var TotalItems = 0;
	var LastPage = null;
	var LastPageCheck = false;
	var Status = {
		_value: "",
		get: function(){
			return this._value;
		},
		set: function(x, object) {
			this._value = x;
			//If a DOM object was passed display the value in that object
			if(typeof object !== 'undefined' && object !== null) {
				object.value = this._value;
			}
			return this._value;
		}
	};
	
	//Create function to return full list of Sermons
	this.getSermons = function() {
		return Sermons;
	};
	
	//Initialize Object
	var Init = function(CountLastKey) {
		//Call onInit Event if this is the first call to the init function
		if(typeof CountLastKey === 'undefined' || CountLastKey == null) {
			Options.onSermonArchiveInit();
		}
		
		var params = {
			TableName: "Sermons",
			ExclusiveStartkey: CountLastKey,
			Select: "COUNT"
		};

		docClient.scan(params, function(err, data) {
			if (err) {
				Options.onSermonArchiveError({msg: "Unable to describe table. Error: " + "\n" + JSON.stringify(err, undefined, 2)});
			} else {
				TotalItems += data.Count;
				LastPage = Math.ceil(TotalItems / PerPage);

				//If there are more records resend this query with the LastEvaluatedKey
				if(typeof data.LastEvaluatedKey !== 'undefined') {
					Init(data.LastEvaluatedKey);
				} else {
					//Call afterInit Event and pass in data
					Options.afterSermonArchiveInit({
						TotalItems: TotalItems,
						LastPage: LastPage
					});
					
					//Get first set of sermons
					queryData();
				}
			}
		});
	};
	
	//Define internal functions for retrieving and displaying Sermon List data
	var queryData = function(sameRequest) {
		//Call onRequest Event if this is the first call to the queryData function
		if(typeof sameRequest === 'undefined' || sameRequest == null) {
			Options.onSermonArchiveRequest();
		}
		var params = {
			TableName: "Sermons",
			KeyConditionExpression: "#yr = :yyyy",
			ExpressionAttributeNames: {
				"#yr" : "year"
			},
			ExpressionAttributeValues: {
				":yyyy": CurrentYear
			},
			ScanIndexForward: false,
			ExclusiveStartKey: LastEvaluatedKey,
			Limit: Limit
		}
		
		docClient.query(params, function(err, data) {
			if (err) {
				Options.onSermonArchiveError({msg: "Database Query Error: " + "\n" + JSON.stringify(err, undefined, 2)});
			} else {
				Sermons = Sermons.concat(data.Items);
				LastEvaluatedKey = data.LastEvaluatedKey;

				//If the count is 0, LastEvaluatedKey is undefined, and current page is the same as last page then we have reached the end.
				//If LastPageCheck is false that means we should check the next year,
				if(data.Count == 0 && typeof data.LastEvaluatedKey === 'undefined' && CurrentPage == LastPage && LastPageCheck) {
					LastPage = CurrentPage;
					//Call afterRequest Event
					afterRequest('Database');
				//Else If LastEvaluatedKey is not undefined then there are more sermons in this year.
				} else if(typeof data.LastEvaluatedKey !== 'undefined') {
					// There are results, if this was a last page check, reset the flag.
					LastPageCheck = false;
					
					//If the data loaded is already enough for the current page
					if(checkCache()) {
						//Call afterRequest Event
						afterRequest('Database');
					//Otherwise Resubmit the same query with the LastEvaluatedKey
					} else {
						queryData(true);
					}
				//Else If LastEvaluatedKey is undefined, then last option is that count is > 0. Sincie it skipped the first IF statement.
				} else {
					CurrentYear--;
					// We moved to the next year, so set the LastPageCheck flag, to check if this is the last year.
					LastPageCheck = true;
					
					//If the data loaded is already enough for the current page
					if(checkCache()) {
						//Call afterRequest Event
						afterRequest('Database');
					//Otherwise Resubmit the same query with the next year down and no StartKey
					} else {
						queryData(true);
					}
				}
			}
		});
	};
	
	var checkCache = function() {
		return ((Sermons.length >= CurrentPage * PerPage) || (Sermons.length === TotalItems));
	};
	
	this.PreviousPage = function() {
		//Make sure page is greater than 1
		if(CurrentPage > 1) {
			CurrentPage--;
			//If data is already loaded in cache send that;
			if(checkCache()) {
				//Call afterRequest Event
				afterRequest('Cache');
			} else {
				queryData();
			}
		}
	};
	
	this.NextPage = function() {
		//Make sure page is less than Last Page
		if(LastPage === null || CurrentPage < LastPage) {
			CurrentPage++;
			//If data is already loaded in cache send that;
			if(checkCache()) {
				//Call afterRequest Event
				afterRequest('Cache');
			} else {
				queryData();
			}
		}
	};
	
	//Initialize the Sermon Archive
	Init(null);
}