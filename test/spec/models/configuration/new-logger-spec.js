describe( "testing the ability to create and use a new logger", function()
{
  var log = require( '../../../../models/configuration/new-logger.js' );
  var xssUtil = require( '../../../../models/security/xss-util.js' );
  
  var winston = require( '../../../../node_modules/winston' );
  
  beforeEach( function()
  {
    spyOn( xssUtil, 'isPathTraversal' ).andReturn( false ); 
  } );
  
  describe( "testing the instantiation process", function()
  {
    beforeEach( function()
    {
      spyOn( winston, 'Logger' ).andCallFake( function( object )
      {
        var toReturn = {
          _names : [],
          transports : {}
        };
        for( iter in object.transports )
        {
          toReturn.level = object.transports[ iter ].level;
          toReturn._names.push( object.transports[ iter ].name );
          switch( object.transports[ iter ].name )
          {
            case 'console':
              toReturn.transports.console = {};
              toReturn.transports.console.timestamp = object.transports[ iter ].timestamp;
              break;
            case 'file':
              toReturn.transports.file = {};  
              toReturn.transports.file.timestamp = object.transports[ iter ].timestamp;
              toReturn.transports.file.filename = object.transports[ iter ].filename;
              toReturn.transports.file.dirname = object.transports[ iter ].dirname;
              break;
            case 'mongodb':
              toReturn.transports.mongodb = {};
              toReturn.transports.mongodb.db = object.transports[ iter ].db;
              toReturn.transports.mongodb.collection = object.transports[ iter ].collection;
          }
        }
        
        return toReturn;
      } );
    } );  
    
    it( "can log to the console", function()
    {
      var consoleLog;
      expect( function() { consoleLog = new log( [ 'console' ], 'info', true, false ); } ).not.toThrow();
      
      expect( consoleLog._winston._names[ 0 ] ).toEqual( 'console' );
      expect( consoleLog._winston._names.length ).toEqual( 1 );
      expect( consoleLog._winston.level ).toEqual( 'info' );
      expect( consoleLog._winston.transports.console.timestamp ).toEqual( true );
      expect( winston.Logger.callCount ).toEqual( 1 );
    } );
    
    it( "can log to a file", function()
    {
      var fileLog;
      expect( function() { fileLog = new log( [ 'file' ], 'info', true, false, '/tempFile' ); } ).not.toThrow();
      
      expect( fileLog._winston._names[ 0 ] ).toEqual( 'file' );
      expect( fileLog._winston._names.length ).toEqual( 1 );
      expect( fileLog._winston.level ).toEqual( 'info' );
      expect( fileLog._winston.transports.file.timestamp ).toEqual( true );
      expect( fileLog._winston.transports.file.filename ).toEqual( 'tempFile' );
      expect( fileLog._winston.transports.file.dirname ).toEqual( '/' );
      expect( winston.Logger.callCount ).toEqual( 1 );
    } );
    
    it( "can log to a mongodb collection", function()
    {
      var mongodbLog;
      expect( function () { mongodbLog = new log( [ 'mongodb' ], 'info', null, false, null, 'ISSUES', 'testLog' ); } ).not.toThrow();
      
      expect( mongodbLog._winston._names[ 0 ] ).toEqual( 'mongodb' );
      expect( mongodbLog._winston._names.length ).toEqual( 1 );
      expect( mongodbLog._winston.level ).toEqual( 'info' );
      expect( mongodbLog._winston.transports.mongodb.db ).toEqual( 'ISSUES' );
      expect( mongodbLog._winston.transports.mongodb.collection ).toEqual( 'testLog' );
      expect( winston.Logger.callCount ).toEqual( 1 );
    } );
    
    it( "can log to all 3 at once", function()
    {
      var allLog;
      expect( function() { allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', true, false, '/tempFile', 'ISSUES', 'testLog' ); } ).not.toThrow();
      
      expect( allLog._winston._names[ 0 ] ).toEqual( 'console' );
      expect( allLog._winston._names[ 1 ] ).toEqual( 'file' );
      expect( allLog._winston._names[ 2 ] ).toEqual( 'mongodb' );
      expect( allLog._winston._names.length ).toEqual( 3 );
      expect( allLog._winston.transports.mongodb ).toBeDefined();
      expect( allLog._winston.transports.file ).toBeDefined();
      expect( allLog._winston.transports.console ).toBeDefined();
      expect( winston.Logger.callCount ).toEqual( 1 );
    } );
    
    it( "throws an error if any parameter is not the appropriate type", function()
    {
      expect( function() { var allLog = new log( {}, 'info', true, false, '/tempFile', 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( true, 'info', true, false, '/tempFile', 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( function() {}, 'info', true, false, '/tempFile', 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( 1, 'info', true, false, '/tempFile', 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 1, true, false, '/tempFile', 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], true, true, false, '/tempFile', 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], {}, true, false, '/tempFile', 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], [], true, false, '/tempFile', 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], function() {}, true, false, '/tempFile', 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', 'true', false, '/tempFile', 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', 1, false, '/tempFile', 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', [], false, '/tempFile', 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', {}, false, '/tempFile', 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', function() {}, false, '/tempFile', 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', true, 'false', '/tempFile', 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', true, 1, '/tempFile', 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', true, [], '/tempFile', 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', true, {}, '/tempFile', 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', true, function() {}, '/tempFile', 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', true, false, 1, 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', true, false, true, 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', true, false, [], 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', true, false, {}, 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', true, false, function() {}, 'ISSUES', 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', true, false, '/tempFile', 1, 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', true, false, '/tempFile', true, 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', true, false, '/tempFile', [], 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', true, false, '/tempFile', {}, 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', true, false, '/tempFile', function() {}, 'testLog' ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', true, false, '/tempFile', 'ISSUES', 1 ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', true, false, '/tempFile', 'ISSUES', true ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', true, false, '/tempFile', 'ISSUES', [] ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', true, false, '/tempFile', 'ISSUES', {} ); } ).toThrow();
      expect( function() { var allLog = new log( [ 'console', 'file', 'mongodb' ], 'info', true, false, '/tempFile', 'ISSUES', function() {} ); } ).toThrow();
    } );
    
    it( "throws an error if the path to the file attempts to go outside the webserver root", function()
    {
      xssUtil.isPathTraversal.andReturn( true );
      expect( function() { var logger = new log( [ 'file' ], 'info', true, false, '../../../../file.txt' ); } ).toThrow();
    } );
    
    it( "is set up to not exit on error", function()
    {
      expect( function() { newlog = new log( [ 'console' ], 'info', true, false ); } ).not.toThrow();
      
      expect( winston.Logger ).toHaveBeenCalledWith( { transports : jasmine.any( Object ), 'exitOnError' : false } );      
    } );
    
  } );
  
  describe( "Testing the ability to write to each log type", function()
  {
    var path = require( 'path' );
    
    it( "Can output data to the console", function()
    {
      consoleLog = new log( [ 'console' ], 'info', true, false );
      fileLog = new log( [ 'file' ], 'info', true, false, path.join( process.cwd(), 'tempFile' ) );
      mongodbLog = new log( [ 'mongodb' ], 'info', null, false, null, 'ISSUES', 'testLog' );
      
      spyOn( consoleLog._winston, 'log' );
      spyOn( fileLog._winston, 'log' );
      spyOn( mongodbLog._winston, 'log' );
      
      expect( function() { consoleLog.log( 'info', 'Testing', { user : 'jasmine' } ); } ).not.toThrow();
      expect( function() { fileLog.log( 'info', 'Testing', { user : 'jasmine' } ); } ).not.toThrow();
      expect( function() { mongodbLog.log( 'info', 'Testing', { user : 'jasmine' } ); } ).not.toThrow();
      
      //adding undefined case for metadata
      expect( function() { consoleLog.log( 'info', 'Testing' ); } ).not.toThrow();
      
      expect( consoleLog._winston.log ).toHaveBeenCalled();
      expect( fileLog._winston.log ).toHaveBeenCalled();
      expect( mongodbLog._winston.log ).toHaveBeenCalled();
      //counter at two due to the undefined test above
      expect( consoleLog._winston.log.calls.length ).toEqual( 2 );
      expect( fileLog._winston.log.calls.length ).toEqual( 1 );
      expect( mongodbLog._winston.log.calls.length ).toEqual( 1 );
    } );
    
    it( "Throws an error if the type of any parameter is wrong", function()
    {
      consoleLog = new log( [ 'console' ], 'info', true, false );
      spyOn( consoleLog._winston, 'log' );
      
      expect( function() { consoleLog.log( 1, 'Testing', { user : 'jasmine' } ); } ).toThrow();
      expect( function() { consoleLog.log( true, 'Testing', { user : 'jasmine' } ); } ).toThrow();
      expect( function() { consoleLog.log( function() {}, 'Testing', { user : 'jasmine' } ); } ).toThrow();
      expect( function() { consoleLog.log( {}, 'Testing', { user : 'jasmine' } ); } ).toThrow();
      expect( function() { consoleLog.log( [], 'Testing', { user : 'jasmine' } ); } ).toThrow();
      expect( function() { consoleLog.log( 'info', 1, { user : 'jasmine' } ); } ).toThrow();
      expect( function() { consoleLog.log( 'info', true, { user : 'jasmine' } ); } ).toThrow();
      expect( function() { consoleLog.log( 'info', function() {}, { user : 'jasmine' } ); } ).toThrow();
      expect( function() { consoleLog.log( 'info', {}, { user : 'jasmine' } ); } ).toThrow();
      expect( function() { consoleLog.log( 'info', [], { user : 'jasmine' } ); } ).toThrow();
      expect( function() { consoleLog.log( 'info', 'Testing', 1 ); } ).toThrow();
      expect( function() { consoleLog.log( 'info', 'Testing', true ); } ).toThrow();
      expect( function() { consoleLog.log( 'info', 'Testing', function() {} ); } ).toThrow();
      expect( function() { consoleLog.log( 'info', 'Testing', [] ); } ).toThrow();
      expect( function() { consoleLog.log( 'info', 'Testing', 'string' ); } ).toThrow();
      
      expect( consoleLog._winston.log ).not.toHaveBeenCalled();
    } );
  } );
} );
