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
	
	//Initialize Object
	var Init = function(CountLastKey) {
		Status.set("Inititalizing...", document.getElementById('status'));
		var params = {
			TableName: "Sermons",
			ExclusiveStartkey: CountLastKey,
			Select: "COUNT"
		};

		docClient.scan(params, function(err, data) {
			if (err) {
				document.getElementById('textarea').innerHTML += "Unable to describe table. Error: " + "\n" + JSON.stringify(err, undefined, 2);
			} else {
				TotalItems += data.Count;
				LastPage = Math.ceil(TotalItems / PerPage);
				document.getElementById('totalPages').innerHTML = LastPage;

				//If there are more records resend this query with the LastEvaluatedKey
				if(typeof data.LastEvaluatedKey !== 'undefined') {
					Init(data.LastEvaluatedKey);
				} else {
					queryData();
				}
			}
		});
	};
	
	//Define internal functions for retrieving and displaying Sermon List data
	var queryData = function() {
		Status.set("Querying Database...", document.getElementById('status'));
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
				document.getElementById('textarea').innerHTML += "Unable to query. Error: " + "\n" + JSON.stringify(err, undefined, 2);
			} else {
				Sermons = Sermons.concat(data.Items);
				LastEvaluatedKey = data.LastEvaluatedKey;

				//If the count is 0, LastEvaluatedKey is undefined, and current page is the same as last page then we have reached the end.
				//If LastPageCheck is false that means we should check the next year,
				if(data.Count == 0 && typeof data.LastEvaluatedKey === 'undefined' && CurrentPage == LastPage && LastPageCheck) {
					Status.set("Loaded from Database.", document.getElementById('status'));
					displaySermonList();
					//Disable Next Page Button and set the last page value
					document.getElementById('next').disabled = true;
					LastPage = CurrentPage;
				//Else If LastEvaluatedKey is not undefined then there are more sermons in this year.
				} else if(typeof data.LastEvaluatedKey !== 'undefined') {
					// There are results, if this was a last page check, reset the flag.
					LastPageCheck = false;
					
					//If the data loaded is already enough for the current page
					if(checkCache()) {
						Status.set("Loaded from Database.", document.getElementById('status'));
						displaySermonList();
					//Otherwise Resubmit the same query with the LastEvaluatedKey
					} else {
						queryData();
					}
				//Else If LastEvaluatedKey is undefined, then last option is that count is > 0. Sincie it skipped the first IF statement.
				} else {
					CurrentYear--;
					// We moved to the next year, so set the LastPageCheck flag, to check if this is the last year.
					LastPageCheck = true;
					
					//If the data loaded is already enough for the current page
					if(checkCache()) {
						Status.set("Loaded from Database.", document.getElementById('status'));
						displaySermonList();
					//Otherwise Resubmit the same query with the next year down and no StartKey
					} else {
						queryData();
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
				Status.set("Loaded from Cache.", document.getElementById('status'));
				displaySermonList();
			} else {
				queryData();
			}

			//If Page is now at 1 then disable button
			if(CurrentPage == 1) {
				document.getElementById('prev').disabled = true;
			}

			//Enable Next Page Button
			document.getElementById('next').disabled = false;
		} else {
			//Disable Previous Page Button
			document.getElementById('prev').disabled = true;
		}
	};
	
	this.NextPage = function() {
		//Make sure page is less than Last Page
		if(LastPage === null || CurrentPage < LastPage) {
			CurrentPage++;
			//If data is already loaded in cache send that;
			if(checkCache()) {
				Status.set("Loaded from Cache.", document.getElementById('status'));
				displaySermonList();
			} else {
				queryData();
			}
			
			//If Page is now at last page disable button
			if(LastPage !== null && CurrentPage >= LastPage) {
				document.getElementById('next').disabled = true;
			}

			//Enable Previous Page Button
			document.getElementById('prev').disabled = false;
		} else {
			//Disable Next Page Button
			document.getElementById('next').disabled = true;
		}
	};
	
	var displaySermonList = function() {
		var sermonsToDisplay = Sermons.slice(((CurrentPage * PerPage) - PerPage), (CurrentPage * PerPage));
		document.getElementById('page').value = CurrentPage;
		document.getElementById('textarea').innerHTML = JSON.stringify(sermonsToDisplay, undefined, 2);
	}
	
	Init(null);
}