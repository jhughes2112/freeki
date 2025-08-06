using Storage;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.IO;
using System.Diagnostics;
using System.Text;

namespace TestApp
{
	// Enhanced test result structure with detailed information
	public class TestResult
	{
		public string TestId { get; set; } = "";
		public string TestName { get; set; } = "";
		public string Category { get; set; } = "";
		public bool Passed { get; set; }
		public long ElapsedMs { get; set; }
		public string? ErrorMessage { get; set; }
		public string? ExpectedValue { get; set; }
		public string? ActualValue { get; set; }
		public Exception? Exception { get; set; }
		public string? AdditionalContext { get; set; }
		public DateTime StartTime { get; set; }
		public DateTime EndTime { get; set; }
		
		public string ToString(bool debugMode)
		{
			string status = Passed ? "PASS" : "FAIL";
			string timing = $"({ElapsedMs}ms)";
			
			if (Passed)
			{
				return $"{status} [{TestId}] {Category}: {TestName} {timing}";
			}
			else
			{
				StringBuilder sb = new StringBuilder();
				sb.AppendLine($"{status} [{TestId}] {Category}: {TestName} {timing}");
				sb.AppendLine($"    Error: {ErrorMessage}");
				
				if (!string.IsNullOrEmpty(ExpectedValue) && !string.IsNullOrEmpty(ActualValue))
				{
					sb.AppendLine($"    Expected: {ExpectedValue}");
					sb.AppendLine($"    Actual: {ActualValue}");
				}
				
				if (!string.IsNullOrEmpty(AdditionalContext))
				{
					sb.AppendLine($"    Context: {AdditionalContext}");
				}
				
				if (Exception != null)
				{
					sb.AppendLine($"    Exception: {Exception.GetType().Name}: {Exception.Message}");
					if (debugMode)
					{
						sb.AppendLine($"    Stack Trace: {Exception.StackTrace}");
					}
				}
				
				return sb.ToString().TrimEnd();
			}
		}
		
		public override string ToString()
		{
			return ToString(false);
		}
	}
	
	// Enhanced test runner with detailed tracking
	public class TestRunner
	{
		private List<TestResult> _results = new List<TestResult>();
		private int _testCounter = 1;
		private bool _debugMode = false;
		
		public TestRunner(bool debugMode = false)
		{
			_debugMode = debugMode;
		}
		
		public async Task<TestResult> RunTestAsync(string category, string testName, Func<Task<bool>> testAction, string? additionalContext = null)
		{
			string testId = $"T{_testCounter:D3}";
			_testCounter++;
			
			TestResult result = new TestResult
			{
				TestId = testId,
				TestName = testName,
				Category = category,
				StartTime = DateTime.Now,
				AdditionalContext = additionalContext
			};
			
			Stopwatch stopwatch = Stopwatch.StartNew();
			
			try
			{
				result.Passed = await testAction().ConfigureAwait(false);
				if (!result.Passed && string.IsNullOrEmpty(result.ErrorMessage))
				{
					result.ErrorMessage = "Test assertion failed";
				}
			}
			catch (Exception ex)
			{
				result.Passed = false;
				result.Exception = ex;
				result.ErrorMessage = $"Test threw exception: {ex.Message}";
			}
			
			stopwatch.Stop();
			result.ElapsedMs = stopwatch.ElapsedMilliseconds;
			result.EndTime = DateTime.Now;
			
			_results.Add(result);
			Console.WriteLine(result.ToString(_debugMode));
			
			return result;
		}
		
