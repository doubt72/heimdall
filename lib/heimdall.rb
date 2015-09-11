require 'sinatra/base'
require 'json'

require 'heimdall/action'
require 'heimdall/api'
require 'heimdall/config'
require 'heimdall/coder'
require 'heimdall/query'
require 'heimdall/store'
require 'heimdall/version'
require 'heimdall/server'

class Heimdall
  def self.start
    # Set up subclasses
    @@config = Heimdall::Config.new
    @@store = Heimdall::Store.new
    @@action = Heimdall::Action.new
    @@query = Heimdall::Query.new

    # Order is important here.  Load_modules reads the module config, which defines
    # the settings that are available to be set when read_config run, and once
    # configured, the modules then register their queries with the server.  All of this
    # needs to run after setting up config and query/action objects and readers:

    # Load query modules
    @@query.load_modules
    # Read configuration
    @@config.read_config((defined? CONFIG_FILE) ? CONFIG_FILE : nil)
    # Register queries from modules
    @@query.register_modules

    # Register system scripts supplied for visuals
    Dir.glob(File.join(@@config.public_folder, 'visual', '*.rb')).each do |file|
      require file
    end

    # And a debug script
    @@store.register('debug', "visual 'debug' do; end")

    # Start Sinatra server
    Sinatra::Application.set :public_folder, Heimdall.config.public_folder
    Sinatra::Application.set :port, Heimdall.config.port
    # But not the debugger unless configured
    if (Heimdall.config.debug_server)
      Heimdall::Server.start
    end
    Heimdall::API.start

    if (ENV['RACK_ENV'] != 'test')
      Sinatra::Application.run!
    end
  end

  def self.config
    @@config
  end

  def self.action
    @@action
  end

  def self.query
    @@query
  end

  def self.store
    @@store
  end

  def self.encode_script(data)
    Heimdall::Coder.encode(data)
  end
end
