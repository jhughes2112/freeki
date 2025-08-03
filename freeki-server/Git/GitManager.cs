using FreeKi;
using LibGit2Sharp;
using Logging;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace Storage
{
	// Manages Git operations for version control of files
	public class GitManager : IDisposable
	{
		private readonly string     _repositoryPath;
		private readonly ILogging   _logger;
		private readonly string     _remoteUrl;
		private readonly string     _username;
		private readonly string     _password;
		private readonly string     _branch;
		private Repository          _repository;

		public GitManager(string repositoryPath, ILogging logger, string remoteUrl, string username, string password, string branch)
		{
			_repositoryPath = repositoryPath;
			_logger         = logger;
			_remoteUrl      = remoteUrl;
			_username       = username;
			_password       = password;
			_branch         = branch;
			
			// Try to clone remote first if we have a remote URL and no local repo exists
			if (!string.IsNullOrEmpty(_remoteUrl) && !Repository.IsValid(_repositoryPath) && TryCloneFromRemote())
			{
				// successfully cloned, no need to initialize the folder
				_logger.Log(EVerbosity.Info, $"GitManager: Cloned remote repository to {_repositoryPath}");
			}
			else if (Repository.IsValid(_repositoryPath) == false)  
			{
				// Initialize a new Git repository or open an existing one
				_logger.Log(EVerbosity.Info, $"GitManager: Initializing new repository at {_repositoryPath}");
				Repository.Init(_repositoryPath, false);
			}
			else
			{
				_logger.Log(EVerbosity.Info, $"GitManager: Opening existing repository at {_repositoryPath}");
			}
			
			_repository = new Repository(_repositoryPath);
			
			// Add or remote all remotes based on _remoteUrl
			SetupRemote(_remoteUrl);
			
			// Ensure we have the desired branch with at least one commit
			EnsureBranchExists();
			
			// Always try to push to establish/update the remote branch
			PushToRemote();
		}

		private FetchOptions MakeFetchOptions()
		{
			FetchOptions fo = new FetchOptions();
			
			// Add credentials if available
			if (!string.IsNullOrEmpty(_username) && !string.IsNullOrEmpty(_password))
			{
				fo.CredentialsProvider = (url, usernameFromUrl, types) =>
					new UsernamePasswordCredentials
					{
						Username = _username,
						Password = _password
					};
			}
			
			return fo;
		}

		// Try to clone the remote repository
		private bool TryCloneFromRemote()
		{
			try
			{
				CloneOptions cloneOptions = new CloneOptions(MakeFetchOptions());
				cloneOptions.BranchName = _branch;
				cloneOptions.Checkout = true;
				
				_logger.Log(EVerbosity.Info, $"GitManager: Attempting to clone from {_remoteUrl}");
				Repository.Clone(_remoteUrl, _repositoryPath, cloneOptions);
				_logger.Log(EVerbosity.Info, $"GitManager: Successfully cloned repository from {_remoteUrl}");
				return true;
			}
			catch (Exception ex)
			{
				_logger.Log(EVerbosity.Info, $"GitManager: Clone failed (expected for new/empty remotes): {ex.Message}");
				return false;
			}
		}

		// Ensure the desired branch exists and has at least one commit
		private void EnsureBranchExists()
		{
			// Check if the desired branch exists
			Branch? targetBranch = _repository.Branches[_branch];
			
			if (targetBranch != null)
			{
				// Branch exists, check out to it if not already
				if (_repository.Head.FriendlyName != _branch)
				{
					Commands.Checkout(_repository, targetBranch);
					_logger.Log(EVerbosity.Info, $"GitManager: Checked out to existing branch '{_branch}'");
				}
			}
			else
			{
				// Branch doesn't exist, we need to create it
				// First ensure we have at least one commit in the repository
				if (_repository.Head.Tip == null)
				{
					CreateInitialCommit();
				}
				
				// Now create the branch
				targetBranch = _repository.CreateBranch(_branch);
				Commands.Checkout(_repository, targetBranch);
				_logger.Log(EVerbosity.Info, $"GitManager: Created and checked out new branch '{_branch}'");
			}
		}

		// Create an initial commit to establish the repository
		private void CreateInitialCommit()
		{
			try
			{
				// Create a .gitkeep file to have something to commit
				string gitkeepPath = Path.Combine(_repositoryPath, ".gitkeep");
				File.WriteAllText(gitkeepPath, "# This file ensures the repository has an initial commit\n");
				
				// Stage the file
				Commands.Stage(_repository, ".gitkeep");
				
				// Create initial commit
				Signature signature = new Signature(FreeKiServer.kSystemUserName, FreeKiServer.kSystemUserEmail, DateTimeOffset.Now);
				_repository.Commit("Initial commit", signature, signature);
				
				_logger.Log(EVerbosity.Info, "GitManager: Created initial commit for new repository");
			}
			catch (Exception ex)
			{
				_logger.Log(EVerbosity.Warning, $"GitManager: Failed to create initial commit: {ex.Message}");
			}
		}

		// Set up remote repository configuration, whether adding, updating, or removing
		private void SetupRemote(string remoteUrl)
		{
			try
			{
				const string remoteName = "origin";
				
				// Check if remote already exists
				Remote? existingRemote = null;
				foreach (Remote remote in _repository.Network.Remotes)
				{
					if (remote.Name == remoteName)
					{
						existingRemote = remote;
						break;
					}
				}

				if (string.IsNullOrEmpty(remoteUrl))
				{
					if (existingRemote!=null)
					{
						_repository.Network.Remotes.Remove(existingRemote.Name);
						_logger.Log(EVerbosity.Info, "GitManager: Remote URL is empty, removing remote from repo");
					}
				}
				else
				{
					// Add or update remote
					if (existingRemote == null)
					{
						_repository.Network.Remotes.Add(remoteName, _remoteUrl);
						_logger.Log(EVerbosity.Info, $"GitManager: Added remote '{remoteName}' -> {_remoteUrl}");
					}
					else if (existingRemote.Url != _remoteUrl)
					{
						_repository.Network.Remotes.Update(remoteName, r => r.Url = _remoteUrl);
						_logger.Log(EVerbosity.Info, $"GitManager: Updated remote '{remoteName}' -> {_remoteUrl}");
					}
				}
			}
			catch (Exception ex)
			{
				_logger.Log(EVerbosity.Warning, $"GitManager: Failed to setup remote: {ex.Message}");
			}
		}

		// Pull latest changes from remote repository
		public bool PullFromRemote()
		{
			if (string.IsNullOrEmpty(_remoteUrl))
			{
				_logger.Log(EVerbosity.Error, "GitManager: No remote URL configured for pull operation");
				return false;
			}

			try
			{
				var signature = new Signature(FreeKiServer.kSystemUserName, FreeKiServer.kSystemUserEmail, DateTimeOffset.Now);
				
				var pullOptions = new PullOptions { FetchOptions = MakeFetchOptions() };
				pullOptions.MergeOptions = new MergeOptions { FastForwardStrategy = FastForwardStrategy.FastForwardOnly };

				MergeResult result = Commands.Pull(_repository, signature, pullOptions);
				
				_logger.Log(EVerbosity.Info, $"GitManager: Pull completed with status: {result.Status}");
				return result.Status == MergeStatus.UpToDate || result.Status == MergeStatus.FastForward || result.Status == MergeStatus.NonFastForward;
			}
			catch (Exception ex)
			{
				_logger.Log(EVerbosity.Error, $"GitManager: Pull failed: {ex.Message}");
				return false;
			}
		}

		// Push local changes to remote repository
		public bool PushToRemote()
		{
			if (string.IsNullOrEmpty(_remoteUrl))
			{
				_logger.Log(EVerbosity.Warning, "GitManager: No remote URL configured for push operation");
				return false;
			}

			try
			{
				const string remoteName = "origin";
				var remote = _repository.Network.Remotes[remoteName];
				if (remote == null)
				{
					_logger.Log(EVerbosity.Error, $"GitManager: Remote '{remoteName}' not found");
					return false;
				}

				var branch = _repository.Branches[_branch] ?? _repository.Head;
				if (branch == null)
				{
					_logger.Log(EVerbosity.Error, $"GitManager: Branch '{_branch}' not found");
					return false;
				}

				var pushOptions = new PushOptions();
				pushOptions.CredentialsProvider = MakeFetchOptions().CredentialsProvider;

				try
				{
					// Try to push the branch
					_repository.Network.Push(branch, pushOptions);
					_logger.Log(EVerbosity.Info, $"GitManager: Successfully pushed to remote '{remoteName}'");
					return true;
				}
				catch (LibGit2SharpException ex) when (ex.Message.Contains("does not track an upstream branch"))
				{
					// If the branch doesn't track upstream, set up tracking and try again
					_logger.Log(EVerbosity.Info, $"GitManager: Setting up upstream tracking for branch '{branch.FriendlyName}'");
					
					// Create refspec for tracking
					string refspec = $"refs/heads/{branch.FriendlyName}:refs/heads/{branch.FriendlyName}";
					
					try
					{
						_repository.Network.Push(remote, refspec, pushOptions);
						_logger.Log(EVerbosity.Info, $"GitManager: Successfully pushed with upstream tracking to remote '{remoteName}'");
						return true;
					}
					catch (Exception innerEx)
					{
						_logger.Log(EVerbosity.Error, $"GitManager: Push with upstream tracking failed: {innerEx.Message}");
						return false;
					}
				}
			}
			catch (Exception ex)
			{
				_logger.Log(EVerbosity.Error, $"GitManager: Push failed: {ex.Message}");
				return false;
			}
		}

		// Helper method to determine if an exception is a Git busy/lock error
		private static bool IsGitBusyError(Exception ex)
		{
			string message = ex.Message?.ToLowerInvariant() ?? "";
			return message.Contains("failed to lock file") || 
			       message.Contains("old reference value does not match") ||
			       message.Contains("unable to create") ||
			       message.Contains("resource temporarily unavailable");
		}

		// Commit a single file to the repository with specified author information
		public async Task<string?> CommitFile(string filename, byte[] fileContent, string authorName, string authorEmail, string commitMessage)
		{
			string? result = null;

			if (!string.IsNullOrWhiteSpace(filename) && 
				fileContent != null && 
				!string.IsNullOrWhiteSpace(authorName) && 
				!string.IsNullOrWhiteSpace(authorEmail))
			{
				string filePath = Path.Combine(_repositoryPath, filename);
				
				// Ensure directory exists
				string? directory = Path.GetDirectoryName(filePath);
				if (!string.IsNullOrEmpty(directory))
				{
					Directory.CreateDirectory(directory);
				}

				// Write the file content
				await File.WriteAllBytesAsync(filePath, fileContent).ConfigureAwait(false);

				// Stage the file with retry logic
				const int maxRetries = 5;
				const int baseDelayMs = 100;
				bool staged = false;
				
				for (int attempt = 0; attempt < maxRetries; attempt++)
				{
					try
					{
						Commands.Stage(_repository, filename);
						staged = true;
						break;
					}
					catch (Exception ex) when (IsGitBusyError(ex))
					{
						if (attempt == maxRetries - 1)
						{
							_logger.Log(EVerbosity.Warning, $"GitManager: Failed to stage {filename} after {maxRetries} attempts: {ex.Message}");
							throw;
						}
						
						int delayMs = baseDelayMs * (int)Math.Pow(2, attempt); // Exponential backoff
						_logger.Log(EVerbosity.Debug, $"GitManager: Git busy, retrying stage operation in {delayMs}ms (attempt {attempt + 1}/{maxRetries})");
						await Task.Delay(delayMs).ConfigureAwait(false);
					}
				}

				if (staged)
				{
					// Check if there are any changes to commit
					RepositoryStatus status = _repository.RetrieveStatus();
					if (status.IsDirty)
					{
						// Create signature for author
						Signature author    = new Signature(authorName, authorEmail, DateTimeOffset.Now);
						Signature committer = author; // Use same person as committer

						// Commit with retry logic
						for (int attempt = 0; attempt < maxRetries; attempt++)
						{
							try
							{
								Commit commit = _repository.Commit(commitMessage, author, committer);
								_logger.Log(EVerbosity.Info, $"GitManager: Committed file {filename} with SHA {commit.Sha}");
								result = commit.Sha;
								break;
							}
							catch (Exception ex) when (IsGitBusyError(ex))
							{
								if (attempt == maxRetries - 1)
								{
									_logger.Log(EVerbosity.Warning, $"GitManager: Failed to commit {filename} after {maxRetries} attempts: {ex.Message}");
									throw;
								}
								
								int delayMs = baseDelayMs * (int)Math.Pow(2, attempt); // Exponential backoff
								_logger.Log(EVerbosity.Debug, $"GitManager: Git busy, retrying commit operation in {delayMs}ms (attempt {attempt + 1}/{maxRetries})");
								await Task.Delay(delayMs).ConfigureAwait(false);
							}
						}
					}
					else
					{
						_logger.Log(EVerbosity.Info, $"GitManager: No changes to commit for file {filename}");
					}
				}
			}
			else
			{
				// Handle parameter validation errors
				if (string.IsNullOrWhiteSpace(filename))
				{
					_logger.Log(EVerbosity.Error, "GitManager: Filename cannot be null or empty");
				}
				else if (fileContent == null)
				{
					_logger.Log(EVerbosity.Error, "GitManager: File content cannot be null");
				}
				else if (string.IsNullOrWhiteSpace(authorName) || string.IsNullOrWhiteSpace(authorEmail))
				{
					_logger.Log(EVerbosity.Error, "GitManager: Author name and email are required");
				}
			}

			return result;
		}

		// Retrieve all commits that affected a specific file
		public List<CommitInfo> RetrieveCommits(string filename)
		{
			List<CommitInfo> commits = new List<CommitInfo>();

			if (!string.IsNullOrWhiteSpace(filename))
			{
				// Get commits that affected this file without using LINQ
				IEnumerable<LogEntry> logEntries = _repository.Commits.QueryBy(filename);
				
				foreach (LogEntry logEntry in logEntries)
				{
					CommitInfo commitInfo = new CommitInfo
					{
						Sha            = logEntry.Commit.Sha,
						Message        = logEntry.Commit.Message,
						AuthorName     = logEntry.Commit.Author.Name,
						AuthorEmail    = logEntry.Commit.Author.Email,
						AuthorDate     = logEntry.Commit.Author.When,
						CommitterName  = logEntry.Commit.Committer.Name,
						CommitterEmail = logEntry.Commit.Committer.Email,
						CommitterDate  = logEntry.Commit.Committer.When
					};
					commits.Add(commitInfo);
				}

				// Sort by date descending (newest first) without using LINQ
				commits.Sort((a, b) => b.AuthorDate.CompareTo(a.AuthorDate));

				_logger.Log(EVerbosity.Debug, $"GitManager: Found {commits.Count} commits for file {filename}");
			}
			else
			{
				_logger.Log(EVerbosity.Error, "GitManager: Filename cannot be null or empty");
			}

			return commits;
		}

		// Retrieve the content of a file at a specific commit
		public byte[]? RetrieveFile(string filename, string commitSha)
		{
			byte[]? result = null;

			if (!string.IsNullOrWhiteSpace(filename) && !string.IsNullOrWhiteSpace(commitSha))
			{
				// Get the commit
				Commit? commit = _repository.Lookup<Commit>(commitSha);
				if (commit != null)
				{
					// Get the tree entry for the file
					TreeEntry? treeEntry = commit.Tree[filename];
					if (treeEntry != null)
					{
						// Verify it's a blob (file) and not a directory
						if (treeEntry.TargetType == TreeEntryTargetType.Blob)
						{
							// Get the blob content
							Blob blob = (Blob)treeEntry.Target;
							using (Stream stream = blob.GetContentStream())
							using (MemoryStream memoryStream = new MemoryStream())
							{
								stream.CopyTo(memoryStream);
								result = memoryStream.ToArray();
								_logger.Log(EVerbosity.Debug, $"GitManager: Retrieved {result.Length} bytes for file {filename} from commit {commitSha}");
							}
						}
						else
						{
							_logger.Log(EVerbosity.Warning, $"GitManager: {filename} is not a file in commit {commitSha}");
						}
					}
					else
					{
						_logger.Log(EVerbosity.Warning, $"GitManager: File {filename} not found in commit {commitSha}");
					}
				}
				else
				{
					_logger.Log(EVerbosity.Warning, $"GitManager: Commit {commitSha} not found");
				}
			}
			else
			{
				// Handle validation errors
				if (string.IsNullOrWhiteSpace(filename))
				{
					_logger.Log(EVerbosity.Error, "GitManager: Filename cannot be null or empty");
				}
				else if (string.IsNullOrWhiteSpace(commitSha))
				{
					_logger.Log(EVerbosity.Error, "GitManager: Commit SHA cannot be null or empty");
				}
			}

			return result;
		}

		// Get the current repository status
		public string GetRepositoryStatus()
		{
			string result;

			RepositoryStatus status = _repository.RetrieveStatus();
			int added = 0;
			int modified = 0;
			int removed = 0;
			int untracked = 0;

			foreach (StatusEntry entry in status)
			{
				if ((entry.State & FileStatus.NewInIndex) != 0)
					added++;
				if ((entry.State & FileStatus.ModifiedInIndex) != 0)
					modified++;
				if ((entry.State & FileStatus.DeletedFromIndex) != 0)
					removed++;
				if ((entry.State & FileStatus.NewInWorkdir) != 0)
					untracked++;
			}

			result = $"Added: {added}, Modified: {modified}, Removed: {removed}, Untracked: {untracked}";

			return result;
		}

		public void Dispose()
		{
			_logger.Log(EVerbosity.Debug, "GitManager: Disposing repository");
			_repository.Dispose();
		}
	}

	// Information about a Git commit
	public class CommitInfo
	{
		public string         Sha            { get; set; } = string.Empty;
		public string         Message        { get; set; } = string.Empty;
		public string         AuthorName     { get; set; } = string.Empty;
		public string         AuthorEmail    { get; set; } = string.Empty;
		public DateTimeOffset AuthorDate     { get; set; }
		public string         CommitterName  { get; set; } = string.Empty;
		public string         CommitterEmail { get; set; } = string.Empty;
		public DateTimeOffset CommitterDate  { get; set; }
	}
}