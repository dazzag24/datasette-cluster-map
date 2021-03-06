document.addEventListener('DOMContentLoaded', () => {
    // Only execute on table, query and row pages
    if (document.querySelector('body.table,body.row,body.query')) {
        // Does it have Latitude and Longitude columns?
        let columns = Array.prototype.map.call(
            document.querySelectorAll('table.rows-and-columns th'),
            (th) => th.textContent.trim()
        );
        let latitudeColumn = null;
        let longitudeColumn = null;
        columns.forEach((col) => {
            if (col.toLowerCase() == (window.DATASETTE_CLUSTER_MAP_LATITUDE_COLUMN || 'latitude').toLowerCase()) {
                latitudeColumn = col;
            }
            if (col.toLowerCase() == (window.DATASETTE_CLUSTER_MAP_LONGITUDE_COLUMN || 'longitude').toLowerCase()) {
                longitudeColumn = col;
            }
        });
        if (latitudeColumn && longitudeColumn) {

            leafletTileProvider = window.DATASETTE_CLUSTER_MAP_LEAFLET_TILE_PROVIDER || 'OpenStreetMap.Mapnik'
            leafletZoomOnClick = window.DATASETTE_CLUSTER_MAP_LEAFLET_ZOOM_ON_CLICK || false
            addClusterMap(latitudeColumn, longitudeColumn, leafletTileProvider, leafletZoomOnClick);
        }
    }
});

