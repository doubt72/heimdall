# Heimdall query module loader

class Heimdall
  class Query
    class Loader
      def self.load_all
        Heimdall.config.module_dirs.each do |dir|
          Dir.glob(File.join(dir, '*.rb')).each do |file|
            load file
          end
        end
      end

      def self.register_all
        Heimdall.config.module_dirs.each do |dir|
          Dir.glob(File.join(dir, '*.rb')).each do |file|
            name = File.basename file, ".rb"
            eval "Heimdall::Query::Modules::#{name.capitalize}.register"
          end
        end
      end
    end
  end
end
