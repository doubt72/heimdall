// Chef Support Library
// Handles tree view visuals and supports code navigation
//
// Author: Douglas Triggs (douglas@triggs.org)

var LibTree = {
    // Traverse a JSON object and encode it
    //   branch: JSON data to be encoded (this runs recursively)
    //   rootId: ID of parent, new IDs will be generated for each key/array item
    //   depth: how deep this branch is
    //   links: specifications of links that should be attached to scalars in the tree
    //
    // There are several types of links:
    //   explicit: add the link to explicitly specified id/paths: the 'paths' key
    //     then includes a list of objects with the 'id' key containing the id/path
    //     in list form, and the 'to' key contains the visual (script) name and args
    //     (besides name, which will be supplied dynamically).  This is intended
    //     mainly for singleton objects.
    //   leaves: add the link to every scalar node: the value will be used as the
    //     name in the args, the visual (script) name and any other args must be
    //     supplied in the 'to' key.  This is intended mainly for clustered lists.
    //   array-leaves: add the link to every scalar node in a list: the value will
    //     be passed as the name in the args, and the list id will also be passed as
    //     list_id in the args, the visual (script) name and any other args must be
    //     supplied in the 'to' key.  This is used specifically for cookbooks +
    //     versions in a clustered list.
    //
    // Various examples of link usage can be found in the Chef visuals.

    encode: function(branch, rootId, depth, links, options) {
        // Longer names and values than this will have truncated display values
        var nameLimit = 40;
        var valueLimit = 40;
        var leaves = false;
        var arrayLeaves = false;

        // Link all leaves if configured
        if (links.type == 'leaves') {
            leaves = true;
        }
        // Link array-leaves if configured
        if (links.type == 'array-leaves') {
            arrayLeaves = true;
        }

        // Key from list if explicit links
        var paths = [];
        if (links.type == 'explicit') {
            paths = links.paths
        }
        function keyFromList(list) {
            var rc = '';
            for (var index in list) {
                rc += '-' + list[index].replace(/[^A-Za-z0-9\-_]/g, "_");
            }
            rc = rc.slice(1);
            return rc;
        };
        var keyList = {}
        for (var index in paths) {
            keyList[keyFromList(paths[index].id)] = paths[index].to
        }

        // Convert the various types of data for use in the tree and detect types
        // for styles
        function typeValue(item, rootId, depth, paths, listId) {
            var type = "";
            var value = item;
            if (item == null) {
                value = "null";
                type = "null";
            } else if (typeof(item) == "string") {
                type = "string";
            } else if (typeof(item) == "number") {
                value = item.toString();
                type = "number";
            } else if (typeof(item) == "boolean") {
                value = item.toString();
                type = "boolean";
            } else if (item.constructor == Array) {
                value = listEncode(item, rootId, depth + 1, paths, listId);
                type = "array";
            } else if (typeof(item) == "object") {
                value = LibTree.encode(item, rootId, depth + 1, links, options);
                type = "object";
            };
            var display = value;
            if (type == "string" && display.length > valueLimit) {
                display = display.substring(0, valueLimit) + "…";
            }
            return [type, value, display];
        };

        // Append key onto root
        function makeKey(rootId, key) {
            var newKey = key.replace(/[^A-Za-z0-9\-_]/g, "_");
            return rootId + "-" + newKey;
        };

        // Traverse our JSON list and encode it.  Lists are slightly special; keys
        // are indexes internally (to perserve order and because we remap everything to
        // lists internally)
        function listEncode(array, rootId, depth, paths, listId) {
            var rc = [];
            var count = 0;
            for (var item in array) {
                var key = count.toString();
                var id = makeKey(rootId, key)
                var tv = typeValue(array[item], id, depth, paths, key);
                var type = tv[0];
                var value = tv[1];
                var display = tv[2];
                var script = null;
                if (keyList[rootId]) {
                    script = keyList[rootId];
                }
                if (type == "array" || type == "object") {
                    // Only objects with scalar values can have a script attached
                    rc.push({data: {id: id, key: key, type: type, depth: depth,
                                    list: true, displayKey: key},
                             children: value});
                } else {
                    if (leaves) {
                        script = links.to
                        displayName = '';
                    } else if (arrayLeaves) {
                        script = jQuery.extend(true, {}, links.to)
                        script.args.list_id = listId;
                    };
                    rc.push({data: {id: id, key: key, value: value, type: type,
                                    depth: depth, list: true, script: script,
                                    display: display, displayKey: key},
                             size: 1});
                };
                count += 1;
            };
            return rc;
        };

        var rc = [];
        for (var key in branch) {
            var name = key;
            var id = makeKey(rootId, key)
            var displayName = key;
            if (displayName.length > nameLimit) {
                displayName = displayName.substring(0, nameLimit) + "…";
            }
            var tv = typeValue(branch[key], id, depth, paths, name);
            var type = tv[0];
            var value = tv[1];
            var display = tv[2];
            var script = null;
            if (keyList[id]) {
                script = keyList[id];
            }
            if (type == "array" || type == "object") {
                // Only objects with scalar values can have a script attached
                rc.push({data: {id: id, key: name, type: type, depth: depth,
                                list: false, displayKey: displayName},
                         children: value});
            } else {
                if (leaves) {
                    script = links.to
                    displayName = '';
                };
                rc.push({data: {id: id, key: name, value: value, type: type,
                                depth: depth, list: false, script: script,
                                display: display, displayKey: displayName},
                         size: 1});
            };
        }
        return rc;
    },

    // Function for pretty printing/syntax highlighting with id's for navigating
    //   data: encoded data (see encode above) to display
    //   container: container span ID
    displayCode: function(data, container) {
        function wrapId(id, value) {
            return '<span id="' + id + '">' + value + '</span>';
        }
        function wrapSpan(type, value) {
            return '<span class="code-' + type + '">' + value + '</span>';
        }

        function recurList(list) {
            var rc = "";
            for (var index in list) {
                var item = list[index];
                var indent = "  ".repeat(item.data.depth + 1);
                rc += indent;
                var span = ""
                if (!item.data.list) {
                    span += wrapSpan('key', '"' + item.data.key + '":') + ' ';
                }
                if (item.data.type == 'null') {
                    span += wrapSpan('null', 'null');
                } else if (item.data.type == 'boolean' || item.data.type == 'number') {
                    span += wrapSpan(item.data.type, item.data.value.toString());
                } else if (item.data.type == 'string') {
                    span += wrapSpan(item.data.type, '"' + item.data.value + '"');
                } else if (item.data.type == 'array') {
                    if (item.children.length == 0) {
                        span += '[]';
                    } else {
                        span += '[\n' + recurList(item.children) + indent + ']';
                    };
                } else if (item.data.type == 'object') {
                    if (item.children.length == 0) {
                        span += '{}';
                    } else {
                        span += '{\n' + recurList(item.children) + indent + '}';
                    };
                };
                rc += wrapId(item.data.id, span);
                if (index < list.length - 1) {
                    rc += ",\n";
                } else {
                    rc += "\n";
                };
            }
            return rc;
        };
        data = '<span id="' + container + '">{\n' + recurList(data.children) + '}</span>\n';
        return data;
    },

    // Render json as tree
    //   data: encoded data (see encode above) to graph
    //   containerId: ID of enclosing container
    //   svg: svg canvas to contain tree graph
    //   options: options
    drawTree: function(data, containerId, svg, options) {
        function makeID(selector) {
            return containerId + ' ' + selector;
        }

        var treeData = data;

        // Calculate total nodes, max label length for display
        var totalNodes = 0;
        var maxLabelLength = 0;
        var maxValueLength = 0;

        // variables for drag/drop
        var selectedNode = null;
        var draggingNode = null;

        // panning variables
        var panSpeed = 200;
        var panBoundary = 20; // Within 20px from edges will pan when dragging.

        // Misc. variables
        var i = 0;
        var duration = 750;
        var root;

        // size of the canvas/view/div
        var viewerWidth = svg.attr('width');
        var viewerHeight = svg.attr('height');

        var tree = d3.layout.tree().size([viewerHeight, viewerWidth]);

        // define a d3 diagonal projection for use by the node paths later on.
        var diagonal = d3.svg.diagonal()
            .projection(function(d) {
                return [d.y, d.x];
            });

        // A recursive helper function for performing some setup by walking through
        // all nodes
        function visit(parent, visitFn, childrenFn) {
            if (!parent) return;
            visitFn(parent);
            var children = childrenFn(parent);
            if (children) {
                var count = children.length;
                for (var i = 0; i < count; i++) {
                    visit(children[i], visitFn, childrenFn);
                }
            }
        }

        // Call visit function to establish maxLabelLength and maxValueLength
        visit(treeData, function(d) {
            totalNodes++;
            maxLabelLength = Math.max(d.data.displayKey.length, maxLabelLength);
            if (d.data.display) {
                maxValueLength = Math.max(d.data.display.length, maxValueLength);
            };
        }, function(d) {
            return d.children && d.children.length > 0 ? d.children : null;
        });

        // Panning function
        function pan(domNode, direction) {
            var speed = panSpeed;
            if (panTimer) {
                clearTimeout(panTimer);
                translateCoords = d3.transform(svgGroup.attr("transform"));
                if (direction == 'left' || direction == 'right') {
                    translateX = direction == 'left' ? translateCoords.translate[0] +
                        speed : translateCoords.translate[0] - speed;
                    translateY = translateCoords.translate[1];
                } else if (direction == 'up' || direction == 'down') {
                    translateX = translateCoords.translate[0];
                    translateY = direction == 'up' ? translateCoords.translate[1] +
                        speed : translateCoords.translate[1] - speed;
                }
                scaleX = translateCoords.scale[0];
                scaleY = translateCoords.scale[1];
                scale = zoomListener.scale();
                svgGroup.transition().attr("transform", "translate(" + translateX + "," +
                                           translateY + ")scale(" + scale + ")");
                d3.select(domNode).select('g.node').attr("transform", "translate(" +
                                                         translateX + "," + translateY +
                                                         ")");
                zoomListener.scale(zoomListener.scale());
                zoomListener.translate([translateX, translateY]);
                panTimer = setTimeout(function() {
                    pan(domNode, speed, direction);
                }, 50);
            }
        }

        // Define the zoom function for the zoomable tree
        function zoom() {
            svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" +
                          d3.event.scale + ")");
        }

        // define the zoomListener which calls the zoom function on the "zoom" event
        // constrained within the scaleExtents
        var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

        // define the baseSvg, attaching a class for styling and the zoomListener
        var baseSvg = svg.attr("class", "overlay")
            .call(zoomListener);

        // Helper functions for collapsing and expanding nodes.
        function collapse(d) {
            if (d.children) {
                d._children = d.children;
                d._children.forEach(collapse);
                d.children = null;
            }
        }

        function expand(d) {
            if (d._children) {
                d.children = d._children;
                d.children.forEach(expand);
                d._children = null;
            }
        }

        var currentNode;

        // Function to center node when clicked/dropped so node doesn't get lost when
        // collapsing/moving with large amount of children.
        function centerNode(source) {
            currentNode = source;
            scale = zoomListener.scale();
            x = -source.y0;
            y = -source.x0;
            x = x * scale + viewerWidth / 2;
            y = y * scale + viewerHeight / 2;
            d3.select('g').transition()
                .duration(duration)
                .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
            zoomListener.scale(scale);
            zoomListener.translate([x, y]);
            scrollToOffset(source);
        }

        // Toggle children function
        function toggleChildren(d) {
            if (d.children) {
                d._children = d.children;
                d.children = null;
            } else if (d._children) {
                d.children = d._children;
                d._children = null;
            }
            return d;
        }

        function scrollToOffset(d) {
            var elem = document.getElementById(d.data.id);
            var container = $(makeID('.json-tree-code'))[0];
            elem.scrollIntoView();
            container.scrollTop -= 16;
            $(makeID('.xcode-selectedx')).removeClass('xcode-selectedx');
            $('#' + d.data.id).addClass('xcode-selectedx');
        }

        // Toggle children on click; or load a new script if linked
        function click(d) {
            if (d3.event.defaultPrevented) return; // click suppressed
            if (d.data.script) {
                // Replace canvas in place with new script
                resizeSensor.detach();
                var id = $(makeID('.json-tree-canvas')).parent();
                var args = d.data.script.args;
                args['name'] = d.data.value;
                if (d.data.type != "string") {
                    args['name'] = JSON.parse(d.data.value);
                }
                $(makeID('.json-tree-canvas')).remove();
                $(makeID('.json-tree-code')).remove();
                Heimdall.run('#' + id.attr('id'), d.data.script.script, args);
            } else {
                d = toggleChildren(d);
                update(d);
                centerNode(d);
            }
        }

        function update(source) {
            // Compute the new height, function counts total children of root node and
            // sets tree height accordingly.  This prevents the layout looking squashed
            // when new nodes are made visible or looking sparse when nodes are removed
            // This makes the layout more consistent.
            var levelWidth = [1];
            var childCount = function(level, n) {
                if (n.children && n.children.length > 0) {
                    if (levelWidth.length <= level + 1) levelWidth.push(0);

                    levelWidth[level + 1] += n.children.length;
                    n.children.forEach(function(d) {
                        childCount(level + 1, d);
                    });
                }
            };
            childCount(0, root);
            var newHeight = d3.max(levelWidth) * 25; // 25 pixels per line  
            tree = tree.size([newHeight, viewerWidth]);

            // Compute the new tree layout.
            var nodes = tree.nodes(root).reverse(),
                links = tree.links(nodes);

            // Set widths between levels based on maxLabelLength.
            nodes.forEach(function(d) {
                d.y = (d.depth * ((maxLabelLength + maxValueLength) * 3 + 120));
            });

            // Update the nodes
            node = svgGroup.selectAll("g.node")
                .data(nodes, function(d) {
                    return d.id || (d.id = ++i);
                });

            // Enter any new nodes at the parent's previous position.
            var nodeEnter = node.enter().append("g")
                .attr("class", "node")
                .attr("transform", function(d) {
                    return "translate(" + source.y0 + "," + source.x0 + ")";
                })
                .on('click', click);

            // Circles for objects; only visible if node is object
            nodeEnter.append("circle")
                .attr('class', 'nodeCircle')
                .attr("r", 0)
                .style("fill", function(d) {
                    return d._children ? "#777" : "#fff";
                })
                .style("opacity", function(d) {
                    return d.data.type == "object" ? 1 : 0;
                })
                .style("fill-opacity", function(d) {
                    return d.data.type == "object" ? 1 : 0;
                });

            // Rects for arrays; also resized and rotated for scalars.  Only visible
            // if node is array or scalar
            nodeEnter.append("rect")
                .attr('class', 'nodeRect')
                .attr("width", 0)
                .attr("height", 0)
                .style("fill", function(d) {
                    return d._children ? "#777" : "#fff";
                })
                .style("opacity", function(d) {
                    return d.data.type != "object" ? 1 : 0;
                })
                .style("fill-opacity", function(d) {
                    return d.data.type != "object" ? 1 : 0;
                });

            // Text for keys
            nodeEnter.append("text")
                .attr("x", function(d) {
                    return -10;
                })
                .attr("dy", ".35em")
                .attr('class', 'nodeKey')
                .attr("text-anchor", function(d) {
                    return "end";
                })
                .text(function(d) {
                    return d.data.list ? "" : d.data.displayKey;
                })
                .style("fill-opacity", 0);

            // Text for values
            nodeEnter.append("text")
                .attr("x", function(d) {
                    return 10;
                })
                .attr("dy", ".35em")
                .attr('class', 'nodeValue')
                .attr("text-anchor", function(d) {
                    return "start";
                })
                .text(function(d) {
                    return d.data.type == 'string' ? '"' + d.data.display + '"' :
                        d.data.value;
                })
                .style("fill", function(d) {
                    return d.data.script ? "blue" : "black";
                })
                .style("fill-opacity", 0);

            // Change the circle fill depending on whether it has children and is
            // collapsed
            node.select("circle.nodeCircle")
                .attr("r", 6.5)
                .style("fill", function(d) {
                    return d._children ? "#777" : "#fff";
                });

            // Change the rect parameters depending on if it is an array or scalar
            node.select("rect.nodeRect")
                .attr("x", function(d) {
                    return d.data.type == "array" ? -6 : -4.5;
                })
                .attr("y", function(d) {
                    return d.data.type == "array" ? -6 : -4.5;
                })
                .attr("width", function(d) {
                    return d.data.type == "array" ? 12 : 9;
                })
                .attr("height", function(d) {
                    return d.data.type == "array" ? 12 : 9;
                })
                .style("fill", function(d) {
                    return d._children ? "#777" : "#fff";
                })
                .attr("transform", function(d) {
                    return d.data.type == "array" ? "rotate(0)" : "rotate(45)";
                });

            // Transition nodes to their new position.
            var nodeUpdate = node.transition()
                .duration(duration)
                .attr("transform", function(d) {
                    return "translate(" + d.y + "," + d.x + ")";
                });

            // Fade the text in
            nodeUpdate.select("text.nodeKey")
                .style("fill-opacity", 1);
            nodeUpdate.select("text.nodeValue")
                .style("fill-opacity", 1);

            // Transition exiting nodes to the parent's new position.
            var nodeExit = node.exit().transition()
                .duration(duration)
                .attr("transform", function(d) {
                    return "translate(" + source.y + "," + source.x + ")";
                })
                .remove();

            nodeExit.select("circle")
                .attr("r", 0);

            nodeExit.select("rect")
                .attr("width", 0)
                .attr("height", 0);

            nodeExit.select("text.nodeKey")
                .style("fill-opacity", 0);

            nodeExit.select("text.nodeValue")
                .style("fill-opacity", 0);

            // Update the links
            var link = svgGroup.selectAll("path.link")
                .data(links, function(d) {
                    return d.target.id;
                });

            // Enter any new links at the parent's previous position.
            link.enter().insert("path", "g")
                .attr("class", "link")
                .attr("d", function(d) {
                    var o = {
                        x: source.x0,
                        y: source.y0
                    };
                    return diagonal({
                        source: o,
                        target: o
                    });
                });

            // Transition links to their new position.
            link.transition()
                .duration(duration)
                .attr("d", diagonal);

            // Transition exiting nodes to the parent's new position.
            link.exit().transition()
                .duration(duration)
                .attr("d", function(d) {
                    var o = {
                        x: source.x,
                        y: source.y
                    };
                    return diagonal({
                        source: o,
                        target: o
                    });
                })
                .remove();

            // Stash the old positions for transition.
            nodes.forEach(function(d) {
                d.x0 = d.x;
                d.y0 = d.y;
            });
        }

        // Append a group which holds all nodes and which the zoom Listener can act upon.
        var svgGroup = baseSvg.append("g");

        // Define the root
        root = treeData;
        root.x0 = viewerHeight / 2;
        root.y0 = 0;

        // Layout the tree initially and center on the root node.
        function unsetAllChildren(d) {
            if (d.children && d.children.length > 0) {
                d.children.forEach(function(d2) {
                    unsetAllChildren(d2);
                });
                d._children = d.children;
                d.children = null;
            }
        }

        unsetAllChildren(root)

        toggleChildren(root);
        update(root);
        centerNode(root);

        // Functions for resetting the display
        function resetZoom() {
            zoomListener.translate([0,0]).scale(1);
            centerNode(currentNode);
        }

        function resetTree() {
            zoomListener.translate([0,0]).scale(1);
            centerNode(root);
        }

        // "buttons" for resetting the display
        svg.append('rect')
            .attr('x', 10)
            .attr('y', 10)
            .attr('width', 16)
            .attr('height', 16)
            .attr('fill', '#EEE')
            .attr('stroke', '#EEE')
            .attr('stroke-width', '2')
            .on('click', resetZoom)
            .transition().duration(1000).attr('fill', '#FFF').attr('stroke','#333');

        svg.append('text')
            .attr('x', 32)
            .attr('y', 22)
            .text('reset zoom')
            .attr('font-family', 'sans-serif')
            .attr('font-size', 14)
            .attr('text-anchor', 'left')
            .attr('fill', '#EEE')
            .on('click', resetZoom)
            .transition().duration(1000).attr('fill', '#555')

        svg.append('rect')
            .attr('x', 10)
            .attr('y', 35)
            .attr('width', 16)
            .attr('height', 16)
            .attr('fill', '#EEE')
            .attr('stroke', '#EEE')
            .attr('stroke-width', '2')
            .on('click', resetTree)
            .transition().duration(1000).attr('fill', '#FFF').attr('stroke','#333');

        svg.append('text')
            .attr('x', 32)
            .attr('y', 47)
            .text('zoom to root')
            .attr('font-family', 'sans-serif')
            .attr('font-size', 14)
            .attr('text-anchor', 'left')
            .attr('fill', '#EEE')
            .on('click', resetTree)
            .transition().duration(1000).attr('fill', '#555')

        // This weird pile of weirdness is because divs don't throw resize events, only
        // windows do
        var container = $(makeID('.json-tree-canvas')).parent()[0];
        var resizeSensor = new ResizeSensor(container, function () {
            if ($(makeID('.json-tree-code')).css('display') == 'block') {
                $(makeID('.json-tree-canvas')).css({height: 'calc(100% - ' +
                                                    options.vert_resize_json + ')'});
            } else {
                $(makeID('.json-tree-canvas')).css({height: 'calc(100% - ' +
                                                    options.vert_resize_hidden + ')'});
            };
            viewerHeight = $(makeID('.json-tree-canvas')).height();
            svg.attr('height', viewerHeight);

            $(makeID('.json-tree-canvas')).css({width: '100%'});
            viewerWidth = $(makeID('.json-tree-canvas')).width();
            svg.attr('width', viewerWidth);

            centerNode(currentNode);
        });

        // This is occasionally needed for cleaning up after navigation
        return resizeSensor;
    }
};