const addClusterMap = (latitudeColumn, longitudeColumn, leafletTileProvider, leafletZoomOnClick) => {
    let keepGoing = false;

    const loadMarkers = (path, map, markerClusterGroup, progressDiv, count) => {
        count = count || 0;
        return fetch(path).then(r => r.json()).then(data => {
            let markerList = [];

            // None of these instructions seemed to work
            // https://stackoverflow.com/questions/41590102/change-leaflet-marker-icon
            // https://leafletjs.com/reference-1.4.0.html#icon-default

            // Also tried this....
            // https://github.com/pointhi/leaflet-color-markers
            //var icon = L.Icon.Default.imagePath = 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/';
            //var mainIcon = L.icon({
            //    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
            //    shadowUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png'

            /*
            // And this.....
            //https://plnkr.co/edit/HBs6K6rddLbqRDLa3Ssi?p=preview
            var icon = L.Icon.Default.imagePath = 'https://unilocal-372f.kxcdn.com/build/img/leaflet/';
            var mainIcon = L.icon({
                iconUrl: L.Icon.Default.imagePath + 'marker-icon.png',
                shadowUrl: L.Icon.Default.imagePath + 'marker-shadow.png',
                //iconSize:     [24, 32],
                //shadowSize:   [41, 41],
                //iconAnchor:   [12, 32],
                //shadowAnchor: [14, 41],
                //popupAnchor:  [0, -32]
            });

            //var this_org_mark = L.marker([57.7, 11.9], {icon: mainIcon}).addTo(map);
            //markerList.push(this_org_mark);
            */

            data.rows.forEach((row) => {
                if (row[latitudeColumn] && row[longitudeColumn]) {
                    if (row['url'] && row['name'] && row['elevation'] && row['latitude'] && row['longitude']) {

                        let marker = L.marker(
                            L.latLng(
                                row[latitudeColumn],
                                row[longitudeColumn]
                            ),
                            {title: row['name']}
                            //{icon: mainIcon}
                        );
                        var info = '<a href="' + row['url'] + '">' + row['name'] + '</a><br>'
                        info += 'ICAO: ' + row['icao'] + '<br>IATA: ' + row['iata'] + '<br>'
                        info += 'Elevation: ' + row['elevation'] + ' ft<br>'
                        info += 'Old ICAO: ' + row['old_icao'] + '<br>'
                        info += 'Regional Code: ' + row['regional_code'] + '<br>'
                        info += 'Closed Date: ' + row['closed_date'] + '<br>'
                        var gmap = 'https://maps.google.com/maps?ll=' + row['latitude'] + ',' + row['longitude'] + '&hl=en&t=h&z=15'
                        info += 'Location: <a href="' + gmap + '">' + row['latitude'] + ',' + row['longitude'] + '</a><br>'
                        marker.bindPopup('<b style="height: 200px; overflow: auto">' + info + '</b>');
                        markerList.push(marker);
                    } else {
                        let title = JSON.stringify(row, null, 4);
                        let marker = L.marker(
                            L.latLng(
                                row[latitudeColumn],
                                row[longitudeColumn]
                            ),
                            {title: title}
                        );
                        marker.bindPopup('<pre style="height: 200px; overflow: auto">' + title + '</pre>');
                        markerList.push(marker);
                    }
                }
            });

            count += data.rows.length;
            markerClusterGroup.addLayers(markerList);
            map.fitBounds(markerClusterGroup.getBounds());
            let percent = '';
            let button;
            // Fix for http v.s. https
            let next_url = data.next_url;
            if (next_url && location.protocol == 'https:') {
                next_url = next_url.replace(/^https?:/, 'https:');
            }
            if (next_url) {
                percent = ` (${Math.round((count / data.filtered_table_rows_count * 100) * 100) / 100}%)`;
                // Add a control to either continue loading or pause
                button = document.createElement('button');
                button.style.color = '#fff';
                button.style.backgroundColor = '#007bff';
                button.style.borderColor = '#007bff';
                button.style.verticalAlign = 'middle';
                button.style.cursor = 'pointer';
                button.style.border = '1px solid blue';
                button.style.padding = '0.3em 0.8em';
                button.style.fontSize = '0.6rem';
                button.style.lineHeight = '1';
                button.style.borderRadius = '.25rem';
                if (keepGoing) {
                    button.innerHTML = 'pause';
                    button.addEventListener('click', () => {
                        keepGoing = false;
                    });
                } else {
                    button.innerHTML = 'load all';
                    button.addEventListener('click', () => {
                        keepGoing = true;
                        loadMarkers(
                            next_url,
                            map,
                            markerClusterGroup,
                            progressDiv,
                            count,
                            keepGoing
                        );
                    });
                }
                progressDiv.innerHTML = `Showing ${count.toLocaleString()} of ${data.filtered_table_rows_count.toLocaleString()}${percent} `;
                if (button) {
                    progressDiv.appendChild(button);
                }
            } else {
                progressDiv.innerHTML = '';
            }
            if (next_url && keepGoing) {
                return loadMarkers(
                    next_url,
                    map,
                    markerClusterGroup,
                    progressDiv,
                    count
                );
            }
        });
    };

    let el = document.createElement('div');
    el.style.width = '100%';
    el.style.height = '500px';
    let tiles = L.tileLayer.provider(leafletTileProvider);
    latlng = L.latLng(0, 0);
    let map = L.map(el, {
        //center: latlng,
        zoom: 13,
        layers: [tiles]
    });
    if (leafletZoomOnClick) {
        map.scrollWheelZoom.disable();
        map.on('focus', () => { map.scrollWheelZoom.enable(); });
        map.on('blur', () => { map.scrollWheelZoom.disable(); });
    }
    let table = document.querySelector('table.rows-and-columns');
    table.parentNode.insertBefore(el, table);
    let progressDiv = document.createElement('div');
    progressDiv.style.marginBottom = '2em';
    el.parentNode.insertBefore(progressDiv, el.nextSibling);
    let markerClusterGroup = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50
    });
    map.addLayer(markerClusterGroup);
    let path = location.pathname + '.jsono' + location.search;
    if (path.indexOf('?') > -1) {
        path += '&_size=max';
    } else {
        path += '?_size=max';
    }
    loadMarkers(path, map, markerClusterGroup, progressDiv, 0);
};
