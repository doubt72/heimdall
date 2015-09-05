# Configure sinatra query and store REST endpoints

require 'heimdall/api/query'
require 'heimdall/api/store'

# TODO: add authorization filters; integrate with OCID for security?

# TODO: switch this to modular sinatra?  Not well encapsulated; currently running it
# in global scope and sinatra require is in the executable itself

# Nothing to do here, the required files set up the endpoints
