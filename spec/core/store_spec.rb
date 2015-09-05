require 'spec_helper'

describe "Heimdall::Store" do
  let(:name) { 'name' }
  let(:system_name) { 'debug' }
  let(:data) { 'some sort of data that needs to be store, a string is good' }
  let(:store) { Heimdall::Store.new }

  before(:each) do
    store.save(name, data)
  end

  context "#load" do
    it "should load an object" do
      store.load(name).should eq(data)
    end
  end

  context "#save" do
    it "should store a new object" do
      store.save('echo', 'echo')
      store.list.sort.should eq(['echo', name])
    end

    it "should overwrite an object" do
      store.save(name, 'echo')
      store.load(name).should eq('echo')
    end

    it "should not overwrite a system object" do
      store.register(system_name, data)
      store.save(system_name, 'echo')
      store.load(system_name).should eq(data)
    end
  end

  context "#delete" do
    it "should delete an object" do
      store.delete(name).should eq(true)
      store.list.should eq([])
    end

    it "should not delete a non-existent object" do
      store.delete('bogus').should eq(false)
      store.list.should eq([name])
    end

    it "should not delete a system object" do
      store.register(system_name, data)
      store.delete(system_name).should eq(false)
      store.list_system.should eq([system_name])
    end
  end

  context "#register" do
    it "should register a system object" do
      store.register(system_name, data)
      store.list_system.should eq([system_name])
      store.list.should eq([system_name, name].sort)
    end
  end

  context "#system?" do
    it "should return true for system object" do
      store.register(system_name, data)
      store.system?(system_name).should eq(true)
    end

    it "should return false for system object" do
      store.system?(name).should eq(false)
    end
  end

  context "#list" do
    it "lists one object" do
      store.list.should eq([name])
    end

    it "lists multiple objects" do
      store.save('echo', 'echo')
      store.save('one', 'one')
      store.save('two', 'two')
      store.list.sort.should eq(['echo', name, 'one', 'two'])
    end
  end

  context "#list_system" do
    it "should not show a non-system object" do
      store.list_system.should eq([])
    end

    it "should show a system object" do
      store.register(system_name, data)
      store.list_system.should eq([system_name])
    end
  end
end
