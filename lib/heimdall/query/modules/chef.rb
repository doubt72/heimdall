# Chef server module
#
# Author: Douglas Triggs (douglas@triggs.org)

require 'chef/http'
require 'chef/http/authenticator'

# Configuration
class Heimdall
  class Config
    class Chef
      class << self
        include Heimdall::Config::Defaults
      end

      # Server URL
      config :server_url

      # Client name
      config :client_name

      # Path to private key
      config :client_key
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
        class ServerAPI < ::Chef::HTTP
          def initialize(options = {})
            options[:client_name] = Heimdall.config.chef.client_name
            options[:signing_key_filename] = Heimdall.config.chef.client_key
            super(Heimdall.config.chef.server_url, options)
          end
          use ::Chef::HTTP::Authenticator
        end

        def self.latest_cookbook_version(name)
          chef_request("/cookbooks/#{name}")[name]['versions'][0]['version']
        end

        # TODO: error handling?
        def self.resolve_cookbook_version(name, condition)
          # TODO: check assumption that cookbooks can't contain ~, =, >, <, or space
          split = condition.split(' ')
          if (split.length > 1)
            comparison = split[0]
            version = split[1]
          elsif (condition =~ /^~>|^<=|^>=/)
            comparison = condition[0..1]
            version = condition[2..-1]
          elsif (condition =~ /^=|^<|^>/)
            comparison = condition[0]
            version = condition[1..-1]
          else
            return condition
          end
          latest = latest_cookbook_version(name)
          if (comparison == '=')
            return version
          elsif (comparison == '>')
            if (Gem::Version.new(latest) > Gem::Version.new(version))
              return latest
            else
              return nil
            end
          elsif (comparison == '>=')
            if (Gem::Version.new(latest) >= Gem::Version.new(version))
              return latest
            else
              return nil
            end
          elsif (comparison == '<' || comparison == '<=' || comparison == '~>')
            latest = nil
            cookbooks = chef_request("/cookbooks/#{name}")[name]['versions'].map {|v|
              v['version']}
            cookbooks.each do |cv|
              if (Gem::Dependency.new('', condition).match?('', cv))
                if (!latest || Gem::Version.new(cv) > Gem::Version.new(latest))
                  latest = cv
                end
              end
            end
            return latest
          end
        end

        def self.chef_request(url)
          data = false
          headers = {'Content-Type' => 'application/json',
                     'Accept' => 'application/json'}

          chef_rest = ServerAPI.new(:raw_output => true)
          result = JSON.parse(chef_rest.request(:GET, url, headers, data))
        end

        def self.start
          # Chef objects
          Heimdall.query.interface.register(
            'chef-client',
            Proc.new {|name| chef_request("/clients/#{name}")}
          )
          Heimdall.query.interface.register(
            'chef-client-list',
            Proc.new {|x| {all: chef_request('/clients').keys} }
          )

          Heimdall.query.interface.register(
            'chef-cookbook',
            Proc.new {|cookbook|
              name, version = cookbook.split(':')
              chef_request("/cookbooks/#{name}/#{version}")
            }
          )
          Heimdall.query.interface.register(
            'chef-cookbook-list',
            Proc.new {|x|
              rc = {}
              chef_request('/cookbooks?num_versions=all').each do |cookbook|
                rc[cookbook[0]] = cookbook[1]['versions'].map {|v| v['version']}
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
              bag = chef_request("/data/#{name}")
              if (bag)
                {items: bag.keys}
              else
                nil
              end
            }
          )
          Heimdall.query.interface.register(
            'chef-data-bag-item',
            Proc.new {|data_bag_item|
              bag_name, item_name = data_bag_item.split(':')
              chef_request("/data/#{bag_name}/#{item_name}")
            }
          )
          Heimdall.query.interface.register(
            'chef-data-bag-list',
            Proc.new {|x| {all: chef_request('/data').keys}}
          )
          
          Heimdall.query.interface.register(
            'chef-environment',
            Proc.new {|name| chef_request("/environments/#{name}")}
          )
          Heimdall.query.interface.register(
            'chef-environment-list',
            Proc.new {|x| {all: chef_request('/environments').keys}}
          )

          Heimdall.query.interface.register(
            'chef-node',
            Proc.new {|name| chef_request("/nodes/#{name}")}
          )
          Heimdall.query.interface.register(
            'chef-node-list',
            Proc.new {|x| {all: chef_request('/nodes').keys}}
          )

          Heimdall.query.interface.register(
            'chef-role',
            Proc.new {|name| chef_request("/roles/#{name}")}
          )
          Heimdall.query.interface.register(
            'chef-role-list',
            Proc.new {|x| {all: chef_request('/roles').keys}}
          )

          Heimdall.query.interface.register(
            'chef-user',
            Proc.new {|name| chef_request("/users/#{name}")}
          )
          Heimdall.query.interface.register(
            'chef-user-list',
            Proc.new {|x| {all: chef_request('/users').map {|u| u['user']['username']}}}
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
                rc = chef_request("/search/#{index}?q=#{search}")
              rescue Exception => e
                puts "Error executing chef-search-query: #{e.message}"
                # Got a bad search query
              end
              if (rc.length == 0)
                {query: query, index: index, search: search,
                 results: 'no results returned for query'}
              else
                {query: query, index: index, search: search,
                 index + 's' => rc['rows'].map {|item| item['name']}}
              end
            }
          )

          # TODO: additional endpoints?
          # Top level: license, organizations? (though same problem as users?)
          # Org level: association_requests, containers, cookbook recipes, env stuff,
          #   groups, policies/groups, sandboxes, status?

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
                version = latest_cookbook_version(cookbook)
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
