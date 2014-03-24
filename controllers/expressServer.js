//TODO - Rewrite entire file to be testable and generate proper documentation

var index = require( './expressIndex.js' );
var auth = require( './authentication.js' );
var cweReport = require( './cwe-report.js' );
var xssUtil = require( '../models/security/xss-util.js' );
var csrfUtil = require( '../models/security/csrf-util.js' );
var helpers = require( '../models/helpers.js' );
var static = require( './static-issues.js' );

var http = require( 'http' );
var https = require( 'https' );

//pulls in all the configuration parameters, currently just default.yaml
var configParams = require( '../node_modules/config' );
var express = require( '../node_modules/express' );

var querystring = require( 'querystring' );

var event = require( 'events' );
var fs = require( 'fs' );
var os = require( 'os' );

var app = null;
var counter = 0;

var configuration = require( '../models/configuration/config-express-server.js' );
var config = configuration.config;
var expressServer = configuration.expressServer;

var sslServer;
var httpServer;

/**
 * Once all Configurations are set, this function will start the listener
 */
var startListener = function()
{
  helpers.setConfig( config );
  //grabbing the exceptions and info log
  var exceptions = helpers.getLoggers().exceptions;
  var info = helpers.getLoggers().info;
  //set the key and cert file for use by the https server we're creating
  var sslOptions = {
    key : config._privateKey,
    cert : config._certificate
  };
  
  try 
  {
    //starting the listener via https instead of express, so that we can use SSL
    sslServer = https.createServer( sslOptions, app );
    sslServer.listen( config._port );

    //Adding Redirect port to redirect from 80 to 443
    httpServer = http.createServer( helpers.redirectToHttps );
    httpServer.listen( config._httpPort );

    if( os.platform() != 'win32' )
    {
      //Because 80 and 443 are privileged ports, root is required to use it. Resetting the user to jenkins (temporary, until done
      //programattically to reset to calling user account) avoids server security issues if a vulnerability is found and exploited
      process.setgid( 'jenkins' );
      process.setuid( 'jenkins' );
    }

    info.log( 'info', 'Ports open', { http : config._httpPort, ssl : config._port } );
  }
  catch( err )
  {
    exceptions.log( "error", "Error starting listener on port " + config._port, { error : err } );
  }
}; 

//using the once listener since function to start listener should only need to be called once
config._ee.once( 'server configured', startListener );

/**
 * Listener for completion of configuration steps for the express server, with callback function. Validates that all configuration
 * steps have been taken before starting the listener. If there's an error in the process preventing any of the configuration 
 * steps from completing, the listener will not start. 
 */
config._ee.on( 'config', function()
{
  counter = counter + 1;
  if( counter == 13 )
  {
    app = expressServer.app;
    config._ee.emit( "server configured" );
  }
} );

//set the server root for checking for path traversal attacks
config.configureServerRoot( configParams.node.root );

//instantiate the 3 loggers for the system
config.configureLoggers( configParams.node.logs.log_root_directory, configParams.node.logs.info.filename, configParams.node.logs.info.level,
                         configParams.node.logs.exception.filename, configParams.node.logs.exception.level,
                         configParams.node.logs.security.filename, configParams.node.logs.security.level );

//starting the express server first, since all of these calls happen asynchronously 
expressServer.setApp( express );

//initial configuration of the database and database server, uses configuration obtained in config files
config.configureDatabaseServer( configParams.database.hostname, configParams.database.port, configParams.database.pool_size );

config.configureDatabase( configParams.database.db_name );

//configures the parameters necessary to use the Scala server, properties stored in the config file
config.setExpressPort( configParams.node.port, configParams.node.httpPort );
config.setExpressHostname( configParams.node.hostname );

//configures the parameters necessary to run the operations console using SSL
config.configureSslParameters( configParams.node.ssl.keyFile, configParams.node.ssl.certFile );

//configures the parameters necessary to authenticate to crowd
config.configureCrowdParameters( configParams.crowd.hostname, configParams.crowd.url, configParams.crowd.ssl, 
                                 configParams.crowd.username, configParams.crowd.credentials, configParams.crowd.adminGroups );
config.setPmpHostname( configParams.passwordManager.hostname, configParams.passwordManager.port,
                       configParams.passwordManager.auth_token );

//configuration for the Express server, includes libraries (jade, stylus, cookies), as well as additional functionality we're using
//properties stored in the config filess
expressServer.configureExpressServer( configParams.node.jade.folder, configParams.static_content );
expressServer.configureStylus( configParams.node.stylus.debug, configParams.node.stylus.source_folder, 
                               configParams.node.stylus.destination_folder, configParams.node.stylus.warn );
expressServer.configureCookies( configParams.node.session_cookie.timeout, configParams.node.session_cookie.key, 
                                configParams.node.session_cookie.secret, configParams.database.hostname, 
                                configParams.database.port, configParams.database.db_name );

//make a connection to the Mongo Database from earlier configuration
config.connectToDatabase( config._database );

/** 
 * Navigation to the index page via GET request, currently sends to the list of new dynamic issues. Checks for authorization, the callback function
 * creates the index page.
 * 
 * @param {Object} req - the request object
 * @param {Object} res - the response object 
 */
