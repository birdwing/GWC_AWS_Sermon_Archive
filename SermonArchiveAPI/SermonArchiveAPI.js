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
	//See if CookieName was passed, if not set it to a default of "SermonArchive".
	if(typeof Options.CookieName === 'undefined' || Options.CookieName == null) {
		Options.CookieName = "SermonArchive";
	}
	//Make sure CookieName is a string.
	if(typeof Options.CookieName !== 'string') {
		throw new TypeError('CookieName options must be a string.');
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
		Options.onSermonArchiveRequest = function(data) {};
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
	//Caller Function for onSermonArchiveRequest
	var onRequest = function(page) {
		Status = 'Loading';
		Options.onSermonArchiveRequest({
			CurrentPage: page,
			LastPage: LastPage
		});
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
		Status = 'Ready';
		//Save Data into Cookie
		SaveCookie();
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
	var Status = 'Ready';
	
	//Create function to return full list of Sermons
	this.getSermons = function() {
		return Sermons;
	};
	
	//Initialize Object
	var Init = function(CountLastKey) {
		//Call onInit Event if this is the first call to the init function
		if(typeof CountLastKey === 'undefined' || CountLastKey == null) {
			Options.onSermonArchiveInit();
			Status = 'Loading';
		}
		
		var params = {
			TableName: "Sermons",
			ExclusiveStartkey: CountLastKey,
			Select: "COUNT"
		};
		
		//Check if cookie exists, if not get data from database
		var Cookie = ReadCookie();
		if(typeof Cookie === 'undefined' || Cookie == null) {
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
						Status = 'Ready';
						
						//Get first set of sermons
						queryData(false, function(res) {
							if(res) {
								//Call afterRequest Event
								afterRequest('Database');
							}
						});
					}
				}
			});
		} else {
			//Cookie exists load data from cookie
			LastEvaluatedKey = Cookie.LastEvaluatedKey;
			CurrentYear = Cookie.CurrentYear;
			TotalItems = Cookie.TotalItems;
			LastPage = Cookie.LastPage;
			Sermons = Cookie.Sermons;
			//Call afterInit Event and pass in data
			Options.afterSermonArchiveInit({
				TotalItems: TotalItems,
				LastPage: LastPage
			});
			Status = 'Ready';

			//Call afterRequest Event
			afterRequest('Cookie');
		}
	};
	
	//Define internal functions for retrieving and displaying Sermon List data
	var queryData = function(sameRequest, callback) {
		//If Status = "Loading" and sameRequest is false there is already a query being processed ignore any requests
		if(Status != 'Loading' || sameRequest === true) {
			//Call onRequest Event if this is the first call to the queryData function
			if(sameRequest === false) {
				onRequest(CurrentPage);
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
						//Data get finished
						return callback(true);
					//Else If LastEvaluatedKey is not undefined then there are more sermons in this year.
					} else if(typeof data.LastEvaluatedKey !== 'undefined') {
						// There are results, if this was a last page check, reset the flag.
						LastPageCheck = false;
						
						//If the data loaded is already enough for the current page
						if(checkCache()) {
							//Data get finished
							return callback(true);
						//Otherwise Resubmit the same query with the LastEvaluatedKey
						} else {
							//Data loaded not yet enough recursive function return
							return queryData(true, function(res) {
								if(res) {
									return callback(true);
								}
							});
						}
					//Else If LastEvaluatedKey is undefined, then last option is that count is > 0. Sincie it skipped the first IF statement.
					} else {
						CurrentYear--;
						// We moved to the next year, so set the LastPageCheck flag, to check if this is the last year.
						LastPageCheck = true;
						
						//If the data loaded is already enough for the current page
						if(checkCache()) {
							//Data get finished
							return callback(true);
						//Otherwise Resubmit the same query with the next year down and no StartKey
						} else {
							//Data loaded not yet enough recursive function return
							return queryData(true, function(res) {
								if(res) {
									return callback(true);
								}
							});
						}
					}
				}
			});
		}
	};
	
	var checkCache = function(page) {
		//If page wasn't passed use current page
		if(typeof page === 'undefined' || page == null) {
			var page = CurrentPage;
		}
		return ((Sermons.length >= page * PerPage) || (Sermons.length === TotalItems));
	};
	
	var CookieExpires = function() {
		var CurrentDate = new Date(new Date().toDateString() + " 00:00:00 GMT-0400");
		//Increment by 1 day until its either Sunday or Wednesday
		while(CurrentDate.getDay() !== 0 && CurrentDate.getDay() !== 3) {
			CurrentDate.setDate(CurrentDate.getDate() + 1);
		}
		//If it's a sunday set the time to 4:00PM
		if(CurrentDate.getDay() == 0) {
			CurrentDate.setHours(16);
		}
		return CurrentDate.toGMTString();
	}
	
	var SaveCookie = function() {
		if(CurrentPage < 3) {
			var CookieData = {
				LastEvaluatedKey: LastEvaluatedKey,
				CurrentYear: CurrentYear,
				TotalItems: TotalItems,
				LastPage: LastPage,
				Sermons: Sermons
			}
			var ExpirationDate = CookieExpires();
			var cookie = [Options.CookieName, '=', JSON.stringify(CookieData), '; expires=', ExpirationDate, '; domain=.', window.location.host.toString(), '; path=/;'].join('');
			document.cookie = cookie;
		}
	};
	
	var ReadCookie = function() {
		try {
			var result = document.cookie.match(new RegExp(Options.CookieName + '=([^;]+)'));
			result && (result = JSON.parse(result[1]));
			return result;
		} catch {
			return null;
		}
	}
	
	this.PreviousPage = function() {
		JumpToPage((CurrentPage - 1));
	};
	
	this.NextPage = function() {
		JumpToPage((CurrentPage + 1));
	};
	
	this.JumpToPage = function(page, sameRequest) {
		JumpToPage(page, sameRequest);
	}
	
	var JumpToPage = function(page, sameRequest) {
		//See if page was passed, if not set it to a default of 6.
		if(typeof page === 'undefined' || page == null) {
			throw new TypeError('You must pass which page you are jumping to. Page cannot be null.');
		}
		//Make sure page is a number.
		if(typeof page !== 'number') {
			throw new TypeError('Page you are jumping too must be a number.');
		}
		//Make sure page is not less than 1
		if(page < 1) {
			throw new RangeError('Page you are jumping too cannot be less than 1.');
		}
		//Make sure page is not greater than last page
		if(page > LastPage) {
			throw new RangeError('Page you are jumping to cannot be greater than total number of pages.');
		}
		//If sameRequest is not passed set it to false
		if(typeof sameRequest === 'undefined' || sameRequest == null) {
			var sameRequest = false;
		} else {
			var sameRequest = true;
		}
		
		//If the data loaded is already enough for the current page
		if(checkCache(page)) {
			//Set current page to page
			CurrentPage = page;
			//Call afterRequest Event
			afterRequest((sameRequest)?'Database':'Cache');
		//Otherwise query until target page is reached.
		} else {
			CurrentPage++;
			queryData(sameRequest, function(res) {
				if(res) {
					//Call jumptopage again
					JumpToPage(page, sameRequest);
				}
			});
		}
	}
	
	//Initialize the Sermon Archive
	Init(null);
}