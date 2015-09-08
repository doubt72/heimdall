# Query Modules

## Creating Modules

When the Heimdall server is initialized with `bin/server`, any modules in the
modules directory (or directories) will be loaded.  By default, the contents of
`lib/heimdall/query/modules` are loaded, but this is configurable with the
`module_dirs` config value.

### Configuration Setup

There are a couple things a module needs to handle.  The first is configuration
(assuming the module has any, which any non-stub module probably would); modules
should create a subclass of `Heimdall::Config` with the configuration defaults using
`default` &mdash; defaults can be either a "real" value or `nil` if no default value
makes sense. The `config` method can also be used if the default value is `nil`.  This
class needs to be registered with the main class by doing something like this:

```
Heimdall::Config.default :module, Heimdall::Config::Module.new
```

In this example, the Module subclass of `Heimdall::Config` must already be defined and
(if the class has a default/config for, say, url) the settings will be set by
`module.url <value>` or `config.module.url <value>` in the config file passed to the
server.  They can also be accessed by not passing a value, i.e., `module.url` will
return the current value of the setting.

### Intialization (Query/Action Setup)

The other thing a a module needs to do is register queries/actions:

The module itself should be a subclass of `Heimdall::Query::Modules` and be in a
file with the same name as the subclass (class capitalized, file not capitalized).
When the server is initialized, it will call the `start` class method, i.e., it
will call:

```
Heimdall::Query::Modules::Module.start
```

Again, assuming the module is called `Module` and is in a file `module.rb`.  This
function should in turn register and queries in the register class method like so:

```
Heimdall.query.interface.register(name, function)
```

And actions like so:

```
Heimdall.action.interface.register(name, function)
```

Where `name` is the query name, and `function` is an anonymous function that takes
one argument.  The argument will be a string passed from the API; if any complex
data needs to be passed (e.g., a complex JSON object of some sort), it should be
encoded (stringified) by the visual and parsed by the function.

Note that the mechanism used by actions and queries is pretty much identical; the
difference is semantic.  Queries should _never_ have any sort of side effects, and
actions may (for instance, they may start a job on another server somewhere).  It's
up to the module writer to maintain this distinction since the server doesn't
enforce it (nor, in practical terms, can it).

### An Example

To see an example of a module, see the included Chef module:
`lib/heimdall/query/modules/chef.rb` which handles connections to a Chef server
using Ridley and returns various types of Chef objects (as well as parsing run list
items and such).
