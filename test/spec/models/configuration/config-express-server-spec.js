describe( "Testing the config-express-server file", function()
{
  var config = require( '../../../../models/configuration/config-express-server.js' );
  var mongo = require( '../../../../node_modules/mongodb' );
  
  var conf = config.config;
  var expressServer = config.expressServer;
  
  beforeEach( function()
  {
    spyOn( conf._ee, 'emit' );  
  } );
  
  describe( "Testing the config object", function()
  {
    describe( "Testing the configureDatabaseServer function", function()
    {
      var server = 'dummy.server.local';
      var port = 411;
      var newPoolSize = 20;
      
      beforeEach( function()
      {
        spyOn( mongo, 'Server' ).andCallFake( function( server, port, params )
        {
          var retObject = {
            _server : server,
            _port : port,
            _params : params 
          };
          
          return retObject;
        } );
        
        conf._logs = {
          info : {
            log : jasmine.createSpy( 'log' )
          }
        };
      } );
      
      it( "sets the database parameters within the config object when successful", function()
      {
        var expectedDbServer = {
          _server : 'dummy.server.local',
          _port : 411,
          _params : {
            auto_reconnect : true,
            poolSize : 20
          }
        };
        
        expect( function() { conf.configureDatabaseServer( server, port, newPoolSize ); } ).not.toThrow();        
        expect( conf._dbServer ).toEqual( expectedDbServer );
        expect( conf._ee.emit ).toHaveBeenCalled();
        
        var expectedDbServer = {
          _server : 'dummy.server.local',
          _port : 411,
          _params : {
            auto_reconnect : true,
            poolSize : 100
          }
        };
        
        expect( function() { conf.configureDatabaseServer( server, port, null ); } ).not.toThrow();
        expect( conf._dbServer ).toEqual( expectedDbServer );
      } );
      
      it( "Throws an error if any parameter is not the expected type", function()
      {
        expect( function() { conf.configureDatabaseServer( null, port, newPoolSize ) ;} ).toThrow();
        expect( function() { conf.configureDatabaseServer( 0, port, newPoolSize ); } ).toThrow();
        expect( function() { conf.configureDatabaseServer( function() {}, port, newPoolSize ); } ).toThrow();
        expect( function() { conf.configureDatabaseServer( {}, port, newPoolSize ); } ).toThrow();
        expect( function() { conf.configureDatabaseServer( server, null, newPoolSize ); } ).toThrow();
        expect( function() { conf.configureDatabaseServer( server, 'hi', newPoolSize ); } ).toThrow();
        expect( function() { conf.configureDatabaseServer( server, '411', newPoolSize ); } ).toThrow();
        expect( function() { conf.configureDatabaseServer( server, function() {}, newPoolSize ); } ).toThrow();
        expect( function() { conf.configureDatabaseServer( server, {}, newPoolSize ); } ).toThrow();
        expect( function() { conf.configureDatabaseServer( server, port, 'hi' ); } ).toThrow();
        expect( function() { conf.configureDatabaseServer( server, port, '411' ); } ).toThrow();
        expect( function() { conf.configureDatabaseServer( server, port, function() {} ); } ).toThrow();
        expect( function() { conf.configureDatabaseServer( server, port, {} ); } ).toThrow();
        expect( mongo.Server ).not.toHaveBeenCalled();
        expect( conf._ee.emit ).not.toHaveBeenCalled();
      } );
    } );
    
    describe( "Testing the configureDatabase function", function()
    {
      beforeEach( function()
      {
        spyOn( mongo, 'Db' );
        
        conf._logs = {
          info : {
            log : jasmine.createSpy( 'log' )
          }
        };
      } );
      
      it( "configures the database properly when databaseName is a string", function()
      {
        expect( function() { conf.configureDatabase( 'dummyDb' ); } ).not.toThrow();
        expect( mongo.Db ).toHaveBeenCalledWith( 'dummyDb', jasmine.any( Object ), { reaper : true } );
        expect( conf._ee.emit ).toHaveBeenCalled();
      } );
      
      it( "throws an error when databaseName is not a string", function()
      {
        expect( function() { conf.configureDatabase( null ); } ).toThrow;
        expect( function() { conf.configureDatabase( 1 ); } ).toThrow;
        expect( function() { conf.configureDatabase( true ); } ).toThrow;
        expect( function() { conf.configureDatabase( { name : 'string' } ); } ).toThrow;
        expect( function() { conf.configureDatabase( function() {} ); } ).toThrow;
        expect( mongo.Db ).not.toHaveBeenCalled();
        expect( conf._ee.emit ).not.toHaveBeenCalled();
      } );
    } );
    
    describe( "Testing the setExpressPort function", function() 
    {
      beforeEach( function()
      {
        conf._logs = {
          info : {
            log : jasmine.createSpy( 'log' )
          }
        };
      } );
      it( "sets the _port and _httpPort parameter", function()
      {
        expect( function() { conf.setExpressPort( 443, 80 ); } ).not.toThrow();
        expect( conf._port ).toEqual( 443 );
        expect( conf._httpPort ).toEqual( 80 );
        expect( conf._ee.emit ).toHaveBeenCalled();
      } );
      
      it( "throws an error if the port parameter is not a number", function()
      {
        expect( function() { conf.setExpressPort( null, 1 ); } ).toThrow();
        expect( function() { conf.setExpressPort( 'string', 1 ); } ).toThrow();
        expect( function() { conf.setExpressPort( true, 1 ); } ).toThrow();
        expect( function() { conf.setExpressPort( function() {}, 1 ); } ).toThrow();
        expect( function() { conf.setExpressPort( {}, 1 ); } ).toThrow();
        expect( function() { conf.setExpressPort( 1, null ); } ).toThrow();
        expect( function() { conf.setExpressPort( 1, 'string' ); } ).toThrow();
        expect( function() { conf.setExpressPort( 1, true ); } ).toThrow();
        expect( function() { conf.setExpressPort( 1, function() {} ); } ).toThrow();
        expect( function() { conf.setExpressPort( 1, {} ); } ).toThrow();
      } );
    } );
    
    describe( "Testing the setExpressHostname function", function()
    {
      beforeEach( function()
      {
        conf._logs = {
          info : {
            log : jasmine.createSpy( 'log' )
          }
        };
      } );
      it( "sets the _hostname parameter", function()
      {
        expect( function() { conf.setExpressHostname( 'hostname' ); } ).not.toThrow();
        expect( conf._hostname ).toEqual( 'hostname' );
        expect( conf._ee.emit ).toHaveBeenCalled();
      } );
      
      it( "throws an error if the hostname parameter is not a string", function()
      {
        expect( function() { conf.setExpressHostname( null ); } ).toThrow();
        expect( function() { conf.setExpressHostname( 1 ); } ).toThrow();
        expect( function() { conf.setExpressHostname( true ); } ).toThrow();
        expect( function() { conf.setExpressHostname( function() {} ); } ).toThrow();
        expect( function() { conf.setExpressHostname( {} ); } ).toThrow();
      } );
    } );
    
    describe( "Testing the connectToDatabase function", function()
    {
      var database;
      var db;
    
      beforeEach( function()
      {
        conf._logs = {
          info : {
            log : jasmine.createSpy( 'log' )
          }
        };
      } );
    
      it( "connects to the database under normal conditions", function()
      {
        database = {
          open : function( callback )
          {
            callback( null, this );
          }
        };
      
        expect( function() { conf.connectToDatabase( database ); } ).not.toThrow();
        expect( conf._ee.emit ).toHaveBeenCalled();
      } );
    
      it( "Throws an error if there was a problem connecting to the database", function()
      {
        database = {
          open : function( callback )
          {
            callback( 'dummy error', this );
          }
        };
     
        expect( function() { conf.connectToDatabase( database ); } ).toThrow();
        expect( conf._ee.emit ).not.toHaveBeenCalled();
      } );
    } );
    
    //Not testing error ocnditions, as error throwing is handled by native function fs.readFileSync
    describe( "Testing configureSslParameters function", function()
    {
      var fs = require( 'fs' );
      
      beforeEach( function()
      {
        conf._logs = {
          info : {
            log : jasmine.createSpy( 'log' )
          }
        };
        
        spyOn( fs, 'readFileSync' ).andCallFake( function( param )
        {
          return param;
        } );
      } );  
      
      it( 'sets the _privateKey and _certificate parameters', function()
      {
        conf.configureSslParameters( 'key', 'cert' );
        
        expect( conf._privateKey ).toEqual( 'key' );
        expect( conf._certificate ).toEqual( 'cert' );
      } );   
    } );
    
    describe( "Testing the configureCrowdParameters function", function()
    {
      var crowd = require( '../../../../models/authentication/crowd.js' );
      beforeEach( function()
      {
        spyOn( crowd, 'authenticateServer' );
        
        conf._logs = {
          info : {
            log : jasmine.createSpy( 'log' )
          }
        };
      } );
      
      it( "sets the _crowdServer, _crowdAuthUrl parameters, and connects to the crowd server", function()
      {
        expect( function() { conf.configureCrowdParameters( 'hostname', '/url', true, "user", "pass", [ 1, 2 ] ); } ).not.toThrow();
        
        expect( conf._crowdServer ).toEqual( 'hostname' );
        expect( conf._crowdAuthUrl ).toEqual( 'https://hostname/url' );
        expect( conf._crowdCredentials ).toEqual( 'pass' );
        expect( conf._crowdUsername).toEqual( 'user' );
        expect( crowd.authenticateServer ).toHaveBeenCalled();
        expect( conf._ee.emit ).toHaveBeenCalled();
      } );
      
      it( "throws an error if either the hostname or the url is not a string", function()
      {
        expect( function() { conf.configureCrowdParameters( null, 'url', true ); } ).toThrow();
        expect( function() { conf.configureCrowdParameters( 1, 'url', true ); } ).toThrow();
        expect( function() { conf.configureCrowdParameters( true, 'url', true ); } ).toThrow();
        expect( function() { conf.configureCrowdParameters( function() {}, 'url', true ); } ).toThrow();
        expect( function() { conf.configureCrowdParameters( { string : 'string' }, 'url', true ); } ).toThrow();
        expect( function() { conf.configureCrowdParameters( 'hostname', null, true ); } ).toThrow();
        expect( function() { conf.configureCrowdParameters( 'hostname', 1, true ); } ).toThrow();
        expect( function() { conf.configureCrowdParameters( 'hostname', true, true ); } ).toThrow();
        expect( function() { conf.configureCrowdParameters( 'hostname', function() {}, true ); } ).toThrow();
        expect( function() { conf.configureCrowdParameters( 'hostname', { string : 'string' }, true ); } ).toThrow();
        expect( crowd.authenticateServer ).not.toHaveBeenCalled();
        expect( conf._ee.emit ).not.toHaveBeenCalled();
      } );
      
      it( "throws an error if the ssl parameter is not a boolean value", function()
      {
        expect( function() { conf.configureCrowdParameters( 'hostname', 'url', null ); } ).toThrow();
        expect( function() { conf.configureCrowdParameters( 'hostname', 'url', 'string' ); } ).toThrow();
        expect( function() { conf.configureCrowdParameters( 'hostname', 'url', 1 ); } ).toThrow();
        expect( function() { conf.configureCrowdParameters( 'hostname', 'url', function() {} ); } ).toThrow();
        expect( function() { conf.configureCrowdParameters( 'hostname', 'url', { bool : false } ); } ).toThrow();
        expect( crowd.authenticateServer ).not.toHaveBeenCalled();
        expect( conf._ee.emit ).not.toHaveBeenCalled();
      } );

      it( "does not set the username and password if they are null, and does not authenticate server to crowd", function()
      {
        expect( function() { conf.configureCrowdParameters( 'hostname', '/url', true, null, null, [ 1, 2 ] ); } ).not.toThrow();

        expect( conf._crowdServer ).toEqual( 'hostname' );
        expect( conf._crowdAuthUrl ).toEqual( 'https://hostname/url' );
        expect( conf._crowdCredentials ).toBeNull();
        expect( conf._crowdUsername).toBeNull();
        expect( crowd.authenticateServer ).not.toHaveBeenCalled();
        expect( conf._ee.emit ).toHaveBeenCalled();
      } );
    } );
    
    describe( "Testing the configureServerRoot function", function()
    {
      var xssUtil = require( '../../../../models/security/xss-util.js' );
      
      it( "sets the server root in xss-util and then emits a config event", function()
      {
        spyOn( xssUtil, "setServerRoot" );
        
        conf.configureServerRoot( '/' );
        
        expect( xssUtil.setServerRoot ).toHaveBeenCalled();
        expect( conf._ee.emit ).toHaveBeenCalled();
      } );
    } );
    
    describe( "Testing the configureLoggers function", function()
    {
      var xssUtil = require( '../../../../models/security/xss-util.js' );
      var logger = require( '../../../../models/configuration/new-logger.js' );
      
      beforeEach( function()
      {
        spyOn( logger.prototype, 'log' );
        spyOn( xssUtil, 'isPathTraversal' ).andReturn( false );
      } );
           
      it( "creates 3 logs and emits a config event", function()
      {
        expect( function() { conf.configureLoggers( '/mock/logs', 'info.log', 'info', 'exceptions.log', 'info', 'security.log', 'info' ); } ).not.toThrow();
        
        expect( conf._ee.emit ).toHaveBeenCalled();
        
        expect( conf._logs.exceptions ).not.toBeUndefined();
        expect( conf._logs.security ).not.toBeUndefined();
        expect( conf._logs.info ).not.toBeUndefined();
      } );
    } );

    describe( "Testing the setPmpHostname function", function()
    {
      var crowd = require( '../../../../models/authentication/crowd.js' );
      var passwordManagement = require( '../../../../models/authentication/password-management.js' );
      beforeEach( function()
      {
        conf._ee.emit.andCallThrough();
        spyOn( crowd, 'authenticateServer' );
        spyOn( passwordManagement, 'getAccountInfo' ).andCallFake( function( ee )
        {
          passwordManagement.username = 'user';
          passwordManagement.password = 'pass';
          ee.emit( 'complete' );
        } );

        conf._logs.exceptions = {
          log : function() {}
        }
      } );

      it( "sets the _pmpHostname, _pmpPort, and _pmpAuthtoken parameters, if they exist, and authenticates the console to crowd", function()
      {
        expect( function() { conf.setPmpHostname( "test", "1", "token" ); } ).not.toThrow();
        expect( conf._ee.emit ).toHaveBeenCalledWith( 'config' );
        expect( conf._pmpHostname ).toEqual( "test" );
        expect( conf._pmpPort).toEqual( "1" );
        expect( conf._pmpAuthtoken ).toEqual( "token" );
        expect( crowd.authenticateServer ).toHaveBeenCalledWith( "https://hostname/url", 'user', 'pass' );
      } );

      it( "does not emit the config event if an error was sent back with the complete event", function()
      {
        passwordManagement.getAccountInfo.andCallFake( function( ee )
        {
          ee.emit( 'complete', { status : "Failed" } );
        } );

        expect( function() { conf.setPmpHostname( "test", "1", "token" ); } ).not.toThrow();
        expect( conf._ee.emit ).not.toHaveBeenCalledWith( 'config' );
        expect( conf._pmpHostname ).toEqual( "test" );
        expect( conf._pmpPort).toEqual( "1" );
        expect( conf._pmpAuthtoken ).toEqual( "token" );
        expect( crowd.authenticateServer ).not.toHaveBeenCalledWith( undefined, 'user', 'pass' );
      } );
    } );
  } );
  
  describe( "Testing the expressServer object", function() 
  {
    var app = null;
    var express = require( '../../../../node_modules/express' );
    
    beforeEach( function()
    {
      conf._logs = {
        info : {
          log : jasmine.createSpy( 'log' )
        }
      };
      app = function()
      {
        var retVal = jasmine.createSpyObj( 'retVal', [ 'set', 'use' ] );
        
        return retVal;
      };
    } );
    
    describe( "Testing the setApp function", function() 
    {
      it( "properly sets the app parameter for the expressServer object", function()
      {
        var express = function() {
          return 'something';
        }; 
        
        expressServer.setApp( express );
        expect( expressServer.app ).toEqual( 'something' );
      } );
      
      it( "Throws an error if the express parameter is not a function", function()
      {        
        expect( function() { expressServer.setApp( null ); } ).toThrow();
        expect( function() { expressServer.setApp( 'a' ); } ).toThrow();
        expect( function() { expressServer.setApp( {} ); } ).toThrow();
        expect( function() { expressServer.setApp( true ); } ).toThrow();
        expect( function() { expressServer.setApp( function() {} ); } ).not.toThrow();
      } );
    } );
    
    describe( "Testing the configureExpressServer function", function() 
    {
      it( "calls app.set twice, app.use four times, and then emits a completion signal", function()
      { 
        expressServer.setApp( app );
        
        expressServer.configureExpressServer( 'views', 'public' );
        
        expect( expressServer.app.set.calls.length ).toEqual( 2 );
        expect( expressServer.app.set ).toHaveBeenCalledWith( 'views', 'views' );
        expect( expressServer.app.set ).toHaveBeenCalledWith( 'view engine', 'jade' );
        expect( expressServer.app.use.calls.length ).toEqual( 4 );
        expect( expressServer.app.use ).toHaveBeenCalledWith( jasmine.any( Function ) );
        expect( conf._ee.emit ).toHaveBeenCalled();
      } );
    } );
    
    describe( "Testing the configureStylus function", function()
    {
      var stylus = require( '../../../../node_modules/stylus' );
      
      it( "configures the stylus middleware, and then emits a signal that it has completed", function()
      {
        spyOn( stylus, 'middleware' );
        
        var expectedCall = {
          debug : true,
          src : 'srcFolder',
          dest : 'destFolder',
          compile : jasmine.any( Function )
        };
        
        expressServer.setApp( app );
        
        expect( function() { expressServer.configureStylus( true, 'srcFolder', 'destFolder', true ); } ).not.toThrow();
        expect( expressServer.app.use.calls.length ).toEqual( 1 );
        expect( stylus.middleware ).toHaveBeenCalledWith( expectedCall );
        expect( conf._ee.emit ).toHaveBeenCalled();
      } );
      
      it( "throws an error if warn or debugSetting is not a boolean value", function()
      {
        spyOn( stylus, 'middleware' );
        
        expressServer.setApp( app );
        
        expect( function() { expressServer.configureStylus( null, 'srcFolder', 'destFolder', true ); } ).toThrow();
        expect( function() { expressServer.configureStylus( 1, 'srcFolder', 'destFolder', true ); } ).toThrow();
        expect( function() { expressServer.configureStylus( 'true', 'srcFolder', 'destFolder', true ); } ).toThrow();
        expect( function() { expressServer.configureStylus( function() {}, 'srcFolder', 'destFolder', true ); } ).toThrow();
        expect( function() { expressServer.configureStylus( {}, 'srcFolder', 'destFolder', true ); } ).toThrow();
        expect( function() { expressServer.configureStylus( true, 'srcFolder', 'destFolder', null ); } ).toThrow();
        expect( function() { expressServer.configureStylus( true, 'srcFolder', 'destFolder', 1 ); } ).toThrow();
        expect( function() { expressServer.configureStylus( true, 'srcFolder', 'destFolder', 'true' ); } ).toThrow();
        expect( function() { expressServer.configureStylus( true, 'srcFolder', 'destFolder', function() {} ); } ).toThrow();
        expect( function() { expressServer.configureStylus( true, 'srcFolder', 'destFolder', {} ); } ).toThrow();
        
        expect( stylus.middleware ).not.toHaveBeenCalled();
        expect( expressServer.app.use ).not.toHaveBeenCalled();
        expect( conf._ee.emit ).not.toHaveBeenCalled();
      } );
    } );
    
    describe( "Testing the configureCookies function", function()
    {
      var mongo = require( '../../../../node_modules/mongodb' );
      //Not sure yet how to spy on a constructor in jasmine-node, so this is being commented out for the time being
      //TODO - Find a way to spy on a constructor, and reinstate. Or, eliminate if not possible
      /*var a = {
        mongoStore : require( '../../../../node_modules/connect-mongodb' )
      }*/
      
      it( "calls the use function twice, and then emits a completion event", function()
      {
        //Not sure yet how to spy on a constructor in jasmine-node, so this is being commented out for the time being
        //spyOn( a, 'mongoStore' );
        spyOn( mongo, 'Db' );
        spyOn( mongo, 'Server' );
        
        expressServer.setApp( app );
        
        expect( function() { expressServer.configureCookies( 10, 'key', 'secret', 'host', 202, 'db' ); } ).not.toThrow();
        expect( expressServer.app.use.calls.length ).toEqual( 2 );
        expect( mongo.Db ).toHaveBeenCalledWith( 'db', jasmine.any( Object ) );
        expect( mongo.Server ).toHaveBeenCalledWith( 'host', 202, jasmine.any( Object ) );
        expect( conf._ee.emit ).toHaveBeenCalled();
      } );
      
      it( "Throws an error if any parameter does not match the intended type", function()
      {
        spyOn( mongo, 'Db' );
        spyOn( mongo, 'Server' );
        
        expressServer.setApp( app );
        expect( function() { expressServer.configureCookies( null, 'key', 'secret', 'host', 202, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( '10', 'key', 'secret', 'host', 202, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( function() {}, 'key', 'secret', 'host', 202, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( {}, 'key', 'secret', 'host', 202, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( true, 'key', 'secret', 'host', 202, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, null, 'secret', 'host', 202, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, 1, 'secret', 'host', 202, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, function() {}, 'secret', 'host', 202, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, {}, 'secret', 'host', 202, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, true, 'secret', 'host', 202, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, 'key', null, 'host', 202, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, 'key', 1, 'host', 202, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, 'key', function() {}, 'host', 202, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, 'key', {}, 'host', 202, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, 'key', true, 'host', 202, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, 'key', 'secret', null, 202, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, 'key', 'secret', 1, 202, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, 'key', 'secret', function() {}, 202, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, 'key', 'secret', {}, 202, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, 'key', 'secret', true, 202, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, 'key', 'secret', 'host', null, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, 'key', 'secret', 'host', '202', 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, 'key', 'secret', 'host', function() {}, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, 'key', 'secret', 'host', {}, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, 'key', 'secret', 'host', true, 'db' ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, 'key', 'secret', 'host', 202, null ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, 'key', 'secret', 'host', 202, 1 ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, 'key', 'secret', 'host', 202, function() {} ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, 'key', 'secret', 'host', 202, {} ); } ).toThrow();
        expect( function() { expressServer.configureCookies( 10, 'key', 'secret', 'host', 202, true ); } ).toThrow();
      } );
    } );
  } );
} );
