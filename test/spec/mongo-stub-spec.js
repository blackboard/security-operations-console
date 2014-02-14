describe( "Testing the mongodb stub", function() 
{
  var mongodb = require( "../helpers/mongo-mock.js" );
  var db = new mongodb.db();
  
  describe( "testing the find() function", function() 
  {
    it( "should return all 4 mock db objects when the find query is empty", function()
    {
      var q = {};
      
      var result = db.collection().find( q );
      expect( result.length ).toEqual( 4 );  
    } );
    
    it( "should find all 4 mock db objects because CWE is always > 0", function() 
    {
      var q = { "CWE" : { $gt : "0" } };

      var result = db.collection().find( q );
      expect( result.length ).toEqual( 4 );
    });
    
    it( "should find 2 mock objects which are valid issues", function() 
    {
      var q = { "reviewed.type" : "valid" };
      
      var result = db.collection().find( q );
      expect( result.length ).toEqual( 2 );
    });
    
    it( "should find 1 mock object, because only 1 has both CWE : 209 and reviewed.case_number : CSBB-381", function()
    {
      var q = { "CWE" : "209", "reviewed.case_number" : "testcase" };
      
      var result = db.collection().find( q );
      expect( result.length ).toEqual( 1 );
    });
  });
  
  describe( "testing the group() function", function() 
  {
    it( "non-complex query, should return the following array: [ { CWE : 209, num : 4 } ]", function() 
    {
      var q = { key : { "CWE" : true }, cond : { "CWE" : "209" }, initial : { "num" : 0 }, reduce : function( curr, result ) { result.num += 1; } };
      var callback = function( err, results )
      {
        var compareTo = [ { "CWE" : "209", "num" : 4 } ];
        expect( results ).toEqual( compareTo );
      };
        
      db.collection().group( q.key, q.cond, q.initial, q.reduce, callback );
    });
    
    it( "Url test because I saw some wierd behavior",  function()
    {
      var q = { 
        key : { "Url" : true },
        cond : { "reviewed.reviewed" : "Y" },
        initial : { "number_of_issues" : 0 },
        reduce : function( curr, result ) { result.number_of_issues += 1; } };
      var callback = function( err, results ) 
      {
        var compareTo = 
        [
          { "Url" : "http://test/test.html", "number_of_issues" : 2 },
          { "Url" : "http://test/test2.html", "number_of_issues" : 1 },
          { "Url" : "http://test/test3.html", "number_of_issues" : 1 }
        ];
        expect( results ).toEqual( compareTo );
      };
      db.collection().group( q.key, q.cond, q.initial, q.reduce, callback );
    });
      
    it( "more realistic test", function() 
    {
      var q = { key : { "CWE" : true, "reviewed.type" : true, "Url" : true }, 
                cond : { "reviewed.type" : { "$in" : [ "valid", "false_positive" ] } },
                initial : { "num" : 0 },
                reduce : function( curr, result ) { result.num += 1; } };
      var callback = function( err, results ) {
        var compareTo = 
        [
          { 
            "CWE" : "209", 
            "Url" : "http://test/test.html", 
            "reviewed.type" : "valid",
            "num" : 2
          },
          {
            "CWE" : "209", 
            "Url" : "http://test/test2.html",
            "reviewed.type" : "false_positive",
            "num" : 1
          },
          {
            "CWE" : "209", 
            "Url" : "http://test/test3.html", 
            "reviewed.type" : "false_positive", 
            "num" : 1
          }
        ];
        expect( results ).toEqual( compareTo );
      };
      db.collection().group( q.key, q.cond, q.initial, q.reduce, callback );
    });
  });
});