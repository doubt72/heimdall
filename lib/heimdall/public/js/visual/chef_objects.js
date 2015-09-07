// Chef Object tree visuals
function encapsulateChefObjectVisuals() {
    var breadcrumbsName = "chef-breadcrumbs";
    var breadcrumbItemName = "chef-breadcrumb-item";
    var canvasContainerName = "json-tree-canvas";
    var codeContainerName = "json-tree-code";

    function loadingMessage(id) {
        var html = '<div class="' + breadcrumbsName + '">retreiving data...</div>';
        $(id).html(html);
    }
    
    function makeSVG() {
        var containerClass = '.' + canvasContainerName;
        var width = $(containerClass).width();
        var height = $(containerClass).height();
        return d3.select(containerClass).append("svg")
            .attr("width", width)
            .attr("height", height);
    };

    // Server starting point
    Heimdall.registerVisual('chef-server', function(id, name, execute, args) {
        var show_json = false;
        if (args && args.show_json) {
            show_json = true;
        } else if (execute.block.show_json) {
            show_json = true;
        }

        var html = '<div class="' + breadcrumbsName + '">chef</div>';
        html += '<div class="' + canvasContainerName + '"></div>';
        $(id).html(html);

        var canvas = $(id + ' .' + canvasContainerName);
        canvas.css({height: 'calc(100% - 1.6em)'});
        var container = canvas.parent()[0];

        var svg = makeSVG();
        svg.attr('class', 'overlay')
        var height = svg.attr('height');
        var width = svg.attr('width');

        // Show selected list
        function showList(type) {
            return function () {
                svg.selectAll('circle').each(function() {
                    if (this.id != id.slice(1) + '-' + type + '-circle') {
                        svg.select('#' + this.id).transition().duration(1000)
                            .attr('r', 0);
                    }
                });
                svg.selectAll('text').each(function() {
                    if (this.id != id.slice(1) + '-' + type + '-text') {
                        svg.select('#' + this.id).transition().duration(1000)
                            .attr('font-size', 0)
                            .attr('fill', '#000');
                    }
                });
                setTimeout(function () {
                    resizeSensor.detach();
                    $(breadcrumbsName).remove();
                    canvas.remove();
                    var newArgs = {show_json: show_json,
                                   crumbs: [{display: 'chef',
                                                  script: 'chef-server',
                                                  args: args}]};
                    Heimdall.run(id, 'chef-' + type + '-list', newArgs);
                }, 1000);
            }
        };

        var types = ['client', 'node', 'cookbook', 'role', 'data-bag', 'user',
                     'environment'];

        // Handle resize if canvas size changes
        var resizeSensor = new ResizeSensor(container, function () {
            canvas.css({height: 'calc(100% - 1.6em)', width: '100%'});
            height = canvas.height();
            width = canvas.width();
            svg.attr('height', height);
            svg.attr('width', width);
            for (var index in types) {
                var type = types[index];
                var i = parseInt(index);
                var size = height / 12;
                if (width / 20 < size) {
                    size = width / 20;
                };
                var xCenter = width / 2 + (i - 2.5) * size * 1.25;
                var yCenter = i % 2 == 0 ? height / 2 - size * 1.2: height / 2 + size * 1.2;
                var idRoot = id.slice(1) + '-' + type;
                svg.select('#' + idRoot + '-circle').transition().duration(1000)
                    .attr('r', size)
                    .attr('cx', xCenter)
                    .attr('cy', yCenter)
                svg.select('#' + idRoot + '-text').transition().duration(1000)
                    .attr('x', xCenter)
                    .attr('y', yCenter + size / 12.5)
                    .attr('font-size', size / 3.5)
            }
        });

        // Set up initial buttons
        for (var index in types) {
            var type = types[index];
            var i = parseInt(index);
            var size = height / 12;
            if (width / 20 < size) {
                size = width / 20;
            };
            var xCenter = width / 2 + (i - 2.5) * size * 1.25;
            var yCenter = i % 2 == 0 ? height / 2 - size * 1.2: height / 2 + size * 1.2;
            svg.append('circle')
                .attr('r', 0)
                .attr('cx', xCenter)
                .attr('cy', yCenter)
                .attr('id', id.slice(1) + '-' + type + '-circle')
                .attr('fill', '#FFF')
                .attr('stroke', '#333')
                .attr('stroke-width', '3')
                .on('click', showList(type))
                .transition().duration(1000).attr('r', size);

            svg.append('text')
                .attr('x', xCenter)
                .attr('y', yCenter + size / 12.5)
                .text(type.replace('-', ' ') + 's')
                .attr('font-family', 'sans-serif')
                .attr('font-size', 0)
                .attr('text-anchor', 'middle')
                .attr('fill', '#000')
                .attr('id', id.slice(1) + '-' + type + '-text')
                .on('click', showList(type))
                .transition().duration(1000)
                .attr('font-size', size / 3.5)
                .attr('fill', '#777');
        }
    });

    // Set up HTML/display code
    function showError(id, msg) {
        var html = '<pre style="padding: 1em 2em;">' + msg + '</pre>'
        $(id).html(html);
    };

    // Encode data for display/tree
    function encode(data, name, links, id, options) {
        var idName = id.slice(1) + '-code';
        var rc = {};
        rc["data"] = {id: idName, key: name, type: "object", list: false,
                      displayKey: name};
        rc["children"] = LibTree.encode(data, idName, 0, links, options);
        return rc
    };

    // Set up HTML/display code
    function setupHTML(id, data, crumbs) {
        var html = '<div class="' + breadcrumbsName + '">'
        for (var i = 0; i < crumbs.length - 1; i++) {
            var item = crumbs[i];
            html += '<span class="' + breadcrumbItemName + '" id="';
            html += id.slice(1) + '-breadcrumb-item-' + i + '">'
            html += item.display;
            html += '</span> &gt; ';
        };
        html += crumbs[crumbs.length - 1].display;
        html += '</div>';
        html += '<div class="' + canvasContainerName + '">';
        html += '</div>';
        html += '<div class="' + codeContainerName + '"><pre>';
        html += LibTree.displayCode(data, id.slice(1) + '-code');
        html += '</pre></div>';
        $(id).html(html);
    }

    function linkBreadcrumbs(id, data, crumbs, sensor) {
        for (var i = 0; i < crumbs.length - 1; i++) {
            var item = crumbs[i];
            var bind = function(local) {
                $(id + '-breadcrumb-item-' + i).click(function() {
                    sensor.detach();
                    $(breadcrumbsName).remove();
                    $(canvasContainerName).remove();
                    $(codeContainerName).remove();
                    Heimdall.run(id, local.script, local.args);
                });
            };
            bind(item);
        };
    };

    // Make display code visible if configured
    function showJSON(show) {
        if (show) {
            $("." + canvasContainerName).css({height: "calc(100% - 13.6em)"});
            $("." + codeContainerName).css({display: "block"});
        } else {
            $("." + canvasContainerName).css({height: "calc(100% - 1.6em)"});
            $("." + codeContainerName).css({display: "none"});
        };
    };

    // Set up tree canvas
    function drawTree(container, data) {
        // Set up SVG canvas
        var svg = makeSVG();

        // Draw tree
        return LibTree.drawTree(data, container, svg, {vert_resize_json: '13.6em',
                                                       vert_resize_hidden: '1.6em'});
    };

    // Add current script to breadcrumbs
    function buildBreadcrumbs(display, script, args) {
        var rc = [];
        if (args && args.crumbs) {
            rc = args.crumbs;
        }
        rc.push({display:display, script:script, args:JSON.parse(JSON.stringify(args))});
        return rc;
    }

    // This function clusters a list of names
    var clusterMax = 20;
    function buildCluster(list, depth) {
        if (list.length > clusterMax) {
            var rc = {};
            for (var index in list) {
                var name = list[index];
                var id = name.charAt(depth);
                if (rc[id] == null) {
                    rc[id] = [];
                };
                rc[id].push(name);
            }
            for (var id in rc) {
                rc[id] = buildCluster(rc[id], depth + 1);
                if (Object.keys(rc[id]).length == 1) {
                    if (typeof(rc[id][0]) == 'string') {
                        rc[rc[id][0]] = rc[id][0];
                    } else {
                        var newId = id + Object.keys(rc[id])[0];
                        rc[newId] = rc[id][Object.keys(rc[id])[0]];
                    }
                    delete rc[id];
                };
            }
            return rc;
        } else {
            return list;
        }
    };

    function clusterEncode(branch, root) {
        if (typeof(branch) == 'string') {
            return branch;
        } else if (branch.constructor == Array) {
            var rc = {}
            for (var index in branch) {
                rc[branch[index]] = branch[index];
            }
            return rc;
        } else {
            var obj = {}
            var keys = Object.keys(branch);
            for (var index in keys) {
                var id = keys[index];
                if (typeof(branch[id]) == "string") {
                    obj[id] = branch[id];
                } else {
                    obj[root + id] = clusterEncode(branch[id], root + id);
                }
            }
            // sort the keys we return
            var rc = {};
            var keys = Object.keys(obj).sort(function(a, b) {return a.localeCompare(b) });
            for (var index in keys) {
                rc[keys[index]] = obj[keys[index]];
            };
            return rc;
        }
    };

    function clusterList(list) {
        var rc = buildCluster(list, 0);
        rc = clusterEncode(rc, '');
        return rc;
    }

    // Register Chef object list
    function objectListScript(type) {
        var script = 'chef-' + type + '-list';

        Heimdall.registerVisual(script, function(id, name, execute, args) {
            loadingMessage(id);
            var crumbs = buildBreadcrumbs(type.replace('-',' ') + 's', script, args);
            function displayData(json) {
                var show_json = false;
                if (args && args.show_json) {
                    show_json = true;
                } else if (execute.block.show_json) {
                    show_json = true;
                }

                // Cluster data into manageable chunks
                var data = clusterList(json);

                // Encode data for display/tree
                var newArgs = {show_json: show_json,
                               crumbs: crumbs};
                var links = {type: 'leaves',
                             to: {script: 'chef-' + type, args: newArgs}};
                data = encode(data, type + 's', links, id);
                setupHTML(id, data, crumbs);
                showJSON(false);
                linkBreadcrumbs(id, data, crumbs, drawTree(id, data));
            };
            $.ajax({url: "/query",
                    type: "POST",
                    data: JSON.stringify({name: script,
                                          query: '*'}),
                    dataType: "json",
                    success: function(data) {
                        displayData(data.return.all);
                    },
                    error: function(xhr, status, error) {
                        displayData({error: error});
                    }});
        });
    }

    function objectShowScript(type) {
        var script = 'chef-' + type;

        // Chef object tree
        Heimdall.registerVisual(script, function(id, name, execute, args) {
            if (args == null || args.name == null) {
                showError(id, 'Must supply ' + type + ' name.');
                return;
            };
            loadingMessage(id);
            function displayData(json) {
                var crumbs = buildBreadcrumbs(args.name, script, args);

                // Links vary from class to class
                var show_json = execute.block.show_json || args.show_json
                var root = id.slice(1) + '-code';
                var links = {};
                if (script == 'chef-data-bag') {
                    links = {type: 'explicit',
                             paths: [{id: [root, 'items'],
                                      to: {script: 'chef-data-bag-item',
                                           args: {data_bag: args.name,
                                                  show_json: show_json,
                                                  crumbs: crumbs}}}]};
                } else if (script == 'chef-environment') {
                    var list = [];
                    for (var key in json.cookbook_versions) {
                        list.push({id: [root, 'cookbook_versions', key],
                                   to: {script: 'chef-cookbook',
                                        args: {list_id: key, show_json: show_json,
                                               crumbs: crumbs}}});
                    }
                    links = {type: 'explicit', paths: list};
                } else if (script == 'chef-node') {
                    links = {type: 'explicit',
                             paths: [{id: [root, 'chef_environment'],
                                      to: {script: 'chef-environment',
                                           args: {show_json: show_json,
                                                  crumbs: crumbs}}},
                                     {id: [root, 'run_list'],
                                      to: {script: 'chef-run-list-item',
                                           args: {show_json: show_json,
                                                  crumbs: crumbs}}}]};
                } else if (script == 'chef-role') {
                    links = {type: 'explicit',
                             paths: [{id: [root, 'run_list'],
                                      to: {script: 'chef-run-list-item',
                                           args: {show_json: show_json,
                                                  crumbs: crumbs}}}]};
                };

                // Encode data for display/tree
                var data = encode(json, args.name, links, id);
                setupHTML(id, data, crumbs);
                showJSON(show_json);
                linkBreadcrumbs(id, data, crumbs, drawTree(id, data));
            };
            $.ajax({url: "/query",
                    type: "POST",
                    data: JSON.stringify({name: script,
                                          query: args.name}),
                    dataType: "json",
                    success: function(data) {
                        displayData(data.return);
                    },
                    error: function(xhr, status, error) {
                        displayData({error: error});
                    }});
        });
    }

    // Follow the same list-item pattern
    var types = ['client', 'data-bag', 'environment', 'node', 'role', 'user']
    for (var index in types) {
        // Chef object list tree
        objectListScript(types[index]);
    };

    types = ['client', 'data-bag', 'environment', 'node', 'role', 'user']
    for (var index in types) {
        // Chef object tree
        objectShowScript(types[index]);
    };

    function populateCookbooks(branch, source) {
        var rc = {};
        for (var id in branch) {
            if (typeof(branch[id]) == "string") {
                rc[id] = source[id];
            } else {
                rc[id] = populateCookbooks(branch[id], source);
            };
        };
        return rc;
    };

    // Cookbook lists are a bit different
    Heimdall.registerVisual('chef-cookbook-list', function(id, name, execute, args) {
        loadingMessage(id);
        function displayData(json) {
            var crumbs = buildBreadcrumbs('cookbooks', 'chef-cookbook-list', args);
            var show_json = false;
            if (args && args.show_json) {
                show_json = true;
            } else if (execute.block.show_json) {
                show_json = true;
            }
            var cookbooks = [];
            for (var key in json) {
                cookbooks.push(key);
            }
            var data = clusterList(cookbooks);
            data = populateCookbooks(data, json);

            // Encode data for display/tree
            var links = {type: 'array-leaves',
                         to: {script: 'chef-cookbook', args: {show_json: show_json,
                                                              crumbs: crumbs}}};
            var data = encode(data, 'cookbooks', links, id);
            setupHTML(id, data, crumbs);
            showJSON(false);
            linkBreadcrumbs(id, data, crumbs, drawTree(id, data));
        };
        $.ajax({url: "/query",
                type: "POST",
                data: JSON.stringify({name: 'chef-cookbook-list',
                                      query: '*'}),
                dataType: "json",
                success: function(data) {
                    displayData(data.return);
                },
                error: function(xhr, status, error) {
                    displayData({error: error});
                }});
    });

    // Cookbooks are also a bit different
    Heimdall.registerVisual('chef-cookbook', function(id, name, execute, args) {
        if (args == null ||
            (args.name == null && args.version == null) ||
            (args.list_id == null && args.cookbook == null)) {
            showError(id, 'Must supply both cookbook (or list_id) and version (or name).');
            return;
        };
        if (args.version == null) {
            args.version = args.name;
        }
        if (args.cookbook == null) {
            args.cookbook = args.list_id;
        }
        loadingMessage(id);
        function displayData(json, version) {
            var cookbook = args.cookbook + ':' + args.version;
            var crumbs = buildBreadcrumbs(cookbook, 'chef-cookbook', args);
            var show_json = execute.block.show_json || args.show_json
            var links = {};
            var list = [];
            var root = id.slice(1) + '-code';
            for (var key in json.metadata.dependencies) {
                list.push({id: [root, 'metadata', 'dependencies', key],
                           to: {script: 'chef-cookbook',
                                args: {list_id: key, show_json: show_json,
                                       crumbs: crumbs}}});
            }
            links = {type: 'explicit', paths: list};

            // Encode data for display/tree
            var data = encode(json, args.cookbook + ':' + version, links, id);
            setupHTML(id, data, crumbs);
            showJSON(show_json);
            linkBreadcrumbs(id, data, crumbs, drawTree(id, data));
        };
        var version = args.version;
        $.ajax({url: "/query",
                type: "POST",
                data: JSON.stringify({name: 'chef-resolve-cookbook-version',
                                      query: args.cookbook + ':' + version}),
                dataType: "json",
                success: function(data) {
                    version = data.return;
                    $.ajax({url: "/query",
                            type: "POST",
                            data: JSON.stringify({name: 'chef-cookbook',
                                                  query: args.cookbook + ':' + version}),
                            dataType: "json",
                            success: function(data) {
                                displayData(data.return, version);
                            },
                            error: function(xhr, status, error) {
                                displayData({error: error}, version);
                            }});
                },
                error: function(xhr, status, error) {
                    displayData({error: error}, version);
                }});
    });

    // Data bag items are also a bit different
    Heimdall.registerVisual('chef-data-bag-item', function(id, name, execute, args) {
        if (args == null ||
            (args.name == null && args.item_id == null) ||
            args.data_bag == null) {
            showError(id, 'Must supply both item_id (or name) and data_bag.');
            return;
        };
        if (args.item_id == null) {
            args.item_id = args.name;
        }
        loadingMessage(id);
        function displayData(json) {
            var data_bag_item = args.data_bag + ':' + args.item_id;
            var crumbs = buildBreadcrumbs(data_bag_item, 'chef-data-bag-item', args);
            var show_json = execute.block.show_json || args.show_json
            var links = {};
        
            // Encode data for display/tree
            var data = encode(json, args.data_bag + ':' + args.item_id, links, id);
            setupHTML(id, data, crumbs);
            showJSON(show_json);
            linkBreadcrumbs(id, data, crumbs, drawTree(id, data));
        };
        $.ajax({url: "/query",
                type: "POST",
                data: JSON.stringify({name: 'chef-data-bag-item',
                                      query: args.data_bag + ':' + args.item_id}),
                dataType: "json",
                success: function(data) {
                    displayData(data.return);
                },
                error: function(xhr, status, error) {
                    displayData({error: error});
                }});
    });

    // Search is also different
    Heimdall.registerVisual('chef-search', function(id, name, execute, args) {
        if (args == null || args.query == null) {
            showError(id, 'Must supply query.');
            return;
        };
        loadingMessage(id);
        var crumbs = buildBreadcrumbs('search', 'chef-search', args);
        function displayData(json) {
            var show_json = false;
            if (args && args.show_json) {
                show_json = true;
            } else if (execute.block.show_json) {
                show_json = true;
            }

            // Encode data for display/tree
            var root = id.slice(1) + '-code';
            var links = {type: 'explicit',
                         paths: [{id: [root, 'clients'],
                                  to: {script: 'chef-client',
                                       args: {show_json: show_json,
                                              crumbs: crumbs}}},
                                 {id: [root, 'environments'],
                                  to: {script: 'chef-environment',
                                       args: {show_json: show_json,
                                              crumbs: crumbs}}},
                                 {id: [root, 'nodes'],
                                  to: {script: 'chef-node',
                                       args: {show_json: show_json,
                                              crumbs: crumbs}}},
                                 {id: [root, 'roles'],
                                  to: {script: 'chef-role',
                                       args: {show_json: show_json,
                                              crumbs: crumbs}}}]};
            var data = encode(json, 'search results', links, id);
            setupHTML(id, data, crumbs);
            showJSON(false);
            linkBreadcrumbs(id, data, crumbs, drawTree(id, data));
        };
        $.ajax({url: "/query",
                type: "POST",
                data: JSON.stringify({name: 'chef-search',
                                      query: args.query}),
                dataType: "json",
                success: function(data) {
                    displayData(data.return);
                },
                error: function(xhr, status, error) {
                    displayData({error: error});
                }});
    });

    // Search is also different
    Heimdall.registerVisual('chef-run-list-item', function(id, name, execute, args) {
        var json;
        if (args == null || args.name == null) {
            showError(id, 'Must supply runlist entry (as name).');
            return;
        };
        loadingMessage(id);
        $.ajax({url: "/query",
                type: "POST",
                data: JSON.stringify({name: 'chef-resolve-runlist',
                                      query: args.name}),
                dataType: "json",
                success: function(data) {
                    json = data.return;
                    var show_json = false;
                    if (args && args.show_json) {
                        show_json = true;
                    } else if (execute.block.show_json) {
                        show_json = true;
                    };
                    json.args.show_json = show_json;
                    json.args.crumbs = JSON.parse(JSON.stringify(args.crumbs));
                    Heimdall.run(id, json.script, json.args);
                },
                error: function(xhr, status, error) {
                    json = {error: error, script: name, execute: execute, args: args};
                    Heimdall.run(id, 'debug', json);
                }});
    });
};

// TODO: resize canvas

encapsulateChefObjectVisuals();
