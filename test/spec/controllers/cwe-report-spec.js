describe( "Testing the functionality of the CWE report", function() 
{
  var mongodb = require( "../../helpers/mongo-mock.js" );
  
  var accessMongo = require( "../../../models/pull-report-data.js" );
  var helper = require( '../../../models/helpers.js' );

  var cwe = require( "../../../controllers/cwe-report.js" ); 
  var issuesByDate = require( "../../../controllers/reports/issues-by-date.js" );
  var response;
  var config;
  
  beforeEach( function() 
  {
    config = {
      _logs : {
        info : {
          log : function( a, b, c ) {}
        },
        security : {
          log : function( a, b, c ) {}
        },
        exceptions : {
          log : function( a, b, c ) {}
        } 
      }
    };
    
    helper.setConfig( config );
    response = jasmine.createSpyObj( "response", [ "render" ] );
  } );
   
  /* Stub object for http request objects, simplifies testing, as I don't need to create a stub for it myself */
  describe( "Testing first report", function() 
  {
    var request =  
    {
      method : "GET",
      url : "/report",
      query : { "report" : "cwe" }
    };
    
    beforeEach( function() 
    {
      spyOn( accessMongo, "pullAggregateData" ).andCallFake( function( collection, match, group, ee, args ) {
        var results = [
          { "_id" : { "CWE" : "209", "type" : "false_positive" }, "count" : 2 },
          { "_id" : { "CWE" : "209", "type" : "valid" }, "count" : 2 }
        ];
        
        ee.emit( "results from group query found", results );
      });  
    });
    
    describe( "verifies that mongodb is called using the proper query", function()
    {  
      it( "checks the call to pullAggregateData based on the parameter in the http request passed in", function() 
      {
        var match = { $match : { "CWE" : { $gt : "0" }, "reviewed.type" : { $in : [ "valid", "false_positive" ] } } };
        var group = { $group : { "_id" : { "CWE" : "$CWE", "type" : "$reviewed.type" }, "count" : { "$sum" : 1 } } };
        var args = { "sort" : { "$sort" : { "count" : -1 } } };
        var ee = jasmine.any( Object );
        cwe.runReport( request, response, new mongodb.db().collection() );
        expect( accessMongo.pullAggregateData ).toHaveBeenCalledWith( ee, match, group, ee, args );
      });
    });
    
    /* This will be using spies, rather than actual outputs, since there aren't any return values. We will
       be spying on the render method of the response object that gets passed in. */
    describe( "Checking the outputs", function() 
    {
      it( "verifies that the function calls the renderer with the right inputs", function() 
      {
        var cweNumber = [ "CWE-209" ];
        var series = [ { categoryName : "CWE-209", valid : 2, fp : 2, total : 4 } ];
        
        cwe.runReport( request, response, new mongodb.db().collection());
        var reportData = 
        {
          categoryField : 'categoryName', 
          valueFields : [
            { id : 'valid', label : 'Valid Issues' }, { id : 'fp', label : 'False Positives' }, { id : 'total', label : 'Total Findings' } 
          ],
          data : series, 
          reportTitle : "CWE REPORT: Issues by CWE",
          yTitle : "Number of Issues",
          pixels : 150
        };
        expect( response.render ).toHaveBeenCalledWith( "bar-graph-report.jade", reportData );
      });
    });
  });
  describe( "Testing the second report", function()
  {
    describe( "Tests the report of valid issues for a given CWE", function() 
    {
      var request = 
      {
        method : "GET",
        url : "/report",
        query : { "report" : "cwe", "cwe" : "209", "type" : "valid" }
      };

      beforeEach( function() 
      {
        spyOn( accessMongo, "pullAggregateData" ).andCallFake( function( collection, match, group, ee ) {
          var results = 
          [ 
            { "_id" : { "type" : "test" }, "count" : 1 },
            { "_id" : { "type" : "Ticket already created 123456" }, "count" : 1 }
          ];
          ee.emit( "results from group query found", results );
        });  
      });
      
      it( "Tests the call to pullAggregateData", function() 
      {
        var match = { $match : { "CWE" : "209", "reviewed.type" : "valid" } }; 
        var group = { $group : { "_id" : { "type" : "$reviewed.case_number" }, count : { "$sum" : 1 } } };
        var args = { "sort" : { $sort : { "count" : -1 } } };
        var ee = jasmine.any( Object );
        cwe.runReport( request, response, new mongodb.db().collection() );
        expect( accessMongo.pullAggregateData ).toHaveBeenCalledWith( ee, match, group, ee, args );
      });
      
      it( "verifies that the function calls the renderer with the right inputs", function() 
      {
        var series = 
        [ 
          { categoryName : "test", type : 1 }, 
          { categoryName : "Ticket already created 123456", type : 1 }  
        ];
        
        cwe.runReport( request, response, new mongodb.db().collection() );
        var reportData = 
        {
          categoryField : "categoryName", 
          valueFields : [ { id : "type", label : "Case Numbers" } ], 
          data : series,
          reportTitle : "CWE REPORT: Case Numbers for CWE-209",
          yTitle : "Number of Issues",
          pixels : 200
        };
        expect( response.render ).toHaveBeenCalledWith( "bar-graph-report.jade", reportData );
      });
    });
    
    describe( "Tests the report of false positive issues for a given CWE", function() 
    {
      var request = 
      {
        method : "GET",
        url : "/report",
        query : { "report" : "cwe", "cwe" : "209", "type" : "false_positive" }
      };
      
      beforeEach( function() 
      {
        spyOn( accessMongo, "pullAggregateData" ).andCallFake( function( collection, match, group, ee ) {
          var results = 
          [ 
            { _id : { "type" : "False Positive, No error messages found" }, "count" : 2 }
          ];
          ee.emit( "results from group query found", results );
        });  
      });
      
      it( "Tests the call to pullAggregateData", function() 
      {
        var match = { $match : { "CWE" : "209", "reviewed.type" : "false_positive" } }; 
        var group = { $group : { "_id" : { "type" : "$reviewed.false_positive_reason" }, count : { "$sum" : 1 } } };
        var args = { "sort" : { $sort : { "count" : -1 } } };
        var ee = jasmine.any( Object );
        cwe.runReport( request, response, new mongodb.db().collection() );
        expect( accessMongo.pullAggregateData ).toHaveBeenCalledWith( ee, match, group, ee, args );
      });
      
      it( "verifies that the function calls the renderer with the right inputs", function() 
      {
        var series = 
        [ 
          { categoryName : "False Positive, No error messages found", type : 2 }
        ];
        
        cwe.runReport( request, response, new mongodb.db().collection());
        var reportData = 
        {
          categoryField : 'categoryName', 
          valueFields : [ { id : 'type', label : "False Positive Reasons" } ],
          data : series, 
          reportTitle : "CWE REPORT: False Positive Reasons for CWE-209",
          yTitle : "Number of Issues",
          pixels : 150
        };
        expect( response.render ).toHaveBeenCalledWith( "bar-graph-report.jade", reportData );
      });
    });
    
    describe( "Testing the error conditions", function() 
    {
      it( "throws an error if a parameter is invalid", function() 
      {
        var req = 
        {
          session : {
            username : 'user'
          },
          method : "GET",
          url : "/report",
          query : { "report" : "cwe", "cwe" : "209", "type" : "valid" }
        };
        
        spyOn( config._logs.security, 'log' );
               
        req.query.cwe = "209abc";
        expect( function() { cwe.runReport( req, response, new mongodb.db().collection() ); } ).toThrow();
        
        req.query.cwe = "209";
        req.query.type = "invalid";
        expect( function() { cwe.runReport( req, response, new mongodb.db().collection() ); } ).toThrow();
        expect( config._logs.security.log.calls.length ).toEqual( 2 );
      });
    });
  });
  describe( "Testing the routeReport function", function()
  {
    var xssUtil = require( '../../../models/security/xss-util.js' );
    var vulnType = require( '../../../controllers/reports/static-analysis/vulnerability-type-report.js' );
    
    var response;
    var request = {
      query : {
        report : 'cwe'
      },
      session : {
        username : 'dummy' 
      }
    };
    
    beforeEach( function()
    {
      config = {
        _database : new mongodb.db(),
        _logs : {
          info : {
            log : function() {}
          },
          security : {
            log : jasmine.createSpy( 'log' )
          },
          exceptions : {
            log : function() {}
          } 
        }
      };
      
      spyOn( issuesByDate, 'getIssuesByDate' );
      spyOn( issuesByDate, "issuesByDateDrilldownCall" );
      spyOn( vulnType, 'vulnerabilityTypeReport' );
      
      response = jasmine.createSpyObj( 'response', [ 'write', 'end', 'redirect', 'render' ] );
      helper.setConfig( config );
    } );
    
    it( "correctly routes a cwe report to the runReport function", function()
    {
      spyOn( xssUtil, 'isValidString' ).andReturn( true );
      spyOn( cwe, 'runReport' );
      
      cwe.routeReport( request, response );
      
      expect( response.write ).not.toHaveBeenCalled();
      expect( response.end ).not.toHaveBeenCalled();
      expect( response.redirect ).not.toHaveBeenCalled();
      expect( cwe.runReport ).toHaveBeenCalled();
      expect( config._logs.security.log ).not.toHaveBeenCalled();
      expect( response.render ).not.toHaveBeenCalled();
      expect( issuesByDate.issuesByDateDrilldownCall ).not.toHaveBeenCalled();
    } );
    
    it( "redirects if the report is not a valid string", function() 
    {
      helper.setConfig( config );
      spyOn( xssUtil, 'isValidString' ).andReturn( false );
      spyOn( cwe, 'runReport' );
      
      cwe.routeReport( request, response );
      
      expect( response.write ).not.toHaveBeenCalled();
      expect( response.end ).not.toHaveBeenCalled();
      expect( response.redirect ).toHaveBeenCalled();
      expect( cwe.runReport ).not.toHaveBeenCalled();
      expect( response.render ).not.toHaveBeenCalled();
      expect( config._logs.security.log ).toHaveBeenCalled();
      expect( issuesByDate.issuesByDateDrilldownCall ).not.toHaveBeenCalled();
    } );
    
    it( "sends the user to the static analysis vulnerability-type report when requested", function()
    {
      spyOn( xssUtil, 'isValidString' ).andReturn( true );
      
      request.query.report="vulnType";
     
      cwe.routeReport( request, response );
      
      expect( response.write ).not.toHaveBeenCalled();
      expect( response.end ).not.toHaveBeenCalled();
      expect( response.redirect ).not.toHaveBeenCalled();
      expect( vulnType.vulnerabilityTypeReport ).toHaveBeenCalled();
      expect( config._logs.security.log ).not.toHaveBeenCalled();
      expect( response.render ).not.toHaveBeenCalled();
      expect( issuesByDate.issuesByDateDrilldownCall ).not.toHaveBeenCalled();
    } );
    
    it( "sends the user to the issues by date report when requested", function()
    {
      spyOn( xssUtil, "isValidString" ).andReturn( true );
      
      request.query.report = "issuesByDate";
      
      cwe.routeReport( request, response );
      
      expect( response.write ).not.toHaveBeenCalled();
      expect( response.end ).not.toHaveBeenCalled();
      expect( response.redirect ).not.toHaveBeenCalled();
      expect( vulnType.vulnerabilityTypeReport ).not.toHaveBeenCalled();
      expect( config._logs.security.log ).not.toHaveBeenCalled();
      expect( response.render ).not.toHaveBeenCalled();
      expect( issuesByDate.getIssuesByDate ).toHaveBeenCalled();
      expect( issuesByDate.issuesByDateDrilldownCall ).not.toHaveBeenCalled();
    } );
    
    it( "sends the user to the issues on date report when requested", function()
    {
      spyOn( xssUtil, "isValidString" ).andReturn( true );
      
      request.query.report = "issuesOnDate";
      
      cwe.routeReport( request, response );
      
      expect( response.write ).not.toHaveBeenCalled();
      expect( response.end ).not.toHaveBeenCalled();
      expect( response.redirect ).not.toHaveBeenCalled();
      expect( vulnType.vulnerabilityTypeReport ).not.toHaveBeenCalled();
      expect( config._logs.security.log ).not.toHaveBeenCalled();
      expect( response.render ).not.toHaveBeenCalled();
      expect( issuesByDate.getIssuesByDate ).not.toHaveBeenCalled();
      expect( issuesByDate.issuesByDateDrilldownCall ).toHaveBeenCalled();
    } );
    it( "sends the user to the list of available reports if report is missing or doesn't exist", function()
    {
      helper.setConfig( config );
      spyOn( xssUtil, 'isValidString' ).andReturn( true );
      spyOn( cwe, 'runReport' );
      
      request.query.report = null;
      cwe.routeReport( request, response );
      
      expect( response.write ).not.toHaveBeenCalled();
      expect( response.end ).not.toHaveBeenCalled();
      expect( response.redirect ).not.toHaveBeenCalled();
      expect( cwe.runReport ).not.toHaveBeenCalled();
      expect( config._logs.security.log ).not.toHaveBeenCalled();
      expect( response.render ).toHaveBeenCalled();
      expect( issuesByDate.issuesByDateDrilldownCall ).not.toHaveBeenCalled();
      
      request.query.report = "invalid";
      cwe.routeReport( request, response );
      
      expect( response.write ).not.toHaveBeenCalled();
      expect( response.end ).not.toHaveBeenCalled();
      expect( response.redirect ).not.toHaveBeenCalled();
      expect( cwe.runReport ).not.toHaveBeenCalled();
      expect( config._logs.security.log ).not.toHaveBeenCalled();
      expect( response.render ).toHaveBeenCalled();
      expect( issuesByDate.issuesByDateDrilldownCall ).not.toHaveBeenCalled();
    } );
  } );
} );