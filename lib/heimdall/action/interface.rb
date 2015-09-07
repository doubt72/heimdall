# Heimdall action interface

class Heimdall
  class Action
    class Interface
      def initialize
        @register = {}
      end

      # Registered actions should be functions (Proc objects) which take one
      # parameter (which will be passed in the form of a string from the API).  For
      # example, the following is a action which would simply execute arbitrary ruby
      # code, with the return value being passed back to the API to be encoded into
      # JSON:
      #
      # register('ruby', Proc.new {|code| eval code})
      #
      # You probably never actually want to do that, but it's possible; the point
      # being actions can be almost entirely arbitrary

      def register(name, function)
        @register[name] = function
      end

      # Object will be passed as a string from the API; any type conversion required
      # should be done by the registerd proc (i.e., complex JSON could be string
      # encoded).
      def execute(name, object)
        begin
          if (@register[name])
            rc = @register[name].call(object)
            {return: rc}
          else
            {error: 'notfound'}
          end
        rescue Exception => e
          {error: e}
        end
      end

      def delete(name)
        if (@register[name])
          @register.delete(name)
          true
        else
          false
        end
      end

      def list
        @register.keys
      end
    end
  end
end
