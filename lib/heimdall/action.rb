# Heimdall action interface

require 'heimdall/action/interface'

class Heimdall
  class Action
    attr_reader :interface

    def initialize
      @interface = Heimdall::Action::Interface.new
    end
  end
end
