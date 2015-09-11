# Query and store REST endpoints

require 'heimdall/api/action'
require 'heimdall/api/query'
require 'heimdall/api/store'

# TODO: add authorization filters; integrate with OCID for security?

class Heimdall
  class API
    def self.start
      Heimdall::API::Action.start
      Heimdall::API::Query.start
      Heimdall::API::Store.start
    end
  end
end
