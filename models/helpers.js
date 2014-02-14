var auth = require( '../controllers/authentication.js' );

var querystring = require( 'querystring' );
var http = require( 'http' );
var event = require( 'events' );
var mongo = require( '../node_modules/mongodb' );

var config = null;

/**
 * @class Set of functions to return data from one part of the application to another. Primarily acts as an interface for 
 * obtaining configuration data. 
 * 
 * @author Matthew Saltzman
 * @since 7-24-2013
 */
var helpers = {
  /**
   * This function should handle all authorization checks. On a successful authorization challenge, 
   * the callback function passed in should be called, and the requested page to display. A failed authorization
   * challenge should display an authorization error. A user who isn't logged in should be redirected to the login page
   * 
   * @param {string} uri The page requested by the user, should be a relative URL
   * @param {Object} req The request object for the page
   * @param {Object} res The response object being sent back to the user 
   * @param {function} callback The function being called to display the requested page to the user
   */
  authCheck : function( uri, req, res, callback )
  {
    //create an event emitter for the authorization check
    var authee = new event.EventEmitter();
    
    /*
     * Listener for a response from the authorization framework to determine if the page should be displayed. Using
     * once for the listener because each time this function is called, a new listener is created
     * 
     * @param {boolean} authorized - True or false value returned by the scala service on whether the user is authorized to
     *                               view the page   
     */ 
    authee.once( 'Authorization Responded' , function( authorized ) 
    {
      //if the user is authorized to navigate to the requested page, call the callback function passed in
      if ( authorized == 'true' ) 
      {
        //make sure callback is an actual function before calling it
        if ( typeof callback === 'function' ) 
        {
          //calls the callback function passed in, sends only the request and response object
          callback( req, res );
        }
        //log an exception and redirect the user back to / if the callback parameter is not a function   
        else
        {
          config._logs.exceptions.log( 'the callback parameter is a function that should be called on successful authorization' );
          res.redirect( '/?error[header]=Error occurred, please see logs for details&error[date]=' + new Date() );
        } 
      }
      //if the user is not authorized to navigate to the requested page, the user should receive an authorization error instead
      else 
      {
        res.redirect( '/?error[header]=Error: User is not authorized to view requested content&error[date]=' + new Date() );
      }
    } );
    
    //if the user has a session cookie, and a valid username as part of their session, allow the authorization challenge to occur
    if ( req.cookies.session_id && auth.authCheck( req.session.username ) ) 
    {
      auth.authorize( req, authee );
    } 
    //if the user is missing a session id or a valid username in their session, direct them to log in again
    else 
    {
      res.redirect( '/' );
    }
  },
  
  /**
   * This function is primarily used for testing, allows the test to set the config object to a test
   * dummy.
   *  
   * @param {Object} configInput - dummy config object
   */
  setConfig : function( configInput )
  {
    config = configInput;
  },
  
  /**
   * Getter for the config object stored in here. Allows the use of the database primarily, but also allows 
   * files to get access to other config parameters, such as the scala port and hostname
   * 
   * @returns {Object}
   */
  getConfig : function()
  {
    return config;
  },
  
  /**
   * Redirects the user from HTTP to HTTPS.
   *  
   * @param {Object} request The request object
   * @param {Object} response The response object
   */
  redirectToHttps : function( request, response )
  {
    response.writeHead(302, { location : 'https://' + config._hostname + ':' + config._port } );  
    response.end();
  },
  
  /**
   * Function designed just to give us access to the loggers for the console. Used because accessing logs
   * should be easy.
   * 
   * @returns {Object}
   */
  getLoggers : function()
  {
    return config._logs;
  },
  
  /**
   * Function to create a mongodb object id from a timestamp
   *   
   * @param {Date} date The date to convert to an ObjectId
   */
  createObjectidTimestamp : function( date )
  {
    //fail with no error if the object is in the wrong format
    if( !( date instanceof Date ) )
    {
      return null;
    }
    
    if( date == "Invalid Date" )
    {
      return null;
    }
    
    var timestamp = Math.round( date.getTime() / 1000 );
    return mongo.ObjectID.createFromTime( timestamp );
  }
};

exports.authCheck = helpers.authCheck;
exports.setConfig = helpers.setConfig;
exports.getConfig = helpers.getConfig;
exports.redirectToHttps = helpers.redirectToHttps;
exports.getLoggers = helpers.getLoggers;
exports.createObjectidTimestamp = helpers.createObjectidTimestamp;