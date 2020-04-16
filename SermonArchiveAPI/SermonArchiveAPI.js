//Create a List object to store properties and information about the sermon list.
function SermonList(PerPage, Region, Identity) {
	//Setup internal AWS object
	this._AWS = AWS;
	this._AWS.config.region = Region;
	this._AWS.config.credentials = new this._AWS.CognitoIdentityCredentials({IdentityPoolId: Identity});
	this._docClient = new this._AWS.DynamoDB.DocumentClient();
	
	//Create variables to store information about where a user is in the list.
	this._LastEvaluatedKey = null;
	this._year = new Date().getFullYear();
	this._Sermons = new Array();
	this._PerPage = PerPage;
	this._CurrentPage = 1;
	this._Limit = PerPage;
	this._TotalItems = 0;
	this._LastPage = null;
	this._LasyYear = 2012; //No sermons before this year.
	this.Status = {
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
		list.Status.set("Inititalizing...", document.getElementById('status'));
		var params = {
			TableName: "Sermons",
			ExclusiveStartkey: CountLastKey,
			Select: "COUNT"
		};

		list._docClient.scan(params, function(err, data) {
			if (err) {
				document.getElementById('textarea').innerHTML += "Unable to describe table. Error: " + "\n" + JSON.stringify(err, undefined, 2);
			} else {
				list._TotalItems += data.Count;
				list._LastPage = Math.ceil(list._TotalItems / list._PerPage);
				document.getElementById('totalPages').innerHTML = list._LastPage;

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
		list.Status.set("Querying Database...", document.getElementById('status'));
		var params = {
			TableName: "Sermons",
			ProjectionExpression: "#yr,#dt,info.title,info.speaker,info.scripture",
			KeyConditionExpression: "#yr = :yyyy",
			ExpressionAttributeNames: {
				"#yr" : "year",
				"#dt" : "date"
			},
			ExpressionAttributeValues: {
				":yyyy": list._year
			},
			ScanIndexForward: false,
			ExclusiveStartKey: list._LastEvaluatedKey,
			Limit: list._Limit
		}
		
		list._docClient.query(params, function(err, data) {
			if (err) {
				document.getElementById('textarea').innerHTML += "Unable to query. Error: " + "\n" + JSON.stringify(err, undefined, 2);
			} else {
				list._Sermons = list._Sermons.concat(data.Items);
				list._LastEvaluatedKey = data.LastEvaluatedKey;

				//If the count is 0 and LastEvaluatedKey is undefined then we have reached the end.
				//For now we are also checking that the year is not > LastYear. Until the sermon archive is caught up.
				if(data.Count == 0 && typeof data.LastEvaluatedKey === 'undefined' && list._year <= list._LastYear) {
					list.displaySermonList("Loaded from Database.");
					//Disable Next Page Button and set the last page value
					document.getElementById('next').disabled = true;
					list._LastPage = list._CurrentPage;
				//Else If LastEvaluatedKey is not undefined then there are more sermons in this year.
				} else if(typeof data.LastEvaluatedKey !== 'undefined') {
					//If the data loaded is already enough for the current page
					if(list._checkCache()) {
						list.displaySermonList("Loaded from Database.");
					//Otherwise Resubmit the same query with the LastEvaluatedKey
					} else {
						list._queryData(list);
					}
				//Else If LastEvaluatedKey is undefined, then last option is that count is > 0. Sincie it skipped the first IF statement.
				} else {
					list._year--;
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
		return ((this._Sermons.length >= this._CurrentPage * this._PerPage) || (this._Sermons.length === this._TotalItems));
	};
	
	this.PreviousPage = function() {
		//Make sure page is greater than 1
		if(this._CurrentPage > 1) {
			this._CurrentPage--;
			//If data is already loaded in cache send that;
			if(this._checkCache()) {
				this.displaySermonList("Loaded from Cache.");
			} else {
				this._queryData(this);
			}

			//If Page is now at 1 then disable button
			if(this._CurrentPage == 1) {
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
		if(this._LastPage === null || this._CurrentPage < this._LastPage) {
			this._CurrentPage++;
			//If data is already loaded in cache send that;
			if(this._checkCache()) {
				this.displaySermonList("Loaded from Cache.");
			} else {
				this._queryData(this);
			}
			
			//If Page is now at last page disable button
			if(this._LastPage !== null && this._CurrentPage >= this._LastPage) {
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
		var sermonsToDisplay = this._Sermons.slice(((this._CurrentPage * this._PerPage) - this._PerPage), (this._CurrentPage * this._PerPage));
		document.getElementById('page').value = this._CurrentPage;
		this.Status.set(msg, document.getElementById('status'));
		document.getElementById('textarea').innerHTML = JSON.stringify(sermonsToDisplay, undefined, 2);
	}
	
	this.Init(null, this);
}