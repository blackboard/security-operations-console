describe( "Testing authentication code", function() 
{
  var auth = require( '../../../controllers/authentication.js' );
  var helper = require( '../../../models/helpers.js' );
  
  var config;
  
  beforeEach( function()
  {
    config = {
      _logs : {
        info : {
          log : function() {}
        },
        security : {
          log : function() {}
        },
        exceptions : {
          log : function() {}
        }
      }
    };
    
    helper.setConfig( config );
  } );
  describe( "Testing authCheck function", function() 
  {
    it( "Returns true if the username is present", function() 
    {
      expect( auth.authCheck( 'something' ) ).toEqual( true );
    } );
    
    it( "Returns false if the username is not present", function()
    {
      expect( auth.authCheck( null ) ).toEqual( false );
    } );
  } );
  
  describe( "Testing authorize function", function()
  {
    //required for handling the event that is thrown by this function
    var event = require( 'events' );
    
    //dummy request object
    var req = {
      session : {
        permissions : [ 'set', 'get' ]
      },
      url : '/something'
    };
    
    beforeEach( function()
    {
      config = {
        _database : {
          collection : function( name, callback )
          {
            var collection = {
              findOne : function( query, callback )
              {
                callback( null, { permissions : [ 'set' ] } );
              }
            };
            
            callback( null, collection );
          }
        },
        _logs : {
          info : {
            log : function() {}
          },
          security : {
            log : function() {}
          },
          exceptions : {
            log : function() {}
          }
        }
      };
      
      helper.setConfig( config );
    } );
    
    it( "Emits an event with a boolean value determining whether or not the user is authorized", function( done )
    {
      var ee = new event.EventEmitter();
      //value for receiving the response 
      var testVal = 'false';
      
      //Handles the event called from the spy
      ee.once( 'Authorization Responded', function( returnValue )
      {
        testVal = returnValue;
        done();
      } );
      
      expect( function() { auth.authorize( req, ee ); } ).not.toThrow();
      
      expect( testVal ).toEqual( 'true' );
    } );
    
    it( "Throws error if connecting to the collection fails", function()
    {
      spyOn( config._database, 'collection' ).andCallFake( function( name, callback )
      {
        var collection = {
          findOne : function( query, callback )
          {
            callback( null, { permissions : [ 'set' ] } );
          }
        };
        
        callback( 'Error', collection );
      } ); 
      
      var ee = new event.EventEmitter();
      //value for receiving the response 
      var testVal = 'false';
      
      //Handles the event called from the spy
      ee.once( 'Authorization Responded', function( returnValue )
      {
        testVal = returnValue;
      } );
      
      expect( function() { auth.authorize( req, ee ); } ).toThrow();
      expect( testVal ).toEqual( 'false' );
    } );
    
    it( "Throws an error if retrieving rows from the collection fails", function()
    {
      spyOn( config._database, 'collection' ).andCallFake( function( name, callback )
      {
        var collection = {
          findOne : function( query, callback )
          {
            callback( 'Error', { permissions : [ 'set' ] } );
          }
        };
        
        callback( null, collection );
      } ); 
      
      var ee = new event.EventEmitter();
      //value for receiving the response 
      var testVal = 'false';
      
      //Handles the event called from the spy
      ee.once( 'Authorization Responded', function( returnValue )
      {
        testVal = returnValue;
      } );
      
      expect( function() { auth.authorize( req, ee ); } ).toThrow();
      expect( testVal ).toEqual( 'false' );
    } );
  } );
  
  describe( 'Testing the authenticate function', function()
  {
    var xssUtil = require( '../../../models/security/xss-util.js' );
    var helper = require( '../../../models/helpers.js' );
    var crowd = require( '../../../models/authentication/crowd.js' );
    var event = require( 'events' );
    
    var request;
    var response;
    
    var ee = new event.EventEmitter();
    
    beforeEach( function()
    {
      request = {
        body : {
          user : {
            username : 'user',
            password : 'pass'
          }
        },
        cookies : {
          session_id : 'session:id.new'
        },
        session : {
          username : 'user'
        }
      };
      
      response = {
        redirect : jasmine.createSpy( 'redirect' )
      };
      
      config = {
        _database : {
          collection : function( collection, callback )
          {
            var roleColl = {
              findOne : function( query, options, callback )
              {
                if( query.role_name == 'Administrator' )
                {
                  callback( null, { permissions : 'something' } );
                }
                else
                {
                  callback( null, { permissions : 'nothing' } );
                }
              }
            };
            
            callback( null, roleColl );
          }
        },
        _crowdAuthUrl : 'url',
        _logs : {
          info : {
            log : function() {}
          },
          security : {
            log : function() {}
          },
          exceptions : {
            log : function() {}
          }
        }
      };
      
      helper.setConfig( config );
      
      spyOn( xssUtil, 'isValidString' ).andReturn( true );
      spyOn( crowd, 'authenticateUser' ).andCallFake( function( username, password, ee, req, res )
      {
        ee.emit( 'User Authenticated', null, req, res );
      } );
      spyOn( crowd, 'findUserGroups' ).andCallFake( function( username, ee )
      {
        ee.emit( 'Groups Analyzed', null, true );
      } );
    } ); 
    
    it( "authenticates a user account if the account is valid", function()
    {
      helper.setConfig( config );
      
      expect( function() { auth.authenticate( request, response ); } ).not.toThrow();
      
      expect( response.redirect ).toHaveBeenCalledWith( '/index' );
      expect( response.redirect ).not.toHaveBeenCalledWith( '/' );
    } );
    
    it( "logs to the security log and redirects the user to / if a parameter is missing or the username contains invalid characters", function()
    {
      spyOn( config._logs.security, 'log' );
      xssUtil.isValidString.andReturn( false );
      
      expect( function() { auth.authenticate( request, response ); } ).not.toThrow();
      
      expect( config._logs.security.log ).toHaveBeenCalled();
      expect( response.redirect ).not.toHaveBeenCalledWith( '/index' );
      expect( response.redirect ).toHaveBeenCalledWith( '/?error[header]=Authentication Failed' );
    } );
    
    it( "redirects the user to / if authenticateUser function emits an error", function()
    {
      xssUtil.isValidString.andReturn( true );
      
      crowd.authenticateUser.andCallFake( function( uri, body, ee, req, res )
      {
        ee.emit( 'User Authenticated', 'error', req, res );
      } );
      
      expect( function() { auth.authenticate( request, response ); } ).not.toThrow();
      
      expect( response.redirect ).not.toHaveBeenCalledWith( '/index' );
      expect( response.redirect ).toHaveBeenCalledWith( '/?error[header]="Error occurred, see log for details&error[date]=' + new Date() );
    } );
    
    it( "assigns the role 'admin' if findUserGroups emits true", function()
    {
      xssUtil.isValidString.andReturn( true );
      
      expect( function() { auth.authenticate( request, response ); } ).not.toThrow();
      expect( request.session.permissions ).toEqual( 'something' );
    } );
    
    it( "assigns the role 'guest' if findUserGroups emits false", function()
    {
      xssUtil.isValidString.andReturn( true );
      crowd.findUserGroups.andCallFake( function( username, ee )
      {
        ee.emit( 'Groups Analyzed', null, false );
      } );
      
      expect( function() { auth.authenticate( request, response ); } ).not.toThrow();
      expect( request.session.permissions ).toEqual( 'nothing' );
    } );
    
    it( "assigns the role 'guest' if findUserGroups throws an error", function()
    {
      xssUtil.isValidString.andReturn( true );
      crowd.findUserGroups.andCallFake( function( username, ee )
      {
        ee.emit( 'Groups Analyzed', 'error', false );
      } );
      
      expect( function() { auth.authenticate( request, response ); } ).not.toThrow();
      expect( request.session.permissions ).toEqual( 'nothing' );
    } );
    
    it( "throws an error if there's an error connecting to the collection", function()
    {
      spyOn( config._database, 'collection' ).andCallFake( function( name, callback )
      {
        var roleColl = {
          findOne : function( query, options, callback )
          {
            if( query.role_name == 'Administrator' )
            {
              callback( null, { permissions : 'something' } );
            }
            else
            {
              callback( null, { permissions : 'nothing' } );
            }
          }
        };
        
        callback( 'Error', roleColl );
      } );
      
      xssUtil.isValidString.andReturn( true );
      crowd.findUserGroups.andCallFake( function( username, ee )
      {
        ee.emit( 'Groups Analyzed', null, false );
      } );
      
      expect( function() { auth.authenticate( request, response ); } ).toThrow();
      expect( response.redirect ).toHaveBeenCalledWith( '/?error[header]="Error occurred, see log for details&error[date]=' + new Date() );
      expect( request.session.permissions ).toEqual( null );
    } );    
    
    it( "throws an error if there's an error retrieving results from the collection", function()
    {
      spyOn( config._database, 'collection' ).andCallFake( function( name, callback )
      {
        var roleColl = {
          findOne : function( query, options, callback )
          {
            if( query.role_name == 'Administrator' )
            {
              callback( 'Error', { permissions : 'something' } );
            }
            else
            {
              callback( 'Error', { permissions : 'nothing' } );
            }
          }
        };
        
        callback( null, roleColl );
      } );
      
      xssUtil.isValidString.andReturn( true );
      crowd.findUserGroups.andCallFake( function( username, ee )
      {
        ee.emit( 'Groups Analyzed', null, false );
      } );
      
      expect( function() { auth.authenticate( request, response ); } ).toThrow();
      expect( response.redirect ).toHaveBeenCalledWith( '/?error[header]="Error occurred, see log for details&error[date]=' + new Date() );
      expect( request.session.permissions ).toEqual( null );
    } );    
  } );
} );
