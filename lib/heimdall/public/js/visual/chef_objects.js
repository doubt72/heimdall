// Chef Object tree visuals
function encapsulateChefObjectVisuals() {
    var canvasContainerName = "json-tree-canvas"
    var codeContainerName = "json-tree-code"

    // Set up HTML/display code
    function showError(id, msg) {
        var html = '<pre style="padding: 1em 2em;">' + msg + '</pre>'
        $(id).html(html);
    };

    // Encode data for display/tree
    function encode(data, name, links, options) {
        var rc = {};
        rc["data"] = {id: 'xcodex', key: name, type: "object", list: false,
                      displayKey: name};
        rc["children"] = LibTree.encode(data, 'xcodex', 0, links, options);
        return rc
    };

    // Set up HTML/display code
    function setupHTML(id, data) {
        var html = "<div id=\"" + canvasContainerName + "\">";
        html += "</div>";
        html += '<div id="' + codeContainerName + '"><pre>';
        html += LibTree.displayCode(data);
        html += "</pre></div>";
        $(id).html(html);
    };

    // Make display code visible if configured
    function showJSON(show) {
        if (show) {
            $("#" + canvasContainerName).css({height: "calc(100% - 15em)"});
            $("#" + codeContainerName).css({height: "calc(15em - 1px)"});
            $("#" + codeContainerName).css({display: "block"});
        } else {
            $("#" + canvasContainerName).css({height: "100%"});
            $("#" + codeContainerName).css({display: "none"});
        };
    };

    // Set up tree canvas
    function drawTree(data) {
        // Set up SVG canvas
        var width = $("#" + canvasContainerName).width()
        var height = $("#" + canvasContainerName).height()
        var svg = d3.select("#" + canvasContainerName).append("svg")
            .attr("width", width)
            .attr("height", height);

        // Draw tree
        LibTree.drawTree(data, svg);
    };

    // This function clusters a list of names
    var clusterMax = 10;
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
                var links = {type: 'leaves',
                             to: {script: 'chef-' + type, args: {show_json: true}}};
                data = encode(data, type + 's', links);
                setupHTML(id, data);
                showJSON(false);
                drawTree(data);
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
                showError(id, 'No ' + type + ' name supplied.');
                return;
            };
            function displayData(json) {
                // Links vary from class to class
                var show_json = execute.block.show_json || args.show_json
                var links = {};
                if (script == 'chef-data-bag') {
                    links = {type: 'explicit',
                             paths: [{id: ['items'],
                                      to: {script: 'chef-data-bag-item',
                                           args: {data_bag: args.name,
                                                  show_json: show_json}}}]};
                } else if (script == 'chef-environment') {
                    var list = [];
                    for (var key in json.cookbook_versions) {
                        list.push({id: ['cookbook_versions', key],
                                   to: {script: 'chef-cookbook',
                                        args: {list_id: key, show_json: show_json}}});
                    }
                    links = {type: 'explicit', paths: list};
                } else if (script == 'chef-node') {
                    links = {type: 'explicit',
                             paths: [{id: ['chef_environment'],
                                      to: {script: 'chef-environment',
                                           args: {show_json: show_json}}},
                                     {id: ['run_list'],
                                      to: {script: 'chef-run-list-item',
                                           args: {show_json: show_json}}}]};
                } else if (script == 'chef-role') {
                    links = {type: 'explicit',
                             paths: [{id: ['run_list'],
                                      to: {script: 'chef-run-list-item',
                                           args: {show_json: show_json}}}]};
                };

                // Encode data for display/tree
                var data = encode(json, args.name, links);
                setupHTML(id, data);
                showJSON(show_json);
                drawTree(data);
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
        function displayData(json) {
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
                         to: {script: 'chef-cookbook', args: {show_json: show_json}}};
            var data = encode(data, 'cookbooks', links);
            setupHTML(id, data);
            showJSON(false);
            drawTree(data);
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
        // TODO: accept cookbook instead of list_id and version instead of name
        if (args == null || args.name == null || args.list_id == null) {
            showError(id, 'Need to supply both cookbook (passed as list_id) and version (passed as name).');
            return;
        };
        function displayData(json, version) {
            var show_json = execute.block.show_json || args.show_json
            var links = {};
            var list = [];
            for (var key in json.metadata.dependencies) {
                list.push({id: ['metadata', 'dependencies', key],
                           to: {script: 'chef-cookbook',
                                args: {list_id: key, show_json: show_json}}});
            }
            links = {type: 'explicit', paths: list};

            // Encode data for display/tree
            var data = encode(json, args.list_id + ':' + version, links);
            setupHTML(id, data);
            showJSON(show_json);
            drawTree(data);
        };
        var version = args.name;
        $.ajax({url: "/query",
                type: "POST",
                data: JSON.stringify({name: 'chef-resolve-cookbook-version',
                                      query: args.list_id + ':' + version}),
                dataType: "json",
                success: function(data) {
                    version = data.return;
                    $.ajax({url: "/query",
                            type: "POST",
                            data: JSON.stringify({name: 'chef-cookbook',
                                                  query: args.list_id + ':' + version}),
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
        // TODO: accept id instead of name
        if (args == null || args.name == null || args.data_bag == null) {
            showError(id, 'Need to supply both id (passed as name) and data bag.');
            return;
        };
        function displayData(json) {
            var show_json = execute.block.show_json || args.show_json
            var links = {};
        
            // Encode data for display/tree
            var data = encode(json, args.data_bag + ':' + args.name, links);
            setupHTML(id, data);
            showJSON(show_json);
            drawTree(data);
        };
        $.ajax({url: "/query",
                type: "POST",
                data: JSON.stringify({name: 'chef-data-bag-item',
                                      query: args.data_bag + ':' + args.name}),
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
            showError(id, 'No query supplied.');
            return;
        };
        function displayData(json) {
            var show_json = false;
            if (args && args.show_json) {
                show_json = true;
            } else if (execute.block.show_json) {
                show_json = true;
            }

            // Encode data for display/tree
            var links = {type: 'explicit',
                         paths: [{id: ['clients'],
                                  to: {script: 'chef-client', args: {show_json: true}}},
                                 {id: ['environments'],
                                  to: {script: 'chef-environment',
                                       args: {show_json: true}}},
                                 {id: ['nodes'],
                                  to: {script: 'chef-node', args: {show_json: true}}},
                                 {id: ['roles'],
                                  to: {script: 'chef-role', args: {show_json: true}}}]};
            var data = encode(json, 'search results', links);
            setupHTML(id, data);
            showJSON(false);
            drawTree(data);
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
        // TODO: accept item instead of name
        if (args == null || args.name == null) {
            showError(id, 'No runlist item (passed with name) supplied.');
            return;
        };
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
