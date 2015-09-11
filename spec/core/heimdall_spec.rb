require 'spec_helper'

describe "Heimdall" do
  it "returns a config class" do
    Heimdall.config.class.should eq(Heimdall::Config)
  end

  it "returns a action class" do
    Heimdall.action.class.should eq(Heimdall::Action)
  end

  it "returns a query class" do
    Heimdall.query.class.should eq(Heimdall::Query)
  end

  it "returns a store class" do
    Heimdall.store.class.should eq(Heimdall::Store)
  end

  it "encodes a script" do
    Heimdall.encode_script("visual 'foo' do; set :any, 'one'; end").
      should eq({'visual' => 'foo', 'block' => {'any' => 'one'}})
  end
end
