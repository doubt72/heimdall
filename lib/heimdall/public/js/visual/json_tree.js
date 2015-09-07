// JSON tree visuals
function encapsulateTreeVisuals() {
    var canvasContainerName = "json-tree-canvas"
    var codeContainerName = "json-tree-code"

    // Encode data for display/tree
    function encode(data, name, links, id) {
        var idName = id.slice(1) + '-code';
        var rc = {};
        rc["data"] = {id: idName, key: name, type: "object", list: false,
                      displayKey: name};
        rc["children"] = LibTree.encode(data, idName, 0, links);
        return rc
    };

    // Set up HTML/display code
    function setupHTML(id, data) {
        var html = "<div class=\"" + canvasContainerName + "\">";
        html += "</div>";
        html += '<div class="' + codeContainerName + '"><pre>';
        html += LibTree.displayCode(data, id.slice(1) + '-code');
        html += "</pre></div>";
        $(id).html(html);
    };

    // Set up tree canvas
    function drawTree(id, data) {
        // Set up SVG canvas
        var containerClass = '.' + canvasContainerName;
        var width = $(containerClass).width()
        var height = $(containerClass).height()
        var svg = d3.select(containerClass).append("svg")
            .attr("width", width)
            .attr("height", height);

        // Draw tree
        LibTree.drawTree(data, id, svg, {vert_resize_json: '12em',
                                         vert_resize_hidden: '0'});
    };

    // JSON tree test
    Heimdall.registerVisual('json-tree-debug', function(id, name, execute, args) {
        var testData = {string: "value", number: 0, bool: true, nil: null,
                        array: ["value", 0, true, null, ["one", 2],
                                {one: "one", two: 2}, [], {}],
                        object: {string: "value", number: 0, bool: true,
                                 nil: null, array: ["one", 2],
                                 object: {one: "one", two: 2}, xarray: [], xobject: {}},
                        'this is a super long json key that is very long':
                        'and it has a very, very, very long string value like this'};

        var root = id.slice(1) + '-code';
        var links = {type: 'explicit',
                     paths: [{id: [root, 'object','array'],
                              to: {script: 'debug', args: {show_json: true}}},
                             {id: [root, 'array'],
                              to: {script: 'debug', args: {show_json: true}}},
                             {id: [root, 'array', '5', 'one'],
                              to: {script: 'debug', args: {show_json: true}}},
                             {id: [root, 'string'],
                              to: {script: 'debug', args: {show_json: true}}}]};
        var data = encode(testData, 'debug', links, id);
        setupHTML(id, data);

        // Make display code visible (always for debugger)
        $("." + canvasContainerName).css({height: "calc(100% - 12em)"});
        $("." + codeContainerName).css({display: "block"});

        drawTree(id, data);
    });

    // Generic JSON viewer
    Heimdall.registerVisual('json-tree', function(id, name, execute, args) {
        var json = execute.block.json_data;
        if (json) {
            json = JSON.parse(json);
        } else {
            json = {};
        };
        var data = encode(json, 'json', [], id);
        setupHTML(id, data);

        // Make display code visible if configured
        if (execute.block.show_json || (args && args.show_json)) {
            $("." + canvasContainerName).css({height: "calc(100% - 12em)"});
            $("." + codeContainerName).css({display: "block"});
        } else {
            $("." + canvasContainerName).css({height: "100%"});
            $("." + codeContainerName).css({display: "none"});
        };

        drawTree(id, data);
    });
};

encapsulateTreeVisuals();
