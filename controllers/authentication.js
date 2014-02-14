var helpers = require( '../models/helpers.js' );
var xssUtil = require( '../models/security/xss-util.js' );
var crowd = require( '../models/authentication/crowd.js' );

var http = require( 'http' );
var querystring = require( "querystring" );
var event = require( 'events' );

/**
 * @class Functionality for the operations console around authentication and authorization.
 * 
 * @author Matthew Saltzman
 * @since 7-24-2013  
 */
var authentication = {
  /**
   * AuthCheck function validates that a user has been added to the session object in the database.
   * 
   * @param username The username parameter from the session_id
   * 
   * @returns {boolean}
   */
  authCheck : function( username )
  {
    //grabbing the info log
    var info = helpers.getLoggers().info;
    
    info.log( 'info', 'validating username', { 'username' : username } );
    
    //checks if this parameter exists or not
    if ( username ) 
    {
      return( true );
    }
    
    return ( false );
  },
  
  /** 
   * Function to check whether or not a user is authorized to take the requested action
   *  
   * @param {Object} req The request object
   * @param {Object} ee The event handler from the calling function
   * @param {Object} res The response object
   * 
   * @throws An error if there is a problem connecting to the collection
   * @throws An error if there's a problem retrieving the authorization requirements for the page
   */
  authorize : function( req, ee, res ) 
  {
    var permissions = req.session.permissions; 
    var url = req.url;  
    
    var config = helpers.getConfig();
    
    //Access the database of pages within the system, and their required permissions
    config._database.collection( 'PAGES', function( err, pages )
    {
      //if there's an error accessing the collection, log it here
      if( err )
      {
        throw new Error( err );
      }
      else
      {
        //find a single entry for the page (there should not be duplicates)
        pages.findOne( { page : url.split( '?' )[ 0 ] }, function( err, results )
        {
          if( err )
          {
            req.redirect( '/?error[header]=Error occurred, see log for details&error[date]=' + new Date() );
            throw new Error( err );
          }
          else 
          {
            var authorized = 'false';
            
            //check if the user is authorized to access the system
            for( permissionIter in permissions )
            {
              for( resultsIter in results.permissions )
              {
                if( permissions[ permissionIter ] == results.permissions[ resultsIter ] )
                {
                  authorized = 'true';
                }
              }
            }
            
            //emit an authorization event, along with the response of whether or not the user is authorized
            ee.emit( 'Authorization Responded', authorized );
          }
        } );
      }
    } );
  },
    
  /**
   * Handles the authentication of a user to the system
   * 
   * @param {Object} req The request object
   * @param {Object} res The response object 
   */
  authenticate : function( req, res ) 
  {
    //grabbing the exceptions and securty logs
    var exceptions = helpers.getLoggers().exceptions;
    var security = helpers.getLoggers().security;
    
    //Gets the username and password from the body of the request
    var authInfo = req.body.user;
    var config = helpers.getConfig();
  
    //pulling username and password into local variables from the request object
    var username = authInfo.username;
    var password = authInfo.password;
    
    //If either the username or the password is missing, redirect back to the root page
    //TODO - Change this to also display a login failure message
    if ( !username || !password || !xssUtil.isValidString( username ) ) 
    {
      security.log( 'warn', 'Login Failure for user', { 'username' : username } );
      res.redirect( '/?error[header]=Authentication Failed' );
    }
    else 
    {
      //creating an event emitter to handle some events
      var ee = new event.EventEmitter();
      
      ee.once( 'addPermissions', function( permissions ) 
      {
        req.session.permissions = permissions;
        res.redirect( '/index' );
      });
    
      //handler to receive response from scala server. Requires the output from scala, the request object, and the response object
      ee.once( 'User Authenticated', function( err, requ, resp ) 
      {
        //if an error is received, log it and redirect the user to /
        if( err )
        {
          exceptions.log( 'error', err.toString() );
          resp.redirect( '/?error[header]="Error occurred, see log for details&error[date]=' + new Date() );
        }
        else
        {
          //add the username to the sessions table in the database
          requ.session.username = username;
          //access the users table
          ee.once( 'Groups Analyzed', function( err, isSecurityTeamMember )
          {
            //since login was already successful, assume valid credentials and assign the guest role
            var role = "Guest";
            //if an error is received, log it and redirect the user to /
            if( err )
            {
              exceptions.log( 'warn', err );
            }
            //check to see if the user is a member of the security team, since only security team members have access
            //to alter the state of security issues in the console
            if( isSecurityTeamMember )
            {
              role = "Administrator";
            }
            
            //access the roles table
            config._database.collection( 'ROLES', function( err, roles ) 
            {
              //if we didn't run into an error, and the user has a role
              if ( !err && role ) 
              {
                //run a query to find the permissions this role has
                roles.findOne(
                {
                  //the role from the previous query
                  'role_name' : role
                }, 
                {
                  //only return the list of permissions from the roles table
                  fields : 
                  {
                    permissions : 1
                  }
                }, 
                //return the permissions to the event handler to add to the session object
                function( err, role ) 
                {
                  if ( !err ) 
                  {
                    //emit the event to add the set of permissions to the session object
                    ee.emit( 'addPermissions', role.permissions );
                  } 
                  else 
                  {
                    resp.redirect( '/?error[header]="Error occurred, see log for details&error[date]=' + new Date() );
                    throw new Error( err );
                  }
                } );
              } 
              else 
              {
                resp.redirect( '/?error[header]="Error occurred, see log for details&error[date]=' + new Date() );
                throw new Error( err );
              }
            } );
          } );
        }
        //find out if the user is part of the security group or not
        crowd.findUserGroups( username, ee );
      } );  
      //authenticate to crowd, this function throws errors, so encase in a try/catch block
      crowd.authenticateUser( username, password, ee, req, res );
    }
  }
};

exports.authCheck = authentication.authCheck;
exports.authorize = authentication.authorize;
exports.authenticate = authentication.authenticate;