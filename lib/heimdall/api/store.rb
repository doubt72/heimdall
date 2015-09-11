# Script storage REST endpoints

class Heimdall
  class API
    class Store
      def self.start
        Sinatra::Application.post '/store' do
          data = JSON.parse(request.body.read)
          # Any unexpected keys are ignored
          name = data["name"]
          script = data["script"]

          content_type :json
          if (name && script)
            if (Heimdall.store.load(name))
              409
            else
              Heimdall.store.save(name, script)
              201
            end
          else
            400
          end
        end

        # This is used both to return the raw script and scripts encoded for execution
        Sinatra::Application.get '/store/:name' do
          content_type :json
          data = Heimdall.store.load(params[:name])
          if (data)
            # If encode parameter is set to true, encode script for execution
            if (params[:encode] == 'true')
              data = Heimdall.encode_script(data)
            end
            {script: data}.to_json
          else
            404
          end
        end

        Sinatra::Application.put '/store/:name' do
          name = params[:name]
          # Any unexpected keys are ignored
          data = JSON.parse(request.body.read)
          script = data["script"]

          content_type :json
          if (script)
            if (Heimdall.store.load(name))
              Heimdall.store.save(name, script)
              200
            else
              404
            end
          else
            400
          end
        end

        Sinatra::Application.delete '/store/:name' do
          content_type :json
          if (Heimdall.store.delete(params[:name]))
            200
          else
            404
          end
        end

        Sinatra::Application.get '/store' do
          content_type :json
          Heimdall.store.list.sort.to_json
        end
      end
    end
  end
end
