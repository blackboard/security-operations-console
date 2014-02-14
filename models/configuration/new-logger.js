var xssUtil = require( '../security/xss-util.js' );

var winston = require( '../../node_modules/winston' );
var MongoDB = require('winston-mongodb').MongoDB;

/**
 * @class Wrapper for the winston logger. Allows us to easily create a new log for the console, and decide 
 * what options to create. Since it wraps the winston logger, we should be able to switch out which logger
 * we use. 
 * 
 * @author Matthew Saltzman
 * @since 7-11-2013
 
 * @constructor
 *  
 * @param {Array} type An array of the type(s) of logs to create, console, file, mongodb
 * @param {string} level The log level, either info, warning, or error
 * @param {boolean} timestamp True or false, whether you want timestamps in the log
 * @param {boolean} handleExceptions True or false, whether this log should also handle exceptions for you
 * @param {string} filename The name of the log file to create, or null when not creating a file log. Should be a 
 * relative path from the webserver root directory 
 * @param {string} db The database name to connect to for a mongodb log. Null otherwise
 * @param {string} collectionName The name of the collection to contain the log. Null if not using mongodb
 * 
 * @throws an exception if any parameter does not conform to the intended input
 * @throws an exception if a user attempts a path traversal out of the main directory
 */
var Log = function( type, level, timestamp, handleExceptions, filename, db, collectionName ) 
{
  //error trapping for any misentered parameters
  if( level != 'info' && level != 'warn' && level != 'error' )
  {
    throw new Error( 'Invalid log level provided' );
  }
  if( typeof timestamp != 'boolean' && timestamp != null )
  {
    throw new Error( 'Error: Timestamp parameter must be true or false' );
  }
  if( typeof handleExceptions != 'boolean' )
  {
    throw new Error( 'Error: handleExceptions parameter must be true or false' );
  }
  if( typeof filename != 'string' && filename != null )
  {
    throw new Error( 'Error: filename must be a string' );
  }
  if( typeof db != 'string' && db != null )
  {
    throw new Error( 'Error: Database name must be a string' );
  }
  if( typeof collectionName != 'string' && collectionName != null )
  {
    throw new Error( 'Error: Collection Name must be a string' );
  }
  if( !type.length )
  {
    throw new Error( 'Error: Invalid type provided' );
  }
  
  //checking for a path traversal vulnerability (should not exist here)
  if( filename != null && xssUtil.isPathTraversal( filename, 'system' ) )
  {
    throw new Error( 'Path traversal attack attempted' );
  }
    
  //creating a set of transports for the logger we're about to create
  var transports = [];
  
  for( iter in type )
  {
    //setting options that are identical in all logger types
    var options = {
      //log level
      'level' : level, 
      'timestamp' : timestamp,
      'handleExceptions' : handleExceptions,
    };
    //checking which transport we're using, and adding specific options for those transports
    switch ( type[ iter ] )
    {
      //no additional options needed for console output
      case 'console':
        transports.push( new winston.transports.Console( options ) );
        break;
      //adding filename for using the File transport
      case 'file':
        options.filename = filename;
        
        transports.push( new winston.transports.File( options ) );
        break;
      //adding database and collection information for using the mongodb transport
      case 'mongodb':
        options.db = db;
        options.collection = collectionName;
        
        transports.push( new MongoDB( options ) );
        break;
      //throw an error if the entry in the type array does not match one of these three items
      default:
        throw new Error( 'Invalid type provided' );
        break;
    }
  }

  //create a new logger using the set of transports we created
  this._winston = new winston.Logger( { 'transports' : transports, 'exitOnError' : false } );
};

//Since we want to be able to implement many loggers, adding non-global methods to the Log "class"
Log.prototype = {
  /**
   * Function to actually write to a log, using every transport the specifc logger has
   * 
   * @param {string} level Log level, can be error, warn, or info 
   * @param {string} message The message to be output to the log
   * @param {Object} metadata Any additional data about the log entry we want to make
   * 
   * @throws error if any parameter does not have the intended type
   */
  log : function( level, message, metadata )
  {
    //trap errors if there are any misused parameters
    if( !( level == 'error' || level == 'warn' || level == 'info' ) )
    {
      throw new Error( "Invalid log level: " + level );
    }
    if( typeof message != 'string' )
    {
      throw new Error( "Invalid log message, must be a string" );
    }
    //adding the instanceof Array call since arrays show up as objects using the typeof call
    if( !( typeof metadata == 'object' || typeof metadata == 'undefined' ) || metadata instanceof Array )
    {
      throw new Error( "Invalid log metadata, must be a JSON object" );
    }
    
    //log the message
    this._winston.log( level, message, metadata );
  }
};

module.exports = Log;
