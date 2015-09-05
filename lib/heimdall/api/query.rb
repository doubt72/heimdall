# Query endpoint

post '/query' do
  data = JSON.parse(request.body.read)
  # Any unexpected keys are ignored
  name = data["name"]
  query = data["query"]
  puts "---- #{query}"

  content_type :json
  if (name && query)
    rc = Heimdall.query.interface.execute(name, query)
    puts "==== #{rc}"
    if (rc[:return])
      rc.to_json
    elsif (rc[:error] == 'notfound')
      404
    else
      [400, rc.to_json]
    end
  else
    [400, {error: 'required parameters missing'}.to_json]
  end
end
