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
    let(:fake_server) { double(Ridley) }
    let(:fake_cookbook) { double(Object) }

    before(:each) do
      allow(chef_class).to receive(:chef).and_return(fake_server)
      allow(fake_server).to receive(:cookbook).and_return(fake_cookbook)
      allow(fake_cookbook).to receive(:latest_version).and_return('2.0.0')
      allow(fake_cookbook).to receive(:versions).and_return(['1.0.0', '2.0.0', '0.5.0'])
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
          allow(fake_cookbook).to receive(:versions).and_return(['1.0.0', '2.0.0', '0.5.0',
                                                                 '0.5.1', '0.6.0', '1.5.0',
                                                                 '1.5.5', '1.0.1'])

          chef_class.resolve_cookbook_version('name', '~>1.0.0').should eq('1.0.1')

          chef_class.resolve_cookbook_version('name', '~> 1.0.0').should eq('1.0.1')
          chef_class.resolve_cookbook_version('name', '~> 1.0').should eq('1.5.5')
          chef_class.resolve_cookbook_version('name', '~> 1.5.0').should eq('1.5.5')
          chef_class.resolve_cookbook_version('name', '~> 1.5').should eq('1.5.5')
          chef_class.resolve_cookbook_version('name', '~> 1.5.5').should eq('1.5.5')
          chef_class.resolve_cookbook_version('name', '~> 0.5.0').should eq('0.5.1')
          chef_class.resolve_cookbook_version('name', '~> 0.5').should eq('0.6.0')
          chef_class.resolve_cookbook_version('name', '~> 0.4.0').should eq(nil)
          chef_class.resolve_cookbook_version('name', '~> 0.4').should eq('0.6.0')
          chef_class.resolve_cookbook_version('name', '~> 2.0.1').should eq(nil)
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
        let(:fake_client) { double(Object) }
        let(:fake_client_object) { double(Object) }
        let(:name) { 'i am fake' }

        before(:each) do
          allow(fake_server).to receive(:client).and_return(fake_client)
          allow(fake_client).to receive(:find).with(name).and_return({name: name})
          allow(fake_client).to receive(:all).and_return([fake_client_object])
          allow(fake_client_object).to receive(:name).and_return(name)
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
        let(:name) { 'i am fake' }
        let(:version) { '1.0.0' }
        let(:eq_version) { '= 1.0.0' }
        let(:cookbook_name) { name + ':' + version }
        let(:cookbook_eq_name) { name + ':' + eq_version }

        before(:each) do
          allow(fake_cookbook).to receive(:find).with(name, version).
                                   and_return({name: name})
          allow(fake_cookbook).to receive(:all).and_return([[name, version]])
        end

        it "lists cookbooks" do
          Heimdall.query.interface.execute('chef-cookbook-list', '*').
            should eq({return: {name => version}})
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
        let(:fake_data_bag) { double(Object) }
        let(:fake_data_bag_object) { double(Object) }
        let(:fake_data_bag_item) { double(Object) }
        let(:fake_data_bag_item_object) { double(Object) }
        let(:name) { 'i am fake' }
        let(:id) { 'no yuo' }

        before(:each) do
          allow(fake_server).to receive(:data_bag).and_return(fake_data_bag)
          allow(fake_data_bag).to receive(:all).and_return([fake_data_bag_object])
          allow(fake_data_bag_object).to receive(:name).and_return(name)
          allow(fake_data_bag).to receive(:find).with(name).
                                   and_return(fake_data_bag_object)
          allow(fake_data_bag_object).to receive(:item).and_return(fake_data_bag_item)
          allow(fake_data_bag_item).to receive(:all).
                                        and_return([fake_data_bag_item_object])
          allow(fake_data_bag_item).to receive(:find).with(id).
                                        and_return({name: name})
          allow(fake_data_bag_item_object).to receive(:id).and_return(id)
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
        let(:fake_environment) { double(Object) }
        let(:fake_environment_object) { double(Object) }
        let(:name) { 'i am fake' }

        before(:each) do
          allow(fake_server).to receive(:environment).and_return(fake_environment)
          allow(fake_environment).to receive(:find).with(name).and_return({name: name})
          allow(fake_environment).to receive(:all).and_return([fake_environment_object])
          allow(fake_environment_object).to receive(:name).and_return(name)
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
        let(:fake_node) { double(Object) }
        let(:fake_node_object) { double(Object) }
        let(:name) { 'i am fake' }

        before(:each) do
          allow(fake_server).to receive(:node).and_return(fake_node)
          allow(fake_node).to receive(:find).with(name).and_return({name: name})
          allow(fake_node).to receive(:all).and_return([fake_node_object])
          allow(fake_node_object).to receive(:name).and_return(name)
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
        let(:fake_role) { double(Object) }
        let(:fake_role_object) { double(Object) }
        let(:name) { 'i am fake' }

        before(:each) do
          allow(fake_server).to receive(:role).and_return(fake_role)
          allow(fake_role).to receive(:find).with(name).and_return({name: name})
          allow(fake_role).to receive(:all).and_return([fake_role_object])
          allow(fake_role_object).to receive(:name).and_return(name)
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
        let(:fake_user) { double(Object) }
        let(:fake_user_object) { double(Object) }
        let(:fake_user_name_object) { double(Object) }
        let(:fake_user_user_object) { double(Object) }
        let(:name) { 'i am fake' }

        before(:each) do
          allow(fake_server).to receive(:user).and_return(fake_user)
          allow(fake_user).to receive(:find).with(name).and_return({name: name})
          allow(fake_user).to receive(:all).and_return([fake_user_object])

          # This is o_O, WTF Ridley, IDEK
          allow(fake_user_object).to receive(:name).and_return(fake_user_name_object)
          allow(fake_user_name_object).to receive(:user).and_return(fake_user_user_object)
          allow(fake_user_user_object).to receive(:username).and_return(name)
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
              let(:fake_object) { double(Object) }

              let(:name) { index }

              before(:each) do
                allow(fake_server).to receive(:search).and_return([fake_object])
                allow(fake_object).to receive(:name).and_return(name)
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
          before(:each) do
            allow(fake_server).to receive(:search).and_return([])
          end

          it 'handles no result' do
            Heimdall.query.interface.execute('chef-search', 'client:name:foo').
              should eq({return: {query: 'client:name:foo',
                                  index: 'client',
                                  search: 'name:foo',
                                  results: 'no results returned for query'}})
          end
        end

        it 'handles bad index' do
          Heimdall.query.interface.execute('chef-search', 'bogus:name:foo').
            should eq({return: {query: 'bogus:name:foo',
                                index: 'unsupported index',
                                search: 'name:foo',
                                results: 'no results returned for query'}})
        end
      end

      context "resolve run list" do
        it "retrieves a role" do
          Heimdall.query.interface.execute('chef-resolve-runlist', 'role[role_name]').
            should eq({return: {script: 'chef-role',
                                args: {name: 'role_name'}}})
        end

        it "retrieves a cookbook (default)" do
          Heimdall.query.interface.execute('chef-resolve-runlist',
                                           'recipe[cookbook_name]').
            should eq({return: {script: 'chef-cookbook',
                                args: {list_id: 'cookbook_name',
                                       name: '2.0.0'}}})
        end

        it "retrieves a cookbook for a recipe" do
          Heimdall.query.interface.execute('chef-resolve-runlist',
                                           'recipe[cookbook_name::recipe]').
            should eq({return: {script: 'chef-cookbook',
                                args: {list_id: 'cookbook_name',
                                       name: '2.0.0'}}})
        end
      end
    end
  end
end
