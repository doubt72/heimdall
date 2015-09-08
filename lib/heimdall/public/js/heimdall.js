// This script requires JQuery and D3:
// http://code.jquery.com/jquery-1.11.2.min.js
// http://d3js.org/d3.v3.min.js

var Heimdall = {
    registeredVisuals: {},

    // Registered functions should take an element ID, name, encoded script, and args
    registerVisual: function(name, func) {
        this.registeredVisuals[name] = func;
    },

    // Run takes element ID to "populate", name of script, and optional argument values
    run: function(id, name, args) {
        if (name == "") {
            return;
        };
        var execute;
        $.ajax({url: "/store/" + name + "?encode=true",
                dataType: "json",
                success: function(data) {
                    execute = data.script
                    var func = Heimdall.registeredVisuals[execute.visual];
                    if (func == null) {
                        func = Heimdall.registeredVisuals['debug'];
                    };
                    func(id, execute, args, name);
                }});
    },
};

// Register debug visual for testing
Heimdall.registerVisual('debug', function(id, execute, args, name) {
    $(id).css('background', '#FFF');
    function renderResult(source) {
        var text = '&nbsp;';
        text += '<div class="debug-info"><b>===== debug mode =====</b></div>';
        text += '<div class="debug-info">Parameters:</div>';
        if (execute && execute.error != null) {
            text += '<div class="debug-info"><b>error encoding:</b><br />';
            text += '<pre>' + execute.error + '</pre></div>';
        };
        text += '<div class="debug-info"><b>name:</b> ' + name + '</div>';
        text += '<div class="debug-info"><b>populate ID:</b> ' + id + '</div>';
        text += '<div class="debug-info"><b>script source:</b><br />';
        text += '<pre>' + source + '</pre></div>';
        if (execute && execute.visual != null) {
            text += '<div class="debug-info"><b>visual:</b> ' + execute.visual;
            if (Heimdall.registeredVisuals[execute.visual] == null) {
                text += ' <b>[invalid]</b>';
            } else {
                text += ' <b>[valid]</b>';
            };
            text += '</div>';
        };
        text += '<div class="debug-info"><b>encoded script:</b><br /><pre>' +
            JSON.stringify(execute, null, 2) + '</pre></div>';
        text += '<div class="debug-info"><b>supplied args:</b><br /><pre>' +
            JSON.stringify(args, null, 2) + '</pre></div>';
        text += '<div class="debug-info"><b>available visuals:</b><br /><pre>';
        text += JSON.stringify(Object.keys(Heimdall.registeredVisuals), null, 2);
        text += '</pre></div>';
        $(id).html(text);
        $(".debug-info").css("padding", "0.5em 1.5em");
    };
    $.ajax({url: '/store/' + name,
            dataType: 'json',
            success: function(data) {
                renderResult(data.script);
            },
            error: function(xhr, status, error) {
                renderResult('Error: ' + error);
            }});
});
