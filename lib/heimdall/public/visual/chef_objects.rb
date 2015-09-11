# Register system scripts

# Toplevel display
Heimdall.store.register('chef-server', "visual 'chef-server' do; show_json; end")

# Simple list-item elements
['chef-client', 'chef-cookbook', 'chef-data-bag', 'chef-environment', 'chef-node',
 'chef-role', 'chef-user'].each do |endpoint|
  Heimdall.store.register(endpoint, "visual '#{endpoint}' do; end")
  Heimdall.store.register("#{endpoint}-list", "visual '#{endpoint}-list' do; end")
end

# Special chef items
Heimdall.store.register('chef-data-bag-item', "visual 'chef-data-bag-item' do; end")
Heimdall.store.register('chef-search', "visual 'chef-search' do; end")
Heimdall.store.register('chef-run-list-item', "visual 'chef-run-list-item' do; end")
