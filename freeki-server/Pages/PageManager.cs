using FreeKi;
using Logging;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Storage
{
	// Search result with excerpt and score
	public class SearchResult
	{
		public string Id { get; set; } = "";
		public string Title { get; set; } = "";
		public string Path { get; set; } = "";
		public string Excerpt { get; set; } = "";
		public int Score { get; set; } = 0;
	}

	// High-level storage service for Page objects using generic IStorage and PageSerializer
	public class PageManager
	{
		private readonly IStorage _storage;
		private readonly GitManager _gitManager;
		private readonly ILogging _logger;
		private readonly PageSerializer _pageSerializer = new PageSerializer();
		private readonly Dictionary<string, PageMetadata> _metadataCache = new Dictionary<string, PageMetadata>();

		public PageManager(IStorage storage, GitManager gitManager, ILogging logger)
		{
			_storage = storage;
			_gitManager = gitManager;
			_logger  = logger;
		}

		// Get count of pages in cache
		public int GetCachedPageCount()
		{
			int count = _metadataCache.Count;
			_logger.Log(EVerbosity.Debug, $"PageManager.GetCachedPageCount: {count} pages cached");
			return count;
		}

		// Refresh the in-memory cache by loading all page metadata from storage
		// During refresh, if a file is found that does not match its metadata path, rewrite the metadata to be correct
		public async Task Refresh()
		{
			_logger.Log(EVerbosity.Info, "PageManager.Refresh: Starting metadata cache refresh");
			_metadataCache.Clear();
				
			try
			{
				List<string> filenames = await _storage.ListAllKeys().ConfigureAwait(false);
				int loadedCount = 0;
				int correctedCount = 0;
				int errorCount = 0;
				
				foreach (string filename in filenames)
				{
					try
					{
						PageMetadata? metadata = await ReadMetadataWithBoundedRead(filename).ConfigureAwait(false);
						if (metadata != null)
						{
							// Check if the file's actual path matches the metadata path
							if (metadata.Path != filename)
							{
								_logger.Log(EVerbosity.Warning, $"PageManager.Refresh: Path mismatch for pageId={metadata.PageId}, expected={metadata.Path}, actual={filename}, correcting metadata");
								
								try
								{
									// Read the full page to correct the metadata
									Page? fullPage = await ReadPageFromPath(filename).ConfigureAwait(false);
									if (fullPage != null)
									{
										// Create corrected metadata with the actual filename
										PageMetadata correctedMetadata = new PageMetadata(metadata.PageId, metadata.Tags, metadata.Title, metadata.LastModified, metadata.Version, filename, metadata.SortOrder);
										Page correctedPage = new Page(correctedMetadata, fullPage.Content);
										
										// Write back the corrected page
										bool correctionSuccess = await WritePageToPath(correctedPage, filename, FreeKiServer.kSystemUserName, FreeKiServer.kSystemUserEmail).ConfigureAwait(false);
										if (correctionSuccess)
										{
											// Use the corrected metadata for caching
											metadata = correctedMetadata;
											correctedCount++;
											_logger.Log(EVerbosity.Info, $"PageManager.Refresh: Successfully corrected path for pageId={metadata.PageId}");
										}
										else
										{
											_logger.Log(EVerbosity.Error, $"PageManager.Refresh: Failed to write corrected page for pageId={metadata.PageId}, filename={filename}");
											errorCount++;
										}
									}
									else
									{
										_logger.Log(EVerbosity.Error, $"PageManager.Refresh: Failed to read full page for path correction, pageId={metadata.PageId}, filename={filename}");
										errorCount++;
									}
								}
								catch (Exception correctionEx)
								{
									_logger.Log(EVerbosity.Error, $"PageManager.Refresh: Unhandled error during path correction for pageId={metadata.PageId}, filename={filename}: {correctionEx.Message}");
									errorCount++;
								}
							}
							
							_metadataCache[metadata.PageId] = metadata;
							loadedCount++;
						}
						else
						{
							// Skip files that can't be read or parsed as page metadata
							_logger.Log(EVerbosity.Warning, $"PageManager.Refresh: Failed to read metadata for filename={filename}");
							errorCount++;
						}
					}
					catch (Exception fileEx)
					{
						_logger.Log(EVerbosity.Error, $"PageManager.Refresh: Unhandled error processing filename={filename}: {fileEx.Message}");
						errorCount++;
					}
				}
				_logger.Log(EVerbosity.Info, $"PageManager.Refresh: Completed - loaded={loadedCount}, corrected={correctedCount}, errors={errorCount} pages");
			}
			catch (Exception ex)
			{
				_logger.Log(EVerbosity.Error, $"PageManager.Refresh: Unhandled error: {ex.Message}");
			}
		}

		// List metadata for all pages in the storage system
		public List<PageMetadata> ListAllPages()
		{
			List<PageMetadata> pageMetadataList = new List<PageMetadata>(_metadataCache.Values);
			_logger.Log(EVerbosity.Debug, $"PageManager.ListAllPages: Returning {pageMetadataList.Count} pages");
			return pageMetadataList;
		}

		// Helper method to read metadata using bounded reads to avoid loading entire file
		private async Task<PageMetadata?> ReadMetadataWithBoundedRead(string filename)
		{
			const int INITIAL_READ_SIZE = 1024; // Start with 1KB for metadata
			int offset = 0;
			int readSize = INITIAL_READ_SIZE;
			PageMetadata? result = null;
				
			try
			{
				while (true)
				{
					byte[]? data = await _storage.ReadPartial(filename, offset, readSize).ConfigureAwait(false);
					if (data == null || data.Length == 0)
					{
						break;
					}
					
					// Try to parse metadata from the current chunk
					PageMetadata? metadata = _pageSerializer.DeserializeMetadataOnly(data);
					if (metadata != null)
					{
						result = metadata; // Successfully parsed metadata
						break;
					}
					else
					{
						// If we got less data than requested, we've reached end of file
						if (data.Length < readSize)
						{
							break; // Could not parse metadata within the entire file
						}
						
						// Increase read size and try again (double the size each time)
						readSize = Math.Min(readSize * 2, 8192); // Cap at 8KB to avoid excessive reads
						if (offset + readSize > 1024 * 1024) // Don't read more than 1MB total
						{
							break; // File is too large or malformed
						}
					}

					offset += data.Length;
				}
			}
			catch (Exception ex)
			{
				_logger.Log(EVerbosity.Error, $"PageManager.ReadMetadataWithBoundedRead: Unhandled error reading metadata from filename={filename}: {ex.Message}");
			}
				
			return result;
		}

		// Helper method to read a full page from a specific path
		// This method also updates the cache to ensure consistency when files might have been modified externally
		private async Task<Page?> ReadPageFromPath(string path)
		{
			Page? result = null;
				
			try
			{
				byte[]? data = await _storage.Read(path).ConfigureAwait(false);
				if (data != null)
				{
					result = _pageSerializer.Deserialize(data);
					if (result == null)
					{
						_logger.Log(EVerbosity.Error, $"PageManager.ReadPageFromPath: Failed to deserialize page from path={path}");
					}
					else
					{
						// Always update the cache with current file metadata when reading directly from path
						// This handles cases where files might have been modified by external processes
						_metadataCache[result.Metadata.PageId] = result.Metadata;
						_logger.Log(EVerbosity.Debug, $"PageManager.ReadPageFromPath: Successfully read and cached pageId={result.Metadata.PageId}, path={path}");
					}
				}
				else
				{
					_logger.Log(EVerbosity.Warning, $"PageManager.ReadPageFromPath: No data found for path={path}");
				}
			}
			catch (Exception ex)
			{
				_logger.Log(EVerbosity.Error, $"PageManager.ReadPageFromPath: Unhandled error reading from path={path}: {ex.Message}");
			}
			return result;
		}

		// Helper method to write a page to a specific path
		private async Task<bool> WritePageToPath(Page page, string path, string gitAuthorName, string gitAuthorEmail)
		{
			bool success = false;
			try
			{
				byte[] data = _pageSerializer.Serialize(page);
				success = await _storage.Write(path, data).ConfigureAwait(false);
				
				if (success)
				{
					_logger.Log(EVerbosity.Debug, $"PageManager.WritePageToPath: Successfully wrote pageId={page.Metadata.PageId} to path={path}");
					
					// Commit to git for version control
					try
					{
						string commitMessage = $"Updated page: {page.Metadata.Title} (v{page.Metadata.Version})";
						string? commitSha = await _gitManager.CommitFile(path, data, gitAuthorName, gitAuthorEmail, commitMessage).ConfigureAwait(false);
						if (commitSha != null)
						{
							_logger.Log(EVerbosity.Debug, $"PageManager.WritePageToPath: Committed pageId={page.Metadata.PageId} to git with SHA={commitSha}");
						}
						else
						{
							_logger.Log(EVerbosity.Warning, $"PageManager.WritePageToPath: Git commit returned null for pageId={page.Metadata.PageId}, path={path}");
						}
					}
					catch (Exception gitEx)
					{
						_logger.Log(EVerbosity.Warning, $"PageManager.WritePageToPath: Git commit failed for pageId={page.Metadata.PageId}, path={path}: {gitEx.Message}");
					}
				}
				else
				{
					_logger.Log(EVerbosity.Error, $"PageManager.WritePageToPath: Storage write failed for pageId={page.Metadata.PageId}, path={path}");
				}
			}
			catch (Exception ex)
			{
				_logger.Log(EVerbosity.Error, $"PageManager.WritePageToPath: Unhandled error writing pageId={page.Metadata.PageId}, path={path}: {ex.Message}");
			}
				
			return success;
		}

		// Read a page by its pageId
		public async Task<Page?> ReadPage(string pageId)
		{
			Page? result = null;

			if (string.IsNullOrEmpty(pageId)==false)
			{
				// Get the path from cached metadata
				if (_metadataCache.TryGetValue(pageId, out PageMetadata? metadata))
				{
					result = await ReadPageFromPath(metadata.Path).ConfigureAwait(false);
					if (result == null)
					{
						_logger.Log(EVerbosity.Warning, $"PageManager.ReadPage: Failed to read page content for pageId={pageId}, path={metadata.Path}");
					}
					// Note: Cache is already updated in ReadPageFromPath, no need to duplicate here
				}
				else
				{
					_logger.Log(EVerbosity.Debug, $"PageManager.ReadPage: PageId={pageId} not found in cache");
				}
			}
			else
			{
				_logger.Log(EVerbosity.Error, "PageManager.ReadPage: PageId cannot be null or empty");
			}
			return result;
		}

		// Write a page
		public async Task<bool> WritePage(Page page, string gitAuthorName, string gitAuthorEmail)
		{
			bool success = false;
			if (page != null)
			{
				success = await WritePageToPath(page, page.Metadata.Path, gitAuthorName, gitAuthorEmail).ConfigureAwait(false);
				if (success)
				{
					// Update cache with new metadata
					_metadataCache[page.Metadata.PageId] = page.Metadata;
					_logger.Log(EVerbosity.Debug, $"PageManager.WritePage: Successfully wrote and cached pageId={page.Metadata.PageId}");
				}
				else
				{
					_logger.Log(EVerbosity.Error, $"PageManager.WritePage: Failed to write pageId={page.Metadata.PageId}, path={page.Metadata.Path}");
				}
			}
			else
			{
				_logger.Log(EVerbosity.Error, "PageManager.WritePage: Page cannot be null");
			}
			return success;
		}

		// Write a page with version checking (check-and-set)
		// Returns true if successful, false if version mismatch or other failure
		public async Task<bool> WritePageWithVersionCheck(Page page, string gitAuthorName, string gitAuthorEmail)
		{
			bool success = false;
			if (page != null)
			{
				// Check version using cached metadata first
				PageMetadata? cachedMetadata = null;
				_metadataCache.TryGetValue(page.Metadata.PageId, out cachedMetadata);
			
				if (cachedMetadata == null)
				{
					// Page doesn't exist in cache, only allow if expected version is 0 (new page)
					if (page.Metadata.Version == 0)
					{
						success = await WritePage(page, gitAuthorName, gitAuthorEmail).ConfigureAwait(false);
						if (success)
						{
							_logger.Log(EVerbosity.Info, $"PageManager.WritePageWithVersionCheck: Created new pageId={page.Metadata.PageId}, version={page.Metadata.Version}");
						}
					}
					else
					{
						_logger.Log(EVerbosity.Warning, $"PageManager.WritePageWithVersionCheck: Version check failed - pageId={page.Metadata.PageId} not found in cache but expected version={page.Metadata.Version} (should be 0 for new pages)");
					}
				}
				else
				{
					// Page exists, new version is incremented by exactly one
					if (cachedMetadata.Version + 1 == page.Metadata.Version)
					{
						success = await WritePage(page, gitAuthorName, gitAuthorEmail).ConfigureAwait(false);
						if (success)
						{
							_logger.Log(EVerbosity.Info, $"PageManager.WritePageWithVersionCheck: Updated pageId={page.Metadata.PageId}, version {cachedMetadata.Version} -> {page.Metadata.Version}");
						}
					}
					else
					{
						_logger.Log(EVerbosity.Warning, $"PageManager.WritePageWithVersionCheck: Version check failed - pageId={page.Metadata.PageId}, expected version={page.Metadata.Version}, current version={cachedMetadata.Version}");
					}
				}
			}
			else
			{
				_logger.Log(EVerbosity.Error, "PageManager.WritePageWithVersionCheck: Page cannot be null");
			}
			return success;
		}

		// Delete a page by its pageId
		public async Task<bool> DeletePage(string pageId, string gitAuthorName, string gitAuthorEmail)
		{
			bool success = false;
			if (string.IsNullOrEmpty(pageId)==false)
			{
				// Get the path from cached metadata
				if (_metadataCache.TryGetValue(pageId, out PageMetadata? metadata))
				{
					success = await _storage.Delete(metadata.Path).ConfigureAwait(false);
					if (success)
					{
						// Remove from cache
						_metadataCache.Remove(pageId);
						_logger.Log(EVerbosity.Info, $"PageManager.DeletePage: Successfully deleted pageId={pageId}, path={metadata.Path}");

						// Commit deletion to git (note: this creates a commit showing the file was deleted)
						try
						{
							string commitMessage = $"Deleted page: {metadata.Title}";
							// For deletions, we don't have file content, so we'll commit an empty state
							string? commitSha = await _gitManager.CommitFile(metadata.Path, Array.Empty<byte>(), gitAuthorName, gitAuthorEmail, commitMessage).ConfigureAwait(false);
							if (commitSha != null)
							{
								_logger.Log(EVerbosity.Debug, $"PageManager.DeletePage: Committed deletion of pageId={pageId} to git with SHA={commitSha}");
							}
							else
							{
								_logger.Log(EVerbosity.Warning, $"PageManager.DeletePage: Git commit returned null for deletion of pageId={pageId}, path={metadata.Path}");
							}
						}
						catch (Exception gitEx)
						{
							_logger.Log(EVerbosity.Warning, $"PageManager.DeletePage: Git commit failed for deletion of pageId={pageId}, path={metadata.Path}: {gitEx.Message}");
						}
					}
					else
					{
						_logger.Log(EVerbosity.Error, $"PageManager.DeletePage: Storage deletion failed for pageId={pageId}, path={metadata.Path}");
					}
				}
				else
				{
					_logger.Log(EVerbosity.Warning, $"PageManager.DeletePage: PageId={pageId} not found in cache");
				}
			}
			else
			{
				_logger.Log(EVerbosity.Error, "PageManager.DeletePage: PageId cannot be null or empty");
			}
			return success;
		}

		public List<SearchResult> SearchPages(string searchTerm)
		{
			List<SearchResult> searchResults = new List<SearchResult>();
			
			// Return empty list for null or empty search terms
			if (!string.IsNullOrWhiteSpace(searchTerm))
			{
				int totalSearched = 0;
				// Search through cached metadata first for quick title/tag matching
				foreach (PageMetadata metadata in _metadataCache.Values)
				{
					totalSearched++;
					// Search in metadata fields (case-insensitive)
					bool isMatch = metadata.PageId.Contains(searchTerm, StringComparison.OrdinalIgnoreCase);
					isMatch = isMatch || metadata.Title.Contains(searchTerm, StringComparison.OrdinalIgnoreCase);
					isMatch = isMatch || metadata.Path.Contains(searchTerm, StringComparison.OrdinalIgnoreCase);

					// Search in tags (case-insensitive)
					foreach (string tag in metadata.Tags)
					{
					 isMatch = isMatch || tag.Contains(searchTerm, StringComparison.OrdinalIgnoreCase);
					}
					
					if (isMatch)
					{
						// For metadata-only search, use empty content for excerpt generation
						SearchResult result = CreateSearchResult(metadata, "", searchTerm);
						searchResults.Add(result);
					}
				}
				
				// Sort by score descending (highest score first)
				searchResults.Sort((a, b) => b.Score.CompareTo(a.Score));
				
				_logger.Log(EVerbosity.Debug, $"PageManager.SearchPages: Searched {totalSearched} pages for term='{searchTerm}', found {searchResults.Count} matches");
			}
			else
			{
				_logger.Log(EVerbosity.Debug, "PageManager.SearchPages: Empty search term, returning empty results");
			}
			
			return searchResults;
		}

		// Search pages including content (slower operation that reads full pages)
		public async Task<List<SearchResult>> SearchPagesWithContent(string searchTerm)
		{
			List<SearchResult> searchResults = new List<SearchResult>();
			
			// Return empty list for null or empty search terms
			if (!string.IsNullOrWhiteSpace(searchTerm))
			{
				int totalSearched = 0;
				int errorCount = 0;
				
				foreach (PageMetadata metadata in _metadataCache.Values)
				{
					totalSearched++;
					try
					{
						// Read the full page to search both metadata and content
						Page? page = await ReadPageFromPath(metadata.Path).ConfigureAwait(false);
						if (page != null)
						{
							// Note: Cache is already updated in ReadPageFromPath, no need to duplicate here
							
							// Search in metadata fields (case-insensitive)
							bool isMatch = page.Metadata.PageId.Contains(searchTerm, StringComparison.OrdinalIgnoreCase);
							isMatch = isMatch || page.Metadata.Title.Contains(searchTerm, StringComparison.OrdinalIgnoreCase);
							isMatch = isMatch || page.Metadata.Path.Contains(searchTerm, StringComparison.OrdinalIgnoreCase);

							// Search in tags (case-insensitive)
							foreach (string tag in page.Metadata.Tags)
							{
								isMatch = isMatch || tag.Contains(searchTerm, StringComparison.OrdinalIgnoreCase);
							}
							
							// Search in content (case-insensitive)
							isMatch = isMatch || page.Content.Contains(searchTerm, StringComparison.OrdinalIgnoreCase);
								
							// Add to results if match found
							if (isMatch)
							{
								SearchResult result = CreateSearchResult(page.Metadata, page.Content, searchTerm);
								searchResults.Add(result);
							}
						}
						else
						{
							// Skip pages that can't be read or parsed
							_logger.Log(EVerbosity.Warning, $"PageManager.SearchPagesWithContent: Failed to read pageId={metadata.PageId}, path={metadata.Path}");
							errorCount++;
						}
					}
					catch (Exception pageEx)
					{
						_logger.Log(EVerbosity.Error, $"PageManager.SearchPagesWithContent: Error reading pageId={metadata.PageId}, path={metadata.Path}: {pageEx.Message}");
						errorCount++;
					}
				}
				
				// Sort by score descending (highest score first)
				searchResults.Sort((a, b) => b.Score.CompareTo(a.Score));
				
				_logger.Log(EVerbosity.Debug, $"PageManager.SearchPagesWithContent: Searched {totalSearched} pages for term='{searchTerm}', found {searchResults.Count} matches, {errorCount} errors");
			}
			else
			{
				_logger.Log(EVerbosity.Debug, "PageManager.SearchPagesWithContent: Empty search term, returning empty results");
			}
			
			return searchResults;
		}

		public List<PageMetadata> GetRevisionHistory(string pageId)
		{
			List<PageMetadata> revisions = new List<PageMetadata>();
			
			if (string.IsNullOrEmpty(pageId)==false)
			{
				// Get the path from cached metadata
				if (_metadataCache.TryGetValue(pageId, out PageMetadata? metadata))
				{
					// Fetch the list of commits that involve this file path
					List<CommitInfo> commits = _gitManager.RetrieveCommits(metadata.Path);
					
					if (commits.Count > 0)
					{
						HashSet<long> seenVersions = new HashSet<long>(); // Track unique versions
						int errorCount = 0;
						
						foreach (CommitInfo commit in commits)
						{
							try
							{
								// Request each version from git
								byte[]? fileContent = _gitManager.RetrieveFile(metadata.Path, commit.Sha);
								if (fileContent != null)
								{
									// Parse the Page from the content
									Page? page = _pageSerializer.Deserialize(fileContent);
									if (page != null)
									{
										// Check if this version is unique (some commits might not be content changes)
										if (!seenVersions.Contains(page.Metadata.Version))
										{
											seenVersions.Add(page.Metadata.Version);
											revisions.Add(page.Metadata);
										}
									}
									else
									{
										_logger.Log(EVerbosity.Warning, $"PageManager.GetRevisionHistory: Could not parse page for pageId={pageId}, commit={commit.Sha}");
										errorCount++;
									}
								}
								else
								{
									_logger.Log(EVerbosity.Warning, $"PageManager.GetRevisionHistory: Could not retrieve content for pageId={pageId}, commit={commit.Sha}");
									errorCount++;
								}
							}
							catch (Exception commitEx)
							{
								_logger.Log(EVerbosity.Error, $"PageManager.GetRevisionHistory: Error processing commit for pageId={pageId}, commit={commit.Sha}: {commitEx.Message}");
								errorCount++;
							}
						}

						// Sort by version descending (newest first)
						revisions.Sort((a, b) => b.Version.CompareTo(a.Version));
						
						_logger.Log(EVerbosity.Info, $"PageManager.GetRevisionHistory: Found {revisions.Count} unique revisions for pageId={pageId}, {errorCount} errors from {commits.Count} commits");
					}
					else
					{
						_logger.Log(EVerbosity.Info, $"PageManager.GetRevisionHistory: No commits found for pageId={pageId}, path={metadata.Path}");
					}
				}
				else
				{
					_logger.Log(EVerbosity.Warning, $"PageManager.GetRevisionHistory: PageId={pageId} not found in cache");
				}
			}
			else
			{
				_logger.Log(EVerbosity.Warning, "PageManager.GetRevisionHistory: PageId is null or empty");
			}

			return revisions;
		}

		public Page? GetRetrieveVersion(string pageId, long versionId)
		{
			Page? result = null;
			
			if (string.IsNullOrEmpty(pageId)==false)
			{
				// Get the path from cached metadata
				if (_metadataCache.TryGetValue(pageId, out PageMetadata? metadata))
				{
					// Fetch the list of commits that involve this file path
					List<CommitInfo> commits = _gitManager.RetrieveCommits(metadata.Path);
					
					if (commits.Count > 0)
					{
						// Process commits in chronological order (oldest first) to handle version progression correctly
						commits.Reverse();
						int errorCount = 0;
						
						foreach (CommitInfo commit in commits)
						{
							try
							{
								// Request content from git
								byte[]? fileContent = _gitManager.RetrieveFile(metadata.Path, commit.Sha);
								if (fileContent != null)
								{
									// Parse the Page from the content
									Page? page = _pageSerializer.Deserialize(fileContent);
									if (page != null)
									{
										// Check if this version matches or has gone past the requested version
										if (page.Metadata.Version == versionId)
										{
											_logger.Log(EVerbosity.Info, $"PageManager.GetRetrieveVersion: Found exact version={versionId} for pageId={pageId}");
											result = page;
											break;
										}
										else if (page.Metadata.Version > versionId)
										{
											// We've gone past the requested version, this means the requested version doesn't exist
											_logger.Log(EVerbosity.Warning, $"PageManager.GetRetrieveVersion: Version={versionId} not found for pageId={pageId}, found version={page.Metadata.Version} instead");
											break;
										}
									}
									else
									{
										_logger.Log(EVerbosity.Warning, $"PageManager.GetRetrieveVersion: Could not parse page for pageId={pageId}, version={versionId}, commit={commit.Sha}");
										errorCount++;
									}
								}
								else
								{
									_logger.Log(EVerbosity.Warning, $"PageManager.GetRetrieveVersion: Could not retrieve content for pageId={pageId}, version={versionId}, commit={commit.Sha}");
									errorCount++;
								}
							}
							catch (Exception commitEx)
							{
								_logger.Log(EVerbosity.Error, $"PageManager.GetRetrieveVersion: Error processing commit for pageId={pageId}, version={versionId}, commit={commit.Sha}: {commitEx.Message}");
								errorCount++;
							}
						}
						
						if (result == null)
						{
							_logger.Log(EVerbosity.Warning, $"PageManager.GetRetrieveVersion: Version={versionId} not found for pageId={pageId}, processed {commits.Count} commits with {errorCount} errors");
						}
					}
					else
					{
						_logger.Log(EVerbosity.Info, $"PageManager.GetRetrieveVersion: No commits found for pageId={pageId}, path={metadata.Path}");
					}
				}
				else
				{
					_logger.Log(EVerbosity.Warning, $"PageManager.GetRetrieveVersion: PageId={pageId} not found in cache");
				}
			}
			else
			{
				_logger.Log(EVerbosity.Warning, "PageManager.GetRetrieveVersion: PageId is null or empty");
			}

			return result;
		}

		// Helper method to create search result with excerpt and score
		private SearchResult CreateSearchResult(PageMetadata metadata, string content, string searchTerm)
		{
			// Calculate score (number of times search term appears)
			int score = 0;
			string excerpt = "";
			
			if (!string.IsNullOrWhiteSpace(searchTerm))
			{
				string lowerSearchTerm = searchTerm.ToLowerInvariant();
				string lowerContent = content.ToLowerInvariant();
				string lowerTitle = metadata.Title.ToLowerInvariant();
				string lowerPath = metadata.Path.ToLowerInvariant();
				
				// Count occurrences in content
				int contentIndex = 0;
				while ((contentIndex = lowerContent.IndexOf(lowerSearchTerm, contentIndex)) != -1)
				{
					score++;
					contentIndex += lowerSearchTerm.Length;
				}
				
				// Count occurrences in title (weighted more heavily)
				int titleIndex = 0;
				while ((titleIndex = lowerTitle.IndexOf(lowerSearchTerm, titleIndex)) != -1)
				{
					score += 3; // Title matches are worth 3x
					titleIndex += lowerSearchTerm.Length;
				}
				
				// Count occurrences in path
				int pathIndex = 0;
				while ((pathIndex = lowerPath.IndexOf(lowerSearchTerm, pathIndex)) != -1)
				{
					score += 2; // Path matches are worth 2x
					pathIndex += lowerSearchTerm.Length;
				}
				
				// Count occurrences in tags
				foreach (string tag in metadata.Tags)
				{
					string lowerTag = tag.ToLowerInvariant();
					if (lowerTag.Contains(lowerSearchTerm))
					{
						score += 2; // Tag matches are worth 2x
					}
				}
				
				// Create excerpt: 25 characters before + search term + 45 characters after
				int firstMatch = lowerContent.IndexOf(lowerSearchTerm);
				if (firstMatch >= 0)
				{
					int startPos = Math.Max(0, firstMatch - 25);
					int endPos = Math.Min(content.Length, firstMatch + lowerSearchTerm.Length + 45);
					
					excerpt = content.Substring(startPos, endPos - startPos);
					
					// Add ellipsis if we're not at the beginning/end
					if (startPos > 0) excerpt = "..." + excerpt;
					if (endPos < content.Length) excerpt = excerpt + "...";
				}
				else
				{
					// No match in content, use beginning of content as excerpt
					excerpt = content.Length > 70 ? content.Substring(0, 70) + "..." : content;
				}
			}
			else
			{
				// No search term, use beginning of content as excerpt
				excerpt = content.Length > 70 ? content.Substring(0, 70) + "..." : content;
			}
			
			return new SearchResult
			{
				Id = metadata.PageId,
				Title = metadata.Title,
				Path = metadata.Path,
				Excerpt = excerpt,
				Score = score
			};
		}
	}
}