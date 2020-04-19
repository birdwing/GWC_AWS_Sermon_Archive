//Create a List object to store properties and information about the sermon list.
function SermonList(ItemsPerPage, Region, Identity) {
	//Setup internal AWS object
	var _AWS = AWS;
	_AWS.config.region = Region;
	_AWS.config.credentials = new _AWS.CognitoIdentityCredentials({IdentityPoolId: Identity});
	var docClient = new _AWS.DynamoDB.DocumentClient();
	
	//Create variables to store information about where a user is in the list.
	var LastEvaluatedKey = null;
	var CurrentYear = new Date().getFullYear();
	var Sermons = new Array();
	var PerPage = ItemsPerPage;
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
	this.Init = function(CountLastKey, list) {
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
					list.Init(data.LastEvaluatedKey, list);
				} else {
					list._queryData(list);
				}
			}
		});
	};
	
	//Define internal functions for retrieving and displaying Sermon List data
	this._queryData = function(list) {
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
					list.displaySermonList("Loaded from Database.");
					//Disable Next Page Button and set the last page value
					document.getElementById('next').disabled = true;
					LastPage = CurrentPage;
				//Else If LastEvaluatedKey is not undefined then there are more sermons in this year.
				} else if(typeof data.LastEvaluatedKey !== 'undefined') {
					// There are results, if this was a last page check, reset the flag.
					LastPageCheck = false;
					
					//If the data loaded is already enough for the current page
					if(list._checkCache()) {
						list.displaySermonList("Loaded from Database.");
					//Otherwise Resubmit the same query with the LastEvaluatedKey
					} else {
						list._queryData(list);
					}
				//Else If LastEvaluatedKey is undefined, then last option is that count is > 0. Sincie it skipped the first IF statement.
				} else {
					CurrentYear--;
					// We moved to the next year, so set the LastPageCheck flag, to check if this is the last year.
					LastPageCheck = true;
					
					//If the data loaded is already enough for the current page
					if(list._checkCache()) {
						list.displaySermonList("Loaded from Database.");
					//Otherwise Resubmit the same query with the next year down and no StartKey
					} else {
						list._queryData(list);
					}
				}
			}
		});
	};
	
	this._checkCache = function() {
		return ((Sermons.length >= CurrentPage * PerPage) || (Sermons.length === TotalItems));
	};
	
	this.PreviousPage = function() {
		//Make sure page is greater than 1
		if(CurrentPage > 1) {
			CurrentPage--;
			//If data is already loaded in cache send that;
			if(this._checkCache()) {
				this.displaySermonList("Loaded from Cache.");
			} else {
				this._queryData(this);
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
			if(this._checkCache()) {
				this.displaySermonList("Loaded from Cache.");
			} else {
				this._queryData(this);
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
	
	this.displaySermonList = function(msg) {
		var sermonsToDisplay = Sermons.slice(((CurrentPage * PerPage) - PerPage), (CurrentPage * PerPage));
		document.getElementById('page').value = CurrentPage;
		Status.set(msg, document.getElementById('status'));
		document.getElementById('textarea').innerHTML = JSON.stringify(sermonsToDisplay, undefined, 2);
	}
	
	this.Init(null, this);
}