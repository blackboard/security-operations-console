var csrfUtil = require( '../models/security/csrf-util.js' );
var helper = require( '../models/helpers.js' );
var issue = require( '../models/issues/issue-util.js' );

var http = require( 'http' );

var querystring = require( "querystring" );
var url = require( 'url' );
var event = require( 'events' );

/**
 * @class Functionality around creating the index page for the application. The index page shows a list of 
 * issues based on the input parameters to the page.
 * 
 * @author Matthew Saltzman
 * @since 7-24-2013
 */
var expressIndex = {
  /**
   * Function that creates the index page for the console, displaying the list of issues in the format 
   * requested by the user 
   * 
   * @param {Object} request The request object
   * @param {Object} response The response object 
   * @param {Object} db The database for the application
   * 
   * @throws an error if the type parameter in the request object is invalid
   */
  createIndexPage : function( request, response, db ) 
  {
    //grabbing the info and security logs
    var info = helper.getLoggers().info; 
    var security = helper.getLoggers().security;
    
    var ee = new event.EventEmitter();
    var error = request.query.error;
    var updatePermission = false;
    var results = [];
    
    //event handler for creating the new issues list page
    ee.on( 'List Created' , function() 
    {
      //renders the new issues list page from the jade template
      response.render( 'index.jade', { scanners : results,
                                       updatePermission : updatePermission, 
                                       error : error,
                                       _csrf : csrfUtil.addTokenToForm( request, response ) } );
    });
    
    db.collection( 'ISSUES_LIST', function( err, collection ) 
    {
      var items;
      
      //determins which list of issues to create
      switch( request.query[ "type" ] ) 
      {
        //Creates the new issues list
        case "new": 
        case undefined:
          info.log( "info", "generating new issues list", { username : request.session.username } );
          items = collection.find({ "reviewed.reviewed" : { $ne : "Y" } } );
          break;
        //creates a list of issues that had been previously reviewed
        case "reviewed":
          info.log( "info", "generating reviewed issues list", { username : request.session.username } );
          items = collection.find( { "reviewed.reviewed" : "Y" } );
          break;
        //creates a list of all issues
        case "all":
          info.log( "info", "generating full issues list", { username : request.session.username } );
          items = collection.find( {} );
          break;
        //throw an error if the type parameter is anything but what's above
        default:
          security.log( "warn", "invalid option received for parameter 'type'", { username : request.session.username,
                                                                                  type : request.query.type } );
          response.redirect( '/?error[header]="Error occurred, see log for details&error[date]=' + new Date() );                                                                                  
          throw new Error( "invalid option received for parameter 'type': " + request.query.type );
          break;
      }
      
      //verify whether or not the user has the ability to update issues or not
      for( var i = 0; i < request.session.permissions.length; i ++ ) 
      {
        if( request.session.permissions[ i ] == 'issues.write' ) 
        {
          updatePermission = true;
        }
      }
      
      //iterate through the list of issues, and correct the date formatting
      items.each( function( err, doc )
      {
        if ( doc )  
        {
          if( doc.FirstIdentified && doc.FirstIdentified.Date )
          {
            //the format of date strings in the database does not display properly to users without this step
            doc.FirstIdentified.Date = new Date( doc.FirstIdentified.Date ).toDateString();
          }
        }
        else 
        {
          //once all date strings are updated, emit an event telling the system to display the list to users
          ee.emit( 'List Created' );
        }
        
        //adds the item with the newly corrected date to the list of results to display to users
        results.push( doc );
      } );
    } );
  },
  
  /**
   * Function used to review an issue. Passes the issue to scala where it gets stored in the database
   *  
   * @param {Object} request The request object
   * @param {Object} response The response object
   * 
   * @throws an error if the review issue form isn't fully filled out
   * @throws an error if the issue_type is set to something other than valid or false_positive
   */
  reviewIssue : function( request, response )
  {
    //grabbing the security logger
    var security = helper.getLoggers().security;
    
    var ee = new event.EventEmitter();
    //if any parameters are missing or empty, throw an error
    if( ! ( request.body.reviewedItem && request.body.issue_type && request.body.description &&  request.body.review ) ) 
    {
      security.log( 'warn', 'Missing some required parameters', { params : request.body, username : request.session.username} );
      response.redirect( '/?error[header]="Error occurred, see log for details&error[date]=' + new Date() );
      throw new Error( 'Missing some required parameters, try again.' );
    }
    else 
    { 
      //throws an error if the issue_type is anything except valid or false_positive
      if( !( request.body.issue_type == 'valid' || request.body.issue_type == 'false_positive' ) )
      //throws an error if the issue_type is anything except valid or false_positive
      {
        security.log( 'warn', 'Parameter issue_type must be valid or false_positive', { param : request.body.issue_type, 
                                                                                        username : request.body.username} );
        response.redirect( '/?error[header]="Error occurred, see log for details&error[date]=' + new Date() );
        throw new Error( 'Parameter issue_type must be either valid or false_positive' );
      }
      
      //event handler to handle the response from scala
      ee.once( 'Update Complete', function( err )
      {
        //throws an error if scala cannot save the review of the issue
        if( err )
        {
          response.redirect( '/?error[header]="Error occurred, see log for details&error[date]=' + new Date() );
          throw new Error( err );
        }
        //on successful issue review, send the user back to the root page (which should send them back to the index page)
        else
        {
          response.redirect( '/' );
        }
      } );
      
      issue.reviewIssue( request.body.reviewedItem, request.session.username, request.body.issue_type, request.body.description, ee, response );
    }
  }
};

exports.createIndexPage = expressIndex.createIndexPage;
exports.reviewIssue = expressIndex.reviewIssue;