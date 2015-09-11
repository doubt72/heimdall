require 'rack/test'

ENV['RACK_ENV'] = 'test'

require 'heimdall'

module RSpecMixin
  include Rack::Test::Methods
  def app() Sinatra::Application end
end

RSpec.configure { |c| c.include RSpecMixin }

Sinatra::Application.disable :show_exceptions

Heimdall.start
