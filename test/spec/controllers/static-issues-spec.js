describe( "Testing the static-issues.js file", function()
{
  var staticIssues = require( '../../../controllers/static-issues.js' );
  var helper = require( '../../../models/helpers.js' );
  var xssUtil = require( '../../../models/security/xss-util.js' );
  var accessMongo = require( '../../../models/pull-report-data.js' );
  
  var request, response, config;
  var queryResults, appNames, findResults;
  var update, numUpdated;
  
  beforeEach( function()
  {
    numUpdated = 1;
    
    update = jasmine.createSpy( "update" ).andCallFake( function( query, update, options, callback4 )
    {
      callback4( null, numUpdated );
    } );
    
    config = {
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
      },
      _database : {
        collection : function( collectionName, callback ) 
        {
          var coll = {
            distinct : function( query, callback2 )
            {
              callback2( null, appNames );
            },
            findOne : function( query, callback3 )
            {
              callback3( null, findResults );
            },
            "update" : update
          };
          
          callback( null, coll );
        }
      }
    };
    
    helper.setConfig( config );

    request = {
      query : {
        type : "new",
        conf : "Vulnerability",
        sev : "High",
        app : "b2",
        project : "proj",
        beginDate : new Date().toString(),
        endDate : new Date().toString()
      },
      session : {
        username : "test"
      }
    };
    
    response = {
      render : jasmine.createSpy( 'render' ),
      redirect : jasmine.createSpy( 'redirect' ),
      writeHead : jasmine.createSpy( 'writeHead' ),
      end : jasmine.createSpy( 'end' )
    };
    
    queryResults = { 
      result : [ {
        "_id" : {
          "vtype" : "Vulnerability.CrossSiteScripting.Reflected",
          "ln" : "6",
          "method" : "JSP 2.0 Parameter Retrieval",
          "file" : "src/main/webapp/WEB-INF/jsp/someFile.jsp",
          "code" : {
            "3" : "a",
            "7" : "b",
            "11" : "c",
            "4" : "d",
            "10" : "e",
            "9" : "f",
            "5" : "g",
            "2" : "h",
            "8" : "i",
            "6" : "j",
            "1" : "k"
          }
        },
        "date" : 'ISODate("2013-08-26T18:07:05.125Z")',
        "updateVal" : "1"
     } ] 
    };
    
    findResults = {
      "_id" : "1",
      "application_name" : "test",
      "date_scanned" : "2013-08-19T16:10:46.257Z",
      "project_name" : "proj",
      "file_path" : "src/main/java/WEB-INF/web.xml",
      "compiler_error" : null,
      "method" : "Servlet URL Mappings",
      "ctx" : null,
      "prop_ids" : "0",
      "site_id" : "1",
      "ao_id" : "0",
      "vtype" : "Vulnerability.AccessControl",
      "finding_id" : "1",
      "cn" : "1",
      "sig" : "1",
      "conf" : "Type 1",
      "ln" : "39",
      "rec_id" : "172",
      "sev" : "Informational",
      "ord" : "0",
      "caller" : null
    };
        
    var sort = function() 
    {
      return appNames;
    };
    
    appNames = [ "app1", "app2", "app3", sort ];
  } );  
  
  describe( "Testing the findStaticIssues function", function()
  {
    beforeEach( function()
    {
      spyOn( staticIssues, 'isValidConf' ).andReturn( true );
      spyOn( staticIssues, 'isValidSev' ).andReturn( true );
      spyOn( xssUtil, 'isValidLongString' ).andReturn( true );
      spyOn( accessMongo, 'complexAggregation' ).andCallFake( function( collection, pipeline, ee )
      {
        ee.emit( "results from complex group query found", queryResults );
      } );
      
      spyOn( staticIssues, 'displayStaticIssues' );
    } );
    
    it( "Calls response.render on the static-issues.jade file if everything goes well", function()
    {
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).not.toThrow();
      expect( response.redirect ).not.toHaveBeenCalled();
      expect( staticIssues.displayStaticIssues ).toHaveBeenCalledWith( queryResults, response, config._database, request );
    } );
    
    it( "Redirects and throws an error if app, conf or sev is invalid", function()
    {
      xssUtil.isValidLongString.andReturn( false );
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).toThrow();
      expect( response.redirect ).toHaveBeenCalled();
      expect( config._logs.security.log ).toHaveBeenCalled();
      xssUtil.isValidLongString.andReturn( true );
      staticIssues.isValidConf.andReturn( false );
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).toThrow();
      expect( response.redirect ).toHaveBeenCalled();
      expect( config._logs.security.log ).toHaveBeenCalled();
      staticIssues.isValidConf.andReturn( true );
      staticIssues.isValidSev.andReturn( false );
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).toThrow();
      expect( response.redirect ).toHaveBeenCalled();
      expect( config._logs.security.log ).toHaveBeenCalled();
      expect( response.redirect.callCount ).toEqual( 3 );
      expect( staticIssues.displayStaticIssues ).not.toHaveBeenCalled();
    } );
    
    it( "Redirects and throws an error if project is invalid", function()
    {
      xssUtil.isValidLongString.andCallFake( function( input )
      {
        if( input == "proj" )
        {
          return false;
        }
        
        return true;
      } );
      
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).toThrow();
      expect( staticIssues.displayStaticIssues ).not.toHaveBeenCalled();
    } );
    
    it( "Redirects and throws an error if conf or sev is null", function()
    {
      request.query.conf = null;
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).toThrow();
      request.query.conf = "Vulnerability";
      request.query.sev = null;
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).toThrow();
      expect( response.redirect.callCount ).toEqual( 2 );
      expect( staticIssues.displayStaticIssues ).not.toHaveBeenCalled();
    } );
    
    it( "Does not throw an error if the type parameter is null, or even missing", function()
    {
      request = {
        query : {
          conf : "Vulnerability",
          sev : "High",
          app : "b2",
          endDate : new Date().toString()
        },
        session : {
          username : "test"
        }
      };
      
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).not.toThrow();
      request.query.type = null;
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).not.toThrow();
      expect( staticIssues.displayStaticIssues.callCount ).toEqual( 2 );
      expect( response.redirect ).not.toHaveBeenCalled();
    } ); 
    
    it( "allows the following additional values for type: reviewed, all", function()
    {
      request.query.type = "all";
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).not.toThrow();
      request.query.type = "reviewed";
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).not.toThrow();
      expect( staticIssues.displayStaticIssues.callCount ).toEqual( 2 );
      expect( response.redirect ).not.toHaveBeenCalled();
    } );
    
    it( "logs to the security log and uses a default if type is set to an unrecognized value", function()
    {
      request.query.type = "wrong";
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).not.toThrow();
      expect( config._logs.security.log ).toHaveBeenCalled();
      expect( accessMongo.complexAggregation.calls[ 0 ].args[ 1 ][ 4 ] ).toEqual( { $match : { "reviewStatus.0" : { $exists : false } } } );
      request.query.type = 1;
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).not.toThrow();
      expect( config._logs.security.log.callCount ).toEqual( 2 );
      expect( accessMongo.complexAggregation.calls[ 1 ].args[ 1 ][ 4 ] ).toEqual( { $match : { "reviewStatus.0" : { $exists : false } } } );
      request.query.type = true;
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).not.toThrow();
      expect( config._logs.security.log.callCount ).toEqual( 3 );
      expect( accessMongo.complexAggregation.calls[ 2 ].args[ 1 ][ 4 ] ).toEqual( { $match : { "reviewStatus.0" : { $exists : false } } } );
      request.query.type = {};
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).not.toThrow();
      expect( config._logs.security.log.callCount ).toEqual( 4 );
      expect( accessMongo.complexAggregation.calls[ 2 ].args[ 1 ][ 4 ] ).toEqual( { $match : { "reviewStatus.0" : { $exists : false } } } );
      request.query.type = function() {};
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).not.toThrow();
      expect( config._logs.security.log.callCount ).toEqual( 5 );
      expect( accessMongo.complexAggregation.calls[ 2 ].args[ 1 ][ 4 ] ).toEqual( { $match : { "reviewStatus.0" : { $exists : false } } } );
    } );
    
    it( "does not filter by application if the application is listed as 'All' and project is not", function()
    {
      request.query.app = "All";
      
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).not.toThrow();
      expect( accessMongo.complexAggregation.calls[ 0 ].args[ 1 ][ 0 ] ).toEqual( { "$match" : jasmine.any( Object ) } );
      expect( accessMongo.complexAggregation.calls[ 0 ].args[ 1 ][ 1 ] ).toEqual( { "$match" : jasmine.any( Object ) } );
      expect( accessMongo.complexAggregation.calls[ 0 ].args[ 1 ][ 2 ] ).not.toEqual( { "$match" : jasmine.any( Object ) } );
    } );
    
    it( "does not filter by project if project is listed as 'All', and the application is not", function()
    {
      request.query.project = "All";
      
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).not.toThrow();
      expect( accessMongo.complexAggregation.calls[ 0 ].args[ 1 ][ 0 ] ).toEqual( { "$match" : jasmine.any( Object ) } );
      expect( accessMongo.complexAggregation.calls[ 0 ].args[ 1 ][ 1 ] ).toEqual( { "$match" : jasmine.any( Object ) } );
      expect( accessMongo.complexAggregation.calls[ 0 ].args[ 1 ][ 2 ] ).not.toEqual( { "$match" : jasmine.any( Object ) } );
    } );
    
    it( "does not filter by either if both are listed as All", function()
    {
      request.query.app = "All";
      request.query.project = "All";
      
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).not.toThrow();
      expect( accessMongo.complexAggregation.calls[ 0 ].args[ 1 ][ 0 ] ).toEqual( { "$match" : jasmine.any( Object ) } );
      expect( accessMongo.complexAggregation.calls[ 0 ].args[ 1 ][ 1 ] ).not.toEqual( { "$match" : jasmine.any( Object ) } );
      expect( accessMongo.complexAggregation.calls[ 0 ].args[ 1 ][ 2 ] ).toEqual( { "$match" : jasmine.any( Object ) } );
    } );
    
    it( "can display only results that are listed as false positives", function()
    {
      request.query.type = "false_positive";
      
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).not.toThrow();
      expect( accessMongo.complexAggregation.calls[ 0 ].args[ 1 ][ 4 ] ).toEqual( { "$match" : { "reviewStatus.0" : "false_positive" } } );
    } );
    
    it( "can display only results that are listed as valid", function()
    {
      request.query.type = "valid";
      
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).not.toThrow();
      expect( accessMongo.complexAggregation.calls[ 0 ].args[ 1 ][ 4 ] ).toEqual( { "$match" : { "reviewStatus.0" : "valid" } } );
    } );
    
    it( "can also match on the vulnerability type, if requested", function()
    {
      request.query.vtype = "vtype";
      
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).not.toThrow();
      expect( accessMongo.complexAggregation.calls[ 0 ].args[ 1 ][ 4 ] ).toEqual( { "$match" : { "reviewStatus.0" : jasmine.any( Object ), 
                                                                                                  "_id.vtype" : "vtype" } } );
    } );
    
    it( "can also match on the vulnerability method, if requested", function()
    {
      request.query.vtype = "vtype";
      request.query.method = "method";
      
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).not.toThrow();
      expect( accessMongo.complexAggregation.calls[ 0 ].args[ 1 ][ 4 ] ).toEqual( { "$match" : { "reviewStatus.0" : jasmine.any( Object ), 
                                                                                                  "_id.vtype" : "vtype",
                                                                                                  "_id.method" : "method" } } );
    } );
    
    it( "throws an error if vtype is not null, and is not a valid string", function()
    {
      xssUtil.isValidLongString.andCallFake( function( param )
      {
        if( param == "vtype" )
        {
          return false;
        }
        
        return true;
      } );
      
      request.query.vtype="vtype";
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).toThrow(); 
      expect( accessMongo.complexAggregation ).not.toHaveBeenCalled();
    } );
    
    it( "throws an error if method is not null, and is not a valid string", function()
    {
      xssUtil.isValidLongString.andCallFake( function( param )
      {
        if( param == "method" )
        {
          return false;
        }
        
        return true;
      } );
      
      request.query.vtype="vtype";
      request.query.method="method";
      
      expect( function() { staticIssues.findStaticIssues( request, response ); } ).toThrow(); 
      expect( accessMongo.complexAggregation ).not.toHaveBeenCalled();
    } );
  } );
  
  describe( "Testing the isValidConf function", function()
  {
    it( "returns true if conf is Vulnerability, Type 1, or Type 2", function()
    {
      var vuln = staticIssues.isValidConf( "Vulnerability" );
      var type1 = staticIssues.isValidConf( "Type 1" );
      var type2 = staticIssues.isValidConf( "Type 2" );
      
      expect( vuln ).toEqual( true );
      expect( type1 ).toEqual( true );
      expect( type2 ).toEqual( true );
    } );
    
    it( "retuns false if conf is not Vulnerability, Type 1, or Type 2", function()
    {
      expect( staticIssues.isValidConf( "Invalid" ) ).toEqual( false );
      expect( staticIssues.isValidConf( true ) ).toEqual( false );
      expect( staticIssues.isValidConf( 1 ) ).toEqual( false );
      expect( staticIssues.isValidConf( null ) ).toEqual( false );
      expect( staticIssues.isValidConf( function() {} ) ).toEqual( false );
      expect( staticIssues.isValidConf( {} ) ).toEqual( false );
      expect( staticIssues.isValidConf( [] ) ).toEqual( false );
    } );
  } );
  
  describe( "Testing the isValidSev function", function()
  {
    it( "returns true if conf is High, Medium, Low, or Informational", function()
    {
      var high = staticIssues.isValidSev( "High" );
      var medium = staticIssues.isValidSev( "Medium" );
      var low = staticIssues.isValidSev( "Low" );
      var info = staticIssues.isValidSev( "Informational" );
      
      expect( high ).toEqual( true );
      expect( medium ).toEqual( true );
      expect( low ).toEqual( true );  
      expect( info ).toEqual( true );
    } );
    
    it( "retuns false if conf is not High, Medium, or Low", function()
    {
      expect( staticIssues.isValidSev( "Invalid" ) ).toEqual( false );
      expect( staticIssues.isValidSev( true ) ).toEqual( false );
      expect( staticIssues.isValidSev( 1 ) ).toEqual( false );
      expect( staticIssues.isValidSev( null ) ).toEqual( false );
      expect( staticIssues.isValidSev( function() {} ) ).toEqual( false );
      expect( staticIssues.isValidSev( {} ) ).toEqual( false );
      expect( staticIssues.isValidSev( [] ) ).toEqual( false );
    } );
  } );
  
  describe( "Testing the displayStaticResults function", function()
  {
    var csrf = require( '../../../models/security/csrf-util.js' );
    var appResults;   
        
    beforeEach( function()
    {
      appResults = [ { _id : { app : "name" }, sum : 1 } ];
      spyOn( accessMongo, 'complexAggregation' ).andCallFake( function( collection, pipeline, ee )
      {
        ee.emit( "results from complex group query found", appResults );
      } );
    } );
    
    it( "renders the proper jade template", function()
    {
      spyOn( csrf, "addTokenToForm" ).andReturn( "1" );
          
      queryResults.result[ 0 ].date = "2013-08-26T18:07:05.125Z";
      expect( function() { staticIssues.displayStaticIssues( queryResults, response, config._database ); } ).not.toThrow();
      var expectedResults = queryResults;
      var expectedApps = [ { _id : { app : 'All' }, sum : 1 }, { _id : { app : "name" }, sum : 1 } ];
      expectedResults.result[ 0 ].date = "Mon Aug 26 2013"; 
      expect( response.render ).toHaveBeenCalledWith( "static-issues.jade", { scanners : expectedResults, projectList : expectedApps, _csrf : "1" } );
    } );
  } );
  
  describe( "Testing the displayProjectsForApplication function", function()
  {
    var projResults;
    
    beforeEach( function()
    {
      response.writeHead = jasmine.createSpy( "writeHead" );
      response.end = jasmine.createSpy( "end" );
      spyOn( xssUtil, "isValidLongString" ).andReturn( true );
      
      projResults = [ {
        _id : {
          project : "proj"
        }
      } ];
      
      spyOn( accessMongo, "complexAggregation" ).andCallFake( function( collection, pipeline, ee )
      {
        ee.emit( "results from complex group query found", projResults );
      } );
    } );
    
    it( "writes a response containing a list of projects for a specific application", function()
    {
      expect( function(){ staticIssues.displayProjectsForApplication( request, response ); } ).not.toThrow();
      
      expect( accessMongo.complexAggregation.calls[ 0 ].args[ 1 ][ 0 ] ).toEqual( { $match : jasmine.any( Object ) } );
      expect( response.end ).toHaveBeenCalledWith( "All,proj" );
      expect( response.writeHead ).toHaveBeenCalledWith( 200, { 'Content-Type': 'text/plain' } );
    } );
    
    it( "does not filter on application name if 'All' is specified", function()
    {
      request.query.app = "All";
      
      expect( function(){ staticIssues.displayProjectsForApplication( request, response ); } ).not.toThrow();
      
      expect( accessMongo.complexAggregation.calls[ 0 ].args[ 1 ][ 0 ] ).not.toEqual( { $match : jasmine.any( Object ) } );
      expect( response.end ).toHaveBeenCalledWith( "All,proj" );
      expect( response.writeHead ).toHaveBeenCalledWith( 200, { 'Content-Type': 'text/plain' } );
    } );
    
    it( "sends no data if app is null", function()
    {
      request.query.app = null;
      
      expect( function(){ staticIssues.displayProjectsForApplication( request, response ); } ).not.toThrow();
      
      expect( accessMongo.complexAggregation ).not.toHaveBeenCalled();
      expect( response.end ).toHaveBeenCalledWith( null );
      expect( response.writeHead ).not.toHaveBeenCalled();
    } );
    
    it( "sends no data if app is not a valid long string", function()
    {       
      xssUtil.isValidLongString.andReturn( false );
      staticIssues.displayProjectsForApplication( request, response );       
      
      expect( function(){ staticIssues.displayProjectsForApplication( request, response ); } ).not.toThrow();
      
      expect( accessMongo.complexAggregation ).not.toHaveBeenCalled();
      expect( response.end ).toHaveBeenCalledWith( null );
      expect( response.writeHead ).not.toHaveBeenCalled();
    } ); 
  } );
  
  describe( "Testing the reviewStaticIssue function", function()
  {
    var mongodb = require( '../../../node_modules/mongodb' );
    var postRequest, updateStatement;
    
    beforeEach( function()
    {
      postRequest = {
        body : {
          _id : "52124386ae1392796a7e223b",
          conf : "Vulnerability",
          sev : "High",
          issue_type : "valid",
          description : "123456",
          app : "myapp",
          project : "myproj"
        },
        session : {
          username : "test"
        }
      };
      
      updateStatement = {
        $set : {}
      };
      
      updateStatement.$set.review = { "status" : "valid", "user" : "test", "date" : jasmine.any( Date ), "ticket_number" : "123456" };
    } );
    
    it( "will correctly review an issue, and then redirect the user back to the same page they were on", function()
    {      
      expect( function() { staticIssues.reviewStaticIssue( postRequest, response ); } ).not.toThrow();
      expect( update ).toHaveBeenCalledWith( { "_id" : new mongodb.ObjectID( "52124386ae1392796a7e223b" ) }, updateStatement, jasmine.any( Object ), jasmine.any( Function ) );
      expect( response.redirect ).toHaveBeenCalledWith( "/static_issues?app=myapp&conf=Vulnerability&sev=High&project=myproj" );
      
      postRequest.body.reviewStatus = "new";
      expect( function() { staticIssues.reviewStaticIssue( postRequest, response ); } ).not.toThrow();
      expect( response.redirect ).toHaveBeenCalledWith( "/static_issues?app=myapp&conf=Vulnerability&sev=High&type=new&project=myproj" );
    } );
    
    it( "will throw an error if any of the parameters are missing", function()
    {
      postRequest.body._id = undefined;
      expect( function() { staticIssues.reviewStaticIssue( postRequest, response ); } ).toThrow();
      postRequest.body._id = "52124386ae1392796a7e223b";
      postRequest.body.issue_type = undefined;
      expect( function() { staticIssues.reviewStaticIssue( postRequest, response ); } ).toThrow();
      postRequest.body.issue_type = "valid";
      postRequest.body.description = undefined;
      expect( function() { staticIssues.reviewStaticIssue( postRequest, response ); } ).toThrow();
      postRequest.body.description = "123456";
      
      expect( response.redirect ).not.toHaveBeenCalledWith( "/static_issues?app=myapp&conf=Vulnerability&sev=High&proj=myproj" );
    } );
    
    it( "will throw an error if the issue_type body parameter is not valid or false_positive", function()
    {
      postRequest.body.issue_type = undefined;
      expect( function() { staticIssues.reviewStaticIssue( postRequest, response ); } ).toThrow();
      postRequest.body.issue_type = null;
      expect( function() { staticIssues.reviewStaticIssue( postRequest, response ); } ).toThrow();
      postRequest.body.issue_type = 1;
      expect( function() { staticIssues.reviewStaticIssue( postRequest, response ); } ).toThrow();
      postRequest.body.issue_type = "NOT VALID";
      expect( function() { staticIssues.reviewStaticIssue( postRequest, response ); } ).toThrow();
      postRequest.body.issue_type = function() {};
      expect( function() { staticIssues.reviewStaticIssue( postRequest, response ); } ).toThrow();
      postRequest.body.issue_type = true;
      expect( function() { staticIssues.reviewStaticIssue( postRequest, response ); } ).toThrow();
      postRequest.body.issue_type = {};
      expect( function() { staticIssues.reviewStaticIssue( postRequest, response ); } ).toThrow();
      
      expect( response.redirect ).not.toHaveBeenCalledWith( "/static_issues?app=myApp&conf=Vulnerability&sev=High" );
    } );
    
    it( "updates false positive issues as well", function()
    {
      postRequest.body.issue_type = "false_positive";
      updateStatement.$set.review = { "status" : "false_positive", "user" : "test", "date" : jasmine.any( Date ), "false_positive_reason" : "123456" };

      expect( function() { staticIssues.reviewStaticIssue( postRequest, response ); } ).not.toThrow();
      expect( update ).toHaveBeenCalledWith( { "_id" : new mongodb.ObjectID( "52124386ae1392796a7e223b" ) }, updateStatement, jasmine.any( Object ), jasmine.any( Function ) );
      expect( response.redirect ).toHaveBeenCalledWith( "/static_issues?app=myapp&conf=Vulnerability&sev=High&project=myproj" );
    } );
    
    it( "throws an error if the number of records modified by the update statement is > 1 ", function()
    {
      numUpdated = 2;
      expect( function() { staticIssues.reviewStaticIssue( postRequest, response ); } ).toThrow();
      numUpdated = -1;
      expect( function() { staticIssues.reviewStaticIssue( postRequest, response ); } ).toThrow();
    } );
  } );
  
  describe( "Testing the getCodeAndTrace function", function()
  {
    var expectedOutput;
    
    beforeEach( function()
    {
      request = {
        query : {
          _id : "123456789123"
        }
      };
      
      spyOn( xssUtil, "isValidMongodbId" ).andReturn( true );
      
      findResults.code = {
        "3" : "a",
        "7" : "b",
        "11" : "c",
        "4" : "d",
        "10" : "e",
        "9" : "f",
        "5" : "g",
        "2" : "h",
        "8" : "i",
        "6" : "j",
        "1" : "k"
      };
      
      expectedOutput = { 
        taint_trace : undefined,
        code : {
          "3" : "a",
          "7" : "b",
          "11" : "c",
          "4" : "d",
          "10" : "e",
          "9" : "f",
          "5" : "g",
          "2" : "h",
          "8" : "i",
          "6" : "j",
          "1" : "k" 
        } 
      };
    } );
    
    it( "returns the taint trace information and the code to the browser window", function()
    {
      expectedOutput.taint_trace = "trace";
      findResults.taint_trace = "trace";
      
      expect( function() { staticIssues.getTraceAndCode( request, response ); } ).not.toThrow();
      expect( response.writeHead ).toHaveBeenCalled();
      expect( response.end ).toHaveBeenCalledWith( JSON.stringify( expectedOutput ) );
      expect( config._logs.security.log ).not.toHaveBeenCalled();
    } );
    
    it( "returns code only to the browser if the taint trace isn't available", function()
    {
      expect( function() { staticIssues.getTraceAndCode( request, response ); } ).not.toThrow();
      expect( response.writeHead ).toHaveBeenCalled();
      expect( response.end ).toHaveBeenCalledWith( JSON.stringify( expectedOutput ) );
      expect( config._logs.security.log ).not.toHaveBeenCalled();
    } );
    
    it( "throws an error if the mongodb objectId is not valid", function()
    {
      xssUtil.isValidMongodbId.andReturn( false );
      
      expect( function() { staticIssues.getTraceAndCode( request, response ); } ).toThrow();
      expect( response.writeHead ).not.toHaveBeenCalled();
      expect( config._logs.security.log ).not.toHaveBeenCalled();
      expect( response.end ).not.toHaveBeenCalledWith( JSON.stringify( expectedOutput ) );
      expect( response.end ).toHaveBeenCalled();
    } );
    
    it( "sends an empty response if the expected value is not found", function()
    {
      
      findResults = null;
      
      expect( function() { staticIssues.getTraceAndCode( request, response ); } ).not.toThrow();
      expect( response.writeHead ).not.toHaveBeenCalled();
      expect( response.end ).not.toHaveBeenCalledWith( JSON.stringify( expectedOutput ) );
      expect( response.end ).toHaveBeenCalled();
      expect( config._logs.security.log ).not.toHaveBeenCalled();
    } );
  } );
  
  describe( "Testing the permanentLink function", function()
  {
    var csrf = require( '../../../models/security/csrf-util.js' );
    
    beforeEach( function() 
    {
      request = {
        query : {
          _id : "123456789123"
        }
      };
      
      spyOn( xssUtil, 'isValidMongodbId' ).andReturn( true );
      spyOn( csrf, "addTokenToForm" ).andReturn( "1" );
    } ); 
    
    it( "displays a single issue result if successful", function()
    {
      expect( function() { staticIssues.permanentLink( request, response ); } ).not.toThrow();
      expect( response.redirect ).not.toHaveBeenCalled();
      expect( response.end ).not.toHaveBeenCalled();
      expect( response.render ).toHaveBeenCalledWith( 'single-static-issue.jade', { issue : findResults, _csrf : "1" } );
    } );
    
    it( "throws an error if the id parameter is not a valid mongodb id", function()
    {
      xssUtil.isValidMongodbId.andReturn( false );
      
      expect( function() { staticIssues.permanentLink( request, response ); } ).toThrow();
      expect( response.end ).toHaveBeenCalled();
      expect( response.redirect ).not.toHaveBeenCalled();
      expect( response.render ).not.toHaveBeenCalled();
    } );
    
    it( "displays the static issues list landing page if the object id is missing", function()
    {
      findResults = null;
      
      expect( function() { staticIssues.permanentLink( request, response ); } ).not.toThrow();
      expect( response.redirect ).not.toHaveBeenCalled();
      expect( response.end ).not.toHaveBeenCalled();
      expect( response.render ).toHaveBeenCalledWith( 'static-issues.jade' );
    } );
  } );
} );