		public TestResult RunTest(string category, string testName, Func<bool> testAction, string? additionalContext = null)
		{
			string testId = $"T{_testCounter:D3}";
			_testCounter++;
			
			TestResult result = new TestResult
			{
				TestId = testId,
				TestName = testName,
				Category = category,
				StartTime = DateTime.Now,
				AdditionalContext = additionalContext
			};
			
			Stopwatch stopwatch = Stopwatch.StartNew();
			
			try
			{
				result.Passed = testAction();
				if (!result.Passed && string.IsNullOrEmpty(result.ErrorMessage))
				{
					result.ErrorMessage = "Test assertion failed";
				}
			}
			catch (Exception ex)
			{
				result.Passed = false;
				result.Exception = ex;
				result.ErrorMessage = $"Test threw exception: {ex.Message}";
			}
			
			stopwatch.Stop();
			result.ElapsedMs = stopwatch.ElapsedMilliseconds;
			result.EndTime = DateTime.Now;
			
			_results.Add(result);
			Console.WriteLine(result.ToString(_debugMode));
			
			return result;
		}
		
		public void AssertEqual<T>(TestResult result, T expected, T actual, string description)
		{
			if (!EqualityComparer<T>.Default.Equals(expected, actual))
			{
				result.Passed = false;
				result.ErrorMessage = $"Assertion failed: {description}";
				result.ExpectedValue = expected?.ToString() ?? "null";
				result.ActualValue = actual?.ToString() ?? "null";
			}
		}
		
		public void AssertNotNull<T>(TestResult result, T value, string description)
		{
			if (value == null)
			{
				result.Passed = false;
				result.ErrorMessage = $"Assertion failed: {description} - value was null";
				result.ExpectedValue = "not null";
				result.ActualValue = "null";
			}
		}
		
		public void AssertTrue(TestResult result, bool condition, string description)
		{
			if (!condition)
			{
				result.Passed = false;
				result.ErrorMessage = $"Assertion failed: {description}";
				result.ExpectedValue = "true";
				result.ActualValue = "false";
			}
		}
		
