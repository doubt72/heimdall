# Simple debug web server

require 'heimdall/server/debugger'

class Heimdall
  class Server
    def self.start
      Heimdall::Server::Debugger.start
    end
  end
end
