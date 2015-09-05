require 'spec_helper'

describe "Heimdall::Coder" do
  context "with a stub script" do
    let(:script) { "visual 'stub' do; set :any, 'one'; end" }

    it "returns correct visual" do
      Heimdall::Coder.encode(script)['visual'].should eq('stub')
    end

    it "returns correct set" do
      Heimdall::Coder.encode(script)['block'].should eq({'any' => 'one'})
    end
  end

  context "with a complex script" do
    let(:script) {
      "
one = 'one'
name = 'name'

visual 'longer' do
  set :name, name
  set :any, \"\#{one}\"
  set :version, Heimdall::VERSION
  set :calc do
    rc = 1
    1.upto(10) do |x|
      rc *= x
    end
    rc
  end
end
"
    }

    it "returns correct visual" do
      Heimdall::Coder.encode(script)['visual'].should eq('longer')
    end

    it "returns correct set" do
      Heimdall::Coder.encode(script)['block'].should eq({'any' => 'one',
                                                          'version' => Heimdall::VERSION,
                                                          'calc' => 3628800,
                                                          'name' => 'name'})
    end
  end

  context "with an empty script" do
    let(:script) { "" }

    it "returns nothing" do
      Heimdall::Coder.encode(script).should eq({})
    end
  end

  context "with a syntax error" do
    let(:script) { "visual 'stub' do; set :any, 'one'; endx" }

    it "returns no visual or block" do
      rc = Heimdall::Coder.encode(script)
      rc['visual'].should eq(nil)
      rc['block'].should eq(nil)
    end

    it "returns an error" do
      Heimdall::Coder.encode(script)[:error].to_s.should match(/.*syntax error.*/)
    end
  end
end
