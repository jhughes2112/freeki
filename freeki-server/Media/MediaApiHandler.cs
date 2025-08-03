using Authentication;
using Logging;
using Storage;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using System.Linq;

namespace FreeKi
{
	//-------------------
	/*
	| Method | URL                           | Purpose                     |
	| ------ | --------------------------    | --------------------------- |
	| GET    | `/api/media`                  | List all media files        |
	| GET    | `/api/media/{filepath}`       | Fetch media file content    |
	| POST   | `/api/media`                  | Upload a new media file     | filepath in query, binary content in body
	| PUT    | `/api/media/{filepath}`       | Update existing media file  | binary content in body
	| DELETE | `/api/media/{filepath}`       | Delete a media file         |
	| GET    | `/api/media/{filepath}/history` | Get git commit history    |
	| POST   | `/api/media/{filepath}/retrieve` | Retrieve old version from git | commit hash in query
	*/
	// Handles all /api/media endpoints
	public class MediaApiHandler
	{
		private readonly IStorage _storage;
		private readonly GitManager _gitManager;
		private readonly ILogging _logger;
		private readonly IAuthentication _authentication;

		public MediaApiHandler(IStorage storage, GitManager gitManager, IAuthentication authentication, ILogging logger)
		{
			_storage = storage;
			_gitManager = gitManager;
			_authentication = authentication;
			_logger = logger;
		}

		// Main entry point for /api/media requests - handles authentication and delegates to HandleRequest
		public async Task<(int, string, byte[])> GetMedia(HttpListenerContext httpListenerContext)
		{
			// Authenticate the request
			(string? accountId, string? fullName, string? email, string[]? roles) = AuthenticateRequest(httpListenerContext);
			if (accountId == null)
			{
				_logger.Log(EVerbosity.Error, $"{httpListenerContext.Request.Url} Unauthorized");
				return (401, "text/plain", System.Text.Encoding.UTF8.GetBytes("Unauthorized"));
			}

			// Prepare git author information with fallbacks
			string gitAuthorName = !string.IsNullOrWhiteSpace(fullName) ? fullName : accountId;
			string gitAuthorEmail = !string.IsNullOrWhiteSpace(email) ? email : "System@Freeki";

			return await HandleRequest(httpListenerContext, gitAuthorName, gitAuthorEmail).ConfigureAwait(false);
		}

