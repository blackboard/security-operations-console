describe( 'Testing the CSRF functionality for the console', function()
{
  var csrf = require( '../../../../models/security/csrf-util.js' );
  
  describe( 'Testing the addition of a CSRF token to a form', function()
  {
    it( 'Adds a CSRF token to the form', function() {
      var req = { 
        session : {
          _csrf : 'token' 
        }
      };
      var res = { };
      var token = csrf.addTokenToForm( req, res );
      
      expect( token ).toEqual( 'token' );
    } );
  } );
} );
