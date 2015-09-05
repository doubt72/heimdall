require 'spec_helper'

describe "Heimdall::Query" do
  let(:query) { Heimdall::Query.new }

  context "#interface" do
    it "should return an interface object" do
      query.interface.class.should eq(Heimdall::Query::Interface)
    end
  end
end
