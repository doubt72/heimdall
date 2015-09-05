# Chef server module

require 'ridley'

# TODO: Test this module somehow

# Configuration
class Heimdall
  class Config
    class Chef
      class << self
        include Heimdall::Config::Defaults
      end

      # Server URL
      default :server_url, nil

      # Client name
      default :client_name, nil

      # Path to private key
      default :client_key, nil
    end
  end
end

# Register configuration
Heimdall::Config.default :chef, Heimdall::Config::Chef.new

# Main module
class Heimdall
  class Query
    class Modules
      class Chef
        def self.chef
          # No idea why I have to do this, but it...  Loses threads or something
          # TODO: fix this properly
          Celluloid.shutdown
          Celluloid.boot
          # TODO: handle SSL properly
          Ridley.new(
            server_url: Heimdall.config.chef.server_url,
            client_name: Heimdall.config.chef.client_name,
            client_key: Heimdall.config.chef.client_key,
            ssl: {verify: false}
          )
        end

        # TODO: This particularly needs testing
        def self.compare_versions(a, b)
          a_maj, a_min, a_patch = a.split('.')
          b_maj, b_min, b_patch = b.split('.')
          if (a_maj > b_maj)
            return -1
          elsif (a_maj < b_maj)
            return 1
          end
          if (a_min > b_min)
            return -1
          elsif (a_min < b_min)
            return 1
          end
          if (a_patch > b_patch)
            return -1
          elsif (a_patch < b_patch)
            return 1
          end
          return 0
        end

        # TODO: This particularly needs testing
        def self.approximate_compare_versions(a, b)
          # TODO: implement this when we test (too tricky to implement without
          # testing), but for the time being, EVERYBODY WINS
          true
        end

        # TODO: error handling and especially testing
        def self.resolve_cookbook_version(name, condition)
          # TODO: check assumption that cookbooks can't contain ~, =, >, <, or space
          # TODO: replace this with library code?  Refactor at least, this is not pretty
          split = condition.split(' ')
          if (split.length > 1)
            comparison = split[0]
            version = split[1]
          elsif (condition =~ /^=|^<|^>/)
            comparison = condition[0]
            version = condition[1..-1]
          elsif (condition =~ /^~>|^<=|^>=/)
            comparison = condition[0..1]
            version = condition[2..-1]
          else
            return condition
          end
          latest = chef.cookbook.latest_version(name)
          cookbooks = chef.cookbook.versions(name)
          if (comparison == '=')
            return version
          elsif (comparison == '>')
            if (compare_versions(version, latest) > 0)
              return latest
            else
              return nil
            end
          elsif (comparison == '<')
            latest = nil
            cookbooks.each do |cv|
              if (compare_versions(version, cv) < 0)
                if (!latest || compare_versions(latest, cv) > 0)
                  latest = cv
                end
              end
            end
            return latest
          elsif (comparison == '>=')
            if (compare_versions(version, latest) >= 0)
              return latest
            else
              return nil
            end
          elsif (comparison == '<=')
            latest = nil
            cookbooks.each do |cv|
              if (compare_versions(version, cv) <= 0)
                if (!latest || compare_versions(latest, cv) > 0)
                  latest = cv
                end
              end
            end
            return latest
          elsif (comparison == '~>')
            latest = nil
            cookbooks.each do |cv|
              if (approximate_compare_versions(version, cv))
                if (!latest || compare_versions(latest, cv) > 0)
                  latest = cv
                end
              end
            end
          end
        end


        def self.register
          # Chef objects
          Heimdall.query.interface.register(
            'chef-client',
            Proc.new {|name| chef.client.find(name).to_hash}
          )
          Heimdall.query.interface.register(
            'chef-client-list',
            Proc.new {|x| {all: chef.client.all.map {|client| client.name}}}
          )

          Heimdall.query.interface.register(
            'chef-cookbook',
            Proc.new {|cookbook|
              name, version = cookbook.split(':')
              rc = chef.cookbook.find(name, version)
              rc ? rc.to_hash : nil
            }
          )
          Heimdall.query.interface.register(
            'chef-cookbook-list',
            Proc.new {|x|
              rc = {}
              chef.cookbook.all.each do |cookbook|
                rc[cookbook[0]] = cookbook[1]
              end
              rc
            }
          )
          # For turning cookbook comparison into specific version
          Heimdall.query.interface.register(
            'chef-resolve-cookbook-version',
            Proc.new {|cookbook|
              name, version = cookbook.split(':')
              resolve_cookbook_version(name, version)
            }
          )

          Heimdall.query.interface.register(
            'chef-data-bag',
            Proc.new {|name|
              rc = []
              bag = chef.data_bag.find(name)
              if (bag)
                items = bag.item.all.each do |item|
                  rc.push(item.id)
                end
                {items: rc}
              else
                nil
              end
            }
          )
          Heimdall.query.interface.register(
            'chef-data-bag-item',
            Proc.new {|data_bag_item|
              bag_name, item_name = data_bag_item.split(':')
              rc = {}
              bag = chef.data_bag.find(bag_name)
              if (bag)
                item = bag.item.find(item_name)
                item ? item.to_hash : nil
              else
                nil
              end
            }
          )
          Heimdall.query.interface.register(
            'chef-data-bag-list',
            Proc.new {|x| {all: chef.data_bag.all.map {|obj| obj.name}}}
          )
          
          Heimdall.query.interface.register(
            'chef-environment',
            Proc.new {|name| chef.environment.find(name).to_hash}
          )
          Heimdall.query.interface.register(
            'chef-environment-list',
            Proc.new {|x| {all: chef.environment.all.map {|env| env.name}}}
          )

          Heimdall.query.interface.register(
            'chef-node',
            Proc.new {|name| chef.node.find(name).to_hash}
          )
          Heimdall.query.interface.register(
            'chef-node-list',
            Proc.new {|x| {all: chef.node.all.map {|node| node.name}}}
          )

          Heimdall.query.interface.register(
            'chef-role',
            Proc.new {|name| chef.role.find(name).to_hash}
          )
          Heimdall.query.interface.register(
            'chef-role-list',
            Proc.new {|x| {all: chef.role.all.map {|role| role.name}}}
          )

          Heimdall.query.interface.register(
            'chef-user',
            Proc.new {|name| chef.user.find(name).to_hash}
          )
          # WTF is that call stack o_O
          Heimdall.query.interface.register(
            'chef-user-list',
            Proc.new {|x| {all: chef.user.all.map {|user| user.name.user.username}}}
          )

          # Search
          Heimdall.query.interface.register(
            'chef-search',
            Proc.new {|query|
              list = query.split(':')
              search = list[1..-1].join(':')
              index = list[0]
              rc = []
              begin
                case index
                when 'client'
                  rc = chef.search(:client, search)
                when 'environment'
                  rc = chef.search(:environment, search)
                when 'node'
                  rc = chef.search(:node, search)
                when 'role'
                  rc = chef.search(:role, search)
                else
                  index = 'unsupported index'
                end
              rescue Exception => e
                puts "Error executing chef-search-query: #{e.message}"
                # Got a bad search query
              end

              if (rc.length == 0)
                {query: query, index: index, search: search,
                 results: 'no results returned for query'}
              else
                {query: query, index: index, search: search,
                 index + 's' => rc.map {|item| item.name}}
              end
            }
          )

          # Resolve runlist items
          Heimdall.query.interface.register(
            'chef-resolve-runlist',
            Proc.new {|item|
              if (item =~ /^role/)
                {
                  script: 'chef-role',
                  args: {name: item.gsub(/^role\[/, '').gsub(/\]$/, '')}
                }
              elsif (item =~ /^recipe/)
                cookbook = item.gsub(/^recipe\[/, '').gsub(/\]$/, '')
                cookbook = cookbook.gsub(/::.*/, '')
                version = chef.cookbook.latest_version(cookbook)
                {
                  script: 'chef-cookbook',
                  args: {list_id: cookbook, name: version}}
              else
                nil
              end
            }
          )
        end
      end
    end
  end
end