		private (string?, string?, string?, string[]?) AuthenticateRequest(HttpListenerContext httpListenerContext)
		{
			string[]? authHeader = httpListenerContext.Request.Headers.GetValues("Authorization");
			if (authHeader == null || authHeader.Length < 1)
				return (null, null, null, null);

			// A proper OAuth header includes the Bearer prefix, but a lazier Always-Accept client can just put the following in the header:
			// accountId<->full name<->email<->role,role,role
			string token = authHeader[0];
			if (token.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
			{
				token = token.Substring("Bearer ".Length).Trim();
			}
			return _authentication.Authenticate(token);
		}

		public async Task<(int, string, byte[])> HandleRequest(HttpListenerContext httpListenerContext, string gitAuthorName, string gitAuthorEmail)
		{
			// Parse URL segments
			List<string> segments = new List<string>(httpListenerContext.Request.Url?.Segments ?? []);
			string httpMethod = httpListenerContext.Request.HttpMethod;

			// Route to appropriate handler based on HTTP method and URL structure
			if (httpMethod == "GET")
			{
				if (segments.Count == 2)
				{
					// GET /api/media - List all media files
					return await HandleListAllMedia().ConfigureAwait(false);
				}
				else if (segments.Count >= 3)
				{
					// Check if this is a history request
					if (segments.Count >= 4 && segments[segments.Count - 1].TrimEnd('/') == "history")
					{
						// GET /api/media/{filepath}/history - Get git commit history
						List<string> pathSegments = new List<string>();
						for (int i = 2; i < segments.Count - 1; i++)
						{
							pathSegments.Add(segments[i]);
						}
						string filepath = string.Join("", pathSegments).TrimEnd('/');
						if (string.IsNullOrEmpty(filepath))
						{
							_logger.Log(EVerbosity.Error, $"{httpMethod} {httpListenerContext.Request.Url} missing filepath");
							return (400, "text/plain", System.Text.Encoding.UTF8.GetBytes("Parameter error"));
						}
						return HandleGetMediaHistory(filepath);
					}
					else
					{
						// GET /api/media/{filepath} - Fetch media file content (reconstruct full filepath from remaining segments)
						string filepath = string.Join("", segments.Skip(2)).TrimEnd('/');
						if (string.IsNullOrEmpty(filepath))
						{
							_logger.Log(EVerbosity.Error, $"{httpMethod} {httpListenerContext.Request.Url} missing filepath");
							return (400, "text/plain", System.Text.Encoding.UTF8.GetBytes("Parameter error"));
						}
						return await HandleGetSingleMedia(filepath).ConfigureAwait(false);
					}
				}
				else
				{
					return (405, "text/plain", System.Text.Encoding.UTF8.GetBytes("Method not allowed."));
				}
			}
			else if (httpMethod == "POST")
			{
				if (segments.Count == 2)
				{
					// POST /api/media - Upload a new media file
					string? filepath = httpListenerContext.Request.QueryString["filepath"];
					
					if (string.IsNullOrEmpty(filepath))
					{
						_logger.Log(EVerbosity.Error, $"{httpMethod} {httpListenerContext.Request.Url} missing filepath");
						return (400, "text/plain", System.Text.Encoding.UTF8.GetBytes("Parameter error"));
					}

					// Read binary content from request body
					byte[]? content = null;
					if (httpListenerContext.Request.InputStream != null)
					{
						using (MemoryStream ms = new MemoryStream())
						{
							await httpListenerContext.Request.InputStream.CopyToAsync(ms).ConfigureAwait(false);
							content = ms.ToArray();
						}
					}

					if (content == null || content.Length == 0)
					{
						_logger.Log(EVerbosity.Error, $"{httpMethod} {httpListenerContext.Request.Url} missing content");
						return (400, "text/plain", System.Text.Encoding.UTF8.GetBytes("Parameter error"));
					}

					return await HandleCreateMedia(filepath, content, gitAuthorName, gitAuthorEmail).ConfigureAwait(false);
				}
				else if (segments.Count >= 4 && segments[segments.Count - 1].TrimEnd('/') == "retrieve")
				{
					// POST /api/media/{filepath}/retrieve - Retrieve old version from git
					List<string> pathSegments = new List<string>();
					for (int i = 2; i < segments.Count - 1; i++)
					{
						pathSegments.Add(segments[i]);
					}
					string filepath = string.Join("", pathSegments).TrimEnd('/');
					string? commitSha = httpListenerContext.Request.QueryString["commit"];

					if (string.IsNullOrEmpty(filepath) || string.IsNullOrEmpty(commitSha))
					{
						_logger.Log(EVerbosity.Error, $"{httpMethod} {httpListenerContext.Request.Url} bad parameters");
						return (400, "text/plain", System.Text.Encoding.UTF8.GetBytes("Parameter error"));
					}
					return HandleRetrieveOldMedia(filepath, commitSha);
				}
				else
				{
					return (405, "text/plain", System.Text.Encoding.UTF8.GetBytes("Method not allowed."));
				}
			}
			else if (httpMethod == "PUT")
			{
				if (segments.Count >= 3)
				{
					// PUT /api/media/{filepath} - Update existing media file
					string filepath = string.Join("", segments.Skip(2)).TrimEnd('/');
					if (string.IsNullOrEmpty(filepath))
					{
						_logger.Log(EVerbosity.Error, $"{httpMethod} {httpListenerContext.Request.Url} missing filepath");
						return (400, "text/plain", System.Text.Encoding.UTF8.GetBytes("Parameter error"));
					}

					// Read binary content from request body
					byte[]? content = null;
					if (httpListenerContext.Request.InputStream != null)
					{
						using (MemoryStream ms = new MemoryStream())
						{
							await httpListenerContext.Request.InputStream.CopyToAsync(ms).ConfigureAwait(false);
							content = ms.ToArray();
						}
					}

					if (content == null || content.Length == 0)
					{
						_logger.Log(EVerbosity.Error, $"{httpMethod} {httpListenerContext.Request.Url} missing content");
						return (400, "text/plain", System.Text.Encoding.UTF8.GetBytes("Parameter error"));
					}

					return await HandleUpdateMedia(filepath, content, gitAuthorName, gitAuthorEmail).ConfigureAwait(false);
				}
				else
				{
					return (405, "text/plain", System.Text.Encoding.UTF8.GetBytes("Method not allowed."));
				}
			}
			else if (httpMethod == "DELETE")
			{
				if (segments.Count >= 3)
				{
					// DELETE /api/media/{filepath} - Delete a media file
					string filepath = string.Join("", segments.Skip(2)).TrimEnd('/');
					if (string.IsNullOrEmpty(filepath))
					{
						_logger.Log(EVerbosity.Error, $"{httpMethod} {httpListenerContext.Request.Url} missing filepath");
						return (400, "text/plain", System.Text.Encoding.UTF8.GetBytes("Parameter error"));
					}
					return await HandleDeleteMedia(filepath, gitAuthorName, gitAuthorEmail).ConfigureAwait(false);
				}
				else
				{
					return (405, "text/plain", System.Text.Encoding.UTF8.GetBytes("Method not allowed."));
				}
			}
			else
			{
				return (405, "text/plain", System.Text.Encoding.UTF8.GetBytes("Method not allowed."));
			}
		}

		//-------------------
		// Individual endpoint handlers
		//-------------------

		// GET /api/media - List all media files
		private async Task<(int, string, byte[])> HandleListAllMedia()
		{
			try
			{
				List<string> mediaFiles = await _storage.ListAllKeys().ConfigureAwait(false);
				
				// Create response with file list and basic metadata
				List<object> mediaList = new List<object>();
				foreach (string filepath in mediaFiles)
				{
					// Get file size efficiently without reading entire file
					try
					{
						long? fileSize = await _storage.GetSize(filepath).ConfigureAwait(false);
						if (fileSize != null)
						{
							mediaList.Add(new
							{
								filepath = filepath,
								size = fileSize.Value,
								contentType = GetContentType(filepath)
							});
						}
					}
					catch (Exception ex)
					{
						_logger.Log(EVerbosity.Warning, $"MediaApiHandler.HandleListAllMedia: Error getting size for file {filepath}: {ex.Message}");
					}
				}

				string jsonResponse = System.Text.Json.JsonSerializer.Serialize(mediaList);
				return (200, "application/json", System.Text.Encoding.UTF8.GetBytes(jsonResponse));
			}
			catch (Exception ex)
			{
				_logger.Log(EVerbosity.Error, $"MediaApiHandler.HandleListAllMedia: Error listing media files: {ex.Message}");
				return (500, "text/plain", System.Text.Encoding.UTF8.GetBytes("Internal server error"));
			}
		}

		// GET /api/media/{filepath} - Fetch media file content
		private async Task<(int, string, byte[])> HandleGetSingleMedia(string filepath)
		{
			try
			{
				byte[]? fileData = await _storage.Read(filepath).ConfigureAwait(false);
				if (fileData != null)
				{
					string contentType = GetContentType(filepath);
					return (200, contentType, fileData);
				}
				else
				{
					return (404, "text/plain", System.Text.Encoding.UTF8.GetBytes("Media file not found."));
				}
			}
			catch (Exception ex)
			{
				_logger.Log(EVerbosity.Error, $"MediaApiHandler.HandleGetSingleMedia: Error reading file {filepath}: {ex.Message}");
				return (500, "text/plain", System.Text.Encoding.UTF8.GetBytes("Internal server error"));
			}
		}

		// POST /api/media - Upload a new media file
		private async Task<(int, string, byte[])> HandleCreateMedia(string filepath, byte[] content, string gitAuthorName, string gitAuthorEmail)
		{
			try
			{
				// Check if file already exists
				byte[]? existingFile = await _storage.Read(filepath).ConfigureAwait(false);
				if (existingFile != null)
				{
					return (409, "text/plain", System.Text.Encoding.UTF8.GetBytes("Media file already exists. Use PUT to update."));
				}

				bool success = await _storage.Write(filepath, content).ConfigureAwait(false);
				if (success)
				{
					_logger.Log(EVerbosity.Debug, $"MediaApiHandler.HandleCreateMedia: Successfully wrote file {filepath}");
					
					// Commit to git for version control
					try
					{
						string commitMessage = $"Added media file: {filepath}";
						string? commitSha = await _gitManager.CommitFile(filepath, content, gitAuthorName, gitAuthorEmail, commitMessage).ConfigureAwait(false);
						if (commitSha != null)
						{
							_logger.Log(EVerbosity.Debug, $"MediaApiHandler.HandleCreateMedia: Committed file {filepath} to git with SHA={commitSha}");
						}
						else
						{
							_logger.Log(EVerbosity.Warning, $"MediaApiHandler.HandleCreateMedia: Git commit returned null for file {filepath}");
						}
					}
					catch (Exception gitEx)
					{
						_logger.Log(EVerbosity.Warning, $"MediaApiHandler.HandleCreateMedia: Git commit failed for file {filepath}: {gitEx.Message}");
					}

					object response = new
					{
						filepath = filepath,
						size = content.Length,
						contentType = GetContentType(filepath)
					};
					string jsonResponse = System.Text.Json.JsonSerializer.Serialize(response);
					return (201, "application/json", System.Text.Encoding.UTF8.GetBytes(jsonResponse));
				}
				else
				{
					return (500, "text/plain", System.Text.Encoding.UTF8.GetBytes("Failed to create media file."));
				}
			}
			catch (Exception ex)
			{
				_logger.Log(EVerbosity.Error, $"MediaApiHandler.HandleCreateMedia: Error creating file {filepath}: {ex.Message}");
				return (500, "text/plain", System.Text.Encoding.UTF8.GetBytes("Internal server error"));
			}
		}

		// PUT /api/media/{filepath} - Update existing media file
		private async Task<(int, string, byte[])> HandleUpdateMedia(string filepath, byte[] content, string gitAuthorName, string gitAuthorEmail)
		{
			try
			{
				bool success = await _storage.Write(filepath, content).ConfigureAwait(false);
				if (success)
				{
					_logger.Log(EVerbosity.Debug, $"MediaApiHandler.HandleUpdateMedia: Successfully updated file {filepath}");
					
					// Commit to git for version control
					try
					{
						string commitMessage = $"Updated media file: {filepath}";
						string? commitSha = await _gitManager.CommitFile(filepath, content, gitAuthorName, gitAuthorEmail, commitMessage).ConfigureAwait(false);
						if (commitSha != null)
						{
							_logger.Log(EVerbosity.Debug, $"MediaApiHandler.HandleUpdateMedia: Committed file {filepath} to git with SHA={commitSha}");
						}
						else
						{
							_logger.Log(EVerbosity.Warning, $"MediaApiHandler.HandleUpdateMedia: Git commit returned null for file {filepath}");
						}
					}
					catch (Exception gitEx)
					{
						_logger.Log(EVerbosity.Warning, $"MediaApiHandler.HandleUpdateMedia: Git commit failed for file {filepath}: {gitEx.Message}");
					}

					object response = new
					{
						filepath = filepath,
						size = content.Length,
						contentType = GetContentType(filepath)
					};
					string jsonResponse = System.Text.Json.JsonSerializer.Serialize(response);
					return (200, "application/json", System.Text.Encoding.UTF8.GetBytes(jsonResponse));
				}
				else
				{
					return (500, "text/plain", System.Text.Encoding.UTF8.GetBytes("Failed to update media file."));
				}
			}
			catch (Exception ex)
			{
				_logger.Log(EVerbosity.Error, $"MediaApiHandler.HandleUpdateMedia: Error updating file {filepath}: {ex.Message}");
				return (500, "text/plain", System.Text.Encoding.UTF8.GetBytes("Internal server error"));
			}
		}

		// DELETE /api/media/{filepath} - Delete a media file
		private async Task<(int, string, byte[])> HandleDeleteMedia(string filepath, string gitAuthorName, string gitAuthorEmail)
		{
			try
			{
				bool success = await _storage.Delete(filepath).ConfigureAwait(false);
				if (success)
				{
					_logger.Log(EVerbosity.Info, $"MediaApiHandler.HandleDeleteMedia: Successfully deleted file {filepath}");

					// Commit deletion to git
					try
					{
						string commitMessage = $"Deleted media file: {filepath}";
						// For deletions, we don't have file content, so we'll commit an empty state
						string? commitSha = await _gitManager.CommitFile(filepath, Array.Empty<byte>(), gitAuthorName, gitAuthorEmail, commitMessage).ConfigureAwait(false);
						if (commitSha != null)
						{
							_logger.Log(EVerbosity.Debug, $"MediaApiHandler.HandleDeleteMedia: Committed deletion of file {filepath} to git with SHA={commitSha}");
						}
						else
						{
							_logger.Log(EVerbosity.Warning, $"MediaApiHandler.HandleDeleteMedia: Git commit returned null for deletion of file {filepath}");
						}
					}
					catch (Exception gitEx)
					{
						_logger.Log(EVerbosity.Warning, $"MediaApiHandler.HandleDeleteMedia: Git commit failed for deletion of file {filepath}: {gitEx.Message}");
					}

					object response = new { filepath = filepath };
					string jsonResponse = System.Text.Json.JsonSerializer.Serialize(response);
					return (200, "application/json", System.Text.Encoding.UTF8.GetBytes(jsonResponse));
				}
				else
				{
					return (404, "text/plain", System.Text.Encoding.UTF8.GetBytes("Media file not found."));
				}
			}
			catch (Exception ex)
			{
				_logger.Log(EVerbosity.Error, $"MediaApiHandler.HandleDeleteMedia: Error deleting file {filepath}: {ex.Message}");
				return (500, "text/plain", System.Text.Encoding.UTF8.GetBytes("Internal server error"));
			}
		}

		// GET /api/media/{filepath}/history - Get git commit history
		private (int, string, byte[]) HandleGetMediaHistory(string filepath)
		{
			try
			{
				List<CommitInfo> commits = _gitManager.RetrieveCommits(filepath);
				string jsonResponse = System.Text.Json.JsonSerializer.Serialize(commits);
				return (200, "application/json", System.Text.Encoding.UTF8.GetBytes(jsonResponse));
			}
			catch (Exception ex)
			{
				_logger.Log(EVerbosity.Error, $"MediaApiHandler.HandleGetMediaHistory: Error retrieving history for file {filepath}: {ex.Message}");
				return (500, "text/plain", System.Text.Encoding.UTF8.GetBytes("Internal server error"));
			}
		}

		// POST /api/media/{filepath}/retrieve - Retrieve old version from git commit
		private (int, string, byte[]) HandleRetrieveOldMedia(string filepath, string commitSha)
		{
			try
			{
				byte[]? fileContent = _gitManager.RetrieveFile(filepath, commitSha);
				if (fileContent != null)
				{
					string contentType = GetContentType(filepath);
					return (200, contentType, fileContent);
				}
				else
				{
					return (404, "text/plain", System.Text.Encoding.UTF8.GetBytes("Media file version not found."));
				}
			}
			catch (Exception ex)
			{
				_logger.Log(EVerbosity.Error, $"MediaApiHandler.HandleRetrieveOldMedia: Error retrieving file {filepath} at commit {commitSha}: {ex.Message}");
				return (500, "text/plain", System.Text.Encoding.UTF8.GetBytes("Internal server error"));
			}
		}

		// Helper method to determine content type based on file extension
		private static string GetContentType(string filepath)
		{
			string extension = Path.GetExtension(filepath).ToLowerInvariant();
			return extension switch
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
				".pdf" => "application/pdf",
				".mp3" => "audio/mpeg",
				".mp4" => "video/mp4",
				".avi" => "video/x-msvideo",
				".mov" => "video/quicktime",
				".wav" => "audio/wav",
				".zip" => "application/zip",
				".rar" => "application/x-rar-compressed",
				".doc" => "application/msword",
				".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				".xls" => "application/vnd.ms-excel",
				".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				".ppt" => "application/vnd.ms-powerpoint",
				".pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
				_ => "application/octet-stream"
			};
		}
	}
}