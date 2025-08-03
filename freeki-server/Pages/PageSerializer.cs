using System;
using System.Text;
using System.Text.Json;

namespace Storage
{
	// Serializes and deserializes Page objects to/from the custom format:
	// JSON metadata followed by "---" followed by raw page content
	public class PageSerializer
	{
		private readonly JsonSerializerOptions _jsonOptions;
		const string kSeparator = "\n---\n";

		public PageSerializer()
		{
			_jsonOptions = new JsonSerializerOptions
			{
				WriteIndented        = false, // Keep JSON compact for metadata
				PropertyNamingPolicy = JsonNamingPolicy.CamelCase
			};
		}

		// Serialize a Page object to UTF-8 bytes in the format: JSON metadata + "---" + content
		public byte[] Serialize(Page page)
		{
			if (page == null)
				throw new ArgumentNullException(nameof(page));

			// Serialize metadata to JSON directly from the Page.Metadata property
			string jsonMetadata = JsonSerializer.Serialize(page.Metadata, _jsonOptions);
			
			// Combine JSON metadata + separator + content
			string combined = jsonMetadata + kSeparator + page.Content;
			
			return Encoding.UTF8.GetBytes(combined);
		}

		// Deserialize UTF-8 bytes to a Page object from the format: JSON metadata + "---" + content
		public Page Deserialize(byte[] data)
		{
			if (data == null)
				throw new ArgumentNullException(nameof(data));

			string content = Encoding.UTF8.GetString(data);
			
			// Find the separator
			int separatorIndex = content.IndexOf(kSeparator, StringComparison.Ordinal);
			if (separatorIndex == -1)
				throw new FormatException("Invalid page format: separator '---' not found");

			// Split into metadata and content
			string jsonMetadata = content.Substring(0, separatorIndex);
			string pageContent = content.Substring(separatorIndex + kSeparator.Length); // Skip "\n---\n"

			// Parse metadata JSON directly to PageMetadata
			PageMetadata? metadata = JsonSerializer.Deserialize<PageMetadata>(jsonMetadata, _jsonOptions);
			if (metadata == null)
				throw new FormatException("Invalid page format: metadata could not be parsed");

			// Validate required fields
			if (string.IsNullOrEmpty(metadata.PageId))
				throw new FormatException("Invalid page format: pageId is required");
			if (string.IsNullOrEmpty(metadata.Title))
				throw new FormatException("Invalid page format: title is required");

			return new Page(metadata, pageContent);
		}

		// Read and parse only the metadata from a byte array by first scanning for separator
		// If separator is not found, return null (indicating more data is needed)
		public PageMetadata? DeserializeMetadataOnly(byte[] data)
		{
			if (data == null || data.Length == 0)
				return null;

			// Convert entire available data to string to search for separator
			string content = Encoding.UTF8.GetString(data);
			
			// Look for the separator first
			int separatorIndex = content.IndexOf(kSeparator, StringComparison.Ordinal);
			if (separatorIndex == -1)
			{
				// Separator not found - need more data
				return null;
			}

			// Found separator, extract just the metadata JSON part
			string jsonMetadata = content.Substring(0, separatorIndex);
			
			try
			{
				// Parse the JSON metadata directly
				PageMetadata? metadata = JsonSerializer.Deserialize<PageMetadata>(jsonMetadata, _jsonOptions);
				if (metadata != null && !string.IsNullOrEmpty(metadata.PageId) && !string.IsNullOrEmpty(metadata.Title))
				{
					return metadata;
				}
			}
			catch (JsonException)
			{
				// JSON parsing failed - this shouldn't happen if we have the complete separator
				// but could occur with malformed data
			}

			return null; // Could not parse metadata
		}
	}
}