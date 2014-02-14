describe( "Testing functionality for pulling report data out of the MongoDB", function() 
{
  var mongodb = require( "../../helpers/mongo-mock.js" );
  var accessMongo = require( "../../../models/pull-report-data.js" );
  
  var event = require( 'events' );
  
  var collection = new mongodb.db().collection();
  var key = [ "Url" ];
  var cond = { "reviewed.reviewed" : "Y" };
  var initial = { "number_of_issues" : 0 };
  var reduce = function( curr, result ) { result.number_of_issues += 1; };
  var expectedResults = 
  [
    { "Url" : "http://test/test.html", "number_of_issues" : 2 },
    { "Url" : "http://test/test2.html", "number_of_issues" : 1 },
    { "Url" : "http://test/test3.html", "number_of_issues" : 1 }
  ];
  
  var results;
  var a;
  
  describe( "verifying db calls occur properly", function() 
  {
    beforeEach( function() 
    {      
      spyOn( collection, "group" ).andCallThrough();      
      var res = accessMongo.pullReportData( collection, key, cond, initial, reduce, new event.EventEmitter() );
    });
    
    it( "tracks that group() function was called", function() 
    {
      expect( collection.group ).toHaveBeenCalled();
    });
    
    it( "verifies that group() function was only called once", function() 
    {
      expect( collection.group.calls.length ).toEqual( 1 );
    });
    
    it( "verifies that group() function is called with correct query", function()
    {
      expect( collection.group ).toHaveBeenCalledWith( 
        { "Url" : true },
        { "reviewed.reviewed" : "Y" },
        { "number_of_issues" : 0 },
        jasmine.any( Function ),
        jasmine.any( Function )
       );
    });
  });
  
  describe( "verifying helper function calls", function() 
  {  
    beforeEach( function() 
    {
      spyOn( accessMongo, 'createKey' ).andCallThrough();
      accessMongo.pullReportData( collection, key, cond, initial, reduce, new event.EventEmitter() );
      accessMongo.pullReportData( collection, null, cond, initial, reduce, new event.EventEmitter() );
    });
    
    it( "tracks that the createKey function was called", function() 
    {
      expect( accessMongo.createKey ).toHaveBeenCalled();
    });
    
    it( "tracks that the createKey function was called twice", function()
    {
      expect( accessMongo.createKey.calls.length ).toEqual( 2 );
    });
    
    it( "verifies that the correct data is returned by the helper function", function() 
    {
      var expectedKeys = { "Url" : true };
      expect( accessMongo.createKey( key ) ).toEqual( expectedKeys );
    });
  });
  
  describe( "testing query outputs", function() 
  {
    it( "should equal the expected results", function()
    {
      var ee = new event.EventEmitter();
      ee.once( "results from group query found", function( results )
      {
        expect( results ).toEqual( expectedResults );
      });
      accessMongo.pullReportData( collection, key, cond, initial, reduce, ee );
    });
    
    it( "should return an empty set", function()
    {
      cond = { "type" : "false_positive", "case_number" : "LRN-123456" };
      var ee = new event.EventEmitter();
      ee.once( "results from group query found", function( results )
      {
        expect( results ).toEqual( [] );
      });
      accessMongo.pullReportData( collection, key, cond, initial, reduce );
      
      cond = { "reviewed.reviewed" : "Y" };
    });
  });
  
  describe( "testing error conditions", function()
  {
    it( "should throw an error when missing or invalid db parameter", function()
    {
      expect( function() { accessMongo.pullReportData( null, key, cond, initial, reduce ); } ).toThrow( new Error( "collection cannot be null, and must be an object containing a function called group" ) );
      expect( function() { accessMongo.pullReportData( "hello", key, cond, initial, reduce ); } ).toThrow( new Error( "collection cannot be null, and must be an object containing a function called group" ) );
    });
    
    it( "should throw an error when missing or invalid initial parameter", function()
    {
      expect( function() { accessMongo.pullReportData( collection, key, cond, null, reduce ); } ).toThrow( new Error( "initialField must be a JSON value" ) );
      expect( function() { accessMongo.pullReportData( collection, key, cond, "hello", reduce ); } ).toThrow( new Error( "initialField must be a JSON value" ) );
    });
    
    it( "should throw an error when missing or invalid reduce parameter", function()
    {
      expect( function() { accessMongo.pullReportData( collection, key, cond, initial, null ); } ).toThrow( new Error( "reduceField must be a function" ) );
      expect( function() { accessMongo.pullReportData( collection, key, cond, initial, "hello" ); } ).toThrow( new Error( "reduceField must be a function" ) );
    });
  });
  
  describe( "Testing aggregate query with standard parameters only", function()
  {
    var match = { $match : { "reviewed.username" : "granjan" } };
    var group = { $group : { _id : { type : '$FirstIdentified.Version' }, count : { $sum : 1 } } };
    var ee = new event.EventEmitter();
    beforeEach( function() 
    {
      spyOn( collection, "aggregate" ).andCallFake( function( query, callback )
      {
        var results = 
        [ 
          { _id : { "version" : "9.1.120037.0" }, "count" : 1 },
          { _id : { "version" : "9.1.120038.0" }, "count" : 1 },
          { _id : { "version" : "9.1.120042.0" }, "count" : 1 },
          { _id : { "version" : "9.1.120043.0" }, "count" : 1 }
        ];
        callback( null, results );
      }); 
    });
    
    it( "should call the pullAggrgateData function", function() 
    {
      accessMongo.pullAggregateData( collection, match, group, ee );
      expect( collection.aggregate ).toHaveBeenCalled();
    });
    
    it( "should call the aggregate function with the proper query", function() 
    {
      accessMongo.pullAggregateData( collection, match, group, ee );
      expect( collection.aggregate ).toHaveBeenCalledWith( [ match, group ], jasmine.any( Function ) );
    });
    
    it( "should return the proper results", function()
    {
      var expectedResults = 
      [ 
        { _id : { "version" : "9.1.120037.0" }, "count" : 1 },
        { _id : { "version" : "9.1.120038.0" }, "count" : 1 },
        { _id : { "version" : "9.1.120042.0" }, "count" : 1 },
        { _id : { "version" : "9.1.120043.0" }, "count" : 1 }
      ]; 
      ee.once( "results from group query found", function( results )
      {
        expect( results ).toEqual( expectedResults );
      });
      accessMongo.pullAggregateData( collection, match, group, ee );
    });
  });
  describe( "Testing additional parameters for pullAggregateData", function()
  {
    it( "should create a query with sorting", function()
    {
      var match = { $match : { "reviewed.username" : "granjan" } };
      var group = { $group : { _id : { type : '$FirstIdentified.Version' }, count : { $sum : 1 } } };
      var sort = { $sort : { "count" : -1 } };
      var ee = new event.EventEmitter();
      spyOn( collection, "aggregate" ).andCallFake( function( query, callback )
      {
        var results = 
        [ 
          { _id : { "version" : "9.1.120037.0" }, "count" : 1 },
          { _id : { "version" : "9.1.120038.0" }, "count" : 1 },
          { _id : { "version" : "9.1.120042.0" }, "count" : 1 },
          { _id : { "version" : "9.1.120043.0" }, "count" : 1 }
        ];
        callback( null, results );
      }); 
      accessMongo.pullAggregateData( collection, match, group, ee, { "sort" : sort } );
      expect( collection.aggregate ).toHaveBeenCalledWith( [ match, group, sort ], jasmine.any( Function ) );
    });
  });
  describe( "Testing the complexAggregation function", function()
  {
    var ee = new event.EventEmitter();
    beforeEach( function()
    {
      spyOn( collection, "aggregate" ).andCallFake( function( query, callback )
      {
        var results = 
        [ 
          { _id : { "version" : "9.1.120037.0" }, "count" : 1 },
          { _id : { "version" : "9.1.120038.0" }, "count" : 1 },
          { _id : { "version" : "9.1.120042.0" }, "count" : 1 },
          { _id : { "version" : "9.1.120043.0" }, "count" : 1 }
        ];
        callback( null, results );
      } ); 
    } );
    
    it( "Should arrange the pipeline in the order passed in", function()
    {
      var match = { $match : { "reviewed.username" : "granjan" } };
      var group = { $group : { _id : { type : '$FirstIdentified.Version' }, count : { $sum : 1 } } };
      var sort = { $sort : { "count" : -1 } };
      var pipeline = [ match, group, sort ];
            
      expect( function() { accessMongo.complexAggregation( collection, pipeline, jasmine.createSpyObj( "ee", [ "emit" ] ) ); } ).not.toThrow();
      expect( collection.aggregate ).toHaveBeenCalledWith( pipeline, jasmine.any( Function ) );
    } );
    
    it( "Should return the proper results", function( done )
    {
      var match = { $match : { "reviewed.username" : "granjan" } };
      var group = { $group : { _id : { type : '$FirstIdentified.Version' }, count : { $sum : 1 } } };
      var sort = { $sort : { "count" : -1 } };
      var pipeline = [ match, group, sort ];
      
      ee.once( "results from complex group query found", function( results )
      {
        var expectedResults = 
        [ 
          { _id : { "version" : "9.1.120037.0" }, "count" : 1 },
          { _id : { "version" : "9.1.120038.0" }, "count" : 1 },
          { _id : { "version" : "9.1.120042.0" }, "count" : 1 },
          { _id : { "version" : "9.1.120043.0" }, "count" : 1 }
        ];
        
        expect( results ).toEqual( expectedResults );
        done();
      } );
      
      expect( function() { accessMongo.complexAggregation( collection, pipeline, ee ); } ).not.toThrow();
    }, 250 );
    
    it( "Should throw an error if any piece of the query is invalid", function()
    {
      var match = { $nothing : { "reviewed.username" : "granjan" } };
      var group = { $group : { _id : { type : '$FirstIdentified.Version' }, count : { $sum : 1 } } };
      var sort = { $sort : { "count" : -1 } };
      var pipeline = [ match, group, sort ];
      
      expect( function() { accessMongo.complexAggregation( collection, pipeline, ee ); } ).toThrow();
    } );
  } );
  
  describe( "Testing the mapReduce function", function()
  {
    var ee = new event.EventEmitter();
    var db;
    var mapReduce;
    beforeEach( function()
    {
      mapReduce = jasmine.createSpy( "mapReduce" ).andCallFake( function( map, reduce, options, callback )
      {
        callback( null, { "id" : "2014-1-14", "value" : { "newResults" : 1, "reviewedResults" : 1 } } );              
      } );
      db = {
        collection : function( name, callback )
        {
          var collection = { 
            mapReduce : mapReduce
          };
          
          callback( null, collection );
        } 
      };
    } );
    it( "Emits an event, no errors, the results, and the table called, when successful", function( done )
    {
      ee.once( "mapReduce complete", function( err, results, table )
      {
        expect( err ).toEqual( null );
        expect( results ).toEqual( { "id" : "2014-1-14", "value" : { "newResults" : 1, "reviewedResults" : 1 } } );
        expect( table ).toEqual( "table" );
        done();
      } );
      expect( function() { accessMongo.mapReduce( db, "table", ee, function() {}, function() {}, null ); } ).not.toThrow();
    } );
    
    it( "Emits an error if an error occurs when trying to get the data via mapReduce", function( done )
    {
      mapReduce.andCallFake( function( map, reduce, options, callback )
      {
        callback( "error" );
      } );
      
      ee.once( "mapReduce complete", function( err, results, table )
      { 
        expect( err ).toEqual( "error" );
        expect( results ).toEqual( null );
        expect( table ).toEqual( null );
        done();
      } );
      
      expect( function() { accessMongo.mapReduce( db, "table", ee, function() {}, function() {}, null ); } ).not.toThrow();
    } );
    
    it( "Emits an error if an error occurs when trying to connect to the collection", function( done )
    {
      db = {
        collection : function( name, callback )
        {
          callback( "error", null );
        }
      };
      
      ee.once( "mapReduce complete", function( err, results, table )
      {
        expect( err ).toEqual( "error" );
        expect( results ).toEqual( null );
        expect( table ).toEqual( null );
        done();
      } );
      
      expect( function() { accessMongo.mapReduce( db, "table", ee, function() {}, function() {}, null ); } ).not.toThrow();
    } );
    
    it( "adds finalize to the options object if it exists", function()
    {
      expect( function() { accessMongo.mapReduce( db, "table", ee, function() {}, function() {}, function() {} ); } ).not.toThrow();
      expect( mapReduce ).toHaveBeenCalledWith( jasmine.any( String ), jasmine.any( String ), { out : { inline : 1 }, finalize : jasmine.any( String ) }, jasmine.any( Function ) );
    } );
  } );
  
  describe( "Testing the find function", function()
  {
    var db;
    var find, count;
    
    beforeEach( function()
    {
      count = jasmine.createSpy( "count" ).andCallFake( function( callback )
      {
        callback( null, 10 );
      } );
      find = jasmine.createSpy( "find" ).andCallFake( function(  query, callback )
      {        
        if( callback )
        {
          callback( null, [ { _id : "test" } ] );
        }
        return( { count : count } );
      } );
      
      db = {
        collection : function( name, callback )
        {
          var collection = {
            find : find
          };
          
          callback( null, collection );
        }
      };
    } ); 
    
    it( "Emits an error if the connection to the collection has a problem, or problem getting results", function()
    {
      var ee = new event.EventEmitter();
      var numErrors = 0;
      var counts = 0;
      var finds = 0;
     
      spyOn( db, "collection" ).andCallThrough();
     
      ee.on( "Error", function( err )
      {
        numErrors += 1;
      } );
      ee.on( "Count Results", function( count )
      {
        counts += 1;
      } );
      ee.on( "Find Results", function( results )
      {
        finds += 1;
      } );
      
      count.andCallFake( function( callback )
      {
        callback( "Error" );
      } );
      
      expect( function() { accessMongo.find( {}, db, "test", ee, true ); } ).not.toThrow();
      
      find.andCallFake( function( query, callback )
      {
        callback( "Error" );
      } );
      
      expect( function() { accessMongo.find( {}, db, "test", ee, false ); } ).not.toThrow();
      
      db.collection.andCallFake( function( name, callback )
      {
        callback( "Error" );
      } ); 
      
      expect( function() { accessMongo.find( {}, db, "test", ee, true ); } ).not.toThrow();
      
      expect( numErrors ).toEqual( 3 );
      expect( counts ).toEqual( 0 );
      expect( finds ).toEqual( 0 );
      expect( find.callCount ).toEqual( 2 );
      expect( count.callCount ).toEqual( 1 );
    } );
    
    it( "emits proper data for find", function( done )
    {
      var ee = new event.EventEmitter();
      
      ee.once( "Find Results", function( results )
      {
        expect( results ).toEqual( [ { _id : "test" } ] );
        done();
      } );
      
      expect( function() { accessMongo.find( {}, db, "test", ee, false ); } ).not.toThrow();
    } );
    
    it( "emits proper data for count", function( done )
    {
      var ee = new event.EventEmitter();
      
      ee.once( "Count Results", function( results )
      {
        expect( results ).toEqual( 10 );
        done();
      } );
      
      expect( function() { accessMongo.find( {}, db, "test", ee, true ); } ).not.toThrow();
    } );
  } );
} );