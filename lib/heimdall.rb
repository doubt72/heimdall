require 'json'

# Set up configuration before including anything, because some includes are skipped
# based on configuration (TODO: this should change once sinatra is modularized)
require 'heimdall/config'

class Heimdall
  @@config = Heimdall::Config.new()

  def self.config
    @@config
  end
end

require 'heimdall/api'
require 'heimdall/coder'
require 'heimdall/query'
require 'heimdall/store'
require 'heimdall/version'

# TODO: switch include to explicit call once sinatra modularized (technically, API
# has also configured endpoints)
if (Heimdall.config.debug_server)
  require 'heimdall/server'
end

set :public_folder, Heimdall.config.public_folder
set :port, Heimdall.config.port

class Heimdall
  def self.query
    @@query
  end

  def self.store
    @@store
  end

  @@store = Heimdall::Store.new
  @@query = Heimdall::Query.new

  # Order is important here.  Load_modules reads the module config, which defines
  # the settings that are available to be set when read_config run, and once
  # configured, the modules then register their queries with the server.  All of this
  # needs to run after setting up config and query objects and readers.
  @@query.load_modules
  @@config.read_config((defined? CONFIG_FILE) ? CONFIG_FILE : nil)
  @@query.register_modules

  # Register system scripts supplied for visuals
  Dir.glob(File.join(@@config.public_folder, 'js', 'visual', '*.rb')).each do |file|
    require file
  end
  # And a debug script
  @@store.register('debug', "visual 'debug' do; end")

  def self.encode_script(data)
    Heimdall::Coder.encode(data)
  end
end
