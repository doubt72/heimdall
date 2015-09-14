// Globe spatial visual
//
// Author: Douglas Triggs (douglas@triggs.org)
//
// Links to be displayed on the map should be set as :links and passed in a list
// containing hashes with the following values: name, lat, lon, script, and args; at
// some point will probably add queries for colors or some such.
//
// An example script:
/*
coords = [
  ['Seattle', 47.609722, -122.333056],
  ['San Francisco', 37.783333, -122.416667],
  ['London', 51.507222, -0.1275],
  ['New York', 40.7127, -74.0059],
  ['Atlanta', 33.755, -84.39],
  ['Sydney', -33.865, 151.209444],
  ['Denver', 39.76185, -104.881105],
  ['Tokyo', 35.683333, 139.683333],
  ['Singapore', 1.3, 103.8],
  ['Bangalore', 12.966667, 77.566667],
  ['Berlin', 52.516667, 13.383333],
  ['Johannesburg', -26.204444, 28.045556],
  ['Chicago', 41.836944, -87.684722],
  ['Houston', 29.762778, -95.383056],
  ['Hong Kong', 22.3, 114.2],
  ['Santiago', -33.45, -70.666667]
]

links = []
coords.each do |coord|
  links.push({name: coord[0], lat: coord[1], lon: coord[2],
              script: 'chef-server', args: {}})
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

        $(id).html('<div id="' + containerName + '"></div>');

        var speed = 0.01;
        var last = Date.now();
        var accum = 0;
        var tilt = -15;
        var rotate = true;

        var sphere = {type: "Sphere"};
        var graticule = d3.geo.graticule();

        var projection;
        var map = {};
        var canvas;
        var context;
        var path;
        var svg;

        function toggleRotation() {
            if (rotate) {
                rotate = false;
            } else {
                accum = projection.rotate()[0];
                tilt = projection.rotate()[1];
                rotate = true;
            }
        };

        var drawLinks;
        function zoomToLink(link) {
            return function () {
                rotate = false;
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
        function executeLink(script, args) {
            $('#' + canvasName).remove();
            $('#' + svgName).remove();

            Heimdall.run(id, script, args);
        };

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
                .text('toggle rotation')
                .attr('font-family', 'sans-serif')
                .attr('font-size', 14)
                .attr('text-anchor', 'left')
                .attr('fill', '#555')
                .on('click', toggleRotation);

            drawLinks = [];
            if (execute.block.links) {
                for (var i = 0; i < execute.block.links.length; i++) {
                    var link = execute.block.links[i];
                    if (link.name == null || link.lat == null || link.lon == null ||
                        link.script == null || link.args == null) {
                        continue;
                    }
                    svg.append('circle')
                        .attr('cx', 18)
                        .attr('cy', (i+1)*28 + 28)
                        .attr('r', 9)
                        .attr('fill', '#FFF')
                        .attr('stroke', '#333')
                        .attr('stroke-width', '2')
                        .on('click', zoomToLink(link));

                    svg.append('text')
                        .attr('x', 32)
                        .attr('y', (i+1)*28 + 33)
                        .text(link.name)
                        .attr('font-family', 'sans-serif')
                        .attr('font-size', 14)
                        .attr('text-anchor', 'left')
                        .attr('fill', '#555')
                        .on('click', zoomToLink(link));

                    drawLinks[i] = svg.append("circle")
                        .attr('cx', -100)
                        .attr('cy', -100)
                        .attr('r', 9)
                        .attr('fill', '#FFF')
                        .attr('stroke', '#333')
                        .attr('stroke-width', '2')
                        .on('click', function () {
                            executeLink(link.script, link.args);
                        })
                        .on('mouseover', function(d,i) {
                            d3.select(this).transition().duration(200).attr('r', 18);
                        })
                        .on('mouseout', function(d,i) {
                            d3.select(this).transition().duration(600).attr('r', 9);
                        });
                }
            }
        };

        setupSphere();

        var topo;
        function drawSphere() {
            var land = topojson.feature(topo, topo.objects.land);
            var borders = topojson.mesh(topo, topo.objects.countries,
                                                function(a, b) { return a !== b; });
            var grid = graticule();

            if (execute.block.links) {
                for (var i = 0; i < execute.block.links.length; i++) {
                    var link = execute.block.links[i];
                    if (link.name == null || link.lat == null || link.lon == null ||
                        link.script == null || link.args == null) {
                        continue;
                    }
                    var location = projection([link.lon, link.lat]);

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
                    if (angle < 90) {
                        drawLinks[i].transition().duration(0)
                            .style("opacity", "0.7")
                            .attr("cx", location[0] - 9)
                            .attr("cy", location[1] - 9);
                        drawLinks[i].transition().duration(0)
                            .style("opacity", "0.7")
                            .attr("cx", location[0] - 9)
                            .attr("cy", location[1] - 9);
                    } else {
                        drawLinks[i].transition().duration(0)
                            .style("opacity", "0.1")
                            .attr("cx", location[0] - 9)
                            .attr("cy", location[1] - 9);
                        drawLinks[i].transition().duration(0)
                            .style("opacity", "0.1")
                            .attr("cx", location[0] - 9)
                            .attr("cy", location[1] - 9);
                    }
                }
            };

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

        var resizeSensor = new ResizeSensor($('#' + containerName), function() {
            $('#' + canvasName).remove();
            $('#' + svgName).remove();

            setupSphere();
        });

        d3.json("/lib/world-110m.json", function(error, data) {
            topo = data;
            d3.timer(function() {
                var now = Date.now();
                if (rotate) {
                    accum += (now - last) * speed;
                    if (tilt > -16 && tilt < -14) {
                        tilt = -15;
                    };
                    tilt += (now - last) * speed * (-15 - tilt) / 180;
                    projection.rotate([accum, tilt]);
                    drawSphere();
                }
                last = now;
            });
        });
    });
};

encapsulateSpatialGlobeVisual();
