$( document ).ready( function()
{
  $( this ).find( "div.hidden" ).css( 'display', 'block' );
  $( this ).find( "div.body" ).find( 'div' ).each( function( index, value )
  {
    $( this ).css( 'background', 'none' );
  } );
  
  $( this ).find( ".val" ).css( "width", $( document ).width() * .65 - 200 );
  
  loadCodeAndTraceData( $( this ).find( 'div.body' ) );
  
  code = $( this ).find( 'div.code' );
  code.css( 'background', null );
} );