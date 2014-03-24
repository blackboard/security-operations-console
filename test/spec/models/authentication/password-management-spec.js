var event = require( 'events' );
var passwordManagement = require( '../../../../models/authentication/password-management');
var helper = require( '../../../../models/helpers.js' );
var http = require( 'https' );

describe( "Testing the password management code", function()
{
  var ee;
  var config;
  var response, status;
  beforeEach( function()
  {
    ee = new event.EventEmitter();

    config = {
      _pmpHostname : 'host',
      _pmpPort : "1",
      _pmpAuthtoken : 'auth',
      _ee : ee
    };

    spyOn( helper, 'getConfig').andReturn( config );
    spyOn( http, 'request').andCallFake( function()
    {
      return( { end : function() {} } );
    } );

    response = {
      on : function( type, callback )
      {
        if( type == 'data' )
        {
          var chunk = {
            operation : {
              result : {
                status : status
              },
              Details : [ {
                "RESOURCE ID" : 1
              } ]
            }
          };

          callback( JSON.stringify( chunk ) );
        }
        else if( type == 'end' )
        {
          callback();
        }
      }
    };
  } );
  describe( "Testing the getAccountInfo function", function()
  {
    beforeEach( function()
    {
      passwordManagement.setConfig( config );
    } );

    it( "sets the eventemitter property", function()
    {
      passwordManagement.getAccountInfo( ee );

      var expectedOptions = {
        hostname : 'host',
        port : "1",
        path : '/restapi/json/v1/resources?AUTHTOKEN=auth',
        method : "GET",
        requestCert : true,
        rejectUnauthorized : false,
        agent : false,
        secureProtocol: 'SSLv3_method'
      };

      expect( passwordManagement.ee ).toEqual( ee );
      expect( http.request ).toHaveBeenCalledWith( expectedOptions, jasmine.any( Function ) );
    } );
  } );

  describe( "Testing the callbackResources function", function()
  {
    beforeEach( function()
    {
      status = "Success";
      passwordManagement.setConfig( config );

      spyOn( ee, "emit" );
    } );

    it( "Gets the account name information based on resource id", function()
    {
      passwordManagement.callbackResources( response );

      var expectedOptions = {
        hostname : 'host',
        port : "1",
        path : '/restapi/json/v1/resources/1/accounts?AUTHTOKEN=auth',
        method : "GET",
        requestCert : true,
        rejectUnauthorized : false,
        agent : false,
        secureProtocol: 'SSLv3_method'
      };

      expect( http.request).toHaveBeenCalledWith( expectedOptions, jasmine.any( Function ) );
      expect( ee.emit ).not.toHaveBeenCalled();
    } );

    it( "Emits an error if there's a failure in the REST request", function()
    {
      response = {
        on : function( type, callback )
        {
          var chunk = {
            operation : {
              result : {
                status : "Failed",
                message : "failure"
              }
            }
          };

          callback( JSON.stringify( chunk ) );
        }
      };
      passwordManagement.callbackResources( response );

      expect( http.request ).not.toHaveBeenCalled();
      expect( ee.emit ).toHaveBeenCalledWith( "complete", { status : "Failed", "message" : "failure" } );
    } );
  } );

  describe( "Testing the callbackAccount function", function()
  {
    beforeEach( function()
    {
      status = "Success";
      passwordManagement.setConfig( config );
      passwordManagement.username = null;

      response = {
        on : function( type, callback )
        {
          if( type == 'data' )
          {
            var chunk = {
              operation : {
                result : {
                  status : status
                },
                Details : {
                  "ACCOUNT LIST" : [ {
                    'ACCOUNT ID' : 2,
                    'ACCOUNT NAME' : 'test'
                  } ]
                }
              }
            };

            callback( JSON.stringify( chunk ) );
          }
          else if( type == 'end' )
          {
            callback();
          }
        }
      };

      spyOn( ee, "emit" );
    } );

    it( "gets the password for the account if the data retrieval succeeds, and sets the username", function()
    {
      passwordManagement.callbackAccount( response );

      var expectedOptions = {
        hostname : 'host',
        port : "1",
        path : '/restapi/json/v1/resources/1/accounts/2/password?AUTHTOKEN=auth',
        method : "GET",
        requestCert : true,
        rejectUnauthorized : false,
        agent : false,
        secureProtocol: 'SSLv3_method'
      };

      expect( http.request).toHaveBeenCalledWith( expectedOptions, jasmine.any( Function ) );
      expect( ee.emit ).not.toHaveBeenCalled();
      expect( passwordManagement.username ).toEqual( 'test' );
    } );

    it( "Emits an error if the data retrieval fails", function()
    {
      response = {
        on : function( type, callback )
        {
          var chunk = {
            operation : {
              result : {
                status : "Failed",
                message : "failure"
              }
            }
          };

          callback( JSON.stringify( chunk ) );
        }
      };

      passwordManagement.callbackAccount( response );

      expect( http.request).not.toHaveBeenCalled();
      expect( ee.emit ).toHaveBeenCalledWith( "complete", { status : "Failed", "message" : "failure" } );
      expect( passwordManagement.username ).toEqual( null );
    } );
  } );

  describe( "Testing the callbackPassword function", function()
  {
    beforeEach( function()
    {
      status = "Success";
      passwordManagement.setConfig( config );
      passwordManagement.password = null;

      response = {
        on : function( type, callback )
        {
          if( type == 'data' )
          {
            var chunk = {
              operation : {
                result : {
                  status : status
                },
                Details : {
                  PASSWORD : "test"
                }
              }
            };

            callback( JSON.stringify( chunk ) );
          }
          else if( type == 'end' )
          {
            callback();
          }
        }
      };
      spyOn( ee, "emit" );
    } );

    it( "sets the password and emits a success event upon receiving the password", function()
    {
      passwordManagement.callbackPassword( response );

      expect( ee.emit ).toHaveBeenCalledWith( 'complete', null );
      expect( ee.emit).not.toHaveBeenCalledWith( 'complete', jasmine.any( Object ) );
      expect( passwordManagement.password ).toEqual( 'test' );
    } );

    it( "emits an error if a problem occurs on password retrieval", function()
    {
      response = {
        on : function( type, callback )
        {
          var chunk = {
            operation : {
              result : {
                status : "Failed",
                message : "failure"
              }
            }
          };

          callback( JSON.stringify( chunk ) );
        }
      };

      passwordManagement.callbackPassword( response );

      expect( ee.emit).not.toHaveBeenCalledWith( 'complete', null );
      expect( ee.emit).toHaveBeenCalledWith( 'complete', { status : 'Failed', message : 'failure' } );
      expect( passwordManagement.password ).toEqual( null );
    } );
  } );
} );