expressServer.app.get('/index', function(req, res) 
{
  //grabbing the exceptions log
  var exceptions = helpers.getLoggers().exceptions;
  //runs the authorization check
  helpers.authCheck( '/index', req, res, function( request, response )
  {
    try
    {
      //creates the index page 
      index.createIndexPage( request, response, config._database );
    }
    catch( err )
    {
      exceptions.log( "error", "Error creating index page", { error : err } );
      response.redirect( '/' );
    }
  } );
} );

/** 
 * Navigation to the index page via POST request, currently sends to the list of new dynamic issues. Checks for authorization, the callback function
 * creates the index page.
 * 
 * @param {Object} req - the request object
 * @param {Object} res - the response object 
 */
expressServer.app.post('/index', function(req, res) 
{
  var exceptions = helpers.getLoggers().exceptions;
  //runs the authorization check
  helpers.authCheck( '/index', req, res, function( request, response )
  {
    try
    {
      //creates the index page 
      index.reviewIssue( request, response );
    }
    catch( err )
    {
      exceptions.log( "error", "Error creating index page", { error : err } );
      response.redirect( '/' );
    }
  } );
} );

/**
 * Function to review a single static analysis issue, via POST request only
 * 
 * @param {Object} req The request object
 * @param {Object} res The response object 
 */
expressServer.app.post( '/reviewStaticIssue', function( req, res )
{
  helpers.authCheck( '/reviewStaticIssue', req, res, function( request, response )
  {
    static.reviewStaticIssue( request, response );
  } );
} );

/** 
 * Navigation to the report page via GET request. Checks for authorization, and then uses the callback function
 * to bring up the proper report, based on the parameters passed into the request
 * 
 * @param {Object} req - the request object
 * @param {Object} res - the response object
 */
expressServer.app.get("/report", function(req, res) 
{
  helpers.authCheck( '/report',  req, res, cweReport.routeReport );
} );

/**
 * Logout functionality is contained here. It is always assumed to be successful. It destroys the users current session object
 * in the database, and then redirects the user to the root page (login screen at present, though this will probably change later)
 * 
 * @param {Object} req - the request object
 * @param {Object} res - the response object 
 */
expressServer.app.get('/logout', function(req, res) 
{
  req.session.destroy();
  res.redirect('/');
} );

/**
 * No one should be accessing /authenticate as a GET request. So, if this page is reached, it will redirect
 * back to the root directory.
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
expressServer.app.get( '/authenticate', function( req, res ) 
{
  res.redirect('/');
} );

/**
 * POST request for the authenticate functionality. 
 * 
 * @param {Object} req - the request object
 * @param {Object} res - the response object 
 */
expressServer.app.post( '/authenticate', auth.authenticate );

/** 
 * Handler for when a user navigates to the root page of the system. Redirects to /index if the user is already authenticated
 * 
 * @param {Object} req The request object
 * @param {Object} res The response object
 */
expressServer.app.get( '/', function( req, res ) 
{
  //grabbing the info log
  var info = helpers.getLoggers().info;
  //if the user was already authenticated, present the index page
  if ( req.cookies && req.cookies.session_id && auth.authCheck( req.session.username ) ) 
  {
    var errorString = "";
    if( req.query.error )
    {
      for( key in req.query.error )
      {
        errorString += "error[" + key + "]=" + req.query.error[ key ] + "&"; 
      } 
    }
    res.redirect( '/index?' + errorString );
  } 
  //if this is a new user, display the login form
  else 
  {
    info.log( 'info', 'Presenting the login page' );
    
    var new_loc = req.query.new_loc;

    res.render( 'login.jade', { _csrf : csrfUtil.addTokenToForm( req, res ), new_loc : encodeURI( new_loc ) } );
  }
} );

/**
 * Handler for when a user navigates to the static issues list.
 *  
 * @param {Object} req The request object
 * @param {Object} res The response object
 */
expressServer.app.get( '/static_issues', function( req, res )
{
  helpers.authCheck( '/static_issues', req, res, static.findStaticIssues );
} );

/**
 * Handler for when a user clicks into a specific application, data returned should populate the projects list for that application.
 * 
 * @param {Object} req The request object
 * @param {Object} res The response object 
 */
expressServer.app.get( "/getProjectList", function( req, res )
{
  helpers.authCheck( '/getProjectList', req, res, static.displayProjectsForApplication );
} );

expressServer.app.get( "/getTraceAndCode", function( req, res )
{
  helpers.authCheck( '/getTraceAndCode', req, res, static.getTraceAndCode );
} );

/** 
 * Handler for bringing up the permanent link to a specific static issue. 
 *  
 * @param {Object} req The request object
 * @param {Object} The response object
 */
expressServer.app.get( "/static_issues/permlink", function( req, res )
{
  helpers.authCheck( '/static_issues/permlink', req, res, static.permanentLink );
} );

/** 
 * Function that should stop the server at the end of testing, I hope 
 */
function stopServer()
{  
  sslServer.close();
  httpServer.close();
}

exports.stopServer = stopServer;