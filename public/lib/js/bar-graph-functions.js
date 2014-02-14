/**
 * Set of client side javascript functions for reports
 * 
 * @author Matthew Saltzman
 * @since 7-16-2013 
 */

//initialize some variables
var reportData = [];
var applicationType;

//Set some events as the page loads
$( document ).ready( function()
{
  applicationType = chart.titles[ 0 ].text.split( " " );

  if( applicationType[ 1 ] == "Method" )
  {
    $( "#dropdown-container.dropdown-container.application" ).css( "display", "none" );
  }
  /** 
   * OnClick Event to handle what happens when a user clicks the runReport button 
   */
  $( "button.runReport" ).click( function( event )
  {
    if( applicationType[ 0 ] == "Vulnerability" )
    {
      //get the current conf and sev values
      var conf = getConfOrSev( "#conf" );
      var sev = getConfOrSev( "#sev" );
      //grab the vulnerability type we're looking for
      var vtype = getVtype();
      var newReport = "/report?report=vulnType&conf=" + conf + "&sev=" + sev + "&beginDate=" + minDateValue.getTime() + 
                      "&endDate=" + maxDateValue.getTime();
      if( vtype != "all" )
      {
        newReport = newReport + "&vtype=" + vtype;
      }
      
      window.location.href = newReport;
    }
    else
    { 
      return false;
    }
  } );
} );

function getVtype()
{
  var appValue = $( "#app" ).text();
  if( applicationType[ 1 ] == "Type" )
  {
    if( appValue != null && appValue != undefined )
    {
      return appValue;
    }
  }
  else if( applicationType[ 1 ] == "Method" )
  {
    return chart.titles[ 0 ].text.split( ": " )[ 1 ];
  }
  else
  {
    return( "all" );
  }
}

/**
 * Function to append a new entry to the reportData object. Each should be a JSON object containing everything necessary
 * to display the graph properly
 * 
 * @param {Object} item The item to append to the report 
 */
function addNewReportData( item )
{
  
} 

//initializing a new Cwe report class
var Cwe = function() {};

Cwe.prototype = {
  /** 
   * This function creates an onClick event which calls the drilldown report
   *
   * @param {object} event - The event object 
   * @returns false if this is not the report that's supposed to have a drilldown. Nothing otherwise.
   */
  callbackForInitialCwe : function( event )
  {
    var type, reportType;
    var urlParams = $( "document" ).context.URL.split( '?' )[ 1 ].split( "&" );

    for( iter in urlParams )
    {
      var param = urlParams[ iter ].split( "=" );
      if( param[ 0 ] == "report" )
      {
        reportType = param[ 1 ];
      }
    }
    
    switch( event.item.graph.legendTextReal )
    {
      // Creates a false positive drilldown report
      case "False Positives" :
        type = "false_positive";
        break;
      // Creates a valid issues drilldown report
      case "Valid Issues" :
        type = "valid";
        break;
      case "Total Findings" :
        type = "all";
        break;
      case "Unreviewed" : 
        type = "new";
        break;
    }
  
    //Returns false if this is not the right report
    if( !type || ( ( type == "all" || type == "new" ) && reportType == "cwe" ) )
    {
      return false;
    }
    
    //New location for redirection when a bar is clicked.
    var newLocation;
  
    //if we're running a CWE report for dynamic analysis
    if( reportType == "cwe" )
    {
      //Creates the link to navigate to in order to reach the drilldown report
      newLocation = "/report?report=cwe&type=" + type + "&cwe=" + event.item.category.substring( 4, 8 );
    }
    //if we're running a static analysis vulnerability type report
    else if( reportType == "vulnType" )
    {
      //if this is the vulnerability type report
      if( event.chart.titles[ 0 ].text.split( ' ' )[ 1 ] == "Type" )
      {
        //set the conf and sev values
        var conf = getConfOrSev( "#conf" );
        var sev = getConfOrSev( "#sev" );
        
        //create a redirection URL to the static_issues page including a vtype parameter to see 
        newLocation = "/static_issues?type=" + type + "&conf=" + conf + "&sev=" + sev + "&vtype=" + 
                      event.item.category + "&app=All&project=All";
      } 
      //if this is a vulnerability API report instead
      else if( event.chart.titles[ 0 ].text.split( ' ' )[ 1 ] == "Method" )
      {
        //get the conf and sev values
        var conf = getConfOrSev( "#conf" );
        var sev = getConfOrSev( "#sev" );
        
        //get the vtype parameter from the url        
        var vtype = getUrlParameter( $( document ).context.URL, "vtype" );
        
        //create a redirection URL that contains both vtype and method
        newLocation = "/static_issues?type=" + type + "&conf=" + conf + "&sev=" + sev + "&vtype=" + vtype + "&method=" + 
                      event.item.category + "&app=All&project=All";
      }
    }
    
    //breaking out the redirect action for simpler unit testing
    window.location.href = newLocation;
  },
  
  /**
   * All this does is redirect the browser to the URL provided. This needs to be enhanced to validate 
   * that the URL being passed in is actually a relative url.
   *  
   * @param {Object} relativeUrl - The URL to redirect the user to. 
   */
  redirect : function( relativeUrl )
  {
    location.href = relativeUrl;
  }  
};