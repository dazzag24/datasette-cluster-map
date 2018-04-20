# datasette-cluster-map

A [Datasette plugin](http://datasette.readthedocs.io/en/latest/plugins.html) that detects tables with `latitude` and `longitude` columns and then plots them on a map using [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster).

## Demo

https://datasette-cluster-map-demo.now.sh/ hosts a demo of this plugin running against several different tables.

![Cluster map demo](https://static.simonwillison.net/static/2018/datasette-cluster-map.png)

## Installation

Run `pip install datasette-cluster-map` to add this plugin to your Datasette virtual environment. Datasette will automatically include the plugin if it is installed in this way.

If you are deploying using the `datasette publish` command you can use the `--install` option:

    datasette publish now mydb.db --install=datasette-cluster-map

If any of your tables have a `latitude` and `longitude` column, a map will be automatically displayed.

If you columns are called something else you can still get the map to display by using a custom SQL query to alias those columns to `latitude` and `longitude`, [for example](https://datasette-cluster-map-demo.now.sh/polar-bears-455fe3a?sql=select+*%2C+%22Capture+Latitude%22+as+latitude%2C+%22Capture+Longitude%22+as+longitude+from+[USGS_WC_eartag_deployments_2009-2011]):

    select *, "Capture Latitude" as latitude, "Capture Longitude" as longitude
    from [USGS_WC_eartag_deployments_2009-2011]

## How I deployed the demo

I deploy this demo using the latest master versions of both datasette and datasette-cluster-map like so:

    datasette publish now --branch=master \
        --install=https://github.com/simonw/datasette-cluster-map/archive/master.zip \
        --extra-options "--page_size=500" \
        --name="datasette-cluster-map-demo" \
        polar-bears.db sf-trees.db
