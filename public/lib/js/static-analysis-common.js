/**
 * Some common functionality to many different facets of static analysis, be it
 * reporting, issue review, etc.
 * 
 * @author Matthew Saltzman
 * @since 8-28-2013
 */

//Set some events as the page loads
$( document ).ready( function()
{
  /**
   * On load of each selector item, enable it if the selector was passed in 
   */ 
  $( "div.selector" ).each( function( index )
  {
    //if the selector was passed in, change the background to blue
    if( isOn( $( document ).context.URL, $( this ).text() ) )
    {
      $( this ).css( "background", "#599FEB" );
    }
  } );

  /**
   * OnClick event for each selector element on the page, should one exist. Sets the color of the selector element,
   * and will also update the graph to include the newly selected elements, or update the graph to exclude the de-selected
   * elements.  
   */
  $( "div.selector" ).click( function( event )
  {
    //grab the current background color
    var background = rgb2hex( $( this ).css( "background-color" ) );
    
    //If the background color is currently grey
    if( background == "#a2a6ab" )
    {
      //if this is the review status only, set the rest of the review boxes to grey
      if( $( this ).parent().attr( "id" ) == "type" )
      {
        $( this ).parent().children().css( "background", "#a2a6ab" );
      }
      //set it to blue
      $( this ).css( "background", "#599FEB" );
    }
    //Otherwise, set it back to the default grey
    else
    {
      $( this ).css( "background", "#A2A6AB" );
    }
  } );
  
  /**
   * Function to update the name of the selected application. Either creates a new span class to
   * do it, in the case where no application was selected, or updates the span with the application
   * name if one is already chosen.
   */
  $( "a.application" ).click( function()
  {
    var text = $( this ).text();
    var substringText = text.substr( 0, $( this ).text().indexOf( '(' ) - 2 );
    
    if( substringText )
    {
      text = substringText;
    }
    
    //If the span with id=app already exists, just update the text of the span
    if( $( "#app" ).length > 0 )
    {
      $( "#dropdown-container.application #app" ).text( text );
    }
    //if the span does not exist, create it, and update the background color of the selector 
    else
    {
      if( applicationType == "Application" )
      {
        $( "#dropdown-container.application span#appName" ).text( applicationType + ": " );
      }
      else
      {
        $( "#dropdown-container.application span#appName" ).text( applicationType[ 0 ] + " " + applicationType[ 1 ] + ": " );
      }
      
      $( "#dropdown-container.application" ).append( "<span id='app'>" + text + "</span>" );
      $( "#dropdown-container.application" ).css( "background", "#599FEB" );
    }
    
    if( $( "ul.projects" ).length )
    {
      //Create an ajax request to populate the projects dropdown list
      $.ajax( { url : "/getProjectList?app=" + text } ).done( function( data )
      {
        //remove the project anchor tags in the project dropdown
        $( "a.project" ).remove();
        //remove the list item tags within the project dropdown
        $( "li.project" ).remove();
        
        //split the results up into an array
        var projects = data.split( "," );
  
        //iterate through the list of projects
        for( iter in projects )
        {
          if( typeof projects[ iter ] == "string" )
          {
            //add a list item to the unordered list as a selector
            $( "ul.projects" ).append( "<li class='project'><a class='project'>" + projects[ iter ] + "</a></li>" );
          }
        }
      } );
    }
  } );
  
  $( "#dropdown-container" ).live( "click", function()
  {
    //If the dropdown menu is not currently active, make it active
    if( !$( this ).hasClass( 'active' ) )
    {
      $( this ).addClass( 'active' );
    }
    //If the dropdown menu is not active, make it inactive
    else
    {
      $( this ).removeClass( 'active' );
    }
  } );
} );

/**
 * Function to grab the current confidence and severity rating from the document's URL.
 * 
 * @param url The current URL, containing the parameters
 * @returns {boolean}
 */
function isOn( url, text )
{
  var params = url.split( '?' )[ 1 ].split( '&' );
    
  //Go through all parameters passed in
  for( iter in params )
  {
    //Make sure the current parameter is a string
    if( typeof params[ iter ] == 'string' )
    {
      //the current parameter
      var param = params[ iter ].split( "=" );
      
      //if the parameter is valid, parse it
      if( param[ 0 ] == 'conf' || param[ 0 ] == 'sev' || param[ 0 ] == "type" )
      {
        //could be conf or sev parameter, since the parameter is valid
        conf = param[ 1 ].split( ',' );
        //iterate through all the confidence ratings this report is on
        for( i in conf )
        {
          //make sure the current conf item is a string
          if( typeof conf[ i ] == 'string' )
          {
            //if the confidence rating matches the element's text return true
            if( conf[ i ].replace( "%20", " ") == text )
            {
              return true;
            }
          }
        }
      }
    }
  }
  
  //return false if this element is not selected
  return( false );
}

/**
 * Function to grab a specific parameter from the URL passed into this function
 * 
 * @param {string} url The url potentially containing the parameter we're looking for
 * @param {string} paramName The parameter we're looking for
 * @returns {string} 
 */
function getUrlParameter( url, paramName )
{
  //get the list of parameters
  var params = url.split( '?' )[ 1 ].split( '&' );
  //return value for this function
  var retVal = null;    
    
  //Go through all parameters passed in
  for( iter in params )
  {
    //Make sure the current parameter is a string
    if( typeof params[ iter ] == 'string' )
    {
      //the current parameter
      var param = params[ iter ].split( "=" );
      
      //if this parameter is the one we want, set retVal to its' value
      if( param[ 0 ].replace( "%20", " ") == paramName )
      {
        retVal = param[ 1 ].replace( "%20", " ");
      }
    }
  }
  
  //return false if this element is not selected
  return( retVal );
}

/**
 * Function to get the list of available confidence or severity ratings, by which selectors are blue.
 * 
 * @param confOrSev either #conf or #sev
 * @throws error If the parameter is not #conf or #sev 
 * @returns {string}
 */
function getConfOrSev( confOrSev )
{
  //the return value 
  var conf;
  //if the parameter is invalid, throw an error
  if( confOrSev != '#conf' && confOrSev != "#sev" && confOrSev != "#type" )
  {
    throw new Error( "Unhandled value found" );
  }
  
  //Go through the list of children for this element
  $( confOrSev ).children().each( function()
  {
    //if the element is set to yes, add it to the string
    if( rgb2hex( $( this ).css( "background-color" ) ) == "#599feb" )
    {
      //if the variable has text in it
      if( conf )
      {
        conf = conf + ',' + $( this ).text();
      }
      //if the variable does not have text in it
      else
      {
        conf = $( this ).text();
      }
    }
  } );
  
  //return the parameter
  return( conf );
}

/**
 * Function to convert rgb color to hex color, borrowed from:
 * http://wowmotty.blogspot.com/2009/06/convert-jquery-rgb-output-to-hex-color.html
 * 
 * Need in order to do a proper match on the current div.selector color
 * 
 * @param rgb The current background color (in rgb)
 * @returns {string}
 */
function rgb2hex( rgb )
{
  rgb = rgb.match( /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/ );
  
  //if the matcher did not match, return null  
  if( !rgb )
  {
    return null;
  }
  //if the matcher was successful, convert the the rgb value to hex
  else
  {
    return "#" +
     ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
     ("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
     ("0" + parseInt(rgb[3],10).toString(16)).slice(-2); 
  }
}