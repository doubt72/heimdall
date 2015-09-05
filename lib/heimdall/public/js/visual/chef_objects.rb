# Register system scripts

# Simple list-item elements
['chef-client', 'chef-cookbook', 'chef-data-bag', 'chef-environment', 'chef-node',
 'chef-role', 'chef-user'].each do |endpoint|
  Heimdall.store.register(endpoint, "visual '#{endpoint}' do; show_json; end")
  Heimdall.store.register("#{endpoint}-list",
                          "visual '#{endpoint}-list' do; show_json; end")
end

# Special chef items
Heimdall.store.register("chef-data-bag-item",
                        "visual 'chef-data-bag-item' do; show_json; end")
Heimdall.store.register("chef-search",
                        "visual 'chef-search' do; show_json; end")
Heimdall.store.register("chef-run-list-item",
                        "visual 'chef-run-list-item' do; show_json; end")

# TODO: Role: env_run_lists?
# TODO: Add stack : breadcrumbs to Chef Viewer
