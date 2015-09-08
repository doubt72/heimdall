# Simple config

class Heimdall
  class Config
    module Defaults
      # config.key will return default value unless redefined (which is done with 'key
      # value' or 'config.key value' or even something like 'key(value)'). Values can
      # only be redefined once without raising an error.
      def default(key, value)
        define_method key do |arg = nil|
          if (arg == nil)
            value
          else
            if (arg.class == String)
              arg = "'#{arg}'"
            end
            error_msg = "multiple definitions of \"#{key}\" value"
            instance_eval "
                def #{key}(new = nil)
                  if (new == nil)
                    #{arg}
                  else
                    raise '#{error_msg}'
                  end
                end"
          end
        end
      end

      def config(key)
        default key, nil
      end
    end
  end
end

class Heimdall
  class Config
    class << self
      include Heimdall::Config::Defaults
    end

    def read_config(file)
      if (file)
        begin
          instance_eval "config = self; #{File.read(file)}"
        rescue Exception => e
          puts "== CONFIGURATION ERROR: #{e}"
          puts e.backtrace
          exit
        end
      end
    end

    # TODO: this probably isn't the cleanest way of doing this, but rspec fails to
    # find itself/the heimdall gem
    if (ENV['RACK_ENV'] == 'test')
      root_dir = ''
    else
      root_dir = Gem::Specification.find_by_name('heimdall').gem_dir
    end

    # Default configuration values
  
    # This is the port that Sinatra listens on
    default :port, 9999

    # This is the public folder that contains CSS and JavaScript needed for the
    # debugger and widgets
    default :public_folder, File.join(root_dir, 'lib/Heimdall/public')

    # This either enables or disables the Heimdall debugger interface
    # TODO: switch this to false at some point
    default :debug_server, true

    # This is the list of query module directories
    default :module_dirs, [File.join(root_dir, 'lib/Heimdall/query/modules')]
  end
end
