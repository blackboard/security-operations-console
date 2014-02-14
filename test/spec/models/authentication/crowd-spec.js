describe( "Testing the crowd.js file", function()
{
  var crowd = require( '../../../../models/authentication/crowd.js' );
  var ws = require( '../../../../node_modules/ws.js' );
  var xmlParser = require( '../../../../node_modules/xml2js' );
  var helper = require( '../../../../models/helpers.js');
  
  describe( "Testing the authenticateServer function", function()
  {
    var ctx;    
    var config;
    
    beforeEach( function()
    {
      ctx = {
        statusCode : 200,
        response : '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soap:Body><ns1:authenticateApplicationResponse xmlns:ns1="urn:SecurityServer"><ns1:out><name xmlns="http://authentication.integration.crowd.atlassian.com">myConsole</name><token xmlns="http://authentication.integration.crowd.atlassian.com">token</token></ns1:out></ns1:authenticateApplicationResponse></soap:Body></soap:Envelope>'
      };
      
      spyOn( ws, 'Http' ).andReturn( {} );
      spyOn( ws, 'send' ).andCallFake( function( handlers, soapRequest, callback )
      {
        callback( ctx );
      } );
    } );
    
    it( "retrieve an authentication token from the SOAP response", function()
    {
      expect( function() { crowd.authenticateServer( 'url' ); } ).not.toThrow();
      
      expect( crowd.serverToken ).toEqual( 'token' );
    } );
    
    it( "throws an error if the authentication fails", function()
    {
      crowd.serverToken = null;
      ctx.statusCode = 500;
      ctx.response = '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soap:Body><soap:Fault><faultcode>soap:Server</faultcode><faultstring>error</faultstring><detail><InvalidAuthorizationTokenException xmlns="urn:myConsole" /></detail></soap:Fault></soap:Body></soap:Envelope>';
      ws.send.andCallFake( function( handlers, soapResponse, callback )
      {
        callback( ctx );
      } );
      
      expect( function() { crowd.authenticateServer( 'url' ); } ).toThrow();
      expect( crowd.serverToken ).toEqual( null );
    } );
    
    it( "throws an error if the url parameter is null", function()
    {
      expect( function() { crowd.authenticateServer(); } ).toThrow();
    } );
    
    it( "throws an error if the xml parser fails", function()
    {
      spyOn( xmlParser, 'parseString' ).andCallFake( function( param, callback )
      {
        callback( "error", null );
      } );
      
      expect( function() { crowd.authenticateServer( 'url' ); } ).toThrow();
    } );
  } );
  
  describe( "Testing the authenticateUser function", function()
  {
    var event = require( 'events' );
    
    var ctx;
    var config; 
    var request;
    
    var ee = new event.EventEmitter();    
    
    beforeEach( function()
    {
      ctx = {
        statusCode : 200,
        response : '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soap:Body><ns1:authenticatePrincipalResponse xmlns:ns1="urn:myConsole"><ns1:out>token</ns1:out></ns1:authenticatePrincipalResponse></soap:Body></soap:Envelope>'
      };
      
      request = {
        session : {
        }
      };
      
      crowd.serverToken = 'token';
      
      config = {
        _crowdAuthUrl : 'url'
      };
      
      helper.setConfig( config );
      
      spyOn( ee, 'emit' );
      spyOn( crowd, 'authenticateServer' );
      spyOn( ws, 'Http' ).andReturn( {} );
      spyOn( ws, 'send' ).andCallFake( function( handlers, soapRequest, callback )
      {
        callback( ctx );
      } );
    } );
    
    it( "adds the user_id to the session on successful authentication", function()
    {
      expect( function() { crowd.authenticateUser( 'username', 'password', ee, request ); } ).not.toThrow(); 
      expect( request.session.username ).toEqual( 'username' );
      expect( ee.emit ).toHaveBeenCalledWith( 'User Authenticated', null, request, undefined );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'User Authenticated', [ "LDAP Error" ], request, undefined  );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'User Authenticated', 'error', request, undefined  );
    } );
    
    it( "emits an error if authentication fails", function()
    {
       ctx.statusCode = 500;
       ctx.response = '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soap:Body><soap:Fault><faultcode>soap:Server</faultcode><faultstring>LDAP Error</faultstring><detail><InvalidAuthenticationException xmlns="urn:myConsole" /></detail></soap:Fault></soap:Body></soap:Envelope>';
       
       ws.send.andCallFake( function( handlers, soapRequest, callback )
       {
         callback( ctx );
       } );
       
       expect( function() { crowd.authenticateUser( 'username', 'password', ee, request ); } ).not.toThrow();
       expect( request.session.username ).toEqual( null );
       expect( ee.emit ).not.toHaveBeenCalledWith( 'User Authenticated', null, request, undefined  );
       expect( ee.emit ).toHaveBeenCalledWith( 'User Authenticated', [ "LDAP Error" ], request, undefined  );
       expect( ee.emit ).not.toHaveBeenCalledWith( 'User Authenticated', 'error', request, undefined  );
    } );
    
    it( "throws an error if the url parameter is null", function()
    {
      helper.setConfig( {} );
      
      expect( function() { crowd.authenticateUser('username', 'password', ee, request ); } ).not.toThrow();
      expect( request.session.username ).toEqual( null );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'User Authenticated', null, request, undefined  );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'User Authenticated', [ "LDAP Error" ], request, undefined  );
      expect( ee.emit ).toHaveBeenCalledWith( 'User Authenticated', "function requires a URL to be present in config for crowd", request, undefined  );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'User Authenticated', 'error', request, undefined  );
    } );
    
    it( "throws an error if the xml parser fails", function()
    {
      spyOn( xmlParser, 'parseString' ).andCallFake( function( param, callback )
      {
        callback( "error", null );
      } );
      
      expect( function() { crowd.authenticateUser( 'username', 'password', ee, request ); } ).not.toThrow();
      expect( request.session.username ).toEqual( null );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'User Authenticated', null, request, undefined );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'User Authenticated', [ "LDAP Error" ], request, undefined );
      expect( ee.emit ).toHaveBeenCalledWith( 'User Authenticated', 'error', request, undefined );
    } );
  } );
  
  describe( "Testing the findUserGroups function", function()
  {
    var event = require( 'events' );
    
    crowd.serverToken = 'token';
    var ee = new event.EventEmitter();
    var ctx = null;
    
    beforeEach( function()
    {
      spyOn( crowd, 'findUserRoles' );
      
      ctx = {
        statusCode : 200,
        response : '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soap:Body><ns1:findGroupMembershipsResponse xmlns:ns1="urn:myConsole"><ns1:out><ns1:string>myGroup@myCrowd.me</ns1:string><ns1:string>myGroup2@myCrowd.me</ns1:string><ns1:string>myGroup3@mycrowd.me</ns1:string><ns1:string>myGroup4@myCrowd.me</ns1:string><ns1:string>myGroup5@myCrowd.me</ns1:string><ns1:string>myGroup6@myCrowd.me</ns1:string><ns1:string>myGroup7@myCrowd.me</ns1:string><ns1:string>myGroup8@myCrowd.me</ns1:string><ns1:string>myGroup9@myCrowd.me</ns1:string><ns1:string>myGroup10@myCrowd.me</ns1:string><ns1:string>myGroup11@myCrowd.me</ns1:string><ns1:string>myGroup12@myCrowd.me</ns1:string><ns1:string>myGroup13@myCrowd.me</ns1:string></ns1:out></ns1:findGroupMembershipsResponse></soap:Body></soap:Envelope>'
      };
     
      spyOn( ee, 'emit' ).andCallThrough(); 
      spyOn( ws, 'Http' ).andReturn( {} );
      spyOn( ws, 'send' ).andCallFake( function( handlers, soapRequest, callback )
      {
        callback( ctx );
      } );
      
     config = {
        _crowdAuthUrl : 'url',
        _crowdAdminGroups : [ 'myGroup@myCrowd.me' ]
      };
      
      helper.setConfig( config );
    } );
    
    it( "emits true if the user is part of the security team", function( done )
    {
      ee.once( 'Groups Analyzed', function( err, isPartOfSecurityTeam ) 
      {
        expect( isPartOfSecurityTeam ).toEqual( true );
        done();
      } );
      
      expect( function() { crowd.findUserGroups( 'username', ee ); } ).not.toThrow(); 
      expect( ee.emit ).not.toHaveBeenCalledWith( 'Groups Analyzed', [ 'error' ], false );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'Groups Analyzed', 'function requires a URL to be present in config for crowd', false );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'Groups Analyzed', 'error', false );
    }, 1000 );
    
    it( "emits false if the user is not part of the security team", function( done )
    {
      ctx.response = '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soap:Body><ns1:findGroupMembershipsResponse xmlns:ns1="urn:myCrowd"></ns1:string></ns1:out></ns1:findGroupMembershipsResponse></soap:Body></soap:Envelope>';
      ws.send.andCallFake( function( handlers, soapRequest, callback )
      {
        callback( ctx );
      } );
      
      ee.once( 'Groups Analyzed', function( err, isPartOfSecurityTeam ) 
      {
        expect( isPartOfSecurityTeam ).toEqual( false );
        done();
      } );
      
      expect( function() { crowd.findUserGroups( 'username', ee ); } ).not.toThrow(); 
      expect( ee.emit ).not.toHaveBeenCalledWith( 'Groups Analyzed', [ 'error' ], false );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'Groups Analyzed', 'function requires a URL to be present in config for crowd', false );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'Groups Analyzed', 'error', false );
    }, 1000 );
    
    it( "throws an error if the SOAP request fails", function()
    {
       ctx.statusCode = 500;
       ctx.response = '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soap:Body><soap:Fault><faultcode>soap:Server</faultcode><faultstring>error</faultstring><detail><InvalidAuthenticationException xmlns="urn:myCrowd" /></detail></soap:Fault></soap:Body></soap:Envelope>';
       
       ws.send.andCallFake( function( handlers, soapRequest, callback )
       {
         callback( ctx );
       } );
       
       expect( function() { crowd.findUserGroups( 'username', ee ); } ).not.toThrow();
       expect( ee.emit ).not.toHaveBeenCalledWith( 'Groups Analyzed', null, false );
       expect( ee.emit ).not.toHaveBeenCalledWith( 'Groups Analyzed', null, true );
       expect( ee.emit ).toHaveBeenCalledWith( 'Groups Analyzed', [ 'error' ], false );
       expect( ee.emit ).not.toHaveBeenCalledWith( 'Groups Analyzed', 'function requires a URL to be present in config for crowd', false );
       expect( ee.emit ).not.toHaveBeenCalledWith( 'Groups Analyzed', 'error', false );
    } );
    
    it( "throws an error if the username parameter is null", function()
    {
      helper.setConfig( {} );
      
      expect( function() { crowd.findUserGroups( 'username', ee ); } ).not.toThrow();
      expect( ee.emit ).not.toHaveBeenCalledWith( 'Groups Analyzed', null, false );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'Groups Analyzed', null, true );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'Groups Analyzed', [ 'error' ], false );
      expect( ee.emit ).toHaveBeenCalledWith( 'Groups Analyzed', 'function requires a URL to be present in config for crowd', false );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'Groups Analyzed', 'error', false );
    } );
    
    it( "throws an error if the xml parser fails", function()
    {
      spyOn( xmlParser, 'parseString' ).andCallFake( function( param, callback )
      {
        callback( "error", null );
      } );
      
      expect( function() { crowd.findUserGroups( 'username', ee ); } ).not.toThrow();
      expect( ee.emit ).not.toHaveBeenCalledWith( 'Groups Analyzed', null, false );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'Groups Analyzed', null, true );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'Groups Analyzed', [ 'error' ], false );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'Groups Analyzed', 'function requires a URL to be present in config for crowd', false );
      expect( ee.emit ).toHaveBeenCalledWith( 'Groups Analyzed', 'error', false );
    } );
  } );
  
  describe( "Testing the findUserRoles function", function()
  {
    var event = require( 'events' );
    
    crowd.serverToken = 'token';
    var ee = new event.EventEmitter();
    var ctx = null;
    
    beforeEach( function()
    {
      ctx = {
        statusCode : 200,
        response : '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soap:Body><ns1:findRoleMembershipsResponse xmlns:ns1="urn:myCrowd"><ns1:out><ns1:string>myGroup@myCrowd.me</ns1:string></ns1:out></ns1:findRoleMembershipsResponse></soap:Body></soap:Envelope>'
      };
     
      spyOn( ee, 'emit' ).andCallThrough(); 
      spyOn( ws, 'Http' ).andReturn( {} );
      spyOn( ws, 'send' ).andCallFake( function( handlers, soapRequest, callback )
      {
        callback( ctx );
      } );
      
     config = {
        _crowdAuthUrl : 'url'
      };
      
      helper.setConfig( config );
    } );
    
    it( "emits true if the user is part of the security team", function( done )
    {
      ee.once( 'List of Roles', function( err, roles ) 
      {
        expect( roles ).toEqual( jasmine.any( Array ) );
        done();
      } );
      
      expect( function() { crowd.findUserRoles( 'username', ee ); } ).not.toThrow(); 
      expect( ee.emit ).not.toHaveBeenCalledWith( 'List of Roles', [ 'error' ], null );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'List of Roles', 'function requires a URL to be present in config for crowd', null );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'List of Roles', null, null );
    }, 1000 );
    
    it( "throws an error if the SOAP request fails", function()
    {
       ctx.statusCode = 500;
       ctx.response = '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soap:Body><soap:Fault><faultcode>soap:Server</faultcode><faultstring>error</faultstring><detail><InvalidAuthenticationException xmlns="urn:SecurityServer" /></detail></soap:Fault></soap:Body></soap:Envelope>';
       
       ws.send.andCallFake( function( handlers, soapRequest, callback )
       {
         callback( ctx );
       } );
       
       expect( function() { crowd.findUserRoles( 'username', ee ); } ).not.toThrow();
       expect( ee.emit ).not.toHaveBeenCalledWith( 'List of Roles', null, jasmine.any( Array ) );
       expect( ee.emit ).not.toHaveBeenCalledWith( 'List of Roles', null, null );
       expect( ee.emit ).toHaveBeenCalledWith( 'List of Roles', [ 'error' ], null );
       expect( ee.emit ).not.toHaveBeenCalledWith( 'List of Roles', 'function requires a URL to be present in config for crowd', null );
       expect( ee.emit ).not.toHaveBeenCalledWith( 'List of Roles', 'error', null );
    } );
    
    it( "throws an error if the url parameter is null", function()
    {
      helper.setConfig( {} );
      
      expect( function() { crowd.findUserRoles( 'username', ee ); } ).not.toThrow();
      expect( ee.emit ).not.toHaveBeenCalledWith( 'List of Roles', null, null );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'List of Roles', null, jasmine.any( Array ) );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'List of Roles', [ 'error' ], null );
      expect( ee.emit ).toHaveBeenCalledWith( 'List of Roles', 'function requires a URL to be present in config for crowd', null );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'List of Roles', 'error', null );
    } );
    
    it( "throws an error if the xml parser fails", function()
    {
      spyOn( xmlParser, 'parseString' ).andCallFake( function( param, callback )
      {
        callback( "error", null );
      } );
      
      expect( function() { crowd.findUserRoles( 'username', ee ); } ).not.toThrow();
      expect( ee.emit ).not.toHaveBeenCalledWith( 'List of Roles', null, null);
      expect( ee.emit ).not.toHaveBeenCalledWith( 'List of Roles', null, jasmine.any( Array ) );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'List of Roles', [ 'error' ], null );
      expect( ee.emit ).not.toHaveBeenCalledWith( 'List of Roles', 'function requires a URL to be present in config for crowd', null );
      expect( ee.emit ).toHaveBeenCalledWith( 'List of Roles', 'error', null );
    } );
  } );
} );
