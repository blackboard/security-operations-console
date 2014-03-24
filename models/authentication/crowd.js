var helper = require( '../helpers.js' );

var ws = require( '../../node_modules/ws.js' );
var xmlParser = require( '../../node_modules/xml2js' );

/**
 * @class Functionality to authenticate to the crowd server. Currently written for SOAP calls,
 * but will be rewritten for REST as soon as the new version of crowd is installed.
 * 
 * @author Matthew Saltzman
 * @since 7-24-2013
 */
crowd = {
  /** the token returned by the SOAP request for authenticating the server itself */
  serverToken : null,
  
  /**
   * The function to authenticate a server to Crowd. To be called if ever the server token is no longer valid.
   *
   * @param {string} url The url of the crowd server, as contained in the config object
   * @param {string} username The username of the server
   * @param {string} credentials The password of the server
   *
   * @throws an error if config._crowdAuthUrl is null
   * @throws an error if the authentication request comes back with an error
   * @throws an error if 
   */
  authenticateServer : function( url, username, credentials )
  {
    //making sure the url is passed in properly, otherwise throw an error into the logs
    if( !url )
    {
      throw new Error( "function requires a URL to be present in config for crowd" );
    }
    
    //the SOAP request XML for authenticating the console itself to crowd. Because we have to supply the XML
    //manually, this will need to be updated if the wsdl for crowd changes
    var request = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:SecurityServer" xmlns:aut="http://authentication.integration.crowd.atlassian.com">' + 
                    '<soapenv:Header/>' + 
                    '<soapenv:Body>' +
                      '<urn:authenticateApplication>' +
                        '<urn:in0>' +
                          '<aut:credential>' +
                            '<aut:credential>' + credentials + '</aut:credential>' +
                          '</aut:credential>' +
                          '<aut:name>' + username + '</aut:name>' +
                        '</urn:in0>' +
                      '</urn:authenticateApplication>' +
                    '</soapenv:Body>' +
                  '</soapenv:Envelope>';
                    
    //this object creates the SOAP request for submitting the request to authenticate this server
    var soapRequest = {
      'request' : request,
      'url' : url,
      contentType : 'application/soap+xml' 
    };
    
    //handlers handle different aspects of the SOAP request. For this item, we only need to handle the HTTP request
    var handlers = [ new ws.Http() ];
    
    //sends the SOAP request to Crowd, which sends a response via a callback 
    ws.send( handlers, soapRequest, function( soapResponse )
    {
      //parse the soapResponse
      xmlParser.parseString( soapResponse.response, function( err, result )
      {
        if( err )
        {
          throw new Error( err );
        }
        //this is the item that is the same regardless of whether the authentication request was a success or failure
        var body = result[ 'soap:Envelope' ][ 'soap:Body' ][ 0 ];
        
        //on success, store the token
        if( soapResponse.statusCode == 200 )
        {
          //This is the only way to access the JSON object to get at the token
          module.exports.serverToken = body[ 'ns1:authenticateApplicationResponse' ][ 0 ][ 'ns1:out' ][ 0 ].token[ 0 ]._;
        }
        //on failure, throw an error
        else
        {
          //this set of accessors gets to the error message sent back by the SOAP failure
          throw new Error( body[ 'soap:Fault' ][ 0 ][ 'faultstring' ] );
        }
      } );
    } ); 
  },
  
  /**
   * The function that authenticates a user. It will need to be enhanced to actually use SSO, should we decide to go that route.
   * For now though, passes a username and password to crowd, parses the response to detect authentication. Then, adds the username
   * to the session if the authentication is valid, and informs the calling function that authentication was successful.
   *  
   * @param {string} username The username of the user attempting to authenticate
   * @param {string} password The password for that user
   * @param {Object} ee The event handler object from the caling function
   * @param {Object} req The request object
   * @param {Object} res The response object
   * 
   * @throws an error if config._crowdAuthUrl is null
   * @throws an error if the authentication request fails
   * @throws an error if the XML returned by crowd is not well formed
   */
  authenticateUser : function( username, password, ee, req, res )
  {
    var config = helper.getConfig();
    
    //re-authenticating the server to crowd on each login, due to infrequent login, temporary until todo sections
    //below are complete 
    this.authenticateServer( config._crowdAuthUrl, config._crowdUsername, config._crowdCredentials );
    
    //making sure the url is passed in properly, otherwise throw an error into the logs
    if( config._crowdAuthUrl == null )
    {
      ee.emit( 'User Authenticated', "function requires a URL to be present in config for crowd", req, res );
    }
    else
    {
      //TODO - Enhance to check for an existing SSO cookie, and set one if not present
      //TODO - Enhance to validate that the server is authenticated, and call authenticateServer if not
      //This is the SOAP request for authenticating a user account to crowd
      var request = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:SecurityServer" xmlns:aut="http://authentication.integration.crowd.atlassian.com">' +
                      '<soapenv:Header/>' +
                      '<soapenv:Body>' +
                        '<urn:authenticatePrincipal>' +
                          '<urn:in0>' +
                            '<aut:name>security-console</aut:name>' +
                            '<aut:token>' + module.exports.serverToken + '</aut:token>' +
                          '</urn:in0>' +
                          '<urn:in1>' +
                            '<aut:application>security-console</aut:application>' +
                            '<aut:credential>' +
                              '<aut:credential>' + password + '</aut:credential>' +
                            '</aut:credential>' +
                            '<aut:name>' + username + '</aut:name>' +
                          '</urn:in1>' +
                        '</urn:authenticatePrincipal>' +
                      '</soapenv:Body>' +
                    '</soapenv:Envelope>';
                    
      //this object creates the SOAP request for submitting the request to authenticate this server
      var soapRequest = {
        'request' : request,
        'url' : config._crowdAuthUrl,
        contentType : 'application/soap+xml' 
      };
      
      //handlers handle different aspects of the SOAP request. For this item, we only need to handle the HTTP request
      var handlers = [ new ws.Http() ];
      
       //sends the SOAP request to Crowd, which sends a response via a callback 
      ws.send( handlers, soapRequest, function( soapResponse )
      {
        
        //parse the soapResponse
        xmlParser.parseString( soapResponse.response, function( err, result )
        {
          if( err )
          {
            ee.emit( 'User Authenticated', err, req, res );
          }
          else
          {
            //this is the item that is the same regardless of whether the authentication request was a success or failure
            var body = result[ 'soap:Envelope' ][ 'soap:Body' ][ 0 ];
            
            //on success, store the token
            if( soapResponse.statusCode == 200 )
            {
              //TODO: Add a cookie to .pd.local called crowd.token_key with this value. Discarding for now
              var crowdCookie = body[ 'ns1:authenticatePrincipalResponse' ][ 0 ][ 'ns1:out' ][ 0 ];
              req.session.username = username;
              
              ee.emit( 'User Authenticated', null, req, res );
            }
            else
            {
              //this set of accessors gets to the error message sent back by the SOAP failure
              ee.emit( 'User Authenticated', body[ 'soap:Fault' ][ 0 ][ 'faultstring' ], req, res );
            }
          }
        } );
      } );
    } 
  },
  
  /**
   * Function to return the list of Crowd roles a user has. Not sure if this is a useful bit of info, so testing that first.
   * 
   * @param {String} username The username for which to find the roles for
   * @param {Object} ee The event emitter object 
   */
  findUserRoles : function( username, ee )
  {
    var config = helper.getConfig();
    
    //making sure the url is passed in properly, otherwise throw an error into the logs
    if( config._crowdAuthUrl == null )
    {
      ee.emit( 'List of Roles', "function requires a URL to be present in config for crowd", null );
    }
    else
    {
      var request = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:SecurityServer" xmlns:aut="http://authentication.integration.crowd.atlassian.com">' +
                      '<soapenv:Header/>' +
                      '<soapenv:Body>' +
                        '<urn:findRoleMemberships>' + 
                          '<urn:in0>' +
                            '<aut:name>security-console</aut:name>' +
                            '<aut:token>' + module.exports.serverToken + '</aut:token>' +
                          '</urn:in0>' +
                          '<urn:in1>' + username + '</urn:in1>' +
                        '</urn:findRoleMemberships>' +
                      '</soapenv:Body>' +
                    '</soapenv:Envelope>';
  
      //this object creates the SOAP request for submitting the request to authenticate this server
      var soapRequest = {
        'request' : request,
        'url' : config._crowdAuthUrl,
        contentType : 'application/soap+xml' 
      };
      
      //handlers handle different aspects of the SOAP request. For this item, we only need to handle the HTTP request
      var handlers = [ new ws.Http() ];
      
       //sends the SOAP request to Crowd, which sends a response via a callback 
      ws.send( handlers, soapRequest, function( soapResponse )
      {
        //parse the soapResponse
        xmlParser.parseString( soapResponse.response, function( err, result )
        {
          if( err )
          {
            ee.emit( 'List of Roles', err, null );
          }
          else
          {
            //this is the item that is the same regardless of whether the authentication request was a success or failure
            var body = result[ 'soap:Envelope' ][ 'soap:Body' ][ 0 ];
            //on success, emit the list of roles
            if( soapResponse.statusCode == 200 )
            {
              var inSecurityGroup = false;
              var listOfRoles = body[ 'ns1:findRoleMembershipsResponse' ][ 0 ][ 'ns1:out' ][ 0 ][ 'ns1:string' ];
    
              ee.emit( 'List of Roles', null, listOfRoles );
            }
            else
            {
              //this set of accessors gets to the error message sent back by the SOAP failure
              ee.emit( 'List of Roles', body[ 'soap:Fault' ][ 0 ][ 'faultstring' ], null );
            }
          }
        } );
      } );  
    }
  },
  
  /**
   * Function to find the set of crowd groups the user belongs to. This is used to generate the authorization
   * list for this user.
   *  
   * @param {Object} username
   * @param {Object} ee
   */
  findUserGroups : function( username, ee )
  {
    var config = helper.getConfig();
    //making sure the url is passed in properly, otherwise throw an error into the logs
    if( config._crowdAuthUrl == null )
    {
      ee.emit( 'Groups Analyzed', "function requires a URL to be present in config for crowd", false );
    }
    else
    {
      var request = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:SecurityServer" xmlns:aut="http://authentication.integration.crowd.atlassian.com">' +
                      '<soapenv:Header/>' +
                      '<soapenv:Body>' +
                        '<urn:findGroupMemberships>' + 
                          '<urn:in0>' +
                            '<aut:name>security-console</aut:name>' +
                            '<aut:token>' + module.exports.serverToken + '</aut:token>' +
                          '</urn:in0>' +
                          '<urn:in1>' + username + '</urn:in1>' +
                        '</urn:findGroupMemberships>' +
                      '</soapenv:Body>' +
                    '</soapenv:Envelope>';
  
      //this object creates the SOAP request for submitting the request to authenticate this server
      var soapRequest = {
        'request' : request,
        'url' : config._crowdAuthUrl,
        contentType : 'application/soap+xml' 
      };
      
      //handlers handle different aspects of the SOAP request. For this item, we only need to handle the HTTP request
      var handlers = [ new ws.Http() ];
      
       //sends the SOAP request to Crowd, which sends a response via a callback 
      ws.send( handlers, soapRequest, function( soapResponse )
      {
        //parse the soapResponse
        xmlParser.parseString( soapResponse.response, function( err, result )
        {
          if( err )
          {
            ee.emit( 'Groups Analyzed', err, false );
          }
          else
          {
            //this is the item that is the same regardless of whether the authentication request was a success or failure
            var body = result[ 'soap:Envelope' ][ 'soap:Body' ][ 0 ];
            //on success, store the token
            if( soapResponse.statusCode == 200 )
            {
              var inSecurityGroup = false;
              var listOfGroups = body[ 'ns1:findGroupMembershipsResponse' ][ 0 ][ 'ns1:out' ][ 0 ][ 'ns1:string' ];
    
              var expectedGroups = config._crowdAdminGroups;
              for( iter in listOfGroups )
              {
                for( group in expectedGroups )
                if( listOfGroups[ iter ] == expectedGroups[ group ] )
                {
                  inSecurityGroup = true;
                  break;
                }
                
                if( inSecurityGroup )
                {
                  break;
                }
              }
              
              ee.emit( 'Groups Analyzed', null, inSecurityGroup );
            }
            else
            {
              //this set of accessors gets to the error message sent back by the SOAP failure
              ee.emit( 'Groups Analyzed', body[ 'soap:Fault' ][ 0 ][ 'faultstring' ], false );
            }
          }
        } );
      } );  
    }
  }
};

module.exports = crowd; 