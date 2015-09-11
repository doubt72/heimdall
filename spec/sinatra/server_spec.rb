require 'cgi'
require 'spec_helper.rb'

def make_full_url(params)
  new_params = {'name' => '', 'script' => '', 'args' => ''}
  params.each_key do |key|
    new_params[key] = params[key]
  end
  make_url(new_params)
end

def make_url(params)
  url = '/debugger?'
  url += params.each_key.map { |key|
    "#{CGI.escape(key)}=#{CGI.escape(params[key])}"}.join("&")
end

describe "GET /debugger" do
  let(:name) { 'test script' }
  let(:script) { "visual 'debug' do; block :any, 'one'; end" }
  let(:args) { '{"foo":"bar"}' }

  before(:each) do
    Heimdall.store.save(name, script)
  end

  after(:each) do
    Heimdall.store.delete(name)
    Heimdall.store.list(false).should eq([])
  end

  it "redirects from /" do
    get '/'
    last_response.should be_redirect
    last_response.location.should eq('http://example.org/debugger')
  end

  context "initial load" do
    it "loads the page" do
      get '/debugger'
      last_response.body.should include("Heimdall Debug Console v#{Heimdall::VERSION}")
      last_response.body.should include(name)
    end
  end

  context "load" do
    it "has parameters" do
      get make_full_url({'name' => name, 'load' => 'Load', 'args' => args})
      last_response.body.should include("Heimdall Debug Console v#{Heimdall::VERSION}")
      last_response.body.should include(name)
      last_response.body.should include(script)
      last_response.body.should include(args)
    end

    it "doesn't have parameters" do
      get make_full_url({'name' => name, 'load' => 'Load'})
      last_response.body.should include("Heimdall Debug Console v#{Heimdall::VERSION}")
      last_response.body.should include(name)
      last_response.body.should include(script)
    end

    it "doesn't exist" do
      get make_full_url({'name' => 'bogus', 'load' => 'Load'})
      last_response.body.should include("Heimdall Debug Console v#{Heimdall::VERSION}")
      last_response.body.should include(name)
      last_response.body.should_not include(script)
    end
  end

  context "clear" do
    it "had parameters" do
      get make_full_url({'name' => name, 'clear' => 'Clear', 'args' => args})
      last_response.body.should include("Heimdall Debug Console v#{Heimdall::VERSION}")
      last_response.body.should include(name)
      last_response.body.should_not include(script)
      last_response.body.should_not include(args)
    end

    it "didn't have parameters" do
      get make_full_url({'name' => name, 'clear' => 'Clear'})
      last_response.body.should include("Heimdall Debug Console v#{Heimdall::VERSION}")
      last_response.body.should include(name)
      last_response.body.should_not include(script)
    end
  end

  context "save/execute" do
    let(:new_name) { 'new name' }
    let(:new_script) { "visual 'debug' do; param :any, 'one'; end" }

    after(:each) do
      Heimdall.store.delete(new_name)
    end
    
    it "saves the script" do
      get make_full_url({'name' => new_name, 'script' => new_script,
                         'save' => 'Save/Execute', 'args' => args})
      last_response.body.should include("Heimdall Debug Console v#{Heimdall::VERSION}")
      last_response.body.should include(name)
      last_response.body.should include(new_name)
      last_response.body.should include(new_script)
      last_response.body.should include(args)
      Heimdall.store.list(false).sort.should eq([new_name, name])
    end

    # For system scripts
    it "executes the script" do
      get make_full_url({'name' => new_name, 'script' => new_script,
                         'save' => 'Execute', 'args' => args})
      last_response.body.should include("Heimdall Debug Console v#{Heimdall::VERSION}")
      last_response.body.should include(name)
      last_response.body.should include(new_name)
      last_response.body.should include(new_script)
      last_response.body.should include(args)
      Heimdall.store.list(false).sort.should eq([new_name, name])
    end

    it "doesn't have parameters" do
      get make_full_url({'name' => new_name, 'script' => new_script,
                         'save' => 'Save/Execute'})
      last_response.body.should include("Heimdall Debug Console v#{Heimdall::VERSION}")
      last_response.body.should include(name)
      last_response.body.should include(new_name)
      last_response.body.should include(new_script)
      last_response.body.should_not include(args)
      Heimdall.store.list(false).sort.should eq([new_name, name])
    end

    it "doesn't have a script" do
      get make_full_url({'name' => new_name, 'save' => 'Save/Execute', 'args' => args})
      last_response.body.should include("Heimdall Debug Console v#{Heimdall::VERSION}")
      last_response.body.should include(name)
      last_response.body.should include(new_name)
      last_response.body.should_not include(new_script)
      last_response.body.should include(args)
      Heimdall.store.list(false).sort.should eq([new_name, name])
    end

    it "doesn't have a name" do
      get make_full_url({'script' => new_script, 'save' => 'Save/Execute',
                         'args' => args})
      last_response.body.should include("Heimdall Debug Console v#{Heimdall::VERSION}")
      last_response.body.should include(name)
      last_response.body.should_not include(new_name)
      last_response.body.should include(new_script)
      last_response.body.should include(args)
      Heimdall.store.list(false).sort.should eq([name])
    end
  end

  context "load by name" do
    it "loads a script" do
      get make_full_url({'name' => name, 'load-' + name => 'Load'})
      last_response.body.should include("Heimdall Debug Console v#{Heimdall::VERSION}")
      last_response.body.should include(name)
      last_response.body.should include(script)
    end
  end

  context "delete" do
    it "deletes a script" do
      get make_full_url({'name' => name, 'delete-' + name => 'Delete'})
      last_response.body.should include("Heimdall Debug Console v#{Heimdall::VERSION}")
      last_response.body.should_not include(name)
      Heimdall.store.list(false).sort.should eq([])
    end

    it "doesn't delete a script that doesn't exist" do
      get make_full_url({'name' => name, 'delete-bogus' => 'Delete'})
      last_response.body.should include("Heimdall Debug Console v#{Heimdall::VERSION}")
      last_response.body.should include(name)
      Heimdall.store.list(false).sort.should eq([name])
    end
  end
end
