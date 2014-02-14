/* Contains the CWE reports, and renders them back to the user through jade templates. */

//set of includes
var accessMongo = require( '../models/pull-report-data.js' );
var xssUtil = require( '../models/security/xss-util.js' );
var helper = require( '../models/helpers.js' );
var vulnType = require( './reports/static-analysis/vulnerability-type-report.js' );
var issuesByDate = require( './reports/issues-by-date.js' );

var event = require( 'events' );

/**
 * @class Set of functions around creating and viewing a report based on CWE numbers. This class may change or even be renamed
 * when other reports are created, to make reporting functionality more generic.
 * 
 * @author Matthew Saltzman
 * @since 7-24-2013  
 */
var cweReport = {  
  /**
   * Function that runs the requested report. This function will be broken up into helper functions as new reports are created. 
   * For now however, it runs all the reports in the system.
   * 
   * 
   * @param {Object} request The request object that calls the report
   * @param {Object} response The response object that will return the report to users 
   * @param {Object} collection The mongodb collection with the data being reported on
   * 
   * @throws an error if any input from the request object is invalid
   */
  runReport : function( request, response, collection )
  {
    //grabbing the security and exceptions loggers
    var security = helper.getLoggers().security;
    var excptions = helper.getLoggers().exceptions;
    
    //creating an event emitter, which functions similarly to a callback method
    var ee = new event.EventEmitter();
    if( xssUtil.isNumber( request.query.cwe ) || request.query.cwe === null || request.query.cwe === undefined )
    {
      var cwe = request.query.cwe;
    }
    else
    {
      security.log( 'warn', 'User attempted to create a CWE report without a valid CWE number: ' + request.query.cwe,
                    { username : request.session.username } );
     
      //redirecting the user to / since the requested page is invalid
      response.redirect( '/?error[header]=Invalid CWE parameter: ' + request.query.cwe + '&error[date]=' + new Date() );
      throw new Error( 'CWE parameter must be a number' );
    }
    
    //Determining which report is being run, right now this is simplistic since there is only one report
    switch( typeof cwe )
    {    
      //if cwe is a number, this is a drilldown report
      case "string":
        var type;
        var categoeryName;
        //valid issues drilldown report
        if( request.query.type == "valid" )
        {
          type = "case_number";
          categoryName = "Case Numbers";
        }
        //false positive drilldown report
        else if( request.query.type == "false_positive" )
        {
          type = "false_positive_reason";
          categoryName = "False Positive Reasons";
        }
        else
        {
          security.log( 'warn', 'User attempted to create a CWE report with an invalid type parameter: ' + request.query.type,
                        { username : request.session.username } );
          
          //redirecting the user to / since the requested page is invalid
          response.redirect( '/?error[header]=Invalid type parameter: ' + request.query.type + '&error[date]=' + new Date() );
          throw new error( "type parameter must be valid or false_positive only" );
        }
        
        //the callback method when the results are found, displays data to users
        ee.once( "results from group query found", function( results )
        {
          //object containing the data for this report
          var data = [];
    
          //data object for displaying data to users
          var reportData = {};

          //inserts data into the series from the results
          for( rowIter in results )
          {
            var type = null;
            
            //removing newlines from the responses
            var catName = results[ rowIter ]._id.type.toString().replace(/(\r\n|\n|\r)/gm," ");
            
            //checking if the category is new or not
            for( dataIter in data )
            {
              if( data[ dataIter ].categoryName == catName )
              {
                type = dataIter;
                break;
              }
            }
            
            //if it's a new category (should be every time)
            if( !type )
            {
              var newData = {
                categoryName : results[ rowIter ]._id.type.toString().replace(/(\r\n|\n|\r)/gm," "),
                type : results[ rowIter ].count
              };
              
              data.push( newData );
            }
            
            //if not, increment the existing one
            else
            {
              data[ type ].type += results[ rowIter ].count;
            }
          }
                  
          //append data to the display object which is passed to the jade template
          reportData[ "categoryField" ] = 'categoryName';
          reportData[ "valueFields" ] = [
            { id : "type", label : categoryName }
          ];
          reportData[ "data" ] = data;
          //validating that the input is a number before using it in the code
          reportData[ "reportTitle" ] = "CWE REPORT: " + categoryName + " for CWE-" + cwe;
          reportData[ "yTitle" ] = "Number of Issues";
          reportData[ "pixels" ] = 100 + ( 50 * data.length );
                  
          //renders the report
          response.render( "bar-graph-report.jade", reportData );
        });
        
        //creates the query to gather the report data
        var match = { $match : { "CWE" : cwe, "reviewed.type" : request.query.type } };
        var group = { $group : { "_id" : { "type" : "$reviewed." + type }, count : { $sum : 1 } } };
        var args = { "sort" : { $sort : { "count" : -1 } } };
        //function that gathers the report data
        accessMongo.pullAggregateData( collection, match, group, ee, args );   
        break;
      //initial report of all cwe numbers
      case "undefined":
        //the callback method that recieves the results of the query
        ee.once( "results from group query found", function( results )
        {
          //object containing the data for this report
          var data = [];
          //data object for displaying the data to users
          var reportData = {};
          //the series containing the data
          var series = [];
          //each CWE number with a finding associated with it
          var cweNumber = [];
          
           //loop that populates all 3 series with data from the query results
          for( rowIter in results )
          {
            var catName = "CWE-" + results[ rowIter ]._id[ "CWE" ];
            var type = null;
            
            //determine if this is a new category or not
            for( dataIter in data )
            {
              if( data[ dataIter ].categoryName == catName )
              {
                type = dataIter;
                break;
              }
            }
      
            if( !type )
            {
              var newCwe = {
                categoryName : catName,
                valid : 0,
                fp : 0,
                total : 0
              };
              
              type = data.length;
              
              data.push( newCwe );
            }
            
            var status = results[ rowIter ]._id.type;
            
            switch( status )
            {
              //the valid issues set
              case "valid" :  
                data[ type ].valid += results[ rowIter ].count;
                break;
              //the false positive issues set
              case "false_positive" :
                data[ type ].fp += results[ rowIter ].count;
                break;
            }
            
            data[ type ].total += results[ rowIter ].count;
          }
          
          //build the data object to be passed to the jade template
          reportData[ "categoryField" ] = 'categoryName';
          reportData[ "valueFields" ] = [
            { id : "valid", label : "Valid Issues" },
            { id : "fp", label : "False Positives" },
            { id : "total", label : "Total Findings" }
          ];
          reportData[ "data" ] = data;
          //validating that the input is a number before using it in the code
          reportData[ "reportTitle" ] = "CWE REPORT: Issues by CWE";
          reportData[ "pixels" ] = 100 + ( 50 * data.length );
          reportData[ "yTitle" ] = "Number of Issues";
                  
          //renders the report
          response.render( "bar-graph-report.jade", reportData );
        });
        
        //build the query to fetch the data to be reported on
        var match = { $match : { "CWE" : { $gt : "0" }, "reviewed.type" : { $in : [ "valid", "false_positive" ] } } };
        var group = { $group : { "_id" : { "CWE" : "$CWE", "type" : "$reviewed.type" }, "count" : { "$sum" : 1 } } };
        var args = { "sort" : { "$sort" : { "count" : -1 } } };
        //run the query, and return the results
        accessMongo.pullAggregateData( collection, match, group, ee, args );
        
        break;
      //if the report doesn't exist, log an error
      default:
        exceptions.log( 'error', "requested report not implemented", { username : request.session.username } );
        
        //redirecting the user to / since the requested page is invalid
        response.redirect( '/?error[header]=Report not implemented&error[date]=' + new Date() );
        break;
    }
  },
  
  /**
   * Function that decides whether to run the requested report, or redirect back to / due to
   * an error somewhere in processing.
   *  
   * @param {Object} request The request object
   * @param {Object} response The response object
   */
  routeReport : function( request, response )
  {
    //grabbing the security logger
    var security = helper.getLoggers().security;
    var exceptions = helper.getLoggers().exceptions;
    
    //grabs the config object to obtain the database object
    var config = helper.getConfig();
    //determines the type of report to run
    var report = request.query.report;

    if( !xssUtil.isValidString( report ) )
    {
      //logging with both security and exceptions log since this might be a security event, or might be an application issue
      security.log( 'warn', 'Invalid Report format: ' + report, { username : request.session.username } );
      exceptions.log( 'warn', 'Invalid Report format: ' + report, { username : request.session.username } );
      
      response.redirect( '/?error[header]=Invalid report requested: ' + report + '&error[date]=' + new Date() );
    }
    else 
    {
      switch( report ) 
      {
        //If we receive a cwe report request
        case "cwe" :
          //opens the ISSUES_LIST collection for reporting
          config._database.collection( "ISSUES_LIST", function( err, collection ) 
          {
            //if there was a problem opening the database, log an error. Otherwise, run the requested CWE report
            if ( err ) 
            {
              response.redirect( '/?error[header]="Error occurred, see log for details&error[date]=' + new Date() );
              throw new Error( err );
            } 
            else 
            {
              //Exceptions logger catches all exceptions, thus removing the try catch block
              exports.runReport(request, response, collection);
            }
          } );
          break;
        //If we receive a static analysis vulnerability type report request
        case "vulnType" :
          config._database.collection( "STATIC_ISSUES_LIST", function( err, collection ) 
          {
            //if there was a problem opening the database, log an error. Otherwise, run the requested CWE report
            if ( err ) 
            {
              response.redirect( '/?error[header]="Error occurred, see log for details&error[date]=' + new Date() );
              throw new Error( err );
            } 
            else
            {
              //Calls the vulnerability type report
              vulnType.vulnerabilityTypeReport( request, response, collection );
            }
          } );
          break;
        //If we receive an issuesByDate report request
        case "issuesByDate" :
          issuesByDate.getIssuesByDate( request, response );
          break;
        case "issuesOnDate" :
          issuesByDate.issuesByDateDrilldownCall( request, response );
          break;
        //by default, provide a list of available reports
        default :
          response.render( "reports.jade" );
          break;
      }
    }
  }
};
//exports the report function
exports.runReport = cweReport.runReport;
exports.routeReport = cweReport.routeReport;
//exports the accessMongo include for testing purposes
exports.accessMongo = accessMongo;