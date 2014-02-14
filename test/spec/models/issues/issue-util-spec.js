describe( "Testing the issue-util.js file", function()
{
  var issue = require( '../../../../models/issues/issue-util.js' );
  var helper = require( '../../../../models/helpers.js' );
  var event = require( 'events' );
  var mongodb = require( '../../../../node_modules/mongodb' );
  
  describe( "Testing new dynamc issues review function reviewDynamicIssue", function()
  {
    var config;
    var ee = new event.EventEmitter();
    var update;
    var response;
    
    var expected = {
      $set : {
        reviewed : {
          reviewed : 'Y',
          username : 'testUser', 
          type : 'false_positive',
          date_reviewed : jasmine.any( Date ),
          false_positive_reason : 'testing false positives',
          case_number : ''
        }
      }
    };
    
    beforeEach( function()
    {
      spyOn( mongodb, 'ObjectID' ).andReturn( 'id' );
      update = jasmine.createSpy( 'update' ).andCallFake( function( query, update, options, callback )
      {
        callback( null, 1 );
      } );
      
      config = {
        _database : {
          collection : function( name, callback )
          {
            var collection = {
              find : function( query, callback )
              {
                callback( null, '_id' );
              },
              'update' : update 
            };
            
            callback( null, collection );
          }
        },
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
      
      response = {
        redirect : jasmine.createSpy( 'redirect' )
      }; 
    } );
    
    it( "can successfully update a false_positive issue", function( done )
    {
      ee.once( 'Update Complete', function( err )
      {
        expect( err ).toEqual( null );
        expect( update ).toHaveBeenCalledWith( jasmine.any( Object ), expected, jasmine.any( Object ), jasmine.any( Function ) );
        expect( response.redirect ).not.toHaveBeenCalled();
        
        done();
      } );
      
      issue.reviewIssue( 'id', 'testUser', 'false_positive', 'testing false positives', ee, response );
    }, 250 );
    
    it( "can successfully update a valid issue", function( done )
    {
      var expectedValid = {
        $set : {
          reviewed : {
            reviewed : 'Y',
            username : 'testUser', 
            type : 'valid',
            date_reviewed : jasmine.any( Date ),
            false_positive_reason : '',
            case_number : 'testcase'
          }
        }
      };
      
      ee.once( 'Update Complete', function( err )
      {
        expect( err ).toEqual( null );
        expect( update ).toHaveBeenCalledWith( jasmine.any( Object ), expectedValid, jasmine.any( Object ), jasmine.any( Function ) );
        expect( response.redirect ).not.toHaveBeenCalled();
        
        done();
      } );
      
      issue.reviewIssue( 'id', 'testUser', 'valid', 'testcase', ee, response );
    }, 250 );
    
    it( "fails to update when the issue _id is not found", function( done )
    {
      update.andCallFake( function( query, update, options, callback )
      {
        callback( null, 0 );
      } );
      
      ee.once( 'Update Complete', function( err )
      {
        expect( err ).toEqual( 'Error: Issue not found' );
        expect( update ).toHaveBeenCalledWith( jasmine.any( Object ), expected, jasmine.any( Object ), jasmine.any( Function ) );
        expect( response.redirect ).not.toHaveBeenCalled();
        
        done();
      } );
      
      issue.reviewIssue( 'id', 'testUser', 'false_positive', 'testing false positives', ee, response );
    }, 250 );
    
    it( "fails to update when more than one issue have the same _id", function( done )
    {
      update.andCallFake( function( query, update, options, callback )
      {
        callback( null, 2 );
      } );
      
      ee.once( 'Update Complete', function( err )
      {
        expect( err ).toEqual( 'Error: Too many results' );
        expect( update ).toHaveBeenCalledWith( jasmine.any( Object ), expected, jasmine.any( Object ), jasmine.any( Function ) );
        expect( response.redirect ).not.toHaveBeenCalled();
        
        done();
      } );
      
      issue.reviewIssue( 'id', 'testUser', 'false_positive', 'testing false positives', ee, response );
    }, 250 );
    
    it( "does not attempt to update unless the issue type is valid or false_positive", function()
    {
      spyOn( ee, 'emit' ).andCallThrough();
      
      expect( function() { issue.reviewIssue( 'id', 'testUser', 'something', 'testing false positives', ee, response ); } ).toThrow();
      expect( function() { issue.reviewIssue( 'id', 'testUser', null, 'testing false positives', ee, response ); } ).toThrow();
      expect( function() { issue.reviewIssue( 'id', 'testUser', {}, 'testing false positives', ee, response ); } ).toThrow();
      expect( function() { issue.reviewIssue( 'id', 'testUser', true, 'testing false positives', ee, response ); } ).toThrow();
      expect( function() { issue.reviewIssue( 'id', 'testUser', function() {}, 'testing false positives', ee, response ); } ).toThrow();
      
      expect( helper.getLoggers().security.log.callCount ).toEqual( 5 );
      expect( ee.emit ).not.toHaveBeenCalled();
      expect( response.redirect ).toHaveBeenCalled();
    } );
  } );
} );

