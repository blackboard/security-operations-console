var csrfUtil = require( '../models/security/csrf-util.js' );
var helper = require( '../models/helpers.js' );
var issue = require( '../models/issues/issue-util.js' );
var accessMongo = require( '../models/pull-report-data.js' );
var xssUtil = require( '../models/security/xss-util.js' );
var mongodb = require( '../node_modules/mongodb' );

var http = require( 'http' );

var querystring = require( "querystring" );
var url = require( 'url' );
var event = require( 'events' );

/**
 * @class Functionality to find the list of static-analysis issues, as well as functionality to allow users to
 * review these issues
 * 
 * @author Matthew Saltzman 
 * @since 8-26-13
 */
var staticIssues = {
  /**
   * Function that obtains and displays the list of static-analysis findings to users, based on the parameters passed in
   * 
   * @param {Object} request The request object
   * @param {Object} response The response object
   * @throws Exception when the parameter app is invalid
   * @throws Exception when the parameter conf is invalid or null
   * @throws Exception when the parameter sev is invalid or null
   * @throws Exception when connecting to the collection of static issues fails
   * @throws Exception when the vtype parameter is not null and not a valid string
   */
  findStaticIssues : function( request, response )
  {
    //create an event emitter
    var ee = new event.EventEmitter();
    //get the configuration of the application
    var config = helper.getConfig();
    //the confidence and severity ratings, to be set later
    var conf, sev;
    
    //grab the security logger
    var security = helper.getLoggers().security;
    //The confidence value we're interested in
    if( request.query.conf != null )
    {
      //if the confidence variable is present, store it as an array
      var conf = request.query.conf.split( ',' ); 
    }
    else
    {
      //if the confidence variable is missing, throw an error
      response.redirect( '/?error[header]=Conf parameter missing&error[date]=' + new Date() );
      throw new Error( "Missing parameter: conf" );
    }
    //The severity value we're interested in
    if( request.query.sev != null )
    {
      //if the severity variable is present, store it as an array
      var sev = request.query.sev.split( ',' );
    }
    else
    {
      //if the severity variable is missing, throw an error
      response.redirect( '/?error[header]=Sev parameter missing&error[date]=' + new Date() );
      throw new Error( "Missing parameter: sev" );
    }
    //The issue status( reviewed, new, all ) for the findings
    var type = request.query.type;
    //The application being investigated (b2 or Learn_Mainline for now )
    var app = request.query.app;
    //The project within the application (primarily for Learn_Mainline)
    var project = request.query.project;
    //The vulnerability type to find (if requested)
    var vtype = request.query.vtype;
    //The vulnerability method to find (if requested)
    var method = request.query.method;
    //The minimum date we're looking for, as an ObjectID for easy comparison to existing issues, or null
    var minDate = helper.createObjectidTimestamp( new Date( parseInt( request.query.beginDate ) ) );
    //The maximum date we're looking for, as an ObjectID for easy comparison to existing issues, or null
    var maxDate = helper.createObjectidTimestamp( new Date( parseInt( request.query.endDate ) ) ); 
    
    //Handler for the completion of the group query
    ee.once( "results from complex group query found", function( results ) 
    {
      //display the list of static-analysis issues
      exports.displayStaticIssues( results, response, config._database, request );
    } );
    
    //Validate that the application is a valid string
    if( !xssUtil.isValidLongString( app ) )
    {
      response.redirect( '/?error[header]=Application Name invalid:' + app + '&error[date]=' + new Date() );
      security.log( "warn", "Application Name set to invalid value", { app : app, user : request.session.username } );
      throw new Error( "Applicaton Name is invalid: " + app );
    }
    
    //validate that the project value is a valid string
    if ( !xssUtil.isValidLongString( project ) )
    {
      response.redirect( '/?error[header]=Project Name invalid:' + project + '&error[date]=' + new Date() );
      security.log( "warn", "Project Name set to invalid value", { project : project, user : request.session.username } );
      throw new Error( "Project Name is invalid: " + project );
    }
    
    //validate that the vtype parameter is a valid string if it exists
    if( vtype && !xssUtil.isValidLongString( vtype ) )
    {
      response.redirect( '/?error[header]=Vulnerability Type invalid:' + vtype + '&error[date]=' + new Date() );
      security.log( "warn", "Vulnerability Type set to invalid value", { vtype : vtype, user : request.session.username } );
      throw new Error( "Vulnerability Type is invalid: " + vtype );
    }
    
    //validate that the method parameter is a valid string if it exists
    if( method && !xssUtil.isValidLongString( method ) )
    {
      response.redirect( '/?error[header]=Method Name invalid:' + method + '&error[date]=' + new Date() );
      security.log( "warn", "Vulnerability Method set to invalid value", { method : method, user : request.session.username } );
      throw new Error( "Vulnerability Method is invalid: " + method );
    }
    
    //determine if all values for conf are valid
    for( iter in conf )
    {
      //if a conf value is not valid, throw an error
      if( !exports.isValidConf( conf[ iter ] ) )
      {
        response.redirect( '/?error[header]=Confidence level invalid:' + conf[ iter ] + '&error[date]=' + new Date() );
        security.log( "warn", "Confidence Level set to invalid value", { conf : conf[ iter ], user : request.session.username } );
        throw new Error( "Confidence level is invalid: " + conf[ iter ] );
      }
    }
    
    //determine if all values for conf are valid
    for( iter in sev )
    {
      //if a sev value is not valid, throw an error
      if( !exports.isValidSev( sev[ iter ] ) )
      {
        response.redirect( '/?error[header]=Severity level invalid:' + sev[ iter ] + '&error[date]=' + new Date() );
        security.log( "warn", "Severity Level set to invalid value", { sev : sev[ iter ], user : request.session.username } );
        throw new Error( "Severity level is invalid: " + sev[ iter ] );
      }
    }
    
    //building the match part of the aggregation
    var match = { $match : { "conf" : { $in : conf }, "sev" : { $in :  sev } } };
    if( minDate )
    {
      match.$match._id = { $gte : minDate };
    }
    
    if( maxDate )
    {
      if( match.$match._id != null )
      {
        match.$match._id.$lte = maxDate;  
      }
      else
      {
        match.$match._id = { $lte : maxDate };
      }
    }
    //match the application first
    var matchApp = null;
    //match the project second
    var matchProj = null;
    //if the application selected is All, do not match on application at all
    if( app != "All" )
    {
      matchApp = { $match : { "application_name" : app } };
    }
        
    if( project != "All" )
    {
      matchProj = { $match : { "project_name" : project } };
    }
    //match the review status last
    var matchReview = { $match : {} };
    //updating the matching algorithm based on the review status
    switch( type )
    {
      //for unreviewed issues
      case null :
      case undefined :
      case "new" :
        //set match to find all issues where review status does not exist
        matchReview.$match[ "reviewStatus.0" ] = { "$exists" : false };  
        break;
      //for reviewed issues
      case "reviewed" :
        //set match to find all issues where the review status is reviewed
        matchReview.$match[ "reviewStatus.0" ] = { "$exists" : true };  
        break;
      //for all issues
      case "all" :
        //do not update match at all
        break;
      //for false positive issues
      case "false_positive":
        //set match to find all issues where the review type is false positive
        matchReview.$match[ "reviewStatus.0" ] = "false_positive";  
        break;
      case "valid":
        //set match to find all issues where the review type is false positive
        matchReview.$match[ "reviewStatus.0" ] = "valid";  
        break;
      //if the value passed in was invalid, assume unreviewed, but put a message in the security log
      default :
        security.log( "warn", "Review Status set to invalid value", { review_status : type, user : request.session.username } );
        matchReview.$match[ "reviewStatus.0" ] = { "$exists" : false };  
        break;
    } 
    
    //if vtype exists, add it to matchReview
    if( vtype )
    {
      matchReview.$match[ "_id.vtype" ] = vtype;
    }
    
    //if method exists, add it to matchReview
    if( method )
    {
      matchReview.$match[ "_id.method" ] = method;
    }
    
    //Group by statement, that denotes a unique finding
    var group = { 
      $group : { 
        //_id provides a unique identifier for a specific issue (project name excluded for now, but can easily be included)
        _id : { 
          vtype : "$vtype", 
          ln : "$ln", 
          method : "$method", 
          file : "$file_path",  
          conf : "$conf",
          sev : "$sev",
          app : "$application_name",
          caller : "$caller",
          project_name : "$project_name"
        },
        //list the date when first discovered
        date : {
          $min : "$date_scanned"
        }, 
        updateVal : {
          $max : "$_id"
        },
        reviewStatus : { 
          $push : "$review.status"          
        },
        reviewUser : {
          $min : "$review.user"
        },
        reviewDate : {
          $min : "$review.date"
        },
        fpreason : {
          $push : "$review.false_positive_reason"
        },
        vreason : {
          $push : "$review.ticket_number"
        },
      } 
    };
    //sort the results by filename
    var sort = { $sort : { "_id.file" : 1 } };
    
    //the aggregation pipeline to run
    var pipeline;
    
    //if we want to match an app and project, include both
    if( matchApp && matchProj )
    {
      pipeline = [ matchApp, matchProj, match, group, matchReview, sort ];
    }
    //if we want to match a project but not an application
    else if( matchProj && !matchApp )
    {
      pipeline = [ matchProj, match, group, matchReview, sort ];      
    }
    //if we want to match an application but not a project
    else if( matchApp && !matchProj )
    {
      pipeline = [ matchApp, match, group, matchReview, sort ];
    }
    //If we want to match neither an application nor a project
    else
    {
      pipeline = [ match, group, matchReview, sort ];
    }
    //connect to the static_issues_list collection
    config._database.collection( "STATIC_ISSUES_LIST", function( err, collection ) 
    {
      //if there isn't an error connecting, run the query
      if( !err )
      {
        accessMongo.complexAggregation( collection, pipeline, ee );
      }
      //if there's an error, throw it 
      else
      {
        throw new Error( err );
      }
    } );
  },
  
  /**
   * Function to determine if the confidence rating is valid. Returns true if it is, false if it isn't. A confidence rating
   * can be any of the following values: Vulnerability, Type 1, Type 2, or Informational
   *  
   * @param {string} conf The confidence rating being tested
   * @returns {boolean}
   */
  isValidConf : function( conf )
  {
    //The value to return, defaults to false
    var retVal = false;
    
    //If the value for conf is Vulnerability, Type 1, Type 2 or Informational, change the return value to true
    if( conf == "Vulnerability" || conf == "Type 1" || conf == "Type 2" )
    {
      retVal = true;  
    }
    
    //return the result
    return retVal;
  },
  
  /**
   * Function to determine if the severity rating is valid. Returns true if it is, false if it isn't. A severity rating
   * can be any of the following values: High, Medium, Low
   *  
   * @param {string} sev The severity rating being tested
   * @returns {boolean}
   */
  isValidSev : function( sev )
  {
    //The value to return, defaults to false
    var retVal = false;
    
    //If the value for sev is High, Medium, or Low change the return value to true
    if( sev == "High" || sev == "Medium" || sev == "Low" || sev == "Informational" )
    {
      retVal = true;  
    }
    
    //return the result
    return retVal;
  },
  
  /**
   * Function to actually display the static analysis found issues to users
   * 
   * @param {Object} results The results of the query containing the information to display to users
   * @param {Object} response The response object
   * @param {Object} database The database with the STATIC_ISSUES_LIST collection
   * @param {Object} request The request object
   */
  displayStaticIssues : function( results, response, database, request )
  {
    //grab the config object
    var config = helper.getConfig();
    var ee = new event.EventEmitter();
    
    //Iterate through the results, and convert the dates to valid date strings
    for( iter in results.result )
    {
      results.result[ iter ].date = new Date( results.result[ iter ].date ).toDateString();
    }
    
    //distinct list of applications with number of unreviewed issues
    var match = { "$match" : { "review.status" : { "$exists" : false } } }; 
    var group = {
      "$group" : {
        _id : { app : "$application_name" },
        sum : { $sum : 1 }
      }
    };
    var sort = { $sort : { "_id.app" : 1 } };
    var pipeline = [ match, group, sort ];
    
    config._database.collection( "STATIC_ISSUES_LIST", function( err, collection )
    {
      ee.once( "results from complex group query found", function( apps )
      {
        var newSum = 0;
        
        for( iter in apps )
        {
          newSum += apps[ iter ].sum;
        }
        
        apps.unshift( { _id : { app : "All" }, sum : newSum } );
        //render the results to the user
        response.render( 'static-issues.jade', { 
                                                 scanners : results, 
                                                 projectList : apps, 
                                                 _csrf : csrfUtil.addTokenToForm( request, response ) 
                                               } );
    
      } );
      accessMongo.complexAggregation( collection, pipeline, ee );
    } );
  },
  
  /**
   * Function that reads in an application, and returns a set of projects within that application. Used from Ajax request from static 
   * analysis page primarily. 
   * 
   * @param {Object} request The request object
   * @param {Object} resposne The response object   
   * 
   * @throws An error if the connection to the database fails
   * */
  displayProjectsForApplication : function( request, response )
  {
    //create an event emitter
    var ee = new event.EventEmitter();
    //grab the config object
    var config = helper.getConfig();
    //get the security log
    var security = helper.getLoggers().security;
    
    //grab the application from the request object
    var app = request.query.app;
    //matcher for the application if we aren't looking at all applications
    var match = null;
    
    ee.once( "results from complex group query found", function( results ) 
    {
      //create an array to store the results in an easier to use format
      var projects = "All";
      
      //append each project in the result set into the array to send back
      for( iter in results )
      {
        projects = projects + "," + results[ iter ]._id.project;
      }
      
      //set the content type of the response to plain text
      response.writeHead( 200, {"Content-Type": "text/plain"} );
      //send the list of projects
      response.end( projects );
    } );
    
    //If the app is set to null, return no projects
    if( app == null )
    {
      response.end( null );
    }
    //if app is not null, proceed
    else
    {
      //Validate that the application and project are valid strings
      if( !xssUtil.isValidLongString( app ) )
      {
        //if it isn't valid, end with null and do not proceed, log a security event
        security.log( "warn", "Application Name set to invalid value", { app : app, user : request.session.username } );
        response.end( null );
      }
      //if app is a valid string
      else 
      {
        //if app is not set to All, create a matcher to find the application name
        if( app != "All" )
        {
          match = { $match : { application_name : app } };
        }
        
        
        //get the list of unique projects via group statement
        var group = { $group : { _id : { project : "$project_name" } } };
        //set up a pipeline variable
        var pipeline;
        
        //if we are matching on the application, add the match to the pipeline
        if( match )
        {
          pipeline = [ match, group ];
        }
        //otherwise, do not
        else
        {
          pipeline = [ group ];
        }
        
        //Enter the STATIC_ISSUES_LIST database
        config._database.collection( "STATIC_ISSUES_LIST", function( err, collection ) 
        {
          //if there isn't an error connecting, run the query
          if( !err )
          {
            accessMongo.complexAggregation( collection, pipeline, ee );
          }
          //if there's an error, throw it 
          else
          {
            response.end( null );
            throw new Error( err );
          }
        } );
      }
    }
  },
  
  /**
   * Function that allows a user to review a specific finding. Creates a query to find an item by unique identifier, then creates
   * an update statement to update only the specific finding itself. At that point, th
   * 
   * @param {Object} request The request object
   * @param {Object} response The response object
   */
  reviewStaticIssue : function( request, response )
  {
    //grab the config object
    var config = helper.getConfig();
    
    //grabbing the security logger
    var security = helper.getLoggers().security;
    var info = helper.getLoggers().info;
    
    //grab each body parameter
    var id = request.body._id;
    var issueType = request.body.issue_type;
    var description = request.body.description;
    var type = request.body.reviewStatus;
    var app = request.body.app;
    var sev = request.body.sev;
    var conf = request.body.conf;
    var project = request.body.project;
    
    info.log( "info", "Submission to review static analysis issue received", { id : id, issueType : issueType, description : description } );
    //if any parameters are missing or empty, throw an error, redirect the user back to /, and log the information to the security log
    if( !( id && issueType && description ) )
    {
      response.redirect( '/?error[header]=Some required parameters missing, please repeat request&error[date]=' + new Date() );
      security.log( 'warn', 'Missing some required parameters', { params : request.body, username : request.session.username} );
      throw new Error( 'Missing some required parameters, try again.' );
    }    
    
    //create the find section of the update query
    var find = { "_id" : new mongodb.ObjectID( id ) };
    
    //grab the entry in MongoDB to be updated
    config._database.collection( "STATIC_ISSUES_LIST", function( err, collection )
    {
      if( !err )
      {
        //find the entry described by the id parameter, which should be the latest occurrence of the issue
        collection.findOne( { "_id" :  new mongodb.ObjectID( id ) }, function( err, toUpdate )
        {
          if( !err )
          {
            //create the update piece of the query
            var update = {
              "$set": {
                review : {
                }
              }
            };
            
            update.$set.review = {
              "status" : issueType,
              "user" : request.session.username,
              "date" : new Date()
            };
            
            if( issueType == "valid" )
            {
              update.$set.review.ticket_number = description;
            }
            else if( issueType == "false_positive" )
            {
              update.$set.review.false_positive_reason = description;
            }
            else
            {
              throw new Error( "Issue Type must be Valid or False positive, instead was: " + issueType );
            }
            
            //The options to pass to the update statement
            var updateOptions = {
              //do not proceed until row is updated
              safe : true,
              //do not update more than one row
              multi : false,
              //do not insert a new row if one did not already exist
              upsert : false
            };
            
            //run the update query
            collection.update( find, update, updateOptions, function( err, numModified )
            {
              //if there's no error
              if( !err )
              {
                //throw an error if more than one record was updated
                if( numModified != 1 )
                {
                  throw new Error( "More than one record modified by static analysis review: " + numModified );
                }
                //redirect the user back to the current page if the update succeeded
                else
                {
                  if( type != null && type != undefined )
                  {
                    response.redirect( "/static_issues?app=" + app + "&conf=" + conf + "&sev=" + sev + "&type=" + type + "&project=" + project  );
                  }
                  else
                  {
                    response.redirect( "/static_issues?app=" + app + "&conf=" + conf + "&sev=" + sev + "&project=" + project  );
                  }
                }
              }
              //throw an error if the update failed for any reason
              else
              {
                throw new Error( err );
              }
            } );
          } 
          //throw an error if there's a problem with retrieving results
          else
          {
            response.redirect( '/?error[header]=Error occurred, please see log for details&error[date]=' + new Date() );
            throw new Error( err );
          }
        } );
      }
      //throw an error if there's an issue with connecting to the collection
      else
      {
        response.redirect( '/?error[header]=Error occurred, please see log for details&error[date]=' + new Date() );
        throw new Error( err );
      }
    } );
  },
  
  /**
   * This function responds to an ajax request from clicking on a specific issue to bring up details about it. This request should 
   * display the Taint Trace data and the Code for this request. 
   *  
   * @param {Object} request The request object
   * @param {Object} response The response object
   * 
   * @throws An error if _id is not a valid ObjectID
   */
  getTraceAndCode : function( request, response )
  {
    //grabbing the security logger
    var security = helper.getLoggers().security;
    
    //get configuration object
    var config = helper.getConfig();
    
    //The id of the entry that we are looking for the trace and code data from
    var id = request.query._id;
    var sent = false;
    
    //If the id parameter is invalid, throw an error
    if( !xssUtil.isValidMongodbId( id ) )
    {
      response.end();
      throw new Error( "_id parameter is invalid: " + id );
    }
    
    //Open the static_issues_list collection to get the data
    config._database.collection( "STATIC_ISSUES_LIST", function( err, collection )
    {
      if( !err )
      {
        //find the entry described by the id parameter, which should be the most recent occurrence of the issue
        collection.findOne( { "_id" :  new mongodb.ObjectID( id ) }, function( err, item )
        {
          if( !err )
          {
            if( item )
            {
              //Set the content-type of the response to text/plain
              response.writeHead( 200, { "Content-Type": "text/plain" } );
              //set the data we want to send back to the ajax request
              var data = {
                taint_trace : item.taint_trace,
                code : item.code
              };
              //send the data
              response.end( JSON.stringify( data ) );
              
              sent = true;
            }
            
            if( !sent )
            {
              response.end();
            } 
          }
          //throw an error if there's a problem accessing the data in the collection
          else
          {
            response.end();
            throw new Error( err );
          }
        } );
      }
      //throw an error if there's an issue with connecting to the collection
      else
      {
        response.end();
        throw new Error( err );
      }
    } );
  },
  
  /**
   * Function handling the loading of a page containing a single issue, passed in as the id parameter
   * 
   * @param {Object} request The request object
   * @param {Object} response The response object
   */ 
  permanentLink : function( request, response )
  {    
    //get configuration object
    var config = helper.getConfig();
    
    //The id of the issue we are looking to display
    var id = request.query.id;
    
    //If the id parameter is invalid, throw an error
    if( !xssUtil.isValidMongodbId( id ) )
    {
      response.end();
      throw new Error( "_id parameter is invalid: " + id );
    }
    
    //Connect to the database
    config._database.collection( "STATIC_ISSUES_LIST", function( err, collection )
    {
      if( !err )
      {
        //find the issue for this permanent link
        collection.findOne( { "_id" :  new mongodb.ObjectID( id ) }, function( err, item )
        {
          if( !err )
          {
            //if the item exists
            if( item )
            {
              response.render( 'single-static-issue.jade', { issue : item, _csrf : csrfUtil.addTokenToForm( request, response ) } );
            }
            else
            {
              //if the item doesn't exist, redirect to the base static-issues page
              response.render( 'static-issues.jade' );
            }
          }
          //if there's an error getting this item
          else
          {
            response.redirect( '/?error[header]=Error occurred, please see log for details&error[date]=' + new Date() );
            throw new Error( err );            
          }
        } );
      }
      //if there's an error connecting to the database
      else
      {
        response.redirect( '/?error[header]=Error occurred, please see log for details&error[date]=' + new Date() );
        throw new Error( err );
      }
    } );
  }
};

exports.findStaticIssues = staticIssues.findStaticIssues;
exports.isValidConf = staticIssues.isValidConf;
exports.isValidSev = staticIssues.isValidSev;
exports.displayStaticIssues = staticIssues.displayStaticIssues;
exports.displayProjectsForApplication = staticIssues.displayProjectsForApplication;
exports.reviewStaticIssue = staticIssues.reviewStaticIssue;
exports.getTraceAndCode = staticIssues.getTraceAndCode;
exports.permanentLink = staticIssues.permanentLink;