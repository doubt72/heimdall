# Heimdall Visuals

## Creating Visuals

Visuals (and required libraries) are stored in the public folder and are loaded by
the debugger at runtime (equivalent code is necessary for embedding the server).
This directory can also be changed in the configuration.

### Lib Directory

Library files go in `lib/heimdall/public/lib` directory by default.  Any Javascript (`.js`)
and CSS (`.css`) files there will be automatically loaded.  This directory should
contain any library files needed by visuals.  Other files (such as required licence
files or non-minified reference files) can also be stored there (but will need to
different extensions to avoid being loaded, for instance `.jsx`.  Or anything
besides `.js` or `.css`, really).

### Heimdall Visuals

Visuals are stored in `lib/heimdall/public/visual` by default.  Files in those directories
will be loaded automatically by the debugger; as with the lib directory, Javascript
(`.js`) and CSS (`.css`) files will be automatically loaded.  In addition, the
Heimdall server itself will load (`.rb`) files stored there &mdash; these should be
used to register any scripts needed to integrate different visuals with each other
(for instance, as the Chef server visuals do).  Files with other extensions could
theoretically be stored there and be ignored, but there probably isn't any
reason to do so.

Visuals should register themselves using:

```
Heimdall.registerVisual(name, callback)
```

Where `name` is the name of the visual (referred to in the DSL with the `visual`
block), and `callback` is a function that has the following pattern:

```
function(id, execute, args, name) { ... }
```

Where `id` is the HTML ID of the div where the visual should render itself,
`execute` is a JSON object containing the parsed visual (which will contain the
`visual` key which will match the name the visual was registered as, and the `block`
key will contain any values from the parsed visual block in the DSL), `args` is the
JSON args passed to the visual (for instance, the name of the object to render
&mdash; any dynamic data that's not hardcoded in the script calling the visual), and
`name` is the name of the calling script (mainly used for debugging, it shouldn't
matter for most scripts and is generally ignored).

The callback function is called by Heimdall with the following code in a web page
somewhere:

```
Heimdall.run(id, name, args)
```

Where `id` is (again) an HTML ID (passed to the visual), `name` is the name of the
script to parse (which will be encoded by the Sinatra server and returned as JSON
and passed to the visual), and `args` are arguments passed to the visual.

### A Note on HTML IDs

In general, HTML IDs should be avoided in the rendered visual; otherwise a visual of
a given type would be limited to one rendered per page.  If IDs are necessary for
some reason, they should probably be by appending to the ID that the visual
is rendered in to avoid causing issues with repeated IDs.

## More on Debugging Visuals

If the visual needs any dummy data from the server for testing, it can use the
built-in system debug queries, i.e., `debug-echo` and `debug-random`.  Echo will
return the value passed to it (which is stored in the standard query `return` key in
the JSON response body).  Random will (persistently) return values defined by a
passed stringified JSON object containing the following keys: center, perturb,
correction, and id.  Center is the "target" that values will tend towards, perturb
is maximum distance (on each query) that a value will move from the previous value,
correction is the amount it will move towards the "target" after being perturbed (it
may overshoot), and id is a persistent identifier so that requests for the same id
will be cumulative.

## Included Visuals

Currently there are a number of included visuals, including various tree visuals for
looking at various Chef server objects and navigating through them, as well as a
couple of generic tree visuals for working with generic JSON or on the library
itself (there's also fairly over-the-top spatial globe visual).  They can be listed
in the debugger by running the debug visual.

Probably the best simple example of a visual is the `json-tree` visual in
`json_tree.js`; the Chef visuals (since they interact with each other) are much more
complicated, though examining how they work may be instructive.

There are also some system scripts that are loaded into the storage class at startup
to facilitate navigation between Chef tree visuals.

The built-in `debug` visual is part of Heimdall itself which will load automatically
if a visual defined in the DSL doesn't exist, or if there's a syntax error that
causes the DSL script not to succeed.

