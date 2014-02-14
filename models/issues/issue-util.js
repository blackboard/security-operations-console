
var helper = require( '../helpers.js' );

var mongodb = require( '../../node_modules/mongodb' );

/**
 * @class Functionality for dealing with issues of all types. 
 * 
 * @author Matthew Saltzman
 * @since 7-5-2013 
 */
var issueUtil = {
  /**
   * Function for reviewing a dynamic scan issue. 
   *   
   * @param {String} id The ObjectId for the issue we're looking for
   * @param {String} user The user who reviewed the issue
   * @param {String} type False_positive or valid
   * @param {String} description Either a ticket number or a description of why this is a false positive
   * @param {Object} ee Event Emitter for sending the updated response back to the calling function
   * @param {Object} response The response object
   */
  reviewIssue : function( id, user, type, description, ee, response )
  {
    //grabbing the security logger
    var security = helper.getLoggers().security;
    //grabbing the config object to connect to the database
    var config = helper.getConfig();
    //boolean value for allowing us to proceed (temporary)
    var validType = true;
    
    //The new information to update the issue with, regardless or false positive or valid status
    var updateData = {
      $set : {
        reviewed : {
          reviewed : 'Y',
          username : user,
          'type' : type,
          date_reviewed : new Date()
        }
      }
    };
    
    //Update some data if the issue is valid, update other data if the issue is a false positive
    switch( type )
    {
      //if the issue is valid, update the case number, and remove the false positive reason if it existed
      case 'valid': 
        updateData.$set.reviewed.case_number = description;
        updateData.$set.reviewed.false_positive_reason = '';
        break;
      //if the issue is a false positive, remove the case number if it existed, and update the false_positive_reason
      case 'false_positive':
        updateData.$set.reviewed.case_number = '';
        updateData.$set.reviewed.false_positive_reason = description;
        break;
      default:
        //TODO - Once we can properly handle thrown errors, throw an error instead
        security.log( 'warn', 'Error: Must be a false_positive or valid issue', { param : type, username : user } );
        response.redirect( '/?error[header]=Issue type invalid: ' + type + '&error[date]=' + new Date() );
        throw new Error( "Type parameter invalid" );
    }
    
    //enter the ISSUES database collection
    config._database.collection( 'ISSUES_LIST', function( err, issues )
    {
      //Search for the item to update by its' _id column
      var updateCriteria = {
        _id : new mongodb.ObjectID( id )
      };
      
      //The options to pass to the update statement
      var updateOptions = {
        //do not proceed until row is updated
        safe : true,
        //do not update more than one row
        multi : false,
        //do not insert a new row if one did not already exist
        upsert : false
      };
      
      //accomplish the update itself
      issues.update( updateCriteria, updateData, updateOptions, function( err, count )
      {
        var error = null;
          
        if( !err )
        {
          //if no rows were updated
          if( count == 0 )
          {
            error = 'Error: Issue not found';
          }
          //if more than one row exists
          else if( count > 1 )
          {
            error = 'Error: Too many results';
          } 
        }
        else 
        {
          error = err;
        }
        //emit the completion event
        ee.emit( 'Update Complete', error );
      } );
    } );
  }
};

exports.reviewIssue = issueUtil.reviewIssue;