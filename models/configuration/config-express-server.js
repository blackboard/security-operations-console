var crowd = require( '../authentication/crowd.js' );
var xssUtil = require( '../security/xss-util.js' );
var logger = require( './new-logger.js' );
var passwordManagement = require( '../authentication/password-management.js' );
var helper = require( '../helpers.js' );

var event = require( 'events' );
var fs = require( 'fs' );

var mongo = require( '../../node_modules/mongodb' );
var mongoStore = require( '../../node_modules/connect-mongodb' );

var express = require( '../../node_modules/express' );
var stylus = require( '../../node_modules/stylus' );
var nib = require( '../../node_modules/nib' );

/**
 * @class Contains all of the configuration parameters for the application. It also sets up the application 
 * with logging, as well as comntains the event emitter used to determine if the application configuration methods
 * were successful.  
 * 
 * @author Matthew Saltzman
 * @since 7-24-2013
 */
var config = 
{
  /** event emitter for the configuration items */
  _ee : new event.EventEmitter(),
  /** The MongoDB server we will use. Configured in function configureDatabaseServer */
  _dbServer : null,
  /** The database in the Mongo server being used */
  _database : null,
  /** Hostname for the Scala server */ 
  _scalaHostname : null,
  /** Port number in use by Scala */
  _scalaPort : null,
  /** Port that our express server should use */
  _port : null,
  /** http port to redirect to https */
  _httpPort : null,
  /** SSL Certificate Key File */
  _privateKey : null,
  /** SSL Certificate Cert File */
  _certificate : null,
  /** node server hostname */ 
  _hostname : null,
  /** crowd hostname */
  _crowdServer : null,
  /** crowd authentication url */
  _crowdAuthUrl : null,
  /** crowd server credentials */
  _crowdCredentials : null,
  /** crowd groups that have admin privileges */
  _crowdAdminGroups : null,
  /** crowd username for ops console */
  _crowdUsername : null,
  /** Password management server hostname */
  _pmpHostname : null,
  /** Authentication token for the pmp server */
  _pmpAuthtoken : null,
  /** The port for the pmp server */
  _pmpPort : null,
  /** @class set of logs for the application */
  _logs : {
    /** The logger for all application exceptions */
    exceptions : null,
    /** The logger for security events that occur */
    security : null,
    /** The logger for normal application activity */
    info : null
  },  
    
  /**
   * Configures the initial settings of the MongoDB server, assuming we know the server, port, and 
   * connection pool size
   *  
   * @param {string} server The ip address or hostname of the mongoDb server
   * @param {number} port The port number that MongoDB is configured to run on
   * @param {number} newPoolSize The size of the connection pool to be maintained by our server. Defaults to 100  
   * 
   * @throws an error if server or port is not defined
   * @throws an error if server, port, or newPoolSize are the wrong type
   */
  configureDatabaseServer : function( server, port, newPoolSize ) 
  {
    //error checking, validating that the parameters being received are as described above
    if( newPoolSize != null && typeof newPoolSize !== 'number' )
    {
      throw new Error( "newPoolSize parameter must be a number" );
    }    
    if( typeof server !== 'string' )
    {
      throw new Error( "server parameter must be a string" );
    }
    if( typeof port !== 'number' )
    {
      throw new Error( "port parameter must be a number" );
    }
    
    //sets the connection pool size to either the number passed in, or the default value of 100 
    var pool = ( newPoolSize !== null ) ? newPoolSize : 100;
    
    //set up the database server
    this._dbServer = new mongo.Server( server, port, {
      auto_reconnect : true,
      poolSize : pool
    } ); 
    
    this._logs.info.log( 'info', 'Database server configured' );
    
    this._ee.emit( 'config' );
  },
  
  /**
   * Function to configure the database within the MongoDB server that the application will use
   *  
   * @param {string} databaseName The name of the database being used
   * 
   * @throws error if the database name is not a valid string
   */
  configureDatabase : function( databaseName )
  {
    //Error checking the database name
    if( typeof databaseName !== 'string' )
    {
      throw new Error( "database name must be a string" );
    }
    
    //setting the database variable to point to the dabase in use by this application
    this._database = new mongo.Db( databaseName, this._dbServer, {
      reaper : true
    } );
    
    this._logs.info.log( 'info', 'Database configured' );
    this._ee.emit( 'config' );
  },
  
  /**
   * Function to set the Express port
   * 
   * @param {number} port The port number that express should use
   * @param {number} httpPort The redirect to https port 
   * 
   * @throws an error if the port parameter is not a number
   * @throws an error if the httpPort parameter is not a number 
   */
  setExpressPort : function( port, httpPort )
  {
    if( typeof port != 'number' )
    {
      throw new Error( "port parameter must be a number" );
    }
    
    if( typeof httpPort != 'number' )
    {
      throw new Error( "httpPort parameter must be a number" );
    }
    
    this._port = port;
    this._httpPort = httpPort;
    
    this._logs.info.log( 'info', 'Console\'s running port set' );
    this._ee.emit( 'config' );
  },
  
  /**
   * Function to set the express hostname
   * 
   * @param {string} hostname the hostname of the server
   *  
   * @throws an error if the hostname parameter is not a string
   */
  setExpressHostname : function( hostname )
  {
    if( typeof hostname != 'string' )
    {
      throw new Error( "hostname parameter must be a string" );
    }
    
    this._hostname = hostname;
    this._logs.info.log( 'info', 'Console\'s hostname set' );
    
    this._ee.emit( 'config' );
  },
  
  /**
   * Function used to open a database connection to MongoDB
   *
   * @param {mongo.Db} database The mongo database we want to open a connection to
   * @throws Database connection error
   */  
  connectToDatabase : function( database ) 
  {
    this._logs.info.log( 'info', 'Opening Database Pool' );
    database.open( function( err, db ) 
    {
      if ( err ) 
      {
        throw new Error( 'Error connecting to database: ' + err );
      } 
      else 
      {
        config._logs.info.log( 'info', 'Connected to Database' );
      }
    } );
    this._ee.emit( 'config' );  
  },
  /**
   * Function used to configure the SSL key and cert files for use by express
   *  
   * @param key The private key file
   * @param cert The public certificate
   */
  configureSslParameters : function( key, cert )
  {
    this._logs.info.log( 'info', 'reading in ssl key and cert files' );
    
    this._privateKey = fs.readFileSync( key );
    this._certificate = fs.readFileSync( cert );
    
    this._logs.info.log( 'info', 'SSL certificate included' );
    
    this._ee.emit( 'config' );
  },
  
  /**
   * Configures the config object's two parameters for crowd, _crowdServer and _crowdAuthUrl. 
   * 
   * @param {string} hostname The hostname of the crowd server
   * @param {string} url The URL used in the soap request for the hostname
   * @param {boolean} ssl Whether the SOAP request to crowd uses SSL or not
   * @param {string} username The crowd username for the server (could be null if pmp server is used)
   * @param {string} credentials The crowd password for the server (could be null if pmp server is used
   * @param {Array} adminGroups The set of groups that have admin privileges in this tool
   * 
   * @throws exception if hostname is not a string
   * @throws exception if url is not a string
   * @throws exception if ssl is not true or false  
   */
  configureCrowdParameters : function( hostname, url, ssl, username, credentials, adminGroups )
  {
    //verifies that hostname is passed in as a string from the config file 
    if( typeof hostname != 'string' )
    {
      throw new Error( "Hostname parameter must be a string" );
    }
    //verifies that url is passed in as a string
    if( typeof url != 'string' )
    {
      throw new Error( "Url parameter must be a string" );
    }
    //verifies that ssl is either true or false
    if( typeof ssl != 'boolean' )
    {
      throw new Error( "ssl parameter must be either true or false" );
    }
    
    var protocol = null;
    //testing for ssl, sets the protocol accordingly 
    if( ssl )
    {
      //this most likely will always be the case
      protocol = 'https';
    }
    else
    {
      //should not be reached, especially for authentication
      protocol = 'http';
    }
    
    //sets the two crowd parameters
    this._crowdServer = hostname;
    this._crowdAuthUrl = protocol + '://' + hostname + url;
    this._crowdUsername = username;
    this._crowdCredentials = credentials;
    this._crowdAdminGroups = adminGroups;
    
    //connect the server to crowd
    if( this._crowdUsername != null && this._crowdCredentials != null )
    {
      crowd.authenticateServer( this._crowdAuthUrl, username, credentials );
    }

    this._logs.info.log( 'info', 'Connected to Crowd authentication server' );
    this._ee.emit( 'config' );
  },
  
  /**
   * Function that configures the 3 logs for this application, info log, exception log, and the security log. Since error trapping based on these parameters
   * is handled within logger constructor, we don't need to test them here. All parameters passed in should come from the configuration file.
   * 
   * @param {string} root The root directory for the logs 
   * @param {string} infoFilename The filename for the info log
   * @param {string} infoLevel The log level of the info log
   * @param {string} exceptionsFilename The filename for the exceptions log
   * @param {string} exceptionsLevel The log level for the exceptions log
   * @param {string} securityFilename The filename for the security log
   * @param {string} securityLevel The log level for the security log
   */
  configureLoggers : function( root, infoFilename, infoLevel, exceptionsFilename, exceptionsLevel, securityFilename, securityLevel )
  {
    //creating an exceptions log. This should handle the exceptions thrown by the application
    this._logs.exceptions = new logger( [ 'file', 'mongodb' ], exceptionsLevel, true, true, 
                                        root + '/' + exceptionsFilename, 'ISSUES', 'EXCEPTIONS_LOG' );
    //creating the info log. This should contain the information about what is happening in the application, similar to an activity log
    this._logs.info = new logger( [ 'file', 'mongodb' ], infoLevel, true, false, 
                                  root + '/' + infoFilename, 'ISSUES', 'INFO_LOG' );
    //creating the security log. This should handle all security events in the application
    this._logs.security = new logger( [ 'file', 'mongodb' ], securityLevel, true, false, 
                                      root + '/' + securityFilename, 'ISSUES', 'SECURITY_LOG' );
    
    this._logs.info.log( 'info', 'Loggers initialized' );
    //emit the config event
    this._ee.emit( 'config' );
  },
  
  /**
   * Setting the server's root directory for use in checking for path traversal attacks.
   * 
   * @param {string} root The root directory of the application 
   */
  configureServerRoot : function( root )
  {
    //setting the server's root directory
    xssUtil.setServerRoot( root );
    
    //emitting the config event
    this._ee.emit( 'config' );
  },

  /**
   * Function to set the pmpHostname property, allowing us to pull passwords from the pmp server
   *
   * @param {string} hostname The Password Management server hostname
   * @param {string} port The port number for the pmp server
   * @param {string} authToken The pmp auth token assigned to the server
   */
  setPmpHostname : function( hostname, port, authToken )
  {
    this._pmpHostname = hostname;
    this._pmpPort = port;
    this._pmpAuthtoken = authToken;

    this._ee.once( 'complete', function( error )
    {
      if( !error )
      {
        config._crowdUsername = passwordManagement.username;
        config._crowdCredentials = passwordManagement.password;

        crowd.authenticateServer( config._crowdAuthUrl, config._crowdUsername, config._crowdCredentials );
        config._ee.emit( 'config' );
      }
      else
      {
        config._logs.exceptions.log( 'error', "Error retrieving crowd password", error );
      }
    } );

    helper.setConfig( this );
    passwordManagement.getAccountInfo( this._ee );
  }
};

