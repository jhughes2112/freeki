using System;
using System.Collections.Generic;

namespace Storage
{
	// Immutable metadata for a page - can only be modified via construction
	public class PageMetadata
	{
		public string       PageId       { get; }
		public List<string> Tags         { get; }
		public string       Title        { get; }
		public long         LastModified { get; }
		public long         Version      { get; }
		public string       Path         { get; } // Relative path and filename of the file
		public double       SortOrder    { get; } // Floating point sort order for custom page/folder ordering

		static public long  Now          { get { return DateTimeOffset.UtcNow.ToUnixTimeSeconds(); } }

		public PageMetadata(string pageId, List<string> tags, string title, long lastModified, long version, string path, double sortOrder)
		{
			PageId       = pageId;
			Tags         = tags;
			Title        = title;
			LastModified = lastModified;
			Version      = version;
			Path         = path;
			SortOrder    = sortOrder;
		}
	}

	// Represents a page with metadata and content - functional style with immutability
	public class Page
	{
		public PageMetadata Metadata { get; }
		public string       Content  { get; }

		public Page(PageMetadata metadata, string content)
		{
			Metadata = metadata;
			Content  = content;
		}
	}
}