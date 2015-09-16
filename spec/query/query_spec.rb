require 'spec_helper'

describe "Heimdall::Query" do
  let(:query) { Heimdall::Query.new }

  context "#interface" do
    it "should return an interface object" do
      query.interface.class.should eq(Heimdall::Query::Interface)
    end
  end

  context "system queries" do
    it 'has debug echo query' do
      Heimdall.query.interface.execute('debug-echo', 'x').should eq({return: 'x'})
    end

    it 'has debug random query' do
      perturb = 0.2
      correction = 0.1
      center = 1
      query = {id: 'foobar', perturb: perturb, correction: correction, center: center}
      last = center
      0.upto(100) do |x|
        rc = Heimdall.query.interface.execute('debug-random', query.to_json)
        current = rc[:return]
        if (last > center)
          current.should be < last + perturb - correction
          current.should be > last - perturb - correction
        else
          current.should be > last - perturb + correction
          current.should be < last + perturb + correction
        end
        last = current
      end
    end
  end
end
