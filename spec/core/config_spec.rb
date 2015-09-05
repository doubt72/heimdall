require 'spec_helper'

describe "Heimdall::Config" do
  context "reading a config file" do
    let(:config) { Heimdall::Config.new }

    it "parses the file correctly" do
      allow(File).to receive(:read).and_return('port 1234; public_folder "gobble gobble"')
      config.read_config('test')
      config.port.should eq(1234)
      config.public_folder.should eq('gobble gobble')
    end
  end

  context "value handling" do
    let(:config) { Heimdall::Config.new }

    before(:each) do
      Heimdall::Config.default :any, 'one'
    end
    
    it "can read a default" do
      config.any.should eq('one')
    end

    it "can set a new value" do
      config.any 'two'
      config.any.should eq('two')
    end

    it "can only set a new value once" do
      config.any 'two'
      begin
        config.any 'three'
      rescue Exception => e
        e.message.should eq('multiple definitions of "any" value')
      end
      config.any.should eq('two')
    end
  end

  context "adding a new module" do
    before(:each) do
      class Test
        class Config
          class << self
            include Heimdall::Config::Defaults
          end

          default :any, 'one'
        end
      end

      Heimdall::Config.default :test, Test::Config.new
    end

    context "with no file" do
      let(:config) { Heimdall::Config.new }

      it "can read a default" do
        config.test.any.should eq('one')
      end

      it "can set a new value" do
        config.test.any 'two'
        config.test.any.should eq('two')
      end
    end

    context "with file" do
      let(:config) { Heimdall::Config.new }

      it "parses the file correctly" do
        allow(File).to receive(:read).and_return('test.any "two"')
        config.read_config('test')
        config.test.any.should eq('two')
      end
    end
  end
end