		public void PrintSummary()
		{
			Console.WriteLine("\n" + new string('=', 60));
			Console.WriteLine("=== DETAILED TEST SUMMARY ===");
			Console.WriteLine(new string('=', 60));
			
			Dictionary<string, (int total, int passed, long totalMs)> categories = new Dictionary<string, (int total, int passed, long totalMs)>();
			foreach (TestResult result in _results)
			{
				if (!categories.ContainsKey(result.Category))
					categories[result.Category] = (0, 0, 0);
				
				(int total, int passed, long totalMs) = categories[result.Category];
				categories[result.Category] = (total + 1, passed + (result.Passed ? 1 : 0), totalMs + result.ElapsedMs);
			}
			
			Console.WriteLine("\nRESULTS BY CATEGORY:");
			foreach (KeyValuePair<string, (int total, int passed, long totalMs)> kvp in categories)
			{
				(int total, int passed, long totalMs) = kvp.Value;
				double successRate = (passed * 100.0) / Math.Max(1, total);
				string status = passed == total ? "PASS" : "FAIL";
				Console.WriteLine($"  {status} {kvp.Key}: {passed}/{total} passed ({successRate:F1}%) - {totalMs}ms total");
			}
			
			Console.WriteLine($"\nOVERALL STATISTICS:");
			int totalTests = _results.Count;
			int totalPassed = 0;
			long totalTime = 0;
			foreach (TestResult result in _results)
			{
				if (result.Passed) totalPassed++;
				totalTime += result.ElapsedMs;
			}
			double overallSuccessRate = (totalPassed * 100.0) / Math.Max(1, totalTests);
			
			Console.WriteLine($"  Total Tests: {totalTests}");
			Console.WriteLine($"  Passed: {totalPassed}");
			Console.WriteLine($"  Failed: {totalTests - totalPassed}");
			Console.WriteLine($"  Success Rate: {overallSuccessRate:F1}%");
			Console.WriteLine($"  Total Time: {totalTime}ms ({totalTime / 1000.0:F2}s)");
			Console.WriteLine($"  Average Test Time: {(totalTime / Math.Max(1, totalTests)):F1}ms");
			
			if (totalPassed != totalTests)
			{
				Console.WriteLine("\nFAILED TESTS ANALYSIS:");
				List<TestResult> failedTests = new List<TestResult>();
				foreach (TestResult result in _results)
				{
					if (!result.Passed)
					{
						failedTests.Add(result);
					}
				}
				
				// Group failures by category
				Dictionary<string, List<TestResult>> failuresByCategory = new Dictionary<string, List<TestResult>>();
				foreach (TestResult failure in failedTests)
				{
					if (!failuresByCategory.ContainsKey(failure.Category))
					{
						failuresByCategory[failure.Category] = new List<TestResult>();
					}
					failuresByCategory[failure.Category].Add(failure);
				}
				
				foreach (KeyValuePair<string, List<TestResult>> group in failuresByCategory)
				{
					Console.WriteLine($"\n  {group.Key} Failures ({group.Value.Count}):");
					foreach (TestResult failure in group.Value)
					{
						Console.WriteLine($"    [{failure.TestId}] {failure.TestName}");
						Console.WriteLine($"      Error: {failure.ErrorMessage}");
						if (failure.Exception != null)
						{
							Console.WriteLine($"      Exception: {failure.Exception.GetType().Name}");
						}
					}
				}
				
				Console.WriteLine("\nDEBUGGING SUGGESTIONS:");
				
				// Analyze common failure patterns
				Dictionary<string, int> exceptionCounts = new Dictionary<string, int>();
				foreach (TestResult failure in failedTests)
				{
					if (failure.Exception != null)
					{
						string exceptionType = failure.Exception.GetType().Name;
						if (!exceptionCounts.ContainsKey(exceptionType))
						{
							exceptionCounts[exceptionType] = 0;
						}
						exceptionCounts[exceptionType]++;
					}
				}
				
				if (exceptionCounts.Count > 0)
				{
					Console.WriteLine("  Most common exceptions:");
					List<KeyValuePair<string, int>> sortedExceptions = new List<KeyValuePair<string, int>>(exceptionCounts);
					sortedExceptions.Sort((a, b) => b.Value.CompareTo(a.Value));
					
					int count = 0;
					foreach (KeyValuePair<string, int> exType in sortedExceptions)
					{
						if (count >= 3) break;
						Console.WriteLine($"    - {exType.Key} ({exType.Value} tests)");
						count++;
					}
				}
				
				// Check for timing issues
				List<TestResult> slowTests = new List<TestResult>();
				foreach (TestResult result in _results)
				{
					if (result.ElapsedMs > 1000)
					{
						slowTests.Add(result);
					}
				}
				
				if (slowTests.Count > 0)
				{
					slowTests.Sort((a, b) => b.ElapsedMs.CompareTo(a.ElapsedMs));
					Console.WriteLine("  Slow tests (>1s):");
					
					int count = 0;
					foreach (TestResult slowTest in slowTests)
					{
						if (count >= 3) break;
						Console.WriteLine($"    - [{slowTest.TestId}] {slowTest.TestName} ({slowTest.ElapsedMs}ms)");
						count++;
					}
				}
			}
			
			Console.WriteLine($"\n{(totalPassed == totalTests ? "ALL TESTS PASSED!" : "SOME TESTS FAILED!")}");
			Console.WriteLine($"Test execution completed at {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
			Console.WriteLine(new string('=', 60));
		}
		
		public List<TestResult> GetResults() => _results;
	}

	class TestProgram
	{
		private static bool          _debugMode  = false;
		private static TestRunner?   _testRunner = null;
		
