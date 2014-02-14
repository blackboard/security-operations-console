var accessMongo = require( '../../models/pull-report-data.js' );

var helper = require( '../../models/helpers.js' );
var xss = require( '../../models/security/xss-util.js' );
var HashMap = require( '../../node_modules/hashmap' ).HashMap;
var event = require( 'events' );

/**
 * @class Set of functions around creating a report that shows the following information:
 *   * The number of new issues created each day (dynamic and static)
 *   * The number of issues reviewed each day (dynamic and static)
 * 
 * @author Matthew Saltzman
 * @date 1-7-2014
 */
var issuesByDate = {
  /**
   * Function that will obtain the number of new and reviewed issues for static and dynamic analysis and render this information,
   * in the form of a report, to the user. 
   * 
   * @param {Object} request The request object
   * @param {Object} response The response object
   * @throws An error if either the dynamic or static analysis requests for data throw an error
   * @throws An error if the wrong table is accessed by either static or dynamic analysis
   */
  getIssuesByDate : function( request, response )
  {
    //grab the database object from config
    var db = helper.getConfig()._database;
    var ee = new event.EventEmitter();
    
    var minDate, maxDate;
    
    if( request.query.minDate )
    {
      minDate = new Date( parseInt( request.query.minDate ) );      
    }
    else
    {
      minDate = new Date( 2013, 0, 1 );
    }
    
    if( request.query.maxDate )
    {
      var maxDate = new Date( parseInt( request.query.maxDate ) );
    }
    else
    {
      var maxDate = new Date();
    }
    
    //storage for dynamic and static results
    var staticResults;
    var dynamicResults;
    //need both dynamic and static issues mapReduce functions to return
    var counter = 0;
    
    ee.on( "mapReduce complete", function( err, results, table )
    {      
      if( !err )
      {
        //increment the counter for each one
        counter += 1;
        
        if( table == "ISSUES_LIST" )
        {
          dynamicResults = results;
        }
        else if( table == "STATIC_ISSUES_LIST" )
        {
          staticResults = results;
        }
        else
        {
          response.redirect( "/?error[header]=Error occurred accessing data, see log for details&error[date]=" + new Date() );
          throw new Error( "Wrong table accessed: " + table );
        }
        
        if( counter == 2 )
        {
          //create the various label data for the report
          var title = "Trend Data: Issues By Date";
          var ytitle = "Number of Findings";
          var categoryField = "categoryName";
          var valueFields = [
            { id : "unreviewedStatic", label : "New Static Issues" },
            { id : "unreviewedDynamic", label : "New Dynamic Issues" },
            { id : "reviewedStatic", label : "Reviewed Static Issues" },
            { id : "reviewedDynamic", label : "Reviewed Dynamic Issues" }
          ];
          
          //instantiate the data object
          var data = [];         
          //instantiate a hashmap for data, for algorithm optimization
          var dataMap = new HashMap();
                    
          //loop to append all dynamic results to the data object
          for( iter in dynamicResults )
          {
            var category = new Date( dynamicResults[ iter ]._id.split( "-" ) );
            //ignore all dates that don't fall into the expected date range
            if( category > minDate && category < maxDate )
            {
              var dataObject = dataMap.get( category );
              
              if( dataObject )
              {
                dataObject.unreviewedDynamic += dynamicResults[ iter ].value.newResults;
              }
              
              else
              {
                //create new object to push into data object, instantiate static issues to 0
                var newData = {
                  categoryName : category,
                  unreviewedDynamic : dynamicResults[ iter ].value.newResults,
                  unreviewedStatic : 0,
                  reviewedDynamic : 0,
                  reviewedStatic : 0
                };
                
                dataMap.set( category, newData );                
              }
              
              for( revIter in dynamicResults[ iter ].value.reviewed )
              {
                var rev = dynamicResults[ iter ].value.reviewed[ revIter ];
                var revDate = new Date( rev.date.split( "-" ) );
                var dataObject = dataMap.get( revDate );
                
                if( dataObject )
                {
                  dataObject.reviewedDynamic += rev.num;
                  dataMap.set( revDate, dataObject );
                }
                else
                {
                  var newData = {
                    categoryName : revDate,
                    unreviewedDynamic : 0,
                    unreviewedStatic : 0,
                    reviewedDynamic : rev.num,
                    reviewedStatic : 0
                  };
                  
                  dataMap.set( revDate, newData );
                } 
              }
            }
          }
          
          //loop for the static issues 
          for( iter in staticResults )
          {
            var category = new Date( staticResults[ iter ]._id.split( "-" ) );
            if( category > minDate && category < maxDate )
            {
              var dataObject = dataMap.get( category );
                
              if( dataObject )
              {
                dataObject.unreviewedStatic += staticResults[ iter ].value.newResults;
              }
              
              else
              {
                //create new object to push into data object, instantiate static issues to 0
                var newData = {
                  categoryName : category,
                  unreviewedDynamic : 0,
                  unreviewedStatic : staticResults[ iter ].value.newResults,
                  reviewedDynamic : 0,
                  reviewedStatic : 0
                };
                
                dataMap.set( category, newData );                
              }
              
              for( revIter in staticResults[ iter ].value.reviewed )
              {
                var rev = staticResults[ iter ].value.reviewed[ revIter ];
                var revDate = new Date( rev.date.split( "-" ) );
                var dataObject = dataMap.get( revDate );
                
                if( dataObject )
                {
                  dataObject.reviewedStatic += rev.num;
                  dataMap.set( revDate, dataObject );
                }
                else
                {
                  var newData = {
                    categoryName : revDate,
                    unreviewedDynamic : 0,
                    unreviewedStatic : 0,
                    reviewedDynamic : 0,
                    reviewedStatic : rev.num
                  };
                  
                  dataMap.set( revDate, newData );
                }
              }
            }
          }
          
          dataMap.forEach( function( value, key )
          {
            data.push( value );
          } );
                  
          data.sort( exports.sortByDate );
                    
          //create the report data object
          var reportData = {
            categoryField : categoryField,
            valueFields : valueFields,
            data : data,
            reportTitle : title,
            yTitle : ytitle,
            pixels : 100 + ( 50 * data.length )
          };
                    
          //render the report to the user
          response.render( "line-graph-with-selectors.jade", reportData ); 
        }
      }
      else
      {
        response.redirect( '/?error[header]=Error occurred, see log for details&error[date]=' + new Date() );
        throw new Error( err );
      }
    } );
    
    this.getDynamicIssuesByDate( ee, db );
    this.getStaticIssuesByDate( ee, db );
  },
  /**
   * Function to create a mapReduce algorithm for generating each days' new and reviewed dynamic issues. It creates a map function, 
   * a reduce function, and finally, a finalize function which will then be passed to a mapReduce function call.
   * 
   * @param {Object} ee The event emitter
   * @param {Object} db The database containing the dynamic issues collection
   */
  getDynamicIssuesByDate : function( ee, db )
  {
    //validate the database object
    if( !db.collection )
    {
      ee.emit( "mapReduce complete", "Database object incorrect" );
    }
    
    else
    {
      //the mapping function, getting a list of dynamic issues by date
      /* istanbul ignore next: function is a mongodb query/ */ 
      var map = function() {
        var date = this._id.getTimestamp();
        var reviewed = this.reviewed;
      
        var item = { newResults : 1 };
      
        if( reviewed )
        { 
          var dateReviewed = reviewed.date_reviewed;
          item.reviewed = [{ date : dateReviewed.getFullYear() + "-" + ( dateReviewed.getMonth() + 1 ) + "-" + dateReviewed.getDate(), num : 1 }];
          print( tojson( item ) );
        }
        else 
        {
          item.reviewed = [];
        }
      
        emit( date.getFullYear() + "-" + ( date.getMonth() + 1 ) + "-" + date.getDate(), item );
      };
      
      //reduce function to increment the counters based on each issue
      /* istanbul ignore next: function is a mongodb query */
      var reduce = function( key, value ) {
        var newResults = 0;
        var revResults = [];
      
        value.forEach( function( v )
        {
          for( x in v.reviewed )
          {
            var found = false;
            for( y in revResults )
            {
              print( v.reviewed[ x ].num );
              if( revResults[ y ].date == v.reviewed[ x ].date )
              {
                revResults[ y ].num += v.reviewed[ x ].num;
                found = true;
                break;
              }
            }
            if( !found )
            {
              revResults.push( v.reviewed[ x ] );
            }
          }
          
          newResults += v.newResults;
        } );
      
        return { newResults : newResults, reviewed : revResults };
      };
      
      //sending without finalizer method, as single results are output in the same format as reduced results
      accessMongo.mapReduce( db, "ISSUES_LIST", ee, map, reduce );
    }
  },
  
  /**
   * Function to create a mapReduce algorithm for generating each days' new and reviewed static issues. It creates a map function, 
   * a reduce function, and finally, a finalize function which will then be passed to a mapReduce function call.
   * 
   * @param {Object} ee The event emitter
   * @param {Object} db The database containing the collections
   */
  getStaticIssuesByDate : function( ee, db ) 
  {    
    //validate the database object
    if( !db.collection )
    {
      ee.emit( "mapReduce complete", "Database object incorrect" );
    }
    else
    {
      //Map function, sets new and reviewed as objects
      /* istanbul ignore next: function is a mongodb query */ 
      var map = function() {
        var date = this._id.getTimestamp();
        var reviewed = this.review;
      
        var item = { newResults : 1 };
      
        if( reviewed )
        { 
          var dateReviewed = reviewed.date;
          item.reviewed = [{ date : dateReviewed.getFullYear() + "-" + ( dateReviewed.getMonth() + 1 ) + "-" + 
                             dateReviewed.getDate(), num : 1 }];
        }
        else 
        {
          item.reviewed = [];
        }
      
        emit( date.getFullYear() + "-" + ( date.getMonth() + 1 ) + "-" + date.getDate(), item );
      };
      
      //Reduce function to increment the counters based on each issue
      /* istanbul ignore next: function is a mongodb query */
      var reduce = function( key, value ) {
        var newResults = 0;
        var revResults = [];
      
        value.forEach( function( v )
        {
          for( x in v.reviewed )
          {
            var found = false;
            for( y in revResults )
            {
              if( revResults[ y ].date == v.reviewed[ x ].date )
              {
                revResults[ y ].num += v.reviewed[ x ].num;
                found = true;
                break;
              }
            }
            if( !found )
            {
              revResults.push( v.reviewed[ x ] );
            }
          }
          
          newResults += v.newResults;
        } );
      
        return { newResults : newResults, reviewed : revResults };
      };
      
      //finalize not needed here due to the format of map and reduce
      accessMongo.mapReduce( db, "STATIC_ISSUES_LIST", ee, map, reduce );
    }
  },
  
  /**
   * Sorting function for the array of data, to keep it organized by time. How it works is that the first element in the array 
   * and the second are passed in, and then sorted according to the results of this function. Always called by sort.
   * 
   * @param {Object} val1 The first value passed in 
   * @param {Object} val2 The second value passed in
   * 
   * @returns {Integer}
   */
  sortByDate : function( val1, val2 )
  {
    return ( val1.categoryName.getTime() > val2.categoryName.getTime() ) ? 1 : -1;
  },
  
  /** 
   * Function to route which drilldown report we're going to, based on the type of report called.
   * 
   * @param {Object} request The request object
   * @param {Object} response The response object  
   */
  issuesByDateDrilldownCall : function( request, response )
  {
    var date = new Date( request.query.date );
    var reportType = request.query.report;
             
    //Checking for an invalid date, and an empty parse call provides one
    if( date == "Invalid Date" || date == "NaN" )
    {
      response.redirect( '/?error[header]=Invalid date value entered: ' + request.query.date + '&error[date]=' + new Date() );
      throw new Error( "Invalid Date format" + request.query.date );
    }
    
    switch( reportType )
    {
      case "issuesOnDate":
        this.getIssuesOnDate( date, response, this.displayIssuesByDateDrilldown );
        break;
      default:
        response.redirect( '/' );
        throw new Error( "Invalid Report Type: " + reportType );
        break;
    }
  },
  
  /** 
   * Function used to display the results of any drilldown report for the issues by date report. The drilldown reports for this
   * report are always going to be pie charts, so we can assume, at least for now, that the pie chart syntax is appropriate
   * in all cases.
   * 
   * @param {Object} error Error object from any other point in processing this report
   * @param {Object} results The results JSON object, containing all results data and relevant data to the report being displayed
   * @param {Object} response The response object
   * 
   * @throws An error if the error parameter is not null
   */
  displayIssuesByDateDrilldown : function( error, results, response )
  {
    if( error )
    {
      response.redirect( '/?error[header]=Error occurred, see error log for details&error[date]=' + new Date() );
      throw new Error( "Error received in processing drill down report: ", + error );
    }
    
    var type = results.type;
    
    var data = [];
    var title;
    
    var valueField = "value";
    var titleField = "title";
    
    //Determine the type of drilldown report being generated
    switch( type )
    {
      case "On Date":
        title = "Issues On Date: " + results.date.getFullYear() + "-" + ( results.date.getMonth() + 1 ) 
                + "-" + results.date.getDate();
        break;
    }
    
    //Go through the array and assign it to values that can be used by amcharts. Done here in case we change charting frameworks 
    //again, so we only need to change it once.
    for( iter in results.data )
    {
      var newEntry = { title : iter, value : results.data[ iter ] };
      data.push( newEntry );
    }
    
    var reportData = {
      data : JSON.stringify( data ),
      title : title,
      valueField : valueField,
      titleField : titleField,
    };
    
    response.render( "pie-chart-report.jade", reportData );
  },
  
  /**
   * Function to get the set of issues that were created and reviewed on a specific date. 
   *  
   * @param {Date} date The day that we are looking to run this report on
   * @param {Date} dayLater One day after the day we're looking for
   * @param {Function} callback A callback function  to handle the results
   */
  getIssuesOnDate : function( date, response, callback )
  { 
    var db = helper.getConfig()._database;
    var ee = new event.EventEmitter();
    
    //get the timestamps
    var dateAfter = new Date( new Date( date.toString() ).setDate( date.getDate() + 1 ) );
    var before = helper.createObjectidTimestamp( date );
    var after = helper.createObjectidTimestamp( dateAfter );
    
    var numResults = 0;
    var results = {
      type : "On Date",
      date : new Date( date ),
      data : {}
    };
    
    ee.on( "Count Results", function( count, type )
    {
      numResults += 1;
      
      //Assigning the right result values to the correct part of the result object
      switch( type )
      {
        case "newDynamic":
          results.data.newDynamic = count;
          break;
        case "revDynamic":
          results.data.revDynamic = count;
          break;
        case "newStatic":
          results.data.newStatic = count;
          break;
        case "revStatic":
          results.data.revStatic = count;
          break;
        default:
          callback( "Error: Wrong type of results returned", null, response );
          break;
      }
      
      //return the results to the callback function
      if( numResults == 4 )
      {
        callback( null, results, response );
      }
    } );
    
    //if there's an error, send it to the callback function
    ee.once( "Error", function( err )
    {
      callback( err, null, response );
    } );
    
    //create the mongodb queries
    var newQuery = {
      _id : { $gte : before, $lt : after }
    };
    var revDynQuery = {
      "reviewed.date_reviewed" : { $gte : date, $lt : dateAfter }  
    };
    var revStaticQuery = {
      "review.date" : { $gte : date, $lt : dateAfter } 
    };
    
    //run the queries and return the results
    accessMongo.find( newQuery, db, "ISSUES_LIST", ee, true, "newDynamic" );
    accessMongo.find( newQuery, db, "STATIC_ISSUES_LIST", ee, true, "newStatic" );
    accessMongo.find( revDynQuery, db, "ISSUES_LIST", ee, true, "revDynamic" );
    accessMongo.find( revStaticQuery, db, "STATIC_ISSUES_LIST", ee, true, "revStatic" );
  }
};

exports.getIssuesByDate = issuesByDate.getIssuesByDate;
exports.getStaticIssuesByDate = issuesByDate.getStaticIssuesByDate;
exports.getDynamicIssuesByDate = issuesByDate.getDynamicIssuesByDate;
exports.sortByDate = issuesByDate.sortByDate;
exports.getIssuesOnDate = issuesByDate.getIssuesOnDate;
exports.issuesByDateDrilldownCall = issuesByDate.issuesByDateDrilldownCall;
exports.displayIssuesByDateDrilldown = issuesByDate.displayIssuesByDateDrilldown;