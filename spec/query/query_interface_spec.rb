require 'spec_helper'

describe "Heimdall::Query::Interface" do
  let(:name) { 'ruby' }
  let(:interface) { Heimdall::Query::Interface.new }

  before(:each) do
    interface.register(name, Proc.new {|code| eval code})
  end

  context "#register" do
    it "should store a new query" do
      interface.register('echo', Proc.new {|msg| msg})
      interface.list.sort.should eq(['echo', name])
    end

    it "should execute a new query" do
      interface.register(name, Proc.new {|msg| msg})
      interface.execute(name, 'hello').should eq(return: 'hello')
    end
  end

  context "#execute" do
    it "should execute a query" do
      interface.execute(name, 'true').should eq(return: true)
    end

    it "should return notfound for bad query" do
      interface.execute('bogus', 'bogus').should eq(error: 'notfound')
    end
  end

  context "#delete" do
    it "should delete a query" do
      interface.delete(name).should eq(true)
      interface.list.should eq([])
    end

    it "should not delete a non-existent query" do
      interface.delete('bogus').should eq(false)
      interface.list.should eq([name])
    end
end

  context "#list" do
    it "lists one query" do
      interface.list.should eq([name])
    end

    it "lists multiple queries" do
      interface.register('echo', Proc.new {|msg| msg})
      interface.register('increment', Proc.new {|x| x + 1})
      interface.register('decrement', Proc.new {|x| x - 1})
      interface.list.sort.should eq(['decrement', 'echo', 'increment', name])
    end
  end
end
