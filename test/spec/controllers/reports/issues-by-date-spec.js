describe( "Testing the issues-by-date functions", function()
{
  var accessMongo = require( "../../../../models/pull-report-data.js" );
  var issuesByDate = require( "../../../../controllers/reports/issues-by-date.js" );
  var event = require( "events" );
  
  var ee = new event.EventEmitter();
  
  describe( "Testing the getDynamicIssuesByDate function", function()
  {
    var db;
    
    beforeEach( function()
    {
      spyOn( accessMongo, "mapReduce" );
      db = {
        collection : function() {}
      };
    } );
    
    it( "Calls mapReduce with map and reduce functions", function()
    {
      expect( function() { issuesByDate.getDynamicIssuesByDate( ee, db ); } ).not.toThrow();
      expect( accessMongo.mapReduce ).toHaveBeenCalledWith( db, "ISSUES_LIST", ee, jasmine.any( Function ),jasmine.any( Function ) );
    } );
    
    it( "Emits an error and does not call mapReduce if db is not the mongodb database object", function( done )
    {
      ee.once( "mapReduce complete", function( err, results, table ) {
        expect( err ).toEqual( "Database object incorrect" );
        expect( results ).toEqual( null );
        expect( table ).toEqual( null );
        done();
      } );
      
      expect( function() { issuesByDate.getDynamicIssuesByDate( ee, {} ); } ).not.toThrow();
    } );
  } );
  
  describe( "Testing the getStaticIssuesByDate function", function()
  {
    beforeEach( function()
    {
      spyOn( accessMongo, "mapReduce" );
      db = {
        collection : function() {}
      };
    } );
    
    it( "Calls mapReduce with a map, reduce, and finalize function", function()
    {
      expect( function() { issuesByDate.getStaticIssuesByDate( ee, db ); } ).not.toThrow();
      expect( accessMongo.mapReduce ).toHaveBeenCalledWith( db, "STATIC_ISSUES_LIST", ee, jasmine.any( Function ),jasmine.any( Function ) );
    } );
    
    it( "Emits an error and does not call mapReduce if db is not the mongodb database object", function( done )
    {
      ee.once( "mapReduce complete", function( err, results, table ) {
        expect( err ).toEqual( "Database object incorrect" );
        expect( results ).toEqual( null );
        expect( table ).toEqual( null );
        done();
      } );
      
      expect( function() { issuesByDate.getStaticIssuesByDate( ee, {} ); } ).not.toThrow();
    } );
  } );
  
  describe( "Testing the getIssuesByDate function", function() 
  {
    var request, response;
    
    beforeEach( function()
    {
      var item1 = {
        _id : "2014-1-14", 
        value : {
          newResults : 1,
          reviewed : [ 
            {
              date : "2014-1-15", 
              num : 1 
            } 
          ]
        }
      };
      var item2 = {
        _id : "2014-1-13", 
        value : {
          newResults : 2,
          reviewed : [ 
            {
              date : "2014-1-14", 
              num : 1 
            } 
          ]
        }
      };
      var item3 = {
        _id : "2012-1-13", 
        value : {
          newResults : 1,
          reviewed : [ 
            {
              date : "2012-1-14", 
              num : 1 
            } 
          ]
        }
      };
      var item4 = {
        _id : "2014-1-14", 
        value : {
          newResults : 2,
          reviewed : [ 
            {
              date : "2014-1-14", 
              num : 1 
            } 
          ]
        }
      };
      var item5 = {
        _id : "2014-1-12",
        value : {
          newResults : 1,
          reviewed : [
          {
            date : "2014-1-16",
            num : 1
          } ]
        }
      };
      spyOn( issuesByDate, "getDynamicIssuesByDate" ).andCallFake( function( ee, db )
      {
        ee.emit( "mapReduce complete", null, [ item1, item3, item4 ], "ISSUES_LIST" );
      } );
      
      spyOn( issuesByDate, "getStaticIssuesByDate" ).andCallFake( function( ee, db )
      {
        ee.emit( "mapReduce complete", null, [ item1, item2, item3, item5 ], "STATIC_ISSUES_LIST" );
      } );
      
      request = {
        method : "GET",
        url : "/report",
        query : {
          minDate : new Date().setFullYear( 2013 ),
          maxDate : new Date().getTime()
        },
        session : {
          username : 'test'
        }
      };
      
      response = {
        redirect : jasmine.createSpy( "redirect" ),
        render : jasmine.createSpy( "render" )
      };
    } );
    
    it( "will not complete if dynamic threw an error", function()
    {
      issuesByDate.getDynamicIssuesByDate.andCallFake( function( ee, db ) {
        ee.emit(  "mapReduce complete", "error" );
      } );
      
      expect( function() { issuesByDate.getIssuesByDate( request, response ); } ).toThrow(); 
      expect( response.redirect ).toHaveBeenCalled();
      expect( response.render ).not.toHaveBeenCalled();
    } );
    
    it( "will not complete if static threw an error", function()
    {
      issuesByDate.getStaticIssuesByDate.andCallFake( function( ee, db ) {
        ee.emit(  "mapReduce complete", "error" );
      } );
      
      expect( function() { issuesByDate.getIssuesByDate( request, response ); } ).toThrow();
      expect( response.redirect ).toHaveBeenCalled();
      expect( response.render ).not.toHaveBeenCalled();
    } );
    
    it( "will throw an error if the wrong table is accessed", function()
    {
      issuesByDate.getStaticIssuesByDate.andCallFake( function( ee, db ) {
        ee.emit(  "mapReduce complete", null, {}, "wrong" );
      } );
      
      expect( function() { issuesByDate.getIssuesByDate( request, response ); } ).toThrow();
      expect( response.redirect ).toHaveBeenCalled();
      expect( response.render ).not.toHaveBeenCalled();
    } );
    
    it( "will render the data to the user if everything is successful", function()
    {
      var results = {
        categoryField : "categoryName",
        valueFields : [
          { id : "unreviewedStatic", label : "New Static Issues" },
          { id : "unreviewedDynamic", label : "New Dynamic Issues" },
          { id : "reviewedStatic", label : "Reviewed Static Issues" },
          { id : "reviewedDynamic", label : "Reviewed Dynamic Issues" }
        ],
        data : [ 
          {
            categoryName : new Date( "January 12, 2014" ),
            unreviewedDynamic : 0,
            unreviewedStatic : 1,
            reviewedDynamic : 0,
            reviewedStatic : 0  
          },
          {
            categoryName : new Date( "January 13, 2014" ),
            unreviewedDynamic : 0,
            unreviewedStatic : 2,
            reviewedDynamic : 0,
            reviewedStatic : 0  
          },
          {
            categoryName : new Date( "January 14, 2014" ),
            unreviewedDynamic : 3,
            unreviewedStatic : 1,
            reviewedDynamic : 1,
            reviewedStatic : 1  
          },
          {
            categoryName : new Date( "January 15, 2014" ),
            unreviewedDynamic : 0,
            unreviewedStatic : 0,
            reviewedDynamic : 1,
            reviewedStatic : 1 
          },
          {
            categoryName : new Date( "January 16, 2014" ),
            unreviewedDynamic : 0,
            unreviewedStatic : 0,
            reviewedDynamic : 0,
            reviewedStatic : 1  
          }
        ],
        reportTitle : "Trend Data: Issues By Date",
        yTitle : "Number of Findings",
        pixels : 350
      };
        
      issuesByDate.getIssuesByDate( request, response );  
           
      expect( function() { issuesByDate.getIssuesByDate( request, response ); } ).not.toThrow();           
      expect( response.render ).toHaveBeenCalledWith( "line-graph-with-selectors.jade", results );
    } );
    
    it( "can render even if minDate and maxDate are not filled out", function()
    {
      request.query = {};
      
      var results = {
        categoryField : "categoryName",
        valueFields : [
          { id : "unreviewedStatic", label : "New Static Issues" },
          { id : "unreviewedDynamic", label : "New Dynamic Issues" },
          { id : "reviewedStatic", label : "Reviewed Static Issues" },
          { id : "reviewedDynamic", label : "Reviewed Dynamic Issues" }
        ],
        data : [ 
          {
            categoryName : new Date( "January 12, 2014" ),
            unreviewedDynamic : 0,
            unreviewedStatic : 1,
            reviewedDynamic : 0,
            reviewedStatic : 0  
          },
          {
            categoryName : new Date( "January 13, 2014" ),
            unreviewedDynamic : 0,
            unreviewedStatic : 2,
            reviewedDynamic : 0,
            reviewedStatic : 0  
          },
          {
            categoryName : new Date( "January 14, 2014" ),
            unreviewedDynamic : 3,
            unreviewedStatic : 1,
            reviewedDynamic : 1,
            reviewedStatic : 1  
          },
          {
            categoryName : new Date( "January 15, 2014" ),
            unreviewedDynamic : 0,
            unreviewedStatic : 0,
            reviewedDynamic : 1,
            reviewedStatic : 1 
          },
          {
            categoryName : new Date( "January 16, 2014" ),
            unreviewedDynamic : 0,
            unreviewedStatic : 0,
            reviewedDynamic : 0,
            reviewedStatic : 1  
          }
        ],
        reportTitle : "Trend Data: Issues By Date",
        yTitle : "Number of Findings",
        pixels : 350
      };
      
      expect( function() { issuesByDate.getIssuesByDate( request, response ); } ).not.toThrow();           
      expect( response.render ).toHaveBeenCalledWith( "line-graph-with-selectors.jade", results );
    } );
  } );
  
  describe( "Testing the array sorting callback function sortByDate", function()
  {
    it( "returns 1 (val2 in front) if val1 < val2", function()
    {
      var val1 = { categoryName : new Date( 2014, 0, 10 ) };
      var val2 = { categoryName : new Date() };
      
      var ret = issuesByDate.sortByDate( val1, val2 ); 
      
      expect( ret ).toEqual( -1 );
    } );
    
    it( "returns -1 (val1 in front) if val1 > val2", function()
    {
      var val2 = { categoryName : new Date( 2014, 0, 10 ) };
      var val1 = { categoryName : new Date() };
      
      var ret = issuesByDate.sortByDate( val1, val2 ); 
      
      expect( ret ).toEqual( 1 );
    } );
  } );
  
  describe( "Testing the getIssuesOnDate function", function()
  {
    var callback, response;
    beforeEach( function()
    {
      spyOn( accessMongo, "find" ).andCallFake( function( query, db, table, ee, count, optional )
      {
        ee.emit( "Count Results", 10, optional );
      } );
      
      callback = jasmine.createSpy( "callback" );
      
      response = {
        redirect : jasmine.createSpy( "redirect" ),
        render : jasmine.createSpy( "render" )
      };
    } );
    
    it( "returns an error if any of the find queries return an error", function()
    {
      accessMongo.find.andCallFake( function( query, db, table, ee, count, optional )
      {
        ee.emit( "Error", "err" );
      } );
      
      issuesByDate.getIssuesOnDate( new Date(), response, callback );
      
      expect( function() { issuesByDate.getIssuesOnDate( new Date(), response, callback ); } ).not.toThrow();
      expect( callback ).toHaveBeenCalledWith( "err", null, jasmine.any( Object ) );
    } );
    
    it( "returns an error if the table is wrong", function()
    {
      accessMongo.find.andCallFake( function( query, db, table, ee, count, optional )
      {
        ee.emit( "Count Results", 10, "wrong" );
      } );
      
      expect( function() { issuesByDate.getIssuesOnDate( new Date(), response, callback ); } ).not.toThrow();
      expect( callback ).toHaveBeenCalledWith( "Error: Wrong type of results returned", null, jasmine.any( Object ) );
    } );
    
    it( "Succeeds otherwise", function()
    {
      results = {
        type : "On Date",
        date : new Date(),
        data : {
          newDynamic : 10,
          newStatic : 10,
          revDynamic : 10,
          revStatic : 10
        }
      };
      
      expect( function() { issuesByDate.getIssuesOnDate( new Date(), response, callback ); } ).not.toThrow();
      expect( callback ).toHaveBeenCalledWith( null, results, jasmine.any( Object ) );
    } );
  } );
  
  describe( "Testing the issuesByDateDrilldownCall function", function()
  {
    var request, response;
    
    beforeEach( function()
    {
      request = {
        query : {
          date : new Date().getDate(),
          report : "issuesOnDate"
        }
      };
      
      response = {
        redirect : jasmine.createSpy( "redirect" )
      };
      
      spyOn( issuesByDate, "getIssuesOnDate" );
    } );
    
    it( "Throws an error if the date parameter is not a valid date string", function()
    {
      request.query.date = "not a date";
      
      expect( function() { issuesByDate.issuesByDateDrilldownCall( request, response ); } ).toThrow();
      expect( response.redirect ).toHaveBeenCalled();
      expect( issuesByDate.getIssuesOnDate ).not.toHaveBeenCalled();
    } );
    
    it( "Throws an error if the report type is invalid", function()
    {
      request.query.report = "invalid";
            
      expect( function() { issuesByDate.issuesByDateDrilldownCall( request, response ); } ).toThrow();
      expect( response.redirect ).toHaveBeenCalled();
      expect( issuesByDate.getIssuesOnDate ).not.toHaveBeenCalled();
    } );
    
    it( "calls getIssuesOnDate in all other cases", function()
    {
      expect( function() { issuesByDate.issuesByDateDrilldownCall( request, response ); } ).not.toThrow();
      expect( response.redirect ).not.toHaveBeenCalled();
      expect( issuesByDate.getIssuesOnDate ).toHaveBeenCalledWith( new Date( request.query.date ), response, jasmine.any( Function ) );
    } );
  } );
  
  describe( "Testing the displayIssueByDateDrilldown function", function()
  {
    var response;
    
    beforeEach( function()
    {      
      response = {
        redirect : jasmine.createSpy( "redirect" ),
        render : jasmine.createSpy( "render" )
      };
    } );
    
    it( "throws an error if the error parameter is not null", function()
    {
      expect( function() { issuesByDate.displayIssuesByDateDrilldown( "not null", null, response ); } ).toThrow();
      expect( response.render ).not.toHaveBeenCalled();
      expect( response.redirect ).toHaveBeenCalled();
    } );
    
    it( "Renders the report otherwise", function()
    {
      var results = {
        type : "On Date",
        date : new Date(),
        data : { "test" : "valid" }
      };
      
      var reportData = {
        data : JSON.stringify( [ { title : "test", value : "valid" } ] ),
        title : "Issues On Date: " + results.date.getFullYear() + "-" + ( results.date.getMonth() + 1 ) + "-" + results.date.getDate(),
        valueField : "value",
        titleField : "title",
      };
      
      expect( function() { issuesByDate.displayIssuesByDateDrilldown( null, results, response ); } ).not.toThrow();
      expect( response.render ).toHaveBeenCalledWith( "pie-chart-report.jade", reportData );
      expect( response.redirect ).not.toHaveBeenCalled();
    } );
  } );
} );
