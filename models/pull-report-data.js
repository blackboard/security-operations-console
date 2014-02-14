

//Set of required libraries
var event = require( 'events' );

/** 
 * @class Functionality to pull data from mongodb for the purposes of reporting.
 * 
 * @author Matthew Saltzman
 * @since 7-24-2013
 */
var pull_report_data = { 
  /**
  * Function that reads in the components of a group query and returns the results.
  *
  * @param {Object} collection An open connection to a specific mongodb collection
  * @param {Array} keys An array containing the set of existing elements in the collection to group by
  * @param {Object} condField Functions like a find() in mongodb, set of conditions that elements being reported on must meet
  * @param {Object} initialField The aggregation values that should be displayed, and their initial values
  * @param {Function} reduceField Function that creates the aggregation
  * 
  * @returns {Object}
  * @throws Exception when missing or invalid db
  */
  pullReportData : function( collection, keys, condField, initialField, reduceField, emitter )
  {
    //creates the set of keys for the group querys' key field
    var keyField = this.createKey( keys );
    
    try
    {
      //runs the query
      collection.group( keyField, condField, initialField, reduceField, function( err, results )
      {
        //sends the results back to the event emitter
        emitter.emit( "results from group query found", results );
      });
    }
    //catches errors, should be enhanced to return actual error object as well
    catch( err )
    {
      if( typeof reduceField != "function" )
      {
        throw "reduceField must be a function";
      }
      else if( typeof collection != "object" || collection == null || typeof collection.group != "function" )
      {
        throw "collection cannot be null, and must be an object containing a function called group";
      }
      else if( typeof initialField != "object" || initialField == null )
      {
        throw "initialField must be a JSON value";
      }
    }
  },
  
  /** 
   * A replacement function for pullReportData, which calls the aggregation framework rather the group query type. This
   * function will probably be enhanced to only accept a query object, where the query is put together before this function
   * is called.
   *
   * @param {Object} collection The collection we are querying from
   * @param {Object} match The match part of the pipeline, always comes first
   * @param {Object} group The group section of the pipeline, comes after the match
   * @param {Object} emitter The event emitter signaling completion
   * @param {Object} args Additional arguments to come after the group section of the pipeline, currently implements sort
   */
  pullAggregateData : function( collection, match, group, emitter, args )
  {
    try 
    {
      //builds the query object from the various parameters passed in
      var query = [ match, group ];
      //args contains other parts of the query in the order they should be processed, currently only supports adding a sort
      if( args )
      {
        if( args.sort )
        {
          query.push( args.sort );
        }
      }
      //runs the query against the collection
      collection.aggregate( query, function( err, result )
      {
        //returns the results
        emitter.emit( "results from group query found", result );
      });
    }
    //returns error object to calling function, should probably be ehanced to throw types of errors 
    catch( err )
    {
      throw err;
    }
  },      
  
  /**
   * Function that calls a complex aggregate query, based on a pipeline, rather than a set of parameters. Used for querys which
   * require an unknown ammount of unrolling, matching, projects, etc., such as the querys required to report on the static 
   * analysis findings.
   * 
   * @param {Object} collection The mongodb collection we are querying from
   * @param {Array} pipeline The entire query pipeline, built in the calling method
   * @param {Object} emitter The event emitter signaling completion
   */
  complexAggregation : function( collection, pipeline, emitter )
  {
    //The set of pipeline operations that mongodb supports
    var validKeys = [ "$project", "$match", "$limit", "$skip", "$unwind", "$group", "$sort", "$geoNear" ]; 
    
    //Loop to validate the set of pipeline operations being passed in
    for( iter in pipeline )
    {
      //Boolean value that determines if the current operation is valid or not
      var valid = false;
      //The current pipeline operation
      var operation = Object.keys( pipeline[ iter ] )[ 0 ];
      //Iterate through each of the valid pipeline operation keys
      for( keyIter in validKeys )
      {
        //If the current operation is valid, set valid to true
        if( operation == validKeys[ keyIter ] )
        {
          valid = true;
        }
      }
      
      //Throw an error if the pipeline operation is not valid
      if( !valid )
      {
        throw new Error( "Pipeline Operation: " + operation + " is not valid." );
      }
    }
    
    collection.aggregate( pipeline, function( err, results ) 
    {
      if( err )
      {
        throw err;
      }
      else
      {
        emitter.emit( "results from complex group query found", results );
      }
    } );
  },
  
  /**
   * Call MongoDB's mapReduce function. This function should only be used if the aggregation framework is 
   * too limiting to accomplish the desired task. Example: If you need to organize your group-by function by the 
   * ObjectId timestamp.
   * 
   * @param {Object} db The database containing the collection we're looking for
   * @param {String} collectionName The name of the collection we're looking to access 
   * @param {Object} ee The event emitter to emit the results
   * @param {Function} map The map function 
   * @param {Function} reduce The reduce function
   * @param {Function} finalize The finalizer function (optional)
   */
  mapReduce : function( db, collectionName, ee, map, reduce, finalize )
  {
    //set the options to return the results inline, rather than storing to a table
    var options = {
      out : { inline : 1 }
    };
    
    //if there's a finalize function, add it to the options under finalize
    if( finalize )
    {
      options.finalize = finalize.toString();
    }
    
    //connect to the collection
    db.collection( collectionName, function( err, collection )
    {
      if( !err )
      {
        //Run the mapReduce 
        collection.mapReduce( map.toString(), reduce.toString(), options, function( err, results )
        {
          //If there's no error, return the results
          if( !err )
          {
            ee.emit( "mapReduce complete", null, results, collectionName );
          }
          //if there's an error, return the error instead
          else
          {
            ee.emit( "mapReduce complete", err );
          }
        } );
      }
      else
      {
        ee.emit( "mapReduce complete", err );
      }
    } );
  },
  
  /**
   * Function to generate find queries to mongodb collections. I can generate the results for find queries, as well as 
   * just get the result counts, depending on what is needed.
   * 
   * @param {Object} query The actual query text to find the set of issues
   * @param {Object} db The database object to connect to
   * @param {string} collectionName The name of the collection to get the data from
   * @param {Object} ee The eventEmitter object to return results
   * @param {boolean} count True if we only want a count returned, false otherwise
   * @param {Object} [output] Optional parameters to identify the results later
   */
  find : function( query, db, collectionName, ee, count, output )
  {
    //connect to the collection where we want to grab data
    db.collection( collectionName, function( err, collection )
    {
      if( !err )
      {
        if( !count )
        {
          //find the data in the collection based on the query generating a count of the results
          collection.find( query, function( findErr, results )
          {
            if( !findErr )
            {
              ee.emit( "Find Results", results, output );
            }
            else
            {
              ee.emit( "Error", findErr );
            }
          } );
        }
        //find the data we're looking for, and emit all of the results
        else
        {
          collection.find( query ).count( function( countErr, count )
          {
            if( !countErr )
            {
              ee.emit( "Count Results", count, output );
            }
            else
            {
              ee.emit( "Error", err );
            }
          } );
        }
      }
      else
      {
        ee.emit( "Error", err );
      }
    } );
  },
  /**
   * Reads in an array of keys that should be displayed to the user during this report, and returns the key field for a group() query 
   * from MongoDB
   * 
   * @param {Array} keys An array of keys that should be displayed to the user
   * @returns {Array}
   */
  createKey : function( keys )
  {
    var key = {};
    for( keyIter in keys )
    {
      key[ keys[ keyIter ] ] = true;
    }
    
    return( key );
  }
};
//exports the set of functions to be called by other functions
exports.pullReportData = pull_report_data.pullReportData;
exports.pullAggregateData = pull_report_data.pullAggregateData;
exports.createKey = pull_report_data.createKey;
exports.complexAggregation = pull_report_data.complexAggregation;
exports.mapReduce = pull_report_data.mapReduce;
exports.find = pull_report_data.find;