/** 
 * @class Contains the node.js server for the application. Contains configuration functions for the server,
 * and functions that support it.
 * 
 * @author Matthew Saltzman
 * @since 7-24-2013 
 */
var expressServer = 
{
  /** The express server */
  app : null,
  
  /**
   * Making a funciton to set the app parameter for testing purposes. In this way,
   * the actual express server does not need to be initialized to test the configuration
   * parameters. Does not output a config event, since there is no logic here.
   * 
   * @param {function} express The express package to initialize app with. 
   */
  setApp : function( express )
  {
    this.app = express();
  },
  
  /**
   * Configures express server with some basic settings. Assumes correct folder paths 
   * beforehand 
   *  
   * @param {string} viewsFolder Location where jade template files are stored
   * @param {string} publicFolder Location where static content is stored
   */
  configureExpressServer : function( viewsFolder, publicFolder )
  {
    //configures express app to use the jade template engine
    this.app.set( 'views', viewsFolder );
    this.app.set( 'view engine', 'jade' );
    //allows express to parse POST requests
    this.app.use( express.bodyParser() );
    //allows express to parse cookies for information
    this.app.use( express.cookieParser() );
    //sets the default static content folder
    this.app.use( express.static( publicFolder ) );
    //creates a default error page in case of internal server errors
    this.app.use(function(err, req, res, next) 
    {
      console.error(err.stack);
      res.send(500, 'Something broke!');
    } );
    
    config._logs.info.log( 'info', 'Express middleware configured' );
    
    config._ee.emit( 'config' );
  },
  /**
   * Configures Stylus implementation for Express server. Assumes correct folder paths
   *  
   * @param {string} debugSetting True or false value of whether to allow debug output or not
   * @param {string} srcFolder The source folder for .styl files 
   * @param {string} destFolder The output folder where compiled .css files should be placed
   * @param {string} warn True or false value of whether to show warnings
   * 
   * @throws error If debugSetting is anything but true or false
   * @throws error If warn is anything but true or false
   */
  configureStylus : function( debugSetting, srcFolder, destFolder, warn )
  {
    //error checking, validating that the parameters being received are as described above
    if( typeof debugSetting !== 'boolean' )
    {
      throw new Error( "debug parameter should only be true or false" );
    }
    if( typeof warn !== 'boolean' )
    {
      throw new Error( "warn parameter should only be true or false" ); 
    }
    
    this.app.use( stylus.middleware( {
      debug : debugSetting,
      src : srcFolder,
      dest : destFolder,
      
      /* Custom compile function to allow for some additional functionality including:
       *  compression
       *  warnings
       *  using nib (additional functionality for stylus in a separate library)
       */  
      compile : function( str, path )
      {
        return stylus( str ).set( 'filename', path ).set( 'compress', true ).set( 'warn', warn ).use( nib() ).import( 'nib' );
      }
    } ) );
  
    config._logs.info.log( 'info', 'Stylus css compiler configured' );
    
    config._ee.emit( 'config' );
  },
  /**
   * Configures cookies for Express server. Uses database as storage location for cookie information
   *  
   * @param {number} cookieMaxAge The maximum age of a cookie (in milliseconds)
   * @param {string} cookieKey The name of the cookie we're creating
   * @param {string} cookieSecret A salt for the cookie value
   * @param {string} mongoHostname The hostname of the MongoDB server, used to store cookies
   * @param {number} mongoPort The port number that MongoDB is running on
   * @param {string} mongoDatabase The name of the database being used in the MongoDB server for storing the cookie
   *                                 information, should match the database being used to store issues
   * 
   * @throws An error if any parameter does not match its' defined type
   */
  configureCookies : function( cookieMaxAge, cookieKey, cookieSecret, mongoHostname, mongoPort, mongoDatabase )
  {
    //error checking
    if( typeof cookieMaxAge !== 'number' ) 
    {
      throw new Error( "cookieMaxAge parameter must be a number" ); 
    }
    if( typeof cookieKey !== 'string' )
    {
      throw new Error( "cookieKey parameter must be a string" );
    }
    if( typeof cookieSecret !== 'string' )
    {
      throw new Error( "cookieSecret parameter must be a string" );
    }
    if( typeof mongoHostname !== 'string' )
    {
      throw new Error( "mongoHostname parameter must be a string" );
    }
    if( typeof mongoPort !== 'number' )
    {
      throw new Error( "mongoPort parameter must be a number" );
    }
    if( typeof mongoDatabase !== 'string' )
    {
      throw new error( "mongoDatabase parameter must be a string" );
    }
        
    this.app.use( express.session( 
    {
      //sets some default cookie options
      cookie : 
      {
        maxAge : cookieMaxAge,
        //sets the path for the session cookie, for now, always set to the root
        path : '/',
        //adding httpOnly flag
        httpOnly : true,
        //adding secure flag, since console requires SSL
        secure : true
      },
      //sets a salt for the cookie value
      secret : cookieSecret,
      //sets the name of the cookie we want to create
      key : cookieKey,
      //storage location for the cookie information on the server
      store : new mongoStore( 
      {
        db : new mongo.Db( mongoDatabase, new mongo.Server( mongoHostname, mongoPort, {} ) )
      } )
    } ) );
    
    //allws express to utilize built in CSRF protections
    this.app.use( express.csrf() );
    
    config._logs.info.log( 'info', 'Session Cookies and CSRF tokens configured' );
        
    config._ee.emit( 'config' );
  }
};

exports.config = config;
exports.expressServer = expressServer;
