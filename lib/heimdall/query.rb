# Heimdall query interface

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

    def system_queries
      # Set up debug queries:
      Heimdall.query.interface.register(
        'debug-echo',
        Proc.new {|x| x}
      )

      # For persistence
      @debug_random = {}

      # Expects JSON string with center (target), perturb (variation from target),
      # correction (back to target), and id (for persistence)
      Heimdall.query.interface.register(
        'debug-random',
        Proc.new {|x|
          params = JSON.parse(x)
          id = params['id']
          center = params['center']
          corr = params['correction']
          perturb = params['perturb']
          val = @debug_random[id]
          if (val.nil?)
            val = center
          end
          val += rand() * perturb * 2 - perturb
          if (val < center)
            val += corr
          else
            val -= corr
          end
          @debug_random[id] = val
          val
        }
      )
    end

    def register_modules
      Heimdall::Query::Loader.register_all

      system_queries
    end
  end
end
