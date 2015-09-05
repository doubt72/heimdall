# Stub data store
# TODO: replace with real (persistent) data store

class Heimdall
  class Store
    def initialize
      @data = {}
      @system = {}
    end

    def load(name)
      if (@system[name])
        @system[name]
      else
        @data[name]
      end
    end

    def save(name, data)
      if (@system[name])
        false
      else
        @data[name] = data
        true
      end
    end

    def delete(name)
      if (@data[name])
        @data.delete(name)
        true
      else
        false
      end
    end

    def register(name, data)
      @system[name] = data
    end
    
    def system?(name)
      if (@system[name])
        true
      else
        false
      end
    end

    def list(all = true)
      if (all)
        @system.keys + @data.keys
      else
        @data.keys
      end
    end

    def list_system()
      @system.keys
    end
  end
end
