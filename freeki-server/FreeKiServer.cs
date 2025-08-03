using Authentication;
using DataCollection;
using Logging;
using Storage;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace FreeKi
{
	// FreeKi handles authenticating each and every request, then routes the request to the appropriate handler based on the HTTP method and URL structure.
	public class FreeKiServer
	{
		private List<string>                 _advertiseUrls;
		private string                       _staticRootFolder;
		private string                       _dataFolder;
		private IDataCollection              _dataCollection;
		private ILogging                     _logger;
		private IAuthentication              _authentication;
		private string                       _mediaRoot;                  // media is whatever is found in that folder or added to it via other means, and are raw assets served up directly
		private GitManager                   _gitManager;
		private PageManager                  _pageManager;
		private Task                         _updateThread                = Task.CompletedTask;
		private CancellationTokenSource      _cancellationTokenSrc;
		private CancellationTokenSource?     _cancellationTokenSrcUpdate;

		static public string                 kSystemUserName              = "System";
		static public string                 kSystemUserEmail             = "System@Freeki";

		// Timed actions
		private long                         _nextGitPush = 0;
		private long                         _nextRefresh = 0;
		const long                           kGitPushInterval             = 60 * 5;   // five minutes
		const long                           kPageRefreshInterval         = 60 * 5;   // five minutes

		public FreeKiServer(List<string> advertiseUrls, string staticRootFolder, string dataFolder, IAuthentication authentication, string mediaRoot, IDataCollection dataCollection, ILogging logger, GitManager gitManager, PageManager pageManager, CancellationTokenSource tokenSrc)
		{
			logger.Log(EVerbosity.Info, $"FreeKiServer initializing.");
			_advertiseUrls           = advertiseUrls;
			_staticRootFolder        = staticRootFolder;
			_dataFolder              = dataFolder;
			_dataCollection          = dataCollection;
			_logger                  = logger;
			_cancellationTokenSrc    = tokenSrc;
			_authentication          = authentication;
			_gitManager              = gitManager;
			_pageManager             = pageManager;
			_mediaRoot               = mediaRoot;

			// Start running the update threads
			_cancellationTokenSrcUpdate = new CancellationTokenSource();
			_updateThread = Task.Run(async () => await Update(_cancellationTokenSrcUpdate.Token).ConfigureAwait(false));
		}

		public async Task Shutdown()
		{
			_logger.Log(EVerbosity.Info, "FreeKiServer shutting down.");
            if (_cancellationTokenSrc.IsCancellationRequested==false)
				_cancellationTokenSrc.Cancel();
			
			// We explicitly tell Update to exit after the ZoneManager because this is what is pumping messages for us.
			if (_cancellationTokenSrcUpdate?.IsCancellationRequested==false)
				_cancellationTokenSrcUpdate.Cancel();
			await _updateThread.ConfigureAwait(false);
			
			_logger.Log(EVerbosity.Info, "FreeKiServer shutdown complete.");
		}

		private async Task Update(CancellationToken token)
		{
			while (token.IsCancellationRequested==false)
			{
				_logger.Log(EVerbosity.Extreme, $"FreeKiServer.Update loop");

				try
				{
					await Task.Delay(1000, token).ConfigureAwait(false);  // Once a second, wake up and see if anything needs to be done

					// This allows regular refreshing without requiring user interaction.  The wiki will just notice files moved and update the metadata automatically.
					// Strategically placed directly BEFORE the git push, so this commits changes before pushing to the remote.
					if (PageMetadata.Now > _nextRefresh)
					{
						_nextRefresh = PageMetadata.Now + kPageRefreshInterval;  // Set next refresh time
						await _pageManager.Refresh().ConfigureAwait(false);
						_logger.Log(EVerbosity.Info, $"PageManager.Refresh complete, {_pageManager.GetCachedPageCount()} pages cached");
					}

					// This allows many changes to happen without constant pushing
					if (PageMetadata.Now > _nextGitPush)
					{
						_nextGitPush = PageMetadata.Now + kGitPushInterval; // Set next push time
						_gitManager.PushToRemote();  // it already prints out success/failure
					}
				}
				catch (OperationCanceledException)
				{
					// flow control
				}
			}
			_logger.Log(EVerbosity.Info, $"FreeKiServer.Update exiting.");
		}

		public async Task<(int, string, byte[])> GetClient(HttpListenerContext httpListenerContext)
		{
			Uri? requestUri = httpListenerContext.Request.Url;
			if (requestUri == null)
			{
				return (400, "text/plain", System.Text.Encoding.UTF8.GetBytes("Invalid request URL"));
			}

			// Use AbsolutePath (without query string) for more reliable comparison
			string requestPath = requestUri.AbsolutePath;
			
			for (int i = 0; i < _advertiseUrls.Count; i++)
			{
				Uri baseUri = new Uri(_advertiseUrls[i]);
				
				// Check if request path starts with the base path
				if (requestPath.StartsWith(baseUri.AbsolutePath, StringComparison.OrdinalIgnoreCase))
				{
					// Get the remaining path after the base URL
					string relPath = requestPath.Substring(baseUri.AbsolutePath.Length).TrimStart('/');
					return await ServeStaticFile(_staticRootFolder, relPath).ConfigureAwait(false);
				}
			}

			return (401, "text/plain", System.Text.Encoding.UTF8.GetBytes($"Request from unexpected source does not match any AdvertiseURL: {requestUri}"));
		}

		public async Task<(int, string, byte[])> GetMedia(HttpListenerContext httpListenerContext)
		{
			Uri? requestUri = httpListenerContext.Request.Url;
			if (requestUri == null)
			{
				return (400, "text/plain", System.Text.Encoding.UTF8.GetBytes("Invalid request URL"));
			}

			// Use AbsolutePath (without query string) for more reliable comparison
			string requestPath = requestUri.AbsolutePath;
			
			for (int i = 0; i < _advertiseUrls.Count; i++)
			{
				Uri baseUri = new Uri(_advertiseUrls[i]);
				
				// Check if request path starts with the base path
				if (requestPath.StartsWith(baseUri.AbsolutePath, StringComparison.OrdinalIgnoreCase))
				{
					// Get the remaining path after the base URL
					string remainingPath = requestPath.Substring(baseUri.AbsolutePath.Length).TrimStart('/');
					
					// Check if it starts with "media/"
					if (remainingPath.StartsWith("media/", StringComparison.OrdinalIgnoreCase))
					{
						// Extract the media file path after "media/"
						string mediaPath = remainingPath.Substring("media/".Length);
						return await ServeStaticFile(_mediaRoot, mediaPath).ConfigureAwait(false);
					}
				}
			}

			return (401, "text/plain", System.Text.Encoding.UTF8.GetBytes($"Request from unexpected source does not match any AdvertiseURL: {requestUri}"));
		}

		//-------------------
		// Static file server
		static private async Task<(int statusCode, string contentType, byte[] content)> ServeStaticFile(string staticRoot, string urlPath)
		{
			// Normalize the path
			string relativePath = urlPath.TrimStart('/');
			if (string.IsNullOrWhiteSpace(relativePath))
				relativePath = "index.html"; // default file

			// Prevent directory traversal
			string fullPath = Path.Combine(staticRoot, relativePath);
			string fullPathNormalized = Path.GetFullPath(fullPath);
			string staticRootNormalized = Path.GetFullPath(staticRoot);

			if (!fullPathNormalized.StartsWith(staticRootNormalized))
			{
				return (403, "text/plain", Encoding.UTF8.GetBytes("Forbidden"));
			}

			if (!File.Exists(fullPathNormalized))
			{
				return (404, "text/plain", Encoding.UTF8.GetBytes("Not Found"));
			}

			string contentType = Path.GetExtension(fullPathNormalized).ToLowerInvariant() switch
			{
				".html" => "text/html",
				".htm" => "text/html",
				".js" => "application/javascript",
				".css" => "text/css",
				".json" => "application/json",
				".png" => "image/png",
				".jpg" => "image/jpeg",
				".jpeg" => "image/jpeg",
				".gif" => "image/gif",
				".svg" => "image/svg+xml",
				".ico" => "image/x-icon",
				".txt" => "text/plain",
				_ => "application/octet-stream"
			};

			byte[] content = await File.ReadAllBytesAsync(fullPathNormalized).ConfigureAwait(false);
			return (200, contentType, content);
		}
	}
}
