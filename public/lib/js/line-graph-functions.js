$( document ).ready( function()
{
  /** 
   * OnClick Event to handle what happens when a user clicks the runReport button 
   */
  $( "button.runReport" ).click( function( event )
  {
    window.location.href = "/report?report=issuesByDate&minDate=" + minDateValue.getTime() + "&maxDate=" + maxDateValue.getTime();
  } );
} );

var drilldownReport = function( event )
{
  window.location.href = "/report?report=issuesOnDate&date=" + event.item.category;
};
