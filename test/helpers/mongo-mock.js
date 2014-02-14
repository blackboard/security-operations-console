/* Mocking functions to match functionality provided by mongodb frameworks */
var db = function() 
{
  /**
   * This function mocks the ObjectId function, returns the input as a string
   * 
   * Params:
   *   string - the ObjectId
   */
  var ObjectId = function( string ) 
  {
    this._o = string;
    
    this.equals = function( objectId )
    {
      if( this._o == objectId._o )
      {
        return true;
      }
      else
      {
        return false;
      }
    };
    
    this.toHexString = function()
    {
      return this._o;
    };
  };
  
  this.ObjectId = ObjectId;
  
  /**
   * This function mocks the ISODate function, returns the input as a string
   * 
   * Params:
   *   string - the ISODate 
   */
  var ISODate = function() 
  {
    function ISODate( string )
    {
      this._o = string;
    }
  };
  
  /**
   * This is a JSON object array that contains the test data we're using
   */
  this.fullCollection = 
  [ 
    { 
      "_id" : ObjectId("50d42755ae130f4421ec0bc2"), 
      "CVE" : "", 
      "CWE" : "209", 
      "Difference" : "parameter:  test=_3_1 -&gt; test=252f..%252f..%252f..%252f..%252fa/b%2500.html", 
      "EntityName" : "test", 
      "EntityType" : "Parameter", 
      "FirstIdentified" : 
      { 
        "Date" : ISODate("2012-12-21T09:09:41.594Z"), 
        "Version" : "version", 
        "ScanPid" : 22806, 
        "Source" : "AppScan" 
      }, 
      "GET Parameters" : "test=_3_1&file=fooo", 
      "IssueIssueTypeID" : "GV_SQLErr", 
      "POST Parameters" : "", 
      "Url" : "http://test/test.html", 
      "VariantID" : "432379", 
      "reviewed" : 
      { 
        "reviewed" : "Y", 
        "username" : "person", 
        "type" : "valid", 
        "date_reviewed" : ISODate("2012-12-31T11:57:11.104Z"), 
        "case_number" : "testcase", 
        "false_positive_reason" : "" 
      } 
    },
    { 
      "_id" : ObjectId("50dc22ddae135e2977095a3a"), 
      "CVE" : "", 
      "CWE" : "209", 
      "Difference" : "parameter:  test=test, -&gt; test=WF%27SQL%22Probe%3BA--B", 
      "EntityName" : "roles", 
      "EntityType" : "Parameter", 
      "FirstIdentified" : 
      { 
        "Date" : ISODate("2012-12-27T10:28:45.498Z"), 
        "Version" : "version", 
        "ScanPid" : 22918, 
        "Source" : "AppScan" 
      }, 
      "GET Parameters" : "action=preview&test=test", 
      "IssueIssueTypeID" : "GV_SQLErr", 
      "POST Parameters" : "", 
      "Url" : "http://test/test.html", 
      "VariantID" : "434159", 
      "reviewed" : 
      { 
        "reviewed" : "Y", 
        "username" : "person", 
        "type" : "valid", 
        "date_reviewed" : ISODate("2013-01-04T14:57:26.798Z"), 
        "case_number" : "Ticket already created", 
        "false_positive_reason" : "" 
      } 
    },
    { 
      "_id" : ObjectId("50d58c68ae13d11ce30381f8"), 
      "CVE" : "", 
      "CWE" : "209", 
      "Difference" : "parameter:  test=_3_1 -&gt; test=252f..%252f..%252f..%252f..%252fa/b%2500.html", 
      "EntityName" : "test", 
      "EntityType" : "Parameter", 
      "FirstIdentified" : 
      { 
        "Date" : ISODate("2012-12-21T09:09:41.594Z"), 
        "Version" : "version", 
        "ScanPid" : 22806, 
        "Source" : "AppScan" 
      }, 
      "GET Parameters" : "test=_3_1&file=fooo", 
      "IssueIssueTypeID" : "GV_SQLErr", 
      "POST Parameters" : "", 
      "Url" : "http://test/test2.html", 
      "VariantID" : "432379", 
      "reviewed" : 
      { 
        "reviewed" : "Y", 
        "username" : "person", 
        "type" : "false_positive", 
        "date_reviewed" : ISODate("2012-12-31T11:57:11.104Z"), 
        "case_number" : "", 
        "false_positive_reason" : "testcase" 
      } 
    },
    { 
      "_id" : ObjectId("50dd6648ae13e0c60684bef2"), 
      "CVE" : "", 
      "CWE" : "209", 
      "Difference" : "parameter:  test=_3_1 -&gt; test=252f..%252f..%252f..%252f..%252fa/b%2500.html", 
      "EntityName" : "test", 
      "EntityType" : "Parameter", 
      "FirstIdentified" : 
      { 
        "Date" : ISODate("2012-12-21T09:09:41.594Z"), 
        "Version" : "version", 
        "ScanPid" : 22806, 
        "Source" : "AppScan" 
      }, 
      "GET Parameters" : "test=_3_1&file=fooo", 
      "IssueIssueTypeID" : "GV_SQLErr", 
      "POST Parameters" : "", 
      "Url" : "http://test/test3.html", 
      "VariantID" : "432379", 
      "reviewed" : 
      { 
        "reviewed" : "Y", 
        "username" : "person", 
        "type" : "false_positive", 
        "date_reviewed" : ISODate("2012-12-31T11:57:11.104Z"), 
        "case_number" : "", 
        "false_positive_reason" : "testcase" 
      } 
    },
  ];
  
  /**
   * Function to set the full collection to contain different values, in case alternates are needed
   * for testing with different collections.
   *  
   * @param {Object} collection - the new collection being used by the test
   */
  this.setFullCollection = function( collection )
  {
    this.fullCollection = collection;
  };
  
  //Holder for the original fullCollection value, in case of a change
  this.origCollection = this.fullCollection;
  
  /**
   * Helper method handling any calls to $in
   * 
   * Parameters:
   *  values - the set of possible values
   *  expected - the value that the set of $in is trying to match
   * Returns:
   *  true when there is a match
   *  false when there is not
   */
  var inCall = function( values, expected ) {
    for( valueIter in values ) {
      if( values[ valueIter ] == expected ) {
        retVal = true;
        break;
      }
    }
    return( retVal );
  };
  
  /**
   * Function that implements a mock for each, by simply calling the callback function with 
   * the item in the array that is next, and going one farther to simulate the end condition.
   * This does not match the real use case, but I'm returning an array rather than a cursor
   * object.
   * 
   * @param callback - The callback function, accepts an error object (null), and the current object 
   */
  var each = function( callback )
  {
    var err; 
    
    for( x in this )
    {
      if( this[ x ] != this.each )
      {
        callback( err, this[ x ] );
      }
      else
      {
        callback();
      }
    }
  };
  
  /**
   * Helper method handling any calls to $gt
   * 
   * Parameters:
   *   queryVal -- The value that collVal must be greater than
   *   collVal -- The collection item's value for the key being compared by $gt
   * Returns:
   *   true -- When collVal > queryVal
   *   false -- all other times
   */ 
  var gt = function( queryVal, collVal ) 
  {
    var retVal = false;
    if( collVal > queryVal ) 
    { 
      retVal = true;
    }
    
    return( retVal );
  };
  
  /**
   * Helper method for matching an item, allows for recursion in the case of nested objects
   * 
   * Parameters:
   *   queryKey - key in the queyry being tested
   *   collKey - key in the collection item being tested
   *   query - the query item that matches the query key
   *   collItem - the collection item that matches the collection key
   *   modifiedCollKey - the previous ending collection key value + . + new key value being tested. Example: "foo.bar"
   * Returns:
   *   true - if the query item matches the collection item
   *   false - if it does not
   */
  var matchItem = function( queryKey, collKey, query, collItem, modifiedCollKey ) {
    var match = false;
    switch( typeof collItem[ collKey ] ) 
    {
      //if the item is an object, then it has a set of subkeys. 
      case "object":
        var subKeys = Object.keys( collItem[ collKey ] );
        for( subKeyIter in subKeys ) 
        {
          //recursive call to matchItem, using the subKeys and subObject
          match = matchItem( queryKey, subKeys[ subKeyIter ], query, collItem[ collKey ], modifiedCollKey + "." + subKeys[ subKeyIter ] );
          if( match ) 
          {
            break;
          }
        }
        break;
      default:
        if( modifiedCollKey == queryKey )
        {
          var object = query[ queryKey ];
          switch( typeof object ) {
            //if the type is object, then we know it must be one of a set number of parameters
            case "object":
              var objectKey = Object.keys( object )[ 0 ];
              if( objectKey == "$in" ) 
              {
                match = inCall( object[ "$in" ], collItem[ collKey ] );
              }
              else if( objectKey == "$gt" ) 
              {
                match = gt( object[ "$gt" ], collItem[ collKey ] );
              }
              break;
            //only other type is string
            default:
              if( collItem[ collKey ]  == query[ queryKey ] ) 
              {
                match = true;
              }
              break;
          }
        }
    }
    
    return( match );
  };
  
  /**
   * Mock function for mongodb collection.
   * 
   * Parameters:
   *   tableName - The name of the collection in MongoDB that the user is attempting to grab values from
   *   callback - The callback method (optional) to use the collection
   * Returns:
   *   coll - the business logic for a collection. Contains the functionality from MongoDB collections being used
   */
  this.collection = function( tableName, callback ) 
  {
    var err = null;
    //without creating a local variable to the class object, I won't be able to reference the fullCollection object
    //inside the coll object defined below.
    var fullCollection = this.fullCollection;
    var coll =  
    {
      /**
       * Mockup of the find function, part of the mongodb object that I am currently using. Should find only entries that 
       * meet the criteria of the query. Can also use operators such as $in, defined above as inCall.
       *
       * Parameters:
       *   query - The mongodb query used to find the data we're looking for
       * Returns:
       *   set of values in fullCollection that match the query
       */
      find : function( query, callback ) 
      {
        var result = [];
        //set of keys in the query JSON object
        var queryKeys = Object.keys( query );
        for( var collIter in fullCollection ) 
        {
          var validEntry = true;
          //set of keys in the collection item
          var collKeys = Object.keys( fullCollection[ collIter ] );
          //iterate through each key in the query JSON object
          for( queryKeyIter in queryKeys ) 
          {
            var match = false;
            //iterate through each key in the collection JSON object
            for( collKeyIter in collKeys ) 
            {
              var queryKey = queryKeys[ queryKeyIter ];
              var collKey = collKeys[ collKeyIter ];
              //calls the match function to check if the query item matches an item in the collection
              match = matchItem( queryKey, collKey, query, fullCollection[ collIter ], collKey );
              //once we find a match, stop processing new records 
              if( match ) {
                break;
              }
            }
            if( !match ) 
            {
              validEntry = false;
            }
          }
          //if we have found a record that matches, push it into the result object to be returned
          if( validEntry ) {
            result.push( fullCollection[ collIter ] );
          }
        }
        result.each = each;
        
        if( typeof callback == 'function' )
        {
          callback( null, result );
        }
        
        return( result );
      },
      /** 
       * Mockup of the group function, part of the mongodb object I'm currently using. Creates essentially a SQL group by 
       * statement used for reporting.
       * 
       * Parameters:
       *   key - set of keys in the db objects to report on
       *   cond - the conditions in which to report on a record. Functions like find()
       *   initial - the aggregate keys and their initial values
       *   reduce - the javascript function that creates the aggregation and records to the parameters in the initial section
       *   callback - callback function provided by the user, obtains the error object and results of the query
       * Returns:
       *   a set of report objects created according to the rules of the query, provided to the callback function only
       */
      group : function( key, cond, initial, reduce, callback ) 
      {
        var result = [];
        var items = [];
        var resultKeys = [];
        var resultKeyCompiledValues = [];
        var createResultCompiledValues;
        
        //finding all items that match the cond condition
        items = this.find( cond );
        
        var keys = Object.keys( key );
        for( keyIter in keys ) 
        {
          resultKeys.push( keys[ keyIter ] );
        }
        
        resultKeyCompiledValues = initial;
        createResultCompiledValues = reduce;
        var itemResultKeys = [];
                
        for( itemIter in items ) 
        {
          if( itemIter != 'each' )
          {
            var exists;
            var existsIn = -1;
            var jsonObject = {};
            //pushing the items in the row that meet the key condition into a json object
            for( resultKeyIter in resultKeys ) 
            {
              var splitKey = resultKeys[ resultKeyIter ].split( "." );
              var prevItem = items[ itemIter ];
              for( splitKeyIter in splitKey )
              {
                prevItem = prevItem[ splitKey[ splitKeyIter ] ];
              }
              jsonObject[ resultKeys[ resultKeyIter ] ] = prevItem;
            }
            //checking to see if the items in this json object match an item in the results
            for( itemResultKeyIter in itemResultKeys ) 
            {
              exists = true;
              for( iter in resultKeys ) 
              {
                if( jsonObject[ resultKeys[ iter ] ] != itemResultKeys[ itemResultKeyIter ][ resultKeys[ iter ] ] )
                {
                  exists = false;
                }
              }
              if( exists ) {
                existsIn = itemResultKeyIter;
                break;
              }
            }
            //adding the aggregate key and initial value to the new json object
            for( compValIter in Object.keys( resultKeyCompiledValues ) ) 
            {
              var compValKey = Object.keys( resultKeyCompiledValues )[ compValIter ];
              jsonObject[ compValKey ] = resultKeyCompiledValues[ compValKey ];
            }
            if( exists && existsIn > -1 ) 
            {
              //if the row already exists, run the callback method against the existing row
              createResultCompiledValues( itemResultKeys[ existsIn ], itemResultKeys[ existsIn ] );
            }
            else 
            {
              //if the row is new, run against the new value and then push it into the results object
              createResultCompiledValues( jsonObject, jsonObject );
              itemResultKeys.push( jsonObject );
            }
          }
        }              
        //adds the results to the callback method 
        callback( null, itemResultKeys );
      },
      /**
       * Empty stub for the aggregate function. Future items will be empty, and mocked using jasmine's andCallFake 
       * item, which would allow me to return the values easily without creating the full test double.
       */
      aggregate : function() {},
      mapReduce : function() {}
    };
    //calls the callback method if one exists
    if( typeof callback == "function" ) 
    {
      callback( err, coll );
    }
    //returns the collection object 
    return( coll );
  };
};

exports.db = db;