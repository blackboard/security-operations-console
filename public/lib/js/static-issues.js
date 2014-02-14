/**
 * Set of client side javascript functions for the static issues list display
 * 
 * @author Matthew Saltzman
 * @since 8-26-2013 
 */

var applicationType = "Application";

function loadCodeAndTraceData( object )
{
  //set up the parameters for the ajax request to populate the code and taint trace data
  var id = object.attr( "id" );
  if( !id )
  {
    id = object.find( 'div.information' ).attr( "id" );
  }
  
  var ln = object.find( "[id='ln']" ).text();
  
  //build the URL for getting the trace data and/or code if any exists
  var url = "/getTraceAndCode?_id=" + id;   
  
  //make an ajax call the URL built above 
  $.ajax( { "url" : url } ).done( function( data )
  {
    //parse the data returned into a JSON object
    var toInsert = JSON.parse( data );
    
    //if there is taint trace data
    if( toInsert.taint_trace )
    {
    
      //grab the taint trace table row and subsequent tables' tbody element
      var trToChange = object.find( "tr.hidden" );
      var tbody = object.find( "table.taintTrace" ).find( "tbody" );

      //iterate through each trace element
      for( iter in toInsert.taint_trace )
      {
        if( !isNaN( iter ) )
        {
          var currItem = toInsert.taint_trace[ iter ];
          //build the taint trace table from the information provided back to us
          var tr = "<tr class='issues'><td class='issues'><div>" + currItem.taint_id + "</div></td>" +
                   "<td class='issues'><div>" + currItem.parent_id + "</div></td><td class='issues'><div>" + 
                   currItem.site.file + "</div></td><td class='issues'><div>" + currItem.site.method + 
                   "</div></td><td class='issues'><div>" + currItem.site.ln + "</div></td><td class='issues'><div>" + 
                   currItem.arg_name + "</div></td></tr>";
          //append the new table row to the taint trace table
          tbody.append( tr );
        }
      }
      
      //once the taint trace table is built, show the taint trace table
      trToChange.css( 'display', "table-row" );
    }
    
    //if there is code to display
    if( ln != 0 && toInsert.code )
    {
      var code = "";
      var keys = Object.keys( toInsert.code );
      //iterate through the set of keys in the code object
      for( iter in keys )
      {
        if( !isNaN( iter ) )
        {
          var key = keys[ iter ];
          var currItem = toInsert.code[ key ];
          
          if( currItem != "" )
          {
            currItem = $ESAPI.encoder().encodeForHTML( $ESAPI.encoder().cananicalize( currItem ) );
          }
          
          //if the current line matches the vulnerable line of code
          if( key == ln )
          {
            //highlight this line of code in red
            code = code + "<span class='vulnerable'>" + key + "    " + currItem + "</span>";
          }
          //if this is not the vulnerable line of code
          else
          {
            code = code + "<span>" + key + "    " + currItem + "</span>";
          }
          //add a line break to the end of each line
          code = code + "<br />";
        }
      }
      
      //get the div that will contain the code block
      var codeDiv = object.find( "div.code" );
      //append the code block to the div
      codeDiv.append( code );
      //display the code block
      codeDiv.css( 'display', 'block' );
    }
  } );
}

