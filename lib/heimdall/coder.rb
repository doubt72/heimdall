# Heimdall script evaluation code

# TODO: sanitize this (cleanroom, maybe?), right now this is not locked down or
# anything. I.e., something like "visual 'foo'; exit; end" would abort the whole
# thing

class Heimdall
  class Coder
    def self.encode(data)
      begin
        @@current_script = {}
        instance_eval data
        @@current_script
      rescue Exception => e
        {error: e}
      end
    end

    # Set config values for visuals
    def self.set(key, value = nil, &block)
      result = value
      if (block)
        result = block.call
      end
      if (result)
        if (key.class == Symbol)
          @code['block'][key.to_s] = result
        elsif (key.class == String)
          @code['block'][key] = result
        end
      end
    end

    # A common setting shortcut
    def self.show_json()
      @code['block']['show_json'] = true;
    end

    def self.visual(type, &block)
      @code = {}
      @code['visual'] = type
      @code['block'] = {}
      yield block
      @@current_script = @code
    end
  end
end
