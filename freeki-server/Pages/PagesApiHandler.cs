using Authentication;
using Logging;
using Storage;
using System;
using System.Collections.Generic;
using System.Net;
using System.Threading.Tasks;

namespace FreeKi
{
	//-------------------
	/*
	| Method | URL                           | Purpose                     |
	| ------ | --------------------------    | --------------------------- |
	| GET    | `/api/pages`                  | List all pages              |
	| GET    | `/api/pages/{id}`             | Fetch page content          |
	| POST   | `/api/pages`                  | Create a new page           | title, tags in query, filepath, content in body
	| PUT    | `/api/pages/{id}`             | Update existing page        | title, tags in query, filepath, content in body
	| DELETE | `/api/pages/{id}`             | Delete a page               |
	| GET    | `/api/pages?q=term`           | Search page metadata        |
	| GET    | `/api/pages?q=term&content=1` | Search page metadata and content |
	| GET    | `/api/pages/{id}/history`     | Get git commit history      |
	| POST   | `/api/pages/{id}/retrieve`    | Retrieve old version from git | versionId is 0-based index of metadata version, not commit hash
	*/

	// Handles all /api/pages endpoints
	public class PagesApiHandler
	{
		private readonly PageManager _pageManager;
		private readonly ILogging _logger;
		private readonly IAuthentication _authentication;

		public PagesApiHandler(PageManager pageManager, IAuthentication authentication, ILogging logger)
		{
			_pageManager = pageManager;
			_authentication = authentication;
			_logger = logger;
		}

