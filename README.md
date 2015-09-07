# Heimdall

Heimdall is a extensible/configurable visualization engine that combines a Ruby DSL
with Javascript visual widgets ("visuals") created for visualizing things like Chef
Server data.  _This documentation is something of a stub/work-in-progress with
random thoughts in it._

## Running Heimdall

Before running Heimdall, cd to the Heimdall top directory and run:

`bundle install`

Once that's done, you can start the server with:

`bin/server`

You can the connect to the debugger on localhost on port 9999 (by default). The root
path will automatically redirect to the `/debugger` endpoint if the debugger is
running.  Right now the debugger runs by default; in the future that behavior will
be reversed and the debugger will need to be turned on in a supplied config file.

An optional config file can also be supplied as an argument to the server script, as so:

`bin/server config.rb`

To run the tests, run:

`rspec`

## Scripting DSL ##

The scripting DSL looks something like this:

```
one = 'one'

visual 'debug' do
  set :any, "#{one}"
  set :version, Heimdall::VERSION
  set :calc do
    rc = 1
    1.upto(10) do |x|
      rc *= x
    end
    rc
  end
end
```

This script will initialize the 'debug' visual (which is also the default visual
that loads if the server doesn't recognize the supplied visual).  It sets the value
of `any` to the string 'one' and the value of `version` to whatever the current
version of Heimdall is, encodes everything into a JSON object and passes it to the
Javascript engine.  Blocks can also be supplied to the set calls, and will be
evaluated and assigned the same as any other values: `calc` will get a value of 10!
(that is, 3628800).  The names of the settings can be strings or symbols; everything
will get converted to strings once converted to JSON, other types will be ignored.

There should be only one visual block per script; if there are more than one, only
the values set in the last one will used.  Beyond that, any legal ruby can be used.

_The DSL is very much a work in progress; it's unlikely to look quite like this once
polished._

Parameters should be a JSON object passed to the script at runtime.

## Server API

There are two endpoints available from the server, the simple storage REST API at
`/store` and the query API at `/query`.  Both of these are on the same port as the
debug server.

### Storage API

* `GET /store`: for listing all scripts

This will return a JSON list with all the names of stored scripts in string form.

* `POST /store`: for creating new scripts

This requires a JSON object with `name` and `script` keys (both strings).

* `GET /store/<name>`: for reading retrieved scripts

This will return a JSON object with `script` key.  If the `encode` parameter is
suppled with a value of `true`, it will encode the script for processing by
Javascript visuals.

* `PUT /store/<name>`: for updating scripts

This requires a JSON object with `script` keys (and the script in string for), which
is replaced for the given name.

* `DELETE /store/<name>`: for deleting scripts

### Query API

If any queries are registered on the server, they can be accessed from the query
endpoint:

* `POST /query`: make a query.

Two keys need to be supplied, `name` (name of the query key) and `query` (which is
passed to the query key function) on the server.  If an error occurs, an `error` key
is returned in the response body, or `return` if the query succeeds.

## Query Modules

The Heimdall server is initialized in the `bin/server` executable which sets
everything up (right now this isn't well encapsulated, at some point will probably
modularize Sinatra to all things to be simplified a bit.  Also, the storage of
scripts is stubbed into an in-memory hash with no persistent storage across runs).

Any modules in the `lib/heimdall/query/modules` directory will be loaded by default
(this is also configurable with the `module_dirs` config value).  See the included
Chef query module for an example, but things to note are:

(1) queries are registered like this:

```
Heimdall.query.interface.register(name, function)
```

Where `name` is the query name, and `function` is an anonymous function that takes
one argument.

(2) defaults for the configuration file can be registered by adding new config
objects (again, see the Chef query module for an example): see below.

## Config

The default way of configuring settings is `key value` although since key is really
a function, it can also be `key(value)`.  Module settings should be configured by
the name of the module, i.e., the chef module keys like so: `chef.key value`.  The
`config` variable is available but not necessary.

Config files look something like this:

```
config.port 8001
config.debug_server true
config.module_dirs(config.module_dirs + ['/home/chef/heimdall/modules'])

port_value = 3001

config.chef.url "http://localhost:#{port_value}"
config.chef.client 'doubt72'
config.chef.key '<some path>'
```

Note that values can only be configured once before raising an error.

## Creating Visuals

Visuals are stored in `lib/heimdall/public/js/visual` &mdash; there is also a
directory with common files in the sibling `lib` directory.  Anything in those
directories will be loaded automatically by the debugger (equivalent code is
necessary for embedding the server).  There is also a built in `debug` visual built
into Heimdall itself which will load automatically if a visual defined in the DSL
doesn't exist, or if there's a syntax error that causes the DSL script not to
succeed.

Currently there are a number of included visuals, including various tree visuals for
looking at various Chef server objects and navigating through them, as well as a
couple of generic tree visuals for working with generic JSON or on the library
itself.  They can be listed in the debugger by running the debug visual.

There are also some system scripts that are loaded in the storage module to
facilitate navigation between Chef tree visuals.

## TODO List

### Now:

# Make cookbook dependency graph
* Properly modularize Sinatra (will probably require changes to test setup)
* Make diagrams
  * Server structure
  * Source layout
  * REST API
* Add logging

### Later:

* Set up persistent data store to replace in-memory hash stub
* Sanitize/polish DSL (perhaps use cleanroom?)
* Switch to params in the debugger that aren't encoded in the URL (going to break down with long scripts)
* Local copies of JQuery and D3 libraries instead of remote
* Add authn/authz filters
* Test in FF and Safari
* Switch debugger to default off unless configured
* Make visuals properly embeddable
  * query calls need to be configurable/explicit uri with port/server
* _**TEST CHEF MODULE**_ (...stub out chef server?)
* _**TEST VISUALS SOMEHOW**_
* Generally go through code TODOs
* Rejigger scripts to run asynchronously