//Set some events as the page loads
$( document ).ready( function()
{
  //initializie the ESAPI filter
  Base.esapi.properties.application.Name = "My Application v1.0";
  org.owasp.esapi.ESAPI.initialize();
  
  /**
   * Function to update the name of the selected application. Either creates a new span class to
   * do it, in the case where no application was selected, or updates the span with the application
   * name if one is already chosen.
   */
  $( "a.project" ).live( "click", function()
  {
    //If the span with id=app already exists, just update the text of the span
    if( $( "#project" ).length > 0 )
    {
      $( "#dropdown-container.project #project" ).text( $( this ).text() );
    }
    //if the span does not exist, create it, and update the background color of the selector 
    else
    {
      $( "#dropdown-container.project span" ).text( "Project: " );
      $( "#dropdown-container.project" ).append( "<span id='project'>" + $( this ).text() + "</span>" );
      $( "#dropdown-container.project" ).css( "background", "#599FEB" );
    }
  } );
  
  /** 
   * OnClick Event to handle what happens when a user clicks the runReport button 
   */
  $( "button.runReport" ).click( function( event )
  {
    //get the conf, sev, and application currently selected
    var conf = getConfOrSev( "#conf" );
    var sev = getConfOrSev( "#sev" );
    var app = getApp( "#app" );
    var project = getApp( "#project" );
    //get the review status we're currently working on
    var reviewStatus = getConfOrSev( "#type" );
        
    window.location.href="/static_issues?conf=" + conf + "&sev=" + sev + "&app=" + app + "&type=" + reviewStatus + "&project=" + 
                         project + "&beginDate=" + minDateValue.getTime() + "&endDate=" + maxDateValue.getTime();
  } );
  
  /**
   * OnClick event for each row in the list, displaying the lightbox containing the drilldown information 
   */
  $( 'tr[ id ]' ).colorbox( { width: "65%", height : "80%", html : function()
  {
    var a =  $( this ).find( "div.hidden" ).clone();
    a.css( 'display', 'block' );
    a.find( ".val" ).css( "width", $( document ).width() * .65 - 200 ).clone();
  
    loadCodeAndTraceData( $( a ) );   
    
    return a;
  } } );

  /**
   * Make the trace element expand only when desired, hiding it otherwise 
   */
  $( "#trace" ).live( "click", function( event )
  {
    //if clicked when already opened
    if( $( this ).hasClass( "open" ) )
    {
      //remove the open class
      $( this ).removeClass( "open" );
      //Shrink the box back to just the header
      $( this ).css( "overflow", "hidden" );
      $( this ).animate( { height : "32px" }, { duration : 100, queue : false } );
      
    }
    //if clicked when closed
    else
    {
      //Add the "open" class
      $( this ).addClass( "open" );
      //Expand the trace data box to display the trace data
      $( this ).css( "overflow", "auto" );
      $( this ).animate( { height: "164px"}, { duration : 100, queue : false } );
    }
  } );
  
  /**
   * Function to append the conf and sev values as parameters to the form prior to submitting it 
   */
  $( "form.review" ).live( "submit", function( event )
  {
    //grab the conf and sev values
    var conf = getConfOrSev( "#conf" );
    var sev = getConfOrSev( "#sev" );
    
    //get the current review status
    var type = getReviewStatus();
    
    //create hidden fields to hold those values
    var confInput = $( "<input>" ).attr( "type", "hidden" ).attr( "name", "conf" ).val( conf );
    var sevInput = $( "<input>" ).attr( "type", "hidden" ).attr( "name", "sev" ).val( sev );
    
    //if the review status was anything other than null
    if( type != null )
    {
      var reviewInput = $( "<input>" ).attr( "type", "hidden" ).attr( "name", "reviewStatus" ).val( type );
      $( "form.review" ).append( $( reviewInput ) );
    }
    
    //add the hidden fields to the page
    $( "form.review" ).append( $( confInput ) );
    $( "form.review" ).append( $( sevInput ) );
  } );
} );

/**
 * Function to return the name of the application for which the user would like to see a list of unreviewed vulnerabilities. It
 * will either be the one selected by the dropdown, or the same one that was in the URL parameter app, if none has been selected.
 *  
 * @param {String} appId The id of the span containing the app name, if it exists
 * @returns {String}
 */
function getApp( appId )
{
  //the return value, to be set later
  var retVal;
  
  //if the span containing the application name exists, set retVal to that value
  if( $( appId ).length > 0 )
  {
    retVal = $( appId ).text();
  }
  //if the span does not exists, grab it from the URL
  else
  {
    //variable deciding what URL parameter we want to find
    var toFind;
    switch( appId )
    {
      //if we're searching for app, set the parameter name to app
      case "#app" :
        toFind = 'app';
        break;
      //if we're searching for a project, set the parameter name to project
      case "#project" :
        toFind = "project";
        break;
      //if it's anything else, assume it's supposed to be an app
      default :
        toFind = "app";
        break;
    }
    //Split the URL on ? to obtain just the list of parameters, then split into individual parameters
    var params = $( document ).context.URL.split( '?' )[ 1 ].split( '&' );
    //iterate through each parameter
    for( iter in params )
    {
      //make sure this parameter is a string before continuing
      if( typeof params[ iter ] == "string" )
      {
        //split the parameter into key/value pairs
        var param = params[ iter ].split( "=" );
        //If the key of the parameter is app
        if( param[ 0 ] == toFind )
        {
          //set the return value to the value of the app parameter
          retVal = param[ 1 ];
        }
      }
    }
  }
  
  //return the result
  return retVal;
}

/**
 * Function to return the review status from the URL
 * 
 * @returns {String} 
 */
function getReviewStatus()
{
  var params = $( document ).context.URL.split( '?' )[ 1 ].split( '&' );
  
  //set up a return value for later  
  var retVal;
  
  //iterate through the list of parameters
  for( paramIter in params )
  {
    //store the parameter to a value
    var param = params[ paramIter ];
    
    //if the parameter we're working with is a string
    if( typeof param == "string" )
    {
      //parse the parameter into key( [ 0 ] ), and value( [ 1 ] )
      var parsedParam = param.split( "=" );
      
      //if the type parameter is in the URL, set the return value to it, otherwise, it remains null
      if( parsedParam[ 0 ] == "type" )
      {
        retVal = parsedParam[ 1 ];
      }
    }
  }
  
  //return the return value, which will either be null or the current string
  return retVal;
}
