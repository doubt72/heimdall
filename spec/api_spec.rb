require 'sinatra_spec_helper'

describe "Heimdall::API" do
  context "simple action API" do
    let(:name) { 'ruby' }
    let(:url) { '/action' }
    let(:action) { 'true' }

    before(:each) do
      # Register an action for testing
      Heimdall.action.interface.register(name, Proc.new {|code| eval code})
    end

    after(:each) do
      # Clear registered action after testing
      Heimdall.action.interface.delete(name)

      # Make sure everything is cleaned up
      Heimdall.action.interface.list.should eq([])
    end

    it "returns value with valid action" do
      post url, {name: name, action: action}.to_json

      last_response.status.should eq(200)
      last_response.body.should eq({return: true}.to_json)
    end

    it "returns 404 with unregistered action" do
      post url, {name: 'bogus', action: action}.to_json

      last_response.status.should eq(404)
    end

    it "returns 400 with no name" do
      post url, {action: action}.to_json

      last_response.status.should eq(400)
      last_response.body.should eq({error: "required parameters missing"}.to_json)
    end

    it "returns 400 with no action" do
      post url, {name: name}.to_json

      last_response.status.should eq(400)
      last_response.body.should eq({error: "required parameters missing"}.to_json)
    end

    it "returns 400 and error with internal error/invalid action" do
      post url, {name: name, action: 'bogus'}.to_json

      last_response.status.should eq(400)
      last_response.body.should match({error: "undefined local variable or method `bogus'.*"}.to_json)
    end

    it "ignores extra keys" do
      post url, {name: name, action: action, extra: 'extra'}.to_json

      last_response.status.should eq(200)
      last_response.body.should eq({return: true}.to_json)
    end
  end

  context "simple query API" do
    let(:name) { 'ruby' }
    let(:url) { '/query' }
    let(:query) { 'true' }

    before(:each) do
      # Register a query for testing
      Heimdall.query.interface.register(name, Proc.new {|code| eval code})
    end

    after(:each) do
      # Clear registered query after testing
      Heimdall.query.interface.delete(name)

      # Make sure everything is cleaned up
      Heimdall.query.interface.list.should eq([])
    end

    it "returns value with valid query" do
      post url, {name: name, query: query}.to_json

      last_response.status.should eq(200)
      last_response.body.should eq({return: true}.to_json)
    end

    it "returns 404 with unregistered query" do
      post url, {name: 'bogus', query: query}.to_json

      last_response.status.should eq(404)
    end

    it "returns 400 with no name" do
      post url, {query: query}.to_json

      last_response.status.should eq(400)
      last_response.body.should eq({error: "required parameters missing"}.to_json)
    end

    it "returns 400 with no query" do
      post url, {name: name}.to_json

      last_response.status.should eq(400)
      last_response.body.should eq({error: "required parameters missing"}.to_json)
    end

    it "returns 400 and error with internal error/invalid query" do
      post url, {name: name, query: 'bogus'}.to_json

      last_response.status.should eq(400)
      last_response.body.should match({error: "undefined local variable or method `bogus'.*"}.to_json)
    end

    it "ignores extra keys" do
      post url, {name: name, query: query, extra: 'extra'}.to_json

      last_response.status.should eq(200)
      last_response.body.should eq({return: true}.to_json)
    end
  end

  context "simple script storage API" do
    let(:name) { 'script' }
    let(:not_name) { 'notscript' }

    let(:script) {
      "visual 'visual' do; set :one, 'one'; set :version, Heimdall::VERSION; end"
    }
    let(:changed_script) {
      "visual 'visual' do; set :one, 'one'; end"
    }

    let(:full_body) { {name: name, script: script}.to_json }
    let(:name_only_body) { {name: name}.to_json }
    let(:script_only_body) { {script: script}.to_json }
    let(:response_body) { {script: script}.to_json }

    let(:url) { '/store' }
    let(:name_url) { '/store/' + name }
    let(:not_name_url) { '/store/' + not_name }
    
    after(:each) do
      # Clear our named script; ignore 404 if it's not actually there
      delete name_url

      # Make sure everything is cleaned up
      get url
      last_response.body.should eq(['debug'].to_json)
    end

    context "post /store" do
      it "creates new script" do
        post url, full_body
        last_response.status.should eq(201)

        get name_url
        last_response.body.should eq(response_body)
      end

      it "returns 409 if name already exists" do
        post url, full_body
        last_response.status.should eq(201)

        post url, {name: name, script: changed_script}.to_json
        last_response.status.should eq(409)

        get name_url
        last_response.body.should eq(response_body)
      end

      it "returns 400 when name not supplied" do
        post url, script_only_body
        last_response.status.should eq(400)

        get name_url
        last_response.status.should eq(404)
      end

      it "returns 400 when script not supplied" do
        post url, name_only_body
        last_response.status.should eq(400)

        get name_url
        last_response.status.should eq(404)
      end

      it "ignores unexpected keys in request body" do
        post url, {name: name, script: script, extra: 'extra'}.to_json
        last_response.status.should eq(201)

        get name_url
        last_response.body.should eq(response_body)
      end
    end

    context "get /store/:name" do
      before(:each) do
        post url, full_body
      end

      it "returns script when script exists" do
        get name_url
        last_response.body.should eq(response_body)
        last_response.status.should eq(200)
      end

      it "returns 404 when script doesn't exist" do
        get not_name_url
        last_response.status.should eq(404)
      end

      it "returns raw script when encoding is false" do
        get name_url + '?encode=false'
        last_response.body.should eq(response_body)
        last_response.status.should eq(200)
      end

      it "returns encoded script when encoding is true" do
        get name_url + '?encode=true'
        last_response.body.should eq( {script: {
                                        visual: 'visual',
                                        block: {one: 'one',
                                                 version: Heimdall::VERSION}}}.to_json )
        last_response.status.should eq(200)
      end
    end

    context "put /store/:name" do
      let(:changed_script_only_body) { {script: changed_script}.to_json }
      let(:changed_response_body) { {script: changed_script}.to_json }

      before(:each) do
        post url, full_body
      end

      it "updates script when name exists" do
        put name_url, changed_script_only_body
        last_response.status.should eq(200)

        get name_url
        last_response.body.should eq(changed_response_body)
      end

      it "returns 404 when name doesn't exist" do
        put not_name_url, changed_script_only_body
        last_response.status.should eq(404)

        get name_url
        last_response.body.should eq(response_body)
      end

      it "returns 400 when script not supplied" do
        put name_url, name_only_body
        last_response.status.should eq(400)

        get name_url
        last_response.body.should eq(response_body)
      end

      it "ignores unexpected keys in request body" do
        put name_url, {script: changed_script, extra: 'extra'}.to_json
        last_response.status.should eq(200)

        get name_url
        last_response.body.should eq(changed_response_body)
      end
    end

    context "delete /store/:name" do
      before(:each) do
        post url, full_body
      end

      it "deletes script when name exists" do
        delete name_url
        last_response.status.should eq(200)

        get name_url
        last_response.status.should eq(404)
      end

      it "returns 404 when name doesn't exist" do
        delete not_name_url
        last_response.status.should eq(404)

        get name_url
        last_response.status.should eq(200)
      end
    end

    context "get /store" do
      after(:each) do
        delete '/store/one'
        delete '/store/two'
        delete '/store/three'
      end

      it "returns list of scripts" do
        post url, {name: 'one', script: 'x'}.to_json
        post url, {name: 'two', script: 'x'}.to_json
        post url, {name: 'three', script: 'x'}.to_json

        get url
        last_response.status.should eq(200)
        last_response.body.should eq(['debug', 'one', 'two', 'three'].sort.to_json)
      end

      it "returns system list when no user scripts exist" do
        get url
        last_response.status.should eq(200)
        last_response.body.should eq(Heimdall.store.list_system.to_json)
      end
    end
  end
end
