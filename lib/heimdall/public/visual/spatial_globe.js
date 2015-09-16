// Globe spatial visual
//
// Author: Douglas Triggs (douglas@triggs.org)
//
// Links to be displayed on the map should be set as :links and passed in a list
// containing hashes with the following values: name, lat, lon, size, script, and
// color; size, script and color are optional, other parameters are required or the
// locations won't be plotted.  Script in turn should be a hash with name and args
// values; color should have the values low, high, limit, and query; low is the
// color for under the limit, high the opposit, and query should be a hash with the
// name of the query to send to the server and the query value to pass.
//
// An example script:
/*
coords = [
  ['Seattle', 47.609722, -122.333056, 3.0],
  ['San Francisco', 37.783333, -122.416667, 2.4],
  ['London', 51.507222, -0.1275, 2.2],
  ['Hong Kong', 22.3, 114.2, 1.8],
  ['New York', 40.7127, -74.0059, 1.5],
  ['Bangalore', 12.966667, 77.566667, 1.4],
  ['Atlanta', 33.755, -84.39, 0.9],
  ['Tokyo', 35.683333, 139.683333, 0.9],
  ['Denver', 39.76185, -104.881105, 0.8],
  ['Singapore', 1.3, 103.8, 0.8],
  ['Santiago', -33.45, -70.666667, 0.7],
  ['Chicago', 41.836944, -87.684722, 0.7],
  ['Berlin', 52.516667, 13.383333, 0.6],
  ['Houston', 29.762778, -95.383056, 0.6],
  ['Sydney', -33.865, 151.209444, 0.5],
  ['Johannesburg', -26.204444, 28.045556, 0.5]
]

links = []
coords.each do |coord|
  query = '{"center":1.0, "perturb":0.1, "correction":0.025, "id":"' +
          coord[0] + '"}'
  links.push(
    {
      name: coord[0], lat: coord[1], lon: coord[2], size: coord[3],
      script: {name: 'chef-server', args: {}},
      color: {query: {name: 'debug-random', query: query},
              limit: 0.95, high: '#7C9', low: '#F66'}
    }
  )
end

visual 'spatial-globe' do
  set :links, links
end
 */

