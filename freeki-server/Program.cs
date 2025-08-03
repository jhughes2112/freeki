using ReachableGames;
using CommandLine;
using DataCollection;
using Logging;
using Networking;
using System;
using System.Collections.Generic;
using System.Reflection;
using System.Runtime.Loader;
using System.Threading;
using System.Threading.Tasks;
using Utilities;
using Storage;
using Authentication;
using System.Net;
using System.IO;
using Users;

namespace FreeKi
{
	public class Program
	{
		static public async Task Main(string[] args)
		{
			await Parser.Default.ParseArguments<FreeKiOptions>(args).WithParsedAsync(Run).ConfigureAwait(false);
		}

		static private async Task Run(FreeKiOptions o)
		{
			CancellationTokenSource tokenSrc = new CancellationTokenSource();

			// Set up a callback so a ^C will halt the server
			bool sigIntRecvd = false;
			Console.CancelKeyPress += new ConsoleCancelEventHandler((object? sender, ConsoleCancelEventArgs e) =>
				{
					Console.WriteLine("Caught SIGINT, tripping cancellation token.");   // Control-C
					e.Cancel = true;
					sigIntRecvd = true;
					tokenSrc.Cancel();
				});

			// Set up a callback to have SIGTERM also halt the server gracefully.  This is what "docker stop" uses.
			AssemblyLoadContext? ctx = AssemblyLoadContext.GetLoadContext(typeof(Program).GetTypeInfo().Assembly);
			if (ctx!=null)
			{
				ctx.Unloading += (AssemblyLoadContext context) =>
				{
					if (sigIntRecvd==false)  // don't process this if control-c happened 
					{
						Console.WriteLine("Caught SIGTERM, tripping cancellation token.");  // SIGTERM / kill
						tokenSrc.Cancel();
					}
				};
			}

			// Move resource definitions outside try/catch so they can be properly disposed in finally
			ILogging? logger = null;
			IDataCollection? dataCollection = null;
			IAuthentication? authentication = null;
			StorageFiles? pageStorage = null;
			StorageFiles? mediaStorage = null;
			GitManager? gitManager = null;
			PageManager? pageManager = null;
			PagesApiHandler? pagesApiHandler = null;
			MediaApiHandler? mediaApiHandler = null;
			UserApiHandler? userApiHandler = null;
			FreeKiServer? server = null;
			ReachableGames.RGWebSocket.WebServer? webServer = null;
			
			try
			{
				logger = CommandLineHelpersServer.CreateLogger("FreeKi", o.log_config!);
				dataCollection = CommandLineHelpersServer.CreateDataCollection("prometheus", new Dictionary<string, string>() { { "process", "FreeKi" } }, logger);
				authentication = await CommandLineHelpersServer.CreateAuthentication(o.auth_config!, logger).ConfigureAwait(false);
				pageStorage = new StorageFiles(Path.Combine(o.storage_config!, "pages"), logger);  // pages and media are stored in different folder roots
				mediaStorage = new StorageFiles(Path.Combine(o.storage_config!, "media"), logger);  // separate storage for media files
				gitManager = CommandLineHelpersServer.CreateGitManager(o.storage_config!, o.git_config!, logger);  // root of git is at the actual root
				List<string> advertiseUrls = GetAdvertiseUrls(o.advertise_urls!);

				// Create PageManager and PagesApiHandler
				pageManager = new PageManager(pageStorage, gitManager, logger);
				pagesApiHandler = new PagesApiHandler(pageManager, authentication, logger);

				// Create MediaApiHandler
				mediaApiHandler = new MediaApiHandler(mediaStorage, gitManager, authentication, logger);

				// Create UserApiHandler
				userApiHandler = new UserApiHandler(authentication, logger);

				// The reason this takes in a CancellationTokenSource is Docker/someone may hit ^C and want to shutdown the server.
				// The reason we explicitly call Shutdown is the server itself may exit for other reasons, and we need to make sure it shuts down in either case.
				server = new FreeKiServer(advertiseUrls, o.static_root!, dataCollection, logger, gitManager, pageManager, tokenSrc);

				// Set up a websocket handler that forwards connections, disconnections, and messages to the ClusterServer
				ConnectionManagerReject connectionMgr = new ConnectionManagerReject(logger);
				webServer = new ReachableGames.RGWebSocket.WebServer(o.conn_bindurl!, 20, 1000, 5, connectionMgr, logger);

				// (responseCode, responseContentType, responseContent)
				webServer.RegisterExactEndpoint("/metrics", async (HttpListenerContext context) => { return (200, "text/plain", await dataCollection.Generate()); });
				webServer.RegisterExactEndpoint("/health", (HttpListenerContext) => { return Task.FromResult((200, "text/plain", new byte[0])); } );
				webServer.RegisterExactEndpoint("/api/user/me", userApiHandler.GetCurrentUser);

				webServer.RegisterPrefixEndpoint("/api/pages", pagesApiHandler.GetPages);
				webServer.RegisterPrefixEndpoint("/api/media", mediaApiHandler.GetMedia);
				webServer.RegisterPrefixEndpoint("/", server.GetClient);

				webServer.Start();  // this starts the webserver in a separate thread

				await tokenSrc.Token;  // block here until the cancellation token triggers.  Note, if the server decides to shut itself down, IT CANCELS THIS TOKEN.  So this is the perfect way to wait.
			}
			catch (OperationCanceledException)
			{
				// flow control
			}
			catch (Exception e)
			{
				Console.WriteLine(e);
			}
			finally
			{
				webServer?.UnregisterPrefixEndpoint("/api/pages");
				webServer?.UnregisterPrefixEndpoint("/api/media");

				webServer?.UnregisterExactEndpoint("/metrics");
				webServer?.UnregisterExactEndpoint("/health");
				webServer?.UnregisterExactEndpoint("/api/user/me");

				if (server != null)
				{
					await server.Shutdown().ConfigureAwait(false);
				}
				if (pageStorage != null)
				{
					await pageStorage.Shutdown().ConfigureAwait(false);
				}
				if (webServer!=null)
				{
					await webServer.Shutdown().ConfigureAwait(false);
				}
				
				// Dispose of resources that implement IDisposable
				// Note: PageManager (in FreeKiServer) should NOT dispose of storage since it didn't create it
				pageStorage?.Dispose();
				dataCollection?.Dispose();
				gitManager?.Dispose();
				logger?.Dispose();
				// authentication does not implement IDisposable, so no disposal needed
			}
		}

		// Parse the comma-separated advertise_urls string into a list of URLs. Handles whitespace trimming and empty entries.
		static private List<string> GetAdvertiseUrls(string advertise_urls)
		{
			if (string.IsNullOrWhiteSpace(advertise_urls))
				return new List<string> { "http://localhost:7777/" };

			var urls = new List<string>();
			string[] parts = advertise_urls.Split(',');
			foreach (string part in parts)
			{
				string trimmed = part.Trim();
				if (!string.IsNullOrWhiteSpace(trimmed))
					urls.Add(trimmed);
			}
			return urls;
		}
    }
}
