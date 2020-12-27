export const displayMap = locations => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoibmVlbDA0NSIsImEiOiJja2oyYzBkbDYzOWk4MnhzY2N3azVwOW9iIn0.D-hDSIaUkOzRC2KmJKZ26A';

  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/neel045/ckj2dfj8gai3c19qkoaddcvdr',
    scrollZoom: false
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach(loc => {
    //create marker
    const el = document.createElement('div');
    el.className = 'marker';

    //Add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom'
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    //Add Popup
    new mapboxgl.Popup({
      offset: 30
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day :${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    //Extends map bounds to include to current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 100,
      left: 100,
      right: 100
    }
  });
};
