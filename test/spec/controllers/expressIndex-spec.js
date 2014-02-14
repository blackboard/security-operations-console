describe( "Tests the creation of the index page for the express server", function() 
{
  var expressIndex = require( '../../../controllers/expressIndex.js' );
  var helper = require( '../../../models/helpers.js' );
  
  var config;
  
  beforeEach( function()
  {
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
      } 
    };
    
    helper.setConfig( config );
  } );
   
  describe( "Testing the createIndexPage function", function()
  {
    //use the stub for mongoDb for this functionality
    var mockDb = require( '../../helpers/mongo-mock.js' );
    var db = new mockDb.db();
  
    describe( "where the index page renders properly", function()
    {
      var response;
      
      it( "Renders the new issues page when type is undefined", function( done )
      {
        var request = {
          query : {
          },
          session : {
            permissions : [ 'issues.write', 'issues.read' ]
          } 
        };
        
        response = {
          render : jasmine.createSpy( 'render' ).andCallFake( function( page, object )
          {
            expect( object.scanners.length ).toEqual( 0 );
            done();
          } )
        };
        
        expressIndex.createIndexPage( request, response, db );
        
        expect( response.render ).toHaveBeenCalled();
      } );
      
      it( "Renders the new issues page when type is new", function( done )
      {
        var request = {
          query : {
            type: 'new' 
          },
          session : {
            permissions : [ 'issues.write', 'issues.read' ]
          } 
        };
        
        response = {
          render : jasmine.createSpy( 'render' ).andCallFake( function( page, object )
          {
            expect( object.scanners.length ).toEqual( 0 );
            done();
          } )
        };
        
        expressIndex.createIndexPage( request, response, db );
        
        expect( response.render ).toHaveBeenCalled();
      } );
      
      it( "Renders the reviewed issues page when type is reviewed", function( done )
      {
        var request = {
          query : {
            type: 'reviewed' 
          },
          session : {
            permissions : [ 'issues.write', 'issues.read' ]
          } 
        };
        
        response = {
          render : jasmine.createSpy( 'render' ).andCallFake( function( page, object )
          {
            expect( object.scanners.length ).toEqual( 4 );
            done();
          } )
        };
        
        expressIndex.createIndexPage( request, response, db );
        
        expect( response.render ).toHaveBeenCalled();
      } );
       
      it( "Renders the full issues page when type is all", function( done )
      {
        var request = {
          query : {
            type: 'all' 
          },
          session : {
            permissions : [ 'issues.write', 'issues.read' ]
          } 
        };
        
        response = {
          render : jasmine.createSpy( 'render' ).andCallFake( function( page, object )
          {
            expect( object.scanners.length ).toEqual( 4 );
            done();
          } )
        };
        
        expressIndex.createIndexPage( request, response, db );
        
        expect( response.render ).toHaveBeenCalled();
      } );
    } );
    
    it( "Throws an error if the reviewed issues list type is not valid", function() 
    {
      var request = {
        query : {
          type : 'fake'
        },
        session : {
          username : 'dummy'
        }
      };
      var response = {
        render : function() {}
      };
      
      expect( function() { expressIndex.createIndexPage( request, response, db ); } ).toThrow();
      expect( config._logs.security.log ).toHaveBeenCalled();
    } );
  } );
  
  describe( "Testing the reviewIssue function", function()
  {
    var issue = require( '../../../models/issues/issue-util.js' );
    var event = require( 'events' );
    var status;
    
    var ee = new event.EventEmitter();
    var response;
    var config;
    
    beforeEach( function()
    {
      status = 200;
      
      spyOn( issue, 'reviewIssue' ).andCallFake( function( id, user, type, description, ee, response ) 
      {
        ee.emit( 'Update Complete', null );
      } );
      
      response = {
        redirect : jasmine.createSpy( 'redirect' )
      };  
    } );
    
    it( "creates a valid review when an issue is valid", function()
    {
      var request = {
        body : {
          reviewedItem : 'unimportant',
          issue_type : 'valid',
          review : 'dummy',
          description : 'dummy'
        },
        session : {
          username : 'dummy'
        }
      };
      
      expect( function() { expressIndex.reviewIssue( request, response ); } ).not.toThrow();
      expect( response.redirect ).toHaveBeenCalled();
    } );
    
    it( "creates a false positive review when an issue is a false positive", function()
    {
      var request = {
        body : {
          reviewedItem : 'unimportant',
          issue_type : 'false_positive',
          review : 'dummy',
          description : 'dummy'
        },
        session : {
          username : 'dummy'
        }
      };
      
      expect( function() { expressIndex.reviewIssue( request, response ); } ).not.toThrow();
      expect( response.redirect ).toHaveBeenCalled();
    } );
    
    it( "throws an error if any request parameter is missing", function()
    {
      //request missing review parameter
      var request = {
        body : {
          reviewedItem : 'unimportant',
          issue_type : 'false_positive',
          description : 'dummy'
        },
        session : {
          username : 'dummy'
        }
      };
      
      expect( function() { expressIndex.reviewIssue( request, response ); } ).toThrow();
      
      //request missing reviewedItem parameter
      request = {
        body : {
          issue_type : 'false_positive',
          review : 'dummy',
          description : 'dummy'
        },
        session : {
          username : 'dummy'
        }
      };
      expect( function() { expressIndex.reviewIssue( request, response ); } ).toThrow();
      
      //request missing issue_type parameter
      request = {
        body : {
          reviewedItem : 'unimportant',
          review : 'dummy',
          description : 'dummy'
        },
        session : {
          username : 'dummy'
        }
      };
      expect( function() { expressIndex.reviewIssue( request, response ); } ).toThrow();
      
      //request missing description parameter
      request = {
        body : {
          reviewedItem : 'unimportant',
          issue_type : 'false_positive',
          review : 'dummy',
        },
        session : {
          username : 'dummy'
        }
      };
      expect( function() { expressIndex.reviewIssue( request, response ); } ).toThrow();
      
      expect( helper.getLoggers().security.log.callCount ).toEqual( 4 );
    } );
    
    it( "throws an error if err is not null", function()
    {
      issue.reviewIssue.andCallFake( function( id, user, type, description, ee, response )
      {
        ee.emit( 'Update Complete', 'data' );
      } );
     
      var request = {
        body : {
          reviewedItem : 'unimportant',
          issue_type : 'false_positive',
          review : 'dummy',
          description : 'dummy'
        },
        session : {
          username : 'dummy'
        }
      };
            
      expect( function() { expressIndex.reviewIssue( request, response ); } ).toThrow();
    } );
    
    it( "throws an error if issue_type is anything but valid or false_positive", function()
    {
      issue.reviewIssue.andCallFake( function( id, user, type, description, ee, response )
      {
        ee.emit( 'Update Complete', 'data' );
      } );
      
      var request = {
        body : {
          reviewedItem : 'unimportant',
          issue_type : 'a',
          review : 'dummy',
          description : 'dummy'
        },
        session : {
          username : 'dummy'
        }
      };
      
      expect( function() { expressIndex.reviewIssue( request, response ); } ).toThrow();
      
      request.issue_type = true;
      expect( function() { expressIndex.reviewIssue( request, response ); } ).toThrow();
      
      request.issue_type = {};
      expect( function() { expressIndex.reviewIssue( request, response ); } ).toThrow();
      
      request.issue_type = function() {};
      expect( function() { expressIndex.reviewIssue( request, response ); } ).toThrow();
      
      request.issue_type = 1;
      expect( function() { expressIndex.reviewIssue( request, response ); } ).toThrow();
      expect( issue.reviewIssue ).not.toHaveBeenCalled();
      expect( helper.getLoggers().security.log.callCount ).toEqual( 5 );
    } );
  } );
} );