		static async Task Main(string[] args)
		{
			// Parse command line arguments for debug mode
			if (args.Length > 0 && args[0].ToLowerInvariant() == "--debug")
			{
				_debugMode = true;
				Console.WriteLine("DEBUG MODE: Enhanced Diagnostics Enabled");
			}
			
			_testRunner = new TestRunner(_debugMode);
			
			Console.WriteLine("=== FreeKi Storage System Test Suite ===");
			Console.WriteLine($"Started at: {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
			
			// Environment information
			Console.WriteLine($"Environment: .NET {Environment.Version}");
			Console.WriteLine($"OS: {Environment.OSVersion}");
			Console.WriteLine($"Machine: {Environment.MachineName}");
			Console.WriteLine($"User: {Environment.UserName}");
			
			// Create test data folder and logger
			string testDataFolder = Path.Combine(Path.GetTempPath(), "freeki-test-" + Guid.NewGuid().ToString("N"));
			Logging.LoggingConsole logger = new Logging.LoggingConsole("Test", Logging.EVerbosity.Info);
			
			Console.WriteLine($"Test data folder: {testDataFolder}");
			if (_debugMode) Console.WriteLine("Debug mode: Verbose logging enabled");
			
			Stopwatch overallStopwatch = Stopwatch.StartNew();
			
			try
			{
				// Test Environment Setup Validation
				Console.WriteLine("\n=== ENVIRONMENT SETUP ===");
				await ValidateTestEnvironment(testDataFolder, logger);
				
				// Test 1: StorageFiles Basic Operations
				Console.WriteLine("\n=== TESTING STORAGEFILES ===");
				await TestStorageFiles(testDataFolder, logger);
				
				// Test 2: GitManager Operations
				Console.WriteLine("\n=== TESTING GITMANAGER ===");
				await TestGitManager(testDataFolder, logger);
				
				// Test 3: PageSerializer Operations
				Console.WriteLine("\n=== TESTING PAGESERIALIZER ===");
				TestPageSerializer();
				
				// Test 4: Advanced Test Suite (if available)
				Console.WriteLine("\n=== ADVANCED TESTS ===");
				await RunAdvancedTests(testDataFolder, logger);
				
				// Test 5: Git Round Trip Test
				Console.WriteLine("\n=== GIT ROUND TRIP TEST ===");
				await RunGitRoundTripTest(logger);
				
			}
			catch (Exception ex)
			{
				Console.WriteLine($"CRITICAL ERROR: Test execution failed with exception: {ex.Message}");
				Console.WriteLine($"Stack trace: {ex.StackTrace}");
				Environment.ExitCode = 1;
				return;
			}
			finally
			{
				overallStopwatch.Stop();
				
				// Cleanup test data
				try
				{
					if (Directory.Exists(testDataFolder))
					{
						Directory.Delete(testDataFolder, true);
						Console.WriteLine($"Cleaned up test data folder: {testDataFolder}");
					}
				}
				catch (Exception ex)
				{
					Console.WriteLine($"Warning: Failed to cleanup test data folder: {ex.Message}");
				}
			}
			
			// Print comprehensive summary
			_testRunner.PrintSummary();
			
			Console.WriteLine($"\nTotal execution time: {overallStopwatch.ElapsedMilliseconds}ms ({overallStopwatch.Elapsed.TotalSeconds:F2}s)");
			
			// Set exit code based on test results
			List<TestResult> results = _testRunner.GetResults();
			int failedCount = 0;
			foreach (TestResult result in results)
			{
				if (!result.Passed) failedCount++;
			}
			Environment.ExitCode = failedCount > 0 ? 1 : 0;
		}
		
		static async Task ValidateTestEnvironment(string testDataFolder, Logging.ILogging logger)
		{
			await _testRunner!.RunTestAsync("Environment", "Test data folder creation", () =>
			{
				Directory.CreateDirectory(testDataFolder);
				return Task.FromResult(Directory.Exists(testDataFolder));
			}, $"Folder: {testDataFolder}");
			
			await _testRunner.RunTestAsync("Environment", "Logger initialization", () =>
			{
				return Task.FromResult(logger != null);
			}, "LoggingConsole with Info verbosity");
			
			await _testRunner.RunTestAsync("Environment", "Temporary directory access", async () =>
			{
				string tempFile = Path.Combine(testDataFolder, "test-access.tmp");
				await File.WriteAllTextAsync(tempFile, "test");
				bool canRead = File.Exists(tempFile);
				File.Delete(tempFile);
				return canRead;
			}, "Read/write permissions check");
		}
		
		static async Task TestStorageFiles(string testDataFolder, Logging.ILogging logger)
		{
			StorageFiles? pageStorage = null;
			StorageFiles? mediaStorage = null;
			
			try
			{
				// Create the directory structure that matches the server setup
				string pagesFolder = Path.Combine(testDataFolder, "pages");
				string mediaFolder = Path.Combine(testDataFolder, "media");
				Directory.CreateDirectory(pagesFolder);
				Directory.CreateDirectory(mediaFolder);
				
				// Initialize storage with subdirectories (matching server setup)
				TestResult pageInitResult = await _testRunner!.RunTestAsync("StorageFiles", "Page storage initialization", () =>
				{
					pageStorage = new StorageFiles(pagesFolder, logger);
					return Task.FromResult(pageStorage != null);
				}, $"Pages folder: {pagesFolder}");
				
				TestResult mediaInitResult = await _testRunner.RunTestAsync("StorageFiles", "Media storage initialization", () =>
				{
					mediaStorage = new StorageFiles(mediaFolder, logger);
					return Task.FromResult(mediaStorage != null);
				}, $"Media folder: {mediaFolder}");
				
				if (!pageInitResult.Passed || pageStorage == null || !mediaInitResult.Passed || mediaStorage == null)
				{
					Console.WriteLine("StorageFiles initialization failed - skipping remaining tests");
					return;
				}
				
				// Test pages and media storage separately to match server architecture
				await TestPageStorage(pageStorage);
				await TestMediaStorage(mediaStorage);
				await TestStorageIsolation(pageStorage, mediaStorage);
			}
			finally
			{
				pageStorage?.Dispose();
				mediaStorage?.Dispose();
			}
		}
		
		static async Task TestPageStorage(StorageFiles pageStorage)
		{
			// Test 1: Write and Read page storage
			await _testRunner!.RunTestAsync("StorageFiles", "Page storage write/read operation", async () =>
			{
				string key1 = "test1.txt";
				byte[] data1 = System.Text.Encoding.UTF8.GetBytes("Hello, World!");
				bool writeResult = await pageStorage.Write(key1, data1).ConfigureAwait(false);
				byte[]? readData = await pageStorage.Read(key1).ConfigureAwait(false);
				
				if (!writeResult)
					return false;
				if (readData == null)
					return false;
				if (!ByteArraysEqual(data1, readData))
					return false;
				
				return true;
			}, "Key: test1.txt, Data: 'Hello, World!'");
			
			// Test 2: GetFileInfo method test
			await _testRunner.RunTestAsync("StorageFiles", "GetFileInfo method returns size and timestamp", async () =>
			{
				string key1 = "test1.txt";
				(long fileSize, long lastModified) = await pageStorage.GetFileInfo(key1).ConfigureAwait(false);
				
				// Simple contract: if file doesn't exist, both should be zero
				if (fileSize == 0 && lastModified == 0)
					return false;  // File should exist but GetFileInfo says it doesn't
				
				// If file exists, lastModified should be non-zero, fileSize can be zero (empty file is legal)
				return lastModified > 0 && fileSize >= 0;
			}, "Testing GetFileInfo returns non-zero timestamp for existing file");
		}
		
		static async Task TestMediaStorage(StorageFiles mediaStorage)
		{
			// Test binary media storage with PNG data
			await _testRunner!.RunTestAsync("StorageFiles", "Media storage binary write/read", async () =>
			{
				string key1 = "test-image.png";
				byte[] pngData = {
					0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
					0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
					0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
					0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
					0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x37, 0x6E, 0xF9, 0x24, 0x00,
					0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
				};
				bool writeResult = await mediaStorage.Write(key1, pngData).ConfigureAwait(false);
				byte[]? readData = await mediaStorage.Read(key1).ConfigureAwait(false);
				
				if (!writeResult)
					return false;
				if (readData == null)
					return false;
				if (!ByteArraysEqual(pngData, readData))
					return false;
				
				return true;
			}, "Binary PNG data storage test");
		}
		
		static async Task TestStorageIsolation(StorageFiles pageStorage, StorageFiles mediaStorage)
		{
			// Test storage isolation
			await _testRunner!.RunTestAsync("StorageFiles", "Storage isolation verification", async () =>
			{
				List<string> pageKeys = await pageStorage.ListAllKeys().ConfigureAwait(false);
				List<string> mediaKeys = await mediaStorage.ListAllKeys().ConfigureAwait(false);
				
				// Pages should not see media files and vice versa
				bool pagesDontSeeMedia = !pageKeys.Contains("test-image.png");
				bool mediaDontSeePages = !mediaKeys.Contains("test1.txt");
				
				return pagesDontSeeMedia && mediaDontSeePages;
			}, "Ensuring page and media storages are properly isolated");
		}
		
		static async Task TestGitManager(string testDataFolder, Logging.ILogging logger)
		{
			GitManager? gitManager = null;
			StorageFiles? pageStorage = null;
			
			try
			{
				// Create the directory structure that matches the server setup
				string pagesFolder = Path.Combine(testDataFolder, "pages");
				Directory.CreateDirectory(pagesFolder);
				
				// Initialize GitManager at the root (like the server does)
				TestResult initResult = await _testRunner!.RunTestAsync("GitManager", "Git repository initialization", () =>
				{
					gitManager = Utilities.CommandLineHelpersServer.CreateGitManager(testDataFolder, "", logger);
					return Task.FromResult(gitManager != null);
				}, $"Repository root: {testDataFolder} (working repo, not bare)");
				
				// Initialize page storage in subdirectory (like the server does)
				TestResult storageResult = await _testRunner.RunTestAsync("GitManager", "Page storage initialization for git test", () =>
				{
					pageStorage = new StorageFiles(pagesFolder, logger);
					return Task.FromResult(pageStorage != null);
				}, $"Pages folder: {pagesFolder}");
				
				if (!initResult.Passed || gitManager == null || !storageResult.Passed || pageStorage == null)
				{
					Console.WriteLine("GitManager or PageStorage initialization failed - skipping remaining tests");
					return;
				}
				
				// Test commit file - store in pages subdirectory but commit to root git repo
				string? commitSha = null;
				await _testRunner.RunTestAsync("GitManager", "Commit file operation with subdirectory", async () =>
				{
					string filename = "pages/test-git-file.txt";  // Include subdirectory in git path
					byte[] content = System.Text.Encoding.UTF8.GetBytes("Git test content");
					
					// First write to storage (which handles the pages subdirectory)
					bool storageWrite = await pageStorage.Write("test-git-file.txt", content).ConfigureAwait(false);
					if (!storageWrite)
						return false;
					
					// Then commit via git manager (which sees the full repo structure)
					commitSha = await gitManager.CommitFile(filename, content, "Test Author", "test@example.com", "Test commit").ConfigureAwait(false);
					
					List<TestResult> allResults = _testRunner.GetResults();
					TestResult result = allResults[allResults.Count - 1];
					_testRunner.AssertNotNull(result, commitSha, "Commit should return a SHA");
					_testRunner.AssertTrue(result, !string.IsNullOrEmpty(commitSha), "SHA should not be empty");
					
					return result.Passed;
				}, "File: pages/test-git-file.txt, Author: Test Author");
				
				// Test retrieve commits with subdirectory path
				if (!string.IsNullOrEmpty(commitSha))
				{
					await _testRunner.RunTestAsync("GitManager", "Retrieve commits with subdirectory", () =>
					{
						string filename = "pages/test-git-file.txt";  // Full path for git
						List<CommitInfo> commits = gitManager.RetrieveCommits(filename);
						
						List<TestResult> allResults = _testRunner.GetResults();
						TestResult result = allResults[allResults.Count - 1];
						_testRunner.AssertTrue(result, commits.Count > 0, "Should retrieve at least one commit");
						if (commits.Count > 0)
						{
							_testRunner.AssertEqual(result, commitSha, commits[0].Sha, "First commit SHA should match");
						}
						
						return Task.FromResult(result.Passed);
					}, $"Expected SHA: {commitSha}");
					
					// Test retrieve file content from git
					await _testRunner.RunTestAsync("GitManager", "Retrieve file content from git", () =>
					{
						string filename = "pages/test-git-file.txt";
						byte[]? retrievedContent = gitManager.RetrieveFile(filename, commitSha);
						
						List<TestResult> allResults = _testRunner.GetResults();
						TestResult result = allResults[allResults.Count - 1];
						_testRunner.AssertNotNull(result, retrievedContent, "Should retrieve file content");
						if (retrievedContent != null)
						{
							string retrievedText = System.Text.Encoding.UTF8.GetString(retrievedContent);
							_testRunner.AssertEqual(result, "Git test content", retrievedText, "Content should match");
						}
						
						return Task.FromResult(result.Passed);
					}, "Verifying git file retrieval matches original content");
				}
				else
				{
					Console.WriteLine("Skipping commit retrieval tests - no commit SHA available");
				}
				
			}
			finally
			{
				pageStorage?.Dispose();
				gitManager?.Dispose();
			}
		}
		
		static void TestPageSerializer()
		{
			PageSerializer serializer = new PageSerializer();
			
			// Test 1: Basic serialization/deserialization
			_testRunner!.RunTest("PageSerializer", "Basic serialization/deserialization", () =>
			{
				List<string> tags = new List<string> { "test", "serialization" };
				PageMetadata metadata = new PageMetadata("test-page", tags, "Test Page", PageMetadata.Now, 1, "test.txt", 0.0);
				Page originalPage = new Page(metadata, "# Test Content\n\nThis is test content.");
				
				byte[] serializedData = serializer.Serialize(originalPage);
				Page? deserializedPage = serializer.Deserialize(serializedData);
				
				List<TestResult> allResults = _testRunner.GetResults();
				TestResult result = allResults[allResults.Count - 1];
				_testRunner.AssertNotNull(result, deserializedPage, "Deserialization should succeed");
				if (deserializedPage != null)
				{
					_testRunner.AssertEqual(result, originalPage.Metadata.PageId, deserializedPage.Metadata.PageId, "Page ID should match");
					_testRunner.AssertEqual(result, originalPage.Metadata.Title, deserializedPage.Metadata.Title, "Title should match");
					_testRunner.AssertEqual(result, originalPage.Content, deserializedPage.Content, "Content should match");
					_testRunner.AssertEqual(result, originalPage.Metadata.Version, deserializedPage.Metadata.Version, "Version should match");
				}
				
				return result.Passed;
			}, "Page ID: test-page, Version: 1");
			
			// Test 2: Metadata-only deserialization
			_testRunner.RunTest("PageSerializer", "Metadata-only deserialization", () =>
			{
				List<string> tags = new List<string> { "test", "serialization" };
				PageMetadata metadata = new PageMetadata("test-page", tags, "Test Page", PageMetadata.Now, 1, "test.txt", 0.0);
				Page originalPage = new Page(metadata, "# Test Content\n\nThis is test content.");
				
				byte[] serializedData = serializer.Serialize(originalPage);
				PageMetadata? metadataOnly = serializer.DeserializeMetadataOnly(serializedData);
				
				List<TestResult> allResults = _testRunner.GetResults();
				TestResult result = allResults[allResults.Count - 1];
				_testRunner.AssertNotNull(result, metadataOnly, "Metadata deserialization should succeed");
				if (metadataOnly != null)
				{
					_testRunner.AssertEqual(result, originalPage.Metadata.PageId, metadataOnly.PageId, "Page ID should match");
					_testRunner.AssertEqual(result, originalPage.Metadata.Title, metadataOnly.Title, "Title should match");
					_testRunner.AssertEqual(result, originalPage.Metadata.Version, metadataOnly.Version, "Version should match");
				}
				
				return result.Passed;
			}, "Extracting metadata without full content");
		}
		
		static async Task RunAdvancedTests(string testDataFolder, Logging.ILogging logger)
		{
			try
			{
				// Check if AdvancedTestSuite is available
				Type advancedType = typeof(AdvancedTestSuite);
				if (advancedType != null)
				{
					Console.WriteLine("Running advanced test suite...");
					
					// Run concurrent operations test
					await _testRunner!.RunTestAsync("Advanced", "Concurrent operations test", async () =>
					{
						(int total, int passed) = await AdvancedTestSuite.TestConcurrentOperations(testDataFolder, logger).ConfigureAwait(false);
						
						List<TestResult> allResults = _testRunner.GetResults();
						TestResult result = allResults[allResults.Count - 1];
						result.AdditionalContext = $"Sub-tests: {passed}/{total} passed";
						
						return passed == total;
					}, "Testing concurrent read/write operations");
					
					// Run edge cases test
					await _testRunner.RunTestAsync("Advanced", "Edge cases test", async () =>
					{
						(int total, int passed) = await AdvancedTestSuite.TestEdgeCases(testDataFolder, logger).ConfigureAwait(false);
						
						List<TestResult> allResults = _testRunner.GetResults();
						TestResult result = allResults[allResults.Count - 1];
						result.AdditionalContext = $"Sub-tests: {passed}/{total} passed";
						
						return passed == total;
					}, "Testing error conditions and edge cases");
					
					// Run Git remote operations test
					await _testRunner.RunTestAsync("Advanced", "Git remote operations test", async () =>
					{
						(int total, int passed) = await AdvancedTestSuite.TestGitRemoteOperations(testDataFolder, logger).ConfigureAwait(false);
						
						List<TestResult> allResults = _testRunner.GetResults();
						TestResult result = allResults[allResults.Count - 1];
						result.AdditionalContext = $"Sub-tests: {passed}/{total} passed";
						
					 return passed == total;
					}, "Testing Git remote configuration and operations");
					
					// Run performance and stress test
					await _testRunner.RunTestAsync("Advanced", "Performance and stress test", async () =>
					{
						(int total, int passed) = await AdvancedTestSuite.TestPerformanceAndStress(testDataFolder, logger).ConfigureAwait(false);
						
						List<TestResult> allResults = _testRunner.GetResults();
						TestResult result = allResults[allResults.Count - 1];
						result.AdditionalContext = $"Sub-tests: {passed}/{total} passed";
						
						return passed == total;
					}, "Testing performance under stress conditions");
				}
			}
			catch (Exception ex)
			{
				Console.WriteLine($"Advanced tests failed to run: {ex.Message}");
			}
		}
		
		static bool ByteArraysEqual(byte[] a, byte[] b)
		{
			if (a.Length != b.Length) return false;
			for (int i = 0; i < a.Length; i++)
			{
				if (a[i] != b[i]) return false;
			}
			return true;
		}

		static async Task RunGitRoundTripTest(Logging.ILogging logger)
		{
			try
			{
				await _testRunner!.RunTestAsync("GitRoundTrip", "Git round trip with local bare repo", async () =>
				{
					(int total, int passed) = await AdvancedTestSuite.TestGitRoundTrip(logger).ConfigureAwait(false);
					
					List<TestResult> allResults = _testRunner.GetResults();
					TestResult result = allResults[allResults.Count - 1];
					result.AdditionalContext = $"Sub-tests: {passed}/{total} passed";
					
					return passed == total;
				}, "Testing Git push/pull round trip with D:\\Github\\freeki-data");
			}
			catch (Exception ex)
			{
				Console.WriteLine($"Git round trip test failed to run: {ex.Message}");
			}
		}
	}
}