		// Main entry point for /api/pages requests - handles authentication and delegates to HandleRequest
		public async Task<(int, string, byte[])> GetPages(HttpListenerContext httpListenerContext)
		{
			// Authenticate the request
            (string? accountId, string? fullName, string? email, string[]? roles) = _authentication.AuthenticateRequest(httpListenerContext.Request.Headers.GetValues("Authorization"));
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

		private async Task<(int, string, byte[])> HandleRequest(HttpListenerContext httpListenerContext, string gitAuthorName, string gitAuthorEmail)
		{
			// Parse URL segments
			List<string> segments = new List<string>(httpListenerContext.Request.Url?.Segments ?? []);
			string httpMethod = httpListenerContext.Request.HttpMethod;

			// Route to appropriate handler based on HTTP method and URL structure
			if (httpMethod == "GET")
			{
				if (segments.Count == 2)
				{
					// GET /api/pages - List all pages
					return HandleListAllPages();
				}
				else if (segments.Count == 3)
				{
					// GET /api/pages/{id} - Fetch page content
					string pageId = segments[2].TrimEnd('/');
					if (string.IsNullOrEmpty(pageId))
					{
						_logger.Log(EVerbosity.Error, $"{httpMethod} {httpListenerContext.Request.Url} missing pageId");
						return (400, "text/plain", System.Text.Encoding.UTF8.GetBytes("Parameter error"));
					}
					return await HandleGetSinglePage(pageId).ConfigureAwait(false);
				}
				else if (segments.Count == 4 && segments[3].TrimEnd('/') == "history")
				{
					// GET /api/pages/{id}/history - Get git commit history
					string pageId = segments[2].TrimEnd('/');
					if (string.IsNullOrEmpty(pageId))
					{
						_logger.Log(EVerbosity.Error, $"{httpMethod} {httpListenerContext.Request.Url} missing pageId");
						return (400, "text/plain", System.Text.Encoding.UTF8.GetBytes("Parameter error"));
					}
					return HandleGetPageHistory(pageId);
				}
				else if (httpListenerContext.Request.QueryString["q"] != null)
				{
					string searchTerm = httpListenerContext.Request.QueryString["q"]!;
					if (string.IsNullOrEmpty(searchTerm))
					{
						_logger.Log(EVerbosity.Error, $"{httpMethod} {httpListenerContext.Request.Url} missing query");
						return (400, "text/plain", System.Text.Encoding.UTF8.GetBytes("Parameter error"));
					}

					if (httpListenerContext.Request.QueryString["content"] == "1")
					{
						// GET /api/pages?q=term&content=1 - Search page titles/contents with content
						return await HandleSearchPagesWithContent(searchTerm).ConfigureAwait(false);
					}
					else
					{
						// GET /api/pages?q=term - Search page metadata only
						return await HandleSearchPages(searchTerm).ConfigureAwait(false);
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
					// POST /api/pages - Create a new page - all metadata fields are required
					string? title = httpListenerContext.Request.QueryString["title"];
					string? tags = httpListenerContext.Request.QueryString["tags"];
					string? filepath = httpListenerContext.Request.QueryString["filepath"];
					string? content = httpListenerContext.Request.InputStream != null
						? await new System.IO.StreamReader(httpListenerContext.Request.InputStream, httpListenerContext.Request.ContentEncoding).ReadToEndAsync().ConfigureAwait(false)
						: null;

					// Validate that all required fields are present
					if (string.IsNullOrEmpty(title) || tags == null || string.IsNullOrEmpty(filepath) || string.IsNullOrEmpty(content))
					{
						_logger.Log(EVerbosity.Error, $"{httpMethod} {httpListenerContext.Request.Url} bad parameters");
						return (400, "text/plain", System.Text.Encoding.UTF8.GetBytes("Parameter error"));
					}
					List<string> tagsList = ParseTags(tags);
					return await HandleCreatePage(title, tagsList, filepath, content, gitAuthorName, gitAuthorEmail).ConfigureAwait(false);
				}
				else if (segments.Count == 4 && segments[3].TrimEnd('/') == "retrieve")
				{
					// POST /api/pages/{id}/retrieve - Retrieve old version from git
					string pageId = segments[2].TrimEnd('/');
					string? versionStr = httpListenerContext.Request.QueryString["version"];

					if (string.IsNullOrEmpty(pageId) || string.IsNullOrEmpty(versionStr) || long.TryParse(versionStr, out long version) == false)
					{
						_logger.Log(EVerbosity.Error, $"{httpMethod} {httpListenerContext.Request.Url} bad parameters");
						return (400, "text/plain", System.Text.Encoding.UTF8.GetBytes("Parameter error"));
					}
					return HandleRetrieveOldPage(pageId, version);
				}
				else
				{
					return (405, "text/plain", System.Text.Encoding.UTF8.GetBytes("Method not allowed."));
				}
			}
			else if (httpMethod == "PUT")
			{
				if (segments.Count == 3)
				{
					// PUT /api/pages/{id} - Update existing page
					string pageId = segments[2].TrimEnd('/');
					string? title = httpListenerContext.Request.QueryString["title"];
					string? tags = httpListenerContext.Request.QueryString["tags"];
					string? filepath = httpListenerContext.Request.QueryString["filepath"];
					string? content = httpListenerContext.Request.InputStream != null
						? await new System.IO.StreamReader(httpListenerContext.Request.InputStream, httpListenerContext.Request.ContentEncoding).ReadToEndAsync().ConfigureAwait(false)
						: null;

					if (string.IsNullOrEmpty(pageId) || string.IsNullOrEmpty(title) || tags == null || string.IsNullOrEmpty(filepath) || string.IsNullOrEmpty(content))
					{
						_logger.Log(EVerbosity.Error, $"{httpMethod} {httpListenerContext.Request.Url} bad parameters");
						return (400, "text/plain", System.Text.Encoding.UTF8.GetBytes("Parameter error"));
					}
					List<string> tagsList = ParseTags(tags);
					return await HandleUpdatePage(pageId, title, tagsList, filepath, content, gitAuthorName, gitAuthorEmail).ConfigureAwait(false);
				}
				else
				{
					return (405, "text/plain", System.Text.Encoding.UTF8.GetBytes("Method not allowed."));
				}
			}
			else if (httpMethod == "DELETE")
			{
				if (segments.Count == 3)
				{
					// DELETE /api/pages/{id} - Delete a page
					string pageId = segments[2].TrimEnd('/');
					if (string.IsNullOrEmpty(pageId))
					{
						_logger.Log(EVerbosity.Error, $"{httpMethod} {httpListenerContext.Request.Url} missing pageId");
						return (400, "text/plain", System.Text.Encoding.UTF8.GetBytes("Parameter error"));
					}
					return await HandleDeletePage(pageId, gitAuthorName, gitAuthorEmail).ConfigureAwait(false);
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

		// Tags are CSV formatted in the query string
		private List<string> ParseTags(string tags)
		{
			List<string> tagList = new List<string>();
			if (!string.IsNullOrEmpty(tags))
			{
				try
				{
					using (System.IO.StringReader reader = new System.IO.StringReader(tags))
					using (CsvHelper.CsvReader csv = new CsvHelper.CsvReader(reader, System.Globalization.CultureInfo.InvariantCulture))
					{
						tagList.AddRange(csv.GetRecords<string>());
					}
				}
				catch (Exception ex)
				{
					_logger.Log(EVerbosity.Error, $"Invalid tags format: {ex.Message}");
				}
			}
			return tagList;
		}

		//-------------------
		// Individual endpoint handlers
		//-------------------

		// GET /api/pages - List all pages
		private (int, string, byte[]) HandleListAllPages()
		{
			List<PageMetadata> pageMetadata = _pageManager.ListAllPages();
			string jsonResponse = System.Text.Json.JsonSerializer.Serialize(pageMetadata);
			return (200, "application/json", System.Text.Encoding.UTF8.GetBytes(jsonResponse));
		}

		// GET /api/pages/{id} - Fetch page content
		private async Task<(int, string, byte[])> HandleGetSinglePage(string pageId)
		{
			Page? page = await _pageManager.ReadPage(pageId).ConfigureAwait(false);
			if (page != null)
			{
				string jsonResponse = System.Text.Json.JsonSerializer.Serialize(page);
				return (200, "application/json", System.Text.Encoding.UTF8.GetBytes(jsonResponse));
			}
			else
			{
				return (404, "text/plain", System.Text.Encoding.UTF8.GetBytes("Page not found."));
			}
		}

		// POST /api/pages - Create a new page
		private async Task<(int, string, byte[])> HandleCreatePage(string title, List<string> tagsList, string filepath, string content, string gitAuthorName, string gitAuthorEmail)
		{
			string pageId = Guid.NewGuid().ToString();

			// Create new page using the full constructor
			PageMetadata metadata = new PageMetadata(pageId, tagsList, title, PageMetadata.Now, 0, filepath);
			Page newPage = new Page(metadata, content);
			bool success = await _pageManager.WritePage(newPage, gitAuthorName, gitAuthorEmail).ConfigureAwait(false);

			if (success)
			{
				string jsonResponse = System.Text.Json.JsonSerializer.Serialize(newPage.Metadata);
				return (201, "application/json", System.Text.Encoding.UTF8.GetBytes(jsonResponse));
			}
			else
			{
				return (500, "text/plain", System.Text.Encoding.UTF8.GetBytes("Failed to create page."));
			}
		}

		// PUT /api/pages/{id} - Update existing page
		private async Task<(int, string, byte[])> HandleUpdatePage(string pageId, string title, List<string> tagsList, string filepath, string content, string gitAuthorName, string gitAuthorEmail)
		{
			// Get the existing page
			Page? existingPage = await _pageManager.ReadPage(pageId).ConfigureAwait(false);
			if (existingPage != null)
			{
				// Determine if we need to update metadata (title, tags, and/or filepath)
				PageMetadata updatedMetadata = new PageMetadata(pageId, tagsList, title, PageMetadata.Now, existingPage.Metadata.Version + 1, filepath);

				// Create updated page
				Page updatedPage = new Page(updatedMetadata, content);
				bool success = await _pageManager.WritePage(updatedPage, gitAuthorName, gitAuthorEmail).ConfigureAwait(false);
				if (success)
				{
					if (filepath != existingPage.Metadata.Path)  // the file path changed so we need to delete the old file, so it's not competing for attention
					{
						await _pageManager.DeletePage(pageId, gitAuthorName, gitAuthorEmail).ConfigureAwait(false);
					}

					string jsonResponse = System.Text.Json.JsonSerializer.Serialize(updatedPage.Metadata);
					return (200, "application/json", System.Text.Encoding.UTF8.GetBytes(jsonResponse));
				}
				else
				{
					return (500, "text/plain", System.Text.Encoding.UTF8.GetBytes("Failed to update page."));
				}
			}
			else
			{
				return (404, "text/plain", System.Text.Encoding.UTF8.GetBytes("Page not found."));
			}
		}

		// DELETE /api/pages/{id} - Delete a page
		private async Task<(int, string, byte[])> HandleDeletePage(string pageId, string gitAuthorName, string gitAuthorEmail)
		{
			bool success = await _pageManager.DeletePage(pageId, gitAuthorName, gitAuthorEmail).ConfigureAwait(false);
			if (success)
			{
				object response = new { PageId = pageId };
				string jsonResponse = System.Text.Json.JsonSerializer.Serialize(response);
				return (200, "application/json", System.Text.Encoding.UTF8.GetBytes(jsonResponse));
			}
			else
			{
				return (404, "text/plain", System.Text.Encoding.UTF8.GetBytes("Page not found."));
			}
		}

		// GET /api/pages?q=term - Search page metadata
		private Task<(int, string, byte[])> HandleSearchPages(string searchTerm)
		{
			List<SearchResult> searchResults = _pageManager.SearchPages(searchTerm);
			string jsonResponse = System.Text.Json.JsonSerializer.Serialize(searchResults);
			return Task.FromResult((200, "application/json", System.Text.Encoding.UTF8.GetBytes(jsonResponse)));
		}

		// GET /api/pages?q=term&content=1 - Search page metadata and content
		private async Task<(int, string, byte[])> HandleSearchPagesWithContent(string searchTerm)
		{
			List<SearchResult> searchResults = await _pageManager.SearchPagesWithContent(searchTerm).ConfigureAwait(false);
			string jsonResponse = System.Text.Json.JsonSerializer.Serialize(searchResults);
			return (200, "application/json", System.Text.Encoding.UTF8.GetBytes(jsonResponse));
		}

		// GET /api/pages/{id}/history - Get git commit history
		private (int, string, byte[]) HandleGetPageHistory(string pageId)
		{
			List<PageMetadata> pageMetadata = _pageManager.GetRevisionHistory(pageId);
			string jsonResponse = System.Text.Json.JsonSerializer.Serialize(pageMetadata);
			return (200, "application/json", System.Text.Encoding.UTF8.GetBytes(jsonResponse));
		}

		// POST /api/pages/{id}/retrieve - Retrieve version from git commit
		private (int, string, byte[]) HandleRetrieveOldPage(string pageId, long versionId)
		{
			Page? page = _pageManager.GetRetrieveVersion(pageId, versionId);
			if (page != null)
			{
				// Return page as JSON with metadata object and content string
				object response = new
				{
					metadata = page.Metadata,
					content = page.Content
				};
				string jsonResponse = System.Text.Json.JsonSerializer.Serialize(response);
				return (200, "application/json", System.Text.Encoding.UTF8.GetBytes(jsonResponse));
			}
			else
			{
				return (404, "text/plain", System.Text.Encoding.UTF8.GetBytes("Page not found."));
			}
		}
	}
}