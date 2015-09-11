# Simple debug console web server

class Heimdall
  class Server
    class Debugger
      def self.start
        # TODO: this probably isn't the cleanest way of doing this:
        Sinatra::Application.set :views, Dir.pwd + '/lib/Heimdall/server/views'

        # We don't have a landing URL so do this
        Sinatra::Application.get '/' do
          redirect '/debugger'
        end

        # TODO: I think there's a way to do params not using the URL, this way is limited
        # and probably will break on large enough scripts
        Sinatra::Application.get '/debugger' do
          @name = params['name']
          if (params['args'] && params['args'] != '')
            @args = params['args'].gsub('"', '&quot;')
            @args_json = params['args']
          else
            @args = ''
            @args_json = 'null'
          end
          @script = params['script']
          @show_list = false
          if (params['clear'] == 'Clear')
            @name = ''
            @script = ''
            @args = ''
            @args_json = 'null'
          elsif (params['load'] == 'Load')
            if (@name)
              @script = Heimdall.store.load(@name)
            end
          elsif (params['save'] == 'Save/Execute' || params['save'] == 'Execute')
            if (@name && @name != '')
              Heimdall.store.save(@name, @script)
            end
          elsif (params["load-#{@name}"] == 'Load')
            if (@name)
              @script = Heimdall.store.load(@name)
            end
          elsif (params["delete-#{@name}"] == 'Delete')
            Heimdall.store.delete(@name)
            @name = ''
            @script = ''
            @args = ''
            @args_json = 'null'
            @show_list = true
          end
          @list = Heimdall.store.list.sort
          erb :debugger
        end
      end
    end
  end
end
