// JSON tree visuals
function encapsulateTreeVisuals() {
    var canvasContainerName = "json-tree-canvas"
    var codeContainerName = "json-tree-code"

    // Encode data for display/tree
    function encode(data, name, links) {
        var rc = {};
        rc["data"] = {id: 'xcodex', key: name, type: "object", list: false,
                      displayKey: name};
        rc["children"] = LibTree.encode(data, 'xcodex', 0, links);
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

    // Set up tree canvas
    function drawTree(data, links) {
        // Set up SVG canvas
        var width = $("#" + canvasContainerName).width()
        var height = $("#" + canvasContainerName).height()
        var svg = d3.select("#" + canvasContainerName).append("svg")
            .attr("width", width)
            .attr("height", height);

        // Draw tree
        LibTree.drawTree(data, svg);
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

        var links = {type: 'explicit',
                     paths: [{id: ['object','array'],
                              to: {script: 'debug', args: {show_json: true}}},
                             {id: ['array'],
                              to: {script: 'debug', args: {show_json: true}}},
                             {id: ['array', '5', 'one'],
                              to: {script: 'debug', args: {show_json: true}}},
                             {id: ['string'],
                              to: {script: 'debug', args: {show_json: true}}}]};
        var data = encode(testData, 'debug', links);
        setupHTML(id, data);

        // Make display code visible (always for debugger)
        $("#" + canvasContainerName).css({height: "calc(100% - 12em)"});
        $("#" + codeContainerName).css({height: "calc(12em - 1px)"});
        $("#" + codeContainerName).css({display: "block"});

        drawTree(data);
    });

    // Generic JSON viewer
    Heimdall.registerVisual('json-tree', function(id, name, execute, args) {
        var json = execute.block.json_data;
        if (json) {
            json = JSON.parse(json);
        } else {
            json = {};
        };
        var data = encode(json, 'json', []);
        setupHTML(id, data);

        // Make display code visible if configured
        if (execute.block.show_json || (args && args.show_json)) {
            $("#" + canvasContainerName).css({height: "calc(100% - 15em)"});
            $("#" + codeContainerName).css({height: "calc(15em - 1px)"});
            $("#" + codeContainerName).css({display: "block"});
        } else {
            $("#" + canvasContainerName).css({height: "100%"});
            $("#" + codeContainerName).css({display: "none"});
        };

        drawTree(data);
    });
};

encapsulateTreeVisuals();
