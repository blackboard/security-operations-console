describe( "Testing the xss protection functionality within xss-util.js", function() 
{
  var xssUtil = require( '../../../../models/security/xss-util.js' );
  var helper = require( '../../../../models/helpers.js' );
  
  var config;
  
  beforeEach( function()
  {
    config = {
      _logs : {
        info : {
          log : function() {}
        },
        security : {
          log : jasmine.createSpy( 'log' ) 
        },
        exceptions : {
          log : function() {}
        }
      }
    };
  } );
  
  describe( "Testing the validation methods", function() 
  {
    describe( "Testing isNumber function", function() 
    {
      it( "Can tell that a number is in fact a number", function() 
      {
        var isANumber = "10";
        var isALiteralNumber = 10;
        expect( xssUtil.isNumber( isANumber ) ).toEqual( true );
        expect( xssUtil.isNumber( isALiteralNumber ) ).toEqual( true );
      } );
      it( "Can tell that anything else is not a number", function()
      {
        var isAString = 'Hello';
        var isAlsoAString = '209abc';
        var isAStringWithANumber = 'Hello10';
        var isAnObject = { isANumber : 10 };
        var isAFunction = function() { console.log( "I am a function" ); };
        
        expect( xssUtil.isNumber( isAString ) ).toEqual( false );
        expect( xssUtil.isNumber( isAlsoAString) ).toEqual( false );
        expect( xssUtil.isNumber( isAStringWithANumber ) ).toEqual( false );
        expect( xssUtil.isNumber( isAnObject) ).toEqual( false );
        expect( xssUtil.isNumber( isAFunction) ).toEqual( false );
      } );
    } );
    
    describe( "Testing isValidString function", function() 
    {
      //This may change, as more characters become acceptable in strings
      it( "Should only accept letters and numbers", function()
      {
        var isAValidString = "Hello";
        var isAlsoAValidString = "10Hello10";
        var isANumberButAlsoAValidString = 10;
        var isNotAValidString = "\10Hello\abc";
        var isAlsoNotAValidString = "&";
        
        expect( xssUtil.isValidString( isAValidString ) ).toEqual( true );
        expect( xssUtil.isValidString( isAlsoAValidString ) ).toEqual( true );
        expect( xssUtil.isValidString( isANumberButAlsoAValidString) ).toEqual( true );
        expect( xssUtil.isValidString( isNotAValidString) ).toEqual( false );
        expect( xssUtil.isValidString( isAlsoNotAValidString ) ).toEqual( false );
      } );
    } );
    
    /* This is a temporary method for validating the inputs while I am still allowing these types of inputs
     * in areas that are not issues (issues use the ESAPI.js encoding methods).
     */
    describe( "Testing isValidLongString function", function() 
    {
      //This may change, as more characters become acceptable in strings
      it( "Should only accept letters, numbers, !, ?, ., -, _, and the space character", function()
      {
        var isAValidString = "Hello-";
        var isAlsoAValidString = "Hello? Where Are You!? I_m out-side";
        var isANumberButAlsoAValidString = 10;
        var isNotAValidString = "\10Hello\abc";
        var isAlsoNotAValidString = "&";
        
        expect( xssUtil.isValidLongString( isAValidString ) ).toEqual( true );
        expect( xssUtil.isValidLongString( isAlsoAValidString ) ).toEqual( true );
        expect( xssUtil.isValidLongString( isANumberButAlsoAValidString) ).toEqual( true );
        expect( xssUtil.isValidLongString( isNotAValidString) ).toEqual( false );
        expect( xssUtil.isValidLongString( isAlsoNotAValidString ) ).toEqual( false );
      } );
    } );
    describe( "Testing isValidMongodbId function", function() 
    {
      it( "Should accept only valid MongoDB ObjectID values as true", function()
      {
        var isAValidMongodbId = '51b5e6cde43a796f9d55156c';
        var isNotAValidMongodbId = '51b5e6cde43a796f9d55156ca';
        var isAlsoNotAValidMongodbId = 'hello';
        var isAgainNotAValidMongodbId = '51b5e6cde43a796f9d55156&';
        
        expect( xssUtil.isValidMongodbId ( isAValidMongodbId ) ).toEqual( true );
        expect( xssUtil.isValidMongodbId( isNotAValidMongodbId ) ).toEqual( false );
        expect( xssUtil.isValidMongodbId( isAlsoNotAValidMongodbId ) ).toEqual( false );
        expect( xssUtil.isValidMongodbId( isAgainNotAValidMongodbId ) ).toEqual( false );
      } );
    } );
    describe( "Testing validateRole function", function()
    {
      var mongo = require( '../../../../node_modules/mongodb' );
      
      var event = require( 'events' );
      
      var ee = new event.EventEmitter();
      var response;
      
      beforeEach( function()
      {
        spyOn( mongo.BSONPure, 'ObjectID' ).andCallFake( function( input )
        {
          return input;
        } );
        
        spyOn( ee, 'emit' ).andCallThrough();
        
        response = {
          redirect : jasmine.createSpy( 'redirect' )
        };
        
         config = {
          _database : {
            collection : function( collection, callback )
            {
              var roleColl = {
                findOne : function( query, callback )
                {
                  callback( null, 'something' );
                }
              };
              callback( null, roleColl );
            }
          },
          _logs : {
            info : {
              log : function() {}
            },
            security : {
              log : jasmine.createSpy( 'log' ) 
            },
            exceptions : {
              log : function() {}
            }
          }
        };
        
        helper.setConfig( config );
      } );
      
      it( "emits a signal if it finds a successful role", function()
      {
        spyOn( xssUtil, 'isValidMongodbId' ).andReturn( true );
        
        xssUtil.validateRole( ee, 'something', response );
        
        expect( ee.emit ).toHaveBeenCalled();
        expect( response.redirect ).not.toHaveBeenCalled();
        expect( config._logs.security.log ).not.toHaveBeenCalled();
      } );  
      
      it( "throws an error if it's passed an invalid mongodb objectid", function()
      {
        spyOn( xssUtil, 'isValidMongodbId' ).andReturn( false );
        
        xssUtil.validateRole( ee, 'something', response );
        
        expect( ee.emit ).not.toHaveBeenCalled();
        expect( config._logs.security.log ).toHaveBeenCalled();
        expect( response.redirect ).toHaveBeenCalled();
      } );
      
      it( "throws an error if the role is not in the database", function()
      {
        spyOn( xssUtil, 'isValidMongodbId' ).andReturn( true );
        spyOn( console, 'log' ).andCallThrough();
        
        var config2 = {
          _database : {
            collection : function( collection, callback )
            {
              var roleColl = {
                findOne : function( query, callback )
                {
                  callback( null, null );
                }
              };
              callback( null, roleColl );
            }
          },
          _logs : {
            info : {
              log : function() {}
            },
            security : {
              log : jasmine.createSpy( 'log' ) 
            },
            exceptions : {
              log : function() {}
            }
          },
          temp : 'a' 
        };

        helper.setConfig( config2 );
        spyOn( helper.getLoggers().exceptions, 'log' );
        xssUtil.validateRole( ee, 'something', response );

        expect( ee.emit ).not.toHaveBeenCalled();
        expect( helper.getLoggers().exceptions.log ).toHaveBeenCalled();
        expect( response.redirect ).toHaveBeenCalled();
        expect( config._logs.security.log ).not.toHaveBeenCalled();
      } );
    } );
    
    describe( "Testing the validatePermissions function", function()
    {
      var mongo = require( '../../../../node_modules/mongodb' );
      var helper = require( '../../../../models/helpers.js' );
      
      var event = require( 'events' );
            
      var ee = new event.EventEmitter();
      var response;
      
      beforeEach( function()
      {
        spyOn( ee, 'emit' ).andCallThrough();
        
        response = {
          redirect : jasmine.createSpy( 'redirect' )
        };
        
        config = {
          _database : {
            collection : function( collection, callback )
            {
              var roleColl = {
                findOne : function( query, callback )
                {
                  callback( null, 'something' );
                }
              };
              callback( null, roleColl );
            }
          },
          _logs : {
            info : {
              log : function() {}
            },
            security : {
              log : jasmine.createSpy( 'log' ) 
            },
            exceptions : {
              log : function() {}
            }
          }
        };
      } );
      
      it( "emits an event if the permissions are valid", function()
      {
        helper.setConfig( config );
        xssUtil.validatePermissions( ee, [ 'permission1' ], response );
        
        expect( response.redirect ).not.toHaveBeenCalled();
        expect( ee.emit ).toHaveBeenCalledWith( 'Permissions Check Complete' );
        expect( helper.getLoggers().security.log ).not.toHaveBeenCalled();
      } );
      
      it( "redirects to / if the permissions list is an invalid type", function()
      {
        helper.setConfig( config );
        
        xssUtil.validatePermissions( ee, function() {}, response );
        xssUtil.validatePermissions( ee, null, response );
        
        expect( response.redirect ).toHaveBeenCalled();
        expect( helper.getLoggers().security.log ).toHaveBeenCalled();
        expect( ee.emit ).not.toHaveBeenCalledWith( 'Permissions Check Complete' );
      } );
      
      it( "redirects to / if any permission is invalid", function()
      {
        var config2 = {
          _database : {
            collection : function( collection, callback )
            {
              var roleColl = {
                findOne : function( query, callback )
                {
                  callback( null, null );
                }
              };
              callback( null, roleColl );
            }
          },
          _logs : {
            info : {
              log : function() {}
            },
            security : {
              log : jasmine.createSpy( 'log' ) 
            },
            exceptions : {
              log : function() {}
            }
          }
        };
        
        helper.setConfig( config2 );
        
        xssUtil.validatePermissions( ee, [ 'permission1' ], response );
        
        expect( response.redirect ).toHaveBeenCalled();
        expect( ee.emit ).not.toHaveBeenCalledWith( 'Permissions Check Complete' );
        expect( helper.getLoggers().security.log ).toHaveBeenCalled();
      } );
    } );
    
    describe( "Testing the isPathTraversal function", function()
    {
      var path = require( 'path' );
      
      beforeEach( function()
      {
        xssUtil.setServerRoot( '/usr/local/security' );
      } );
      it( "returns true if the user enters a path outside of the root directory", function()
      {
        var result = xssUtil.isPathTraversal( '../../../../../../../../etc/passwd' );
        expect( result ).toEqual( true );
        
        result = xssUtil.isPathTraversal( '../../myFile.txt' );
        expect( result ).toEqual( true );
      } );
      
      it( "returns false if the user is still inside the root directory", function()
      {
        var result = xssUtil.isPathTraversal( '/usr/local/security/logs/myLog.txt', 'system' );
        expect( result ).toEqual( false );
        
        result = xssUtil.isPathTraversal( path.join( '/usr/local/security/public/logs/myLog.txt' ) );
        expect( result ).toEqual( false );
      } );
      
      it( "returns true if the user is not system and the path is not in public", function()
      {
        var result = xssUtil.isPathTraversal( '/usr/local/security/logs', 'me' );
        expect( result ).toEqual( true );
      } );
    } );
    
    describe( "Testing the setServerRoot function", function()
    { 
      var path = require( 'path' );
      
      beforeEach( function()
      {
        xssUtil.resetServerRoot();
      } );
      
      it( "sets the serverRoot variable in xssUtil for use in the isPathTraversal function", function()
      {
        var root = path.sep + 'usr' + path.sep + 'local';
        expect( function() { xssUtil.setServerRoot( root ); } ).not.toThrow();
        expect( xssUtil.getServerRoot() ).toEqual( root );
      } );
      
      it( "throws an error if the root variable is not a filesystem path", function()
      {
        expect( function() { xssUtil.setServerRoot( '?' ); } ).toThrow();
        expect( function() { xssUtil.setServerRoot( 1 ); } ).toThrow();
        expect( function() { xssUtil.setServerRoot( true ); } ).toThrow();
        expect( function() { xssUtil.setServerRoot( function() {} ); } ).toThrow();
        expect( function() { xssUtil.setServerRoot( {} ); } ).toThrow();
        
        expect( xssUtil.getServerRoot() ).toEqual( null );
      } );
      
      // The two tests below test functions which are only used in testing the setServerRoot function. They are not 
      // used anywhere in the console itself.
      describe( "Testing functions that support testing the setServerRoot function", function()
      {
        it( "gets the current server root directory", function()
        {         
          xssUtil.setServerRoot( path.sep );
          expect( xssUtil.getServerRoot() ).toEqual( path.sep );
        } );
        
        it( "resets the server root directory to null", function()
        {
          xssUtil.setServerRoot( '.' );
          xssUtil.resetServerRoot();
          expect( xssUtil.getServerRoot() ).toEqual( null );
        } );
      } );
    } );
  } );
} );
