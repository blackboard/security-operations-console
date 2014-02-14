//list of imports
var helper = require( '../helpers.js' );
var mongo = require( '../../node_modules/mongodb' );

var path = require( 'path' );

var serverRoot = null;

/**
 * @class This file will contain methods to sanitize inputs, as well as some validation functions. 
 * 
 * @author Matthew Saltzman
 * @since 6-7-2013
 */
var xssUtil = {
  /**
   * Validation method that tests whether or not this input is a number or not. 
   * 
   * @param {Object} input The input being tested
   * 
   * @returns {boolean} 
   */
  isNumber : function( input )
  {
    //return value, defaults to false
    var validationState = false;
    
    //Stolen from stackOverflow user CMS, checks that the result is finite, and can be parsed as a floating point
    if( !isNaN( parseFloat( input ) ) && isFinite( input ) )
    {
      validationState = true;
    }
    
    return( validationState );
  },
  
  /**
   * Validation method that checks whether or not this input contains any characters that are not letters or numbers
   * 
   * @param {Object} input The input being tested
   * 
   * @returns {boolean}
   */
  isValidString : function( input )
  {
    //return value, defaults to false
    var validationState = false;
    //regex to check for any occurrences of characters that are not accepted
    var whitelistAntiPattern = /[^a-zA-Z0-9]/;
    var foundCharacters = whitelistAntiPattern.exec( input );
    
    //Setting to true only when foundCharacters is null, otherwise a character that is not accepted is present
    if( !foundCharacters )
    {
      validationState = true;
    }
    
    return( validationState );
  },
  
  /**
   * Validation method that checks whether or not this input contains any characters that are not letters, numbers, a period(.),
   * -, or _ character. Used when the string should contain sentences, such as a description.
   * 
   * @param {Object} input The input being tested
   * 
   * @returns {boolean}
   */
  isValidLongString : function( input )
  {
    //return value, defaults to false
    var validationState = false;
    //regex to check for any occurrences of characters that are not accepted
    var whitelistAntiPattern = /[^a-zA-Z0-9\.\-_!? ]/;
    var foundCharacters = whitelistAntiPattern.exec( input );
    
    //Setting to true only when foundCharacters is null, otherwise a character that is not accepted is present
    if( !foundCharacters )
    {
      validationState = true;
    }
    
    return( validationState );
  },
  
  /**
   * Function to check validity of an ObjectID string
   *  
   * @param {Object} input The supposed ObjectID being tested
   * 
   * @returns {boolean}
   */
  isValidMongodbId : function( input )
  {
    //regex that tests a mongodb ObjectID for validity
    var validMongodbIdRegex = /^[0-9a-fA-F]{24}$/;
    var validationState = false;
    
    var findings = validMongodbIdRegex.exec( input );
    //only setting to true when the regex above finds a valid mongodb ObjectID
    if( findings )
    {
      validationState = true;
    }    
    
    return validationState;
  },
  
  /**
   * Role validation function. Checks that every role in the roles list is actually a valid role
   * in the database
   * 
   * @param {Object} ee The event emitter from the calling function, to receive the success event
   * @param {String} role The role to be checked 
   * @param {Object} res The response object
   */
  validateRole : function( ee, role, res )
  {
    //get the security and exception loggers
    var security = helper.getLoggers().security;
    var exceptions = helper.getLoggers().exceptions;
    
    //check the role ObjectID string for validity, only proceed if valid
    if( exports.isValidMongodbId( role ) )
    {
      //Enter the Roles database
      helper.getConfig()._database.collection( 'ROLES', function( err, rollColl )
      {
        //find the role by objectid
        rollColl.findOne( { _id : new mongo.BSONPure.ObjectID( role ) }, function( err, role )
        {
          if( !err )
          {
            //if the role is invalid
            if( !role )
            { 
              exceptions.log( 'warn', 'Invalid Role Found' );
              res.redirect( '/' );
            }
            else
            {
              ee.emit( 'Roles Check Complete', true );
            }
          }
          //log the database error found
          else
          {
            res.redirect( '/' );
            throw new Error( err );
          }
        } );
      } );
    }
    else
    {
      security.log( 'warn', 'Invalid ObjectID Value found', { ObjectID : role } );
      res.redirect( '/' ); 
    }
  },
  
  /**
   * Permissions validation function. Checks that every permission in the list is a valid permission
   * in the database
   * 
   * @param {Object} ee The event emitter from the calling function, to receive the success event
   * @param {String} permissionsList The set of permissions to be checked 
   * @param {Object} res The response object
   */
  validatePermissions : function( ee, permissionsList, res )
  {
    //grabbing the security logger
    var security = helper.getLoggers().security;
    
    //counter for number of permissions checked
    var numValidPermissions = 0;
    var redirected = false;
    var permList = [];
    
    //checking to see if the permissionsList is an array or not
    if( !( permissionsList instanceof Array ) )
    {
      //if the permissionsList is a single entity, then create an array of one object
      if( typeof permissionsList == 'string' || typeof permissionsList == 'Object' && permissionsList != null )
      {
        permList = [ permissionsList ];
      }
      //otherwise, log an error and redirect
      else
      {
        security.log( 'warn', 'permissionsList parameter is an invalid type', { param : permissionsList } );
        res.redirect( '/' );
        redirected = true;
      }
    }
    //if it is an array, assign it to permList directly
    else
    {
      permList = permissionsList;
    }
    
    if( !redirected )
    {
      //increment the counter each time a permission is checked successfully
      ee.on( 'Permission Checked', function()
      {
        numValidPermissions = numValidPermissions + 1;
        
        //once we have checked all permissions, send an event to the original method so that it can proceed
        if( numValidPermissions == permList.length )
        {
          ee.emit( 'Permissions Check Complete' );
        }
      } );
      //Enter the Roles database
      helper.getConfig()._database.collection( 'PERMISSIONS', function( err, permissionsColl )
      {
        //iterate through the full set of permissions
        for( permissionsIter in permList )
        {
          //access each permission in the database by id
          permissionsColl.findOne( { name : permList[ permissionsIter ] }, function( err, permission )
          {
            if( !err )
            {
              //if the role is invalid, end processing and redirect the user to '/'
              if( !permission && !redirected )
              {               
                security.log( 'warn', 'Invalid Permission Found', { 'permission' : permission } );
                res.redirect( '/' );
                redirected = true;
              }
              else
              {
                //if no error was thrown, emit an event to increment the number of permissions checked
                ee.emit( 'Permission Checked' );
              }
            }
            //log the database error found
            else
            {
              res.redirect( '/' );
              throw new Error( err );
            }
          } );
        }
      } );
    }
  },
  
  /**
   * Function to determine if a user is attempting a path traversal attack against the system. At present, the only code
   * that deals with files on the file system is my logging code, but I want to be prepared for the eventuality where files
   * can be pulled from the console. 
   *  
   * @param {string} input The path we want to make sure is not a path traversal attack
   * @param {string} entity The type of user who is attempting to pull the file. The system can hit all files within
   * the root directory, anything else should be getting or putting files in the public folder, for now
   * 
   * @returns {boolean}
   */
  isPathTraversal : function( input, entity )
  {
    //boolean value to return 
    var retVal = false;
    //root directory to check against
    var rootDir;
      
    //if the entity is the system (e.g. logging code), allow them into the webserver root where the code is 
    if( entity == 'system' )
    {
      rootDir = serverRoot;
    }
    //if the entity is not the system itself, only allow the public folder to be traversed
    else
    {
      rootDir = path.join( serverRoot, 'public' );
    }
    
    //create an absolute path (remove all ../ and ./ if they exist) to the file or directory
    var filename = path.normalize( input );
    
    //if the file or directory is outside the webserver root, set the return value to true
    if( filename.indexOf( rootDir ) != 0 )
    {
      retVal = true;
    }
    
    return( retVal );
  },
  
  /**
   * Function to set the server's root directory for the purposes of testing for path traversal vulnerabilities. 
   *
   * @param {string} inputRoot The servers' root directory
   * @throws An error if the inputRoot parameter is not a valid filesystem path
   */
  setServerRoot : function( inputRoot )
  {
    //first, validate that the path itself is a string
    if( typeof inputRoot == 'string' )
    {
      //create a regular expression for testing that the string is a valid directory
      var filesystem = /^[\/\\]?([a-zA-Z0-9 ._-]+[\/\\]{1})*[a-zA-Z0-9 ._-]*[\/\\]?$/;
      //normalize the path 
      var root = path.normalize( inputRoot );
      
      //test to make sure that the normalized path is a filesystem path
      if( filesystem.exec( root ) )
      {
        serverRoot = root;
      }
    }
    
    //if at any point the process to validatre the path failed, throw an error
    if( !serverRoot )
    {
      throw new Error( "Not a valid path" );
    }
  },
  
  /** 
   * Helper function for testing purposes, allows us to see what the serverRoot parameter is set to 
   */
  getServerRoot : function()
  {
    return serverRoot;
  },
  
  /** 
   * Helper function for testing purposes, allows us to reset the serverRoot parameter to null
   * after tests. 
   */
  resetServerRoot : function()
  {
    serverRoot = null;
  }
};

//exports section, determines what entities can be read by files importing xss-util.js
exports.isNumber = xssUtil.isNumber;
exports.isValidString = xssUtil.isValidString;
exports.isValidLongString = xssUtil.isValidLongString;
exports.isValidMongodbId = xssUtil.isValidMongodbId;
exports.validateRole = xssUtil.validateRole;
exports.validatePermissions = xssUtil.validatePermissions;
exports.isPathTraversal = xssUtil.isPathTraversal;
exports.setServerRoot = xssUtil.setServerRoot;
exports.getServerRoot = xssUtil.getServerRoot;
exports.resetServerRoot = xssUtil.resetServerRoot;