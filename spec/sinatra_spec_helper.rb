require 'rack/test'
require 'sinatra'

ENV['RACK_ENV'] = 'test'

require 'spec_helper'

module RSpecMixin
  include Rack::Test::Methods
  def app() Sinatra::Application end
end

RSpec.configure { |c| c.include RSpecMixin }

disable :show_exceptions
