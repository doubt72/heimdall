# Heimdall query interface

# Also handles loading of actions

require 'heimdall/query/interface'
require 'heimdall/query/loader'

class Heimdall
  class Query
    attr_reader :interface

    def initialize
      @interface = Heimdall::Query::Interface.new
    end

    def load_modules
      Heimdall::Query::Loader.load_all
    end

    def register_modules
      Heimdall::Query::Loader.register_all
    end
  end
end
