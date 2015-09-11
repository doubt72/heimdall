require 'spec_helper'

describe "Heimdall::Action" do
  let(:action) { Heimdall::Action.new }

  context "#interface" do
    it "should return an interface object" do
      action.interface.class.should eq(Heimdall::Action::Interface)
    end
  end
end
