var http = require( 'https' );
var helper = require( '../helpers.js' );

/**
 * @class PasswordManagement is an optional component for getting the username and password for the application to
 * authenticate to the crowd server.
 *
 * @author Matthew Saltzman
 * @since 2-20-2014
 */
var passwordManagement = {
  /** The config object, allowing us to work with the information in config */
  config : null,
  /** The username parameter for the server*/
  username : null,
  /** The password parameter for the server*/
  password : null,
  /** The event emitter passed in*/
  ee : null,
  /** The resourceId, used in a few different functions here */
  resourceId : null,
  /**
   * Function to get the account information from the password management tool, runs through a number of callback functions
   *
   * @param ee The event emitter for this function
   */
  getAccountInfo : function( ee )
  {
    if( !exports.config )
    {
      exports.setConfig( helper.getConfig() );
    }

    this.ee = ee;

    var options = {
      hostname : passwordManagement.config._pmpHostname,
      port : passwordManagement.config._pmpPort,
      path : '/restapi/json/v1/resources?AUTHTOKEN=' + passwordManagement.config._pmpAuthtoken,
      method : "GET",
      requestCert : true,
      rejectUnauthorized : false,
      agent : false,
      secureProtocol: 'SSLv3_method'
    };

    http.request( options, exports.callbackResources ).end();
  },

  /**
   * The first callback function, to get the resource information from PMP. If successful, then calls the next callback
   * function. If it fails, it emits the complete event, along with the error condition.
   *
   * @param {Object} response The response object from the previous REST request
   * @event complete
   */
  callbackResources : function( response )
  {
    var body = '';
    response.on( 'data', function ( chunk )
    {
      body += chunk;
    } );

    response.on( 'end', function()
    {
      var parsedResponse = JSON.parse( body );
      if( parsedResponse.operation.result.status == 'Success' )
      {
        passwordManagement.resourceId = parsedResponse.operation.Details[ 0 ][ "RESOURCE ID" ];
        var options = {
          hostname : passwordManagement.config._pmpHostname,
          port : passwordManagement.config._pmpPort,
          path : '/restapi/json/v1/resources/' + passwordManagement.resourceId + '/accounts?AUTHTOKEN=' +
                 passwordManagement.config._pmpAuthtoken,
          method : "GET",
          requestCert : true,
          rejectUnauthorized : false,
          agent : false,
          secureProtocol: 'SSLv3_method'
        }
        http.request( options, exports.callbackAccount ).end();
      }
      else
      {
        passwordManagement.config._ee.emit( 'complete', parsedResponse.operation.result );
      }
    } );
  },

  /**
   * The second callback function, this time retrieving the username from the tool, and storing it in this object. If
   * successful, it calls the next and last callback function to get the password. Otherwise, it emits the complete event.
   * along with the error.
   *
   * @param {Object} response The response object from the previous REST request
   * @event complete
   */
  callbackAccount : function( response )
  {
    var body = '';
    response.on( 'data', function ( chunk )
    {
      body += chunk;
    } );

    response.on( 'end', function()
    {
      var parsedResponse = JSON.parse( body );
      if( parsedResponse.operation.result.status == 'Success' )
      {
        exports.username = parsedResponse.operation.Details[ 'ACCOUNT LIST' ][ 0 ][ 'ACCOUNT NAME' ];

        var options = {
          hostname : passwordManagement.config._pmpHostname,
          port : passwordManagement.config._pmpPort,
          path : '/restapi/json/v1/resources/' + passwordManagement.resourceId + '/accounts/' +
                 parsedResponse.operation.Details[ 'ACCOUNT LIST' ][ 0 ][ 'ACCOUNT ID' ] + '/password?AUTHTOKEN=' +
                 passwordManagement.config._pmpAuthtoken,
          method : "GET",
          requestCert : true,
          rejectUnauthorized : false,
          agent : false,
          secureProtocol: 'SSLv3_method'
        }
        http.request( options, exports.callbackPassword ).end();
      }
      else
      {
        passwordManagement.config._ee.emit( 'complete', parsedResponse.operation.result );
      }
    } );
  },

  /**
   * The final callback function in this list, which gets the password for the account. If successful, it emits the
   * complete event without arguments. If it fails, however, it emits the complete event with error information.
   *
   * @param {Object} response The response object from the previous REST request
   * @event complete
   */
  callbackPassword : function( response )
  {
    var body = '';
    response.on( 'data', function ( chunk )
    {
      body += chunk;
    } );

    response.on( 'end', function()
    {
      var parsedResponse = JSON.parse( body );

      if( parsedResponse.operation.result.status == 'Success' )
      {
        exports.password = parsedResponse.operation.Details.PASSWORD;
        passwordManagement.config._ee.emit( 'complete', null );
      }
      else
      {
        passwordManagement.config._ee.emit( 'complete', parsedResponse.operation.result );
      }
    } );
  },

  /**
   * Function to set the config object that this class has in memory. It was created primarily for testing purposes,
   * rather than because it's necessary for running the code
   *
   * @param {Object} config The config object containing configuration information for the operations conosle
   */
  /* istanbul ignore next */
  setConfig : function( config )
  {
    passwordManagement.config = config;
  }
};

exports.getAccountInfo = passwordManagement.getAccountInfo;
exports.callbackResources = passwordManagement.callbackResources;
exports.callbackAccount = passwordManagement.callbackAccount;
exports.callbackPassword = passwordManagement.callbackPassword;
exports.setConfig = passwordManagement.setConfig;
exports.username = passwordManagement.username;
exports.password = passwordManagement.password;
//Exposed for testing purposes only
exports.ee = passwordManagement.ee;