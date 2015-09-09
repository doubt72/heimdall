lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'heimdall/version'

Gem::Specification.new do |s|
  s.name          = 'heimdall'
  s.version       = Heimdall::VERSION
  s.date          = '2015-08-20'

  s.summary       = 'Heimdall'
  s.description   = 'Heimdall scriptable visualization server'

  s.authors       = ['Douglas Triggs']
  s.email         = 'doug@chef.io'
  s.homepage      = 'http://chef.io'

  s.files         = Dir['spec/**/*_spec.rb'] + Dir['lib/**/*.rb']
  s.require_paths = ['spec', 'lib']
  s.bindir        = 'bin'
  s.executables   = ['server']
end
