# Action endpoint

post '/action' do
  data = JSON.parse(request.body.read)
  # Any unexpected keys are ignored
  name = data["name"]
  action = data["action"]

  content_type :json
  if (name && action)
    rc = Heimdall.action.interface.execute(name, action)
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