function encapsulateSpatialGlobeVisual() {
    Heimdall.registerVisual('spatial-globe', function(id, execute, args) {
        var containerName = 'spatial-globe-container';
        var canvasName = 'spatial-globe-canvas';
        var svgName = 'spatial-globe-svg';

        var width;
        var height;

        // Sub-div makes everything work better (like suppressing scrollbars when
        // things refuse to line up properly)
        $(id).html('<div id="' + containerName + '"></div>');

        var speed = 0.01;
        var lastRotate = Date.now();
        var lastColor = 0;
        var accum = 0;
        var tilt = -15;
        var rotateSphere = true;
        var colorSphere = true;

        var sphere = {type: "Sphere"};
        var graticule = d3.geo.graticule();

        var projection;
        var map = {};
        var canvas;
        var context;
        var path;
        var svg;

        // Function for toggling rotation (changes the button text, plus toggles the
        // value that's checked for rotation)
        function toggleRotation() {
            if (rotateSphere) {
                d3.select('#spatial-globe-toggle-rotation')
                    .text('start rotation');
                rotateSphere = false;
            } else {
                accum = projection.rotate()[0];
                tilt = projection.rotate()[1];
                d3.select('#spatial-globe-toggle-rotation')
                    .text('stop rotation');
                rotateSphere = true;
            }
        };

        // Function for toggling color (changes the button text, turns off color,
        // plus toggles the value that's checked for updating colors)
        function toggleColor() {
            if (colorSphere) {
                for (var i = 0; i < execute.block.links.length; i++) {
                    var link = execute.block.links[i];
                    if (link.name == null || link.lat == null || link.lon == null) {
                        continue;
                    }
                    var draw = drawLinks[i];
                    var side = sideLinks[i];
                    draw.transition().duration(5)
                        .attr('fill', '#FFF');
                    side.transition().duration(1000).delay(100)
                        .attr('fill', '#FFF');
                }
                d3.select('#spatial-globe-toggle-color')
                    .text('start color updates');
                colorSphere = false;
            } else {
                d3.select('#spatial-globe-toggle-color')
                    .text('stop color updates');
                colorSphere = true;
            }
        };

        // Zooms the globe to the selected location
        function zoomToLink(link) {
            return function () {
                rotateSphere = false;
                d3.select('#spatial-globe-toggle-rotation')
                    .text('start rotation');
                d3.transition().duration(2500)
                    .tween("rotate", function() {
                        var p = [link.lon, link.lat],
                            r = d3.interpolate(projection.rotate(), [-p[0], -p[1]]);
                        return function(t) {
                            projection.rotate(r(t));
                            drawSphere();
                        };
                    });
            }
        };

        // Executes the script for the selected location
        function executeLink(script, args) {
            $('#' + canvasName).remove();
            $('#' + svgName).remove();

            resizeSensor.detach();
            Heimdall.run(id, script, args);
        };

        var drawLinks;
        var sideLinks;

        // Draws all the static items, also creates the locations we move around on
        // the sphere
        function setupSphere() {
            width = $(id).width();
            height = $(id).height();

            projection = d3.geo.orthographic()
                .scale(height / 2.1)
                .translate([width / 2, height / 2])
                .clipAngle(90)
                .precision(.5);

            map.width = width;
            map.height = height;

            map.canvas = d3.select('#' + containerName).append("canvas")
                .attr("id", canvasName)
                .attr("width", map.width)
                .attr("height", map.height);
            canvas = map.canvas;

            context = canvas.node().getContext("2d");
            path = d3.geo.path()
                .projection(projection)
                .context(context);   

            map.svg = d3.select('#' + containerName).append("svg")
                .attr("width", map.width)
                .attr("height", map.height)
                .attr("id", svgName)
                .style("position", "absolute")
                .style("top", $(id).offset().top)
                .style("left", $(id).offset().left)
                .style("background", "rgba(255,255,255,0)")
                .append("g");
            svg = map.svg;

            // These two are the rotation toggle "button"
            svg.append('rect')
                .attr('x', 10)
                .attr('y', 10)
                .attr('width', 16)
                .attr('height', 16)
                .attr('fill', '#FFF')
                .attr('stroke', '#333')
                .attr('stroke-width', '2')
                .on('click', toggleRotation);

            svg.append('text')
                .attr('x', 32)
                .attr('y', 23)
                .text('stop rotation')
                .attr('id', 'spatial-globe-toggle-rotation')
                .attr('font-family', 'sans-serif')
                .attr('font-size', 14)
                .attr('text-anchor', 'left')
                .attr('fill', '#555')
                .on('click', toggleRotation);

            var showColorControl = false;
            drawLinks = [];
            sideLinks = [];
            if (execute.block.links) {
                // First check to see if anything needs to be colored; this changes
                // the layout, since if nothing has any color, we don't need a
                // button to toggle color updates
                for (var i = 0; i < execute.block.links.length; i++) {
                    var link = execute.block.links[i];
                    if (link.color) {
                        showColorControl = true;
                    }
                };

                // For each of the links/locations:
                for (var i = 0; i < execute.block.links.length; i++) {
                    var link = execute.block.links[i];
                    if (link.name == null || link.lat == null || link.lon == null) {
                        continue;
                    }
                    // Offset if we have colors
                    var offset = 0;
                    if (showColorControl) {
                        offset = 1;
                    }
                    // Legend/controls for the "sidebar"
                    sideLinks[i] = svg.append('circle')
                        .attr('cx', 18)
                        .attr('cy', (i+1+offset)*28 + 28)
                        .attr('r', 9)
                        .attr('fill', '#FFF')
                        .attr('stroke', '#333')
                        .attr('stroke-width', '2')
                        .on('click', zoomToLink(link));

                    svg.append('text')
                        .attr('x', 32)
                        .attr('y', (i+1+offset)*28 + 33)
                        .text(link.name)
                        .attr('font-family', 'sans-serif')
                        .attr('font-size', 14)
                        .attr('text-anchor', 'left')
                        .attr('fill', '#555')
                        .on('click', zoomToLink(link));

                    // Circles for on the sphere
                    var size = link.size == null ? 9 : 9 * Math.sqrt(link.size);
                    function resize(r) {
                        return function() {
                            d3.select(this).transition().duration(200).attr('r', r);
                        }
                    }
                    drawLinks[i] = svg.append("circle")
                        .attr('cx', -100)
                        .attr('cy', -100)
                        .attr('r', size)
                        .attr('fill', '#FFF')
                        .attr('stroke', '#333')
                        .attr('stroke-width', '2')
                        .on('click', function () {
                            if (link.script && link.script.name) {
                                executeLink(link.script.name, link.script.args);
                            };
                        })
                        .on('mouseover', resize(size < 9 ? 13.5 : size * 1.5))
                        .on('mouseout', resize(size));
                }
            };

            // Color update toggle (if we need it)
            if (showColorControl) {
                svg.append('rect')
                    .attr('x', 10)
                    .attr('y', 38)
                    .attr('width', 16)
                    .attr('height', 16)
                    .attr('fill', '#FFF')
                    .attr('stroke', '#333')
                    .attr('stroke-width', '2')
                    .on('click', toggleColor);

                svg.append('text')
                    .attr('x', 32)
                    .attr('y', 51)
                    .text('stop color updates')
                    .attr('id', 'spatial-globe-toggle-color')
                    .attr('font-family', 'sans-serif')
                    .attr('font-size', 14)
                    .attr('text-anchor', 'left')
                    .attr('fill', '#555')
                    .on('click', toggleColor);
            }
        };

        setupSphere();

        var topo;

        // This function draws the sphere (and moves the locations on the sphere) at
        // whatever angle we need
        function drawSphere() {
            var land = topojson.feature(topo, topo.objects.land);
            var borders = topojson.mesh(topo, topo.objects.countries,
                                                function(a, b) { return a !== b; });
            var grid = graticule();

            if (execute.block.links) {
                for (var i = 0; i < execute.block.links.length; i++) {
                    var link = execute.block.links[i];
                    if (link.name == null || link.lat == null || link.lon == null) {
                        continue;
                    }
                    var location = projection([link.lon, link.lat]);

                    // ...Math
                    var rotation = projection.rotate();
                    var p_lon = -rotation[0];
                    var p_lat = -rotation[1];

                    var theta1 = link.lat * Math.PI / 180;
                    var theta2 = p_lat * Math.PI / 180;
                    var diff_theta = (p_lat - link.lat) * Math.PI / 180;
                    var diff_lambda = (p_lon -link.lon) * Math.PI / 180;

                    var a = Math.sin(diff_theta/2) * Math.sin(diff_theta/2) +
                        Math.cos(theta1) * Math.cos(theta2) *
                        Math.sin(diff_lambda/2) * Math.sin(diff_lambda/2);
                    var angle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) *
                        180 / Math.PI;

                    // The result of the calculations determine if the location is
                    // on the far side of the sphere or not; if on the far side, we
                    // make it significantly more transparent
                    var draw = drawLinks[i];
                    if (angle < 90) {
                        draw.transition().duration(10)
                            .style("opacity", "0.7")
                            .attr("cx", location[0] - 8)
                            .attr("cy", location[1] - 8);
                    } else {
                        draw.transition().duration(10)
                            .style("opacity", "0.1")
                            .attr("cx", location[0] - 8)
                            .attr("cy", location[1] - 8);
                    };
                }
            };

            // Clear the canvas, redraw the sphere basemap
            context.clearRect(0, 0, width, height);

            context.beginPath();
            path(sphere);
            context.lineWidth = 3;
            context.strokeStyle = "#444";
            context.stroke();

            context.beginPath();
            path(sphere);
            context.fillStyle = "#eee";
            context.fill();

            context.beginPath();
            path(land);
            context.fillStyle = "#666";
            context.fill();

            context.beginPath();
            path(borders);
            context.lineWidth = .5;
            context.strokeStyle = "#ddd";
            context.stroke();

            context.beginPath();
            path(grid);
            context.lineWidth = .5;
            context.strokeStyle = "rgba(127,127,127,.5)";
            context.stroke();
        };

        // Color for a particular link/location
        function colorNode(draw, side, link) {
            return function(data) {
                check = data.return;
                color = check > link.color.limit ?
                    link.color.high : link.color.low;
                if (color != draw.attr('fill')) {
                    draw.transition().duration(5)
                        .attr('fill', color);
                    side.transition().duration(1000)
                        .attr('fill', color);
                };
            }
        };

        // Color all the links/locations
        function colorNodes() {
            if (execute.block.links) {
                for (var i = 0; i < execute.block.links.length; i++) {
                    var link = execute.block.links[i];
                    if (link.name == null || link.lat == null || link.lon == null) {
                        continue;
                    }
                    if (link.color && link.color.query) {
                        var draw = drawLinks[i];
                        var side = sideLinks[i];
                        $.ajax({url: "/query",
                                type: "POST",
                                data: JSON.stringify({name: link.color.query.name,
                                                      query: link.color.query.query}),
                                dataType: "json",
                                success: colorNode(draw, side, link)});
                    };
                };
            };
        }

        // Resize sensor for...  Dynamically resizing.  Divs don't normally have any
        // sort of event that fires on resize (only windows do).
        var resizeSensor = new ResizeSensor($('#' + containerName), function() {
            // Clear everything and rebuild it; resizing the canvas screws up the
            // projection
            $('#' + canvasName).remove();
            $('#' + svgName).remove();

            // Force immediate color check after redraw
            lastColor = 0;
            setupSphere();
        });

        // "main loop": load our topo data and run a d3 timer to start things going
        d3.json("/lib/world-110m.json", function(error, data) {
            topo = data;
            d3.timer(function() {
                var now = Date.now();
                if (rotateSphere) {
                    accum += (now - lastRotate) * speed;
                    if (tilt > -16 && tilt < -14) {
                        tilt = -15;
                    };
                    tilt += (now - lastRotate) * speed * (-15 - tilt) / 180;
                    projection.rotate([accum, tilt]);
                    drawSphere();
                };
                if (colorSphere && now - lastColor > 5000) {
                    colorNodes();
                    lastColor = now;
                }
                lastRotate = now;
            });
        });
    });
};

encapsulateSpatialGlobeVisual();
