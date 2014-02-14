describe( "Testing all the helper functions for the server", function()
{
  var helper = require( '../../../models/helpers.js' );
  
  var event = require( 'events' );

  var ee = new event.EventEmitter();
  var response;
 
  //Configuration for all tests; 
  var config = {
    _scalaHostname : 'dummy',
    _scalaPort : 'dummy'
  };
  
  var requestRetVal;
  
  beforeEach( function()
  {
    response = {
      redirect : jasmine.createSpy( 'redirect' )
    };
  } );
    
  describe( "Testing the authCheck function", function()
  {
    var auth = require( '../../../controllers/authentication.js' );
    var response;
    var callback;
    var config;
   
    beforeEach( function()
    {
      config = {
        _logs : { 
          exceptions : {
            log : jasmine.createSpy( 'log' )
          } 
        }
      };
      response = {
        redirect : jasmine.createSpy( 'redirect' )
      };
      
      helper.setConfig( config );
      
      callback = jasmine.createSpy( 'callback' ).andCallFake( function() {} );      
    } );
     
    it( "calls the callback function if successful", function()
    {
      spyOn( auth, 'authorize' ).andCallFake( function( req, authee )
      {
        authee.emit( 'Authorization Responded', 'true' );
      } );
      spyOn( auth, 'authCheck' ).andReturn( 'true' );
      
      var request = {
        cookies : {
          session_id : 'something' 
        },
        session : {
          username : 'dummy'
        }
      };
      
      expect( function() { helper.authCheck( '/dummy', request, response, callback ); } ).not.toThrow();
      expect( config._logs.exceptions.log ).not.toHaveBeenCalled();
      expect( callback ).toHaveBeenCalled();
      expect( response.redirect ).not.toHaveBeenCalled();
    } );
    
    it( "displays an error to the page to the user if they are not authorized to view the content", function()
    {
      spyOn( auth, 'authorize' ).andCallFake( function( req, authee )
      {
        authee.emit( 'Authorization Responded', 'false' );
      } );
      spyOn( auth, 'authCheck' ).andReturn( 'true' );
      
      var request = {
        cookies : {
          session_id : 'something' 
        },
        session : {
          username : 'dummy'
        }
      };
      
      expect( function() { helper.authCheck( '/dummy', request, response, callback ); } ).not.toThrow();
      expect( config._logs.exceptions.log ).not.toHaveBeenCalled();
      expect( callback ).not.toHaveBeenCalled();
      expect( response.redirect ).toHaveBeenCalled();
    } );
    
    it( "redirects to / if callback is anything but a function", function()
    {
      spyOn( auth, 'authorize' ).andCallFake( function( req, authee )
      {
        authee.emit( 'Authorization Responded', 'true' );
      } );
      spyOn( auth, 'authCheck' ).andReturn( 'true' );
      
      var request = {
        cookies : {
          session_id : 'something' 
        },
        session : {
          username : 'dummy'
        } 
      };
      
      helper.authCheck( '/dummy', request, response, 'string' ); 
      helper.authCheck( '/dummy', request, response, null );
      helper.authCheck( '/dummy', request, response, { a : 'a' } );
      expect( config._logs.exceptions.log ).toHaveBeenCalled();
      expect( callback ).not.toHaveBeenCalled();
      expect( response.redirect ).toHaveBeenCalled();
    } );
    
    it( "redirects the user to / if they do not have a session_id", function()
    {
      spyOn( auth, 'authorize' ).andCallFake( function( req, authee )
      {
        authee.emit( 'Authorization Responded', 'false' );
      } );
      spyOn( auth, 'authCheck' ).andReturn( 'true' );
      
      var request = {
        cookies : {
          session_id : null 
        },
        session : {
          username : 'something'
        }
      };
      
      expect( function() { helper.authCheck( '/dummy', request, response, callback ); } ).not.toThrow();
      expect( config._logs.exceptions.log ).not.toHaveBeenCalled();
      expect( callback ).not.toHaveBeenCalled();
      expect( response.redirect ).toHaveBeenCalled();
    } );
    
    it( "redirects the user to / if the session does not have a username associated with it", function()
    {
      spyOn( auth, 'authorize' ).andCallFake( function( req, authee )
      {
        authee.emit( 'Authorization Responded', 'true' );
      } );
      spyOn( auth, 'authCheck' ).andReturn( false );
      
      var request = {
        cookies : {
          session_id : 'something' 
        },
        session : {
          username : 'dummy'
        } 
      };
      
      expect( function() { helper.authCheck( '/dummy', request, response, callback ); } ).not.toThrow();
      expect( callback ).not.toHaveBeenCalled();
      expect( response.redirect ).toHaveBeenCalled();
    } );
  } );
  
  describe( "Testing the redirectToHttp function", function()
  {
    var http = require( 'http' );
    var config;
    
    beforeEach( function()
    {
      config = {
        _hostname : 'hostname',
        _port : 101,
      };
      
      helper.setConfig( config );
    } );
    
    it( "redirects the user to https from http", function()
    {
      var response = {
        writeHead : jasmine.createSpy( 'writeHead' ),
        end : jasmine.createSpy( 'end' )
      };
      
      helper.redirectToHttps( null, response );
      
      expect( response.writeHead ).toHaveBeenCalledWith( 302, { location : 'https://hostname:101' } );
      expect( response.end ).toHaveBeenCalled();
    } );
  } );
  
  describe( "Testing the getLoggers function", function()
  {
    var config;
    
    beforeEach( function()
    {
      config = {
        _logs : {
          info : 'info',
          security : 'security',
          exceptions : 'exceptions'
        }
      };
    } );
    
    it( "Returns the set of loggers for the system", function()
    {
      helper.setConfig( config );
      var logs = helper.getLoggers();
      
      expect( logs ).toEqual( config._logs );
    } );
  } );
  
  describe( "Testing the createObjectidTimestamp function", function()
  {
    var mongo = require( "../../../node_modules/mongodb" );
        
    it( "converts from a date to an ObjectID", function()
    {
      var object = helper.createObjectidTimestamp( new Date() );
      expect( object instanceof mongo.ObjectID ).toEqual( true );
    } );
    
    it( "Returns null when anything but a date is passed in", function()
    {
      var object1 = helper.createObjectidTimestamp( null );
      var object2 = helper.createObjectidTimestamp( function() {} );
      var object3 = helper.createObjectidTimestamp( {} );
      var object4 = helper.createObjectidTimestamp( "01-01-1970" );
      var object5 = helper.createObjectidTimestamp( Math.round( new Date().getTime() / 1000 ) );
      var object6 = helper.createObjectidTimestamp( false );
      var object7 = helper.createObjectidTimestamp( undefined );
      
      expect( object1 ).toEqual( null );
      expect( object2 ).toEqual( null );
      expect( object3 ).toEqual( null );
      expect( object4 ).toEqual( null );
      expect( object5 ).toEqual( null );
      expect( object6 ).toEqual( null );
      expect( object7 ).toEqual( null );
    } );
    
    it( "returns null if the date passed in was created from undefined", function()
    {
      var object = helper.createObjectidTimestamp( new Date( undefined ) );
      expect( object ).toEqual( null );
    } );
  } );
} );
