require 'spec_helper'

# Load the module file like the loader does
load 'lib/heimdall/query/modules/chef.rb'

describe "Chef module" do
  context "configuration" do
    it "sets up configuration" do
      Heimdall.config.chef.class.should eq(Heimdall::Config::Chef)

      Heimdall.config.chef.server_url.should eq(nil)
      Heimdall.config.chef.client_name.should eq(nil)
      Heimdall.config.chef.client_key.should eq(nil)
    end
  end

  context "module" do
    let(:chef_class) { Heimdall::Query::Modules::Chef }

    before(:each) do
      allow(chef_class).to receive(:chef_request).with('/cookbooks/name').
                            and_return({
                                         "name" =>
                                         {"versions" => [
                                            {"version" => '2.0.0'},
                                            {"version" => '1.0.0'},
                                            {"version" => '0.5.0'}
                                          ]}
                                       })
    end

    context "helper functions" do
      context "resolve_cookbook_versions" do
        it "resolves 'version' as itself" do
          chef_class.resolve_cookbook_version('name', '1.0.0').should eq('1.0.0')
        end

        it "resolves '= version' as itself" do
          chef_class.resolve_cookbook_version('name', '=1.0.0').should eq('1.0.0')

          chef_class.resolve_cookbook_version('name', '= 1.0.0').should eq('1.0.0')
        end

        it "resolves '> version'" do
          chef_class.resolve_cookbook_version('name', '>1.0.0').should eq('2.0.0')

          chef_class.resolve_cookbook_version('name', '> 1.0.0').should eq('2.0.0')
          chef_class.resolve_cookbook_version('name', '> 2.0.0').should eq(nil)
          chef_class.resolve_cookbook_version('name', '> 2.0.1').should eq(nil)
        end

        it "resolves '>= version'" do
          chef_class.resolve_cookbook_version('name', '>=1.0.0').should eq('2.0.0')

          chef_class.resolve_cookbook_version('name', '>= 1.0.0').should eq('2.0.0')
          chef_class.resolve_cookbook_version('name', '>= 2.0.0').should eq('2.0.0')
          chef_class.resolve_cookbook_version('name', '>= 2.0.1').should eq(nil)
        end

        it "resolves '< version'" do
          chef_class.resolve_cookbook_version('name', '<1.0.0').should eq('0.5.0')

          chef_class.resolve_cookbook_version('name', '< 1.0.0').should eq('0.5.0')
          chef_class.resolve_cookbook_version('name', '< 0.5.0').should eq(nil)
          chef_class.resolve_cookbook_version('name', '< 0.4.0').should eq(nil)
        end

        it "resolves '<= version'" do
          chef_class.resolve_cookbook_version('name', '<=1.0.0').should eq('1.0.0')

          chef_class.resolve_cookbook_version('name', '<= 1.0.0').should eq('1.0.0')
          chef_class.resolve_cookbook_version('name', '<= 0.5.0').should eq('0.5.0')
          chef_class.resolve_cookbook_version('name', '<= 0.4.0').should eq(nil)
        end

        it "resolves '~> version'" do
          allow(chef_class).to receive(:chef_request).with('/cookbooks/more').
                                and_return({
                                             "more" =>
                                             {"versions" => [
                                                {"version" => '2.0.0'},
                                                {"version" => '1.5.5'},
                                                {"version" => '1.5.0'},
                                                {"version" => '1.0.1'},
                                                {"version" => '1.0.0'},
                                                {"version" => '0.6.0'},
                                                {"version" => '0.5.1'},
                                                {"version" => '0.5.0'}
                                              ]}
                                           })
          chef_class.resolve_cookbook_version('more', '~>1.0.0').should eq('1.0.1')

          chef_class.resolve_cookbook_version('more', '~> 1.0.0').should eq('1.0.1')
          chef_class.resolve_cookbook_version('more', '~> 1.0').should eq('1.5.5')
          chef_class.resolve_cookbook_version('more', '~> 1.5.0').should eq('1.5.5')
          chef_class.resolve_cookbook_version('more', '~> 1.5').should eq('1.5.5')
          chef_class.resolve_cookbook_version('more', '~> 1.5.5').should eq('1.5.5')
          chef_class.resolve_cookbook_version('more', '~> 0.5.0').should eq('0.5.1')
          chef_class.resolve_cookbook_version('more', '~> 0.5').should eq('0.6.0')
          chef_class.resolve_cookbook_version('more', '~> 0.4.0').should eq(nil)
          chef_class.resolve_cookbook_version('more', '~> 0.4').should eq('0.6.0')
          chef_class.resolve_cookbook_version('more', '~> 2.0.1').should eq(nil)
        end
      end
    end

    context "start" do
      let(:query_list) {
        [
          'chef-client', 'chef-client-list',
          'chef-cookbook', 'chef-cookbook-list',
          'chef-data-bag', 'chef-data-bag-item', 'chef-data-bag-list',
          'chef-environment', 'chef-environment-list',
          'chef-node', 'chef-node-list',
          'chef-resolve-cookbook-version', 'chef-resolve-runlist',
          'chef-role', 'chef-role-list',
          'chef-search',
          'chef-user', 'chef-user-list',
          'debug-echo', 'debug-random'
        ]
      }

      before(:each) do
        chef_class.start
      end

      it "registers its queries" do
        Heimdall.query.interface.list.sort.should eq(query_list)
      end

      it "doesn't register any actions" do
        Heimdall.action.interface.list.sort.should eq([])
      end
    end

    context "queries" do
      context "clients" do
        let(:name) { 'name' }

        before(:each) do
          allow(chef_class).to receive(:chef_request).with('/clients').
                                and_return({name => name})
          allow(chef_class).to receive(:chef_request).with('/clients/name').
                                and_return({name: name})
        end

        it "lists clients" do
          Heimdall.query.interface.execute('chef-client-list', '*').
            should eq({return: {all: [name]}})
        end

        it "retrieves a client" do
          Heimdall.query.interface.execute('chef-client', name).
            should eq({return: {name: name}})
        end
      end

      context "cookbooks" do
        let(:name) { 'name' }
        let(:version) { '1.0.0' }
        let(:eq_version) { '= 1.0.0' }
        let(:cookbook_name) { name + ':' + version }
        let(:cookbook_eq_name) { name + ':' + eq_version }

        before(:each) do
          allow(chef_class).to receive(:chef_request).with('/cookbooks?num_versions=all').
                                and_return({
                                             "name" =>
                                             {"versions" => [
                                                {"version" => '1.0.0'},
                                              ]}
                                           })
          allow(chef_class).to receive(:chef_request).with('/cookbooks/name/1.0.0').
                                and_return({name: name})
        end

        it "lists cookbooks" do
          Heimdall.query.interface.execute('chef-cookbook-list', '*').
            should eq({return: {name => [version]}})
        end

        it "retrieves a cookbook" do
          Heimdall.query.interface.execute('chef-cookbook', cookbook_name).
            should eq({return: {name: name}})
        end

        it "resolves a cookbook version" do
          Heimdall.query.interface.execute('chef-resolve-cookbook-version',
                                           cookbook_eq_name).
            should eq({return: version})
        end
      end

      context "data bags" do
        let(:name) { 'name' }
        let(:id) { 'id' }

        before(:each) do
          allow(chef_class).to receive(:chef_request).with('/data').
                                and_return({name => name})
          allow(chef_class).to receive(:chef_request).with('/data/name').
                                and_return({id => id})
          allow(chef_class).to receive(:chef_request).with('/data/name/id').
                                and_return({name: name})
        end

        it "lists data bags" do
          Heimdall.query.interface.execute('chef-data-bag-list', '*').
            should eq({return: {all: [name]}})
        end

        it "retrieves a data bag" do
          Heimdall.query.interface.execute('chef-data-bag', name).
            should eq({return: {items: [id]}})
        end

        it "retrieves a data bag item" do
          Heimdall.query.interface.execute('chef-data-bag-item', name + ':' + id).
            should eq({return: {name: name}})
        end
      end

      context "environments" do
        let(:name) { 'name' }

        before(:each) do
          allow(chef_class).to receive(:chef_request).with('/environments').
                                and_return({name => name})
          allow(chef_class).to receive(:chef_request).with('/environments/name').
                                and_return({name: name})
        end

        it "lists environments" do
          Heimdall.query.interface.execute('chef-environment-list', '*').
            should eq({return: {all: [name]}})
        end

        it "retrieves a environment" do
          Heimdall.query.interface.execute('chef-environment', name).
            should eq({return: {name: name}})
        end
      end

      context "nodes" do
        let(:name) { 'name' }

        before(:each) do
          allow(chef_class).to receive(:chef_request).with('/nodes').
                                and_return({name => name})
          allow(chef_class).to receive(:chef_request).with('/nodes/name').
                                and_return({name: name})
        end

        it "lists nodes" do
          Heimdall.query.interface.execute('chef-node-list', '*').
            should eq({return: {all: [name]}})
        end

        it "retrieves a node" do
          Heimdall.query.interface.execute('chef-node', name).
            should eq({return: {name: name}})
        end
      end

      context "roles" do
        let(:name) { 'name' }

        before(:each) do
          allow(chef_class).to receive(:chef_request).with('/roles').
                                and_return({name => name})
          allow(chef_class).to receive(:chef_request).with('/roles/name').
                                and_return({name: name})
        end

        it "lists roles" do
          Heimdall.query.interface.execute('chef-role-list', '*').
            should eq({return: {all: [name]}})
        end

        it "retrieves a role" do
          Heimdall.query.interface.execute('chef-role', name).
            should eq({return: {name: name}})
        end
      end

      context "users" do
        let(:name) { 'name' }

        before(:each) do
          allow(chef_class).to receive(:chef_request).with('/users').
                                and_return([{'user' => {'username' => name}}])
          allow(chef_class).to receive(:chef_request).with('/users/name').
                                and_return({name: name})
        end

        it "lists users" do
          Heimdall.query.interface.execute('chef-user-list', '*').
            should eq({return: {all: [name]}})
        end

        it "retrieves a user" do
          Heimdall.query.interface.execute('chef-user', name).
            should eq({return: {name: name}})
        end
      end

      context "search" do
        context "with results" do
          ['client', 'environment', 'node', 'role'].each do |index|
            context index + 's' do
              let(:name) { index }

              before(:each) do
                allow(chef_class).to receive(:chef_request).
                                      with("/search/#{index}?q=name:foo").
                                      and_return({'rows' => [{'name' => name}]})
              end

              it 'returns a result' do
                Heimdall.query.interface.execute('chef-search', index + ':name:foo').
                  should eq({return: {query: index + ':name:foo',
                                  index: index,
                                  search: 'name:foo',
                                  index + 's' => [name]}})
              end
            end
          end
        end

        context "with no results" do
          it 'handles no result' do
            Heimdall.query.interface.execute('chef-search', 'client:name:foo').
              should eq({return: {query: 'client:name:foo',
                                  index: 'client',
                                  search: 'name:foo',
                                  results: 'no results returned for query'}})
          end
        end
      end

      context "resolve run list" do
        let(:name) { 'cookbook_name' }

        before(:each) do
          allow(chef_class).to receive(:chef_request).with("/cookbooks/#{name}").
                                and_return({
                                             name =>
                                             {"versions" => [
                                                {"version" => '2.0.0'},
                                                {"version" => '1.0.0'}
                                              ]}
                                           })
        end

        it "retrieves a role" do
          Heimdall.query.interface.execute('chef-resolve-runlist', 'role[role_name]').
            should eq({return: {script: 'chef-role',
                                args: {name: 'role_name'}}})
        end

        it "retrieves a cookbook (default)" do
          Heimdall.query.interface.execute('chef-resolve-runlist',
                                           "recipe[#{name}]").
            should eq({return: {script: 'chef-cookbook',
                                args: {list_id: name,
                                       name: '2.0.0'}}})
        end

        it "retrieves a cookbook for a recipe" do
          Heimdall.query.interface.execute('chef-resolve-runlist',
                                           "recipe[#{name}::recipe]").
            should eq({return: {script: 'chef-cookbook',
                                args: {list_id: name,
                                       name: '2.0.0'}}})
        end
      end
    end
  end
end
