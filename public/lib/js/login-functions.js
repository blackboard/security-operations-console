function resizeItems() {
  $( "div.container" ).width( $( window ).width() * .25 );
  $( "div.container" ).height( $( window ).height() * .35 );
  $( "iframe.javadoc" ).height( $( window ).height() * .35 );
  $( "iframe.coverage" ).height( $( window ).height() * .5 );
}
      
$( document ).ready( function() 
{
  $( window ).resize( function() 
  {
    resizeItems();  
  } );
  
  resizeItems();
} );