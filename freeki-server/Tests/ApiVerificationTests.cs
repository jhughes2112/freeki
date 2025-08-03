using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace FreeKi
{
	// Enhanced API verification test program to validate Pages and Media endpoints
	public static class ApiVerificationTests
	{
		private static readonly HttpClient _httpClient = new HttpClient();
		private static string _baseUrl = "http://localhost:7777";
		private static string _authToken = "testuser<->Test User<->test@example.com<->Admin";

		// Simple test result tracking
		private static int _totalTests = 0;
		private static int _passedTests = 0;
		private static List<string> _failedTests = new List<string>();

		public static async Task RunAllTests()
		{
			Console.WriteLine("=== FreeKi Enhanced API Verification Tests ===");
			Console.WriteLine($"Testing against: {_baseUrl}");
			Console.WriteLine($"Authentication: {_authToken.Split('<')[0]}...");
			Console.WriteLine();

			// Set up authentication header with timeout
			_httpClient.DefaultRequestHeaders.Clear();
			_httpClient.DefaultRequestHeaders.Add("Authorization", _authToken);
			_httpClient.Timeout = TimeSpan.FromSeconds(30); // 30 second timeout

			// Reset counters
			_totalTests = 0;
			_passedTests = 0;
			_failedTests.Clear();

			// Test server connectivity first
			Console.WriteLine("--- Connectivity Tests ---");
			await TestServerConnectivity();

			// Test Pages API
			Console.WriteLine("\n--- Pages API Tests ---");
			await TestPagesApiComplete();

			Console.WriteLine();

			// Test Media API
			Console.WriteLine("--- Media API Tests ---");
			await TestMediaApiComplete();

			Console.WriteLine();

			// Test error handling
			Console.WriteLine("--- Error Handling Tests ---");
			await TestErrorHandling();

			Console.WriteLine();

			// Print comprehensive summary
			PrintTestSummary();
		}

		private static async Task TestServerConnectivity()
		{
			await RunTest("Server connectivity", async () =>
			{
				HttpResponseMessage response = await _httpClient.GetAsync($"{_baseUrl}/health");
				return response.IsSuccessStatusCode;
			});

			await RunTest("Authentication check", async () =>
			{
				HttpResponseMessage response = await _httpClient.GetAsync($"{_baseUrl}/api/pages");
				return response.StatusCode != System.Net.HttpStatusCode.Unauthorized;
			});
		}

		private static async Task TestPagesApiComplete()
		{
			string testPageId = "";

			// Test 1: List all pages (GET /api/pages)
			await RunTest("List all pages", async () =>
			{
				HttpResponseMessage response = await _httpClient.GetAsync($"{_baseUrl}/api/pages");
				if (response.IsSuccessStatusCode)
				{
					string content = await response.Content.ReadAsStringAsync();
					// Verify it's valid JSON array
					JsonDocument.Parse(content);
					return true;
				}
				return false;
			});

			// Test 2: Create a test page (POST /api/pages)
			HttpResponseMessage? createResponse = await RunTestWithResponse("Create new page", async () =>
			{
				string content = "# Test Page\n\nThis is a test page created by API verification.\n\n## Features\n- API testing\n- Markdown content\n- Git versioning";
				StringContent stringContent = new StringContent(content, Encoding.UTF8, "text/plain");
				
				string url = $"{_baseUrl}/api/pages?title=Test%20Page&tags=test,api,verification&filepath=test-page.md";
				return await _httpClient.PostAsync(url, stringContent);
			});

			if (createResponse != null && createResponse.IsSuccessStatusCode)
			{
				// Extract page ID from response
				string responseContent = await createResponse.Content.ReadAsStringAsync();
				JsonDocument doc = JsonDocument.Parse(responseContent);
				testPageId = doc.RootElement.GetProperty("PageId").GetString() ?? "";
				Console.WriteLine($"  Created page ID: {testPageId}");
			}

			// Test 3: Get specific page (GET /api/pages/{id})
			if (!string.IsNullOrEmpty(testPageId))
			{
				await RunTest("Get specific page", async () =>
				{
					HttpResponseMessage response = await _httpClient.GetAsync($"{_baseUrl}/api/pages/{testPageId}");
					if (response.IsSuccessStatusCode)
					{
						string content = await response.Content.ReadAsStringAsync();
						JsonDocument doc = JsonDocument.Parse(content);
						// Verify page structure
						return doc.RootElement.TryGetProperty("Metadata", out JsonElement metadata) &&
						       doc.RootElement.TryGetProperty("Content", out JsonElement contentProp);
					}
					return false;
				});

				// Test 4: Update page (PUT /api/pages/{id})
				await RunTest("Update existing page", async () =>
				{
					string content = "# Updated Test Page\n\nThis page has been updated by API verification.\n\n## Updated Features\n- API testing\n- Markdown content\n- Git versioning\n- Update functionality";
					StringContent stringContent = new StringContent(content, Encoding.UTF8, "text/plain");
					
					string url = $"{_baseUrl}/api/pages/{testPageId}?title=Updated%20Test%20Page&tags=test,api,verification,updated&filepath=updated-test-page.md";
					HttpResponseMessage response = await _httpClient.PutAsync(url, stringContent);
					return response.IsSuccessStatusCode;
				});

				// Test 5: Get page history (GET /api/pages/{id}/history)
				await RunTest("Get page history", async () =>
				{
					HttpResponseMessage response = await _httpClient.GetAsync($"{_baseUrl}/api/pages/{testPageId}/history");
					if (response.IsSuccessStatusCode)
					{
						string content = await response.Content.ReadAsStringAsync();
						JsonElement[]? commits = JsonSerializer.Deserialize<JsonElement[]>(content);
						return commits!=null && commits.Length > 0; // Should have at least one commit
					}
					return false;
				});

				// Test 6: Retrieve old version (POST /api/pages/{id}/retrieve)
				await RunTest("Retrieve page version", async () =>
				{
					string url = $"{_baseUrl}/api/pages/{testPageId}/retrieve?version=0";
					StringContent emptyContent = new StringContent("", Encoding.UTF8, "application/json");
					HttpResponseMessage response = await _httpClient.PostAsync(url, emptyContent);
					return response.IsSuccessStatusCode;
				});

				// Test 7: Delete page (DELETE /api/pages/{id}) - do this last
				await RunTest("Delete page", async () =>
				{
					HttpResponseMessage response = await _httpClient.DeleteAsync($"{_baseUrl}/api/pages/{testPageId}");
					return response.IsSuccessStatusCode;
				});
			}

			// Test 8: Search pages (GET /api/pages?q=test)
			await RunTest("Search pages", async () =>
			{
				HttpResponseMessage response = await _httpClient.GetAsync($"{_baseUrl}/api/pages?q=test");
				if (response.IsSuccessStatusCode)
				{
					string content = await response.Content.ReadAsStringAsync();
					JsonDocument.Parse(content); // Verify valid JSON
					return true;
				}
				return false;
			});

			// Test 9: Search pages with content (GET /api/pages?q=test&content=1)
			await RunTest("Search pages with content", async () =>
			{
				HttpResponseMessage response = await _httpClient.GetAsync($"{_baseUrl}/api/pages?q=verification&content=1");
				return response.IsSuccessStatusCode;
			});
		}

		private static async Task TestMediaApiComplete()
		{
			string testFilePath = "test-verification-image.png";
			bool uploadSuccessful = false;

			// Test 1: List all media files (GET /api/media)
			await RunTest("List all media files", async () =>
			{
				HttpResponseMessage response = await _httpClient.GetAsync($"{_baseUrl}/api/media");
				if (response.IsSuccessStatusCode)
				{
					string content = await response.Content.ReadAsStringAsync();
					JsonElement[]? mediaFiles = JsonSerializer.Deserialize<JsonElement[]>(content);
					Console.WriteLine($"  Found {mediaFiles?.Length ?? 0} existing media files");
					return true;
				}
				return false;
			});

			// Test 2: Upload a test file (POST /api/media)
			uploadSuccessful = await RunTest("Upload media file", async () =>
			{
				// Create a slightly larger test image (2x2 PNG)
				byte[] pngData = {
					0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
					0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x02,
					0x08, 0x02, 0x00, 0x00, 0x00, 0xFD, 0xD5, 0x9A, 0x7A, 0x00, 0x00, 0x00,
					0x12, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
					0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x01, 0x00, 0x37, 0x6E,
					0xF9, 0x24, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
				};

				ByteArrayContent byteContent = new ByteArrayContent(pngData);
				byteContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/png");
				
				string url = $"{_baseUrl}/api/media?filepath={testFilePath}";
				HttpResponseMessage response = await _httpClient.PostAsync(url, byteContent);
				
				if (response.IsSuccessStatusCode)
				{
					string responseContent = await response.Content.ReadAsStringAsync();
					JsonDocument doc = JsonDocument.Parse(responseContent);
					return doc.RootElement.TryGetProperty("filepath", out JsonElement filePathProp) &&
					       doc.RootElement.TryGetProperty("size", out JsonElement sizeProp);
				}
				return false;
			});

			if (uploadSuccessful)
			{
				// Test 3: Get specific media file (GET /api/media/{filepath})
				await RunTest("Get specific media file", async () =>
				{
					HttpResponseMessage response = await _httpClient.GetAsync($"{_baseUrl}/api/media/{testFilePath}");
					if (response.IsSuccessStatusCode)
					{
						byte[] content = await response.Content.ReadAsByteArrayAsync();
						return content.Length > 0 && response.Content.Headers.ContentType?.MediaType == "image/png";
					}
					return false;
				});

				// Test 4: Update media file (PUT /api/media/{filepath})
				await RunTest("Update media file", async () =>
				{
					// Create a different test image for update (1x1 PNG)
					byte[] pngData = {
						0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
						0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
						0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
						0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
						0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x37, 0x6E, 0xF9, 0x24, 0x00,
						0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
					};

					ByteArrayContent byteContent = new ByteArrayContent(pngData);
					byteContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/png");
					
					string url = $"{_baseUrl}/api/media/{testFilePath}";
					HttpResponseMessage response = await _httpClient.PutAsync(url, byteContent);
					return response.IsSuccessStatusCode;
				});

				// Test 5: Get media history (GET /api/media/{filepath}/history)
				await RunTest("Get media history", async () =>
				{
					HttpResponseMessage response = await _httpClient.GetAsync($"{_baseUrl}/api/media/{testFilePath}/history");
					if (response.IsSuccessStatusCode)
					{
						string content = await response.Content.ReadAsStringAsync();
						JsonElement[]? commits = JsonSerializer.Deserialize<JsonElement[]>(content);
						return commits!=null && commits.Length > 0; // Should have at least one commit
					}
					return false;
				});

				// Test 6: Retrieve old media version (POST /api/media/{filepath}/retrieve)
				await RunTest("Retrieve media version", async () =>
				{
					// First get the history to find a commit hash
					HttpResponseMessage historyResponse = await _httpClient.GetAsync($"{_baseUrl}/api/media/{testFilePath}/history");
					if (historyResponse.IsSuccessStatusCode)
					{
						string historyContent = await historyResponse.Content.ReadAsStringAsync();
						JsonElement[]? commits = JsonSerializer.Deserialize<JsonElement[]>(historyContent);
						if (commits!=null && commits.Length > 0)
						{
							string commitSha = commits[0].GetProperty("Sha").GetString() ?? "";
							if (!string.IsNullOrEmpty(commitSha))
							{
								string url = $"{_baseUrl}/api/media/{testFilePath}/retrieve?commit={commitSha}";
								StringContent emptyContent = new StringContent("", Encoding.UTF8, "application/json");
								HttpResponseMessage response = await _httpClient.PostAsync(url, emptyContent);
								return response.IsSuccessStatusCode;
							}
						}
					}
					return false;
				});

				// Test 7: Delete media file (DELETE /api/media/{filepath}) - do this last
				await RunTest("Delete media file", async () =>
				{
					HttpResponseMessage response = await _httpClient.DeleteAsync($"{_baseUrl}/api/media/{testFilePath}");
					return response.IsSuccessStatusCode;
				});
			}

			// Test 8: Test different file types
			await TestDifferentMediaTypes();
		}

		private static async Task TestDifferentMediaTypes()
		{
			// Test text file
			await RunTest("Upload text file", async () =>
			{
				byte[] textData = Encoding.UTF8.GetBytes("This is a test text file for media API verification.");
				ByteArrayContent content = new ByteArrayContent(textData);
				content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("text/plain");
				
				string url = $"{_baseUrl}/api/media?filepath=test-file.txt";
				HttpResponseMessage response = await _httpClient.PostAsync(url, content);
				
				if (response.IsSuccessStatusCode)
				{
					// Clean up
					await _httpClient.DeleteAsync($"{_baseUrl}/api/media/test-file.txt");
					return true;
				}
				return false;
			});

			// Test JSON file
			await RunTest("Upload JSON file", async () =>
			{
				string jsonData = "{\"test\": true, \"message\": \"API verification\", \"timestamp\": \"" + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "\"}";
				byte[] jsonBytes = Encoding.UTF8.GetBytes(jsonData);
				ByteArrayContent content = new ByteArrayContent(jsonBytes);
				content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");
				
				string url = $"{_baseUrl}/api/media?filepath=test-data.json";
				HttpResponseMessage response = await _httpClient.PostAsync(url, content);
				
				if (response.IsSuccessStatusCode)
				{
					// Clean up
					await _httpClient.DeleteAsync($"{_baseUrl}/api/media/test-data.json");
					return true;
				}
				return false;
			});
		}

		private static async Task TestErrorHandling()
		{
			// Test 1: Invalid page ID
			await RunTest("Invalid page ID handling", async () =>
			{
				HttpResponseMessage response = await _httpClient.GetAsync($"{_baseUrl}/api/pages/invalid-page-id-that-does-not-exist");
				return response.StatusCode == System.Net.HttpStatusCode.NotFound;
			});

			// Test 2: Invalid media file path
			await RunTest("Invalid media path handling", async () =>
			{
				HttpResponseMessage response = await _httpClient.GetAsync($"{_baseUrl}/api/media/nonexistent-file.png");
				return response.StatusCode == System.Net.HttpStatusCode.NotFound;
			});

			// Test 3: Missing required parameters for page creation
			await RunTest("Missing page parameters handling", async () =>
			{
				string content = "# Test Page Without Required Parameters";
				StringContent stringContent = new StringContent(content, Encoding.UTF8, "text/plain");
				
				// Missing title parameter
				string url = $"{_baseUrl}/api/pages?tags=test&filepath=test.md";
				HttpResponseMessage response = await _httpClient.PostAsync(url, stringContent);
				return response.StatusCode == System.Net.HttpStatusCode.BadRequest;
			});

			// Test 4: Empty file upload
			await RunTest("Empty file upload handling", async () =>
			{
				ByteArrayContent emptyContent = new ByteArrayContent(Array.Empty<byte>());
				emptyContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/octet-stream");
				
				string url = $"{_baseUrl}/api/media?filepath=empty-file.bin";
				HttpResponseMessage response = await _httpClient.PostAsync(url, emptyContent);
				return response.StatusCode == System.Net.HttpStatusCode.BadRequest;
			});

			// Test 5: Unauthorized access (without auth header)
			await RunTest("Unauthorized access handling", async () =>
			{
				using (HttpClient unauthClient = new HttpClient())
				{
					HttpResponseMessage response = await unauthClient.GetAsync($"{_baseUrl}/api/pages");
					return response.StatusCode == System.Net.HttpStatusCode.Unauthorized;
				}
			});
		}

		// Helper method to run a test and track results
		private static async Task<bool> RunTest(string testName, Func<Task<bool>> testAction)
		{
			_totalTests++;
			try
			{
				bool result = await testAction();
				if (result)
				{
					_passedTests++;
					Console.WriteLine($"PASS {testName}: SUCCESS");
					return true;
				}
				else
				{
					_failedTests.Add(testName);
					Console.WriteLine($"FAIL {testName}: FAILED");
					return false;
				}
			}
			catch (Exception ex)
			{
				_failedTests.Add($"{testName} (Exception: {ex.Message})");
				Console.WriteLine($"FAIL {testName}: ERROR - {ex.Message}");
				return false;
			}
		}

		// Helper method to run a test that returns a response
		private static async Task<HttpResponseMessage?> RunTestWithResponse(string testName, Func<Task<HttpResponseMessage>> testAction)
		{
			_totalTests++;
			try
			{
				HttpResponseMessage response = await testAction();
				if (response.IsSuccessStatusCode)
				{
					_passedTests++;
					Console.WriteLine($"PASS {testName}: SUCCESS ({(int)response.StatusCode})");
					return response;
				}
				else
				{
					_failedTests.Add($"{testName} ({response.StatusCode})");
					Console.WriteLine($"FAIL {testName}: FAILED ({(int)response.StatusCode} - {response.ReasonPhrase})");
					return response;
				}
			}
			catch (Exception ex)
			{
				_failedTests.Add($"{testName} (Exception: {ex.Message})");
				Console.WriteLine($"FAIL {testName}: ERROR - {ex.Message}");
				return null;
			}
		}

		private static void PrintTestSummary()
		{
			Console.WriteLine("=== Enhanced API Verification Test Results ===");
			Console.WriteLine($"Total Tests: {_totalTests}");
			Console.WriteLine($"Passed: {_passedTests}");
			Console.WriteLine($"Failed: {_totalTests - _passedTests}");
			
			double successRate = (_passedTests * 100.0) / Math.Max(1, _totalTests);
			Console.WriteLine($"Success Rate: {successRate:F1}%");
			
			if (_failedTests.Count > 0)
			{
				Console.WriteLine("\nFailed Tests:");
				foreach (string failedTest in _failedTests)
				{
					Console.WriteLine($"  - {failedTest}");
				}
				Console.WriteLine("\nPlease check server logs for detailed error information.");
			}
			else
			{
				Console.WriteLine("\nALL API TESTS PASSED!");
				Console.WriteLine("The FreeKi Pages and Media APIs are working correctly.");
			}
			
			Console.WriteLine($"\nTest completed at: {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
		}
	}
}