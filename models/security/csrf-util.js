/**
 * @class This file implements all CSRF token inserts and validation, where possible
 * 
 * @author msaltzman
 * @since 6-11-2013
 */
var csrfUtil = {
  /**
   * This function returns the csrf value from the session object
   * 
   * @param {Object} req The Request Object
   * @param {Object} res The Response Object
   * @returns {String} The CSRF token in the users' session object 
   */
  addTokenToForm : function( req, res )
  {
    return req.session._csrf;
  }
};

exports.addTokenToForm = csrfUtil.addTokenToForm;
