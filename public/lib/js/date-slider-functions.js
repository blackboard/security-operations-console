var minDateValue = new Date( 2013, 0, 1 );
var maxDateValue = new Date();

$( document ).ready( function()
{
  /**
   * Initialize the date range selector to limit issues to the selected area 
   */
  $( "#slider" ).dateRangeSlider( { 
    bounds : {
      min : new Date( 2013, 0, 1 ),
      max : new Date()
    },
    defaultValues : {
      min : new Date( 2013, 0, 1 ),
      max : new Date()
    }  
  } );
  //Adding some css here rather than via stylesheet since stylesheet setting will be ignored
  $( "#slider" ).css( "width", "620px" );
  $( "#slider" ).css( "font-size", "xx-small" );
  
    /**
   * Event to record the min and max date (no hours) when the date slider values have changed 
   */
  $( "#slider" ).bind( "valuesChanged", function( e, data )
  {
    data.values.min.setHours( 0, 0, 0, 0 );
    data.values.max.setHours( 0, 0, 0, 0 );
    
    minDateValue = data.values.min;
    maxDateValue = data.values.max;
  } );
  
} ); 